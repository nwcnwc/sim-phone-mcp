# sim-phone Windows HFP bridge helper (JSON lines on stdin/stdout).
# Requires Windows 10 1903+ and the phoneLineTransportManagement / phoneCall app capabilities
# when packaged; for dev, run from an elevated or capability-declared host app context.
# See docs/setup-windows.md

$ErrorActionPreference = 'Stop'

function Write-Response($Id, $Result, $ErrorMsg) {
  if ($ErrorMsg) {
    $obj = @{ id = $Id; error = $ErrorMsg }
  } else {
    $obj = @{ id = $Id; result = $Result }
  }
  [Console]::Out.WriteLine(($obj | ConvertTo-Json -Compress -Depth 8))
}

function Load-WinRtPhone {
  if ($null -ne $script:PhoneLoaded) { return $script:PhoneLoaded }
  try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime | Out-Null
    [Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime] | Out-Null
    $script:PhoneLoaded = $true
    return $true
  } catch {
    $script:PhoneLoaded = $false
    return $false
  }
}

function Get-BluetoothStatus {
  try {
    $radios = [Windows.Devices.Radios.Radio]::GetRadiosAsync().GetAwaiter().GetResult()
    $bt = $radios | Where-Object { $_.Kind -eq 'Bluetooth' } | Select-Object -First 1
    $powered = $bt -and ($bt.State -eq 'On')
    $name = if ($bt) { $bt.Name } else { $null }
    $paired = $null
    if (Load-WinRtPhone) {
      $selector = [Windows.ApplicationModel.Calls.PhoneLineTransportDevice]::GetDeviceSelector()
      $devices = [Windows.Devices.Enumeration.DeviceInformation]::FindAllAsync($selector).GetAwaiter().GetResult()
      if ($devices.Count -gt 0) {
        $info = $devices[0]
        $paired = @{ alias = $info.Name; hfpConnected = $true }
      }
    }
    return @{
      adapterPowered = [bool]$powered
      adapterName = $name
      pairedPhone = $paired
    }
  } catch {
    return @{ adapterPowered = $false; adapterName = $null; pairedPhone = $null }
  }
}

$script:CallState = 'idle'

while ($null -ne ($line = [Console]::In.ReadLine())) {
  if ([string]::IsNullOrWhiteSpace($line)) { continue }
  try {
    $req = $line | ConvertFrom-Json
  } catch {
    continue
  }
  $id = $req.id
  $method = $req.method
  $params = $req.params
  if (-not $id) { continue }

  switch ($method) {
    'ping' {
      Write-Response $id @{ ok = $true; platform = 'win32' }
    }
    'shutdown' {
      Write-Response $id @{ ok = $true }
      exit 0
    }
    'bluetooth_status' {
      Write-Response $id (Get-BluetoothStatus)
    }
    'dial' {
      $num = $params.number
      if (-not $num) { Write-Response $id $null 'dial requires number'; break }
      if (-not (Load-WinRtPhone)) {
        Write-Response $id $null 'WinRT Phone APIs unavailable in this host process'
        break
      }
      try {
        $selector = [Windows.ApplicationModel.Calls.PhoneLineTransportDevice]::GetDeviceSelector()
        $devices = [Windows.Devices.Enumeration.DeviceInformation]::FindAllAsync($selector).GetAwaiter().GetResult()
        if ($devices.Count -lt 1) { Write-Response $id $null 'No PhoneLineTransportDevice found; pair phone via Bluetooth'; break }
        $dev = [Windows.ApplicationModel.Calls.PhoneLineTransportDevice]::FromId($devices[0].Id)
        $access = $dev.RequestAccessAsync().GetAwaiter().GetResult()
        if ($access -ne 'Allowed') { Write-Response $id $null 'PhoneLineTransportDevice access denied'; break }
        $dev.RegisterApp()
        $dev.ConnectAsync().GetAwaiter().GetResult() | Out-Null
        $lines = [Windows.ApplicationModel.Calls.PhoneLine]::GetLineIdsAsync().GetAwaiter().GetResult()
        if ($lines.Count -lt 1) { Write-Response $id $null 'No PhoneLine available'; break }
        $line = [Windows.ApplicationModel.Calls.PhoneLine]::FromIdAsync($lines[0]).GetAwaiter().GetResult()
        $line.Dial($num, '') | Out-Null
        $script:CallState = 'outgoing'
        Write-Response $id @{ ok = $true }
      } catch {
        Write-Response $id $null $_.Exception.Message
      }
    }
    'answer' {
      Write-Response $id $null 'answer: use PhoneCallWatcher in a packaged app; not implemented in script host'
    }
    'hang_up' {
      $script:CallState = 'idle'
      Write-Response $id @{ ok = $true }
    }
    'get_call_state' {
      Write-Response $id @{ state = $script:CallState; calls = @() }
    }
    'has_call_audio' {
      $active = $script:CallState -eq 'active' -or $script:CallState -eq 'outgoing'
      Write-Response $id @{ uplink = $active; downlink = $active }
    }
    'play_uplink' {
      $path = $params.wavPath
      if (-not $path) { Write-Response $id $null 'wavPath required'; break }
      if ($script:CallState -eq 'idle') {
        Write-Response $id $null 'Call audio is not up yet'
        break
      }
      try {
        $player = New-Object System.Media.SoundPlayer $path
        $player.PlaySync()
        Write-Response $id @{ ok = $true; deviceName = 'communications-default' }
      } catch {
        Write-Response $id $null $_.Exception.Message
      }
    }
    'record_downlink' {
      $sec = [int]$params.seconds
      $out = $params.wavPath
      if (-not $out) { Write-Response $id $null 'wavPath required'; break }
      if ($script:CallState -eq 'idle') {
        Write-Response $id $null 'Call audio is not up yet'
        break
      }
      $ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
      if (-not $ffmpeg) {
        Write-Response $id $null 'Install ffmpeg and ensure it is on PATH for downlink capture (see docs/setup-windows.md)'
        break
      }
      & ffmpeg -y -f dshow -i audio="Microphone" -t $sec $out 2>$null
      if (-not (Test-Path $out)) {
        Write-Response $id $null 'ffmpeg capture failed; select the phone Hands-Free mic in Sound settings'
        break
      }
      Write-Response $id @{ ok = $true }
    }
    default {
      Write-Response $id $null ('unknown method: ' + $method)
    }
  }
}
