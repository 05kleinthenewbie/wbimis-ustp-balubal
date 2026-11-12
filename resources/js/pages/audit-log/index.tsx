import { Head, Link, router } from '@inertiajs/react';
import {
    History,
    Search,
    X,
    FileText,
    Users,
    CalendarDays,
    Layers,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import {
    Fragment,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import type { KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

type LogEntry = {
    id: number;
    action_taken: string;
    module_name: string;
    record_id: number | null;
    action_date: string;
    details: string | null;
    old_values: Record<string, unknown> | null;
    new_values: Record<string, unknown> | null;
    admin_user: { name: string } | null;
};

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type PaginatedLogs = {
    data: LogEntry[];
    links: PaginationLink[];
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
};

type SuggestionType = 'action' | 'actor' | 'details';

type Suggestion = {
    value: string;
    type: SuggestionType;
};

type Props = {
    logs: PaginatedLogs;
    modules: string[];
    users: { id: number; name: string }[];
    filters: {
        module?: string;
        search?: string;
        user_id?: string;
        status?: string;
        date_from?: string;
        date_to?: string;
    };
    suggestions: Suggestion[];
    stats: {
        total: number;
        today: number;
        active_admins: number;
        modules: number;
    };
};

const suggestionLabels: Record<SuggestionType, string> = {
    action: 'Action',
    actor: 'Actor',
    details: 'Details',
};

const moduleColors: Record<
    string,
    { bg: string; text: string; border: string }
> = {
    inventory_items: {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
    },
    service_requests: {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
    },
    job_orders: {
        bg: 'bg-purple-50',
        text: 'text-purple-700',
        border: 'border-purple-200',
    },
    users: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
    },
};

const defaultModuleColor = {
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    border: 'border-slate-200',
};

function getActionIndicator(action: string): { color: string; label: string } {
    const lower = action.toLowerCase();

    if (
        lower.includes('create') ||
        lower.includes('add') ||
        lower.includes('register') ||
        lower.includes('submit') ||
        lower.includes('provision')
    ) {
        return { color: 'bg-emerald-500', label: 'Created' };
    }

    if (
        lower.includes('update') ||
        lower.includes('edit') ||
        lower.includes('modify') ||
        lower.includes('change') ||
        lower.includes('set') ||
        lower.includes('mark') ||
        lower.includes('reset') ||
        lower.includes('flag')
    ) {
        return { color: 'bg-amber-500', label: 'Updated' };
    }

    if (lower.includes('delete') || lower.includes('remove')) {
        return { color: 'bg-red-500', label: 'Deleted' };
    }

    return { color: 'bg-blue-500', label: 'Action' };
}

function formatValue(value: unknown): string {
    if (value === null || value === undefined || value === '') {
        return '—';
    }

    if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
    }

    if (typeof value === 'object') {
        return JSON.stringify(value);
    }

    return String(value);
}

function formatFieldLabel(field: string): string {
    return field.replace(/_/g, ' ');
}

function highlightMatch(value: string, query: string) {
    const trimmed = query.trim();
    const display = value.length > 90 ? `${value.slice(0, 90)}…` : value;
    const index = trimmed
        ? display.toLowerCase().indexOf(trimmed.toLowerCase())
        : -1;

    if (index < 0) {
        return display;
    }

    return (
        <>
            {display.slice(0, index)}
            <mark className="bg-transparent font-semibold text-ustp-navy">
                {display.slice(index, index + trimmed.length)}
            </mark>
            {display.slice(index + trimmed.length)}
        </>
    );
}

function relativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) {
        return 'just now';
    }

    if (diffMin < 60) {
        return `${diffMin}m ago`;
    }

    if (diffHr < 24) {
        return `${diffHr}h ago`;
    }

    if (diffDay < 7) {
        return `${diffDay}d ago`;
    }

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
}

