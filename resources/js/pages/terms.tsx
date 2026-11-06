import LegalPage, { LegalSection } from '@/components/legal-page';

export default function Terms() {
    return (
        <LegalPage title="Terms of Service" updated="September 27, 2026">
            <LegalSection title="1. Acceptance of Terms">
                <p>
                    These Terms of Service ("Terms") govern your use of the
                    Web-Based ICT Management and Information System ("WBIMIS" or
                    "the System") operated by the ICT Office of USTP Balubal
                    Campus. By creating an account or using the System, you
                    agree to be bound by these Terms. If you do not agree, do
                    not use the System.
                </p>
            </LegalSection>

            <LegalSection title="2. Description of the Service">
                <p>
                    WBIMIS provides a centralized portal for managing ICT
                    operations on campus, including service requests, job
                    orders, facility bookings, incident reports, inventory
                    tracking, and related reports. Features may be added,
                    changed, or removed at any time to improve the service.
                </p>
            </LegalSection>

            <LegalSection title="3. Accounts and Registration">
                <p>
                    You must provide accurate and complete information when
                    registering. Registration requires verifying your email
                    address with a one-time code and approval by the ICT
                    Administrator before you can sign in. You are responsible
                    for safeguarding your credentials and for all activity that
                    occurs under your account. Notify the ICT Office immediately
                    if you suspect unauthorized use.
                </p>
            </LegalSection>

            <LegalSection title="4. Acceptable Use">
                <p>You agree not to:</p>
                <ul className="list-disc space-y-1 pl-6">
                    <li>
                        Use the System for any unlawful, fraudulent, or
                        malicious purpose.
                    </li>
                    <li>
                        Submit false, misleading, or abusive service requests,
                        bookings, or incident reports.
                    </li>
                    <li>
                        Attempt to access, damage, or disrupt data, accounts, or
                        infrastructure that you are not authorized to use.
                    </li>
                    <li>
                        Share your account credentials or impersonate another
                        member of the university community.
                    </li>
                    <li>
                        Use automated means to extract data from the System
                        without written permission from the ICT Office.
                    </li>
                </ul>
            </LegalSection>

            <LegalSection title="5. Account Suspension">
                <p>
                    The ICT Administrator may restrict, deactivate, or suspend
                    accounts that violate these Terms or are reported for
                    misuse. You may contact the ICT Office to request
                    reinstatement or clarification of any action taken on your
                    account.
                </p>
            </LegalSection>

            <LegalSection title="6. University Policies">
                <p>
                    Your use of the System is also governed by the existing
                    policies of USTP, including its acceptable use, data
                    protection, and records management policies. Where these
                    Terms conflict with university policy, university policy
                    prevails.
                </p>
            </LegalSection>

            <LegalSection title="7. Intellectual Property">
                <p>
                    The System, its design, and its original content are the
                    property of USTP Balubal Campus. Content you submit
                    (requests, reports, bookings) remains yours but you grant
                    the university a license to process it for legitimate campus
                    operations.
                </p>
            </LegalSection>

            <LegalSection title="8. Disclaimer and Limitation of Liability">
                <p>
                    The System is provided on an "as is" and "as available"
                    basis without warranties of any kind. To the fullest extent
                    permitted by law, USTP Balubal Campus shall not be liable
                    for any indirect, incidental, or consequential damages
                    arising from your use of, or inability to use, the System.
                </p>
            </LegalSection>

            <LegalSection title="9. Changes to These Terms">
                <p>
                    We may update these Terms from time to time. Continued use
                    of the System after changes take effect constitutes
                    acceptance of the revised Terms. The "Last updated" date at
                    the top of this page reflects the latest revision.
                </p>
            </LegalSection>

            <LegalSection title="10. Contact Us">
                <p>
                    Questions about these Terms may be directed to the ICT
                    Office, USTP Balubal Campus, or through the contact details
                    published on the university website.
                </p>
            </LegalSection>
        </LegalPage>
    );
}
