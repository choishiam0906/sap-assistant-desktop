param(
  [string]$OutputDir = (Join-Path $PSScriptRoot "..\build")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

function New-RoundedRectanglePath {
  param(
    [double]$X,
    [double]$Y,
    [double]$Width,
    [double]$Height,
    [double]$Radius
  )

  $diameter = $Radius * 2
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function Write-PngWrappedIco {
  param(
    [byte[]]$PngBytes,
    [string]$Path
  )

  $stream = New-Object System.IO.MemoryStream
  $writer = New-Object System.IO.BinaryWriter($stream)

  try {
    $writer.Write([UInt16]0)
    $writer.Write([UInt16]1)
    $writer.Write([UInt16]1)
    $writer.Write([byte]0)
    $writer.Write([byte]0)
    $writer.Write([byte]0)
    $writer.Write([byte]0)
    $writer.Write([UInt16]1)
    $writer.Write([UInt16]32)
    $writer.Write([UInt32]$PngBytes.Length)
    $writer.Write([UInt32]22)
    $writer.Write($PngBytes)
    $writer.Flush()
    [System.IO.File]::WriteAllBytes($Path, $stream.ToArray())
  } finally {
    $writer.Dispose()
    $stream.Dispose()
  }
}

$null = New-Item -ItemType Directory -Force -Path $OutputDir

$pngPath = Join-Path $OutputDir "icon.png"
$icoPath = Join-Path $OutputDir "icon.ico"
$size = 256

$bitmap = New-Object System.Drawing.Bitmap $size, $size
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)

$resources = @()

try {
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
  $graphics.Clear([System.Drawing.Color]::Transparent)

  $backgroundRect = New-Object System.Drawing.Rectangle 20, 20, 216, 216
  $backgroundPath = New-RoundedRectanglePath -X 20 -Y 20 -Width 216 -Height 216 -Radius 48
  $backgroundBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $backgroundRect,
    [System.Drawing.Color]::FromArgb(11, 37, 69),
    [System.Drawing.Color]::FromArgb(98, 192, 255),
    45
  )
  $resources += $backgroundPath, $backgroundBrush
  $graphics.FillPath($backgroundBrush, $backgroundPath)

  $overlayBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Rectangle 20, 20, 216, 216),
    [System.Drawing.Color]::FromArgb(40, 255, 255, 255),
    [System.Drawing.Color]::FromArgb(0, 255, 255, 255),
    90
  )
  $resources += $overlayBrush
  $graphics.FillPath($overlayBrush, $backgroundPath)

  $linePenTop = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(48, 255, 255, 255), 8)
  $linePenBottom = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(70, 255, 255, 255), 8)
  $linePenTop.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $linePenTop.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $linePenBottom.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $linePenBottom.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $resources += $linePenTop, $linePenBottom
  $graphics.DrawLine($linePenTop, 76, 56, 118, 56)
  $graphics.DrawLine($linePenBottom, 140, 190, 189, 190)

  $sapBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $resources += $sapBrush
  $sapFont = New-Object System.Drawing.Font("Segoe UI", 62, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $resources += $sapFont
  $graphics.DrawString("SAP", $sapFont, $sapBrush, 58, 84)

  $accentRect = New-Object System.Drawing.Rectangle 158, 92, 60, 60
  $accentPath = New-RoundedRectanglePath -X 158 -Y 92 -Width 60 -Height 60 -Radius 18
  $accentBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $accentRect,
    [System.Drawing.Color]::FromArgb(242, 249, 255),
    [System.Drawing.Color]::FromArgb(184, 227, 255),
    45
  )
  $resources += $accentPath, $accentBrush
  $graphics.FillPath($accentBrush, $accentPath)

  $aiBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(11, 37, 69))
  $resources += $aiBrush
  $aiFont = New-Object System.Drawing.Font("Segoe UI", 28, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $resources += $aiFont
  $graphics.DrawString("AI", $aiFont, $aiBrush, 171, 105)

  $bitmap.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $pngBytes = [System.IO.File]::ReadAllBytes($pngPath)
  Write-PngWrappedIco -PngBytes $pngBytes -Path $icoPath
} finally {
  foreach ($resource in $resources) {
    if ($null -ne $resource) {
      $resource.Dispose()
    }
  }

  $graphics.Dispose()
  $bitmap.Dispose()
}

Write-Host "Generated icon assets:" $pngPath $icoPath
