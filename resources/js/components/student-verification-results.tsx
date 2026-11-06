export type Application = {
    id: number;
    name: string;
    email: string;
    email_verified: boolean;
    approval_status: 'pending' | 'approved' | 'rejected';
    student_number: string | null;
    course_code: string | null;
    score: number;
    recommendation: string | null;
    review_notes: string | null;
    submitted_at: string | null;
    has_student_id: boolean;
    has_cor: boolean;
    results: {
        flags?: string[];
        [key: string]: unknown;
    } | null;
};

const checks = [
    ['email_domain', 'Verified institutional email'],
    ['student_id_qr', 'Student ID QR extraction'],
    ['cor', 'COR extraction and enrollment term'],
    ['student_number_match', 'Student numbers match'],
    ['name_match', 'Student names match'],
    ['course_match', 'Programs match'],
];

export default function StudentVerificationResults({
    application,
}: {
    application: Application;
}) {
    return (
        <div className="grid gap-4">
            <p className="text-lg font-semibold">
                Verification score: {application.score}/40
            </p>
            <p className="text-sm text-muted-foreground">
                {application.recommendation?.replaceAll('_', ' ') ??
                    'Upload both documents to start verification'}
                . Scores indicate consistency of evidence; administrator
                approval is required.
            </p>
            <dl className="grid gap-2">
                {checks.map(([key, label]) => {
                    const check = application.results?.[key] as
                        { points?: number } | undefined;

                    return (
                        <div
                            key={key}
                            className="flex justify-between gap-4 border-b py-2 text-sm"
                        >
                            <dt>{label}</dt>
                            <dd>{check?.points ?? 0} points</dd>
                        </div>
                    );
                })}
            </dl>
            <div className="grid gap-4 sm:grid-cols-2">
                {(['student_id_qr', 'cor'] as const).map((key) => {
                    const extracted = application.results?.[key] as
                        Record<string, unknown> | undefined;

                    return (
                        <section
                            key={key}
                            className="rounded-lg bg-muted/40 p-3"
                        >
                            <h3 className="mb-2 font-medium">
                                {key === 'cor'
                                    ? 'Extracted COR details'
                                    : 'Extracted ID details'}
                            </h3>
                            <dl className="grid gap-1 text-sm">
                                {[
                                    'name',
                                    'student_number',
                                    'course',
                                    'program',
                                    'academic_year',
                                    'semester',
                                ].map((field) => {
                                    const value = extracted?.[field];

                                    return typeof value === 'string' ? (
                                        <div key={field}>
                                            <dt className="text-muted-foreground">
                                                {field.replaceAll('_', ' ')}
                                            </dt>
                                            <dd>{value}</dd>
                                        </div>
                                    ) : null;
                                })}
                            </dl>
                        </section>
                    );
                })}
            </div>
            {application.results?.flags?.length ? (
                <div className="rounded-lg border border-amber-400/50 p-4">
                    <h3 className="font-medium">Items requiring review</h3>
                    <ul className="list-inside list-disc text-sm">
                        {application.results.flags.map((flag) => (
                            <li key={flag}>{flag.replaceAll('_', ' ')}</li>
                        ))}
                    </ul>
                </div>
            ) : null}
            {application.review_notes && (
                <div className="rounded-lg bg-muted p-4">
                    <h3 className="font-medium">Administrator feedback</h3>
                    <p className="text-sm whitespace-pre-wrap">
                        {application.review_notes}
                    </p>
                </div>
            )}
            {!application.email_verified && (
                <p className="text-sm">
                    Missing requirement: email ownership verification.
                </p>
            )}
            {!application.has_student_id && (
                <p className="text-sm">
                    Missing requirement: student ID image.
                </p>
            )}
            {!application.has_cor && (
                <p className="text-sm">
                    Missing requirement: Certificate of Registration PDF.
                </p>
            )}
        </div>
    );
}
