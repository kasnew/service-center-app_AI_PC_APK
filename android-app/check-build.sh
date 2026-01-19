#!/bin/bash
# Скрипт для перевірки компіляції Android проекту

cd "$(dirname "$0")"

echo "Перевірка Java..."
if ! command -v java &> /dev/null; then
    echo "❌ Java не встановлена!"
    echo "Запустіть: ./install-java.sh"
    exit 1
fi

echo "✅ Java встановлена:"
java -version
echo ""

echo "Перевірка Gradle wrapper..."
if [ ! -f "gradle/wrapper/gradle-wrapper.jar" ]; then
    echo "❌ Gradle wrapper jar не знайдено"
    exit 1
fi

echo "✅ Gradle wrapper знайдено"
echo ""

echo "Запуск збірки проекту..."
./gradlew clean assembleDebug --no-daemon 2>&1 | tee build.log

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo ""
    echo "✅ Збірка успішна!"
    echo "APK файл: app/build/outputs/apk/debug/app-debug.apk"
else
    echo ""
    echo "❌ Помилка збірки. Перевірте build.log для деталей"
    echo "Останні помилки:"
    tail -50 build.log | grep -E "(error|Error|ERROR|FAILED)" | head -20
    exit 1
fi

