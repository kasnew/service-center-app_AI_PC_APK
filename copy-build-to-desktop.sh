#!/bin/bash

# Script to copy AppImage build to Desktop
PROJECT_DIR="/home/kasnew/Стільниця/Service Center Project"
DESKTOP_DIR="$HOME/Desktop"
BUILD_DIR="$PROJECT_DIR/release/1.0.0"
BUILD_NAME="ServiceCenterApp-Linux-1.0.0.AppImage"
DESKTOP_BUILD_DIR="$DESKTOP_DIR/ServiceCenterApp-Build"

echo "Шукаю зібраний AppImage..."

# Check if build exists
if [ ! -f "$BUILD_DIR/$BUILD_NAME" ]; then
    echo "❌ Помилка: AppImage не знайдено в $BUILD_DIR"
    echo "Перевірте, чи завершилася компіляція успішно."
    exit 1
fi

echo "✅ Знайдено: $BUILD_NAME"

# Create directory on Desktop
mkdir -p "$DESKTOP_BUILD_DIR"

# Copy AppImage
echo "Копіюю AppImage на робочий стіл..."
cp "$BUILD_DIR/$BUILD_NAME" "$DESKTOP_BUILD_DIR/"

# Make it executable
chmod +x "$DESKTOP_BUILD_DIR/$BUILD_NAME"

echo "✅ Готово!"
echo "📁 AppImage скопійовано в: $DESKTOP_BUILD_DIR"
echo "🚀 Для запуску: $DESKTOP_BUILD_DIR/$BUILD_NAME"

