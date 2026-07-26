@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo   KIZASHI PRO 9.14 TRADE IMPORT GUIDE BETA
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed.
  echo Install Node.js, then run this file again.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm was not found.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing packages. This may take several minutes...
  call npm install
  if errorlevel 1 (
    echo.
    echo ERROR: npm install failed.
    pause
    exit /b 1
  )
)

echo.
echo Starting KIZASHI...
start "KIZASHI PRO 9.14 TRADE IMPORT GUIDE BETA" cmd /k "npm run dev"
timeout /t 6 /nobreak >nul
start "" "http://localhost:5173/#/home"
exit /b 0
