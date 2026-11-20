<x-emails.branded-layout
    title="Verify your email address"
    :preheader="'Your ' . $appName . ' verification code expires in ' . $expiresInMinutes . ' minutes.'"
    eyebrow="Account verification"
>
    <p style="margin: 0 0 14px;">Hi {{ $name }},</p>

    <p style="margin: 0 0 22px;">
        You are almost done creating your <strong style="color: #1a1851;">{{ $appName }}</strong> account.
        Enter the verification code below to confirm your email address.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td align="center" bgcolor="#faf8f3" style="background-color: #faf8f3; border: 1px solid #e7dfc6; border-radius: 12px; padding: 22px 16px;">
                <div style="font-family: 'Courier New', Consolas, monospace; font-size: 34px; line-height: 42px; font-weight: 700; letter-spacing: 10px; color: #1a1851;">
                    {{ $code }}
                </div>
            </td>
        </tr>
    </table>

    <p style="margin: 18px 0 0; text-align: center; font-size: 13px; color: #6b7280;">
        This code expires in <strong style="color: #1a1851;">{{ $expiresInMinutes }} minutes</strong>.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px;">
        <tr>
            <td style="border-left: 3px solid #fcb315; background-color: #fffaf0; padding: 12px 14px;">
                <p style="margin: 0; font-size: 13px; line-height: 20px; color: #6b4a00;">
                    For your security, do not share this code with anyone. The ICT Office will never ask for your verification code.
                </p>
            </td>
        </tr>
    </table>

    <p style="margin: 22px 0 0;">
        If you did not request this code, you can safely ignore this email.
    </p>

    <p style="margin: 22px 0 0; padding-top: 20px; border-top: 1px solid #ece7dc; font-size: 13px; color: #6b7280;">
        Thanks,<br>
        <strong style="color: #1a1851;">{{ $appName }} ICT Team</strong>
    </p>
</x-emails.branded-layout>
