<x-emails.branded-layout
    :title="$approved ? 'Student registration approved' : 'Action needed on your registration'"
    :preheader="$approved ? 'Your student account is approved and ready to use.' : 'The ICT Office needs your attention before your account can be approved.'"
    eyebrow="Student registration"
>
    <p style="margin: 0 0 14px;">Hi {{ $name }},</p>

    @if ($approved)
        <p style="margin: 0 0 18px;">
            Your student account at
            <strong style="color: #1a1851;">{{ $appName }}</strong> has been approved. You can now sign in and use the portal.
        </p>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
                <td align="center" bgcolor="#fcb315" style="border-radius: 8px;">
                    <a href="{{ $loginUrl }}" style="display: inline-block; padding: 13px 24px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: 700; color: #1a1851; text-decoration: none; border-radius: 8px;">
                        Sign in to WBIMIS
                    </a>
                </td>
            </tr>
        </table>
    @else
        <p style="margin: 0 0 18px;">
            Your student registration at
            <strong style="color: #1a1851;">{{ $appName }}</strong> needs attention before it can be approved.
        </p>

        @if ($reason)
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
                <tr>
                    <td style="border-left: 3px solid #fcb315; background-color: #fffaf0; padding: 12px 14px;">
                        <p style="margin: 0; font-size: 13px; line-height: 20px; color: #6b4a00;">
                            {{ $reason }}
                        </p>
                    </td>
                </tr>
            </table>
        @endif

        <p style="margin: 0;">
            Please contact the ICT Office at USTP Balubal Campus for next steps.
        </p>
    @endif

    <p style="margin: 22px 0 0; padding-top: 20px; border-top: 1px solid #ece7dc; font-size: 13px; color: #6b7280;">
        Thanks,<br>
        <strong style="color: #1a1851;">{{ $appName }} ICT Team</strong>
    </p>
</x-emails.branded-layout>
