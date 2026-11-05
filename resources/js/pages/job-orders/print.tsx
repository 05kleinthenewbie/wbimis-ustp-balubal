import { Head } from '@inertiajs/react';
import { ArrowLeft, Printer } from 'lucide-react';
import type { ReactNode } from 'react';
import ustpLogo from '@/assets/ustp-logo.png';

type PrintService = {
    id: number;
    specification: string | null;
    quantity: number | null;
    action_type: string | null;
    service_type: {
        service_name: string;
        category: { category_name: string } | null;
    } | null;
};

type PrintProps = {
    jobOrder: {
        id: number;
        job_order_number: string | null;
        report: string | null;
        resolution: string | null;
        action_taken: string | null;
        final_remarks: string | null;
        date_assigned: string | null;
        date_in_progress: string | null;
        date_completed: string | null;
        date_closed: string | null;
        support_type: string | null;
        user_permission_granted: boolean;
        technician: {
            id: number;
            name: string;
            department: string | null;
        } | null;
        service_request: {
            id: number;
            form_number: string | null;
            date_requested: string | null;
            location: string | null;
            contact_details: string | null;
            problem_description: string | null;
            user: {
                name: string;
                department: string | null;
                contact_no: string | null;
            } | null;
            request_services: PrintService[];
        } | null;
    };
    hasAttachment: boolean;
};

const CAMPUSES = [
    'Alubijid',
    'Balubal',
    'Cagayan de Oro',
    'Claveria',
    'Jasaan',
    'Oroquieta',
    'Panaon',
    'Villanueva',
];

const DOC_CODE = 'FM-USTP-ICT-001';
const REV_NO = '00';
const EFFECTIVE_DATE = '03.17.25';

const CATEGORY_CONFIG: {
    title: string;
    actions: string[];
    rows: string[];
    rowAliases?: Record<string, string[]>;
}[] = [
    {
        title: 'Network Services',
        actions: ['New Connection', 'Troubleshoot'],
        rows: [
            'Network Connection',
            'Internet Connection',
            'Printer Connection',
            'Phone Connection',
            'Others',
        ],
    },
    {
        title: 'Hardware Services',
        actions: ['Installation', 'Troubleshoot', 'Update'],
        rows: [
            'Computer/Laptop',
            'Printer/Scanner',
            'Tablet/Mobile Phone',
            'Others',
        ],
    },
    {
        title: 'Software Services',
        actions: ['Installation', 'Troubleshoot', 'Update'],
        rows: [
            'Operating System',
            'Office Suites',
            'Anti-Virus',
            'Device Drivers',
            'Others',
        ],
    },
    {
        title: 'Information System Services',
        actions: ['Create New', 'Troubleshoot', 'Update'],
        rows: ['E-mail', 'Others'],
        rowAliases: { Others: ['Office 365'] },
    },
];

const FINAL_REMARKS: { key: string; label: string }[] = [
    { key: 'outsource_repair', label: 'For Outsource Repair' },
    { key: 'replacement', label: 'For Replacement' },
    { key: 'disposal', label: 'For Disposal' },
    { key: 'task_completed', label: 'Task Completed' },
];

