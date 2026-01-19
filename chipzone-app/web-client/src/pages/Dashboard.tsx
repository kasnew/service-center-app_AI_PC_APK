import React from 'react';
import { useQuery, keepPreviousData, useQueryClient, useMutation } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { repairApi, GetRepairsResponse } from '../api/repairs';
import { executorsApi } from '../api/executors';
import { warehouseApi } from '../api/warehouse';
import { RepairStatus } from '../types/db';
import { Search, Loader2, Copy, Trash2, Phone, Check, Clock, Play, XCircle, MapPin, CheckCircle, X } from 'lucide-react';
import { ContextMenu, ContextMenuItem } from '../components/ContextMenu';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { clsx } from 'clsx';
import { formatPhoneNumber } from '../utils/formatters';

export const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [contextMenu, setContextMenu] = React.useState<{ x: number; y: number; repair: any } | null>(null);
    const [deleteId, setDeleteId] = React.useState<number | null>(null);
    const [paymentModal, setPaymentModal] = React.useState<{ repairId: number; receiptId: number; status: RepairStatus } | null>(null);
    const [paymentType, setPaymentType] = React.useState<'Готівка' | 'Картка'>('Готівка');
    const [searchInput, setSearchInput] = React.useState('');
    const queryClient = useQueryClient();

    // Handle filters on mount
    React.useEffect(() => {
        // Check if this is the first load of the session
        const isSessionStarted = sessionStorage.getItem('app_session_started');

        if (!isSessionStarted) {
            // First load of the app session - clear saved filters
            localStorage.removeItem('dashboard_filters');
            sessionStorage.setItem('app_session_started', 'true');
            // Ensure URL params are empty
            if (searchParams.size > 0) {
                setSearchParams(new URLSearchParams());
            }
        } else {
            // Not first load - restore filters if URL is empty
            if (searchParams.size === 0) {
                const savedFilters = localStorage.getItem('dashboard_filters');
                if (savedFilters) {
                    setSearchParams(new URLSearchParams(savedFilters));
                }
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
    const executorFilter = searchParams.get('executor') || '';
    const dateStart = searchParams.get('dateStart') || '';
    const dateEnd = searchParams.get('dateEnd') || '';
    const paymentDateStart = searchParams.get('paymentDateStart') || '';
    const paymentDateEnd = searchParams.get('paymentDateEnd') || '';

    // Sync search input with URL params
    React.useEffect(() => {
        setSearchInput(search);
    }, [search]);

    // Parse comma-separated statuses
    const statusFilter = statusParam
        ? statusParam.split(',').map(Number).filter(n => !isNaN(n)) as RepairStatus[]
        : [];

    // Fetch executors list
    const { data: executors = [] } = useQuery({
        queryKey: ['executors'],
        queryFn: () => executorsApi.getExecutors(),
    });

    // Fetch status counts
    const { data: statusCounts = {} } = useQuery({
        queryKey: ['status-counts'],
        queryFn: () => repairApi.getStatusCounts(),
        refetchInterval: 30000, // Refresh every 30 seconds
    });

    const { data, isLoading, isError } = useQuery<GetRepairsResponse>({
        queryKey: ['repairs', page, search, statusFilter, shouldCall, executorFilter, dateStart, dateEnd, paymentDateStart, paymentDateEnd],
        queryFn: () => repairApi.getRepairs({
            page,
            search,
            status: statusFilter.length > 0 ? statusFilter : undefined,
            shouldCall,
            executor: executorFilter || undefined,
            dateStart: dateStart || undefined,
            dateEnd: dateEnd || undefined,
            paymentDateStart: paymentDateStart || undefined,
            paymentDateEnd: paymentDateEnd || undefined
        }),
        placeholderData: keepPreviousData,
        refetchInterval: 10000, // Refresh every 10 seconds to get updates from mobile app
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
        setSearchInput('');
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchInput(e.target.value);
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            updateParams({ search: searchInput, page: '1' });
        }
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

    const handleExecutorFilterChange = (executor: string) => {
        updateParams({ executor: executor || null, page: '1' });
    };

    // Mutation for updating repair executor
    const updateExecutorMutation = useMutation({
        mutationFn: ({ id, executor }: { id: number; executor: string }) => {
            // We need to get the full repair data first, then update just the executor
            return repairApi.getRepairDetails(id).then(repair => {
                return repairApi.saveRepair({ ...repair, executor });
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['repairs'] });
        },
    });

    // Mutation for updating repair shouldCall status
    const updateShouldCallMutation = useMutation({
        mutationFn: ({ id, shouldCall }: { id: number; shouldCall: boolean }) => {
            return repairApi.getRepairDetails(id).then(repair => {
                return repairApi.saveRepair({ ...repair, shouldCall });
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['repairs'] });
        },
    });

    const deleteRepairMutation = useMutation({
        mutationFn: (id: number) => repairApi.deleteRepair(id),
        onSuccess: (data) => {
            if (data.success) {
                queryClient.invalidateQueries({ queryKey: ['repairs'] });
                setDeleteId(null);
            } else {
                alert('Помилка видалення: ' + (data as any).error);
                setDeleteId(null);
            }
        },
        onError: (error) => {
            console.error('Delete repair error:', error);
            alert('Помилка видалення запису');
            setDeleteId(null);
        }
    });

    // Mutation for updating repair status directly from table
    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status, receiptId, paymentType }: { id: number; status: RepairStatus; receiptId: number; paymentType?: string }) => {
            return repairApi.getRepairDetails(id).then(async repair => {
                const updates: any = { ...repair, status };

                // If status is Ready, set dateEnd to current date
                if (status === RepairStatus.Ready) {
                    updates.dateEnd = new Date().toISOString();
                }

                // If status is Issued, mark as paid and set dateEnd
                if (status === RepairStatus.Issued) {
                    updates.isPaid = true;
                    updates.dateEnd = new Date().toISOString();
                    updates.paymentType = paymentType || 'Готівка';

                    // Also update parts payment status
                    await warehouseApi.updateRepairPayment({
                        repairId: id,
                        receiptId: receiptId,
                        isPaid: true,
                        dateEnd: updates.dateEnd
                    });
                }

                return repairApi.saveRepair(updates);
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['repairs'] });
            setPaymentModal(null);
            setPaymentType('Готівка'); // Reset to default
        },
    });

    const handlePageChange = (newPage: number) => {
        updateParams({ page: String(newPage) });
    };

    const handleContextMenu = (e: React.MouseEvent, repair: any) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, repair });
    };

    const handleCopy = (mode: 'full' | 'client' | 'client_device' = 'full') => {
        if (contextMenu) {
            navigate('/repair/new', {
                state: {
                    copyFrom: contextMenu.repair,
                    copyMode: mode
                }
            });
            setContextMenu(null);
        }
    };


    const handleFilterByPhone = () => {
        if (contextMenu) {
            const phone = contextMenu.repair.clientPhone;
            setSearchInput(phone);
            updateParams({ search: phone, page: '1' });
            setContextMenu(null);
        }
    };

    const getStatusColor = (status: RepairStatus) => {
        switch (status) {
            case RepairStatus.Queue: return 'bg-yellow-500/20 text-slate-100 border-yellow-500/50';
            case RepairStatus.InProgress: return 'bg-blue-500/20 text-slate-100 border-blue-500/50';
            case RepairStatus.Waiting: return 'bg-orange-500/20 text-slate-100 border-orange-500/50';
            case RepairStatus.Ready: return 'bg-green-500/20 text-slate-100 border-green-500/50';
            case RepairStatus.NoAnswer: return 'bg-red-500/20 text-slate-100 border-red-500/50';
            case RepairStatus.Odessa: return 'bg-purple-500/20 text-slate-100 border-purple-500/50';
            case RepairStatus.Issued: return 'bg-teal-500/20 text-slate-100 border-teal-500/50';
            default: return 'bg-slate-500/20 text-slate-100 border-slate-500/50';
        }
    };

    const getRowColor = (status: RepairStatus) => {
        switch (status) {
            case RepairStatus.Queue: return 'bg-yellow-500/10 hover:bg-yellow-500/20';
            case RepairStatus.InProgress: return 'bg-blue-500/10 hover:bg-blue-500/20';
            case RepairStatus.Waiting: return 'bg-orange-500/10 hover:bg-orange-500/20';
            case RepairStatus.Ready: return 'bg-green-500/10 hover:bg-green-500/20';
            case RepairStatus.NoAnswer: return 'bg-red-500/10 hover:bg-red-500/20';
            case RepairStatus.Odessa: return 'bg-purple-500/10 hover:bg-purple-500/20';
            case RepairStatus.Issued: return 'bg-teal-500/10 hover:bg-teal-500/20';
            default: return 'bg-slate-800/50 hover:bg-slate-700/50';
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
            case RepairStatus.Issued: return 'Видано';
            default: return 'Невідомо';
        }
    };

    // Statuses to display in the status bar (excluding Issued)
    const statusBarStatuses = [
        RepairStatus.Queue,
        RepairStatus.InProgress,
        RepairStatus.Waiting,
        RepairStatus.Ready,
        RepairStatus.NoAnswer,
        RepairStatus.Odessa
    ];

    // Statuses for reference (can be used in future)
    // const allStatuses = [
    //     RepairStatus.Queue,
    //     RepairStatus.InProgress,
    //     RepairStatus.Waiting,
    //     RepairStatus.Ready,
    //     RepairStatus.NoAnswer,
    //     RepairStatus.Odessa,
    //     RepairStatus.Issued,
    // ];

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
            <div className="space-y-4 bg-slate-700 p-4 rounded-lg border border-slate-600">
                {/* Search and Date Filters in one row */}
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            autoFocus
                            placeholder="Пошук по клієнту, телефону, квитанції, вартості... (Enter для пошуку)"
                            className="w-full bg-slate-800 border border-slate-600 rounded-md pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                            value={searchInput}
                            onChange={handleSearchChange}
                            onKeyDown={handleSearchKeyDown}
                        />
                    </div>

                    {/* Date Range Filters */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="text-sm text-slate-400">Дата прийому:</div>
                        <input
                            type="date"
                            value={dateStart}
                            onChange={(e) => updateParams({ dateStart: e.target.value, page: '1' })}
                            className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-100"
                        />
                        <span className="text-slate-400">-</span>
                        <input
                            type="date"
                            value={dateEnd}
                            onChange={(e) => updateParams({ dateEnd: e.target.value, page: '1' })}
                            className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-100"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="text-sm text-slate-400">Дата оплати:</div>
                        <input
                            type="date"
                            value={paymentDateStart}
                            onChange={(e) => updateParams({ paymentDateStart: e.target.value, page: '1' })}
                            className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-100"
                        />
                        <span className="text-slate-400">-</span>
                        <input
                            type="date"
                            value={paymentDateEnd}
                            onChange={(e) => updateParams({ paymentDateEnd: e.target.value, page: '1' })}
                            className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-100"
                        />
                    </div>
                </div>

                {/* Status buttons with counts */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="text-sm text-slate-400 font-medium">Стан:</div>
                    {statusBarStatuses.map(status => {
                        const count = statusCounts[status] || 0;
                        return (
                            <button
                                key={status}
                                onClick={() => handleStatusClick(status)}
                                className={clsx(
                                    'px-4 py-2 rounded-lg text-sm font-medium border transition-all flex items-center gap-2 min-w-[140px] justify-between',
                                    statusFilter.includes(status)
                                        ? getStatusColor(status) + ' ring-2 ring-offset-1 ring-offset-slate-700 ring-white/20'
                                        : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-500'
                                )}
                            >
                                <span>{getStatusLabel(status)}</span>
                                <span className={clsx(
                                    'px-2 py-0.5 rounded text-xs font-bold',
                                    statusFilter.includes(status)
                                        ? 'bg-white/20 text-white'
                                        : 'bg-slate-700 text-slate-200'
                                )}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Other filters */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-600">
                    {/* Дзвінок Filter Button */}
                    <button
                        onClick={handleCallFilterClick}
                        className={clsx(
                            'px-3 py-1 rounded-full text-xs font-medium border transition-all flex items-center gap-1',
                            shouldCall
                                ? 'bg-pink-500/20 text-pink-400 border-pink-500/50 ring-2 ring-offset-1 ring-offset-slate-700 ring-white/20'
                                : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                        )}
                    >
                        <Phone className="w-3.5 h-3.5" />
                        Дзвінок
                    </button>

                    {/* Executor Filter */}
                    <select
                        value={executorFilter}
                        onChange={(e) => handleExecutorFilterChange(e.target.value)}
                        className="px-3 py-1 rounded-full text-xs font-medium border bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-500 transition-all"
                    >
                        <option value="">Всі виконавці</option>
                        {executors.map((executor: any) => (
                            <option key={executor.ID} value={executor.Name}>
                                {executor.Name}
                            </option>
                        ))}
                    </select>
                    {(statusFilter.length > 0 || shouldCall || search || executorFilter || dateStart || dateEnd || paymentDateStart || paymentDateEnd) && (
                        <button
                            onClick={handleReset}
                            className="px-4 py-2 rounded-lg text-sm font-semibold border-2 border-red-500/70 bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:border-red-500 hover:text-red-300 transition-all flex items-center gap-2 shadow-lg shadow-red-500/20"
                        >
                            <X className="w-4 h-4" />
                            Скинути фільтри
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-slate-700 rounded-lg border border-slate-600 overflow-hidden flex flex-col">
                {/* Fixed Header */}
                <div className="overflow-x-auto border-b flex-shrink-0" style={{ borderColor: 'var(--theme-border)' }}>
                    <table className="w-full text-left text-sm">
                        <thead 
                            className="font-medium"
                            style={{
                                backgroundColor: 'var(--theme-surface-secondary)',
                                color: 'var(--theme-text-secondary)',
                            }}
                        >
                            <tr>
                                <th className="px-4 py-4" style={{ width: '75px' }}>Квитанція</th>
                                <th className="px-6 py-4" style={{ width: 'auto', minWidth: '200px' }}>Техніка</th>
                                <th className="px-6 py-4 w-[150px]">Клієнт</th>
                                <th className="px-4 py-4 w-[80px] text-center">Дзвінок</th>
                                <th className="px-4 py-4" style={{ width: '100px' }}>Статус</th>
                                <th className="px-4 py-4 w-[100px]">Вартість</th>
                                <th className="px-4 py-4 w-[110px]">Дата прийому</th>
                                <th className="px-4 py-4 w-[110px]">Дата видачі</th>
                                <th className="px-4 py-4" style={{ width: '98px' }}>Виконавець</th>
                                <th className="px-4 py-4 w-[60px]">Дії</th>
                            </tr>
                        </thead>
                    </table>
                </div>
                {/* Scrollable Body */}
                <div className="overflow-x-auto overflow-y-auto flex-1" style={{ maxHeight: 'calc(100vh - 450px)' }}>
                    <table className="w-full text-left text-sm">
                        <colgroup>
                            <col style={{ width: '75px' }} />
                            <col style={{ width: 'auto', minWidth: '200px' }} />
                            <col style={{ width: '150px' }} />
                            <col style={{ width: '80px' }} />
                            <col style={{ width: '100px' }} />
                            <col style={{ width: '100px' }} />
                            <col style={{ width: '110px' }} />
                            <col style={{ width: '110px' }} />
                            <col style={{ width: '98px' }} />
                            <col style={{ width: '60px' }} />
                        </colgroup>
                        <tbody className="divide-y divide-slate-600">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={11} className="px-6 py-12 text-center text-slate-400">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                                    </td>
                                </tr>
                            ) : isError ? (
                                <tr>
                                    <td colSpan={11} className="px-6 py-12 text-center text-red-400">
                                        Помилка завантаження. Спробуйте ще раз.
                                    </td>
                                </tr>
                            ) : data?.repairs.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="px-6 py-12 text-center text-slate-500">
                                        Ремонтів не знайдено.
                                    </td>
                                </tr>
                            ) : (
                                data?.repairs.map((repair) => (
                                    <tr
                                        key={repair.id}
                                        onContextMenu={(e) => handleContextMenu(e, repair)}
                                        className={clsx(
                                            'transition-colors border-b border-slate-600/50',
                                            getRowColor(repair.status),
                                            repair.shouldCall && 'ring-2 ring-pink-500 ring-inset'
                                        )}>
                                        <td
                                            className="px-4 py-4 font-medium text-slate-100 cursor-pointer hover:text-blue-400"
                                            onClick={() => navigate(`/repair/${repair.id}`)}
                                        >
                                            #{repair.receiptId}
                                        </td>
                                        <td
                                            className="px-6 py-4 cursor-pointer"
                                            onClick={() => navigate(`/repair/${repair.id}`)}
                                        >
                                            <div className="font-medium text-slate-100">{repair.deviceName}</div>
                                            <div className="text-xs text-slate-200 whitespace-pre-wrap">{repair.faultDesc}</div>
                                        </td>
                                        <td
                                            className="px-6 py-4 cursor-pointer"
                                            onClick={() => navigate(`/repair/${repair.id}`)}
                                        >
                                            <div className="text-slate-100">{repair.clientName}</div>
                                            <div className="text-xs text-slate-200">{formatPhoneNumber(repair.clientPhone)}</div>
                                        </td>
                                        <td
                                            className="px-4 py-4 text-center"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={repair.shouldCall || false}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    updateShouldCallMutation.mutate({
                                                        id: repair.id,
                                                        shouldCall: e.target.checked
                                                    });
                                                }}
                                                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            />
                                        </td>
                                        <td
                                            className="px-4 py-4 cursor-pointer"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="relative group">
                                                <select
                                                    value={repair.status}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        const newStatus = Number(e.target.value);

                                                        // If changing to Issued and not already paid, show payment modal
                                                        if (newStatus === RepairStatus.Issued && !repair.isPaid) {
                                                            setPaymentModal({
                                                                repairId: repair.id,
                                                                receiptId: repair.receiptId,
                                                                status: newStatus
                                                            });
                                                        } else {
                                                            updateStatusMutation.mutate({
                                                                id: repair.id,
                                                                status: newStatus,
                                                                receiptId: repair.receiptId
                                                            });
                                                        }
                                                    }}
                                                    className={clsx(
                                                        "w-full appearance-none pl-8 pr-8 py-1.5 rounded text-xs font-medium border focus:outline-none focus:border-blue-500 cursor-pointer transition-colors",
                                                        getStatusColor(repair.status),
                                                        "bg-opacity-20 border-opacity-50"
                                                    )}
                                                    style={{
                                                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                                        backgroundPosition: `right 0.5rem center`,
                                                        backgroundRepeat: `no-repeat`,
                                                        backgroundSize: `1.5em 1.5em`
                                                    }}
                                                >
                                                    <option value={RepairStatus.Queue}>У черзі</option>
                                                    <option value={RepairStatus.InProgress}>У роботі</option>
                                                    <option value={RepairStatus.Waiting}>Очікування</option>
                                                    <option value={RepairStatus.Ready}>Готовий</option>
                                                    <option value={RepairStatus.NoAnswer}>Не додзвонились</option>
                                                    <option value={RepairStatus.Odessa}>Одеса</option>
                                                    <option value={RepairStatus.Issued}>Видано</option>
                                                </select>
                                                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                                                    {(() => {
                                                        switch (repair.status) {
                                                            case RepairStatus.Queue: return <Clock className="w-3.5 h-3.5 text-slate-100" />;
                                                            case RepairStatus.InProgress: return <Play className="w-3.5 h-3.5 text-slate-100" />;
                                                            case RepairStatus.Waiting: return <Loader2 className="w-3.5 h-3.5 text-slate-100" />;
                                                            case RepairStatus.Ready: return <Check className="w-3.5 h-3.5 text-slate-100" />;
                                                            case RepairStatus.NoAnswer: return <XCircle className="w-3.5 h-3.5 text-slate-100" />;
                                                            case RepairStatus.Odessa: return <MapPin className="w-3.5 h-3.5 text-slate-100" />;
                                                            case RepairStatus.Issued: return <CheckCircle className="w-3.5 h-3.5 text-slate-100" />;
                                                            default: return null;
                                                        }
                                                    })()}
                                                </div>
                                            </div>
                                        </td>
                                        <td
                                            className="px-4 py-4 font-medium text-slate-100 cursor-pointer"
                                            onClick={() => navigate(`/repair/${repair.id}`)}
                                        >
                                            {repair.totalCost.toFixed(2)} ₴
                                        </td>
                                        <td
                                            className="px-4 py-4 text-slate-200 cursor-pointer"
                                            onClick={() => navigate(`/repair/${repair.id}`)}
                                        >
                                            {repair.dateStart ? new Date(repair.dateStart).toLocaleString('uk-UA', {
                                                year: 'numeric',
                                                month: '2-digit',
                                                day: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            }) : '-'}
                                        </td>
                                        <td
                                            className="px-4 py-4 text-slate-200 cursor-pointer"
                                            onClick={() => navigate(`/repair/${repair.id}`)}
                                        >
                                            {repair.dateEnd ? new Date(repair.dateEnd).toLocaleString('uk-UA', {
                                                year: 'numeric',
                                                month: '2-digit',
                                                day: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            }) : '-'}
                                        </td>
                                        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                                            <select
                                                value={repair.executor || (executors.length > 0 ? executors[0].Name : '')}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    updateExecutorMutation.mutate({ id: repair.id, executor: e.target.value });
                                                }}
                                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 hover:border-slate-500 focus:outline-none focus:border-blue-500"
                                            >
                                                {executors.map((executor: any) => (
                                                    <option key={executor.ID} value={executor.Name}>
                                                        {executor.Name}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteId(repair.id);
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                                                title="Видалити"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-slate-600 flex items-center justify-between">
                    <div className="text-sm text-slate-400">
                        Сторінка {page} з {data?.totalPages || 1}
                    </div>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => handlePageChange(Math.max(1, page - 1))}
                            className="px-3 py-1 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 disabled:hover:bg-slate-600 rounded text-sm transition-colors"
                        >
                            Попередня
                        </button>
                        <button
                            disabled={page === (data?.totalPages || 1)}
                            onClick={() => handlePageChange(page + 1)}
                            className="px-3 py-1 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 disabled:hover:bg-slate-600 rounded text-sm transition-colors"
                        >
                            Наступна
                        </button>
                    </div>
                </div>
            </div>


            {
                contextMenu && (
                    <ContextMenu
                        x={contextMenu.x}
                        y={contextMenu.y}
                        onClose={() => setContextMenu(null)}
                    >
                        <ContextMenuItem
                            icon={<Copy />}
                            label="Створити копію..."
                        >
                            <ContextMenuItem
                                label="З технікою"
                                onClick={() => handleCopy('client_device')}
                            />
                            <ContextMenuItem
                                label="Тільки клієнт"
                                onClick={() => handleCopy('client')}
                            />
                        </ContextMenuItem>
                        <ContextMenuItem
                            icon={<Phone />}
                            label="Фільтр по телефону"
                            onClick={handleFilterByPhone}
                        />
                    </ContextMenu>
                )
            }

            {/* Payment Confirmation Modal */}
            {paymentModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-600">
                        <h3 className="text-xl font-semibold text-slate-100 mb-4">Підтвердження оплати</h3>
                        <p className="text-sm text-slate-400 mb-4">
                            Ви змінюєте статус на "Видано". Будь ласка, оберіть тип оплати:
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Тип оплати</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="paymentType"
                                            value="Готівка"
                                            checked={paymentType === 'Готівка'}
                                            onChange={(e) => setPaymentType(e.target.value as 'Готівка' | 'Картка')}
                                            className="w-4 h-4 border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-slate-300">Готівка</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="paymentType"
                                            value="Картка"
                                            checked={paymentType === 'Картка'}
                                            onChange={(e) => setPaymentType(e.target.value as 'Готівка' | 'Картка')}
                                            className="w-4 h-4 border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-slate-300">Картка</span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPaymentModal(null);
                                        setPaymentType('Готівка');
                                    }}
                                    className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    Скасувати
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (paymentModal) {
                                            updateStatusMutation.mutate({
                                                id: paymentModal.repairId,
                                                status: paymentModal.status,
                                                receiptId: paymentModal.receiptId,
                                                paymentType: paymentType
                                            });
                                        }
                                    }}
                                    disabled={updateStatusMutation.isPending}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {updateStatusMutation.isPending ? 'Збереження...' : 'Підтвердити'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={() => deleteId && deleteRepairMutation.mutate(deleteId)}
                title="Видалення запису"
                message="Ви впевнені, що хочете видалити цей запис? Цю дію неможливо скасувати."
                confirmLabel="Видалити"
                isDestructive
                isLoading={deleteRepairMutation.isPending}
            />
        </div>
    );
};
