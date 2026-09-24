@echo off
setlocal
cd /d "%~dp0"

REM -----------------------------------------------
REM  Build an APK that targets the cloud backend.
REM  Defaults to the hosted API; pass a base URL to override.
REM  Usage:  build-phone.bat   OR   build-phone.bat http://192.168.1.50:5000/
REM -----------------------------------------------

set URL=%~1
if "%URL%"=="" set URL=https://tarsu-clearance-api.onrender.com/

set JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot
set PATH=%JAVA_HOME%\bin;%PATH%

echo.
echo Building phone APK against backend at %URL%
echo.

call android\gradlew.bat -p android assembleDebug -PapiBaseUrl=%URL%
if errorlevel 1 (
    echo BUILD FAILED
    pause
    exit /b 1
)

mkdir phone-apk >nul 2>&1
copy /y android\app\build\outputs\apk\debug\app-debug.apk phone-apk\clearance-phone.apk >nul
echo.
echo Phone APK ready:  phone-apk\clearance-phone.apk
echo Phone must be able to reach %URL%
pause