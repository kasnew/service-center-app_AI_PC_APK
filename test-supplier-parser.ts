/**
 * Тест для перевірки вибору парсера на основі постачальника
 */

import { parseDFI, parseARC } from './src/utils/parsers';

// Тестові дані
const testDataDFI = `12345\tРезистор 10кОм\t5\t1234$`;
const testDataARC = `Резистор 10кОм


12345



Qty: 5 шт

12.34$


`;

console.log('=== Тест вибору парсера на основі постачальника ===\n');

// Симуляція вибору постачальника
const suppliers = ['DFI', 'ARC', 'Интех', 'ІНТЕХ', 'інтех', 'arc', 'dfi'];

suppliers.forEach(supplier => {
    const supplierUpper = supplier.toUpperCase();
    let parserName = 'UNKNOWN';

    if (supplierUpper === 'DFI' || supplierUpper.includes('ИНТЕХ') || supplierUpper.includes('ІНТЕХ')) {
        parserName = 'DFI';
    } else if (supplierUpper === 'ARC') {
        parserName = 'ARC';
    }

    console.log(`Постачальник: "${supplier}" → Парсер: ${parserName}`);
});

console.log('\n=== Тест парсингу ===\n');

// Тест DFI
console.log('Тест DFI парсера:');
const itemsDFI = parseDFI(testDataDFI);
console.log(`  Розпарсено: ${itemsDFI.length} товар(ів)`);
if (itemsDFI.length > 0) {
    console.log(`  Перший товар: ${itemsDFI[0].name}, Ціна: $${itemsDFI[0].priceUsd}`);
}

console.log('\nТест ARC парсера:');
const itemsARC = parseARC(testDataARC);
console.log(`  Розпарсено: ${itemsARC.length} товар(ів)`);
if (itemsARC.length > 0) {
    console.log(`  Перший товар: ${itemsARC[0].name}, Ціна: $${itemsARC[0].priceUsd}`);
}

console.log('\n=== Тестування завершено ===');
