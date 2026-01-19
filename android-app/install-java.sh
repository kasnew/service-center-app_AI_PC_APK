#!/bin/bash
# Скрипт для встановлення JDK 17 на Manjaro/Arch Linux

echo "Перевірка наявності Java..."
if command -v java &> /dev/null; then
    echo "Java вже встановлена:"
    java -version
    exit 0
fi

echo "Встановлення JDK 17..."
sudo pacman -S --noconfirm jdk17-openjdk

if [ $? -eq 0 ]; then
    echo ""
    echo "JDK 17 успішно встановлено!"
    echo ""
    echo "Перевірка встановлення:"
    java -version
    javac -version
    echo ""
    echo "JAVA_HOME:"
    echo "export JAVA_HOME=/usr/lib/jvm/java-17-openjdk"
    echo ""
    echo "Додайте до ~/.bashrc або ~/.zshrc:"
    echo "export JAVA_HOME=/usr/lib/jvm/java-17-openjdk"
    echo "export PATH=\$JAVA_HOME/bin:\$PATH"
else
    echo "Помилка встановлення JDK 17"
    exit 1
fi

