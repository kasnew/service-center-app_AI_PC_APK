#!/bin/bash

# Скрипт для запуску ServiceCenterApp на Linux

# Перевірка чи існує AppImage
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERSION="0.0.0"
APPIMAGE="${SCRIPT_DIR}/release/${VERSION}/ServiceCenterApp-Linux-${VERSION}.AppImage"

if [ -f "$APPIMAGE" ]; then
    echo "Запуск ServiceCenterApp..."
    chmod +x "$APPIMAGE"
    "$APPIMAGE"
else
    echo "Помилка: Не знайдено файл $APPIMAGE"
    echo "Будь ласка, спочатку виконайте збірку: npm run build:linux"
    exit 1
fi
