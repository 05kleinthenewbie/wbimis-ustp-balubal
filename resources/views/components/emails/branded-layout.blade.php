@props([
    'title' => 'WBIMIS',
    'preheader' => '',
    'eyebrow' => 'USTP Balubal ICT Portal',
])

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>{{ $title }}</title>
    <style>
        @media only screen and (max-width: 620px) {
            .wbimis-shell {
                width: 100% !important;
            }

            .wbimis-pad {
                padding-left: 20px !important;
                padding-right: 20px !important;
            }

            .wbimis-title {
                font-size: 24px !important;
                line-height: 32px !important;
            }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f0e8;">
    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">
        {{ $preheader }}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f0e8;">
        <tr>
            <td align="center" style="padding: 28px 12px;">
                <table role="presentation" class="wbimis-shell" width="600" cellpadding="0" cellspacing="0" border="0" style="width: 600px; max-width: 600px; border-collapse: collapse;">
                    <tr>
                        <td bgcolor="#1a1851" style="background-color: #1a1851; border-radius: 14px 14px 0 0; padding: 24px 28px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="left" valign="middle">
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td valign="middle" style="padding-right: 12px;">
                                                    <img src="{{ asset('images/ustp-logo-email.png') }}" width="42" height="42" alt="USTP logo" style="display: block; width: 42px; height: 42px; border: 0; border-radius: 8px; background-color: #ffffff;">
                                                </td>
                                                <td valign="middle">
                                                    <div style="font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: 700; letter-spacing: 0.2px; color: #ffffff;">
                                                        WBIMIS
                                                    </div>
                                                    <div style="margin-top: 2px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #d7d5e8;">
                                                        USTP Balubal ICT Portal
                                                    </div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                    <td align="right" valign="middle">
                                        <span style="display: inline-block; padding: 6px 10px; border: 1px solid rgba(252, 179, 21, 0.45); border-radius: 999px; font-family: Arial, Helvetica, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; color: #fcb315; text-transform: uppercase;">
                                            Official Notice
                                        </span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td bgcolor="#fcb315" style="height: 4px; background-color: #fcb315; font-size: 0; line-height: 0;">
                            &nbsp;
                        </td>
                    </tr>

                    <tr>
                        <td class="wbimis-pad" bgcolor="#ffffff" style="background-color: #ffffff; padding: 32px 40px 12px;">
                            <p style="margin: 0 0 10px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.16em; color: #9a6b00; text-transform: uppercase;">
                                {{ $eyebrow }}
                            </p>

                            <h1 class="wbimis-title" style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 28px; line-height: 36px; font-weight: 700; letter-spacing: -0.4px; color: #1a1851;">
                                {{ $title }}
                            </h1>

                            <div style="padding-top: 18px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 24px; color: #4b5563;">
                                {{ $slot }}
                            </div>
                        </td>
                    </tr>

                    <tr>
                        <td class="wbimis-pad" bgcolor="#ffffff" style="background-color: #ffffff; border-radius: 0 0 14px 14px; padding: 8px 40px 30px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top: 1px solid #ece7dc;">
                                <tr>
                                    <td style="padding-top: 20px; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 19px; color: #7b7f8a;">
                                        <p style="margin: 0 0 4px; font-weight: 700; color: #1a1851;">
                                            WBIMIS ICT Office
                                        </p>
                                        <p style="margin: 0;">
                                            University of Science and Technology of Southern Philippines
                                        </p>
                                        <p style="margin: 0;">
                                            Balubal Campus, Cagayan de Oro City
                                        </p>
                                        <p style="margin: 12px 0 0; font-size: 11px; color: #9ca3af;">
                                            This is an automated message. Please do not reply to this email.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>

                <p style="margin: 16px 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #8a8f99;">
                    &copy; {{ date('Y') }} USTP Balubal Campus. All rights reserved.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
