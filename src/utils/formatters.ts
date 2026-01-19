export const formatPhoneNumber = (value: string): string => {
    if (!value) return value;

    // Remove all non-digit characters
    const phoneNumber = value.replace(/\D/g, '');

    // Prevent entering more than 10 digits
    const trimmed = phoneNumber.slice(0, 10);

    if (trimmed.length < 4) return trimmed;
    if (trimmed.length < 7) return `${trimmed.slice(0, 3)}-${trimmed.slice(3)}`;
    if (trimmed.length < 9) return `${trimmed.slice(0, 3)}-${trimmed.slice(3, 6)}-${trimmed.slice(6)}`;
    return `${trimmed.slice(0, 3)}-${trimmed.slice(3, 6)}-${trimmed.slice(6, 8)}-${trimmed.slice(8)}`;
};

/**
 * Нормалізує введення грошових значень: замінює кому на крапку
 * Дозволяє вводити як "100,50" так і "100.50"
 * Фільтрує тільки цифри, крапку та кому
 */
export const normalizeMoneyInput = (value: string): string => {
    if (!value) return value;
    // Видаляємо всі символи, крім цифр, крапки та коми
    let cleaned = value.replace(/[^\d.,]/g, '');
    // Замінюємо кому на крапку
    cleaned = cleaned.replace(',', '.');
    // Перевіряємо, чи є більше однієї крапки - залишаємо тільки першу
    const parts = cleaned.split('.');
    if (parts.length > 2) {
        cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    return cleaned;
};

/**
 * Обмежує введення до 2 десяткових знаків
 */
export const limitDecimalPlaces = (value: string, maxDecimals: number = 2): string => {
    if (!value) return value;
    const normalized = normalizeMoneyInput(value);
    const parts = normalized.split('.');
    if (parts.length === 2 && parts[1].length > maxDecimals) {
        return parts[0] + '.' + parts[1].slice(0, maxDecimals);
    }
    return normalized;
};

/**
 * Парсить грошове значення з рядка, підтримуючи як кому, так і крапку
 */
export const parseMoneyValue = (value: string): number => {
    if (!value) return 0;
    const normalized = normalizeMoneyInput(value);
    return parseFloat(normalized) || 0;
};
