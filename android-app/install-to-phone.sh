#!/bin/bash
# Скрипт для встановлення Android додатку на телефон

APK_PATH="app/build/outputs/apk/debug/app-debug.apk"

if [ ! -f "$APK_PATH" ]; then
    echo "❌ APK файл не знайдено: $APK_PATH"
    echo "Спочатку зберіть проект: ./gradlew assembleDebug"
    exit 1
fi

echo "Перевірка підключення пристрою..."
adb devices

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ ADB не знайдено або пристрій не підключено"
    echo ""
    echo "Варіанти встановлення:"
    echo ""
    echo "1. Через ADB (якщо телефон підключено через USB):"
    echo "   - Увімкніть 'Режим розробника' на телефоні"
    echo "   - Увімкніть 'USB налагодження'"
    echo "   - Підключіть телефон через USB"
    echo "   - Запустіть: adb install $APK_PATH"
    echo ""
    echo "2. Через файловий менеджер:"
    echo "   - Скопіюйте файл: $APK_PATH"
    echo "   - Передайте на телефон (через USB, Bluetooth, або інтернет)"
    echo "   - Відкрийте файл на телефоні та встановіть"
    echo ""
    echo "3. Через Android Studio:"
    echo "   - Відкрийте проект в Android Studio"
    echo "   - Підключіть телефон"
    echo "   - Натисніть 'Run' (зелена кнопка ▶)"
    exit 1
fi

DEVICE_COUNT=$(adb devices | grep -v "List" | grep "device" | wc -l)

if [ "$DEVICE_COUNT" -eq 0 ]; then
    echo ""
    echo "❌ Пристрій не знайдено"
    echo ""
    echo "Інструкції:"
    echo "1. Увімкніть 'Режим розробника' на телефоні:"
    echo "   - Налаштування → Про телефон → Натисніть 7 разів на 'Номер збірки'"
    echo ""
    echo "2. Увімкніть 'USB налагодження':"
    echo "   - Налаштування → Для розробників → USB налагодження"
    echo ""
    echo "3. Підключіть телефон через USB"
    echo ""
    echo "4. Дозвольте налагодження USB на телефоні (з'явиться запит)"
    echo ""
    echo "Альтернатива: Скопіюйте APK файл на телефон вручну"
    echo "APK файл: $(pwd)/$APK_PATH"
    exit 1
fi

echo ""
echo "Встановлення додатку..."
adb install -r "$APK_PATH"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Додаток успішно встановлено!"
    echo ""
    echo "Запуск додатку:"
    adb shell am start -n com.servicecenter.app/.MainActivity
else
    echo ""
    echo "❌ Помилка встановлення"
    echo ""
    echo "Спробуйте:"
    echo "1. Переконайтеся, що на телефоні дозволено встановлення з невідомих джерел"
    echo "2. Спробуйте: adb install -r -d $APK_PATH"
    exit 1
fi

