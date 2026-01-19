-- Міграція 1: Додати поля до таблиці Каса
ALTER TABLE Каса ADD COLUMN ВиконавецьID INTEGER;
ALTER TABLE Каса ADD COLUMN ВиконавецьІмя TEXT;
ALTER TABLE Каса ADD COLUMN КвитанціяID INTEGER;
ALTER TABLE Каса ADD COLUMN ТипОплати TEXT;
ALTER TABLE Каса ADD COLUMN ЗвязанаТранзакціяID INTEGER;

-- Міграція 2: Створити таблицю КатегоріїВитрат
CREATE TABLE IF NOT EXISTS КатегоріїВитрат (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Назва TEXT NOT NULL UNIQUE,
    Активна INTEGER DEFAULT 1
);

-- Додати початкові категорії витрат
INSERT INTO КатегоріїВитрат (Назва) VALUES ('Заробітня плата');
INSERT INTO КатегоріїВитрат (Назва) VALUES ('Комунальні послуги');
INSERT INTO КатегоріїВитрат (Назва) VALUES ('Аренда');
INSERT INTO КатегоріїВитрат (Назва) VALUES ('Доставка');
INSERT INTO КатегоріїВитрат (Назва) VALUES ('Інше');

-- Міграція 3: Створити таблицю settings якщо не існує
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- Додати початкові налаштування каси
INSERT OR IGNORE INTO settings (key, value) VALUES ('card_commission_percent', '1.5');
INSERT OR IGNORE INTO settings (key, value) VALUES ('cash_register_enabled', 'false');
INSERT OR IGNORE INTO settings (key, value) VALUES ('cash_register_start_date', '');

-- Міграція 4: Додати поле до таблиці Расходники
ALTER TABLE Расходники ADD COLUMN ТипОплатиПокупки TEXT DEFAULT 'Картка';
