# Інструкція з встановлення

## Вимоги

- Android Studio Hedgehog (2023.1.1) або новіша версія
- Android SDK 24+ (Android 7.0+)
- Kotlin 1.9.22+
- JDK 17+

## Кроки встановлення

1. **Відкрийте Android Studio**
   - File → Open
   - Виберіть папку `android-app-v2`

2. **Синхронізація Gradle**
   - Android Studio автоматично запропонує синхронізувати проєкт
   - Натисніть "Sync Now"
   - Зачекайте завантаження всіх залежностей

3. **Налаштування SDK**
   - Переконайтеся, що встановлено Android SDK 24+
   - File → Settings → Appearance & Behavior → System Settings → Android SDK

4. **Підключення пристрою**
   - Увімкніть режим розробника на Android пристрої
   - Увімкніть USB налагодження
   - Підключіть пристрій до ПК

5. **Запуск додатку**
   - Натисніть кнопку Run (▶) або Shift+F10
   - Виберіть пристрій
   - Зачекайте збірки та встановлення

## Перший запуск

1. При першому запуску встановіть PIN (4-6 цифр)
2. Підтвердіть PIN
3. Після цього відкриється головний екран

## Налаштування для розробки

### Локальна збірка

```bash
cd android-app-v2
./gradlew assembleDebug
```

APK файл буде в: `app/build/outputs/apk/debug/app-debug.apk`

### Релізна збірка

```bash
./gradlew assembleRelease
```

## Відомі проблеми

### Помилка з SQLCipher

Якщо виникає помилка з SQLCipher, переконайтеся що:
- Використовується правильна версія: `net.zetetic:sqlcipher-android:4.5.4`
- Room налаштований з `SupportOpenHelperFactory`

### Помилка з Ktor

Якщо виникає помилка з Ktor, переконайтеся що:
- Додано плагін `kotlinx-serialization`
- Всі залежності Ktor синхронізовані

## Підтримка

При виникненні проблем перевірте:
1. Логи Android Studio (Logcat)
2. Gradle синхронізацію
3. Версії залежностей

