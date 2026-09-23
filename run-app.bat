@echo off
setlocal
set "ROOT=%~dp0"
set "APK=%ROOT%android\app\build\outputs\apk\debug\app-debug.apk"
set "JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
set "PATH=%JAVA_HOME%\bin;C:\Program Files\nodejs;%PATH%"
set "ADB=C:\Users\MACHINE\AppData\Local\Android\Sdk\platform-tools\adb.exe"
set "EMU=C:\Users\MACHINE\AppData\Local\Android\Sdk\emulator\emulator.exe"

echo [1/4] Backend
netstat -ano | findstr ":5000" | findstr "LISTENING" >nul
if not errorlevel 1 goto backend_up
start "clearance-backend" /min cmd /c "cd /d "%ROOT%backend" && node src/server.js"
timeout /t 5 /nobreak >nul
:backend_up
echo   backend running on port 5000

echo [2/4] Emulator / device
"%ADB%" get-state >nul 2>&1
if not errorlevel 1 goto device_up
start "" /min "%EMU%" -avd clearanceAVD -no-snapshot-save
echo   booting clearanceAVD (up to ~3 min)...
set tries=0
:waitloop
set /a tries+=1
if %tries% gtr 40 echo   ERROR: emulator did not boot in time & exit /b 1
timeout /t 5 /nobreak >nul
"%ADB%" shell getprop sys.boot_completed 2>nul | findstr "1" >nul
if errorlevel 1 goto waitloop
:device_up
echo   device ready

echo [3/4] APK
if exist "%APK%" goto apk_ready
cd /d "%ROOT%android"
echo   building APK (first run, ~1 min)...
call gradlew.bat assembleDebug
if errorlevel 1 echo   ERROR: build failed & exit /b 1
:apk_ready
echo   apk ready

echo [4/4] Install and launch
"%ADB%" install -r "%APK%"
"%ADB%" shell am start -n com.tsunu.clearance/.auth.LoginActivity
echo Done - check the emulator window.
endlocal