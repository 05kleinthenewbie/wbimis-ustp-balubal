import LegalPage, { LegalSection } from '@/components/legal-page';

export default function DataPrivacy() {
    return (
        <LegalPage
            title="Data Privacy Notice (RA 10173)"
            updated="November 2, 2026"
        >
            <LegalSection title="1. Statutory Commitment & Background">
                <p>
                    The University of Science and Technology of Southern
                    Philippines (USTP) Balubal Campus respects and values your
                    fundamental rights to data privacy. In compliance with the
                    Republic Act No. 10173, also known as the{' '}
                    <strong>Data Privacy Act of 2012 (DPA)</strong>, its
                    Implementing Rules and Regulations (IRR), and relevant
                    issuances of the National Privacy Commission (NPC), this
                    notice explains how the Web-Based ICT Management and
                    Information System (WBIMIS) collects, processes, protects,
                    and retains your personal and institutional information.
                </p>
            </LegalSection>

            <LegalSection title="2. Personal & Sensitive Information Collected">
                <p>
                    To deliver institutional ICT services and uphold
                    accountability across university facilities, WBIMIS collects
                    the following information:
                </p>
                <ul className="list-disc space-y-1.5 pl-6">
                    <li>
                        <strong>Identity & Account Data:</strong> Full name,
                        institutional email address, contact telephone number,
                        department or academic program, 10-digit Student ID, or
                        Employee ID.
                    </li>
                    <li>
                        <strong>Verification Documents:</strong> Certificate of
                        Registration (COR) for students, or Certificate of
                        Employment (COE) / University ID for faculty and staff
                        members.
                    </li>
                    <li>
                        <strong>Operational Records:</strong> Service requests,
                        hardware/software specifications, computer laboratory
                        and Audio-Visual Room (AVR) reservation schedules, and
                        laboratory incident reports.
                    </li>
                    <li>
                        <strong>Accountability & Liability Records:</strong>{' '}
                        Incident investigations, equipment damage assessments,
                        assigned liabilities, and settlement statuses.
                    </li>
                    <li>
                        <strong>Technical & Session Logs:</strong> System audit
                        logs, authentication timestamps, IP addresses, and
                        device session parameters.
                    </li>
                </ul>
            </LegalSection>

            <LegalSection title="3. Purpose of Processing">
                <p>
                    All personal data collected is processed strictly for
                    legitimate academic, operational, and institutional
                    purposes, including:
                </p>
                <ul className="list-disc space-y-1.5 pl-6">
                    <li>
                        Verifying institutional membership during account
                        registration and two-step email OTP verification.
                    </li>
                    <li>
                        Routing, assigning, and fulfilling ICT service requests
                        and job orders according to established Service Level
                        Agreements (SLA).
                    </li>
                    <li>
                        Managing scheduling, conflict detection, and approvals
                        for campus computer laboratories and AVRs.
                    </li>
                    <li>
                        Documenting and investigating laboratory damages,
                        unauthorized facility access, and safety incidents.
                    </li>
                    <li>
                        Transmitting automated status notifications and system
                        updates via our transactional email provider (Brevo) and
                        in-app alerts.
                    </li>
                    <li>
                        Maintaining tamper-evident administrative audit logs
                        mandated by campus governance policies.
                    </li>
                </ul>
            </LegalSection>

            <LegalSection title="4. Lawful Basis & Consent">
                <p>
                    By registering for an account and using the WBIMIS portal,
                    you expressly acknowledge and give consent to the processing
                    of your information pursuant to Sections 12 and 13 of
                    Republic Act No. 10173, as necessary for the fulfillment of
                    the university's educational mission, contractual
                    obligations, and compliance with institutional policies.
                </p>
            </LegalSection>

            <LegalSection title="5. Data Protection, Security & Retention">
                <p>
                    USTP Balubal Campus enforces rigorous physical,
                    organizational, and technical security measures:
                </p>
                <ul className="list-disc space-y-1.5 pl-6">
                    <li>
                        <strong>Access Control:</strong> Strict role-based
                        access control (RBAC) ensuring that only authorized ICT
                        Administrators inspect uploaded verification documents
                        and personal records.
                    </li>
                    <li>
                        <strong>Cryptographic Security:</strong> Passwords are
                        hashed using industry-standard BCRYPT routines;
                        sensitive registration session states are encrypted.
                    </li>
                    <li>
                        <strong>Data Retention:</strong> Active account data and
                        operational logs are maintained for the duration of your
                        institutional tenure. Inactive or rejected registrations
                        are purged in accordance with USTP records disposition
                        schedules.
                    </li>
                </ul>
            </LegalSection>

            <LegalSection title="6. Rights of the Data Subject">
                <p>
                    Under Section 16 of the Data Privacy Act, you possess the
                    following rights regarding your personal information:
                </p>
                <ul className="list-disc space-y-1.5 pl-6">
                    <li>
                        <strong>Right to be Informed:</strong> To know whether
                        your personal data is being processed.
                    </li>
                    <li>
                        <strong>Right to Access:</strong> To request reasonable
                        access to your personal data on file.
                    </li>
                    <li>
                        <strong>Right to Rectification:</strong> To dispute
                        inaccuracies and have them corrected via your profile
                        settings or the ICT Office.
                    </li>
                    <li>
                        <strong>Right to Erasure or Blocking:</strong> To
                        request suspension or deletion of unauthorized,
                        inaccurate, or outdated data.
                    </li>
                    <li>
                        <strong>Right to File a Complaint:</strong> To lodge a
                        complaint with the National Privacy Commission if your
                        privacy rights are violated.
                    </li>
                </ul>
            </LegalSection>

            <LegalSection title="7. Contact the Data Protection Office">
                <p>
                    For inquiries, clarification, or exercise of your data
                    privacy rights, please direct your communication to:
                </p>
                <div className="rounded-xl border border-ustp-gray-medium bg-slate-50 p-4 text-xs leading-relaxed text-slate-700">
                    <p className="font-bold text-ustp-navy">
                        ICT Office / Data Protection Officer
                    </p>
                    <p>
                        University of Science and Technology of Southern
                        Philippines — Balubal Campus
                    </p>
                    <p>Balubal, Cagayan de Oro City, Misamis Oriental, 9000</p>
                    <p>
                        Email:{' '}
                        <a
                            href="mailto:balubal@ustp.edu.ph"
                            className="font-semibold text-ustp-navy hover:underline"
                        >
                            balubal@ustp.edu.ph
                        </a>
                    </p>
                </div>
            </LegalSection>
        </LegalPage>
    );
}
