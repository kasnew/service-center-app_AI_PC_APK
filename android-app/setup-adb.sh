#!/bin/bash
# Скрипт для встановлення ADB та роботи з телефоном

echo "Перевірка наявності ADB..."
if command -v adb &> /dev/null; then
    echo "✅ ADB вже встановлено"
    adb --version
else
    echo "Встановлення ADB..."
    echo "Потрібен пароль для встановлення:"
    sudo pacman -S --noconfirm android-tools
    
    if [ $? -eq 0 ]; then
        echo "✅ ADB успішно встановлено"
    else
        echo "❌ Помилка встановлення ADB"
        exit 1
    fi
fi

echo ""
echo "Перевірка підключення телефону..."
adb devices

echo ""
echo "Якщо телефон не відображається:"
echo "1. Увімкніть 'USB налагодження' на телефоні"
echo "2. Дозвольте налагодження USB (з'явиться запит на телефоні)"
echo "3. Запустіть скрипт знову"


