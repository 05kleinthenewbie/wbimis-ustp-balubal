<x-emails.branded-layout
    title="Your account is approved"
    :preheader="'Your ' . $appName . ' account is now ready to use.'"
    eyebrow="Account status"
>
    <p style="margin: 0 0 14px;">Hi {{ $name }},</p>

    <p style="margin: 0 0 18px;">
        Good news. Your account at
        <strong style="color: #1a1851;">{{ $appName }}</strong> has been reviewed and approved by the ICT Office.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 22px;">
        <tr>
            <td bgcolor="#faf8f3" style="border: 1px solid #e7dfc6; border-radius: 999px; padding: 7px 14px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; color: #7a5300; text-transform: uppercase;">
                Approved account
            </td>
        </tr>
    </table>

    <p style="margin: 0 0 22px;">
        You can now sign in and submit service requests, facility bookings, and incident reports through the portal.
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

    <p style="margin: 22px 0 0; padding-top: 20px; border-top: 1px solid #ece7dc; font-size: 13px; color: #6b7280;">
        Thanks,<br>
        <strong style="color: #1a1851;">{{ $appName }} ICT Team</strong>
    </p>
</x-emails.branded-layout>
