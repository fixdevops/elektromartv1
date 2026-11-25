@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

set "ADB=D:\platform-tools\adb.exe"
if not exist "%ADB%" set "ADB=adb"

echo ==================================================
echo  Pasang Expo Go SDK 51 di HP Android
echo ==================================================
echo.

"%ADB%" get-state >nul 2>nul
if errorlevel 1 (
  echo [ERROR] HP belum terhubung lewat ADB.
  echo Colok kabel data, pilih File transfer / MTP, dan izinkan USB debugging.
  pause
  exit /b 1
)

echo Mengambil tautan Expo Go SDK 51...
set "URLFILE=%TEMP%\expo-go-url.txt"
npx --yes expo-go url android 51 >"%URLFILE%" 2>&1
set "URL="
for /f "usebackq tokens=5" %%A in ("%URLFILE%") do set "URL=%%A"
del "%URLFILE%" >nul 2>nul
if not defined URL (
  echo [ERROR] Gagal mengambil tautan unduhan. Cek koneksi internet.
  pause
  exit /b 1
)
echo URL: !URL!

set "APK=%TEMP%\Exponent-SDK51.apk"
echo Mengunduh APK (sekitar 190 MB)...
powershell -NoProfile -Command "Invoke-WebRequest -Uri '!URL!' -OutFile '!APK!' -UseBasicParsing"
if not exist "!APK!" (
  echo [ERROR] Unduhan gagal.
  pause
  exit /b 1
)

echo.
echo Memasang ke HP...
"%ADB%" uninstall host.exp.exponent >nul 2>nul
"%ADB%" install "!APK!"
if errorlevel 1 (
  echo [ERROR] Instalasi gagal. Coba izinkan "Install via USB" di Developer Options HP.
  pause
  exit /b 1
)

echo.
echo Selesai. Expo Go SDK 51 sudah terpasang.
echo Jalankan HUBUNGKAN_HP.bat untuk membuka ElektroMart.
pause
