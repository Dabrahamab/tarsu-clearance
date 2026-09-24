# Launch the Taraba State University Clearance app on a device.
# One click: backend -> device (emulator or physical phone) -> latest APK -> opens app.
# Usage:  .\Launch App.bat                                        (auto: emulator if running, else phone)
#         powershell -File launch-app.ps1 -Target Emulator        (force emulator)
#         powershell -File launch-app.ps1 -Target Phone           (force physical phone)

param(
    [ValidateSet("Auto", "Emulator", "Phone")]
    [string]$Target = "Auto"
)

$ErrorActionPreference = "Stop"

$root      = "C:\Users\MACHINE\Documents\Android-Based Student Clearance System"
$phoneApk  = "$root\phone-apk\clearance-phone.apk"
$emuApk    = "$root\android\app\build\outputs\apk\debug\app-debug.apk"
$adb       = "C:\Users\MACHINE\AppData\Local\Android\Sdk\platform-tools\adb.exe"
$emu       = "C:\Users\MACHINE\AppData\Local\Android\Sdk\emulator\emulator.exe"
$node      = "C:\Program Files\nodejs\node.exe"
$avd       = "clearanceAVD"

function Get-AttachedDevices {
    & $adb devices | ForEach-Object {
        if ($_ -match "^(\S+)\s+(device|unauthorized)$") {
            [PSCustomObject]@{ Serial = $Matches[1]; State = $Matches[2]; IsEmulator = ($Matches[1] -like "emulator-*") }
        }
    }
}

function Start-Backend {
    Write-Host "`n[1/3] Checking backend..." -ForegroundColor Cyan
    try {
        $r = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -TimeoutSec 3
        Write-Host "      backend already up: $($r.status)" -ForegroundColor Green
    } catch {
        Write-Host "      starting backend..." -ForegroundColor Yellow
        Start-Process -FilePath $node -ArgumentList "src/server.js" -WorkingDirectory "$root\backend" -WindowStyle Hidden
        $ok = $false
        for ($i = 0; $i -lt 12; $i++) {
            Start-Sleep -Seconds 2
            try { Invoke-RestMethod -Uri "http://localhost:5000/api/health" -TimeoutSec 2 | Out-Null; $ok = $true; break } catch { }
        }
        if ($ok) { Write-Host "      backend up on :5000" -ForegroundColor Green }
        else { Write-Host "      FAILED to start backend" -ForegroundColor Red; exit 1 }
    }
}

function Start-Emulator {
    Write-Host "      booting emulator ($avd) - first boot can take a few minutes..." -ForegroundColor Yellow
    Start-Process -FilePath $emu -ArgumentList "-avd", $avd, "-no-snapshot-save" -WindowStyle Minimized
    for ($i = 0; $i -lt 60; $i++) {
        Start-Sleep -Seconds 10
        $boot = & $adb shell getprop sys.boot_completed 2>$null
        if ($boot -match "1") {
            $dev = (Get-AttachedDevices | Where-Object { $_.IsEmulator -and $_.State -eq "device" } | Select-Object -First 1)
            if ($dev) {
                Write-Host "      emulator booted after ~$((($i + 1) * 10))s" -ForegroundColor Green
                return @{ Serial = $dev.Serial; ForPhone = $false }
            }
        }
    }
    Write-Host "      emulator did not finish booting - check the emulator window" -ForegroundColor Red
    exit 1
}

function Get-TargetDevice {
    $devs = Get-AttachedDevices

    if ($Target -eq "Phone") {
        $phone = $devs | Where-Object { -not $_.IsEmulator -and $_.State -eq "device" } | Select-Object -First 1
        if (-not $phone) { Write-Host "      no physical phone attached" -ForegroundColor Red; exit 1 }
        return @{ Serial = $phone.Serial; ForPhone = $true }
    }

    if ($Target -eq "Emulator") {
        $emuDev = $devs | Where-Object { $_.IsEmulator -and $_.State -eq "device" } | Select-Object -First 1
        if ($emuDev) { return @{ Serial = $emuDev.Serial; ForPhone = $false } }
        return Start-Emulator
    }

    # Auto: running emulator wins, otherwise the attached phone, otherwise boot the emulator.
    $emuDev = $devs | Where-Object { $_.IsEmulator -and $_.State -eq "device" } | Select-Object -First 1
    if ($emuDev) { return @{ Serial = $emuDev.Serial; ForPhone = $false } }
    $phone = $devs | Where-Object { -not $_.IsEmulator -and $_.State -eq "device" } | Select-Object -First 1
    if ($phone) { return @{ Serial = $phone.Serial; ForPhone = $true } }
    return Start-Emulator
}

function Get-AppPath($forPhone) {
    $pick = @($phoneApk, $emuApk) | Where-Object { Test-Path $_ } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($pick) {
        Write-Host "      using APK: $(Split-Path $pick -Leaf)" -ForegroundColor DarkGray
        return $pick
    }
    # No build output yet: build one for the target device.
    Write-Host "      no APK found - building (first run, ~1 min)..." -ForegroundColor Yellow
    if ($forPhone) {
        $ip = (Get-NetIPAddress -AddressFamily IPv4 -AddressState Preferred | Where-Object { $_.IPAddress -like "10.*" } | Select-Object -First 1).IPAddress
        if (-not $ip) { $ip = "10.0.2.2" }
        $baseUrl = "http://${ip}:5000/"
    } else {
        $baseUrl = "http://10.0.2.2:5000/"
    }
    Push-Location "$root\android"
    try {
        & "$root\android\gradlew.bat" assembleDebug "-PapiBaseUrl=$baseUrl" | Out-Null
        if ($LASTEXITCODE -ne 0) { Write-Host "      build failed" -ForegroundColor Red; exit 1 }
    } finally { Pop-Location }
    return $emuApk
}

function Deploy-App($target, $apk) {
    Write-Host "`n[3/3] Installing & launching app on $($target.Serial) ..." -ForegroundColor Cyan
    & $adb -s $target.Serial install -r $apk | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-Host "      install failed on $($target.Serial)" -ForegroundColor Red; exit 1 }
    & $adb -s $target.Serial shell am start -n "com.tsunu.clearance/.auth.LoginActivity" | Out-Null
    Write-Host "      app launched - login to continue" -ForegroundColor Green
}

Start-Backend

Write-Host "`n[2/3] Checking device..." -ForegroundColor Cyan
$target = Get-TargetDevice
Write-Host "      target: $($target.Serial)" -ForegroundColor Green

$apk = Get-AppPath $target.ForPhone
Deploy-App $target $apk