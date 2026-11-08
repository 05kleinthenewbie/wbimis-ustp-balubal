<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Your {{ $appName }} verification code</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <h2>Hi, {{ $name }}!</h2>
    <p>Use the verification code below to finish creating your <strong>{{ $appName }}</strong> account:</p>
    <p style="font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #4f46e5;">{{ $code }}</p>
    <p>This code expires in {{ $expiresInMinutes }} minutes. If you did not request it, you can safely ignore this email.</p>
    <p>Thanks,<br>{{ $appName }} ICT Team</p>
</body>
</html>
