# Варіанти синхронізації бази даних з Android

## 1. Локальний HTTP REST API (Рекомендовано) ⭐

### Переваги:
- ✅ Найпростіший у реалізації
- ✅ Не потребує зовнішніх сервісів
- ✅ Працює в локальній мережі (WiFi)
- ✅ Повний контроль над даними
- ✅ Можна додати автентифікацію

### Як працює:
1. Electron запускає HTTP сервер (наприклад, на порту 3000)
2. Android додаток підключається до IP адреси комп'ютера
3. REST API для всіх операцій (GET, POST, PUT, DELETE)

### Приклад API:
```
GET    /api/repairs          - список ремонтів
GET    /api/repairs/:id      - один ремонт
POST   /api/repairs          - створити ремонт
PUT    /api/repairs/:id      - оновити ремонт
DELETE /api/repairs/:id     - видалити ремонт

GET    /api/warehouse        - склад
GET    /api/transactions     - транзакції
GET    /api/executors        - виконавці
```

### Технології:
- **Electron**: Express.js або Koa.js
- **Android**: Retrofit, OkHttp, або Volley
- **База даних**: SQLite (одна база, синхронізація через API)

### Недоліки:
- Потрібен доступ до локальної мережі
- Комп'ютер має бути увімкненим

---

## 2. WebDAV протокол

### Переваги:
- ✅ Стандартний протокол
- ✅ Багато готових бібліотек
- ✅ Файловий доступ до бази даних
- ✅ Можна використовувати існуючі WebDAV клієнти

### Як працює:
1. Electron запускає WebDAV сервер
2. Android додаток монтує базу даних як файл
3. Синхронізація через файловий обмін

### Технології:
- **Electron**: `webdav-server` npm пакет
- **Android**: `sardine-android` або `okhttp-webdav`

### Недоліки:
- Потрібно обробляти конфлікти при одночасному доступі
- Менш гнучкий, ніж REST API

---

## 3. SQLite через файловий обмін (найпростіший, але обмежений)

### Переваги:
- ✅ Найпростіший варіант
- ✅ Прямий доступ до бази даних
- ✅ Не потрібен сервер

### Як працює:
1. База даних копіюється на Android (через USB, WiFi Direct, або файловий менеджер)
2. Android додаток працює з локальною копією
3. Періодична синхронізація (копіювання файлу туди-сюди)

### Технології:
- **Android**: Room Database (SQLite wrapper)
- **Синхронізація**: Ручне копіювання або автоматичне через WiFi

### Недоліки:
- ❌ Немає real-time синхронізації
- ❌ Конфлікти при одночасному редагуванні
- ❌ Потрібно вручну керувати версіями

---

## Рекомендація: REST API

### План реалізації:

#### 1. Electron (Backend):
```typescript
// electron/syncServer.ts
import express from 'express';
import { getDb } from './database';

const app = express();
app.use(express.json());

// CORS для Android
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// API endpoints
app.get('/api/repairs', (req, res) => {
  const db = getDb();
  const repairs = db.prepare('SELECT * FROM Ремонт').all();
  res.json(repairs);
});

app.post('/api/repairs', (req, res) => {
  // Створити новий ремонт
});

// Запуск сервера
export function startSyncServer(port: number = 3000) {
  app.listen(port, () => {
    console.log(`Sync server running on port ${port}`);
  });
}
```

#### 2. Android (Frontend):
```kotlin
// Retrofit interface
interface ApiService {
    @GET("api/repairs")
    suspend fun getRepairs(): List<Repair>
    
    @POST("api/repairs")
    suspend fun createRepair(@Body repair: Repair): Repair
    
    @PUT("api/repairs/{id}")
    suspend fun updateRepair(@Path("id") id: Int, @Body repair: Repair): Repair
}

// Room Database для локального кешу
@Entity
data class Repair(
    @PrimaryKey val id: Int,
    val receiptId: Int,
    val deviceName: String,
    // ...
)
```

#### 3. Синхронізація:
- **Онлайн**: Android синхронізується з Electron в реальному часі
- **Офлайн**: Android працює з локальною копією (Room), синхронізація при підключенні

---

## Безпека

### Рекомендації:
1. **Автентифікація**: API ключ або токен
2. **HTTPS**: Для продакшн (самопідписаний сертифікат)
3. **Firewall**: Обмежити доступ тільки до локальної мережі
4. **Валідація**: Перевірка всіх вхідних даних

---

## Альтернативні рішення

### 4. MQTT (для real-time)
- Pub/Sub протокол
- Real-time оновлення
- Складніше в налаштуванні

### 5. Firebase Realtime Database
- Готове рішення від Google
- Автоматична синхронізація
- Потрібен інтернет
- Платне для великих обсягів

### 6. Supabase / PocketBase
- Open-source альтернатива Firebase
- SQL база даних
- Real-time синхронізація
- Потрібен сервер або хостинг

---

## Висновок

**Найкращий варіант**: Локальний HTTP REST API
- Простий у реалізації
- Повний контроль
- Працює офлайн (локальна мережа)
- Легко додати автентифікацію та безпеку

**Час реалізації**: 2-3 дні для базової версії


