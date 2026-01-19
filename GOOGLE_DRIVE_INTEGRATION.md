# Інтеграція з Google Drive - Інструкція

## Що потрібно для інтеграції

### 1. Google Cloud Console налаштування

#### Крок 1: Створити проект в Google Cloud Console
1. Перейти на https://console.cloud.google.com/
2. Створити новий проект або вибрати існуючий
3. Записати Project ID

#### Крок 2: Увімкнути Google Drive API
1. В меню вибрати "APIs & Services" > "Library"
2. Знайти "Google Drive API"
3. Натиснути "Enable"

#### Крок 3: Створити OAuth 2.0 credentials
1. Перейти в "APIs & Services" > "Credentials"
2. Натиснути "Create Credentials" > "OAuth client ID"
3. Якщо потрібно, налаштувати OAuth consent screen:
   - User Type: External (для тестування) або Internal (для робочого Google Workspace)
   - Додати App name, User support email
   - Додати scopes: `https://www.googleapis.com/auth/drive.file`
4. Створити OAuth 2.0 Client ID:
   - Application type: **Desktop app** (для Electron)
   - Name: "Service Center App" (або будь-яка назва)
5. Завантажити credentials JSON файл

#### Крок 4: Налаштувати OAuth consent screen
- Scopes, які потрібні:
  - `https://www.googleapis.com/auth/drive.file` - для доступу до файлів, створених додатком
  - Можна додати `https://www.googleapis.com/auth/drive` для повного доступу (не рекомендовано)

### 2. NPM залежності

Потрібно встановити наступні пакети:

```bash
npm install googleapis
npm install --save-dev @types/googleapis
```

Або для використання OAuth2 flow:
```bash
npm install google-auth-library
```

### 3. Структура файлів

Потрібно створити:

1. **`electron/googleDrive.ts`** - модуль для роботи з Google Drive API
   - OAuth 2.0 автентифікація
   - Завантаження файлів
   - Завантаження файлів
   - Список файлів
   - Видалення файлів

2. **`electron/oauth.ts`** - модуль для OAuth flow
   - Зберігання токенів
   - Оновлення токенів
   - Автентифікація через Electron BrowserWindow

3. **IPC handlers** в `electron/ipcHandlers.ts`:
   - `google-drive-auth` - ініціалізація автентифікації
   - `google-drive-upload-backup` - завантаження бекапу
   - `google-drive-download-backup` - завантаження бекапу
   - `google-drive-list-backups` - список бекапів у Drive
   - `google-drive-delete-backup` - видалення бекапу з Drive
   - `google-drive-sync-status` - статус синхронізації

4. **UI компоненти**:
   - Налаштування Google Drive в Settings
   - Кнопка авторизації
   - Список бекапів у Drive
   - Налаштування автоматичної синхронізації

### 4. Безпека

#### Зберігання credentials:
- **НЕ** комітити `credentials.json` в git
- Додати в `.gitignore`: `credentials.json`, `*.credentials.json`
- Зберігати credentials в `electron/` або окремій папці з обмеженим доступом

#### Зберігання токенів:
- Токени зберігати в зашифрованому вигляді
- Використовувати Electron's `safeStorage` API або шифрувати через наш модуль `encryption.ts`
- Зберігати в `userData` директорії з правами 0o600

#### Scopes (права доступу):
- Використовувати мінімальні необхідні scopes
- `drive.file` - доступ тільки до файлів, створених додатком (рекомендовано)
- `drive` - повний доступ (не рекомендовано для безпеки)

### 5. Процес автентифікації

1. Користувач натискає "Підключити Google Drive"
2. Відкривається Electron BrowserWindow з Google OAuth сторінкою
3. Користувач авторизується
4. Отримуємо authorization code
5. Обмінюємо code на access token та refresh token
6. Зберігаємо токени в безпечному місці
7. Використовуємо токени для API запитів

### 6. Функціональність

#### Завантаження бекапів:
- Після створення локального бекапу (зашифрованого)
- Автоматично завантажувати в Google Drive
- Зберігати метадані (дата, розмір, назва)

#### Завантаження бекапів:
- Показувати список бекапів з Google Drive
- Можливість завантажити та відновити

#### Автоматична синхронізація:
- Опція автоматичного завантаження нових бекапів
- Налаштування частоти синхронізації
- Логування помилок синхронізації

### 7. Обмеження та квоти

Google Drive API має обмеження:
- **Quota**: 1000 requests per 100 seconds per user (за замовчуванням)
- **File size**: до 5TB на файл
- **Storage**: залежить від плану Google Drive користувача

Для production може знадобитися:
- Збільшити quota в Google Cloud Console
- Додати обробку rate limiting
- Додати retry logic для failed requests

### 8. Тестування

1. Використовувати тестовий Google акаунт
2. Перевірити OAuth flow
3. Перевірити завантаження/завантаження файлів
4. Перевірити обробку помилок (немає інтернету, невалідні токени)
5. Перевірити оновлення токенів

### 9. Наступні кроки

Після налаштування:
1. ✅ Створити Google Cloud проект
2. ✅ Отримати OAuth credentials
3. ✅ Встановити npm пакети
4. ⏳ Створити модуль OAuth автентифікації
5. ⏳ Створити модуль Google Drive API
6. ⏳ Додати IPC handlers
7. ⏳ Створити UI для налаштувань
8. ⏳ Інтегрувати з існуючою системою бекапів

---

## Приклад структури коду

### `electron/googleDrive.ts` (основні функції):
```typescript
- authenticate()
- uploadFile(filePath, fileName)
- downloadFile(fileId, savePath)
- listFiles(folderId?)
- deleteFile(fileId)
- refreshAccessToken()
```

### `electron/oauth.ts`:
```typescript
- getAuthUrl()
- handleAuthCallback(code)
- getStoredTokens()
- saveTokens(tokens)
- isTokenValid()
- refreshTokenIfNeeded()
```

### IPC Handlers:
```typescript
- 'google-drive-auth'
- 'google-drive-upload-backup'
- 'google-drive-download-backup'
- 'google-drive-list-backups'
- 'google-drive-delete-backup'
- 'google-drive-disconnect'
```

---

## Важливі зауваження

1. **Безпека**: Всі бекапи вже зашифровані перед завантаженням
2. **Токени**: Зберігати в зашифрованому вигляді
3. **Credentials**: Ніколи не комітити в git
4. **Error handling**: Обробляти всі можливі помилки (немає інтернету, невалідні токени, quota exceeded)
5. **User experience**: Показувати статус синхронізації, дозволяти ручне керування

