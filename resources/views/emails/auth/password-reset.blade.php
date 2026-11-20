<x-emails.branded-layout
    title="Reset your password"
    :preheader="'Use this secure link to choose a new ' . $appName . ' password.'"
    eyebrow="Account security"
>
    <p style="margin: 0 0 14px;">Hi {{ $name }},</p>

    <p style="margin: 0 0 22px;">
        We received a request to reset the password for your
        <strong style="color: #1a1851;">{{ $appName }}</strong> account.
        Click the button below to choose a new password.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td align="center" bgcolor="#fcb315" style="border-radius: 8px;">
                <a href="{{ $resetUrl }}" style="display: inline-block; padding: 13px 24px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: 700; color: #1a1851; text-decoration: none; border-radius: 8px;">
                    Reset my password
                </a>
            </td>
        </tr>
    </table>

    <p style="margin: 18px 0 0; font-size: 13px; color: #6b7280;">
        This link expires in <strong style="color: #1a1851;">{{ $expiresInMinutes }} minutes</strong>.
    </p>

    <p style="margin: 22px 0 8px; font-size: 13px; color: #6b7280;">
        If the button does not work, copy and paste this address into your browser:
    </p>

    <p style="margin: 0; padding: 12px 14px; background-color: #faf8f3; border: 1px solid #ece7dc; border-radius: 8px; font-family: 'Courier New', Consolas, monospace; font-size: 12px; line-height: 18px; word-break: break-all; color: #4b5563;">
        {{ $resetUrl }}
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px;">
        <tr>
            <td style="border-left: 3px solid #fcb315; background-color: #fffaf0; padding: 12px 14px;">
                <p style="margin: 0; font-size: 13px; line-height: 20px; color: #6b4a00;">
                    If you did not request a password reset, you can safely ignore this email. Your password will not change.
                </p>
            </td>
        </tr>
    </table>

    <p style="margin: 22px 0 0; padding-top: 20px; border-top: 1px solid #ece7dc; font-size: 13px; color: #6b7280;">
        Thanks,<br>
        <strong style="color: #1a1851;">{{ $appName }} ICT Team</strong>
    </p>
</x-emails.branded-layout>
