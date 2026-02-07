import React from 'react';
import { useQuery, keepPreviousData, useQueryClient, useMutation } from '@tanstack/react-query';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { repairApi, GetRepairsResponse } from '../api/repairs';
import { executorsApi } from '../api/executors';
import { warehouseApi } from '../api/warehouse';
import { profitsApi } from '../api/cashRegister';
import { RepairStatus } from '../types/db';
import { Search, Loader2, Copy, Trash2, Phone, Check, Clock, Play, XCircle, MapPin, CheckCircle, X, Eye, EyeOff, RotateCcw, ChevronDown, User } from 'lucide-react';
import { ContextMenu, ContextMenuItem } from '../components/ContextMenu';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { clsx } from 'clsx';
import { formatPhoneNumber } from '../utils/formatters';
import { useTheme } from '../contexts/ThemeContext';
import { EXECUTOR_ICONS } from '../constants/executors';
import { useHotkeys } from '../hooks/useHotkeys';
import { fuzzySearch } from '../utils/fuzzySearch';
import { QRCodeModal } from '../components/QRCodeModal';
import { Smartphone, Filter } from 'lucide-react';
import { AdvancedFiltersModal, AdvancedFilterRule } from '../components/AdvancedFiltersModal';
import { RefundModal, RefundData } from '../components/RefundModal';
import { WeatherWidget } from '../components/WeatherWidget';
import { createPortal } from 'react-dom';

