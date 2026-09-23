# Launch the Taraba State University Clearance app on the emulator.
# Starts: backend -> emulator (if not running) -> installs APK -> opens app.

$ErrorActionPreference = "Stop"

$root = "C:\Users\MACHINE\Documents\Android-Based Student Clearance System"
$apk  = "$root\android\app\build\outputs\apk\debug\app-debug.apk"
$adb  = "C:\Users\MACHINE\AppData\Local\Android\Sdk\platform-tools\adb.exe"
$emu  = "C:\Users\MACHINE\AppData\Local\Android\Sdk\emulator\emulator.exe"
$node = "C:\Program Files\nodejs\node.exe"
$avd  = "clearanceAVD"

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
    Write-Host "`n[2/3] Checking emulator..." -ForegroundColor Cyan
    $devices = & $adb devices | Where-Object { $_ -match "^emulator-\d+\s+device$" }
    if ($devices) {
        Write-Host "      emulator already running: $($devices -join ', ')" -ForegroundColor Green
        return
    }
    Write-Host "      booting emulator ($avd) - first boot can take a few minutes..." -ForegroundColor Yellow
    Start-Process -FilePath $emu -ArgumentList "-avd", $avd, "-no-snapshot-save" -WindowStyle Minimized
    for ($i = 0; $i -lt 60; $i++) {
        Start-Sleep -Seconds 10
        $boot = & $adb shell getprop sys.boot_completed 2>$null
        if ($boot -match "1") { Write-Host "      emulator booted after ~$((($i + 1) * 10))s" -ForegroundColor Green; return }
    }
    Write-Host "      emulator did not finish booting - check the emulator window" -ForegroundColor Red
    exit 1
}

function Deploy-App {
    Write-Host "`n[3/3] Installing & launching app..." -ForegroundColor Cyan
    & $adb install -r $apk | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-Host "      install failed" -ForegroundColor Red; exit 1 }
    & $adb shell am start -n "com.tsunu.clearance/.auth.LoginActivity" | Out-Null
    Write-Host "      app launched - login to continue" -ForegroundColor Green
}

Start-Backend
Start-Emulator
Deploy-App