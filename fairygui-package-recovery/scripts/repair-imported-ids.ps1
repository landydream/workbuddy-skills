param(
    [Parameter(Mandatory = $true)][string]$PackageDirectory,
    [Parameter(Mandatory = $true)][string]$OriginalPackageXml,
    [string]$BackupDirectory
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $PackageDirectory -PathType Container)) {
    throw "Package directory not found: $PackageDirectory"
}
if (-not (Test-Path -LiteralPath $OriginalPackageXml -PathType Leaf)) {
    throw "Original package.xml not found: $OriginalPackageXml"
}

$packageDirectoryPath = (Resolve-Path -LiteralPath $PackageDirectory).Path
$currentPackageXmlPath = Join-Path $packageDirectoryPath 'package.xml'
if (-not (Test-Path -LiteralPath $currentPackageXmlPath -PathType Leaf)) {
    throw "Current package.xml not found: $currentPackageXmlPath"
}

[xml]$originalPackage = Get-Content -LiteralPath $OriginalPackageXml -Raw
[xml]$currentPackage = Get-Content -LiteralPath $currentPackageXmlPath -Raw
$oldPackageId = [string]$originalPackage.packageDescription.GetAttribute('id')
$newPackageId = [string]$currentPackage.packageDescription.GetAttribute('id')
if (-not $oldPackageId -or -not $newPackageId) {
    throw 'Both package.xml files must contain packageDescription id'
}

function Get-ResourceKey([System.Xml.XmlElement]$node) {
    return '{0}|{1}|{2}' -f $node.Name, $node.GetAttribute('name'), $node.GetAttribute('path')
}

$currentByKey = @{}
$currentIds = @{}
foreach ($node in $currentPackage.packageDescription.resources.ChildNodes) {
    if ($node.NodeType -ne [System.Xml.XmlNodeType]::Element) { continue }
    $key = Get-ResourceKey $node
    if ($currentByKey.ContainsKey($key)) {
        throw "Current package contains duplicate resource key: $key"
    }
    $currentByKey[$key] = $node
    $currentIds[[string]$node.GetAttribute('id')] = $node
}

$idMap = [ordered]@{}
$unmatched = @()
foreach ($node in $originalPackage.packageDescription.resources.ChildNodes) {
    if ($node.NodeType -ne [System.Xml.XmlNodeType]::Element) { continue }
    $key = Get-ResourceKey $node
    if (-not $currentByKey.ContainsKey($key)) {
        $unmatched += $key
        continue
    }
    $oldId = [string]$node.GetAttribute('id')
    $newId = [string]$currentByKey[$key].GetAttribute('id')
    if ($oldId -and $newId) { $idMap[$oldId] = $newId }
}
if ($unmatched.Count) {
    throw "Resources cannot be matched by type, name and path: $($unmatched -join '; ')"
}

$xmlFiles = Get-ChildItem -LiteralPath $packageDirectoryPath -Recurse -Filter '*.xml' -File
$changes = @()
foreach ($file in $xmlFiles) {
    $text = [System.IO.File]::ReadAllText($file.FullName)
    $updated = $text

    foreach ($entry in ($idMap.GetEnumerator() | Sort-Object { $_.Key.Length } -Descending)) {
        $oldId = [regex]::Escape([string]$entry.Key)
        $newId = [string]$entry.Value
        $updated = [regex]::Replace($updated, "ui://$([regex]::Escape($oldPackageId))$oldId(?=[^A-Za-z0-9]|$)", "ui://$newPackageId$newId")
        $updated = [regex]::Replace($updated, "src=([`"'])$oldId\1", "src=`$1$newId`$1")
    }

    $updated = $updated.Replace("ui://$oldPackageId", "ui://$newPackageId")
    $updated = $updated.Replace("packageId=`"$oldPackageId`"", "packageId=`"$newPackageId`"")
    $updated = $updated.Replace("pkg=`"$oldPackageId`"", "pkg=`"$newPackageId`"")

    if ($updated -ne $text) {
        $changes += [pscustomobject]@{
            file = $file.FullName
            relativePath = $file.FullName.Substring($packageDirectoryPath.Length).TrimStart('\')
            oldText = $text
            newText = $updated
        }
    }
}

if (-not $BackupDirectory) {
    $timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
    $BackupDirectory = Join-Path ([System.IO.Path]::GetTempPath()) "fairygui-id-fix-backup\$timestamp"
}
$backupPath = [System.IO.Path]::GetFullPath($BackupDirectory)
New-Item -ItemType Directory -Path $backupPath -Force | Out-Null

foreach ($change in $changes) {
    $backupFile = Join-Path $backupPath $change.relativePath
    $backupParent = Split-Path -Parent $backupFile
    New-Item -ItemType Directory -Path $backupParent -Force | Out-Null
    [System.IO.File]::WriteAllText($backupFile, $change.oldText, [System.Text.UTF8Encoding]::new($false))
    [System.IO.File]::WriteAllText($change.file, $change.newText, [System.Text.UTF8Encoding]::new($false))
}

$issues = @()
foreach ($file in $xmlFiles) {
    try {
        [xml]$xml = Get-Content -LiteralPath $file.FullName -Raw
    }
    catch {
        $issues += "Invalid XML: $($file.FullName): $($_.Exception.Message)"
        continue
    }

    foreach ($node in $xml.SelectNodes('//*')) {
        foreach ($attribute in $node.Attributes) {
            $value = [string]$attribute.Value
            if ($value.Contains("ui://$oldPackageId")) {
                $issues += "Old package URL remains in $($file.FullName): $value"
            }
            foreach ($match in [regex]::Matches($value, 'ui://([A-Za-z0-9]{8})([A-Za-z0-9]+)')) {
                $urlPackageId = $match.Groups[1].Value
                $urlItemId = $match.Groups[2].Value
                if ($urlPackageId -eq $newPackageId -and -not $currentIds.ContainsKey($urlItemId)) {
                    $issues += "Missing local ui item in $($file.FullName): $($match.Value)"
                }
            }
            if ($attribute.Name -eq 'src') {
                $pkgAttribute = $node.Attributes['pkg']
                $isLocal = $null -eq $pkgAttribute -or [string]$pkgAttribute.Value -eq $newPackageId
                if ($isLocal -and -not $currentIds.ContainsKey($value)) {
                    $issues += "Missing local src in $($file.FullName): $value"
                }
            }
        }
    }
}

if ($issues.Count) {
    throw "Validation failed after ID repair:`n$($issues -join "`n")"
}

[pscustomobject]@{
    packageDirectory = $packageDirectoryPath
    oldPackageId = $oldPackageId
    newPackageId = $newPackageId
    mappedResources = $idMap.Count
    changedFiles = $changes.Count
    backupDirectory = $backupPath
    issues = 0
} | ConvertTo-Json -Depth 4

