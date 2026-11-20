<x-emails.branded-layout
    :title="$isApproved ? 'Welcome to WBIMIS' : 'Registration received'"
    :preheader="$isApproved ? 'Your account is approved and ready to use.' : 'Your registration is pending approval.'"
    eyebrow="Account registration"
>
    <p style="margin: 0 0 14px;">Hi {{ $name }},</p>

    <p style="margin: 0 0 20px;">
        Thank you for registering at
        <strong style="color: #1a1851;">{{ $appName }}</strong>.
    </p>

    @if ($isApproved)
        <p style="margin: 0 0 20px;">
            Your account is <strong style="color: #1a1851;">approved and ready</strong>. You can sign in right away.
        </p>

        <p style="margin: 0 0 10px; font-weight: 700; color: #1a1851;">
            What you can do now
        </p>

        <ol style="margin: 0 0 24px; padding-left: 20px; color: #4b5563;">
            <li style="margin-bottom: 6px;">Sign in to your account.</li>
            <li>Submit service requests, facility bookings, and incident reports.</li>
        </ol>
    @else
        <p style="margin: 0 0 20px;">
            Your account is currently <strong style="color: #1a1851;">pending approval</strong>. The ICT admin team will review your registration shortly.
        </p>

        <p style="margin: 0 0 10px; font-weight: 700; color: #1a1851;">
            What happens next
        </p>

        <ol style="margin: 0 0 24px; padding-left: 20px; color: #4b5563;">
            <li style="margin-bottom: 6px;">Wait for the ICT Office to approve your account.</li>
            <li>Once approved, sign in and submit service requests, bookings, and incident reports.</li>
        </ol>
    @endif

    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td align="center" bgcolor="#fcb315" style="border-radius: 8px;">
                <a href="{{ $loginUrl }}" style="display: inline-block; padding: 13px 24px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: 700; color: #1a1851; text-decoration: none; border-radius: 8px;">
                    Go to sign in
                </a>
            </td>
        </tr>
    </table>

    <p style="margin: 22px 0 0; padding-top: 20px; border-top: 1px solid #ece7dc; font-size: 13px; color: #6b7280;">
        Thanks,<br>
        <strong style="color: #1a1851;">{{ $appName }} ICT Team</strong>
    </p>
</x-emails.branded-layout>
