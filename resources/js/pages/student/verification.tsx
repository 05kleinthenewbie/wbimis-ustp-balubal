import { Form, Head, Link } from '@inertiajs/react';
import {
    document,
    sendEmail,
    store,
} from '@/actions/App/Http/Controllers/StudentVerificationController';
import InputError from '@/components/input-error';
import StudentVerificationResults from '@/components/student-verification-results';
import type { Application } from '@/components/student-verification-results';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { dashboard, logout } from '@/routes';

export default function Verification({
    application,
    status,
}: {
    application: Application;
    status?: string;
}) {
    return (
        <main className="min-h-screen bg-background p-6 text-foreground">
            <Head title="Student verification" />
            <div className="mx-auto grid max-w-3xl gap-6">
                <header className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold">
                            Student verification
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {application.name} · {application.approval_status}
                        </p>
                    </div>
                    <Link href={logout()} as="button">
                        Sign out
                    </Link>
                </header>
                {status && (
                    <p role="status" className="rounded-lg border p-4">
                        {status}
                    </p>
                )}
                <section className="rounded-xl border p-6">
                    <StudentVerificationResults application={application} />
                </section>
                {application.approval_status === 'approved' ? (
                    <Link href={dashboard()}>Continue to dashboard</Link>
                ) : !application.email_verified ? (
                    <Form {...sendEmail.form()}>
                        {({ processing, errors }) => (
                            <>
                                <p className="mb-3">
                                    Verify your email before uploading student
                                    documents.
                                </p>
                                <Button disabled={processing}>
                                    Send verification email
                                </Button>
                                <InputError message={errors.email} />
                            </>
                        )}
                    </Form>
                ) : (
                    <section className="grid gap-4 rounded-xl border p-6">
                        <h2 className="text-xl font-semibold">
                            {application.submitted_at
                                ? 'Resubmit documents'
                                : 'Upload your documents'}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Provide a clear USTP student ID image (PNG, JPEG or
                            WebP, up to 8 MB) and COR PDF (up to 15 MB).
                            Resubmission replaces both documents and returns the
                            application to pending review. PNG is recommended
                            when server image extensions are unavailable.
                        </p>
                        <Form
                            {...store.form()}
                            className="grid gap-4"
                            resetOnSuccess
                        >
                            {({ processing, errors, progress }) => (
                                <>
                                    <div className="grid gap-2">
                                        <Label htmlFor="student_id">
                                            USTP student ID image
                                        </Label>
                                        <Input
                                            id="student_id"
                                            name="student_id"
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                            required
                                        />
                                        <InputError
                                            message={errors.student_id}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="cor">
                                            Certificate of Registration PDF
                                        </Label>
                                        <Input
                                            id="cor"
                                            name="cor"
                                            type="file"
                                            accept="application/pdf"
                                            required
                                        />
                                        <InputError message={errors.cor} />
                                    </div>
                                    {progress && (
                                        <progress
                                            value={progress.percentage}
                                            max={100}
                                        />
                                    )}
                                    <Button disabled={processing}>
                                        {processing
                                            ? 'Processing documents…'
                                            : 'Submit for verification'}
                                    </Button>
                                </>
                            )}
                        </Form>
                    </section>
                )}
                <div className="flex gap-4 text-sm">
                    {application.has_student_id && (
                        <a
                            href={document.url('student_id')}
                            target="_blank"
                            rel="noreferrer"
                        >
                            View student ID
                        </a>
                    )}
                    {application.has_cor && (
                        <a
                            href={document.url('cor')}
                            target="_blank"
                            rel="noreferrer"
                        >
                            View COR
                        </a>
                    )}
                </div>
            </div>
        </main>
    );
}
