export interface Repair {
    id: number;
    receiptId: number; // Квитанция
    deviceName: string; // Наименование_техники
    faultDesc: string; // Описание_неисправности
    workDone: string; // Выполнено
    costLabor: number; // Стоимость
    totalCost: number; // Сумма
    isPaid: boolean; // Оплачено
    status: RepairStatus; // Состояние
    clientName: string; // Имя_заказчика
    clientPhone: string; // Телефон
    profit: number; // Доход
    dateStart: string; // Начало_ремонта
    dateEnd: string; // Конец_ремонта
    note: string; // Примечание
    shouldCall: boolean; // Дзвінок
    executor: string; // Виконавець
    paymentType?: string; // ТипОплати ('Готівка' | 'Картка')
}

export enum RepairStatus {
    Queue = 1, // У черзі
    InProgress = 2, // У роботі
    Waiting = 3, // Очікув. відпов./деталі
    Ready = 4, // Готовий до видачі
    NoAnswer = 5, // Не додзвонилися
    Odessa = 7, // Одеса
    Issued = 6, // Видано
}

export interface Part {
    id: number;
    name: string; // Наименование_расходника
    priceUsd: number; // Цена_уе
    costUah: number; // Вход
    priceUah: number; // Цена_грн
    totalPrice?: number; // Сумма
    profit: number; // Доход
    inStock: boolean; // Наличие
    repairId: number; // Квитанция (Foreign Key)
    supplier: string; // Поставщик
    dateArrival: string; // Приход
    dateSold?: string; // Дата_продажи
    invoice?: string; // Накладная
    productCode?: string; // Код_товара
    exchangeRate?: number; // Курс
    receiptId?: number; // №_квитанции
    quantity?: number; // Calculated field for grouped items
    barcode?: string; // ШтрихКод
}

export interface Transaction {
    id: number;
    dateCreated: string; // Дата_створення
    dateExecuted?: string; // Дата_виконання
    category: string; // Категорія ('Прибуток' | 'Витрата' | 'Зняття' | 'Покупка' | 'Скасування')
    amount: number; // Сума
    cash: number; // Готівка (баланс після операції)
    card: number; // Карта (баланс після операції)
    description: string; // Опис
    executorId?: number; // ВиконавецьID
    executorName?: string; // ВиконавецьІмя
    receiptId?: number; // КвитанціяID
    paymentType?: string; // ТипОплати ('Готівка' | 'Картка' | 'Змішано')
    relatedTransactionId?: number; // ЗвязанаТранзакціяID
}

export interface ExpenseCategory {
    id: number;
    name: string; // Назва
    active: boolean; // Активна
}

export interface IncomeCategory {
    id: number;
    name: string; // Назва
    active: boolean; // Активна
}

export interface CashRegisterSettings {
    cardCommissionPercent: number;
    cashRegisterEnabled: boolean;
    cashRegisterStartDate: string;
}
