@echo off
chcp 65001 >nul
title Mastig - Sistema de Gestao de Manutencao

echo ========================================
echo  Mastig - Sistema de Gestao de Manutencao
echo ========================================
echo.

REM Navigate to script directory
cd /d "%~dp0"

REM Check if node_modules exists
if not exist "node_modules" (
    echo [1/3] Instalando dependencias...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo ERRO: Falha ao instalar dependencias!
        pause
        exit /b 1
    )
    echo.
)

REM Check if dependencies are up to date
echo [2/3] Verificando dependencias...
call npm install >nul 2>&1

REM Start the development server
echo [3/3] Iniciando servidor...
echo.
echo ========================================
echo  Servidor: http://localhost:3000
echo  Para encerrar: Ctrl+C
echo ========================================
echo.

call npm run dev

pause
