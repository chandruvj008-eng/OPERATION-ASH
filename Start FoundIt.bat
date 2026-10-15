@echo off
cd /d "%~dp0"
echo Starting FoundIt. Keep this window open while using the website.
start "" /min cmd /c "timeout /t 2 /nobreak >nul & start http://127.0.0.1:3000/"
node server.js
echo FoundIt has stopped. Press any key to close this window.
pause >nul
