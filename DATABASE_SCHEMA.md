# Схема бази даних Service Center App

## Версії бази даних
- **PC (SQLite/better-sqlite3)**: Версія 2
- **Android (Room)**: Версія 3

Останнє оновлення: 2026-01-26

---

## Таблиця `Расходники` (Warehouse Items / Склад)

Зберігає інформацію про товари на складі та їх продаж.

| Колонка | Тип | Опис | Маппінг TypeScript | Маппінг Android |
|---------|-----|------|--------------------|--------------------|
| `ID` | INTEGER PRIMARY KEY AUTOINCREMENT | Унікальний ідентифікатор | `id: number` | `id: Int` |
| `Наименование_расходника` | TEXT | Назва товару | `name: string` | `name: String` |
| `Поставщик` | TEXT | Постачальник | `supplier: string` | `supplier: String?` |
| `Код_товара` | TEXT | Унікальний код товару (для групування) | `productCode?: string` | `productCode: String?` |
| `Цена_уе` | REAL | Ціна в USD | `priceUsd: number` | `priceUsd: Double` |
| `Курс` | REAL | Курс валюти | `exchangeRate?: number` | `exchangeRate: Double` |
| `Вход` | REAL | Вартість закупки (грн) | `costUah: number` | `costUah: Double` |
| `Сумма` | REAL | Ціна продажу (грн) | `priceUah: number` | `priceUah: Double` |
| `Доход` | REAL | Прибуток (= Сумма - Вход) | `profit: number` | `profit: Double` |
| `Наличие` | INTEGER (0/1) | Чи на складі | `inStock: boolean` | `inStock: Boolean` |
| `Приход` | REAL (Delphi date) | Дата надходження | `dateArrival: string` | `dateArrival: String?` |
| `Дата_продажи` | REAL (Delphi date) | Дата продажу | `dateSold?: string` | `dateSold: String?` |
| `Квитанция` | INTEGER | ID ремонту (внутрішній ID) | `repairId: number` | `receiptId: Int?` |
| `№_квитанции` | INTEGER | Номер квитанції (display) | `receiptId?: number` | - |
| `Накладная` | TEXT | Номер накладної | `invoice?: string` | `invoice: String?` |
| `ТипОплатиПокупки` | TEXT | Тип оплати при закупці | - (внутрішнє) | - |
| `ШтрихКод` | TEXT | Штрих-код товару | `barcode?: string` | `barcode: String?` |
| `Количество` | INTEGER | (Legacy, не використовується) | - | - |
| `Цена_грн` | REAL | (Legacy, не використовується) | - | - |
| `UpdateTimestamp` | TEXT (ISO datetime) | Час останнього оновлення | - | - |

### Обчислювані поля (не в базі)

| Поле | Опис | Як обчислюється |
|------|------|-----------------|
| `quantity` | Кількість однотипних товарів | `COUNT(*)` при групуванні по `Наименование_расходника` + `Поставщик` |
| `minQuantity` | Мінімальний залишок | `JOIN` з таблицею `WarehouseLimits` по `Код_товара` |

### Індекси

```sql
CREATE INDEX idx_rashodniki_kvitancia ON Расходники(Квитанция);
CREATE INDEX idx_rashodniki_barcode ON Расходники(ШтрихКод);
```

---

## Таблиця `WarehouseLimits` (Мінімальні залишки)

Зберігає налаштування мінімальних залишків товарів за кодом.

