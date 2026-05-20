@echo off
title Tuition Center Management System Launcher
color 0B
echo =========================================================================
echo   TUITION CENTER MANAGEMENT SYSTEM - CYBER-GLOW SPA LAUNCHER
echo =========================================================================
echo.
echo [1/3] Locating project directory...
cd /d "%~dp0"
echo     Active: %CD%
echo.
echo [2/3] Starting Node.js Express Server...
echo     (This will automatically bind to database pool on port 3000)
echo.
echo [3/3] Launching administrative command portal in your browser...
start http://localhost:3000
echo.
echo -------------------------------------------------------------------------
echo   SERVER TERMINAL ACTIVE: Keep this window open while showing the project!
echo   Press Ctrl + C inside this window to stop the server at any time.
echo -------------------------------------------------------------------------
echo.
npm run dev
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [WARNING] 'npm run dev' failed or was interrupted. Retrying with 'npm start'...
    npm start
)
pause
