#!/bin/bash
echo "Очікую підключення пристрою..."
echo "Підключіть телефон через USB та увімкніть USB налагодження"
echo ""

APK_PATH="app/build/outputs/apk/debug/app-debug.apk"

while true; do
    DEVICE=$(adb devices | grep -v "List" | grep "device$" | head -1)
    
    if [ ! -z "$DEVICE" ]; then
        echo "✅ Пристрій знайдено!"
        echo "Встановлення додатку..."
        adb install -r "$APK_PATH"
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ Додаток успішно встановлено!"
            echo "Запуск додатку..."
            adb shell am start -n com.servicecenter.app/.MainActivity
            exit 0
        else
            echo "❌ Помилка встановлення"
            exit 1
        fi
    fi
    
    sleep 2
done