| Колонка | Тип | Опис | Маппінг TypeScript |
|---------|-----|------|-------------------|
| `ID` | INTEGER PRIMARY KEY AUTOINCREMENT | Унікальний ідентифікатор | `id: number` |
| `ProductCode` | TEXT NOT NULL UNIQUE | Код товару (зв'язок з `Код_товара`) | `productCode: string` |
| `MinQuantity` | INTEGER NOT NULL DEFAULT 0 | Мінімальна кількість | `minQuantity: number` |
| `UpdateTimestamp` | TEXT | Час останнього оновлення | - |

### Індекси

```sql
CREATE INDEX idx_warehouse_limits_code ON WarehouseLimits(ProductCode);
```

---

## Таблиця `Ремонт` (Repairs / Ремонти)

Зберігає інформацію про ремонти.

| Колонка | Тип | Опис | Маппінг TypeScript | Маппінг Android |
|---------|-----|------|--------------------|--------------------|
| `ID` | INTEGER PRIMARY KEY AUTOINCREMENT | Унікальний ідентифікатор | `id: number` | `id: Int` |
| `Квитанция` | INTEGER | Номер квитанції (display) | `receiptId: number` | `receiptId: Int` |
| `Наименование_техники` | TEXT | Назва пристрою | `deviceName: string` | `deviceName: String` |
| `Описание_неисправности` | TEXT | Опис несправності | `faultDesc: string` | `faultDescription: String` |
| `Выполнено` | TEXT | Виконана робота | `workDone: string` | `workDone: String` |
| `Стоимость` | REAL | Вартість роботи | `costLabor: number` | `laborCost: Double` |
| `Сумма` | REAL | Загальна сума | `totalCost: number` | `totalCost: Double` |
| `Оплачено` | INTEGER (0/1) | Чи оплачено | `isPaid: boolean` | `isPaid: Boolean` |
| `Состояние` | INTEGER | Статус ремонту (1-7) | `status: RepairStatus` | `status: Int` |
| `Имя_заказчика` | TEXT | Ім'я клієнта | `clientName: string` | `clientName: String` |
| `Телефон` | TEXT | Телефон клієнта | `clientPhone: string` | `phoneNumber: String` |
| `Доход` | REAL | Прибуток | `profit: number` | `profit: Double` |
| `Начало_ремонта` | REAL (Delphi date) | Дата початку | `dateStart: string` | `startDate: String` |
| `Конец_ремонта` | REAL (Delphi date) | Дата завершення | `dateEnd: string` | `endDate: String?` |
| `Примечание` | TEXT | Примітка | `note: string` | `notes: String` |
| `Перезвонить` | INTEGER (0/1) | Потрібно передзвонити | `shouldCall: boolean` | `shouldCall: Boolean` |
| `Виконавець` | TEXT DEFAULT 'Андрій' | Ім'я виконавця | `executor: string` | `executor: String` |
| `ТипОплати` | TEXT DEFAULT 'Готівка' | Тип оплати ('Готівка'/'Картка') | `paymentType?: string` | `paymentType: String` |
| `UpdateTimestamp` | TEXT (ISO datetime) | Час останнього оновлення | - | - |

### Статуси ремонту

| Значення | Назва (UK) | Опис |
|----------|------------|------|
| 1 | У черзі | Queue |
| 2 | У роботі | InProgress |
| 3 | Очікув. відпов./деталі | Waiting |
| 4 | Готовий до видачі | Ready |
| 5 | Не додзвонилися | NoAnswer |
| 6 | Видано | Issued |
| 7 | Одеса | Odessa |

### Індекси

```sql
CREATE INDEX idx_remont_kvitancia ON Ремонт(Квитанция);
CREATE INDEX idx_remont_phone ON Ремонт(Телефон);
CREATE INDEX idx_remont_status_kvit ON Ремонт(Состояние, Квитанция);
CREATE INDEX idx_remont_executor_kvit ON Ремонт(Виконавець, Квитанция);
CREATE INDEX idx_remont_start ON Ремонт(Начало_ремонта);
```

---

## Таблиця `Каса` (Transactions / Транзакції)

Зберігає фінансові транзакції касового апарату.

| Колонка | Тип | Опис | Маппінг TypeScript | Маппінг Android |
|---------|-----|------|--------------------|--------------------|
| `ID` | INTEGER PRIMARY KEY AUTOINCREMENT | Унікальний ідентифікатор | `id: number` | `id: Int` |
| `Дата_створення` | TEXT (ISO datetime) | Дата створення | `dateCreated: string` | `date: String` |
| `Дата_виконання` | TEXT (ISO datetime) | Дата виконання | `dateExecuted?: string` | - |
| `Категорія` | TEXT | Категорія транзакції | `category: string` | `category: String` |
| `Опис` | TEXT | Опис транзакції | `description: string` | `description: String` |
| `Сума` | REAL | Сума транзакції | `amount: number` | `amount: Double` |
| `Готівка` | REAL | Баланс готівки після | `cash: number` | `cash: Double` |
| `Карта` | REAL | Баланс карти після | `card: number` | `card: Double` |
| `ВиконавецьID` | INTEGER | ID виконавця | `executorId?: number` | - |
| `ВиконавецьІмя` | TEXT | Ім'я виконавця | `executorName?: string` | - |
| `КвитанціяID` | INTEGER | ID ремонту (зв'язок) | `receiptId?: number` | - |
| `ТипОплати` | TEXT | Тип оплати | `paymentType?: string` | `paymentType: String` |
| `ЗвязанаТранзакціяID` | INTEGER | ID пов'язаної транзакції | `relatedTransactionId?: number` | - |
| `UpdateTimestamp` | TEXT (ISO datetime) | Час останнього оновлення | - | - |

### Категорії транзакцій

| Категорія | Опис |
|-----------|------|
| `Прибуток` | Дохід від ремонту |
| `Витрата` | Витрата коштів |
| `Зняття` | Зняття з каси |
| `Покупка` | Закупка товару |
| `Скасування` | Скасування транзакції |
| `Повернення` | Повернення коштів клієнту |
| `Комісія банку` | Комісія за картковий платіж |
| `Списання` | Списання товару |

---

## Таблиця `Suppliers` (Постачальники)

| Колонка | Тип | Опис |
|---------|-----|------|
| `ID` | INTEGER PRIMARY KEY AUTOINCREMENT | Унікальний ідентифікатор |
| `Name` | TEXT UNIQUE NOT NULL | Назва постачальника |
| `UpdateTimestamp` | TEXT | Час останнього оновлення |

### Початкові дані
- ARC, DFI, Послуга, Чипзона

---

## Таблиця `Executors` (Виконавці)

| Колонка | Тип | Опис |
|---------|-----|------|
| `ID` | INTEGER PRIMARY KEY AUTOINCREMENT | Унікальний ідентифікатор |
| `Name` | TEXT UNIQUE NOT NULL | Ім'я виконавця |
| `SalaryPercent` | REAL NOT NULL DEFAULT 0 | Відсоток від роботи |
| `ProductsPercent` | REAL NOT NULL DEFAULT 0 | Відсоток від товарів |
| `Password` | TEXT | Пароль (опціонально) |
| `Role` | TEXT DEFAULT 'worker' | Роль ('admin'/'worker') |
| `UpdateTimestamp` | TEXT | Час останнього оновлення |

---

## Таблиця `КатегоріїВитрат` (Expense Categories)

| Колонка | Тип | Опис |
|---------|-----|------|
| `ID` | INTEGER PRIMARY KEY AUTOINCREMENT | Унікальний ідентифікатор |
| `Назва` | TEXT NOT NULL UNIQUE | Назва категорії |
| `Активна` | INTEGER DEFAULT 1 | Чи активна |
| `UpdateTimestamp` | TEXT | Час останнього оновлення |

---

## Таблиця `КатегоріїПрибутків` (Income Categories)

| Колонка | Тип | Опис |
|---------|-----|------|
| `ID` | INTEGER PRIMARY KEY AUTOINCREMENT | Унікальний ідентифікатор |
| `Назва` | TEXT NOT NULL UNIQUE | Назва категорії |
| `Активна` | INTEGER DEFAULT 1 | Чи активна |
| `UpdateTimestamp` | TEXT | Час останнього оновлення |

### Початкові дані
- Ремонт, Продаж товару, Інший дохід

---

## Таблиця `settings` (Налаштування)

| Колонка | Тип | Опис |
|---------|-----|------|
| `key` | TEXT PRIMARY KEY | Ключ налаштування |
| `value` | TEXT | Значення |

### Ключі налаштувань
- `cardCommissionPercent` - відсоток комісії за картку
- `cashRegisterEnabled` - чи увімкнена каса
- `cashRegisterStartDate` - дата початку роботи каси

---

## Таблиця `SyncLocks` (Блокування синхронізації)

| Колонка | Тип | Опис |
|---------|-----|------|
| `ID` | INTEGER PRIMARY KEY AUTOINCREMENT | Унікальний ідентифікатор |
| `RecordID` | INTEGER | ID заблокованого запису |
| `DeviceName` | TEXT | Назва пристрою |
| `LockTime` | DATETIME DEFAULT CURRENT_TIMESTAMP | Час блокування |

---

## Таблиця `Заметки` (Notes / Нотатки)

| Колонка | Тип | Опис |
|---------|-----|------|
| `ID` | INTEGER PRIMARY KEY AUTOINCREMENT | Унікальний ідентифікатор |
| `Дата` | TEXT/REAL | Дата нотатки |
| `Заметка` | TEXT | Текст нотатки |
| `Выполнено` | INTEGER (0/1) | Чи виконано |
| `Тип заметки` | TEXT | Тип нотатки |

---

## Формат дат (Delphi Date)

Таблиці `Ремонт` та `Расходники` використовують Delphi date format для полів дат:
- Це число з плаваючою комою
- 0 = 30 грудня 1899 року
- Ціла частина = дні
- Дробова частина = час

### Конвертація

```typescript
// Delphi -> JavaScript
function toJsDate(delphiDate: number): string {
    if (!delphiDate) return '';
    const baseDate = new Date(1899, 11, 30);
    const resultDate = new Date(baseDate.getTime() + delphiDate * 24 * 60 * 60 * 1000);
    return resultDate.toISOString().split('T')[0];
}

// JavaScript -> Delphi
function toDelphiDate(isoDate: string): number {
    if (!isoDate) return 0;
    const date = new Date(isoDate);
    const baseDate = new Date(1899, 11, 30);
    return (date.getTime() - baseDate.getTime()) / (24 * 60 * 60 * 1000);
}
```

---

## Міграції

### PC (SQLite): Версія 1 → 2
1. Створення таблиці `WarehouseLimits` з `ProductCode` замість `Name/Supplier`
2. Додавання колонки `UpdateTimestamp` до всіх основних таблиць
3. Створення індексу `idx_warehouse_limits_code`

### Android (Room): Версія 2 → 3
1. Додавання колонки `minQuantity` до таблиці `warehouse_items`
```sql
ALTER TABLE warehouse_items ADD COLUMN minQuantity INTEGER DEFAULT NULL
```

---

## Функціонал групування товарів на складі

### PC (Electron)
Групування виконується на рівні SQL:
```sql
SELECT 
    MIN(R.ID) as id,
    R.Наименование_расходника as name,
    R.Поставщик as supplier,
    COUNT(*) as quantity,
    MAX(WL.MinQuantity) as minQuantity
FROM Расходники R
LEFT JOIN WarehouseLimits WL ON R.Код_товара = WL.ProductCode
WHERE R.Наличие = 1
GROUP BY R.Наименование_расходника, R.Поставщик
```

### Android
Групування виконується в ViewModel:
```kotlin
items.groupBy { "${it.name.lowercase()}|${it.supplier?.lowercase() ?: ""}" }
    .map { entry ->
        val group = entry.value
        val first = group.first()
        first.copy(quantity = group.sumOf { it.quantity })
    }
```

---

## Синхронізація PC ↔ Android

### Endpoint `/api/warehouse`

Параметри запиту:
- `inStock` (boolean) - тільки в наявності (legacy)
- `stockFilter` ('inStock' | 'sold' | 'all') - фільтр наявності
- `supplier` (string) - фільтр по постачальнику
- `search` (string) - пошук по назві/коду
- `groupByName` (boolean) - групування по назві

Відповідь:
```json
{
  "data": [
    {
      "id": 1,
      "name": "Назва товару",
      "priceUsd": 10.0,
      "exchangeRate": 41.0,
      "costUah": 410.0,
      "priceUah": 500.0,
      "profit": 90.0,
      "inStock": true,
      "supplier": "DFI",
      "dateArrival": "2026-01-26",
      "dateSold": null,
      "receiptId": null,
      "invoice": "INV-001",
      "productCode": "DFI-001",
      "barcode": "1234567890123",
      "quantity": 1,
      "minQuantity": 5
    }
  ]
}
```
