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
    shouldCall: boolean; // Перезвонить
}

export enum RepairStatus {
    Queue = 1, // У черзі
    InProgress = 2, // У роботі
    Waiting = 3, // Очікув. відпов./деталі
    Ready = 4, // Готовий до видачі
    NoAnswer = 5, // Не додзвонилися
    Odessa = 7, // Одеса
}

export interface Part {
    id: number;
    name: string; // Наименование_расходника
    priceUsd: number; // Цена_уе
    costUah: number; // Вход
    priceUah: number; // Сумма
    profit: number; // Доход
    inStock: boolean; // Наличие
    repairId: number; // Квитанция (Foreign Key)
    supplier: string; // Поставщик
    dateArrival: string; // Приход
    dateSold?: string; // Дата_продажи
}

export interface Transaction {
    id: number;
    dateCreated: string; // Дата_створення
    dateExecuted?: string; // Дата_виконання
    category: 'Прибуток' | 'Витрата'; // Категорія
    amount: number; // Сума
    cash: number; // Готівка
    card: number; // Карта
    description: string; // Опис
}
