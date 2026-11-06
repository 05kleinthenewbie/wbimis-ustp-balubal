import { Form, Head, Link, router } from '@inertiajs/react';
import {
    decide,
    document,
    index,
} from '@/actions/App/Http/Controllers/StudentApprovalController';
import InputError from '@/components/input-error';
import StudentVerificationResults from '@/components/student-verification-results';
import type { Application } from '@/components/student-verification-results';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Props = {
    applications: {
        data: Application[];
        prev_page_url: string | null;
        next_page_url: string | null;
    };
    filters: { status: string; sort: string };
    status?: string;
};

export default function StudentApprovals({
    applications,
    filters,
    status,
}: Props) {
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
                        href={index({
                            query: { status: value, sort: filters.sort },
                        })}
                        className={
                            value === filters.status
                                ? 'font-semibold underline'
                                : ''
                        }
                    >
                        {value}
                    </Link>
                ))}
                <label className="ml-auto">
                    Sort{' '}
                    <select
                        value={filters.sort}
                        onChange={(event) =>
                            router.get(
                                index.url({
                                    query: {
                                        status: filters.status,
                                        sort: event.target.value,
                                    },
                                }),
                            )
                        }
                        className="rounded border bg-background p-2"
                    >
                        <option value="score">Highest score</option>
                        <option value="newest">Newest submissions</option>
                    </select>
                </label>
            </div>
            {applications.data.length === 0 && (
                <p>No applications in this queue.</p>
            )}
            {applications.data.map((application) => (
                <details key={application.id} className="rounded-xl border p-5">
                    <summary className="cursor-pointer">
                        <span className="font-semibold">
                            {application.name}
                        </span>{' '}
                        · {application.email} ·{' '}
                        {application.student_number ?? 'No student number'} ·{' '}
                        {application.course_code ?? 'No program'} ·{' '}
                        {application.score}/40 · {application.approval_status}
                        <span className="block text-sm text-muted-foreground">
                            Submitted:{' '}
                            {application.submitted_at
                                ? new Date(
                                      application.submitted_at,
                                  ).toLocaleString()
                                : 'Documents not submitted'}
                        </span>
                    </summary>
                    <div className="mt-5 grid gap-5 lg:grid-cols-2">
                        <StudentVerificationResults application={application} />
                        <div className="grid content-start gap-4">
                            {application.has_student_id && (
                                <a
                                    href={document.url({
                                        user: application.id,
                                        type: 'student_id',
                                    })}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <img
                                        src={document.url({
                                            user: application.id,
                                            type: 'student_id',
                                        })}
                                        className="max-h-64 rounded border object-contain"
                                        alt="Uploaded student ID"
                                    />
                                    Open student ID
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
                                    Preview COR PDF
                                </a>
                            )}
                            <Form
                                {...decide.form(application.id)}
                                className="grid gap-3"
                            >
                                {({ errors, processing }) => (
                                    <>
                                        <Label
                                            htmlFor={`reason-${application.id}`}
                                        >
                                            Decision feedback (required for
                                            rejection or revocation)
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
                                                disabled={
                                                    processing ||
                                                    !application.has_student_id ||
                                                    !application.has_cor ||
                                                    !application.email_verified
                                                }
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
