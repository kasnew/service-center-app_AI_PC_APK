/**
 * Тестові дані для перевірки парсерів ARC/DFI
 */

import { parseDFI, parseARC, detectFormat, parseClipboardData } from './parsers';

// Тестові дані DFI формату
const testDataDFI = `12345\tРезистор 10кОм\t5\t1234$
67890\tКонденсатор 100мкФ\t10\t567$
11111\tДіод 1N4148\t20\t89$`;

// Тестові дані ARC формату (12 рядків на товар)
const testDataARC = `Резистор 10кОм


12345



Qty: 5 шт

12.34$


Конденсатор 100мкФ


67890



Qty: 10 шт

5.67$


`;

console.log('=== Тестування парсерів ===\n');

// Тест 1: Визначення формату DFI
console.log('Тест 1: Визначення формату DFI');
const formatDFI = detectFormat(testDataDFI);
console.log('Виявлений формат:', formatDFI);
console.log('Очікується: DFI');
console.log('Результат:', formatDFI === 'DFI' ? '✓ ПРОЙДЕНО' : '✗ ПОМИЛКА');
console.log();

// Тест 2: Визначення формату ARC
console.log('Тест 2: Визначення формату ARC');
const formatARC = detectFormat(testDataARC);
console.log('Виявлений формат:', formatARC);
console.log('Очікується: ARC');
console.log('Результат:', formatARC === 'ARC' ? '✓ ПРОЙДЕНО' : '✗ ПОМИЛКА');
console.log();

// Тест 3: Парсинг DFI
console.log('Тест 3: Парсинг DFI');
const itemsDFI = parseDFI(testDataDFI);
console.log('Розпарсено товарів:', itemsDFI.length);
console.log('Очікується: 3');
console.log('Товари:');
itemsDFI.forEach((item, index) => {
    console.log(`  ${index + 1}. ${item.name} (${item.productCode})`);
    console.log(`     Кількість: ${item.quantity}, Ціна: $${item.priceUsd.toFixed(2)}`);
});
console.log('Результат:', itemsDFI.length === 3 ? '✓ ПРОЙДЕНО' : '✗ ПОМИЛКА');
console.log();

// Тест 4: Перевірка конвертації ціни DFI (центи -> долари)
console.log('Тест 4: Конвертація ціни DFI');
const firstItemDFI = itemsDFI[0];
console.log('Перший товар:', firstItemDFI.name);
console.log('Ціна:', firstItemDFI.priceUsd);
console.log('Очікується: 12.34');
console.log('Результат:', firstItemDFI.priceUsd === 12.34 ? '✓ ПРОЙДЕНО' : '✗ ПОМИЛКА');
console.log();

// Тест 5: Парсинг ARC
console.log('Тест 5: Парсинг ARC');
const itemsARC = parseARC(testDataARC);
console.log('Розпарсено товарів:', itemsARC.length);
console.log('Очікується: 2');
console.log('Товари:');
itemsARC.forEach((item, index) => {
    console.log(`  ${index + 1}. ${item.name} (${item.productCode})`);
    console.log(`     Кількість: ${item.quantity}, Ціна: $${item.priceUsd.toFixed(2)}`);
});
console.log('Результат:', itemsARC.length === 2 ? '✓ ПРОЙДЕНО' : '✗ ПОМИЛКА');
console.log();

// Тест 6: Автоматичний парсинг DFI
console.log('Тест 6: Автоматичний парсинг DFI');
try {
    const autoItemsDFI = parseClipboardData(testDataDFI);
    console.log('Розпарсено товарів:', autoItemsDFI.length);
    console.log('Результат:', autoItemsDFI.length === 3 ? '✓ ПРОЙДЕНО' : '✗ ПОМИЛКА');
} catch (error: any) {
    console.log('✗ ПОМИЛКА:', error.message);
}
console.log();

// Тест 7: Автоматичний парсинг ARC
console.log('Тест 7: Автоматичний парсинг ARC');
try {
    const autoItemsARC = parseClipboardData(testDataARC);
    console.log('Розпарсено товарів:', autoItemsARC.length);
    console.log('Результат:', autoItemsARC.length === 2 ? '✓ ПРОЙДЕНО' : '✗ ПОМИЛКА');
} catch (error: any) {
    console.log('✗ ПОМИЛКА:', error.message);
}
console.log();

// Тест 8: Обробка некоректних даних
console.log('Тест 8: Обробка некоректних даних');
const invalidData = 'Це просто текст без формату';
try {
    parseClipboardData(invalidData);
    console.log('✗ ПОМИЛКА: Мало бути викинуто виключення');
} catch (error: any) {
    console.log('Викинуто виключення:', error.message);
    console.log('Результат: ✓ ПРОЙДЕНО');
}
console.log();

console.log('=== Тестування завершено ===');
