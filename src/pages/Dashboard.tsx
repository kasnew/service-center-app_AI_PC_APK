import React from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { repairApi, GetRepairsResponse } from '../api/repairs';
import { RepairStatus } from '../types/db';
import { Search, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

export const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Restore filters from localStorage on mount if URL is empty
    React.useEffect(() => {
        if (searchParams.size === 0) {
            const savedFilters = localStorage.getItem('dashboard_filters');
            if (savedFilters) {
                setSearchParams(new URLSearchParams(savedFilters));
            }
        }
    }, []);

    // Save filters to localStorage whenever they change (if not empty)
    React.useEffect(() => {
        if (searchParams.size > 0) {
            localStorage.setItem('dashboard_filters', searchParams.toString());
        }
    }, [searchParams]);

    const page = Number(searchParams.get('page')) || 1;
    const search = searchParams.get('search') || '';
    const statusParam = searchParams.get('status');
    const shouldCall = searchParams.get('shouldCall') === 'true';

    // Parse comma-separated statuses
    const statusFilter = statusParam
        ? statusParam.split(',').map(Number).filter(n => !isNaN(n)) as RepairStatus[]
        : [];

    const { data, isLoading, isError } = useQuery<GetRepairsResponse>({
        queryKey: ['repairs', page, search, statusFilter, shouldCall],
        queryFn: () => repairApi.getRepairs({
            page,
            search,
            status: statusFilter.length > 0 ? statusFilter : undefined,
            shouldCall
        }),
        placeholderData: keepPreviousData,
    });

    const updateParams = (updates: Record<string, string | null>) => {
        const newParams = new URLSearchParams(searchParams);
        Object.entries(updates).forEach(([key, value]) => {
            if (value === null || value === '') {
                newParams.delete(key);
            } else {
                newParams.set(key, value);
            }
        });
        setSearchParams(newParams);
    };

    const handleReset = () => {
        localStorage.removeItem('dashboard_filters');
        setSearchParams(new URLSearchParams());
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateParams({ search: e.target.value, page: '1' });
    };

    const handleStatusClick = (status: RepairStatus) => {
        let newStatuses: RepairStatus[];

        if (statusFilter.includes(status)) {
            // Remove status
            newStatuses = statusFilter.filter(s => s !== status);
        } else {
            // Add status
            newStatuses = [...statusFilter, status];
        }

        // Clicking a status clears "shouldCall"
        updateParams({
            status: newStatuses.length > 0 ? newStatuses.join(',') : null,
            shouldCall: null,
            page: '1'
        });
    };

    const handleCallFilterClick = () => {
        if (shouldCall) {
            updateParams({ shouldCall: null, page: '1' });
        } else {
            // Activating "Call" clears status filters
            updateParams({ shouldCall: 'true', status: null, page: '1' });
        }
    };

    const handlePageChange = (newPage: number) => {
        updateParams({ page: String(newPage) });
    };

    const getStatusColor = (status: RepairStatus) => {
        switch (status) {
            case RepairStatus.Queue: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
            case RepairStatus.InProgress: return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
            case RepairStatus.Waiting: return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
            case RepairStatus.Ready: return 'bg-green-500/20 text-green-400 border-green-500/50';
            case RepairStatus.NoAnswer: return 'bg-red-500/20 text-red-400 border-red-500/50';
            case RepairStatus.Odessa: return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
            default: return 'bg-slate-500/20 text-slate-400 border-slate-500/50';
        }
    };

    const getStatusLabel = (status: RepairStatus) => {
        switch (status) {
            case RepairStatus.Queue: return 'У черзі';
            case RepairStatus.InProgress: return 'У роботі';
            case RepairStatus.Waiting: return 'Очікув.';
            case RepairStatus.Ready: return 'Готовий';
            case RepairStatus.NoAnswer: return 'Не додзвон.';
            case RepairStatus.Odessa: return 'Одеса';
            default: return 'Невідомо';
        }
    };

    const allStatuses = [
        RepairStatus.Queue,
        RepairStatus.InProgress,
        RepairStatus.Waiting,
        RepairStatus.Ready,
        RepairStatus.NoAnswer,
        RepairStatus.Odessa
    ];

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-100">Активні ремонти</h2>
                <button
                    onClick={() => navigate('/repair/new')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors">
                    Новий ремонт
                </button>
            </div>

            {/* Filters */}
            <div className="space-y-4 bg-slate-800 p-4 rounded-lg border border-slate-700">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        autoFocus
                        placeholder="Пошук по клієнту, телефону, квитанції..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-md pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                        value={search}
                        onChange={handleSearchChange}
                    />
                </div>

                <div className="flex flex-wrap gap-2">
                    <div className="text-sm text-slate-400 py-1 mr-2">Статус:</div>

                    {/* Call Filter Button */}
                    <button
                        onClick={handleCallFilterClick}
                        className={clsx(
                            'px-3 py-1 rounded-full text-xs font-medium border transition-all flex items-center gap-1',
                            shouldCall
                                ? 'bg-pink-500/20 text-pink-400 border-pink-500/50 ring-2 ring-offset-1 ring-offset-slate-800 ring-white/20'
                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                        )}
                    >
                        Телефонувати
                    </button>

                    <div className="w-px h-6 bg-slate-700 mx-1 self-center"></div>

                    {allStatuses.map(status => (
                        <button
                            key={status}
                            onClick={() => handleStatusClick(status)}
                            className={clsx(
                                'px-3 py-1 rounded-full text-xs font-medium border transition-all',
                                statusFilter.includes(status)
                                    ? getStatusColor(status) + ' ring-2 ring-offset-1 ring-offset-slate-800 ring-white/20'
                                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                            )}
                        >
                            {getStatusLabel(status)}
                        </button>
                    ))}
                    {(statusFilter.length > 0 || shouldCall) && (
                        <button
                            onClick={handleReset}
                            className="px-3 py-1 rounded-full text-xs font-medium border border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-all"
                        >
                            Скинути
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-900/50 text-slate-400 font-medium border-b border-slate-700">
                            <tr>
                                <th className="px-6 py-4">Квитанція</th>
                                <th className="px-6 py-4">Техніка</th>
                                <th className="px-6 py-4">Клієнт</th>
                                <th className="px-6 py-4">Статус</th>
                                <th className="px-6 py-4">Вартість</th>
                                <th className="px-6 py-4">Дата прийому</th>
                                <th className="px-6 py-4">Оплата</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                        Завантаження ремонтів...
                                    </td>
                                </tr>
                            ) : isError ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-red-400">
                                        Помилка завантаження. Спробуйте ще раз.
                                    </td>
                                </tr>
                            ) : data?.repairs.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                        Ремонтів не знайдено.
                                    </td>
                                </tr>
                            ) : (
                                data?.repairs.map((repair) => (
                                    <tr
                                        key={repair.id}
                                        onClick={() => navigate(`/repair/${repair.id}`)}
                                        className="hover:bg-slate-700/50 transition-colors cursor-pointer">
                                        <td className="px-6 py-4 font-medium text-slate-200">#{repair.receiptId}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-200">{repair.deviceName}</div>
                                            <div className="text-xs text-slate-500 truncate max-w-[200px]">{repair.faultDesc}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-slate-200">{repair.clientName}</div>
                                            <div className="text-xs text-slate-500">{repair.clientPhone}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={clsx('px-2.5 py-0.5 rounded-full text-xs font-medium border', getStatusColor(repair.status))}>
                                                {getStatusLabel(repair.status)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-200">
                                            {repair.totalCost.toFixed(2)} ₴
                                        </td>
                                        <td className="px-6 py-4 text-slate-400">
                                            {new Date(repair.dateStart).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            {repair.isPaid ? (
                                                <span className="text-green-400 font-medium text-xs">Оплачено</span>
                                            ) : (
                                                <span className="text-slate-500 text-xs">Не оплачено</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-between">
                    <div className="text-sm text-slate-400">
                        Сторінка {page} з {data?.totalPages || 1}
                    </div>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => handlePageChange(Math.max(1, page - 1))}
                            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:hover:bg-slate-700 rounded text-sm transition-colors"
                        >
                            Попередня
                        </button>
                        <button
                            disabled={page === (data?.totalPages || 1)}
                            onClick={() => handlePageChange(page + 1)}
                            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:hover:bg-slate-700 rounded text-sm transition-colors"
                        >
                            Наступна
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
