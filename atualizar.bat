@echo off
rem Recompila a aplicacao apos alteracoes no codigo
cd /d "%~dp0"
if exist "%~dp0tools\node\npm.cmd" set "PATH=%~dp0tools\node;%PATH%"
call npx prisma db push
call npx next build
pause
