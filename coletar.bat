@echo off
rem Coleta diaria (use no Agendador de Tarefas do Windows)
cd /d "%~dp0"
if exist "%~dp0tools\node\npm.cmd" set "PATH=%~dp0tools\node;%PATH%"
call npx tsx scripts/coletar.ts >> coleta.log 2>&1
