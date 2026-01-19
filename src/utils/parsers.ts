/**
 * Парсери для імпорту даних зі складу з буфера обміну
 * Підтримує формати: DFI (табличний) та ARC (багаторядковий)
 */

export interface ParsedItem {
    productCode: string;
    name: string;
    quantity: number;
    priceUsd: number;
}

export type ClipboardFormat = 'DFI' | 'ARC' | 'UNKNOWN';

/**
 * Парсер для формату DFI
 * Формат: ID\tНазва\tКількість\tЦіна_у_центах$
 * Приклад: "12345\tРезистор 10кОм\t5\t1234$"
 */
export function parseDFI(clipboardText: string): ParsedItem[] {
    const items: ParsedItem[] = [];
    const lines = clipboardText.split('\n').filter(line => line.trim().length > 0);

    for (const line of lines) {
        const columns = line.split('\t');

        // DFI може мати 4 або 5 колонок
        // Формат 4: Код | Назва | Кількість | Ціна$
        // Формат 5: Код | Назва | Кількість | Ціна | Додаткова інформація
        if (columns.length < 4) {
            console.warn('DFI: Пропущено рядок з недостатньою кількістю колонок:', line);
            continue;
        }

        const productCode = columns[0].trim();
        const name = columns[1].trim();
        const quantityStr = columns[2].trim();
        const priceStr = columns[3].trim();

        // Парсинг кількості
        const quantity = parseInt(quantityStr, 10);
        if (isNaN(quantity) || quantity <= 0) {
            console.warn('DFI: Некоректна кількість:', quantityStr);
            continue;
        }

        // Парсинг ціни
        // Підтримує формати: "1234$" (центи), "12.34$" (долари), "12.34" (долари без $)
        let priceUsd = 0;

        // Спробуємо знайти $ в рядку
        const dollarMatch = priceStr.match(/([\d.,]+)\$/);
        if (dollarMatch) {
            // Формат з $
            const priceValueStr = dollarMatch[1].replace(',', '.');
            if (priceValueStr.includes('.')) {
                // Якщо є крапка, вважаємо що це долари (12.34$)
                priceUsd = parseFloat(priceValueStr);
            } else {
                // Якщо тільки цифри, вважаємо що це центи (1234$ -> 12.34)
                priceUsd = parseInt(priceValueStr, 10) / 100;
            }
        } else {
            // Формат без $ - просто число
            const priceValueStr = priceStr.replace(',', '.');
            priceUsd = parseFloat(priceValueStr);
            if (isNaN(priceUsd)) {
                console.warn('DFI: Некоректний формат ціни:', priceStr);
                continue;
            }
        }

        items.push({
            productCode,
            name,
            quantity,
            priceUsd,
        });
    }

    return items;
}

/**
 * Парсер для формату ARC
 * Формат: Блоки з маркерами "Код", "Артикул", "Кол-во", "Цена"
 */
export function parseARC(clipboardText: string): ParsedItem[] {
    const items: ParsedItem[] = [];
    const lines = clipboardText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    let i = 0;
    while (i < lines.length) {
        // Шукаємо початок блоку - перший рядок з назвою товару
        // Назва зазвичай повторюється двічі
        const name = lines[i];

        // Пропускаємо дублікат назви якщо він є
        if (i + 1 < lines.length && lines[i + 1] === name) {
            i++;
        }
        i++;

        // Тепер шукаємо маркери
        let productCode = '';
        let quantity = 1;
        let priceUsd = 0;

        // Шукаємо "Код" та його значення
        while (i < lines.length && lines[i] !== 'Код') {
            i++;
        }
        if (i < lines.length && lines[i] === 'Код') {
            i++; // Пропускаємо "Код"
            if (i < lines.length) {
                productCode = lines[i];
                i++;
            }
        }

        // Шукаємо "Артикул" та його значення (пропускаємо, бо код вже є)
        while (i < lines.length && lines[i] !== 'Артикул') {
            i++;
        }
        if (i < lines.length && lines[i] === 'Артикул') {
            i++; // Пропускаємо "Артикул"
            if (i < lines.length) {
                // Можна використати артикул якщо коду немає
                if (!productCode) {
                    productCode = lines[i];
                }
                i++;
            }
        }

        // Шукаємо "Кол-во" та його значення
        while (i < lines.length && lines[i] !== 'Кол-во') {
            i++;
        }
        if (i < lines.length && lines[i] === 'Кол-во') {
            i++; // Пропускаємо "Кол-во"
            if (i < lines.length) {
                // Парсимо "x 1 / шт"
                const qtyMatch = lines[i].match(/x\s*(\d+)/i);
                if (qtyMatch) {
                    quantity = parseInt(qtyMatch[1], 10);
                }
                i++;
            }
        }

        // Шукаємо "Цена" та її значення
        while (i < lines.length && lines[i] !== 'Цена') {
            i++;
        }
        if (i < lines.length && lines[i] === 'Цена') {
            i++; // Пропускаємо "Цена"
            if (i < lines.length) {
                // Парсимо "8.45$"
                const priceMatch = lines[i].match(/([\d.,]+)\$/);
                if (priceMatch) {
                    const priceStr = priceMatch[1].replace(',', '.');
                    priceUsd = parseFloat(priceStr);
                }
                i++;
            }
        }

        // Пропускаємо "Сумма" та її значення
        while (i < lines.length && lines[i] !== 'Сумма') {
            i++;
        }
        if (i < lines.length && lines[i] === 'Сумма') {
            i++; // Пропускаємо "Сумма"
            if (i < lines.length) {
                i++; // Пропускаємо значення суми
            }
        }

        // Додаємо товар якщо всі дані є
        if (name && productCode && priceUsd > 0) {
            items.push({
                productCode,
                name,
                quantity,
                priceUsd,
            });
        }
    }

    return items;
}

/**
 * Автоматичне визначення формату даних
 */
export function detectFormat(text: string): ClipboardFormat {
    if (!text || text.trim().length === 0) {
        return 'UNKNOWN';
    }

    const lines = text.split('\n').filter(line => line.trim().length > 0);

    if (lines.length === 0) {
        return 'UNKNOWN';
    }

    // Перевірка на DFI: перший рядок має містити табуляції
    const firstLine = lines[0];
    if (firstLine.includes('\t')) {
        const columns = firstLine.split('\t');
        // DFI має 4 колонки, остання закінчується на $
        if (columns.length >= 4 && columns[3].includes('$')) {
            return 'DFI';
        }
    }

    // Перевірка на ARC: шукаємо характерні маркери
    const textLower = text.toLowerCase();
    if (textLower.includes('qty:') && text.includes('$')) {
        return 'ARC';
    }

    return 'UNKNOWN';
}

/**
 * Головна функція парсингу з автоматичним визначенням формату
 */
export function parseClipboardData(text: string): ParsedItem[] {
    const format = detectFormat(text);

    switch (format) {
        case 'DFI':
            console.log('Виявлено формат DFI');
            return parseDFI(text);

        case 'ARC':
            console.log('Виявлено формат ARC');
            return parseARC(text);

        default:
            throw new Error('Не вдалося визначити формат даних. Підтримуються формати: DFI та ARC.');
    }
}
