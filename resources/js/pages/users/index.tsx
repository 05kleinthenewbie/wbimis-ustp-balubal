import { Head, router } from '@inertiajs/react';
import { UserCheck, Users, Search, UserX, X } from 'lucide-react';
import { useState } from 'react';
import { update } from '@/actions/App/Http/Controllers/UserController';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useInitials } from '@/hooks/use-initials';

type UserRow = {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
    department: string | null;
    status: string;
    year_level: string | null;
    role: { role_name: string } | null;
    created_at: string;
    employment_document_url: string | null;
    employment_type: string | null;
    employee_id_number: string | null;
    position: string | null;
    contact_no: string | null;
    gender: string | null;
    birth_date: string | null;
    home_address: string | null;
};

type Props = {
    status?: string | null;
    error?: string | null;
    errors?: Record<string, string>;
    pendingUsers: UserRow[];
    activeUsers: UserRow[];
    deactivatedUsers: UserRow[];
    rejectedUsers: UserRow[];
};

const roleLabels: Record<string, string> = {
    faculty_staff: 'Faculty',
    student: 'Student',
    ict_admin: 'ICT Admin',
};

export default function UsersIndex({
    status,
    error: flashError,
    errors,
    pendingUsers,
    activeUsers,
    deactivatedUsers,
    rejectedUsers,
}: Props) {
    const error = Object.values(errors ?? {}).join(' ') || flashError;
    const getInitials = useInitials();
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [searchPending, setSearchPending] = useState('');
    const [searchActive, setSearchActive] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [rejectUserRow, setRejectUserRow] = useState<UserRow | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    function matchesRole(user: UserRow) {
        if (roleFilter === 'all') {
            return true;
        }

        if (roleFilter === 'student') {
            return user.role?.role_name === 'student';
        }

        return user.role?.role_name === 'faculty_staff';
    }

    function approveUser(user: UserRow) {
        setProcessingId(user.id);
        router.put(
            update.url(user.id),
            { status: 'active' },
            { onFinish: () => setProcessingId(null) },
        );
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

    function confirmReject() {
        if (!rejectUserRow || rejectionReason.trim() === '') {
            return;
        }

        setProcessingId(rejectUserRow.id);
        router.put(
            update.url(rejectUserRow.id),
            { status: 'rejected', reason: rejectionReason },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setRejectUserRow(null);
                    setRejectionReason('');
                },
                onFinish: () => setProcessingId(null),
            },
        );
    }

    const filteredPending = pendingUsers.filter(matchesRole).filter((user) => {
        const q = searchPending.toLowerCase();

        return (
            user.name.toLowerCase().includes(q) ||
            user.email.toLowerCase().includes(q) ||
            user.department?.toLowerCase().includes(q) ||
            roleLabels[user.role?.role_name ?? '']?.toLowerCase().includes(q)
        );
    });

    const filteredActive = activeUsers.filter(matchesRole).filter((user) => {
        const q = searchActive.toLowerCase();

        return (
            user.name.toLowerCase().includes(q) ||
            user.email.toLowerCase().includes(q) ||
            user.department?.toLowerCase().includes(q) ||
            roleLabels[user.role?.role_name ?? '']?.toLowerCase().includes(q)
        );
    });

    return (
        <>
            <Head title="User Management" />

            <div className="min-h-full flex-1 bg-slate-50 text-slate-800">
                <div className="relative flex flex-1 flex-col gap-6 overflow-hidden p-4 md:p-6 lg:p-8">
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
                                onClick={() => setRoleFilter(role)}
                                className="capitalize"
                            >
                                {role}
                            </Button>
                        ))}
                    </div>

                    {/* Pending Approvals */}
                    <section className="relative">
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2">
                                <div className="flex size-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                                    <UserCheck className="size-4" />
                                </div>

                                <div>
                                    <p className="text-sm font-medium text-slate-600">
                                        Pending Approvals
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {pendingUsers.length} account
                                        {pendingUsers.length !== 1
                                            ? 's'
                                            : ''}{' '}
                                        awaiting approval
                                    </p>
                                </div>
                            </div>

                            <div className="relative w-full max-w-xs">
                                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />

                                <Input
                                    value={searchPending}
                                    onChange={(e) =>
                                        setSearchPending(e.target.value)
                                    }
                                    placeholder="Search pending..."
                                    className="h-9 border-slate-300 bg-white pl-9 text-xs text-slate-800 placeholder:text-slate-400 focus-visible:border-ustp-navy focus-visible:ring-1 focus-visible:ring-ustp-navy/25"
                                />
                            </div>
                        </div>

                        {filteredPending.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
                                <UserCheck className="mb-3 size-8 text-slate-400" />
                                <p className="text-sm text-slate-400">
                                    {searchPending
                                        ? 'No matching pending users'
                                        : 'No accounts awaiting approval.'}
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
                                            {filteredPending.map((user) => (
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
                                                        <div className="flex items-center justify-end gap-2">
                                                            <details className="max-w-xs text-left text-xs text-muted-foreground">
                                                                <summary className="cursor-pointer font-medium">
                                                                    Employment
                                                                    details
                                                                </summary>
                                                                <dl className="mt-2 grid gap-1">
                                                                    {[
                                                                        [
                                                                            'Employee ID',
                                                                            user.employee_id_number,
                                                                        ],
                                                                        [
                                                                            'Position',
                                                                            user.position,
                                                                        ],
                                                                        [
                                                                            'Contact',
                                                                            user.contact_no,
                                                                        ],
                                                                    ].map(
                                                                        ([
                                                                            label,
                                                                            value,
                                                                        ]) => (
                                                                            <div
                                                                                key={
                                                                                    label
                                                                                }
                                                                            >
                                                                                <dt className="font-medium">
                                                                                    {
                                                                                        label
                                                                                    }
                                                                                </dt>
                                                                                <dd>
                                                                                    {value ??
                                                                                        '—'}
                                                                                </dd>
                                                                            </div>
                                                                        ),
                                                                    )}
                                                                </dl>
                                                                {user.employment_document_url ? (
                                                                    <a
                                                                        href={
                                                                            user.employment_document_url
                                                                        }
                                                                        className="mt-2 inline-block font-medium text-sky-700"
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                    >
                                                                        View
                                                                        employment
                                                                        document
                                                                    </a>
                                                                ) : (
                                                                    <p>
                                                                        Employment
                                                                        document
                                                                        not
                                                                        submitted
                                                                    </p>
                                                                )}
                                                            </details>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                disabled={
                                                                    processingId !==
                                                                    null
                                                                }
                                                                onClick={() => {
                                                                    setRejectUserRow(
                                                                        user,
                                                                    );
                                                                    setRejectionReason(
                                                                        '',
                                                                    );
                                                                }}
                                                                className="h-8 border-rose-200 bg-white px-3 text-xs text-rose-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                                                            >
                                                                <X className="mr-1 size-3" />{' '}
                                                                Reject
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                disabled={
                                                                    processingId !==
                                                                    null
                                                                }
                                                                onClick={() =>
                                                                    approveUser(
                                                                        user,
                                                                    )
                                                                }
                                                                className="h-8 bg-ustp-navy px-3 text-xs text-white shadow-lg shadow-ustp-navy/20 hover:bg-ustp-navy-dark"
                                                            >
                                                                Approve
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </section>

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
                                    onChange={(e) =>
                                        setSearchActive(e.target.value)
                                    }
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
                                            {filteredActive.map((user) => (
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

                        {deactivatedUsers.filter(matchesRole).length === 0 ? (
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
                                            {deactivatedUsers
                                                .filter(matchesRole)
                                                .map((user) => (
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
                                                            {user.department ??
                                                                '—'}
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
                            </div>
                        )}
                    </section>

                    {/* Rejected Registrations */}
                    <section className="rounded-2xl border border-border bg-background p-5">
                        <h2 className="font-semibold">
                            Rejected registrations (
                            {rejectedUsers.filter(matchesRole).length})
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Registrations that were not approved. Return an
                            application to pending for another review.
                        </p>
                        <div className="mt-4 grid gap-3">
                            {rejectedUsers.filter(matchesRole).map((user) => (
                                <div
                                    key={user.id}
                                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                                >
                                    <div>
                                        <p className="font-medium">
                                            {user.name}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {user.email}
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        disabled={processingId === user.id}
                                        onClick={() => {
                                            setProcessingId(user.id);
                                            router.put(
                                                update.url(user.id),
                                                { status: 'pending' },
                                                {
                                                    preserveScroll: true,
                                                    onFinish: () =>
                                                        setProcessingId(null),
                                                },
                                            );
                                        }}
                                    >
                                        Return to pending
                                    </Button>
                                </div>
                            ))}
                            {rejectedUsers.filter(matchesRole).length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    No rejected registrations.
                                </p>
                            )}
                        </div>
                    </section>
                </div>
            </div>

            <Dialog
                open={rejectUserRow !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setRejectUserRow(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject registration?</DialogTitle>
                        <DialogDescription>
                            Reject {rejectUserRow?.name}’s registration. The
                            applicant can register again.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2">
                        <Label htmlFor="rejection-reason">
                            Rejection reason (required)
                        </Label>
                        <textarea
                            id="rejection-reason"
                            value={rejectionReason}
                            onChange={(event) =>
                                setRejectionReason(event.target.value)
                            }
                            maxLength={2000}
                            className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setRejectUserRow(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={
                                processingId !== null ||
                                rejectionReason.trim() === ''
                            }
                            onClick={confirmReject}
                        >
                            {processingId !== null && <Spinner />}
                            Reject registration
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
