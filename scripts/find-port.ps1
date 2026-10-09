$ip = "192.168.1.19"
$ports = 35000..47000
$found = @()

foreach ($p in $ports) {
    $c = New-Object System.Net.Sockets.TcpClient
    $iar = $c.BeginConnect($ip, $p, $null, $null)
    if ($iar.AsyncWaitHandle.WaitOne(15)) {
        try {
            $c.EndConnect($iar)
            Write-Host "FOUND_PORT:$p"
            $found += $p
            break
        } catch {}
    }
    $c.Close()
}