function formatDateTime(value?: string | null): string {
    if (!value) {
        return '';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return date.toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

function joinValues(values: (string | number | null | undefined)[]): string {
    return values
        .map((value) => String(value ?? ''))
        .filter(Boolean)
        .join('; ');
}

function Checkbox({ checked }: { checked: boolean }) {
    return (
        <span className="inline-flex size-3 shrink-0 items-center justify-center border border-black text-[8px] leading-none font-bold text-black">
            {checked ? '✓' : ''}
        </span>
    );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="border-[1.5px] border-black">
            <div className="bg-black px-2 py-0.5 text-[9.5px] font-bold tracking-wide text-white uppercase sm:text-[10px]">
                {title}
            </div>
            {children}
        </section>
    );
}

function Field({ label, value }: { label: string; value: string }) {
    return (
        <div className="p-1">
            <p className="text-[9.5px] font-semibold">{label}</p>
            <div className="mt-1 min-h-3.5 border-b border-dotted border-gray-400 px-0.5 text-[10px] text-black">
                {value || '\u00A0'}
            </div>
        </div>
    );
}

function ServiceCategory({
    title,
    actions,
    rows,
    rowAliases,
    services,
}: {
    title: string;
    actions: string[];
    rows: string[];
    rowAliases?: Record<string, string[]>;
    services: PrintService[];
}) {
    const normalize = (value?: string | null) =>
        (value ?? '').trim().toLowerCase();

    const rowServices = (name: string) => {
        const matchedNames = [name, ...(rowAliases?.[name] ?? [])].map(
            normalize,
        );

        return services.filter(
            (service) =>
                normalize(service.service_type?.category?.category_name) ===
                    normalize(title) &&
                matchedNames.includes(
                    normalize(service.service_type?.service_name),
                ),
        );
    };

    return (
        <div>
            <div className="border-b border-black bg-gray-100 px-2 py-0.5 text-[9.5px] font-bold uppercase">
                {title}
            </div>

            <table
                className="w-full border-collapse text-[9.5px]"
                style={{ tableLayout: 'fixed' }}
            >
                <tbody>
                    {rows.map((name) => {
                        const matched = rowServices(name);
                        const checked = matched.length > 0;
                        const aliases = rowAliases?.[name] ?? [];
                        const specification = joinValues(
                            matched.map((service) => {
                                const serviceName =
                                    service.service_type?.service_name ?? '';
                                const matchedAlias = aliases.some(
                                    (alias) =>
                                        normalize(alias) ===
                                        normalize(serviceName),
                                );

                                return joinValues([
                                    matchedAlias ? serviceName : '',
                                    service.specification,
                                ]);
                            }),
                        );
                        const quantity = joinValues(
                            matched.map((service) => service.quantity),
                        );

                        return (
                            <tr key={name}>
                                <td
                                    className="border-r border-b border-black px-1.5 py-1 align-middle"
                                    style={{ width: '25%' }}
                                >
                                    <div className="flex items-center gap-1.5">
                                        <Checkbox checked={checked} />
                                        <span className="font-semibold">
                                            {name}
                                        </span>
                                    </div>
                                </td>
                                <td
                                    className="border-r border-b border-black px-1.5 py-1"
                                    style={{ width: '25%' }}
                                >
                                    <div className="flex items-center gap-1">
                                        <span className="shrink-0 text-[8.5px] whitespace-nowrap">
                                            Specify:
                                        </span>
                                        <span className="min-w-0 flex-1 border-b border-dotted border-gray-400 text-[9.5px] wrap-break-word">
                                            {specification || '\u00A0'}
                                        </span>
                                    </div>
                                </td>
                                <td
                                    className="border-r border-b border-black px-1.5 py-1"
                                    style={{ width: '17%' }}
                                >
                                    <div className="flex items-center gap-1">
                                        <span className="shrink-0 text-[8.5px] whitespace-nowrap">
                                            Qty:
                                        </span>
                                        <span className="min-w-0 flex-1 border-b border-dotted border-gray-400 text-center text-[9.5px]">
                                            {quantity || '\u00A0'}
                                        </span>
                                    </div>
                                </td>
                                <td
                                    className="border-b border-black px-1.5 py-1"
                                    style={{ width: '33%' }}
                                >
                                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                                        {actions.map((action) => (
                                            <span
                                                key={action}
                                                className="flex items-center gap-1 text-[8.5px] whitespace-nowrap"
                                            >
                                                <Checkbox
                                                    checked={matched.some(
                                                        (service) =>
                                                            normalize(
                                                                service.action_type,
                                                            ) ===
                                                            normalize(action),
                                                    )}
                                                />
                                                {action}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export default function PrintJobRequestForm({
    jobOrder,
    hasAttachment,
}: PrintProps) {
    const services = jobOrder.service_request?.request_services ?? [];
    const serviceRequest = jobOrder.service_request;
    const user = serviceRequest?.user;
    const technician = jobOrder.technician;

    const knownRowNames = CATEGORY_CONFIG.flatMap((config) => [
        ...config.rows.map((row) => row.trim().toLowerCase()),
        ...Object.values(config.rowAliases ?? {})
            .flat()
            .map((row) => row.trim().toLowerCase()),
    ]);
    const unmatchedServices = services.filter(
        (service) =>
            !service.service_type ||
            !knownRowNames.includes(
                (service.service_type.service_name ?? '').trim().toLowerCase(),
            ),
    );

    const respondedAt = jobOrder.date_in_progress || jobOrder.date_assigned;
    const resolvedAt = jobOrder.date_completed || jobOrder.date_closed;
    const reportText =
        jobOrder.report || jobOrder.resolution || jobOrder.action_taken;

    return (
        <>
            <Head
                title={`ICT Job Request Form${jobOrder.job_order_number ? ` - ${jobOrder.job_order_number}` : ''}`}
            />

            <style>{`
                @page {
                    size: letter portrait;
                    margin: 0.2in 0.25in 0.25in;
                }

                @media print {
                    html,
                    body {
                        background-color: #ffffff !important;
                        height: auto !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }

                    .no-print {
                        display: none !important;
                    }

                    /* Collapse layout chrome so hidden elements add no pages */
                    .min-h-screen,
                    .min-h-svh {
                        min-height: 0 !important;
                    }

                    /* Only the form sheet is visible when printing */
                    body * {
                        visibility: hidden !important;
                    }

                    .page-container,
                    .page-container * {
                        visibility: visible !important;
                    }

                    .page-container {
                        box-sizing: border-box;
                        border: none !important;
                        box-shadow: none !important;
                        padding: 0 0.05in !important;
                        width: 8in !important;
                        max-width: 8in !important;
                        margin: 0 !important;
                        transform: none !important;
                    }

                    .page-container [data-purpose='header-section'] {
                        padding-top: 0 !important;
                        padding-bottom: 0.08in !important;
                    }

                    .page-container [data-purpose='title-section'] {
                        padding-top: 0.04in !important;
                        padding-bottom: 0.08in !important;
                    }

                    .page-container section > table,
                    .page-container section table {
                        font-size: 8px !important;
                    }

                    .page-container section td,
                    .page-container section th {
                        padding-top: 1px !important;
                        padding-bottom: 1px !important;
                    }

                    .page-container .border-b.border-dotted {
                        min-height: 0 !important;
                        margin-top: 1px !important;
                        padding-top: 1px !important;
                        padding-bottom: 1px !important;
                    }

                    .page-container [data-purpose='header-section'] img {
                        height: 0.72in !important;
                        width: 0.72in !important;
                    }

                    .page-container {
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }
                }
            `}</style>

            <div className="min-h-screen bg-gray-100 px-2 py-8 antialiased sm:px-4 print:bg-white print:p-0">
                {/* Action toolbar */}
                <div className="no-print mx-auto mb-3 flex max-w-215 flex-wrap items-center justify-between gap-3 print:hidden">
                    <a
                        href={`/job-orders/${jobOrder.id}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                        <ArrowLeft className="size-4" />
                        Back to Job Order
                    </a>
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-2 rounded-lg bg-ustp-light-blue px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-ustp-navy"
                    >
                        <Printer className="size-4" />
                        Print Form / Save PDF
                    </button>
                </div>

                {/* Form sheet */}
                <main className="page-container mx-auto max-w-215 border border-gray-300 bg-white p-6 text-black shadow-md sm:p-8">
                    {/* Document header */}
                    <header className="pt-1 pb-4" data-purpose="header-section">
                        <table
                            className="w-full table-fixed border-collapse"
                            style={{ width: '100%', tableLayout: 'fixed' }}
                        >
                            <tbody>
                                <tr>
                                    <td
                                        className="align-middle"
                                        style={{ width: '1.1in' }}
                                    >
                                        <img
                                            src={ustpLogo}
                                            alt="USTP Logo"
                                            className="h-20 w-auto object-contain"
                                            style={{
                                                height: '0.9in',
                                                width: '0.9in',
                                            }}
                                        />
                                    </td>
                                    <td
                                        className="px-2 text-center align-middle"
                                        style={{ width: '3.7in' }}
                                    >
                                        <h1 className="text-[13px] leading-tight font-bold tracking-tight text-black uppercase sm:text-[14px]">
                                            University of Science and Technology
                                            <br />
                                            of Southern Philippines
                                        </h1>
                                        <p className="mt-1 text-[9px] leading-tight font-normal tracking-tight text-black sm:text-[9px]">
                                            {CAMPUSES.join(' | ')}
                                        </p>
                                    </td>
                                    <td
                                        className="align-middle"
                                        style={{ width: '2.25in' }}
                                    >
                                        <table className="w-full border-collapse border border-[#002855] text-center">
                                            <tbody>
                                                <tr>
                                                    <td
                                                        colSpan={3}
                                                        className="border-b border-[#002855] bg-[#002855] px-1 py-0.5 text-[9.5px] font-semibold tracking-tight text-white"
                                                    >
                                                        Document Code no.
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td
                                                        colSpan={3}
                                                        className="border-b border-[#002855] bg-white px-1 py-0.5 text-[12px] font-bold tracking-wider text-black"
                                                    >
                                                        {DOC_CODE}
                                                    </td>
                                                </tr>
                                                <tr className="bg-[#002855] text-[8px] leading-tight font-semibold text-white">
                                                    <td
                                                        className="border-r border-[#002855] px-0.5 py-0.5"
                                                        style={{ width: '30%' }}
                                                    >
                                                        Rev. No.
                                                    </td>
                                                    <td
                                                        className="border-r border-l border-white px-0.5 py-0.5"
                                                        style={{ width: '40%' }}
                                                    >
                                                        Effective Date
                                                    </td>
                                                    <td
                                                        className="border-l border-white px-0.5 py-0.5"
                                                        style={{ width: '30%' }}
                                                    >
                                                        Page No.
                                                    </td>
                                                </tr>
                                                <tr className="border-t border-[#002855] bg-white text-[9px] leading-tight font-normal text-black">
                                                    <td className="border-r border-[#002855] py-0.5">
                                                        {REV_NO}
                                                    </td>
                                                    <td className="border-r border-[#002855] py-0.5">
                                                        {EFFECTIVE_DATE}
                                                    </td>
                                                    <td className="py-0.5">
                                                        1 of 1
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </header>

                    {/* Document title */}
                    <div
                        className="pt-2 pb-3 text-center"
                        data-purpose="title-section"
                    >
                        <h2 className="text-[14px] leading-tight font-bold tracking-wide text-black uppercase sm:text-[15px]">
                            Information and Communications Technology Services
                        </h2>
                        <h3 className="mt-1 text-[15px] leading-tight font-bold tracking-wide text-black uppercase sm:text-[16px]">
                            Job Request Form
                        </h3>
                    </div>

                    {/* I. Requestor information */}
                    <Section title="Requestor Information (Complete fields that marked with an asterisk (*))">
                        <table className="w-full border-collapse text-[9.5px]">
                            <tbody>
                                <tr>
                                    <td
                                        className="border-r border-b border-black align-top"
                                        style={{ width: '50%' }}
                                    >
                                        <Field
                                            label="*Requested By (Please print your name clearly):"
                                            value={user?.name ?? ''}
                                        />
                                    </td>
                                    <td
                                        className="border-b border-black align-top"
                                        style={{ width: '50%' }}
                                    >
                                        <Field
                                            label="*Date / Time Requested:"
                                            value={formatDateTime(
                                                serviceRequest?.date_requested,
                                            )}
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border-r border-b border-black align-top">
                                        <Field
                                            label="*Designation:"
                                            value={user?.department ?? ''}
                                        />
                                    </td>
                                    <td className="border-b border-black align-top">
                                        <Field
                                            label="*Contact Details (Local / Email / Landline / Mobile):"
                                            value={
                                                serviceRequest?.contact_details ||
                                                user?.contact_no ||
                                                ''
                                            }
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td
                                        className="border-b border-black"
                                        colSpan={2}
                                    >
                                        <Field
                                            label="*Office / Service / Division:"
                                            value={
                                                serviceRequest?.location ?? ''
                                            }
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td
                                        className="border-b border-black"
                                        colSpan={2}
                                    >
                                        <div className="p-1">
                                            <p className="text-[9.5px] font-normal">
                                                Problem Description (Please
                                                provide relevant information):
                                            </p>
                                            <div className="mt-1 min-h-10 border-b border-dotted border-gray-400 px-0.5 text-[10px] leading-relaxed wrap-break-word text-black">
                                                {serviceRequest?.problem_description ??
                                                    '\u00A0'}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-2 py-1" colSpan={2}>
                                        <div className="flex items-center gap-1.5">
                                            <Checkbox checked={hasAttachment} />
                                            <span className="text-[9px] italic">
                                                Check if with attachment (e.g.,
                                                print-outs)
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-2 py-1" colSpan={2}>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                            <span className="flex items-center gap-1.5">
                                                <Checkbox
                                                    checked={
                                                        jobOrder.support_type ===
                                                        'remote'
                                                    }
                                                />
                                                <span className="text-[9px]">
                                                    Remote support
                                                </span>
                                            </span>
                                            {jobOrder.support_type ===
                                                'remote' && (
                                                <span className="flex items-center gap-1.5">
                                                    <Checkbox
                                                        checked={
                                                            jobOrder.user_permission_granted
                                                        }
                                                    />
                                                    <span className="text-[9px]">
                                                        Requester permission
                                                        granted for remote
                                                        access
                                                    </span>
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </Section>

                    {/* II. ICT services */}
                    <Section title="ICT Services (Check the service(s) that has been requested)">
                        <div className="text-[9.5px]">
                            {CATEGORY_CONFIG.map((config) => (
                                <ServiceCategory
                                    key={config.title}
                                    title={config.title}
                                    actions={config.actions}
                                    rows={config.rows}
                                    rowAliases={config.rowAliases}
                                    services={services}
                                />
                            ))}

                            {unmatchedServices.length > 0 && (
                                <div className="flex items-center gap-2 p-1 text-[9.5px]">
                                    <span className="shrink-0 font-bold whitespace-nowrap">
                                        OTHERS{' '}
                                        <span className="font-normal">
                                            (Please specify):
                                        </span>
                                    </span>
                                    <span className="min-w-0 flex-1 border-b border-dotted border-gray-400 px-0.5 text-[10px] wrap-break-word">
                                        {joinValues(
                                            unmatchedServices.map(
                                                (service) =>
                                                    service.specification ||
                                                    service.service_type
                                                        ?.service_name,
                                            ),
                                        ) || '\u00A0'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </Section>

                    {/* III. For ICT personnel use only */}
                    <Section title="For ICT Personnel Use Only">
                        <table className="w-full border-collapse text-[9.5px]">
                            <tbody>
                                <tr>
                                    <td
                                        className="border-r border-b border-black align-top"
                                        style={{ width: '25%' }}
                                    >
                                        <Field
                                            label="Responded by (Name and Signature):"
                                            value={technician?.name ?? ''}
                                        />
                                    </td>
                                    <td
                                        className="border-r border-b border-black align-top"
                                        style={{ width: '25%' }}
                                    >
                                        <Field
                                            label="Designation:"
                                            value={technician?.department ?? ''}
                                        />
                                    </td>
                                    <td
                                        className="border-r border-b border-black align-top"
                                        style={{ width: '25%' }}
                                    >
                                        <Field
                                            label="Date/Time Responded:"
                                            value={formatDateTime(respondedAt)}
                                        />
                                    </td>
                                    <td
                                        className="border-b border-black align-top"
                                        style={{ width: '25%' }}
                                    >
                                        <Field
                                            label="Date/Time Resolved:"
                                            value={formatDateTime(resolvedAt)}
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td colSpan={4}>
                                        <div className="p-1">
                                            <p className="text-[9.5px] font-normal">
                                                Report
                                            </p>
                                            <div className="mt-1 min-h-3.5 border-b border-dotted border-gray-400 px-0.5 text-[9px] leading-tight wrap-break-word text-black">
                                                {reportText || '\u00A0'}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </Section>

                    {/* IV. For ICT supervisor use only */}
                    <Section title="For ICT Supervisor Use Only">
                        <table className="w-full border-collapse text-[9.5px]">
                            <tbody>
                                <tr>
                                    <td
                                        className="border-r border-b border-black align-top"
                                        style={{ width: '33.33%' }}
                                    >
                                        <Field
                                            label="Checked by (Name and Signature):"
                                            value=""
                                        />
                                    </td>
                                    <td
                                        className="border-r border-b border-black align-top"
                                        style={{ width: '33.33%' }}
                                    >
                                        <Field label="Designation:" value="" />
                                    </td>
                                    <td
                                        className="border-b border-black align-top"
                                        style={{ width: '33.34%' }}
                                    >
                                        <Field
                                            label="Date and Time:"
                                            value=""
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td className="p-1.5" colSpan={3}>
                                        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
                                            <span className="font-bold">
                                                Final Remarks
                                            </span>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                                {FINAL_REMARKS.map((remark) => (
                                                    <span
                                                        key={remark.key}
                                                        className="flex items-center gap-1.5"
                                                    >
                                                        <Checkbox
                                                            checked={
                                                                jobOrder.final_remarks ===
                                                                remark.key
                                                            }
                                                        />
                                                        <span
                                                            className={
                                                                remark.key ===
                                                                'task_completed'
                                                                    ? 'font-semibold'
                                                                    : undefined
                                                            }
                                                        >
                                                            {remark.label}
                                                        </span>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </Section>
                </main>
            </div>
        </>
    );
}
