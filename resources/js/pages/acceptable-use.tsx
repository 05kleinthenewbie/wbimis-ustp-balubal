import LegalPage, { LegalSection } from '@/components/legal-page';

export default function AcceptableUse() {
    return (
        <LegalPage
            title="Acceptable Use Policy (AUP)"
            updated="November 2, 2026"
        >
            <LegalSection title="1. Purpose & Scope">
                <p>
                    This Acceptable Use Policy defines the standards for the
                    authorized and ethical utilization of the Web-Based ICT
                    Management and Information System (WBIMIS) and associated
                    ICT facilities (including Computer Laboratories,
                    Audio-Visual Rooms, and campus network resources) at USTP
                    Balubal Campus. This policy applies to all registered
                    students, faculty, administrative staff, technicians, and
                    guest users.
                </p>
            </LegalSection>

            <LegalSection title="2. Account Responsibility & Credentials">
                <p>
                    Every user is assigned specific role-based credentials. You
                    agree to adhere to the following principles:
                </p>
                <ul className="list-disc space-y-1.5 pl-6">
                    <li>
                        <strong>Account Ownership:</strong> User accounts are
                        strictly non-transferable. You must never share your
                        login credentials, password, or OTP verification codes
                        with any other individual.
                    </li>
                    <li>
                        <strong>Legitimate Identification:</strong> Registering
                        under false identities, using another individual's
                        Student ID or Employee ID, or uploading counterfeit
                        identification or registration documents (Student
                        ID/COR/COE) is strictly prohibited and subject to
                        university disciplinary action.
                    </li>
                    <li>
                        <strong>Prompt Reporting:</strong> In the event of
                        suspected unauthorized access or compromise of your
                        credentials, you must immediately report the incident to
                        the campus ICT Office.
                    </li>
                </ul>
            </LegalSection>

            <LegalSection title="3. Prohibited Activities">
                <p>
                    Users must not engage in any activity that impairs the
                    security, integrity, or availability of WBIMIS or campus ICT
                    assets. Specifically prohibited actions include:
                </p>
                <ul className="list-disc space-y-1.5 pl-6">
                    <li>
                        <strong>System Tampering:</strong> Attempting to
                        circumvent access controls, bypass authentication gates,
                        probe for vulnerabilities, or inject malicious code, SQL
                        payloads, or unauthorized scripts.
                    </li>
                    <li>
                        <strong>Frivolous & False Submissions:</strong>{' '}
                        Submitting fabricated service requests, fraudulent
                        facility bookings, bogus defect alerts, or misleading
                        incident reports.
                    </li>
                    <li>
                        <strong>Denial of Service & Abuse:</strong> Automated
                        scraping, flood requesting, brute-forcing login
                        endpoints, or consuming excessive server and network
                        bandwidth.
                    </li>
                    <li>
                        <strong>Commercial or Inappropriate Use:</strong> Using
                        the system for non-university commercial activities,
                        political campaigning, or disseminating unlawful,
                        harassing, or defamatory content.
                    </li>
                </ul>
            </LegalSection>

            <LegalSection title="4. Facility Reservations (Comlabs & AVRs)">
                <p>
                    When submitting and utilizing reservations for campus
                    computer laboratories and audio-visual rooms:
                </p>
                <ul className="list-disc space-y-1.5 pl-6">
                    <li>
                        Bookings must be requested strictly for legitimate
                        academic classes, official university meetings, or duly
                        recognized student organization events.
                    </li>
                    <li>
                        Requesters must ensure that reserved time slots are
                        accurately scheduled. If an activity is rescheduled or
                        cancelled, the requester must cancel the booking
                        promptly in WBIMIS to free facility availability for
                        others.
                    </li>
                    <li>
                        Users are responsible for ensuring that all laboratory
                        rules and equipment care guidelines are adhered to
                        during the booked period.
                    </li>
                </ul>
            </LegalSection>

            <LegalSection title="5. Laboratory Incident Reporting & Liability">
                <p>In accordance with campus accountability guidelines:</p>
                <ul className="list-disc space-y-1.5 pl-6">
                    <li>
                        Any physical damage, equipment defect, software
                        malfunction, theft, or safety hazard observed in
                        computer laboratories must be promptly reported through
                        the Laboratory Incident Reports module.
                    </li>
                    <li>
                        Where negligence, deliberate misuse, or unauthorized
                        handling causes equipment damage, assessed liabilities
                        will be recorded in WBIMIS and evaluated by the ICT
                        Administration and University Disciplinary Committee.
                    </li>
                </ul>
            </LegalSection>

            <LegalSection title="6. Monitoring, Enforcement & Sanctions">
                <p>
                    To safeguard institutional resources, the ICT Office
                    maintains continuous system monitoring and administrative
                    audit trails. Violations of this Acceptable Use Policy may
                    result in:
                </p>
                <ul className="list-disc space-y-1.5 pl-6">
                    <li>
                        Immediate suspension or revocation of WBIMIS account
                        privileges.
                    </li>
                    <li>
                        Cancellation of pending service requests and facility
                        reservations.
                    </li>
                    <li>
                        Referral to the USTP Office of Student Affairs (OSA) or
                        Human Resource Management Office (HRMO) for disciplinary
                        and administrative sanctions.
                    </li>
                    <li>
                        Legal prosecution under the Cybercrime Prevention Act of
                        2012 (RA 10175) or other applicable Philippine laws.
                    </li>
                </ul>
            </LegalSection>
        </LegalPage>
    );
}
