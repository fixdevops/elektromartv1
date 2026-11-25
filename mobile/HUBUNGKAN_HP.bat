@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

set "ADB=D:\platform-tools\adb.exe"
if not exist "%ADB%" set "ADB=adb"

echo ==================================================
echo   ElektroMart - Jalankan di HP lewat kabel data
echo ==================================================
echo.
echo Sebelum lanjut, pastikan:
echo   1. Kabel data mendukung transfer data (bukan kabel cas saja)
echo   2. HP colok langsung ke komputer ini, bukan ke monitor/hub/charger
echo   3. "USB debugging" aktif di Developer Options HP
echo   4. Saat disambung, pilih mode USB "File transfer / MTP" di HP
echo   5. HP unlock, lalu tekan "Allow / Izinkan" saat muncul prompt ADB
echo   6. Expo Go sudah terpasang di HP
echo.

set "PORT=8081"
netstat -ano | findstr ":8081 " >nul
if errorlevel 1 (
  netstat -ano | findstr ":8082 " >nul
  if errorlevel 1 (
    echo Metro belum berjalan. Menyalakan server Expo di port 8081...
    start "ElektroMart Metro" cmd /k "npx expo start --localhost --port 8081"
    timeout /t 12 >nul
  ) else (
    set "PORT=8082"
    echo Mendeteksi Metro yang sudah berjalan di port 8082.
  )
)
echo Memakai Metro port !PORT!.

echo.
echo Memeriksa device Android...
"%ADB%" kill-server >nul 2>nul
"%ADB%" start-server >nul 2>nul

set /a TRY=0
set "STATE="
set "WARNED=0"

:WAITDEVICE
set "STATE="
for /f "usebackq tokens=1" %%A in (`"%ADB%" get-state 2^>nul`) do set "STATE=%%A"

if /i "%STATE%"=="device" goto DEVICEOK

if /i "%STATE%"=="unauthorized" (
  if "%WARNED%"=="0" (
    echo.
    echo [INFO] HP terdeteksi tapi belum diizinkan.
    echo Buka layar HP, tekan "Allow / Izinkan USB debugging".
    echo Centang "Always allow from this computer" lalu tekan OK.
    set "WARNED=1"
  )
  goto RETRY
)

if /i "%STATE%"=="offline" (
  if "%WARNED%"=="0" (
    echo.
    echo [INFO] HP dalam keadaan offline. Cabut dan colok kembali kabelnya.
    set "WARNED=1"
  )
  goto RETRY
)

:RETRY
set /a TRY+=1
if %TRY% GEQ 30 goto NODEVICE
ping -n 2 127.0.0.1 >nul
goto WAITDEVICE

:NODEVICE
echo.
echo "%ADB%" devices -l
"%ADB%" devices -l
echo.
echo Perangkat USB yang terdeteksi Windows:
powershell -NoProfile -Command "Get-PnpDevice -PresentOnly -ErrorAction SilentlyContinue | Where-Object { $_.Class -in 'Android','USB','Modem','Ports','MTP' } | Select-Object Status,Class,FriendlyName | Format-Table -AutoSize"
echo.
echo [ERROR] Device Android belum terdeteksi oleh ADB.
echo Coba: ganti kabel data, pindah port USB, aktifkan File transfer / MTP,
echo lalu tekan "Allow" saat prompt USB debugging muncul di HP.
echo.
pause
exit /b 1

:DEVICEOK
echo.
echo Device tersambung:
"%ADB%" devices -l

echo.
echo Meneruskan port !PORT! ke HP...
"%ADB%" reverse tcp:!PORT! tcp:!PORT!
if errorlevel 1 (
  echo [ERROR] Gagal meneruskan port !PORT!. Pastikan Metro berjalan.
  pause
  exit /b 1
)

set "PKGCHECK=%TEMP%\expo_pkg_check.txt"
"%ADB%" shell pm path host.exp.exponent >"%PKGCHECK%" 2>nul
findstr /C:"package:" "%PKGCHECK%" >nul
del "%PKGCHECK%" >nul 2>nul
if errorlevel 1 (
  echo.
  echo Expo Go belum terpasang. Membuka Play Store di HP...
  "%ADB%" shell am start -a android.intent.action.VIEW -d "https://play.google.com/store/apps/details?id=host.exp.exponent"
  echo Setelah terpasang, jalankan file ini lagi.
  echo.
  pause
  exit /b 1
)

set "VERCHECK=%TEMP%\expo_ver_check.txt"
"%ADB%" shell dumpsys package host.exp.exponent >"%VERCHECK%" 2>nul
findstr /C:"versionName=2.31" "%VERCHECK%" >nul
del "%VERCHECK%" >nul 2>nul
if errorlevel 1 (
  echo.
  echo [ERROR] Expo Go di HP tidak cocok dengan project ini.
  echo Project ElektroMart memakai Expo SDK 51.
  echo Versi Expo Go dari Play Store bisa lebih baru dan akan menampilkan
  echo "Project is incompatible with this version of Expo Go".
  echo.
  echo Menjalankan INSTALL_EXPO_GO_SDK51.bat untuk memasang versi yang cocok...
  call "%~dp0INSTALL_EXPO_GO_SDK51.bat"
  echo Setelah selesai, jalankan HUBUNGKAN_HP.bat lagi.
  echo.
  pause
  exit /b 1
)

echo.
echo Membuka ElektroMart di Expo Go...
"%ADB%" shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:!PORT!"

echo.
echo Selesai. Aplikasi akan terbuka di HP.
echo Kalau layar masih loading, tunggu Metro selesai bundle.
echo.
pause
