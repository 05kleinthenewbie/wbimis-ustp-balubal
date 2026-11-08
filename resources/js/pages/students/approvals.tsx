import { Form, Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import {
    bulk,
    decide,
    document,
    index,
} from '@/actions/App/Http/Controllers/StudentApprovalController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Application = {
    id: number;
    name: string;
    email: string;
    email_verified: boolean;
    approval_status: 'pending' | 'approved' | 'rejected';
    review_notes: string | null;
    submitted_at: string | null;
    has_student_id: boolean;
    has_cor: boolean;
};

type Props = {
    applications: {
        data: Application[];
        prev_page_url: string | null;
        next_page_url: string | null;
    };
    filters: { status: string };
    status?: string;
};

export default function StudentApprovals({
    applications,
    filters,
    status,
}: Props) {
    const [selected, setSelected] = useState<number[]>([]);
    const isPending = filters.status === 'pending';

    function toggle(id: number, checked: boolean) {
        setSelected((current) =>
            checked
                ? [...new Set([...current, id])]
                : current.filter((value) => value !== id),
        );
    }

    return (
        <div className="grid gap-6 p-6">
            <Head title="Student approvals" />
            <h1 className="text-2xl font-semibold">Student approvals</h1>
            {status && (
                <p role="status" className="rounded-lg border p-4">
                    {status}
                </p>
            )}
            <div className="flex flex-wrap gap-3">
                {['pending', 'approved', 'rejected'].map((value) => (
                    <Link
                        key={value}
                        href={index({ query: { status: value } })}
                        className={
                            value === filters.status
                                ? 'font-semibold underline'
                                : ''
                        }
                    >
                        {value}
                    </Link>
                ))}
            </div>

            {isPending && applications.data.length > 0 && (
                <Form
                    action={bulk.url()}
                    method="patch"
                    onSuccess={() => setSelected([])}
                    className="flex flex-wrap items-end gap-3 rounded-xl border p-4"
                >
                    {({ errors, processing }) => (
                        <>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={processing}
                                onClick={() => {
                                    setSelected(
                                        selected.length ===
                                            applications.data.length
                                            ? []
                                            : applications.data.map(
                                                  (a) => a.id,
                                              ),
                                    );
                                }}
                            >
                                {selected.length === applications.data.length
                                    ? 'Clear selection'
                                    : 'Select all'}
                            </Button>
                            <div className="grid gap-1">
                                <Label htmlFor="bulk-reason">
                                    Shared reason (required for rejection)
                                </Label>
                                <Textarea
                                    id="bulk-reason"
                                    name="reason"
                                    maxLength={2000}
                                    className="min-w-64"
                                />
                                <InputError message={errors.reason} />
                                <InputError message={errors.decision} />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    type="submit"
                                    name="decision"
                                    value="approved"
                                    disabled={
                                        processing || selected.length === 0
                                    }
                                >
                                    Approve selected ({selected.length})
                                </Button>
                                <Button
                                    type="submit"
                                    name="decision"
                                    value="rejected"
                                    variant="destructive"
                                    disabled={
                                        processing || selected.length === 0
                                    }
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
                        </>
                    )}
                </Form>
            )}

            {applications.data.length === 0 && (
                <p>No applications in this queue.</p>
            )}
            {applications.data.map((application) => (
                <details key={application.id} className="rounded-xl border p-5">
                    <summary className="flex cursor-pointer items-center gap-3">
                        <input
                            type="checkbox"
                            checked={selected.includes(application.id)}
                            disabled={!isPending}
                            onChange={(event) =>
                                toggle(application.id, event.target.checked)
                            }
                            className="size-4 accent-ustp-navy"
                            aria-label={`Select ${application.name}`}
                        />
                        <span>
                            <span className="font-semibold">
                                {application.name}
                            </span>{' '}
                            · {application.email}
                        </span>
                        <span className="block text-sm text-muted-foreground">
                            Submitted:{' '}
                            {application.submitted_at
                                ? new Date(
                                      application.submitted_at,
                                  ).toLocaleString()
                                : 'Documents not submitted'}
                            {application.has_cor ? '' : ' · No COR uploaded'}
                            {application.has_student_id
                                ? ''
                                : ' · No student ID uploaded'}
                        </span>
                    </summary>
                    <div className="mt-5 grid gap-4">
                        {application.review_notes && (
                            <div className="rounded-lg bg-muted p-4">
                                <h3 className="font-medium">
                                    Reviewer feedback
                                </h3>
                                <p className="text-sm whitespace-pre-wrap">
                                    {application.review_notes}
                                </p>
                            </div>
                        )}
                        <div className="grid gap-3">
                            {application.has_student_id && (
                                <a
                                    href={document.url({
                                        user: application.id,
                                        type: 'student_id',
                                    })}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="underline"
                                >
                                    Preview student ID
                                </a>
                            )}
                            {application.has_cor && (
                                <a
                                    href={document.url({
                                        user: application.id,
                                        type: 'cor',
                                    })}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="underline"
                                >
                                    Preview COR document
                                </a>
                            )}
                        </div>
                        <Form
                            {...decide.form(application.id)}
                            className="grid gap-3"
                        >
                            {({ errors, processing }) => (
                                <>
                                    <Label htmlFor={`reason-${application.id}`}>
                                        Decision feedback (required for
                                        rejection)
                                    </Label>
                                    <Textarea
                                        id={`reason-${application.id}`}
                                        name="reason"
                                        maxLength={2000}
                                    />
                                    <InputError message={errors.reason} />
                                    <InputError message={errors.decision} />
                                    <div className="flex gap-3">
                                        <Button
                                            type="submit"
                                            name="decision"
                                            value="approved"
                                            disabled={processing}
                                        >
                                            Approve
                                        </Button>
                                        <Button
                                            type="submit"
                                            name="decision"
                                            value="rejected"
                                            variant="destructive"
                                            disabled={processing}
                                        >
                                            {application.approval_status ===
                                            'approved'
                                                ? 'Revoke approval'
                                                : 'Reject'}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </Form>
                    </div>
                </details>
            ))}
            <nav className="flex gap-4">
                {applications.prev_page_url && (
                    <Link href={applications.prev_page_url}>Previous</Link>
                )}
                {applications.next_page_url && (
                    <Link href={applications.next_page_url}>Next</Link>
                )}
            </nav>
        </div>
    );
}