export const Dashboard: React.FC = () => {
    const { currentTheme, matrixEnabled, snowflakesEnabled, celestialEnabled, rainEnabled, weatherEnabled } = useTheme();
    const isLight = currentTheme.type === 'light';
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const [contextMenu, setContextMenu] = React.useState<{ x: number; y: number; repair: any } | null>(null);
    const [deleteId, setDeleteId] = React.useState<number | null>(null);
    const [paymentModal, setPaymentModal] = React.useState<{ repairId: number; receiptId: number; status: RepairStatus } | null>(null);
    const [paymentType, setPaymentType] = React.useState<'Готівка' | 'Картка'>('Готівка');
    const [searchInput, setSearchInput] = React.useState('');
    const [qrModalData, setQrModalData] = React.useState<{ phoneNumber: string; clientName: string; workDone?: string } | null>(null);
    const [isAdvancedModalOpen, setIsAdvancedModalOpen] = React.useState(false);
    const [refundModal, setRefundModal] = React.useState<{ repair: any } | null>(null);
    const [showExecutorDropdown, setShowExecutorDropdown] = React.useState(false);
    const [openRowExecutorDropdownId, setOpenRowExecutorDropdownId] = React.useState<number | null>(null);
    const executorDropdownRef = React.useRef<HTMLDivElement>(null);
    const executorButtonRef = React.useRef<HTMLButtonElement>(null);
    const executorDropdownContentRef = React.useRef<HTMLDivElement>(null);
    const rowExecutorDropdownRef = React.useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();
    const searchInputRef = React.useRef<HTMLInputElement>(null);
    const [showFinancialStats, setShowFinancialStats] = React.useState(() => {
        return localStorage.getItem('show_financial_stats') !== 'false';
    });

    const toggleFinancialStats = () => {
        const newValue = !showFinancialStats;
        setShowFinancialStats(newValue);
        localStorage.setItem('show_financial_stats', String(newValue));
    };

    // Hotkeys
    useHotkeys('ctrl+f', () => {
        if (searchInputRef.current) {
            searchInputRef.current.focus();
            searchInputRef.current.select();
        }
    });

    // Esc to clear filters or close modals
    useHotkeys('escape', () => {
        if (contextMenu) {
            setContextMenu(null);
            return;
        }
        if (isAdvancedModalOpen) {
            setIsAdvancedModalOpen(false);
            return;
        }
        if (paymentModal) {
            setPaymentModal(null);
            return;
        }
        if (qrModalData) {
            setQrModalData(null);
            return;
        }
        if (refundModal) {
            setRefundModal(null);
            return;
        }
        if (deleteId) {
            setDeleteId(null);
            return;
        }

        if (statusFilter.length > 0 || shouldCall || search || executorFilter || dateStart || dateEnd || paymentDateStart || paymentDateEnd || advancedFilters.length > 0) {
            handleReset();
        }
    });

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
    const advancedFiltersStr = searchParams.get('adv') || '';
    const advancedFilters: AdvancedFilterRule[] = React.useMemo(() => {
        try {
            return advancedFiltersStr ? JSON.parse(decodeURIComponent(atob(advancedFiltersStr))) : [];
        } catch (e) {
            return [];
        }
    }, [advancedFiltersStr]);

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
        refetchInterval: 30000,
    });

    const { data, isLoading, isError } = useQuery<GetRepairsResponse>({
        queryKey: ['repairs', page, search, statusFilter, shouldCall, executorFilter, dateStart, dateEnd, paymentDateStart, paymentDateEnd, advancedFilters],
        queryFn: () => repairApi.getRepairs({
            page,
            search,
            status: statusFilter.length > 0 ? statusFilter : undefined,
            shouldCall,
            executor: executorFilter || undefined,
            dateStart: dateStart || undefined,
            dateEnd: dateEnd || undefined,
            paymentDateStart: paymentDateStart || undefined,
            paymentDateEnd: paymentDateEnd || undefined,
            advancedFilters: advancedFilters.length > 0 ? advancedFilters : undefined
        }),
        placeholderData: keepPreviousData,
        refetchInterval: 15000,
    });

    // Broad fetch for fuzzy search fallback (only if search is active and backend returned nothing)
    const { data: recentRepairsData } = useQuery({
        queryKey: ['recent-repairs-fuzzy'],
        queryFn: () => repairApi.getRepairs({ limit: 500 }), // Get last 500 records to search from
        enabled: !!search && (!data || data.repairs.length === 0),
        staleTime: 60000 // Cache for 1 minute
    });

    const isFuzzyActive = !!search && data?.repairs.length === 0 && (recentRepairsData?.repairs.length || 0) > 0;

    const displayedRepairs = React.useMemo(() => {
        if (!search || !data?.repairs) return data?.repairs || [];

        // If backend search returned results, use them
        if (data.repairs.length > 0) return data.repairs;

        // Otherwise try fuzzy search on recent records
        if (recentRepairsData?.repairs) {
            return fuzzySearch(recentRepairsData.repairs, search, [
                'Имя_заказчика',
                'Телефон',
                'Наименование_техники',
                'Квитанция',
                'Примечание'
            ]);
        }

        return [];
    }, [search, data?.repairs, recentRepairsData?.repairs]);

    // --- FINANCIAL STATS FOR HEADER ---
    const today = new Date();
    const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const todayStr = formatDate(today);
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthStartStr = formatDate(firstDayOfMonth);

    const { data: todayProfits = [] } = useQuery({
        queryKey: ['executor-profits', 'today', todayStr],
        queryFn: () => profitsApi.getExecutorProfits(todayStr, todayStr),
        refetchInterval: 60000,
    });

    const { data: monthProfits = [] } = useQuery({
        queryKey: ['executor-profits', 'month', monthStartStr, todayStr],
        queryFn: () => profitsApi.getExecutorProfits(monthStartStr, todayStr),
        refetchInterval: 300000,
    });

    const calculateExecutorStats = (data: any[]) => {
        const andriy = data.find(e => e.executorName === 'Андрій');
        const houseProfit = data.reduce((acc, e) => acc + e.totalProfit, 0);
        const andriySalary = (andriy?.executorProfit || 0) + houseProfit;

        const others = data.filter(e => e.executorName !== 'Андрій');
        const othersSalary = others.reduce((acc, e) => acc + e.executorProfit, 0);

        return { andriySalary, othersSalary };
    };

    const todayStats = calculateExecutorStats(todayProfits);
    const monthStats = calculateExecutorStats(monthProfits);
    // ---------------------------------

    // Handle click outside for executor dropdowns
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            // Check if click is outside both the button container AND the dropdown content
            if (executorDropdownRef.current && !executorDropdownRef.current.contains(target) &&
                executorDropdownContentRef.current && !executorDropdownContentRef.current.contains(target)) {
                setShowExecutorDropdown(false);
            }
            if (rowExecutorDropdownRef.current && !rowExecutorDropdownRef.current.contains(target)) {
                setOpenRowExecutorDropdownId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Scroll to last modified repair
    React.useEffect(() => {
        const lastRepairId = location.state?.lastRepairId;
        if (lastRepairId && !isLoading && data?.repairs) {
            // Wait slightly for DOM to settle
            const timer = setTimeout(() => {
                const element = document.getElementById(`repair-${lastRepairId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Temporary highlight
                    element.classList.add('ring-2', 'ring-blue-400', 'ring-inset', 'bg-blue-900/20');
                    setTimeout(() => {
                        element.classList.remove('ring-2', 'ring-blue-400', 'ring-inset', 'bg-blue-900/20');
                        // Clear state so it doesn't scroll again on every render
                        window.history.replaceState({}, document.title);
                    }, 3000);
                }
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [location.state, isLoading, data]);

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

    const refundMutation = useMutation({
        mutationFn: (data: { repair: any; refundData: RefundData }) => repairApi.processRefund({
            repairId: data.repair.id,
            receiptId: data.repair.receiptId,
            refundAmount: data.refundData.refundAmount,
            refundType: data.refundData.refundType,
            returnPartsToWarehouse: data.refundData.returnPartsToWarehouse,
            note: data.refundData.note || undefined
        }),
        onSuccess: (result) => {
            if (result.success) {
                queryClient.invalidateQueries({ queryKey: ['repairs'] });
                queryClient.invalidateQueries({ queryKey: ['transactions'] });
                queryClient.invalidateQueries({ queryKey: ['cash-balances'] });
                setRefundModal(null);
            } else {
                alert(`Помилка повернення: ${result.error}`);
            }
        },
        onError: (error: any) => {
            console.error('Refund error:', error);
            alert(`Помилка: ${error.message}`);
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

                // Handle payment status based on Issued state
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
                } else {
                    // If moving away from Issued, mark as unpaid
                    updates.isPaid = false;
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
            const newParams = new URLSearchParams();
            newParams.set('search', phone);
            newParams.set('page', '1');
            setSearchParams(newParams);
            setSearchInput(phone);
            setContextMenu(null);
        }
    };

    const getStatusColor = (status: RepairStatus) => {
        const colorClass = isLight ? (
            status === RepairStatus.Queue ? 'bg-amber-100 text-amber-900 border-amber-300' :
                status === RepairStatus.InProgress ? 'bg-blue-100 text-blue-900 border-blue-300' :
                    status === RepairStatus.Waiting ? 'bg-orange-100 text-orange-900 border-orange-300' :
                        status === RepairStatus.Ready ? 'bg-green-100 text-green-900 border-green-300' :
                            status === RepairStatus.NoAnswer ? 'bg-red-100 text-red-900 border-red-300' :
                                status === RepairStatus.Odessa ? 'bg-purple-100 text-purple-900 border-purple-300' :
                                    status === RepairStatus.Issued ? 'bg-teal-100 text-teal-900 border-teal-300' :
                                        'bg-slate-100 text-slate-900 border-slate-300'
        ) : (
            status === RepairStatus.Queue ? 'bg-yellow-500/20 text-slate-100 border-yellow-500/50' :
                status === RepairStatus.InProgress ? 'bg-blue-500/20 text-slate-100 border-blue-500/50' :
                    status === RepairStatus.Waiting ? 'bg-orange-500/20 text-slate-100 border-orange-500/50' :
                        status === RepairStatus.Ready ? 'bg-green-500/20 text-slate-100 border-green-500/50' :
                            status === RepairStatus.NoAnswer ? 'bg-red-500/20 text-slate-100 border-red-500/50' :
                                status === RepairStatus.Odessa ? 'bg-purple-500/20 text-slate-100 border-purple-500/50' :
                                    status === RepairStatus.Issued ? 'bg-teal-500/20 text-slate-100 border-teal-500/50' :
                                        'bg-slate-500/20 text-slate-100 border-slate-500/50'
        );
        return colorClass;
    };

    const getRowColor = (status: RepairStatus) => {
        if (isLight) {
            switch (status) {
                case RepairStatus.Queue: return 'bg-amber-50 hover:bg-amber-100/80';
                case RepairStatus.InProgress: return 'bg-blue-50 hover:bg-blue-100/80';
                case RepairStatus.Waiting: return 'bg-orange-50 hover:bg-orange-100/80';
                case RepairStatus.Ready: return 'bg-green-50 hover:bg-green-100/80';
                case RepairStatus.NoAnswer: return 'bg-red-50 hover:bg-red-100/80';
                case RepairStatus.Odessa: return 'bg-purple-50 hover:bg-purple-100/80';
                case RepairStatus.Issued: return 'bg-teal-50 hover:bg-teal-100/80';
                default: return 'hover:bg-slate-100/50';
            }
        }
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
        <div className="h-full flex flex-col p-6 space-y-6 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-4 relative z-30">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-slate-100">Активні ремонти</h2>
                        <button
                            onClick={toggleFinancialStats}
                            className={clsx(
                                "p-1.5 rounded-lg transition-all hover:bg-slate-700/50",
                                showFinancialStats ? "text-blue-400" : "text-slate-500"
                            )}
                            title={showFinancialStats ? "Приховати прибутки" : "Показати прибутки"}
                        >
                            {showFinancialStats ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                        </button>
                    </div>

                    {/* Financial Stats Section */}
                    {showFinancialStats && (
                        <div className={clsx(
                            "flex rounded-lg p-1.5 px-4 border gap-5 text-sm transition-all shadow-sm",
                            isLight ? "bg-white border-slate-300" : "bg-slate-800/40 border-slate-600/50"
                        )}>
                            <div className="flex gap-2 items-center">
                                <span className={clsx("font-medium opacity-80", isLight ? "text-blue-800" : "text-blue-400")}>Андрій:</span>
                                <span className={clsx("font-bold tabular-nums", isLight ? "text-slate-900" : "text-slate-100")}>
                                    {Math.round(todayStats.andriySalary)}
                                </span>
                                <span className="text-slate-500 font-normal opacity-50">/</span>
                                <span className={clsx("font-semibold tabular-nums", isLight ? "text-slate-700" : "text-slate-200")}>
                                    {Math.round(monthStats.andriySalary)}
                                </span>
                            </div>
                            <div className={clsx("w-px h-4 self-center", isLight ? "bg-slate-300" : "bg-slate-600")}></div>
                            <div className="flex gap-2 items-center">
                                <span className={clsx("font-medium opacity-80", isLight ? "text-amber-800" : "text-amber-400")}>Інші:</span>
                                <span className={clsx("font-bold tabular-nums", isLight ? "text-slate-900" : "text-slate-100")}>
                                    {Math.round(todayStats.othersSalary)}
                                </span>
                                <span className="text-slate-500 font-normal opacity-50">/</span>
                                <span className={clsx("font-semibold tabular-nums", isLight ? "text-slate-700" : "text-slate-200")}>
                                    {Math.round(monthStats.othersSalary)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/repair/new')}
                        className={clsx(
                            "px-4 py-2 rounded-lg font-medium transition-all duration-300 shadow-lg whitespace-nowrap",
                            (matrixEnabled || snowflakesEnabled || celestialEnabled || rainEnabled)
                                ? "bg-blue-600/20 border border-blue-500 text-blue-400 hover:bg-blue-600/30"
                                : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40"
                        )}
                    >
                        Новий ремонт
                    </button>
                </div>
            </div>

            {/* WeatherWidget moved to absolute to prevent layout shifting */}
            {weatherEnabled && (
                <div className="fixed top-24 right-10 z-[40] pointer-events-none">
                    <div className="pointer-events-auto">
                        <WeatherWidget />
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className={clsx(
                "space-y-4 bg-slate-700 p-4 rounded-lg border border-slate-600 rainbow-groupbox relative overflow-visible",
                (showExecutorDropdown || isAdvancedModalOpen) ? "z-[100]" : "z-[10]"
            )}>
                {/* Search and Date Filters in one row */}
                <div className={clsx(
                    "flex flex-wrap items-center gap-4 overflow-visible relative",
                    (showExecutorDropdown || isAdvancedModalOpen) ? "z-[30]" : "z-[1]"
                )}>
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            ref={searchInputRef}
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
                <div className="flex flex-wrap items-center gap-3 overflow-visible">
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
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-600 overflow-visible">
                    {/* Дзвінок Filter Button */}
                    <button
                        onClick={handleCallFilterClick}
                        className={clsx(
                            'px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all flex items-center gap-2',
                            shouldCall
                                ? 'bg-pink-500/20 text-pink-400 border-pink-500/50 ring-2 ring-offset-1 ring-offset-slate-700 ring-white/20'
                                : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                        )}
                    >
                        <Phone className="w-4 h-4" />
                        Дзвінок
                    </button>

                    <div className="relative" ref={executorDropdownRef}>
                        <button
                            ref={executorButtonRef}
                            type="button"
                            onClick={() => setShowExecutorDropdown(!showExecutorDropdown)}
                            className={clsx(
                                "flex items-center justify-between gap-2 px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all shadow-sm min-w-[180px]",
                                showExecutorDropdown
                                    ? "bg-slate-700 border-blue-500 ring-2 ring-blue-500/20"
                                    : "bg-slate-800 border-slate-600 hover:border-slate-500 text-slate-300"
                            )}
                        >
                            <div className="flex items-center gap-2 overflow-hidden">
                                {(() => {
                                    if (!executorFilter) {
                                        return (
                                            <>
                                                <User className="w-4 h-4 text-slate-500" />
                                                <span className="truncate">Всі виконавці</span>
                                            </>
                                        );
                                    }
                                    const executorData = executors.find((e: any) => e.Name === executorFilter);
                                    const matchingIcon = EXECUTOR_ICONS.find(i => i.name === executorData?.Icon);
                                    const IconComp = matchingIcon ? matchingIcon.Icon : User;
                                    return (
                                        <>
                                            <IconComp
                                                className="w-4 h-4 flex-shrink-0"
                                                style={{ color: executorData?.Color || (isLight ? '#334155' : '#94a3b8') }}
                                            />
                                            <span className="truncate">{executorFilter}</span>
                                        </>
                                    );
                                })()}
                            </div>
                            <ChevronDown className={clsx("w-4 h-4 text-slate-400 transition-transform duration-300", showExecutorDropdown && "rotate-180")} />
                        </button>

                        {showExecutorDropdown && executorButtonRef.current && createPortal(
                            <div
                                ref={executorDropdownContentRef}
                                className="fixed rounded-xl border-2 border-slate-500 shadow-[0_30px_90px_rgba(0,0,0,1)] overflow-hidden"
                                style={{
                                    backgroundColor: isLight ? '#ffffff' : '#0f172a',
                                    opacity: 1,
                                    zIndex: 99999,
                                    top: `${executorButtonRef.current.getBoundingClientRect().bottom + 8}px`,
                                    left: `${executorButtonRef.current.getBoundingClientRect().left}px`,
                                    width: `${Math.max(executorButtonRef.current.getBoundingClientRect().width, 200)}px`
                                }}
                            >
                                <div className="max-h-60 overflow-y-auto py-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleExecutorFilterChange('');
                                            setShowExecutorDropdown(false);
                                        }}
                                        className={clsx(
                                            "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                                            !executorFilter ? "bg-blue-600/20 text-blue-400" : "hover:bg-white/5"
                                        )}
                                    >
                                        <User className="w-4 h-4 text-slate-500" />
                                        <span className="text-sm font-medium">Всі виконавці</span>
                                        {!executorFilter && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
                                    </button>

                                    {executors
                                        .filter((executor: any) => (Number(executor.SalaryPercent || 0) > 0 || Number(executor.ProductsPercent || 0) > 0))
                                        .map((executor: any) => {
                                            const matchingIcon = EXECUTOR_ICONS.find(i => i.name === executor.Icon);
                                            const IconComp = matchingIcon ? matchingIcon.Icon : User;
                                            const isSelected = executorFilter === executor.Name;

                                            return (
                                                <button
                                                    key={executor.ID}
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleExecutorFilterChange(executor.Name);
                                                        setShowExecutorDropdown(false);
                                                    }}
                                                    className={clsx(
                                                        "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-200",
                                                        isSelected
                                                            ? "bg-blue-600/30 text-blue-400"
                                                            : (isLight ? "text-slate-800 hover:bg-slate-100" : "text-slate-200 hover:bg-white/10")
                                                    )}
                                                >
                                                    <IconComp
                                                        className="w-4 h-4"
                                                        style={{ color: executor.color || executor.Color || (isLight ? '#334155' : '#94a3b8') }}
                                                    />
                                                    <span className="text-sm font-semibold">{executor.Name}</span>
                                                    {isSelected && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
                                                </button>
                                            );
                                        })}
                                </div>
                            </div>,
                            document.body
                        )}
                    </div>

                    <button
                        onClick={() => setIsAdvancedModalOpen(true)}
                        className={clsx(
                            'px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all flex items-center gap-2',
                            advancedFilters.length > 0
                                ? 'bg-blue-600/20 text-blue-400 border-blue-500/50 ring-2 ring-blue-500/20'
                                : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-500'
                        )}
                    >
                        <Filter className="w-4 h-4" />
                        Складні фільтри
                        {advancedFilters.length > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-bold">
                                {advancedFilters.length}
                            </span>
                        )}
                    </button>

                    {(statusFilter.length > 0 || shouldCall || search || executorFilter || dateStart || dateEnd || paymentDateStart || paymentDateEnd || advancedFilters.length > 0) && (
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
            <div className={clsx(
                "bg-slate-700 rounded-lg border border-slate-600 overflow-visible flex flex-col flex-1 rainbow-groupbox relative",
                openRowExecutorDropdownId ? "z-[100]" : "z-[1]"
            )}>
                {/* Fixed Header */}
                <div
                    className={clsx(
                        "overflow-x-auto overflow-y-scroll border-b flex-shrink-0 relative",
                        openRowExecutorDropdownId ? "z-[30]" : "z-[1]"
                    )}
                    style={{ borderColor: 'var(--theme-border)' }}
                >
                    <table className="w-full text-left text-sm" style={{ tableLayout: 'fixed', width: '100%' }}>
                        <colgroup>
                            <col style={{ width: '75px' }} />
                            <col style={{ width: 'auto', minWidth: '150px' }} />
                            <col style={{ width: '190px' }} />
                            <col style={{ width: '80px' }} />
                            <col style={{ width: '210px' }} />
                            <col style={{ width: '125px' }} />
                            <col style={{ width: '110px' }} />
                            <col style={{ width: '110px' }} />
                            <col style={{ width: '150px' }} />
                            <col style={{ width: '200px' }} />
                            <col style={{ width: '80px' }} />
                        </colgroup>
                        <thead
                            className="font-medium"
                            style={{
                                backgroundColor: 'var(--theme-surface-secondary)',
                                color: 'var(--theme-text-secondary)',
                            }}
                        >
                            <tr>
                                <th className="px-4 py-1 text-center" style={{ width: '75px' }}>Квитанція</th>
                                <th className="px-6 py-1 text-center" style={{ width: 'auto', minWidth: '150px' }}>Техніка</th>
                                <th className="px-6 py-1 w-[190px] text-center">Клієнт</th>
                                <th className="px-4 py-1 w-[80px] text-center">Дзвінок</th>
                                <th className="px-4 py-1 text-center" style={{ width: '210px' }}>Статус</th>
                                <th className="px-4 py-1 text-center w-[125px]">Вартість</th>
                                <th className="px-4 py-1 text-center w-[110px]">Дата прийому</th>
                                <th className="px-4 py-1 text-center w-[110px]">Дата видачі</th>
                                <th className="px-4 py-1 text-center" style={{ width: '150px' }}>Виконавець</th>
                                <th className="px-6 py-1 w-[200px] text-center">Примітки</th>
                                <th className="px-4 py-1 text-center w-[80px]">Дії</th>
                            </tr>
                        </thead>
                    </table>
                </div>
                {/* Scrollable Body */}
                <div className={clsx(
                    "overflow-x-auto overflow-y-auto flex-1 relative",
                    openRowExecutorDropdownId ? "z-[30]" : "z-[1]"
                )}>
                    <table className="w-full text-left text-sm" style={{ tableLayout: 'fixed', width: '100%' }}>
                        <colgroup>
                            <col style={{ width: '75px' }} />
                            <col style={{ width: 'auto', minWidth: '150px' }} />
                            <col style={{ width: '190px' }} />
                            <col style={{ width: '80px' }} />
                            <col style={{ width: '210px' }} />
                            <col style={{ width: '125px' }} />
                            <col style={{ width: '110px' }} />
                            <col style={{ width: '110px' }} />
                            <col style={{ width: '150px' }} />
                            <col style={{ width: '200px' }} />
                            <col style={{ width: '80px' }} />
                        </colgroup>
                        <tbody className="divide-y divide-slate-600">
                            {isFuzzyActive && (
                                <tr className={isLight ? "bg-blue-50" : "bg-blue-900/20"}>
                                    <td colSpan={12} className={clsx(
                                        "px-6 py-2 text-center text-xs font-medium border-b",
                                        isLight ? "text-blue-800 border-blue-200" : "text-blue-300 border-blue-500/30"
                                    )}>
                                        ✨ Точних збігів не знайдено. Показано схожі результати:
                                    </td>
                                </tr>
                            )}
                            {isLoading ? (
                                <tr>
                                    <td colSpan={12} className="px-6 py-12 text-center text-slate-400">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                                    </td>
                                </tr>
                            ) : isError ? (
                                <tr>
                                    <td colSpan={12} className="px-6 py-12 text-center text-red-400">
                                        Помилка завантаження. Спробуйте ще раз.
                                    </td>
                                </tr>
                            ) : displayedRepairs.length === 0 ? (
                                <tr>
                                    <td colSpan={12} className="px-6 py-12 text-center text-slate-500">
                                        Ремонтів не знайдено.
                                    </td>
                                </tr>
                            ) : (
                                // ТУТ РЕДАГУЮТЬСЯ ВІДСТУПИ: Класи 'py-2' у <td> нижче визначають вертикальні відступи між записами. 
                                // Змініть py-2 на py-3 або py-4 для більших відступів.
                                displayedRepairs.map((repair: any) => (
                                    <tr
                                        id={`repair-${repair.id}`}
                                        key={repair.id}
                                        onContextMenu={(e) => handleContextMenu(e, repair)}
                                        className={clsx(
                                            'transition-colors border-b border-slate-600/50',
                                            getRowColor(repair.status),
                                            repair.shouldCall && 'ring-2 ring-pink-500 ring-inset'
                                        )}>
                                        <td
                                            className="px-4 py-2 font-medium text-slate-100 cursor-pointer hover:text-blue-400 text-center"
                                            onClick={() => navigate(`/repair/${repair.id}`)}
                                        >
                                            #{repair.receiptId}
                                        </td>
                                        <td
                                            className="px-6 py-2 cursor-pointer text-center"
                                            onClick={() => navigate(`/repair/${repair.id}`)}
                                        >
                                            <div className="font-medium text-slate-100">{repair.deviceName}</div>
                                            <div className="text-xs text-slate-200 whitespace-pre-wrap">{repair.faultDesc}</div>
                                        </td>
                                        <td
                                            className="px-6 py-2 cursor-pointer text-center group"
                                            onClick={() => navigate(`/repair/${repair.id}`)}
                                        >
                                            <div className="text-slate-100">{repair.clientName}</div>
                                            <div className="flex items-center justify-center gap-2 group/phone">
                                                <div className="text-xs text-slate-200">{formatPhoneNumber(repair.clientPhone)}</div>
                                                {repair.clientPhone && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            (e.currentTarget as HTMLButtonElement).blur();
                                                            setQrModalData({
                                                                phoneNumber: formatPhoneNumber(repair.clientPhone),
                                                                clientName: repair.clientName,
                                                                workDone: repair.workDone
                                                            });
                                                        }}
                                                        className="p-1 rounded bg-slate-800/50 hover:bg-blue-600/30 text-slate-400 hover:text-blue-400 transition-all flex-shrink-0"
                                                        title="Показати QR-код для дзвінка"
                                                    >
                                                        <Smartphone className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td
                                            className="px-4 py-2 text-center"
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
                                                className="w-4 h-4 rounded cursor-pointer transition-all"
                                                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                                            />
                                        </td>
                                        <td
                                            className="px-4 py-2 cursor-pointer text-center"
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
                                                        "w-full appearance-none pl-8 pr-8 py-1.5 rounded text-xs font-semibold border focus:outline-none focus:border-blue-500 cursor-pointer transition-colors",
                                                        getStatusColor(repair.status),
                                                        "bg-opacity-20 border-opacity-50",
                                                        isLight ? "text-slate-900" : "text-slate-100"
                                                    )}
                                                    style={{
                                                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='${isLight ? '%230f172a' : '%23f1f5f9'}' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                                        backgroundPosition: `right 0.5rem center`,
                                                        backgroundRepeat: `no-repeat`,
                                                        backgroundSize: `1.5em 1.5em`
                                                    }}
                                                >
                                                    <option value={RepairStatus.Queue} className={isLight ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-100'}>У черзі</option>
                                                    <option value={RepairStatus.InProgress} className={isLight ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-100'}>У роботі</option>
                                                    <option value={RepairStatus.Waiting} className={isLight ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-100'}>Очікування</option>
                                                    <option value={RepairStatus.Ready} className={isLight ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-100'}>Готовий</option>
                                                    <option value={RepairStatus.NoAnswer} className={isLight ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-100'}>Не додзвонились</option>
                                                    <option value={RepairStatus.Odessa} className={isLight ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-100'}>Одеса</option>
                                                    <option value={RepairStatus.Issued} className={isLight ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-100'}>Видано</option>
                                                </select>
                                                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                                                    {(() => {
                                                        const iconClass = `w-3.5 h-3.5 ${isLight ? 'text-slate-900' : 'text-slate-100'}`;
                                                        switch (repair.status) {
                                                            case RepairStatus.Queue: return <Clock className={iconClass} />;
                                                            case RepairStatus.InProgress: return <Play className={iconClass} />;
                                                            case RepairStatus.Waiting: return <Loader2 className={iconClass} />;
                                                            case RepairStatus.Ready: return <Check className={iconClass} />;
                                                            case RepairStatus.NoAnswer: return <XCircle className={iconClass} />;
                                                            case RepairStatus.Odessa: return <MapPin className={iconClass} />;
                                                            case RepairStatus.Issued: return <CheckCircle className={iconClass} />;
                                                            default: return null;
                                                        }
                                                    })()}
                                                </div>
                                            </div>
                                        </td>
                                        <td
                                            className="px-4 py-2 font-medium cursor-pointer text-center"
                                            onClick={() => navigate(`/repair/${repair.id}`)}
                                        >
                                            <div className="text-slate-100">{repair.totalCost.toFixed(0)} ₴</div>
                                            <div className="text-[10px] text-slate-400 mt-1 space-y-0.5 leading-tight">
                                                <div>Робота {repair.costLabor} грн.</div>
                                                <div>Товар {(repair.totalCost - repair.costLabor).toFixed(0)} грн.</div>
                                            </div>
                                        </td>
                                        <td
                                            className="px-4 py-2 text-slate-200 cursor-pointer text-center"
                                            onClick={() => navigate(`/repair/${repair.id}`)}
                                        >
                                            {repair.dateStart ? new Date(repair.dateStart).toLocaleString('uk-UA', {
                                                year: 'numeric',
                                                month: '2-digit',
                                                day: '2-digit'
                                            }) : '-'}
                                        </td>
                                        <td
                                            className="px-4 py-2 text-slate-200 cursor-pointer text-center"
                                            onClick={() => navigate(`/repair/${repair.id}`)}
                                        >
                                            {repair.dateEnd ? new Date(repair.dateEnd).toLocaleString('uk-UA', {
                                                year: 'numeric',
                                                month: '2-digit',
                                                day: '2-digit'
                                            }) : '-'}
                                        </td>
                                        <td className="px-4 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                                            <div className="relative" ref={repair.id === openRowExecutorDropdownId ? rowExecutorDropdownRef : null}>
                                                <button
                                                    type="button"
                                                    onClick={() => setOpenRowExecutorDropdownId(openRowExecutorDropdownId === repair.id ? null : repair.id)}
                                                    className={clsx(
                                                        "w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded border transition-all shadow-sm",
                                                        openRowExecutorDropdownId === repair.id
                                                            ? "bg-slate-700 border-blue-500 ring-2 ring-blue-500/20"
                                                            : (isLight ? "bg-white border-slate-300 hover:border-slate-400" : "bg-slate-800 border-slate-600 hover:border-slate-500")
                                                    )}
                                                >
                                                    {(() => {
                                                        const executorName = repair.executor;
                                                        const executorData = executors.find((e: any) => e.Name === executorName);
                                                        const matchingIcon = EXECUTOR_ICONS.find(i => i.name === executorData?.Icon);
                                                        const IconComp = matchingIcon ? matchingIcon.Icon : User;
                                                        return (
                                                            <>
                                                                <IconComp
                                                                    className="w-3.5 h-3.5 flex-shrink-0"
                                                                    style={{ color: executorData?.Color || (isLight ? '#334155' : '#94a3b8') }}
                                                                />
                                                                <span className={clsx("truncate text-[11px] font-medium flex-1", isLight ? "text-slate-900" : "text-slate-100")}>
                                                                    {executorName || (executors.length > 0 ? executors[0].Name : '')}
                                                                </span>
                                                                <ChevronDown className={clsx("w-3 h-3 text-slate-400 transition-transform duration-300 flex-shrink-0", openRowExecutorDropdownId === repair.id && "rotate-180")} />
                                                            </>
                                                        );
                                                    })()}
                                                </button>

                                                {openRowExecutorDropdownId === repair.id && (
                                                    <div className="absolute top-full left-0 mt-1 w-full min-w-[160px] rounded-lg border-2 border-slate-500 shadow-[0_30px_90px_rgba(0,0,0,1)] overflow-hidden z-[9999] dropdown-solid-fix"
                                                        style={{
                                                            backgroundColor: isLight ? '#ffffff' : '#0f172a',
                                                            opacity: '1 !important' as any,
                                                            backgroundImage: 'none !important' as any,
                                                            backdropFilter: 'none !important' as any
                                                        }}
                                                    >
                                                        <div className="max-h-48 overflow-y-auto py-1">
                                                            {executors
                                                                .filter((executor: any) => (Number(executor.SalaryPercent || 0) > 0 || Number(executor.ProductsPercent || 0) > 0))
                                                                .map((executor: any) => {
                                                                    const matchingIcon = EXECUTOR_ICONS.find(i => i.name === executor.Icon);
                                                                    const IconComp = matchingIcon ? matchingIcon.Icon : User;
                                                                    const isSelected = repair.executor === executor.Name;

                                                                    return (
                                                                        <button
                                                                            key={executor.ID}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                updateExecutorMutation.mutate({ id: repair.id, executor: executor.Name });
                                                                                setOpenRowExecutorDropdownId(null);
                                                                            }}
                                                                            className={clsx(
                                                                                "w-full flex items-center gap-2 px-3 py-2 text-left transition-all duration-200",
                                                                                isSelected
                                                                                    ? "bg-blue-600/30 text-blue-400"
                                                                                    : (isLight ? "text-slate-800 hover:bg-slate-100" : "text-slate-200 hover:bg-white/10")
                                                                            )}
                                                                        >
                                                                            <IconComp
                                                                                className="w-3.5 h-3.5"
                                                                                style={{ color: executor.Color || (isLight ? '#334155' : '#94a3b8') }}
                                                                            />
                                                                            <span className="text-[11px] font-semibold">{executor.Name}</span>
                                                                            {isSelected && <div className="ml-auto w-1 h-1 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
                                                                        </button>
                                                                    );
                                                                })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td
                                            className="px-6 py-2 text-xs text-slate-300 cursor-pointer italic text-center"
                                            onClick={() => navigate(`/repair/${repair.id}`)}
                                        >
                                            <div className="line-clamp-2" title={repair.note}>
                                                {repair.note || '-'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-center gap-1">
                                                <div className="w-8 flex justify-center">
                                                    {Boolean(repair.isPaid) && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setRefundModal({ repair });
                                                            }}
                                                            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-700 rounded-lg transition-colors"
                                                            title="Повернення коштів"
                                                        >
                                                            <RotateCcw className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="w-8 flex justify-center">
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
                                                </div>
                                            </div>
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
            {/* QR Code Modal for Phone Sharing */}
            <QRCodeModal
                isOpen={!!qrModalData}
                onClose={() => setQrModalData(null)}
                phoneNumber={qrModalData?.phoneNumber || ''}
                clientName={qrModalData?.clientName}
                workDone={qrModalData?.workDone}
            />

            <AdvancedFiltersModal
                isOpen={isAdvancedModalOpen}
                onClose={() => setIsAdvancedModalOpen(false)}
                initialRules={advancedFilters}
                onApply={(rules) => {
                    if (rules.length === 0) {
                        updateParams({ adv: null, page: '1' });
                    } else {
                        updateParams({ adv: btoa(encodeURIComponent(JSON.stringify(rules))), page: '1' });
                    }
                    setIsAdvancedModalOpen(false);
                }}
                executors={executors}
            />

            {refundModal && (
                <RefundModal
                    isOpen={!!refundModal}
                    onClose={() => setRefundModal(null)}
                    onConfirm={(refundData) => refundMutation.mutate({ repair: refundModal.repair, refundData })}
                    receiptId={refundModal.repair.receiptId}
                    totalCost={refundModal.repair.totalCost}
                    originalPaymentType={refundModal.repair.paymentType || 'Готівка'}
                    hasParts={false}
                    isLoading={refundMutation.isPending}
                />
            )}
        </div>
    );
};
