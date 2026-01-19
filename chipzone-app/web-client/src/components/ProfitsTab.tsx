import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { profitsApi } from '../api/cashRegister';
import { TrendingUp, Package, AlertCircle, DollarSign } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function ProfitsTab() {
    const navigate = useNavigate();
    const { currentTheme } = useTheme();
    const isLightGray = currentTheme.id === 'light-gray';
    
    // Use darker colors for light gray theme
    const greenColor = isLightGray ? 'text-green-700' : 'text-green-400';
    const blueColor = isLightGray ? 'text-blue-700' : 'text-blue-400';
    // Default date range: from 1st of current month to last day of current month
    const getDefaultDateRange = () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of current month
        
        // Format dates using local time to avoid timezone issues
        const formatDate = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        
        return {
            start: formatDate(firstDay),
            end: formatDate(lastDay)
        };
    };

    const [dateRange, setDateRange] = useState(getDefaultDateRange());

    // Fetch executor profits
    const { data: executorProfits = [], isLoading: loadingExecutors } = useQuery({
        queryKey: ['executor-profits', dateRange],
        queryFn: () => profitsApi.getExecutorProfits(dateRange.start, dateRange.end),
    });

    // Fetch products stats
    const { data: productsStats, isLoading: loadingProducts } = useQuery({
        queryKey: ['products-stats', dateRange],
        queryFn: () => profitsApi.getProductsStats(dateRange.start, dateRange.end),
    });

    // Fetch unpaid ready orders
    const { data: unpaidOrders, isLoading: loadingUnpaid } = useQuery({
        queryKey: ['unpaid-ready-orders', dateRange],
        queryFn: () => profitsApi.getUnpaidReadyOrders(dateRange.start, dateRange.end),
    });

    return (
        <div className="space-y-6">
            {/* Date Range Filter */}
            <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-slate-300">Період:</span>
                    <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                        className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-slate-100"
                    />
                    <span className="text-slate-400">-</span>
                    <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                        className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-slate-100"
                    />
                </div>
            </div>

            {/* Executor Profits Section */}
            <div className="bg-slate-700 rounded-lg border border-slate-600 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-600 bg-slate-800/50">
                    <div className="flex items-center gap-2">
                        <TrendingUp className={`w-5 h-5 ${greenColor}`} />
                        <h2 className="text-lg font-semibold text-slate-100">Прибутки виконавців</h2>
                    </div>
                </div>
                <div className="overflow-auto">
                    <table className="w-full">
                        <thead className="bg-slate-800/30 border-b border-slate-600">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Виконавець</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Ремонтів</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Загальний прибуток</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Вартість робіт</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">% ЗП</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Прибуток виконавця</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Комісія банку</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-600">
                            {loadingExecutors ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">Завантаження...</td>
                                </tr>
                            ) : executorProfits.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">Немає даних за обраний період</td>
                                </tr>
                            ) : (
                                executorProfits.map((executor: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-slate-600/30 transition-colors">
                                        <td className="px-4 py-3 text-sm text-slate-200 font-medium">{executor.executorName}</td>
                                        <td className="px-4 py-3 text-sm text-slate-300 text-right">{executor.repairCount}</td>
                                        <td className={`px-4 py-3 text-sm ${greenColor} text-right font-medium`}>{executor.totalProfit.toFixed(2)} ₴</td>
                                        <td className="px-4 py-3 text-sm text-slate-300 text-right">{executor.totalLabor.toFixed(2)} ₴</td>
                                        <td className="px-4 py-3 text-sm text-slate-300 text-right">{executor.salaryPercent.toFixed(0)}%</td>
                                        <td className={`px-4 py-3 text-sm ${blueColor} text-right font-medium`}>{executor.executorProfit.toFixed(2)} ₴</td>
                                        <td className="px-4 py-3 text-sm text-red-400 text-right font-medium">{executor.totalCommission?.toFixed(2) || '0.00'} ₴</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Products Statistics Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-red-900/30 rounded-lg">
                            <Package className="w-5 h-5 text-red-400" />
                        </div>
                        <h3 className="text-sm font-medium text-slate-400">Витрати на товари</h3>
                    </div>
                    <p className="text-2xl font-bold text-red-400">
                        {loadingProducts ? '...' : `${productsStats?.totalExpenses?.toFixed(2) || '0.00'} ₴`}
                    </p>
                </div>

                <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-900/30 rounded-lg">
                            <DollarSign className={`w-5 h-5 ${greenColor}`} />
                        </div>
                        <h3 className="text-sm font-medium text-slate-400">Прибутки за товари</h3>
                    </div>
                    <p className={`text-2xl font-bold ${greenColor}`}>
                        {loadingProducts ? '...' : `${productsStats?.totalRevenue?.toFixed(2) || '0.00'} ₴`}
                    </p>
                </div>

                <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-900/30 rounded-lg">
                            <Package className={`w-5 h-5 ${blueColor}`} />
                        </div>
                        <h3 className="text-sm font-medium text-slate-400">Нереалізовані товари</h3>
                    </div>
                    <p className={`text-2xl font-bold ${blueColor}`}>
                        {loadingProducts ? '...' : `${productsStats?.unsoldValue?.toFixed(2) || '0.00'} ₴`}
                    </p>
                </div>
            </div>

            {/* Unpaid Ready Orders Section */}
            <div className="bg-slate-700 rounded-lg border border-slate-600 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-600 bg-slate-800/50">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-yellow-400" />
                        <h2 className="text-lg font-semibold text-slate-100">Готові до видачі (не оплачені)</h2>
                    </div>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
                            <p className="text-sm text-slate-400 mb-1">Послуги</p>
                            <p className="text-xl font-bold text-yellow-400">
                                {loadingUnpaid ? '...' : `${unpaidOrders?.servicesTotal?.toFixed(2) || '0.00'} ₴`}
                            </p>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
                            <p className="text-sm text-slate-400 mb-1">Товари</p>
                            <p className="text-xl font-bold text-yellow-400">
                                {loadingUnpaid ? '...' : `${unpaidOrders?.productsTotal?.toFixed(2) || '0.00'} ₴`}
                            </p>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
                            <p className="text-sm text-slate-400 mb-1">Загальна сума</p>
                            <p className="text-xl font-bold text-orange-400">
                                {loadingUnpaid ? '...' : `${unpaidOrders?.grandTotal?.toFixed(2) || '0.00'} ₴`}
                            </p>
                        </div>
                    </div>

                    {/* Orders List */}
                    {unpaidOrders && unpaidOrders.orders && unpaidOrders.orders.length > 0 && (
                        <div className="overflow-auto">
                            <table className="w-full">
                                <thead className="bg-slate-800/30 border-b border-slate-600">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">Квитанція</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">Клієнт</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">Пристрій</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-slate-400 uppercase">Послуги</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-slate-400 uppercase">Товари</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-slate-400 uppercase">Всього</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-600">
                                    {unpaidOrders.orders.map((order: any) => (
                                        <tr
                                            key={order.id}
                                            onClick={() => navigate(`/repair/${order.id}`)}
                                            className="hover:bg-slate-600/30 transition-colors cursor-pointer"
                                        >
                                            <td className="px-4 py-2 text-sm text-slate-300">#{order.receiptId}</td>
                                            <td className="px-4 py-2 text-sm text-slate-200">{order.clientName}</td>
                                            <td className="px-4 py-2 text-sm text-slate-300">{order.deviceName}</td>
                                            <td className="px-4 py-2 text-sm text-slate-300 text-right">{order.servicesCost.toFixed(2)} ₴</td>
                                            <td className="px-4 py-2 text-sm text-slate-300 text-right">{order.partsCost.toFixed(2)} ₴</td>
                                            <td className="px-4 py-2 text-sm text-yellow-400 text-right font-medium">{order.totalCost.toFixed(2)} ₴</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
