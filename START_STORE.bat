@echo off
echo ============================================
echo   Likitha Store - Starting...
echo ============================================
echo.

set PATH=%PATH%;C:\Program Files\nodejs;%APPDATA%\npm

:: Delete old broken node_modules if exists
if exist "node_modules\better-sqlite3" (
    echo Removing old modules...
    rmdir /s /q node_modules
)

:: Install dependencies
if not exist "node_modules" (
    echo Installing dependencies - please wait 1-2 minutes...
    "C:\Program Files\nodejs\npm.cmd" install
    echo.
)

echo.
echo ============================================
echo   Store URL:  http://localhost:3000
echo   Admin URL:  http://localhost:3000/admin
echo   Admin Login: admin@likitha.com / admin123
echo ============================================
echo.
echo Keep this window open while using the store.
echo Press Ctrl+C to stop the server.
echo.

start http://localhost:3000
"C:\Program Files\nodejs\node.exe" server.js
pause
