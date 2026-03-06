@echo off
echo Starting OpenBrowser...
echo (If this fails, try running as Administrator)

:: Bypass PowerShell execution policy and run npm start
powershell -ExecutionPolicy Bypass -Command "npm start"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo npm start failed. Trying direct launch...
    .\node_modules\.bin\electron .
)

pause
