import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { profitsApi } from '../api/cashRegister';
import { TrendingUp, Package, AlertCircle, DollarSign, ChevronDown, ChevronRight, Printer, User } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { ProfitChart } from './ProfitChart';
import { clsx } from 'clsx';
import { EXECUTOR_ICONS } from '../constants/executors';
import { executorsApi } from '../api/executors';

export default function ProfitsTab() {
    const navigate = useNavigate();
    const location = useLocation();
    const { currentTheme } = useTheme();
    const isLight = currentTheme.type === 'light';
    const [chartGroupBy, setChartGroupBy] = useState<'day' | 'week' | 'month'>('day');

    // Use darker colors for light themes
    const greenColor = isLight ? 'text-green-800' : 'text-green-400';
    const blueColor = isLight ? 'text-blue-800' : 'text-blue-400';

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

    // Load date range from localStorage or use default
    // For consistency with user request: ALWAYS use current month on startup
    const loadDateRange = () => {
        return getDefaultDateRange();
    };

    const [dateRange, setDateRange] = useState(loadDateRange);
    const [expandedExecutors, setExpandedExecutors] = useState<Set<string>>(new Set());
    const [activeSubTab, setActiveSubTab] = useState<'details' | 'analytics'>('details');
    const [printData, setPrintData] = useState<any>(null);

    // Note: We no longer save to localStorage to ensure fresh current month on every restart
    // as per user request "після перезапуску програми завжди обирати діапазон поточного місяця"
    useEffect(() => {
        // localStorage.setItem('profits-tab-date-range', JSON.stringify(dateRange));
    }, [dateRange]);

    // Check if we're returning from a repair editor
    useEffect(() => {
        const state = location.state as { returnToProfits?: boolean; executorName?: string } | null;
        if (state?.returnToProfits && state?.executorName) {
            // Expand the executor row we came from
            setExpandedExecutors(new Set([state.executorName]));
            // Clear the state to avoid re-expanding on next render
            window.history.replaceState({}, '');
        }
    }, [location.state]);

    // Fetch executors list
    const { data: executorsList = [] } = useQuery({
        queryKey: ['executors'],
        queryFn: () => executorsApi.getExecutors(),
    });

    // Fetch executor profits
    const { data: executorProfits = [], isLoading: loadingExecutors } = useQuery({
        queryKey: ['executor-profits', dateRange],
        queryFn: () => profitsApi.getExecutorProfits(dateRange.start, dateRange.end),
    });

    // Fetch all receipts for the chart
    const { data: allReceipts = [], isLoading: loadingAllReceipts } = useQuery({
        queryKey: ['all-receipts', dateRange],
        queryFn: () => profitsApi.getExecutorReceipts('', dateRange.start, dateRange.end),
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

    // Toggle executor row expansion
    const toggleExecutor = (executorName: string) => {
        setExpandedExecutors(prev => {
            const newSet = new Set(prev);
            if (newSet.has(executorName)) {
                newSet.delete(executorName);
            } else {
                newSet.add(executorName);
            }
            return newSet;
        });
    };

    // Handle opening a receipt
    const handleOpenReceipt = (repairId: number, executorName: string) => {
        // Save current state to return to
        navigate(`/repair/${repairId}`, {
            state: {
                returnToProfits: true,
                executorName: executorName,
                dateRange: dateRange
            }
        });
    };

    const handlePrintExecutorReport = async (executor: any) => {
        try {
            const receipts = await profitsApi.getExecutorReceipts(executor.executorName, dateRange.start, dateRange.end);
            setPrintData({ executor, receipts });
            setTimeout(() => {
                window.print();
                setPrintData(null);
            }, 100);
        } catch (error) {
            console.error('Print failed:', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="no-print space-y-6">
                {/* Header & Sub-tabs */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex gap-2 p-1 bg-slate-800 rounded-lg border border-slate-600">
                        <button
                            onClick={() => setActiveSubTab('details')}
                            className={clsx(
                                "px-4 py-2 text-sm font-medium rounded-md transition-all",
                                activeSubTab === 'details' ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
                            )}
                        >
                            Деталі прибутків
                        </button>
                        <button
                            onClick={() => setActiveSubTab('analytics')}
                            className={clsx(
                                "px-4 py-2 text-sm font-medium rounded-md transition-all",
                                activeSubTab === 'analytics' ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
                            )}
                        >
                            Аналітика
                        </button>
                    </div>

                    <div className="flex items-center gap-4 bg-slate-800 rounded-lg p-2 border border-slate-600">
                        <span className="text-sm font-medium text-slate-300">Період:</span>
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            className="bg-slate-700 border border-slate-600 rounded px-3 py-1 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                        />
                        <span className="text-slate-400">-</span>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            className="bg-slate-700 border border-slate-600 rounded px-3 py-1 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                </div>

                {activeSubTab === 'analytics' ? (
                    <div className="bg-slate-700 rounded-lg p-6 border border-slate-600 rainbow-groupbox">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <TrendingUp className={`w-5 h-5 ${greenColor}`} />
                                <h2 className="text-lg font-semibold text-slate-100">Аналітика прибутків</h2>
                            </div>

                            <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-600 shadow-inner">
                                <button
                                    onClick={() => setChartGroupBy('day')}
                                    className={clsx(
                                        "px-4 py-1.5 text-xs font-medium rounded-md transition-all",
                                        chartGroupBy === 'day' ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
                                    )}
                                >
                                    День
                                </button>
                                <button
                                    onClick={() => setChartGroupBy('week')}
                                    className={clsx(
                                        "px-4 py-1.5 text-xs font-medium rounded-md transition-all",
                                        chartGroupBy === 'week' ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
                                    )}
                                >
                                    Тиждень
                                </button>
                                <button
                                    onClick={() => setChartGroupBy('month')}
                                    className={clsx(
                                        "px-4 py-1.5 text-xs font-medium rounded-md transition-all",
                                        chartGroupBy === 'month' ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
                                    )}
                                >
                                    Місяць
                                </button>
                            </div>
                        </div>
                        {loadingAllReceipts ? (
                            <div className="h-[400px] flex items-center justify-center text-slate-400">Завантаження графіка...</div>
                        ) : (
                            <div className="h-[400px]">
                                <ProfitChart receipts={allReceipts} groupBy={chartGroupBy} />
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Executor Profits Section */}
                        <div className="bg-slate-700 rounded-lg border border-slate-600 overflow-hidden rainbow-groupbox">
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
                                            <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider w-10">Звіт</th>
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
                                                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">Завантаження...</td>
                                            </tr>
                                        ) : executorProfits.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">Немає даних за обраний період</td>
                                            </tr>
                                        ) : (
                                            executorProfits.map((executor: any, idx: number) => {
                                                const isExpanded = expandedExecutors.has(executor.executorName);
                                                return (
                                                    <React.Fragment key={idx}>
                                                        <tr
                                                            className="hover:bg-slate-600/30 transition-colors cursor-pointer"
                                                            onClick={() => toggleExecutor(executor.executorName)}
                                                        >
                                                            <td className="px-4 py-3 text-sm text-slate-200 font-medium">
                                                                <div className="flex items-center gap-2">
                                                                    {isExpanded ? (
                                                                        <ChevronDown className="w-4 h-4 text-slate-400" />
                                                                    ) : (
                                                                        <ChevronRight className="w-4 h-4 text-slate-400" />
                                                                    )}
                                                                    <div className="flex-shrink-0">
                                                                        {(() => {
                                                                            const executorData = executorsList.find((e: any) => e.Name === executor.executorName);
                                                                            const matchingIcon = EXECUTOR_ICONS.find(i => i.name === executorData?.Icon);
                                                                            const IconComp = matchingIcon ? matchingIcon.Icon : User;
                                                                            return <IconComp className="w-4 h-4" style={{ color: executorData?.Color || '#64748b' }} />;
                                                                        })()}
                                                                    </div>
                                                                    {executor.executorName}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handlePrintExecutorReport(executor);
                                                                    }}
                                                                    className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700/50 rounded-md transition-all"
                                                                    title="Згенерувати звіт у PDF"
                                                                >
                                                                    <Printer className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-slate-300 text-right">{executor.repairCount}</td>
                                                            <td className={`px-4 py-3 text-sm ${greenColor} text-right font-medium`}>{executor.totalProfit.toFixed(2)} ₴</td>
                                                            <td className="px-4 py-3 text-sm text-slate-300 text-right">{executor.totalLabor.toFixed(2)} ₴</td>
                                                            <td className="px-4 py-3 text-sm text-slate-300 text-right">{executor.salaryPercent.toFixed(0)}%</td>
                                                            <td className={`px-4 py-3 text-sm ${blueColor} text-right font-medium`}>{executor.executorProfit.toFixed(2)} ₴</td>
                                                            <td className={`px-4 py-3 text-sm ${isLight ? 'text-red-800' : 'text-red-400'} text-right font-medium`}>{executor.totalCommission?.toFixed(2) || '0.00'} ₴</td>
                                                        </tr>
                                                        {isExpanded && (
                                                            <ExecutorReceiptsRow
                                                                executorName={executor.executorName}
                                                                dateRange={dateRange}
                                                                onOpenReceipt={handleOpenReceipt}
                                                                greenColor={greenColor}
                                                                isLight={isLight}
                                                                colSpan={8}
                                                            />
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Products Statistics Section */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
                            <div className="bg-slate-700 rounded-lg p-6 border border-slate-600 rainbow-groupbox">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-red-900/30 rounded-lg">
                                        <Package className={`w-5 h-5 ${isLight ? 'text-red-800' : 'text-red-400'}`} />
                                    </div>
                                    <h3 className="text-sm font-medium text-slate-400">Витрати на товари</h3>
                                </div>
                                <p className={`text-2xl font-bold ${isLight ? 'text-red-800' : 'text-red-400'}`}>
                                    {loadingProducts ? '...' : `${productsStats?.totalExpenses?.toFixed(2) || '0.00'} ₴`}
                                </p>
                            </div>

                            <div className="bg-slate-700 rounded-lg p-6 border border-slate-600 rainbow-groupbox">
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

                            <div className="bg-slate-700 rounded-lg p-6 border border-slate-600 rainbow-groupbox">
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
                        <div className="bg-slate-700 rounded-lg border border-slate-600 overflow-hidden rainbow-groupbox no-print">
                            <div className="px-6 py-4 border-b border-slate-600 bg-slate-800/50">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className={`w-5 h-5 ${isLight ? 'text-amber-800' : 'text-yellow-400'}`} />
                                    <h2 className="text-lg font-semibold text-slate-100">Готові до видачі (не оплачені)</h2>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
                                        <p className="text-sm text-slate-400 mb-1">Послуги</p>
                                        <p className={`text-xl font-bold ${isLight ? 'text-amber-800' : 'text-yellow-400'}`}>
                                            {loadingUnpaid ? '...' : `${unpaidOrders?.servicesTotal?.toFixed(2) || '0.00'} ₴`}
                                        </p>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
                                        <p className="text-sm text-slate-400 mb-1">Товари</p>
                                        <p className={`text-xl font-bold ${isLight ? 'text-amber-800' : 'text-yellow-400'}`}>
                                            {loadingUnpaid ? '...' : `${unpaidOrders?.productsTotal?.toFixed(2) || '0.00'} ₴`}
                                        </p>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
                                        <p className="text-sm text-slate-400 mb-1">Загальна сума</p>
                                        <p className={`text-xl font-bold ${isLight ? 'text-orange-800' : 'text-orange-400'}`}>
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
                                                        <td className={`px-4 py-2 text-sm ${isLight ? 'text-amber-800' : 'text-yellow-400'} text-right font-medium`}>{order.totalCost.toFixed(2)} ₴</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            <ExecutorPrintReport data={printData} dateRange={dateRange} />
        </div>
    );
}

// Component for displaying executor receipts in expanded row
function ExecutorReceiptsRow({
    executorName,
    dateRange,
    onOpenReceipt,
    greenColor,
    isLight,
    colSpan = 7
}: {
    executorName: string;
    dateRange: { start: string; end: string };
    onOpenReceipt: (repairId: number, executorName: string) => void;
    greenColor: string;
    isLight: boolean;
    colSpan?: number;
}) {

    const { data: receipts = [], isLoading } = useQuery({
        queryKey: ['executor-receipts', executorName, dateRange],
        queryFn: () => profitsApi.getExecutorReceipts(executorName, dateRange.start, dateRange.end),
        enabled: !!executorName && !!dateRange.start && !!dateRange.end,
    });

    if (isLoading) {
        return (
            <tr>
                <td colSpan={colSpan} className="px-4 py-4 bg-slate-800/30">
                    <div className="text-center text-slate-400 text-sm">Завантаження квитанцій...</div>
                </td>
            </tr>
        );
    }

    if (receipts.length === 0) {
        return (
            <tr>
                <td colSpan={colSpan} className="px-4 py-4 bg-slate-800/30">
                    <div className="text-center text-slate-400 text-sm">Немає квитанцій за обраний період</div>
                </td>
            </tr>
        );
    }

    return (
        <>
            <tr>
                <td colSpan={colSpan} className="px-4 py-2 bg-slate-800/30 border-t border-slate-600">
                    <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                        Квитанції виконавця ({receipts.length})
                    </div>
                </td>
            </tr>
            {receipts.map((receipt: any) => (
                <tr
                    key={receipt.id}
                    className="bg-slate-800/20 hover:bg-slate-700/30 transition-colors cursor-pointer"
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenReceipt(receipt.id, executorName);
                    }}
                >
                    <td className="px-8 py-2 text-sm text-slate-300">
                        <div className="flex flex-col gap-1">
                            <span className="font-medium">#{receipt.receiptId}</span>
                            <span className="text-xs text-slate-300 font-medium">{receipt.deviceName || '-'}</span>
                            <span className="text-xs text-slate-400 italic max-w-[200px] truncate" title={receipt.workDone || receipt.faultDesc}>
                                {receipt.workDone || receipt.faultDesc || 'Немає опису роботи'}
                            </span>
                        </div>
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-300 text-right">
                        <div className="flex flex-col items-end gap-1">
                            <span>1</span>
                            <span className="text-xs text-slate-500">
                                {receipt.dateEnd ? new Date(receipt.dateEnd).toLocaleDateString('uk-UA') : '-'}
                            </span>
                        </div>
                    </td>
                    <td className={`px-4 py-2 text-sm ${greenColor} text-right font-medium`}>
                        {receipt.profit?.toFixed(2) || '0.00'} ₴
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-300 text-right">
                        {receipt.costLabor?.toFixed(2) || '0.00'} ₴
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-400 text-right">
                        {receipt.salaryPercent}%
                    </td>
                    <td className={`px-4 py-2 text-sm ${greenColor} text-right font-medium`}>
                        {receipt.executorProfit?.toFixed(2) || '0.00'} ₴
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-400 text-right">
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-xs">{receipt.paymentType || 'Готівка'}</span>
                            {receipt.commission > 0 && (
                                <span className={`text-xs ${isLight ? 'text-red-800' : 'text-red-400'}`}>
                                    Комісія: {receipt.commission.toFixed(2)} ₴
                                </span>
                            )}

                            <span className="text-xs text-slate-500">
                                Всього: {receipt.totalCost?.toFixed(2) || '0.00'} ₴
                            </span>
                        </div>
                    </td>
                </tr>
            ))}
        </>
    );
}

function ExecutorPrintReport({ data, dateRange }: { data: any, dateRange: any }) {
    if (!data) return null;
    const { executor, receipts } = data;

    return (
        <div className="hidden show-on-print bg-white text-black min-h-screen" style={{ backgroundColor: 'white', color: 'black' }}>
            <div className="border-b-2 border-slate-900 pb-4 mb-6">
                <h1 className="text-2xl font-bold uppercase tracking-wider">Звіт виконавця: {executor.executorName}</h1>
                <p className="text-slate-600 font-medium">Період: {dateRange.start} - {dateRange.end}</p>
            </div>

            <div className="flex justify-between items-end mb-8">
                <div className="space-y-1">
                    <p className="text-sm">
                        <span className="text-slate-500 font-medium">Кількість ремонтів: </span>
                        <span className="font-bold">{executor.repairCount}</span>
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-lg font-bold border-b-2 border-slate-900 pb-1">
                        <span className="text-slate-900">Разом до виплати: </span>
                        <span className="text-blue-700">{executor.executorProfit.toFixed(2)} ₴</span>
                    </p>
                </div>
            </div>

            <h2 className="text-md font-bold mb-4 border-l-4 border-slate-900 pl-3 uppercase tracking-tight">Список квитанцій</h2>
            <table className="w-full border-collapse">
                <thead>
                    <tr className="border-b-2 border-slate-900 text-left">
                        <th className="py-2 text-xs font-bold uppercase">№</th>
                        <th className="py-2 text-xs font-bold uppercase">Обладнання</th>
                        <th className="py-2 text-right text-xs font-bold uppercase">Дата</th>
                        <th className="py-2 text-right text-xs font-bold uppercase">Заробіток</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                    {receipts.slice().reverse().map((r: any) => (
                        <tr key={r.id}>
                            <td className="py-3 text-sm font-bold">#{r.receiptId}</td>
                            <td className="py-3 text-sm">{r.deviceName}</td>
                            <td className="py-3 text-sm text-right whitespace-nowrap">
                                {r.dateEnd ? new Date(r.dateEnd).toLocaleDateString('uk-UA') : '-'}
                            </td>
                            <td className="py-3 text-sm font-bold text-right">
                                {r.executorProfit?.toFixed(2)} ₴
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="mt-12 pt-8 border-t border-dashed border-slate-400 flex justify-between items-end">
                <div className="text-xs text-slate-400">
                    <p>Звіт згенеровано: {new Date().toLocaleString('uk-UA')}</p>
                    <p>Програма керування сервісним центром Chipzone</p>
                </div>
                <div className="text-center w-48 border-t border-slate-900 pt-2">
                    <p className="text-sm font-bold">Підпис виконавця</p>
                </div>
            </div>
        </div>
    );
}
