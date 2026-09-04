param(
    [Parameter(Mandatory = $true)][string]$ManifestPath,
    [Parameter(Mandatory = $true)][string]$OutputDirectory
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$items = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$atlases = @{}
$results = @()

try {
    foreach ($item in $items) {
        $atlasPath = [string]$item.sourceAtlas
        if (-not (Test-Path -LiteralPath $atlasPath -PathType Leaf)) {
            throw "Atlas not found: $atlasPath"
        }
        if (-not $atlases.ContainsKey($atlasPath)) {
            $atlases[$atlasPath] = [System.Drawing.Bitmap]::FromFile($atlasPath)
        }
        $atlas = $atlases[$atlasPath]
        $x = [int]$item.sourceRect.X
        $y = [int]$item.sourceRect.Y
        $width = [int]$item.sourceRect.Width
        $height = [int]$item.sourceRect.Height
        if ($x -lt 0 -or $y -lt 0 -or $width -le 0 -or $height -le 0 -or
            ($x + $width) -gt $atlas.Width -or ($y + $height) -gt $atlas.Height) {
            throw "Invalid source rectangle for $($item.file)"
        }

        $rect = [System.Drawing.Rectangle]::new($x, $y, $width, $height)
        $image = $atlas.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        try {
            if ([bool]$item.rotated) {
                $image.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipNone)
            }
            $image.SetResolution(96, 96)
            $image.Save((Join-Path $OutputDirectory $item.file), [System.Drawing.Imaging.ImageFormat]::Png)
            $results += [ordered]@{
                file = $item.file
                sprite = $item.sprite
                sourceAtlas = $atlasPath
                sourceRect = @{ x = $x; y = $y; width = $width; height = $height }
                rotated = [bool]$item.rotated
                exportedWidth = $image.Width
                exportedHeight = $image.Height
                logicalWidth = [int]$(if ($null -ne $item.logicalWidth) { $item.logicalWidth } else { $item.width })
                logicalHeight = [int]$(if ($null -ne $item.logicalHeight) { $item.logicalHeight } else { $item.height })
                scale9Grid = $item.scale9Grid
            }
        }
        finally {
            $image.Dispose()
        }
    }
}
finally {
    $atlases.Values | ForEach-Object { $_.Dispose() }
}

$results | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $OutputDirectory 'components_manifest.json') -Encoding UTF8
Write-Host "Exported $($results.Count) components to $OutputDirectory"
