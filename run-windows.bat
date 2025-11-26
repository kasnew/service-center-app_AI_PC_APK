@echo off
REM Скрипт для запуску ServiceCenterApp на Windows

set VERSION=0.0.0
set PORTABLE=release\%VERSION%\ServiceCenterApp-Windows-%VERSION%-Portable.exe

if exist "%PORTABLE%" (
    echo Запуск ServiceCenterApp...
    "%PORTABLE%"
) else (
    echo Помилка: Не знайдено файл %PORTABLE%
    echo Будь ласка, спочатку виконайте збірку: npm run build:win
    pause
)
