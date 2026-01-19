# Виправлення помилки Gradle

## Проблема
Помилка: `Unable to find method 'org.gradle.api.file.FileCollection org.gradle.api.artifacts.Configuration.fileCollection(org.gradle.api.specs.Spec)'`

## Причина
Несумісність версій Gradle та плагінів. Gradle 9.2.1 не підтримується поточними версіями Android Gradle Plugin.

## Рішення

### 1. Використано стабільні версії:
- **Gradle**: 8.5 (замість 9.2.1)
- **Android Gradle Plugin**: 8.5.0
- **Kotlin**: 1.9.22

### 2. Якщо помилка залишиться:

#### Варіант A: Очистити кеш Gradle
```bash
cd android-app
./gradlew clean --no-daemon
rm -rf .gradle
rm -rf build
rm -rf app/build
```

#### Варіант B: Зупинити всі Gradle daemons
```bash
cd android-app
./gradlew --stop
```

#### Варіант C: Повна очистка
1. Закрийте Android Studio
2. Видаліть папки:
   - `android-app/.gradle`
   - `android-app/build`
   - `android-app/app/build`
3. Відкрийте Android Studio знову
4. File → Invalidate Caches / Restart

### 3. Якщо все ще не працює:

Спробуйте використати Gradle 8.2:
```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.2-bin.zip
```

## Рекомендовані версії для стабільної роботи:

- **Gradle**: 8.2 - 8.5
- **Android Gradle Plugin**: 8.2.0 - 8.5.0
- **Kotlin**: 1.9.20 - 1.9.22
- **Hilt**: 2.48

## Перевірка версій

Після виправлення перевірте:
1. File → Project Structure → Project → Gradle Version (має бути 8.5)
2. File → Project Structure → SDK Location → Android Gradle Plugin Version (має бути 8.5.0)


