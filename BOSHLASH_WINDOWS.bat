@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js topilmadi. https://nodejs.org saytidan 22+ versiyasini o'rnating.
  pause
  exit /b 1
)
echo ================================================
echo   YOU ME ONLINE SHOP - LOCAL SERVER
 echo ================================================
echo   Sayt:        http://localhost:3000
 echo   Admin panel: http://localhost:3000/admin
 echo   Demo login:  admin
 echo   Demo parol:  YouMeDemo!2026
 echo ================================================
echo.
node server.js
pause
