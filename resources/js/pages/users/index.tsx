import { Head, router } from '@inertiajs/react';
import { UserCheck, Users, Search, UserX, X } from 'lucide-react';
import { useState } from 'react';
import { bulk, update } from '@/actions/App/Http/Controllers/UserController';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
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
    cor_url: string | null;
    approval_block_reason: string | null;
    employment_document_url: string | null;
    employment_type: string | null;
    employee_id_number: string | null;
    position: string | null;
    contact_no: string | null;
    gender: string | null;
    birth_date: string | null;
    home_address: string | null;
    cor_verification_status: 'matched' | 'mismatch' | 'manual_review' | null;
    cor_checked_at: string | null;
    cor_verification_details: {
        message: string;
        checks: Record<
            string,
            { expected: string; actual: string; matches: boolean }
        >;
    } | null;
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

const corCheckLabels: Record<string, string> = {
    name: 'Name',
    student_id: 'ID number',
    program: 'Program',
    school: 'School',
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
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [roleFilter, setRoleFilter] = useState('all');
    const [reviewUser, setReviewUser] = useState<UserRow | null>(null);
    const [corPreviewUser, setCorPreviewUser] = useState<UserRow | null>(null);

    function matchesRole(user: UserRow) {
        if (roleFilter === 'all') {
            return true;
        }

        if (roleFilter === 'student') {
            return user.role?.role_name === 'student';
        }

        return (
            user.role?.role_name === 'faculty_staff' &&
            user.employment_type ===
                (roleFilter === 'faculty' ? 'teaching' : 'non_teaching')
        );
    }

    function reviewDecision(status: 'active' | 'rejected') {
        if (
            !reviewUser ||
            (status === 'active' && reviewUser.approval_block_reason)
        ) {
            return;
        }

        setProcessingId(reviewUser.id);
        router.put(
            update.url(reviewUser.id),
            { status },
            {
                preserveScroll: true,
                onSuccess: () => setReviewUser(null),
                onFinish: () => setProcessingId(null),
            },
        );
    }

    function runBulk(action: 'verify' | 'approve' | 'reject', ids: number[]) {
        if (ids.length === 0 || bulkProcessing) {
            return;
        }

        if (
            action === 'approve' &&
            pendingUsers.some(
                (user) => ids.includes(user.id) && user.approval_block_reason,
            )
        ) {
            return;
        }

        setBulkProcessing(true);
        router.post(
            bulk.url(),
            { action, ids },
            {
                preserveScroll: true,
                onSuccess: () => setSelectedIds([]),
                onFinish: () => setBulkProcessing(false),
            },
        );
    }

    function approveUser(user: UserRow) {
        if (user.approval_block_reason) {
            return;
        }

        setProcessingId(user.id);
        router.put(
            update.url(user.id),
            { status: 'active' },
            { onFinish: () => setProcessingId(null) },
        );
    }

    function rejectUser(id: number) {
        setProcessingId(id);
        router.put(
            update.url(id),
            { status: 'rejected' },
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

    const selectedPending = filteredPending.filter((user) =>
        selectedIds.includes(user.id),
    );
    const selectedStudents = selectedPending.filter(
        (user) => user.role?.role_name === 'student',
    );
    const selectionHasBlockedApproval = selectedPending.some((user) =>
        Boolean(user.approval_block_reason),
    );
    const allSelected =
        filteredPending.length > 0 &&
        selectedPending.length === filteredPending.length;

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

                    {/* Active Users */}
                    <div
                        className="flex flex-wrap gap-2"
                        aria-label="Filter users by role"
                    >
                        {['all', 'faculty', 'staff', 'student'].map((role) => (
                            <Button
                                key={role}
                                variant={
                                    roleFilter === role ? 'default' : 'outline'
                                }
                                aria-pressed={roleFilter === role}
                                onClick={() => {
                                    setRoleFilter(role);
                                    setSelectedIds([]);
                                }}
                                className="capitalize"
                            >
                                {role}
                            </Button>
                        ))}
                    </div>
                    {filteredPending.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                            <span>
                                <strong>{filteredPending.length}</strong>{' '}
                                registration(s) waiting for verification. Review
                                their details and uploaded documents before
                                approval.
                            </span>
                            <Button
                                variant="outline"
                                onClick={() =>
                                    document
                                        .getElementById('pending-verification')
                                        ?.scrollIntoView({ behavior: 'smooth' })
                                }
                            >
                                Review registrations
                            </Button>
                        </div>
                    )}
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
                                                <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                    Status
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
                                                    <td className="px-5 py-4">
                                                        <Badge
                                                            variant="outline"
                                                            className="rounded-md border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 capitalize"
                                                        >
                                                            {user.status}
                                                        </Badge>
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

                    {/* Pending Approval */}
                    <section
                        id="pending-verification"
                        className="relative scroll-mt-6"
                    >
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2">
                                <div className="flex size-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                                    <UserCheck className="size-4" />
                                </div>

                                <div>
                                    <p className="text-sm font-medium text-slate-600">
                                        For Verification
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {pendingUsers.length} account
                                        {pendingUsers.length !== 1
                                            ? 's'
                                            : ''}{' '}
                                        awaiting review
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

                        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
                            <label className="flex items-center gap-2 text-sm">
                                <Checkbox
                                    aria-label="Select all visible pending accounts"
                                    checked={
                                        allSelected
                                            ? true
                                            : selectedPending.length > 0
                                              ? 'indeterminate'
                                              : false
                                    }
                                    disabled={
                                        bulkProcessing || processingId !== null
                                    }
                                    onCheckedChange={(checked) =>
                                        setSelectedIds(
                                            checked === true
                                                ? filteredPending.map(
                                                      (user) => user.id,
                                                  )
                                                : [],
                                        )
                                    }
                                />
                                Select all{' '}
                                {searchPending ? 'matching' : 'pending'} (
                                {filteredPending.length})
                            </label>
                            <span className="text-xs text-slate-500">
                                {selectedPending.length} selected
                            </span>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={
                                    bulkProcessing ||
                                    processingId !== null ||
                                    selectedStudents.length === 0
                                }
                                onClick={() =>
                                    runBulk(
                                        'verify',
                                        selectedStudents.map((user) => user.id),
                                    )
                                }
                            >
                                Verify selected documents
                            </Button>
                            <Button
                                size="sm"
                                disabled={
                                    bulkProcessing ||
                                    processingId !== null ||
                                    selectedPending.length === 0 ||
                                    selectionHasBlockedApproval
                                }
                                title={
                                    selectionHasBlockedApproval
                                        ? 'Deselect students with missing IDs/CORs or mismatched details before approving.'
                                        : undefined
                                }
                                onClick={() =>
                                    runBulk(
                                        'approve',
                                        selectedPending.map((user) => user.id),
                                    )
                                }
                            >
                                Approve selected
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={
                                    bulkProcessing ||
                                    processingId !== null ||
                                    selectedPending.length === 0
                                }
                                onClick={() =>
                                    runBulk(
                                        'reject',
                                        selectedPending.map((user) => user.id),
                                    )
                                }
                            >
                                Reject selected
                            </Button>
                            <p
                                className="w-full text-xs text-slate-500"
                                aria-live="polite"
                            >
                                {bulkProcessing
                                    ? 'Processing selected accounts…'
                                    : 'Select all to verify, approve, or reject all visible pending accounts. Up to 500 per action. Student ID or COR matching checks name, ID number, program, and school (USTP) only. Students with missing documents or mismatched details cannot be approved.'}
                            </p>
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
                                                <th className="px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                    Registered
                                                </th>
                                                <th className="px-5 py-3.5 text-left text-xs text-slate-500">
                                                    ID / COR checks
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
                                                            <Checkbox
                                                                aria-label={`Select ${user.name}`}
                                                                checked={selectedIds.includes(
                                                                    user.id,
                                                                )}
                                                                disabled={
                                                                    bulkProcessing ||
                                                                    processingId !==
                                                                        null
                                                                }
                                                                onCheckedChange={(
                                                                    checked,
                                                                ) =>
                                                                    setSelectedIds(
                                                                        (
                                                                            ids,
                                                                        ) =>
                                                                            checked ===
                                                                            true
                                                                                ? [
                                                                                      ...ids,
                                                                                      user.id,
                                                                                  ]
                                                                                : ids.filter(
                                                                                      (
                                                                                          id,
                                                                                      ) =>
                                                                                          id !==
                                                                                          user.id,
                                                                                  ),
                                                                    )
                                                                }
                                                            />
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
                                                    <td className="px-5 py-4 text-xs text-slate-400">
                                                        {new Date(
                                                            user.created_at,
                                                        ).toLocaleDateString()}
                                                    </td>
                                                    <td className="max-w-xs px-5 py-4 text-xs">
                                                        {user.role
                                                            ?.role_name ===
                                                        'student' ? (
                                                            <div className="flex flex-col gap-2">
                                                                <Badge
                                                                    variant="outline"
                                                                    className={
                                                                        user.cor_verification_status ===
                                                                        'matched'
                                                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                                            : user.cor_verification_status ===
                                                                                'mismatch'
                                                                              ? 'border-rose-200 bg-rose-50 text-rose-700'
                                                                              : user.cor_verification_status ===
                                                                                  'manual_review'
                                                                                ? 'border-amber-200 bg-amber-50 text-amber-700'
                                                                                : 'border-slate-200 bg-slate-50 text-slate-500'
                                                                    }
                                                                >
                                                                    {user.cor_verification_status ===
                                                                    'matched'
                                                                        ? 'Details match'
                                                                        : user.cor_verification_status ===
                                                                            'mismatch'
                                                                          ? 'Details mismatch'
                                                                          : user.cor_verification_status ===
                                                                              'manual_review'
                                                                            ? 'Manual review needed'
                                                                            : 'Not checked'}
                                                                </Badge>
                                                                {!user.cor_checked_at && (
                                                                    <span>
                                                                        Not
                                                                        checked
                                                                        yet
                                                                    </span>
                                                                )}
                                                                {user.cor_checked_at && (
                                                                    <span className="text-slate-500">
                                                                        Checked{' '}
                                                                        {new Date(
                                                                            user.cor_checked_at,
                                                                        ).toLocaleString()}
                                                                    </span>
                                                                )}
                                                                {user.cor_verification_details && (
                                                                    <details>
                                                                        <summary className="cursor-pointer">
                                                                            View
                                                                            results
                                                                        </summary>
                                                                        <p className="py-2">
                                                                            {
                                                                                user
                                                                                    .cor_verification_details
                                                                                    .message
                                                                            }
                                                                        </p>
                                                                        {Object.entries(
                                                                            user
                                                                                .cor_verification_details
                                                                                .checks,
                                                                        )
                                                                            .filter(
                                                                                ([
                                                                                    field,
                                                                                ]) =>
                                                                                    field in
                                                                                    corCheckLabels,
                                                                            )
                                                                            .map(
                                                                                ([
                                                                                    field,
                                                                                    check,
                                                                                ]) => (
                                                                                    <p
                                                                                        key={
                                                                                            field
                                                                                        }
                                                                                        className="py-1"
                                                                                    >
                                                                                        {check.matches
                                                                                            ? 'Match'
                                                                                            : 'Review'}{' '}
                                                                                        —{' '}
                                                                                        {
                                                                                            corCheckLabels[
                                                                                                field
                                                                                            ]
                                                                                        }

                                                                                        :{' '}
                                                                                        {check.actual ||
                                                                                            'Not found'}{' '}
                                                                                        (expected:{' '}
                                                                                        {
                                                                                            check.expected
                                                                                        }

                                                                                        )
                                                                                    </p>
                                                                                ),
                                                                            )}
                                                                    </details>
                                                                )}
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    disabled={
                                                                        bulkProcessing ||
                                                                        processingId !==
                                                                            null
                                                                    }
                                                                    onClick={() =>
                                                                        runBulk(
                                                                            'verify',
                                                                            [
                                                                                user.id,
                                                                            ],
                                                                        )
                                                                    }
                                                                >
                                                                    Verify ID /
                                                                    COR
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            'Not applicable'
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {user.role
                                                                ?.role_name ===
                                                                'faculty_staff' && (
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
                                                                            [
                                                                                'Gender',
                                                                                user.gender,
                                                                            ],
                                                                            [
                                                                                'Birth date',
                                                                                user.birth_date?.split(
                                                                                    'T',
                                                                                )[0],
                                                                            ],
                                                                            [
                                                                                'Home address',
                                                                                user.home_address,
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
                                                            )}
                                                            {user.role
                                                                ?.role_name ===
                                                                'faculty_staff' && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() =>
                                                                        setReviewUser(
                                                                            user,
                                                                        )
                                                                    }
                                                                >
                                                                    Verify
                                                                </Button>
                                                            )}
                                                            {user.cor_url ? (
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() =>
                                                                        setCorPreviewUser(
                                                                            user,
                                                                        )
                                                                    }
                                                                    className="rounded-md border border-sky-200 bg-white px-3 py-1.5 text-xs font-medium text-sky-700 transition-colors hover:border-sky-300 hover:bg-sky-50"
                                                                >
                                                                    View ID /
                                                                    COR
                                                                </Button>
                                                            ) : (
                                                                user.role
                                                                    ?.role_name ===
                                                                    'student' && (
                                                                    <span className="text-[11px] font-medium text-rose-600">
                                                                        ID / COR
                                                                        missing
                                                                    </span>
                                                                )
                                                            )}

                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                disabled={
                                                                    processingId ===
                                                                    user.id
                                                                }
                                                                onClick={() =>
                                                                    rejectUser(
                                                                        user.id,
                                                                    )
                                                                }
                                                                className="h-8 border-rose-200 bg-white px-3 text-xs text-rose-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                                                            >
                                                                <X className="mr-1 size-3" />
                                                                Reject
                                                            </Button>

                                                            <Button
                                                                size="sm"
                                                                disabled={
                                                                    processingId !==
                                                                        null ||
                                                                    bulkProcessing ||
                                                                    Boolean(
                                                                        user.approval_block_reason,
                                                                    )
                                                                }
                                                                title={
                                                                    user.approval_block_reason ??
                                                                    undefined
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
                                                        {user.approval_block_reason && (
                                                            <p className="mt-2 ml-auto max-w-xs text-xs text-rose-600">
                                                                {
                                                                    user.approval_block_reason
                                                                }
                                                            </p>
                                                        )}
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
                    <section className="rounded-2xl border border-border bg-background p-5">
                        <h2 className="font-semibold">
                            Rejected registrations (
                            {rejectedUsers.filter(matchesRole).length})
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Registrations that were not approved. Return an
                            application to verification for another review.
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
                                        Return to verification
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
                open={corPreviewUser !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setCorPreviewUser(null);
                    }
                }}
            >
                <DialogContent className="flex h-[85dvh] flex-col sm:max-w-5xl">
                    <DialogHeader>
                        <DialogTitle>
                            Student ID / Certificate of Registration
                        </DialogTitle>
                        <DialogDescription>
                            Review {corPreviewUser?.name}’s student ID or COR
                            within the portal.
                        </DialogDescription>
                    </DialogHeader>
                    {corPreviewUser?.cor_url && (
                        <iframe
                            src={`${corPreviewUser.cor_url}#toolbar=0&navpanes=0`}
                            title={`${corPreviewUser.name} — Student ID or COR`}
                            className="min-h-0 w-full flex-1 rounded-lg border border-slate-200 bg-slate-50"
                        />
                    )}
                </DialogContent>
            </Dialog>
            <Dialog
                open={reviewUser !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setReviewUser(null);
                    }
                }}
            >
                <DialogContent className="max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Verify registration</DialogTitle>
                        <DialogDescription>
                            Review the applicant’s details and employment
                            document before deciding.
                        </DialogDescription>
                    </DialogHeader>
                    {reviewUser && (
                        <>
                            <dl className="grid grid-cols-2 gap-4 text-sm">
                                {[
                                    ['Name', reviewUser.name],
                                    ['Email', reviewUser.email],
                                    [
                                        'Role',
                                        reviewUser.employment_type ===
                                        'teaching'
                                            ? 'Faculty'
                                            : 'Staff',
                                    ],
                                    [
                                        'Employee ID',
                                        reviewUser.employee_id_number,
                                    ],
                                    ['Position', reviewUser.position],
                                    ['Department', reviewUser.department],
                                    ['Contact', reviewUser.contact_no],
                                    ['Gender', reviewUser.gender],
                                    [
                                        'Birth date',
                                        reviewUser.birth_date?.split('T')[0],
                                    ],
                                    ['Home address', reviewUser.home_address],
                                ].map(([label, value]) => (
                                    <div key={label}>
                                        <dt className="text-muted-foreground">
                                            {label}
                                        </dt>
                                        <dd className="font-medium wrap-break-word">
                                            {value ?? '—'}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                            {reviewUser.employment_document_url ? (
                                <a
                                    href={reviewUser.employment_document_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-medium text-primary underline"
                                >
                                    Open Employee ID / Certificate of Employment
                                </a>
                            ) : (
                                <p className="text-sm text-destructive">
                                    No employment document submitted.
                                </p>
                            )}
                            {error && (
                                <p className="text-sm text-destructive">
                                    {error}
                                </p>
                            )}
                            <DialogFooter>
                                <Button
                                    variant="destructive"
                                    disabled={processingId !== null}
                                    onClick={() => reviewDecision('rejected')}
                                >
                                    Reject registration
                                </Button>
                                <Button
                                    disabled={
                                        processingId !== null ||
                                        Boolean(
                                            reviewUser.approval_block_reason,
                                        )
                                    }
                                    onClick={() => reviewDecision('active')}
                                >
                                    Approve account
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
