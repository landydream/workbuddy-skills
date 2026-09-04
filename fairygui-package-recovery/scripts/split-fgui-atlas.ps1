param(
    [Parameter(Mandatory = $true)][string]$AtlasPath,
    [Parameter(Mandatory = $true)][string]$RecoveryReportPath,
    [Parameter(Mandatory = $true)][string]$OutputDirectory
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

if (-not (Test-Path -LiteralPath $AtlasPath -PathType Leaf)) {
    throw "Atlas not found: $AtlasPath"
}
if (-not (Test-Path -LiteralPath $RecoveryReportPath -PathType Leaf)) {
    throw "Recovery report not found: $RecoveryReportPath"
}

$report = Get-Content -LiteralPath $RecoveryReportPath -Raw | ConvertFrom-Json
if ($null -eq $report.items -or $null -eq $report.sprites) {
    throw 'Recovery report must contain items and sprites arrays'
}

New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$items = @{}
foreach ($item in $report.items) {
    $items[[string]$item.id] = $item
}

$atlas = [System.Drawing.Bitmap]::FromFile($AtlasPath)
$results = @()
try {
    foreach ($sprite in $report.sprites) {
        $itemId = [string]$sprite.itemId
        $item = $items[$itemId]
        if ($null -eq $item) {
            throw "Sprite references missing item: $itemId"
        }

        $x = [int]$sprite.rect[0]
        $y = [int]$sprite.rect[1]
        $packedWidth = [int]$sprite.rect[2]
        $packedHeight = [int]$sprite.rect[3]
        $rotated = [bool]$sprite.rotated
        $sourceWidth = if ($rotated) { $packedHeight } else { $packedWidth }
        $sourceHeight = if ($rotated) { $packedWidth } else { $packedHeight }

        if ($x -lt 0 -or $y -lt 0 -or $sourceWidth -le 0 -or $sourceHeight -le 0 -or
            $x + $sourceWidth -gt $atlas.Width -or $y + $sourceHeight -gt $atlas.Height) {
            throw "Atlas rectangle out of bounds for $($item.name): $x,$y,$sourceWidth,$sourceHeight in $($atlas.Width)x$($atlas.Height)"
        }

        $sourceRect = [System.Drawing.Rectangle]::new($x, $y, $sourceWidth, $sourceHeight)
        $crop = $atlas.Clone($sourceRect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        try {
            if ($rotated) {
                $crop.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipNone)
            }
            $crop.SetResolution(96, 96)

            if ($crop.Width -ne $packedWidth -or $crop.Height -ne $packedHeight) {
                throw "Rotated size mismatch for $($item.name): got $($crop.Width)x$($crop.Height), expected ${packedWidth}x${packedHeight}"
            }

            $logicalWidth = [int]$item.width
            $logicalHeight = [int]$item.height
            $offsetX = 0
            $offsetY = 0
            if ($null -ne $sprite.original -and $sprite.original.Count -ge 4) {
                $offsetX = [int]$sprite.original[0]
                $offsetY = [int]$sprite.original[1]
                $logicalWidth = [int]$sprite.original[2]
                $logicalHeight = [int]$sprite.original[3]
            }

            if ($logicalWidth -le 0 -or $logicalHeight -le 0 -or $offsetX -lt 0 -or $offsetY -lt 0 -or
                $offsetX + $crop.Width -gt $logicalWidth -or $offsetY + $crop.Height -gt $logicalHeight) {
                throw "Invalid trim placement for $($item.name): offset=$offsetX,$offsetY crop=$($crop.Width)x$($crop.Height) canvas=${logicalWidth}x${logicalHeight}"
            }

            $canvas = [System.Drawing.Bitmap]::new($logicalWidth, $logicalHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
            try {
                $canvas.SetResolution(96, 96)
                $graphics = [System.Drawing.Graphics]::FromImage($canvas)
                try {
                    $graphics.Clear([System.Drawing.Color]::Transparent)
                    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
                    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
                    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
                    $destinationRect = [System.Drawing.Rectangle]::new($offsetX, $offsetY, $crop.Width, $crop.Height)
                    $cropRect = [System.Drawing.Rectangle]::new(0, 0, $crop.Width, $crop.Height)
                    $graphics.DrawImage($crop, $destinationRect, $cropRect, [System.Drawing.GraphicsUnit]::Pixel)
                }
                finally {
                    $graphics.Dispose()
                }

                $fileName = "$($item.name).png"
                $outputPath = Join-Path $OutputDirectory $fileName
                $canvas.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

                $scale9Grid = $null
                $borderSlice = $null
                if ($null -ne $item.scale9 -and $item.scale9.Count -ge 4) {
                    $scale9Grid = @($item.scale9 | ForEach-Object { [int]$_ })
                    $left = $scale9Grid[0]
                    $top = $scale9Grid[1]
                    $centerWidth = $scale9Grid[2]
                    $centerHeight = $scale9Grid[3]
                    $right = $logicalWidth - $left - $centerWidth
                    $bottom = $logicalHeight - $top - $centerHeight
                    if ($right -lt 0 -or $bottom -lt 0) {
                        throw "Invalid scale9Grid for $($item.name): $($scale9Grid -join ',') in ${logicalWidth}x${logicalHeight}"
                    }
                    $borderSlice = @{ top = $top; right = $right; bottom = $bottom; left = $left }
                }

                $results += [ordered]@{
                    file = $fileName
                    itemId = $itemId
                    sourceAtlas = (Resolve-Path -LiteralPath $AtlasPath).Path
                    sourceDpi = @{ x = $atlas.HorizontalResolution; y = $atlas.VerticalResolution }
                    sourceRect = @{ x = $x; y = $y; width = $sourceWidth; height = $sourceHeight }
                    packedRect = @{ width = $packedWidth; height = $packedHeight }
                    rotated = $rotated
                    trimOffset = @{ x = $offsetX; y = $offsetY }
                    width = $logicalWidth
                    height = $logicalHeight
                    scale9Grid = $scale9Grid
                    cssBorderImageSlice = $borderSlice
                }
            }
            finally {
                $canvas.Dispose()
            }
        }
        finally {
            $crop.Dispose()
        }
    }
}
finally {
    $atlas.Dispose()
}

$manifestPath = Join-Path $OutputDirectory 'atlas_split_manifest.json'
$results | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

[pscustomobject]@{
    outputDirectory = (Resolve-Path -LiteralPath $OutputDirectory).Path
    images = $results.Count
    rotated = @($results | Where-Object rotated).Count
    trimmed = @($results | Where-Object {
        $_.trimOffset.x -ne 0 -or $_.trimOffset.y -ne 0 -or
        $_.packedRect.width -ne $_.width -or $_.packedRect.height -ne $_.height
    }).Count
    nineSlice = @($results | Where-Object { $null -ne $_.scale9Grid }).Count
    manifest = $manifestPath
} | ConvertTo-Json -Depth 4

