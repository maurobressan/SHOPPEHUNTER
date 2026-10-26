@echo off
chcp 65001 >nul
title Shopee Hunter Pro
cd /d "%~dp0"
rem Usa a copia portatil do Node.js em tools\node; se nao houver, a instalada no Windows
if exist "%~dp0tools\node\npm.cmd" set "PATH=%~dp0tools\node;%PATH%"
where npm >nul 2>nul || goto :semnode

echo ============================================
echo   SHOPEE HUNTER PRO
echo ============================================
echo.

if not exist node_modules\next (
  echo [1/3] Instalando bibliotecas - so na primeira vez, pode levar alguns minutos...
  call npm install --no-audit --no-fund || goto :falha
)
if not exist .env copy .env.example .env >nul
if not exist node_modules\.prisma\client\index.js call npx prisma generate
echo [2/3] Verificando banco de dados...
call npx prisma db push --skip-generate >nul || goto :falha
call npx tsx prisma/seed.ts >nul
if not exist .next\BUILD_ID (
  echo [3/3] Preparando a aplicacao - 1 a 2 minutos...
  call npx next build || goto :falha
)

echo.
echo  Programa iniciando... o navegador vai abrir em alguns segundos.
echo  Endereco: http://localhost:3000
echo.
echo  IMPORTANTE: mantenha esta janela aberta enquanto usa o programa.
echo  Para encerrar, feche esta janela.
echo.
start "" /min cmd /c "timeout /t 5 /nobreak >nul & start http://localhost:3000"
call npx next start -p 3000
echo.
echo O programa foi encerrado. Se apareceu erro acima (ex.: porta 3000 em uso), feche outras janelas do programa e tente de novo.
pause
exit /b 0

:falha
echo.
echo Ocorreu um erro na preparacao. Veja a mensagem acima.
pause
exit /b 1

:semnode
echo Node.js nao encontrado. Instale em https://nodejs.org
pause
exit /b 1
