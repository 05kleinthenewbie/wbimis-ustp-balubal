import { Head, Link, router } from '@inertiajs/react';
import {
    Users,
    Search,
    UserX,
    UserCheck,
    ClipboardCheck,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import {
    approvals,
    update,
} from '@/actions/App/Http/Controllers/UserController';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useInitials } from '@/hooks/use-initials';

type UserRow = {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
    department: string | null;
    status: string;
    role: { role_name: string } | null;
    created_at: string;
};

type Props = {
    status?: string | null;
    error?: string | null;
    errors?: Record<string, string>;
    pendingCount: number;
    activeUsers: UserRow[];
    deactivatedUsers: UserRow[];
};

const roleLabels: Record<string, string> = {
    faculty: 'Faculty',
    student: 'Student',
    ict_admin: 'ICT Admin',
};

export default function UsersIndex({
    status,
    error: flashError,
    errors,
    pendingCount,
    activeUsers,
    deactivatedUsers,
}: Props) {
    const error = Object.values(errors ?? {}).join(' ') || flashError;
    const getInitials = useInitials();
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [searchActive, setSearchActive] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [activePage, setActivePage] = useState(1);
    const [deactivatedPage, setDeactivatedPage] = useState(1);
    const usersPerPage = 15;

    function matchesRole(user: UserRow) {
        if (roleFilter === 'all') {
            return true;
        }

        if (roleFilter === 'student') {
            return user.role?.role_name === 'student';
        }

        return user.role?.role_name === 'faculty';
    }

    function deactivateUser(id: number) {
        if (
            confirm(
                'Deactivate this account? They will no longer be able to log in.',
            )
        ) {
            setProcessingId(id);
            router.put(
                update.url(id),
                { status: 'inactive' },
                { onFinish: () => setProcessingId(null) },
            );
        }
    }

    function reactivateUser(id: number) {
        setProcessingId(id);
        router.put(
            update.url(id),
            { status: 'active' },
            { onFinish: () => setProcessingId(null) },
        );
    }

    const filteredDeactivated = deactivatedUsers.filter(matchesRole);

    const filteredActive = activeUsers.filter(matchesRole).filter((user) => {
        const q = searchActive.toLowerCase();

        return (
            user.name.toLowerCase().includes(q) ||
            user.email.toLowerCase().includes(q) ||
            user.department?.toLowerCase().includes(q) ||
            roleLabels[user.role?.role_name ?? '']?.toLowerCase().includes(q)
        );
    });

    const activePageCount = Math.max(
        1,
        Math.ceil(filteredActive.length / usersPerPage),
    );
    const currentActivePage = Math.min(activePage, activePageCount);
    const visibleActive = filteredActive.slice(
        (currentActivePage - 1) * usersPerPage,
        currentActivePage * usersPerPage,
    );

    const deactivatedPageCount = Math.max(
        1,
        Math.ceil(filteredDeactivated.length / usersPerPage),
    );
    const currentDeactivatedPage = Math.min(
        deactivatedPage,
        deactivatedPageCount,
    );
    const visibleDeactivated = filteredDeactivated.slice(
        (currentDeactivatedPage - 1) * usersPerPage,
        currentDeactivatedPage * usersPerPage,
    );

    return (
        <>
            <Head title="User Management" />

            <div className="min-h-full flex-1 bg-slate-50 text-slate-800">
                <div className="relative flex flex-1 flex-col gap-6 overflow-hidden p-4 md:p-6 lg:p-8">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h1 className="text-lg font-semibold text-slate-800">
                                User Management
                            </h1>
                            <p className="text-xs text-slate-500">
                                Approve registrations, deactivate accounts and
                                manage technicians.
                            </p>
                        </div>

                        <Link
                            href={approvals.url()}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:border-ustp-navy/40 hover:text-ustp-navy"
                        >
                            <ClipboardCheck className="size-4" />
                            Pending approvals
                            {pendingCount > 0 && (
                                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-ustp-navy px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                    {pendingCount}
                                </span>
                            )}
                        </Link>
                    </div>

                    {status && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                            {status}
                        </div>
                    )}

                    {error && (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {error}
                        </div>
                    )}

                    <div
                        className="flex flex-wrap gap-2"
                        aria-label="Filter users by role"
                    >
                        {['all', 'faculty', 'student'].map((role) => (
                            <Button
                                key={role}
                                variant={
                                    roleFilter === role ? 'default' : 'outline'
                                }
                                aria-pressed={roleFilter === role}
                                onClick={() => {
                                    setRoleFilter(role);
                                    setActivePage(1);
                                    setDeactivatedPage(1);
                                }}
                                className="capitalize"
                            >
                                {role}
                            </Button>
                        ))}
                    </div>

                    {/* Active Users */}
                    <section className="relative">
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2">
                                <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                                    <Users className="size-4" />
                                </div>

                                <div>
                                    <p className="text-sm font-medium text-slate-600">
                                        Active Users
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {activeUsers.length} user
                                        {activeUsers.length !== 1
                                            ? 's'
                                            : ''}{' '}
                                        registered
                                    </p>
                                </div>
                            </div>

                            <div className="relative w-full max-w-xs">
                                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />

                                <Input
                                    value={searchActive}
                                    onChange={(e) => {
                                        setSearchActive(e.target.value);
                                        setActivePage(1);
                                    }}
                                    placeholder="Search active..."
                                    className="h-9 border-slate-300 bg-white pl-9 text-xs text-slate-800 placeholder:text-slate-400 focus-visible:border-ustp-navy focus-visible:ring-1 focus-visible:ring-ustp-navy/25"
                                />
                            </div>
                        </div>

                        {filteredActive.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
                                <Users className="mb-3 size-8 text-slate-400" />
                                <p className="text-sm text-slate-400">
                                    {searchActive
                                        ? 'No matching active users'
                                        : 'No active users yet.'}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-180 text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200 bg-slate-50">
                                                <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                    Name
                                                </th>
                                                <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                    Email
                                                </th>
                                                <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                    Role
                                                </th>
                                                <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                    Department
                                                </th>
                                                <th className="px-5 py-3.5" />
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {visibleActive.map((user) => (
                                                <tr
                                                    key={user.id}
                                                    className="border-b border-slate-200 transition-colors last:border-0 hover:bg-slate-50"
                                                >
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="size-8 shrink-0 rounded-lg">
                                                                {user.avatar ? (
                                                                    <AvatarImage
                                                                        src={
                                                                            user.avatar
                                                                        }
                                                                        alt={
                                                                            user.name
                                                                        }
                                                                        className="object-cover"
                                                                    />
                                                                ) : null}
                                                                <AvatarFallback className="rounded-lg bg-ustp-navy text-[10px] font-bold text-ustp-gold">
                                                                    {getInitials(
                                                                        user.name,
                                                                    )}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span className="font-medium text-slate-600">
                                                                {user.name}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4 text-xs text-slate-400">
                                                        {user.email}
                                                    </td>
                                                    <td className="px-5 py-4 text-xs text-slate-400">
                                                        {roleLabels[
                                                            user.role
                                                                ?.role_name ??
                                                                ''
                                                        ] ?? '—'}
                                                    </td>
                                                    <td className="px-5 py-4 text-xs text-slate-400">
                                                        {user.department ?? '—'}
                                                    </td>
                                                    <td className="px-5 py-4 text-right">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={
                                                                processingId ===
                                                                user.id
                                                            }
                                                            onClick={() =>
                                                                deactivateUser(
                                                                    user.id,
                                                                )
                                                            }
                                                            className="h-8 border-rose-200 bg-white px-3 text-xs text-rose-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                                                        >
                                                            <UserX className="mr-1 size-3" />
                                                            Deactivate
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {activePageCount > 1 && (
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
                                        <p className="text-[11px] text-slate-400">
                                            Showing {visibleActive.length} of{' '}
                                            {filteredActive.length}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={
                                                    currentActivePage === 1
                                                }
                                                onClick={() =>
                                                    setActivePage((value) =>
                                                        Math.max(1, value - 1),
                                                    )
                                                }
                                                className="h-7 px-2.5 text-[11px]"
                                            >
                                                <ChevronLeft className="size-3.5" />
                                                Prev
                                            </Button>
                                            <span className="text-[11px] text-slate-500">
                                                Page {currentActivePage} of{' '}
                                                {activePageCount}
                                            </span>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={
                                                    currentActivePage ===
                                                    activePageCount
                                                }
                                                onClick={() =>
                                                    setActivePage((value) =>
                                                        Math.min(
                                                            activePageCount,
                                                            value + 1,
                                                        ),
                                                    )
                                                }
                                                className="h-7 px-2.5 text-[11px]"
                                            >
                                                Next
                                                <ChevronRight className="size-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>

                    {/* Deactivated Users */}
                    <section className="relative">
                        <div className="mb-4 flex items-center gap-2">
                            <div className="flex size-8 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                                <UserX className="size-4" />
                            </div>

                            <div>
                                <p className="text-sm font-medium text-slate-600">
                                    Deactivated
                                </p>
                                <p className="text-xs text-slate-500">
                                    {deactivatedUsers.length} account
                                    {deactivatedUsers.length !== 1
                                        ? 's'
                                        : ''}{' '}
                                    cannot log in
                                </p>
                            </div>
                        </div>

                        {filteredDeactivated.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
                                <UserX className="mb-3 size-8 text-slate-400" />
                                <p className="text-sm text-slate-400">
                                    No deactivated accounts.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-180 text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200 bg-slate-50">
                                                <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                    Name
                                                </th>
                                                <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                    Email
                                                </th>
                                                <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                    Role
                                                </th>
                                                <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                    Department
                                                </th>
                                                <th className="px-5 py-3.5" />
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {visibleDeactivated.map((user) => (
                                                <tr
                                                    key={user.id}
                                                    className="border-b border-slate-200 transition-colors last:border-0 hover:bg-slate-50"
                                                >
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="size-8 shrink-0 rounded-lg">
                                                                {user.avatar ? (
                                                                    <AvatarImage
                                                                        src={
                                                                            user.avatar
                                                                        }
                                                                        alt={
                                                                            user.name
                                                                        }
                                                                        className="object-cover"
                                                                    />
                                                                ) : null}
                                                                <AvatarFallback className="rounded-lg bg-slate-200 text-[10px] font-bold text-slate-500">
                                                                    {getInitials(
                                                                        user.name,
                                                                    )}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span className="font-medium text-slate-600">
                                                                {user.name}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4 text-xs text-slate-400">
                                                        {user.email}
                                                    </td>
                                                    <td className="px-5 py-4 text-xs text-slate-400">
                                                        {roleLabels[
                                                            user.role
                                                                ?.role_name ??
                                                                ''
                                                        ] ?? '—'}
                                                    </td>
                                                    <td className="px-5 py-4 text-xs text-slate-400">
                                                        {user.department ?? '—'}
                                                    </td>
                                                    <td className="px-5 py-4 text-right">
                                                        <Button
                                                            size="sm"
                                                            disabled={
                                                                processingId ===
                                                                user.id
                                                            }
                                                            onClick={() =>
                                                                reactivateUser(
                                                                    user.id,
                                                                )
                                                            }
                                                            className="h-8 bg-emerald-600 px-3 text-xs text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700"
                                                        >
                                                            <UserCheck className="mr-1 size-3" />
                                                            Reactivate
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {deactivatedPageCount > 1 && (
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
                                        <p className="text-[11px] text-slate-400">
                                            Showing {visibleDeactivated.length}{' '}
                                            of {filteredDeactivated.length}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={
                                                    currentDeactivatedPage === 1
                                                }
                                                onClick={() =>
                                                    setDeactivatedPage(
                                                        (value) =>
                                                            Math.max(
                                                                1,
                                                                value - 1,
                                                            ),
                                                    )
                                                }
                                                className="h-7 px-2.5 text-[11px]"
                                            >
                                                <ChevronLeft className="size-3.5" />
                                                Prev
                                            </Button>
                                            <span className="text-[11px] text-slate-500">
                                                Page {currentDeactivatedPage} of{' '}
                                                {deactivatedPageCount}
                                            </span>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={
                                                    currentDeactivatedPage ===
                                                    deactivatedPageCount
                                                }
                                                onClick={() =>
                                                    setDeactivatedPage(
                                                        (value) =>
                                                            Math.min(
                                                                deactivatedPageCount,
                                                                value + 1,
                                                            ),
                                                    )
                                                }
                                                className="h-7 px-2.5 text-[11px]"
                                            >
                                                Next
                                                <ChevronRight className="size-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </>
    );
}