export default function AuditLogIndex({
    logs,
    modules,
    users,
    filters,
    suggestions,
    stats,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const [suggestionsOpen, setSuggestionsOpen] = useState(false);
    const [activeSuggestion, setActiveSuggestion] = useState(0);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchRef = useRef<HTMLDivElement>(null);

    const buildParams = useCallback(
        (overrides: Record<string, string | undefined> = {}) => {
            const merged = {
                module: filters.module,
                user_id: filters.user_id,
                status: filters.status,
                date_from: filters.date_from,
                date_to: filters.date_to,
                ...overrides,
            };

            return Object.fromEntries(
                Object.entries(merged).filter(
                    ([, value]) => value && value !== 'all',
                ),
            ) as Record<string, string>;
        },
        [filters],
    );

    const applyFilters = useCallback(
        (overrides: Record<string, string | undefined> = {}) => {
            router.get('/audit-log', buildParams(overrides), {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        },
        [buildParams],
    );

    const matches = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) {
            return [];
        }

        const seen = new Set<string>();
        const results: Suggestion[] = [];

        for (const suggestion of suggestions) {
            const value = suggestion.value.trim();

            if (!value || seen.has(value.toLowerCase())) {
                continue;
            }

            if (value.toLowerCase().includes(query)) {
                seen.add(value.toLowerCase());
                results.push(suggestion);
            }

            if (results.length >= 8) {
                break;
            }
        }

        return results;
    }, [search, suggestions]);

    const showSuggestions = suggestionsOpen && matches.length > 0;

    const runSearch = useCallback(
        (value: string) => {
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
                searchTimeout.current = null;
            }

            applyFilters({ search: value || undefined });
        },
        [applyFilters],
    );

    const handleSearch = useCallback(
        (value: string) => {
            setSearch(value);
            setSuggestionsOpen(true);
            setActiveSuggestion(0);

            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }

            searchTimeout.current = setTimeout(() => {
                searchTimeout.current = null;
                runSearch(value);
            }, 350);
        },
        [runSearch],
    );

    const applySuggestion = useCallback(
        (value: string) => {
            setSearch(value);
            setSuggestionsOpen(false);
            setActiveSuggestion(0);
            runSearch(value);
        },
        [runSearch],
    );

    const handleSearchKeyDown = useCallback(
        (event: KeyboardEvent<HTMLInputElement>) => {
            if (!showSuggestions) {
                return;
            }

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActiveSuggestion((index) => (index + 1) % matches.length);

                return;
            }

            if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActiveSuggestion(
                    (index) => (index - 1 + matches.length) % matches.length,
                );

                return;
            }

            if (event.key === 'Enter') {
                event.preventDefault();
                const picked = matches[activeSuggestion];

                if (picked) {
                    applySuggestion(picked.value);
                }

                return;
            }

            if (event.key === 'Escape') {
                setSuggestionsOpen(false);
            }
        },
        [activeSuggestion, applySuggestion, matches, showSuggestions],
    );

    useEffect(() => {
        return () => {
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!showSuggestions) {
            return;
        }

        function handleOutsideClick(event: MouseEvent) {
            if (!searchRef.current?.contains(event.target as Node)) {
                setSuggestionsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleOutsideClick);

        return () =>
            document.removeEventListener('mousedown', handleOutsideClick);
    }, [showSuggestions]);

    function applyFilter(module: string) {
        applyFilters({
            module: module !== 'all' ? module : undefined,
            search: search || undefined,
        });
    }

    function clearFilters() {
        setSearch('');
        router.get('/audit-log', {}, { preserveState: true, replace: true });
    }

    function toggleRow(id: number) {
        setExpandedRows((prev) => {
            const next = new Set(prev);

            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }

            return next;
        });
    }

    const hasActiveFilter =
        !!filters.module ||
        !!filters.search ||
        !!filters.user_id ||
        !!filters.status ||
        !!filters.date_from ||
        !!filters.date_to;
    const selectedUser = users.find(
        (user) => String(user.id) === filters.user_id,
    );
    const from =
        logs.total > 0 ? (logs.current_page - 1) * logs.per_page + 1 : 0;
    const to = Math.min(logs.current_page * logs.per_page, logs.total);

    const statCards = [
        {
            label: 'Total Logs',
            value: stats.total,
            icon: FileText,
            color: 'text-ustp-navy',
            bg: 'bg-ustp-navy/5',
        },
        {
            label: "Today's Actions",
            value: stats.today,
            icon: CalendarDays,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
        },
        {
            label: 'Active Admins',
            value: stats.active_admins,
            icon: Users,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
        },
        {
            label: 'Modules Tracked',
            value: stats.modules,
            icon: Layers,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
        },
    ];

    return (
        <>
            <Head title="Audit Log" />

            <div className="min-h-full flex-1 bg-slate-50 text-slate-800">
                <div className="relative flex flex-1 flex-col gap-6 overflow-hidden p-4 md:p-6 lg:p-8">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        {statCards.map((card) => (
                            <div
                                key={card.label}
                                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`flex size-10 items-center justify-center rounded-xl ${card.bg}`}
                                    >
                                        <card.icon
                                            className={`size-5 ${card.color}`}
                                        />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-semibold text-slate-800">
                                            {card.value.toLocaleString()}
                                        </p>
                                        <p className="text-[11px] text-slate-400">
                                            {card.label}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Toolbar: Search + Filter */}
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div
                            ref={searchRef}
                            className="relative w-full xl:max-w-xs"
                        >
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />

                            <Input
                                value={search}
                                onChange={(e) => handleSearch(e.target.value)}
                                onFocus={() => setSuggestionsOpen(true)}
                                onKeyDown={handleSearchKeyDown}
                                placeholder="Search actions, details, or users..."
                                role="combobox"
                                aria-expanded={showSuggestions}
                                aria-controls="audit-search-suggestions"
                                aria-autocomplete="list"
                                aria-activedescendant={
                                    showSuggestions
                                        ? `audit-suggestion-${activeSuggestion}`
                                        : undefined
                                }
                                className="h-10 border-slate-300 bg-white pl-9 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:border-ustp-navy focus-visible:ring-1 focus-visible:ring-ustp-navy/25"
                            />

                            {search && (
                                <button
                                    onClick={() => handleSearch('')}
                                    className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}

                            {showSuggestions && (
                                <ul
                                    id="audit-search-suggestions"
                                    role="listbox"
                                    className="absolute top-full right-0 left-0 z-20 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg shadow-slate-200/70"
                                >
                                    {matches.map((suggestion, index) => (
                                        <li
                                            key={`${suggestion.type}-${suggestion.value}`}
                                            id={`audit-suggestion-${index}`}
                                            role="option"
                                            aria-selected={
                                                index === activeSuggestion
                                            }
                                        >
                                            <button
                                                type="button"
                                                onMouseDown={(event) =>
                                                    event.preventDefault()
                                                }
                                                onMouseEnter={() =>
                                                    setActiveSuggestion(index)
                                                }
                                                onClick={() =>
                                                    applySuggestion(
                                                        suggestion.value,
                                                    )
                                                }
                                                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs ${
                                                    index === activeSuggestion
                                                        ? 'bg-slate-100'
                                                        : 'bg-white'
                                                }`}
                                            >
                                                <Search className="size-3.5 shrink-0 text-slate-400" />
                                                <span className="min-w-0 flex-1 truncate text-slate-700">
                                                    {highlightMatch(
                                                        suggestion.value,
                                                        search,
                                                    )}
                                                </span>
                                                <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                                                    {
                                                        suggestionLabels[
                                                            suggestion.type
                                                        ]
                                                    }
                                                </span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap">
                            <Select
                                value={filters.module ?? 'all'}
                                onValueChange={applyFilter}
                            >
                                <SelectTrigger className="h-10 w-40 border-slate-300 bg-white text-slate-600 focus:ring-1 focus:ring-ustp-navy/30">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="border-slate-200 bg-white text-slate-800">
                                    <SelectItem value="all">
                                        All modules
                                    </SelectItem>
                                    {modules.map((module) => (
                                        <SelectItem key={module} value={module}>
                                            {module.replace('_', ' ')}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={filters.user_id ?? 'all'}
                                onValueChange={(value) =>
                                    applyFilters({
                                        user_id:
                                            value !== 'all' ? value : undefined,
                                    })
                                }
                            >
                                <SelectTrigger className="h-10 w-40 border-slate-300 bg-white text-slate-600 focus:ring-1 focus:ring-ustp-navy/30">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="border-slate-200 bg-white text-slate-800">
                                    <SelectItem value="all">
                                        All users
                                    </SelectItem>
                                    {users.map((user) => (
                                        <SelectItem
                                            key={user.id}
                                            value={String(user.id)}
                                        >
                                            {user.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={filters.status ?? 'all'}
                                onValueChange={(value) =>
                                    applyFilters({
                                        status:
                                            value !== 'all' ? value : undefined,
                                    })
                                }
                            >
                                <SelectTrigger className="h-10 w-32 border-slate-300 bg-white text-slate-600 focus:ring-1 focus:ring-ustp-navy/30">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="border-slate-200 bg-white text-slate-800">
                                    <SelectItem value="all">
                                        All statuses
                                    </SelectItem>
                                    <SelectItem value="created">
                                        Created
                                    </SelectItem>
                                    <SelectItem value="updated">
                                        Updated
                                    </SelectItem>
                                    <SelectItem value="deleted">
                                        Deleted
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="flex items-center gap-2">
                                <div className="relative flex h-10 items-center rounded-lg border border-slate-300 bg-white">
                                    <Input
                                        type="date"
                                        aria-label="From date"
                                        value={filters.date_from ?? ''}
                                        onChange={(e) =>
                                            applyFilters({
                                                date_from:
                                                    e.target.value || undefined,
                                                search: search || undefined,
                                            })
                                        }
                                        className={`h-8 w-28 border-0 bg-transparent px-2 text-xs text-slate-600 shadow-none focus-visible:ring-0 ${
                                            filters.date_from
                                                ? ''
                                                : '[&::-webkit-datetime-edit]:text-transparent'
                                        }`}
                                    />

                                    {!filters.date_from && (
                                        <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-xs text-slate-400">
                                            From date
                                        </span>
                                    )}
                                </div>

                                <div className="relative flex h-10 items-center rounded-lg border border-slate-300 bg-white">
                                    <Input
                                        type="date"
                                        aria-label="To date"
                                        value={filters.date_to ?? ''}
                                        onChange={(e) =>
                                            applyFilters({
                                                date_to:
                                                    e.target.value || undefined,
                                                search: search || undefined,
                                            })
                                        }
                                        className={`h-8 w-28 border-0 bg-transparent px-2 text-xs text-slate-600 shadow-none focus-visible:ring-0 ${
                                            filters.date_to
                                                ? ''
                                                : '[&::-webkit-datetime-edit]:text-transparent'
                                        }`}
                                    />

                                    {!filters.date_to && (
                                        <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-xs text-slate-400">
                                            To date
                                        </span>
                                    )}
                                </div>
                            </div>

                            {hasActiveFilter && (
                                <button
                                    onClick={clearFilters}
                                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                                >
                                    <X className="size-3" />
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Active filter chips */}
                    {hasActiveFilter && (
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] text-slate-400">
                                Filters:
                            </span>

                            {filters.module && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-ustp-navy/20 bg-ustp-navy/5 px-2.5 py-1 text-[11px] font-medium text-ustp-navy">
                                    {filters.module.replace('_', ' ')}
                                    <button
                                        onClick={() =>
                                            applyFilters({
                                                module: undefined,
                                                search: search || undefined,
                                            })
                                        }
                                        className="ml-0.5 rounded-full p-0.5 hover:bg-ustp-navy/10"
                                    >
                                        <X className="size-2.5" />
                                    </button>
                                </span>
                            )}

                            {selectedUser && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                                    User: {selectedUser.name}
                                    <button
                                        onClick={() =>
                                            applyFilters({ user_id: undefined })
                                        }
                                        className="ml-0.5 rounded-full p-0.5 hover:bg-emerald-100"
                                    >
                                        <X className="size-2.5" />
                                    </button>
                                </span>
                            )}

                            {filters.status && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-[11px] font-medium text-purple-700">
                                    Status: {filters.status}
                                    <button
                                        onClick={() =>
                                            applyFilters({ status: undefined })
                                        }
                                        className="ml-0.5 rounded-full p-0.5 hover:bg-purple-100"
                                    >
                                        <X className="size-2.5" />
                                    </button>
                                </span>
                            )}

                            {(filters.date_from || filters.date_to) && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                                    Date: {filters.date_from ?? 'Any'} to{' '}
                                    {filters.date_to ?? 'Any'}
                                    <button
                                        onClick={() =>
                                            applyFilters({
                                                date_from: undefined,
                                                date_to: undefined,
                                            })
                                        }
                                        className="ml-0.5 rounded-full p-0.5 hover:bg-slate-200"
                                    >
                                        <X className="size-2.5" />
                                    </button>
                                </span>
                            )}

                            {filters.search && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                                    Search: "{filters.search}"
                                    <button
                                        onClick={() => {
                                            setSearch('');
                                            applyFilters({ search: undefined });
                                        }}
                                        className="ml-0.5 rounded-full p-0.5 hover:bg-amber-100"
                                    >
                                        <X className="size-2.5" />
                                    </button>
                                </span>
                            )}
                        </div>
                    )}

                    {/* Empty */}
                    {logs.data.length === 0 ? (
                        <div className="relative flex min-h-90 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 text-center">
                            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-ustp-light-blue">
                                <History className="size-6" />
                            </div>

                            <h2 className="text-sm font-medium text-slate-800">
                                {hasActiveFilter
                                    ? 'No matching audit log entries'
                                    : 'No audit log entries yet'}
                            </h2>

                            <p className="mt-1.5 max-w-sm text-xs leading-5 text-slate-500">
                                {hasActiveFilter
                                    ? 'Try adjusting your search or filter criteria.'
                                    : 'Administrative actions will appear here as they are performed.'}
                            </p>

                            {hasActiveFilter && (
                                <button
                                    onClick={clearFilters}
                                    className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                                >
                                    Clear all filters
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Table */}
                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200 bg-slate-50">
                                                <th className="w-10 px-4 py-3.5" />
                                                <th className="px-4 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                    Action
                                                </th>
                                                <th className="hidden px-4 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase sm:table-cell">
                                                    Module
                                                </th>
                                                <th className="hidden px-4 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase md:table-cell">
                                                    Performed by
                                                </th>
                                                <th className="hidden px-4 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase lg:table-cell">
                                                    Date
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {logs.data.map((log) => {
                                                const indicator =
                                                    getActionIndicator(
                                                        log.action_taken,
                                                    );
                                                const colors =
                                                    moduleColors[
                                                        log.module_name
                                                    ] ?? defaultModuleColor;
                                                const isExpanded =
                                                    expandedRows.has(log.id);
                                                const changedFields =
                                                    Array.from(
                                                        new Set([
                                                            ...Object.keys(
                                                                log.old_values ??
                                                                    {},
                                                            ),
                                                            ...Object.keys(
                                                                log.new_values ??
                                                                    {},
                                                            ),
                                                        ]),
                                                    );
                                                const hasDetails =
                                                    !!log.details ||
                                                    changedFields.length > 0;

                                                return (
                                                    <Fragment key={log.id}>
                                                        <tr
                                                            className={`border-b border-slate-200 transition-colors last:border-0 hover:bg-slate-50 ${isExpanded ? 'bg-slate-50' : ''}`}
                                                        >
                                                            <td className="px-4 py-4">
                                                                {hasDetails && (
                                                                    <button
                                                                        onClick={() =>
                                                                            toggleRow(
                                                                                log.id,
                                                                            )
                                                                        }
                                                                        className="flex size-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                                                                        title={
                                                                            isExpanded
                                                                                ? 'Collapse details'
                                                                                : 'Expand details'
                                                                        }
                                                                    >
                                                                        {isExpanded ? (
                                                                            <ChevronDown className="size-4" />
                                                                        ) : (
                                                                            <ChevronRight className="size-4" />
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </td>

                                                            <td className="px-4 py-4">
                                                                <div className="flex items-center gap-2">
                                                                    <span
                                                                        className={`size-2 shrink-0 rounded-full ${indicator.color}`}
                                                                    />

                                                                    <div>
                                                                        <p className="font-medium text-slate-800">
                                                                            {
                                                                                log.action_taken
                                                                            }
                                                                        </p>

                                                                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                                                            {log.record_id && (
                                                                                <span className="font-mono text-[10px] text-slate-400">
                                                                                    #
                                                                                    {
                                                                                        log.record_id
                                                                                    }
                                                                                </span>
                                                                            )}

                                                                            <span
                                                                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${colors.bg} ${colors.text} ${colors.border}`}
                                                                            >
                                                                                {log.module_name.replace(
                                                                                    '_',
                                                                                    ' ',
                                                                                )}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            <td className="hidden px-4 py-4 sm:table-cell">
                                                                <span
                                                                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize ${colors.bg} ${colors.text} ${colors.border}`}
                                                                >
                                                                    {log.module_name.replace(
                                                                        '_',
                                                                        ' ',
                                                                    )}
                                                                </span>
                                                            </td>

                                                            <td className="hidden px-4 py-4 md:table-cell">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="flex size-7 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500">
                                                                        {log.admin_user?.name
                                                                            ?.charAt(
                                                                                0,
                                                                            )
                                                                            ?.toUpperCase() ??
                                                                            '—'}
                                                                    </span>
                                                                    <span className="text-xs text-slate-600">
                                                                        {log
                                                                            .admin_user
                                                                            ?.name ??
                                                                            '—'}
                                                                    </span>
                                                                </div>
                                                            </td>

                                                            <td className="hidden px-4 py-4 lg:table-cell">
                                                                <span
                                                                    className="text-xs text-slate-500"
                                                                    title={new Date(
                                                                        log.action_date,
                                                                    ).toLocaleString()}
                                                                >
                                                                    {relativeTime(
                                                                        log.action_date,
                                                                    )}
                                                                </span>
                                                                <p className="mt-0.5 text-[10px] text-slate-400">
                                                                    {new Date(
                                                                        log.action_date,
                                                                    ).toLocaleString(
                                                                        'en-US',
                                                                        {
                                                                            month: 'short',
                                                                            day: 'numeric',
                                                                            year: 'numeric',
                                                                            hour: 'numeric',
                                                                            minute: '2-digit',
                                                                        },
                                                                    )}
                                                                </p>
                                                            </td>
                                                        </tr>

                                                        {isExpanded &&
                                                            hasDetails && (
                                                                <tr className="border-b border-slate-200 bg-slate-50/80 last:border-0">
                                                                    <td
                                                                        colSpan={
                                                                            5
                                                                        }
                                                                        className="px-4 py-4 pl-14"
                                                                    >
                                                                        <div className="space-y-3">
                                                                            {log.details && (
                                                                                <div className="rounded-lg border border-slate-200 bg-white p-3">
                                                                                    <p className="mb-1 text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
                                                                                        Details
                                                                                    </p>
                                                                                    <p className="text-xs leading-5 text-slate-600">
                                                                                        {
                                                                                            log.details
                                                                                        }
                                                                                    </p>
                                                                                </div>
                                                                            )}

                                                                            {changedFields.length >
                                                                                0 && (
                                                                                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                                                                                    <p className="border-b border-slate-100 px-3 py-2 text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
                                                                                        Previous
                                                                                        and
                                                                                        new
                                                                                        values
                                                                                    </p>

                                                                                    <table className="w-full text-xs">
                                                                                        <thead className="bg-slate-50">
                                                                                            <tr>
                                                                                                <th className="px-3 py-2 text-left text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
                                                                                                    Field
                                                                                                </th>
                                                                                                <th className="px-3 py-2 text-left text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
                                                                                                    Previous
                                                                                                </th>
                                                                                                <th className="px-3 py-2 text-left text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
                                                                                                    New
                                                                                                    value
                                                                                                </th>
                                                                                            </tr>
                                                                                        </thead>

                                                                                        <tbody>
                                                                                            {changedFields.map(
                                                                                                (
                                                                                                    field,
                                                                                                ) => {
                                                                                                    const before =
                                                                                                        formatValue(
                                                                                                            log
                                                                                                                .old_values?.[
                                                                                                                field
                                                                                                            ],
                                                                                                        );
                                                                                                    const after =
                                                                                                        formatValue(
                                                                                                            log
                                                                                                                .new_values?.[
                                                                                                                field
                                                                                                            ],
                                                                                                        );
                                                                                                    const changed =
                                                                                                        before !==
                                                                                                        after;

                                                                                                    return (
                                                                                                        <tr
                                                                                                            key={
                                                                                                                field
                                                                                                            }
                                                                                                            className="border-t border-slate-100"
                                                                                                        >
                                                                                                            <td className="px-3 py-2 text-slate-600 capitalize">
                                                                                                                {formatFieldLabel(
                                                                                                                    field,
                                                                                                                )}
                                                                                                            </td>
                                                                                                            <td
                                                                                                                className={`px-3 py-2 ${changed ? 'text-rose-600' : 'text-slate-400'}`}
                                                                                                            >
                                                                                                                {
                                                                                                                    before
                                                                                                                }
                                                                                                            </td>
                                                                                                            <td
                                                                                                                className={`px-3 py-2 ${changed ? 'font-medium text-emerald-700' : 'text-slate-400'}`}
                                                                                                            >
                                                                                                                {
                                                                                                                    after
                                                                                                                }
                                                                                                            </td>
                                                                                                        </tr>
                                                                                                    );
                                                                                                },
                                                                                            )}
                                                                                        </tbody>
                                                                                    </table>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                    </Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Results info + Pagination */}
                            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                                <p className="text-[11px] text-slate-400">
                                    Showing{' '}
                                    <span className="font-medium text-slate-600">
                                        {from}–{to}
                                    </span>{' '}
                                    of{' '}
                                    <span className="font-medium text-slate-600">
                                        {logs.total.toLocaleString()}
                                    </span>{' '}
                                    entries
                                </p>

                                {logs.last_page > 1 && (
                                    <div className="flex items-center gap-2">
                                        {logs.links[0]?.url ? (
                                            <Link
                                                href={logs.links[0].url}
                                                preserveState
                                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
                                            >
                                                <ChevronLeft className="size-3.5" />
                                                Prev
                                            </Link>
                                        ) : (
                                            <span className="inline-flex cursor-not-allowed items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-300">
                                                <ChevronLeft className="size-3.5" />
                                                Prev
                                            </span>
                                        )}

                                        <span className="px-1 text-xs text-slate-500">
                                            Page {logs.current_page} of{' '}
                                            {logs.last_page}
                                        </span>

                                        {logs.links.at(-1)?.url ? (
                                            <Link
                                                href={logs.links.at(-1)!.url!}
                                                preserveState
                                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
                                            >
                                                Next
                                                <ChevronRight className="size-3.5" />
                                            </Link>
                                        ) : (
                                            <span className="inline-flex cursor-not-allowed items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-300">
                                                Next
                                                <ChevronRight className="size-3.5" />
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
