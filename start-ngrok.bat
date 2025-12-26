@echo off
echo Stopping any existing ngrok processes...
taskkill /F /IM ngrok.exe 2>nul
echo.
echo Starting ngrok tunnel to localhost:3005...
echo.
.\ngrok.exe http 3005
pause

