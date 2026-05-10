Add-Type -AssemblyName System.Drawing
$files = @('coin-heads-1.png', 'coin-heads-2.png', 'coin-tails-1.png', 'coin-tails-2.png')
foreach ($f in $files) {
    $p = "c:\Users\serge\orchids-projects\trav.bet\public\$f"
    $img = [System.Drawing.Image]::FromFile($p)
    Write-Host "$f : $($img.Width) x $($img.Height)"
    $img.Dispose()
}
