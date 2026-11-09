import { Form, Head, Link, router } from '@inertiajs/react';
import {
    ArrowUpRight,
    CheckCircle2,
    Clock3,
    FileText,
    UserCheck,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { document } from '@/actions/App/Http/Controllers/StudentApprovalController';
import {
    approve,
    bulk,
    index,
    reject,
} from '@/actions/App/Http/Controllers/UserController';
import InputError from '@/components/input-error';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useInitials } from '@/hooks/use-initials';

type PendingUser = {
    id: number;
    name: string;
    email: string;
    department: string | null;
    role: { role_name: string } | null;
    created_at: string;
    is_student: boolean;
    has_cor: boolean;
    has_student_id: boolean;
    review_notes: string | null;
};

type Props = {
    status?: string | null;
    error?: string | null;
    pendingUsers: PendingUser[];
};

const roleLabels: Record<string, string> = {
    faculty_staff: 'Faculty',
    student: 'Student',
    ict_admin: 'ICT Admin',
};

export default function UserApprovals({ status, error, pendingUsers }: Props) {
    const getInitials = useInitials();
    const [selected, setSelected] = useState<number[]>([]);
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [rejecting, setRejecting] = useState<PendingUser | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [rejectProcessing, setRejectProcessing] = useState(false);

    function toggle(id: number, checked: boolean) {
        setSelected((current) =>
            checked
                ? [...new Set([...current, id])]
                : current.filter((value) => value !== id),
        );
    }

    function approveUser(user: PendingUser) {
        setProcessingId(user.id);
        router.patch(
            approve.url(user.id),
            {},
            {
                preserveScroll: true,
                onFinish: () => setProcessingId(null),
            },
        );
    }

    function openReject(user: PendingUser) {
        setRejecting(user);
        setRejectReason('');
    }

    function submitReject() {
        if (rejecting === null) {
            return;
        }

        setRejectProcessing(true);
        router.patch(
            reject.url(rejecting.id),
            { reason: rejectReason },
            {
                preserveScroll: true,
                onSuccess: () => setRejecting(null),
                onFinish: () => setRejectProcessing(false),
            },
        );
    }

    const rejectNeedsReason = rejecting?.is_student === true;

    return (
        <>
            <Head title="Pending Approvals" />

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

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                                <Clock3 className="size-4" />
                            </div>

                            <div>
                                <p className="text-sm font-medium text-slate-600">
                                    Pending Approvals
                                </p>
                                <p className="text-xs text-slate-500">
                                    {pendingUsers.length} account
                                    {pendingUsers.length !== 1 ? 's' : ''}{' '}
                                    awaiting approval
                                </p>
                            </div>
                        </div>

                        <Link
                            href={index.url()}
                            className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
                        >
                            <UserCheck className="size-3.5" />
                            User Management
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 items-center gap-1 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-700 sm:flex sm:gap-2">
                        <CheckCircle2 className="size-4 shrink-0 text-amber-600" />
                        <span>
                            Approving grants the account access to the
                            application; rejecting blocks the registration until
                            the applicant registers again. Student applications
                            require a rejection reason and can be reviewed from
                            the uploaded COR.
                        </span>
                    </div>

                    {pendingUsers.length === 0 ? (
                        <div className="relative flex min-h-90 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 text-center">
                            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                                <CheckCircle2 className="size-6" />
                            </div>

                            <h2 className="text-sm font-medium text-slate-800">
                                No pending approvals
                            </h2>

                            <p className="mt-1.5 max-w-sm text-xs leading-5 text-slate-400">
                                All registered accounts have been reviewed.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <Form
                                action={bulk.url()}
                                method="patch"
                                options={{ preserveScroll: true }}
                                onSuccess={() => setSelected([])}
                                className="space-y-3"
                            >
                                {({ processing, errors }) => (
                                    <>
                                        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-5 py-3">
                                            <span className="text-xs font-semibold text-slate-500">
                                                {selected.length} selected
                                            </span>
                                            <InputError
                                                message={
                                                    errors.ids ??
                                                    errors.decision ??
                                                    errors.approve ??
                                                    errors.reason
                                                }
                                            />
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                disabled={processing}
                                                onClick={() =>
                                                    setSelected(
                                                        selected.length ===
                                                            pendingUsers.length
                                                            ? []
                                                            : pendingUsers.map(
                                                                  (user) =>
                                                                      user.id,
                                                              ),
                                                    )
                                                }
                                            >
                                                {selected.length ===
                                                pendingUsers.length
                                                    ? 'Clear selection'
                                                    : 'Select all'}
                                            </Button>
                                            <div className="ml-auto flex flex-wrap items-center gap-2">
                                                <Label
                                                    htmlFor="bulk-reason"
                                                    className="text-xs text-slate-500"
                                                >
                                                    Shared reason
                                                </Label>
                                                <Textarea
                                                    id="bulk-reason"
                                                    name="reason"
                                                    maxLength={2000}
                                                    placeholder="Required when rejecting students"
                                                    className="h-8 min-h-8 min-w-56 py-1.5 text-xs"
                                                />
                                                <Button
                                                    type="submit"
                                                    size="sm"
                                                    name="decision"
                                                    value="approved"
                                                    disabled={
                                                        processing ||
                                                        selected.length === 0
                                                    }
                                                    className="h-8 bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
                                                >
                                                    <CheckCircle2 className="size-3.5" />
                                                    Approve selected
                                                </Button>
                                                <Button
                                                    type="submit"
                                                    size="sm"
                                                    name="decision"
                                                    value="rejected"
                                                    disabled={
                                                        processing ||
                                                        selected.length === 0
                                                    }
                                                    className="h-8 border border-rose-200 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                                                >
                                                    Reject selected
                                                </Button>
                                            </div>
                                            {selected.map((id) => (
                                                <input
                                                    key={id}
                                                    type="hidden"
                                                    name="ids[]"
                                                    value={id}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </Form>

                            <div className="overflow-x-auto">
                                <table className="w-full min-w-180 text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50">
                                            {[
                                                '',
                                                'Name',
                                                'Email',
                                                'Role',
                                                'Registered',
                                                'Actions',
                                            ].map((heading, index) => (
                                                <th
                                                    key={heading || 'select'}
                                                    className={`px-5 py-3.5 text-left text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase ${index === 5 ? 'text-right' : ''}`}
                                                >
                                                    {heading}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {pendingUsers.map((user) => (
                                            <tr
                                                key={user.id}
                                                className="border-b border-slate-200 transition-colors last:border-0 hover:bg-slate-50"
                                            >
                                                <td className="px-5 py-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selected.includes(
                                                            user.id,
                                                        )}
                                                        onChange={(event) =>
                                                            toggle(
                                                                user.id,
                                                                event.target
                                                                    .checked,
                                                            )
                                                        }
                                                        className="size-4 accent-ustp-navy"
                                                        aria-label={`Select ${user.name}`}
                                                    />
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="size-8 shrink-0 rounded-lg">
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
                                                    <p>{user.email}</p>
                                                    <p className="mt-0.5 text-[10px] text-slate-300">
                                                        {user.department ?? '—'}
                                                    </p>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <span className="rounded-full border border-ustp-navy/10 bg-ustp-navy/5 px-2.5 py-0.5 text-[10px] font-semibold text-ustp-navy">
                                                        {roleLabels[
                                                            user.role
                                                                ?.role_name ??
                                                                ''
                                                        ] ?? 'Member'}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4 text-xs text-slate-400">
                                                    {new Date(
                                                        user.created_at,
                                                    ).toLocaleDateString(
                                                        'en-US',
                                                        {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                        },
                                                    )}
                                                </td>

                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {user.has_cor && (
                                                            <a
                                                                href={document.url(
                                                                    {
                                                                        user: user.id,
                                                                        type: 'cor',
                                                                    },
                                                                )}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
                                                            >
                                                                <FileText className="size-3.5" />
                                                                View COR
                                                            </a>
                                                        )}

                                                        <Button
                                                            size="sm"
                                                            disabled={
                                                                processingId ===
                                                                user.id
                                                            }
                                                            onClick={() =>
                                                                approveUser(
                                                                    user,
                                                                )
                                                            }
                                                            className="h-8 bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
                                                        >
                                                            <CheckCircle2 className="size-3.5" />
                                                            Approve
                                                        </Button>

                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={
                                                                processingId ===
                                                                user.id
                                                            }
                                                            onClick={() =>
                                                                openReject(user)
                                                            }
                                                            className="h-8 border border-rose-200 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                                                        >
                                                            <XCircle className="size-3.5" />
                                                            Reject
                                                        </Button>

                                                        <Link
                                                            href={index.url()}
                                                            aria-label={`View user details for ${user.name}`}
                                                            className="inline-flex size-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-ustp-gold"
                                                        >
                                                            <ArrowUpRight className="size-4" />
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Dialog
                open={rejecting !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setRejecting(null);
                    }
                }}
            >
                <DialogContent className="gap-4 sm:max-w-md">
                    <DialogTitle>Reject application</DialogTitle>
                    <DialogDescription>
                        {rejecting?.is_student
                            ? 'Provide a reason. It is stored on the application and emailed to the student.'
                            : 'The account will be blocked from signing in until it registers again.'}
                    </DialogDescription>

                    <div className="grid gap-1.5">
                        <Label htmlFor="reject-reason">
                            Reason{' '}
                            {rejectNeedsReason ? (
                                <span className="text-rose-500">*</span>
                            ) : (
                                <span className="text-slate-400">
                                    (optional)
                                </span>
                            )}
                        </Label>
                        <Textarea
                            id="reject-reason"
                            value={rejectReason}
                            onChange={(event) =>
                                setRejectReason(event.target.value)
                            }
                            maxLength={2000}
                            placeholder="Explain why this application is rejected"
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setRejecting(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={submitReject}
                            disabled={
                                rejectProcessing ||
                                (rejectNeedsReason && rejectReason.trim() === '')
                            }
                            className="bg-rose-600 text-white hover:bg-rose-700"
                        >
                            <XCircle className="size-4" />
                            Reject application
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
