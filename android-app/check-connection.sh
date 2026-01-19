#!/bin/bash
# Скрипт для перевірки підключення та встановлення додатку

cd "$(dirname "$0")"

echo "=== Перевірка ADB ==="
if ! command -v adb &> /dev/null; then
    echo "❌ ADB не встановлено"
    echo "Встановіть: sudo pacman -S android-tools"
    echo "Або запустіть: ./setup-adb.sh"
    exit 1
fi

echo "✅ ADB встановлено"
echo ""

echo "=== Перевірка підключення телефону ==="
DEVICES=$(adb devices | grep -v "List" | grep "device" | wc -l)

if [ "$DEVICES" -eq 0 ]; then
    echo "❌ Телефон не підключено"
    echo ""
    echo "Інструкції:"
    echo "1. Увімкніть 'Режим розробника' на телефоні"
    echo "2. Увімкніть 'USB налагодження'"
    echo "3. Підключіть телефон через USB"
    echo "4. Дозвольте налагодження USB на телефоні"
    exit 1
fi

echo "✅ Телефон підключено:"
adb devices
echo ""

echo "=== Перевірка мережі ==="
echo "Перевірка доступності сервера з телефону..."
adb shell "ping -c 1 192.168.0.101" 2>&1 | head -3

echo ""
echo "=== Встановлення/оновлення додатку ==="
if [ ! -f "app/build/outputs/apk/debug/app-debug.apk" ]; then
    echo "❌ APK файл не знайдено"
    echo "Спочатку зберіть проект: ./gradlew assembleDebug"
    exit 1
fi

echo "Встановлення додатку..."
adb install -r app/build/outputs/apk/debug/app-debug.apk

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Додаток успішно встановлено/оновлено!"
    echo ""
    echo "=== Перевірка логів ==="
    echo "Для перегляду логів запустіть:"
    echo "  adb logcat | grep -i 'SettingsViewModel\|ApiClient\|OkHttp'"
    echo ""
    echo "Або в Android Studio: Logcat → фільтр 'SettingsViewModel'"
else
    echo ""
    echo "❌ Помилка встановлення"
    exit 1
fi


