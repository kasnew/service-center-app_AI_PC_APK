#!/bin/bash

# Скрипт для експорту бази даних з Electron додатку в Android проект
# Використання: ./export-database.sh [path-to-electron-db]

set -e

# Шлях до бази даних Electron (за замовчуванням - в корені проекту)
ELECTRON_DB="${1:-../1.sqlite}"
ANDROID_ASSETS_DIR="app/src/main/assets/databases"
ANDROID_DB_NAME="service_center_db"

# Перевірка наявності бази даних
if [ ! -f "$ELECTRON_DB" ]; then
    echo "Помилка: База даних не знайдена: $ELECTRON_DB"
    echo "Використання: $0 [path-to-electron-db]"
    exit 1
fi

# Створення директорії assets/databases якщо не існує
mkdir -p "$ANDROID_ASSETS_DIR"

# Копіювання бази даних
echo "Копіювання бази даних з $ELECTRON_DB в $ANDROID_ASSETS_DIR/$ANDROID_DB_NAME..."
cp "$ELECTRON_DB" "$ANDROID_ASSETS_DIR/$ANDROID_DB_NAME"

# Перевірка успішності
if [ -f "$ANDROID_ASSETS_DIR/$ANDROID_DB_NAME" ]; then
    DB_SIZE=$(du -h "$ANDROID_ASSETS_DIR/$ANDROID_DB_NAME" | cut -f1)
    echo "✓ База даних успішно скопійована!"
    echo "  Розмір: $DB_SIZE"
    echo "  Розташування: $ANDROID_ASSETS_DIR/$ANDROID_DB_NAME"
    echo ""
    echo "Примітка: База даних буде включена в APK при збірці."
    echo "При першому запуску додатку, якщо локальної бази даних немає,"
    echo "вона буде скопійована з assets в робочу директорію."
else
    echo "Помилка: Не вдалося скопіювати базу даних"
    exit 1
fi





