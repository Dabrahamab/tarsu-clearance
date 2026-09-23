@echo off
setlocal
cd /d "%~dp0"

REM -----------------------------------------------
REM  Build an APK that targets a physical phone.
REM  Defaults to this PC's LAN IP on port 5000.
REM  Usage:  build-phone.bat  or  build-phone.bat 192.168.1.50
REM -----------------------------------------------

set IP=%~1
if "%IP%"=="" set IP=10.145.253.34

set JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot
set PATH=%JAVA_HOME%\bin;%PATH%

echo.
echo Building phone APK against backend at http://%IP%:5000/
echo.

call android\gradlew.bat -p android assembleDebug -PapiBaseUrl=http://%IP%:5000/
if errorlevel 1 (
    echo BUILD FAILED
    pause
    exit /b 1
)

mkdir phone-apk >nul 2>&1
copy /y android\app\build\outputs\apk\debug\app-debug.apk phone-apk\clearance-phone.apk >nul
echo.
echo Phone APK ready:  phone-apk\clearance-phone.apk
echo Phone and %IP% must be on the same Wi-Fi.
pause