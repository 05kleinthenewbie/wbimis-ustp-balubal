<?php

namespace App\Services\StudentVerification;

use Zxing\BinaryBitmap;
use Zxing\Common\HybridBinarizer;
use Zxing\Qrcode\QRCodeReader;
use Zxing\RGBLuminanceSource;

/**
 * Decodes the QR code on an uploaded USTP student ID image and parses the
 * plain-text payload into structured student information.
 */
final class StudentIdQrDecoder
{
    public function __construct(
        private RasterImageReader $raster,
        private QrPayloadParser $parser,
    ) {}

    /**
     * @return array{
     *     decoded: bool,
     *     payload: array{name: string, student_number: string, course: string}|null,
     *     error: string|null,
     * }
     */
    public function decode(string $bytes): array
    {
        $maxPixels = (int) config('student-verification.qr.max_image_pixels', 6000000);
        $image = $this->raster->luminances($bytes, $maxPixels);

        if ($image === null) {
            return self::failure('image_unreadable');
        }

        $luminances = $image['luminances'];

        try {
            $source = new RGBLuminanceSource($luminances, $image['width'], $image['height'], 0, 0, $image['width'], $image['height']);
            $bitmap = new BinaryBitmap(new HybridBinarizer($source));
            $reader = new QRCodeReader;
            $payload = (string) $reader->decode($bitmap)->getText();
        } catch (\Throwable) {
            return self::failure('qr_not_found');
        }

        $parsed = $this->parser->parse($payload);

        if ($parsed === null) {
            return self::failure('qr_payload_unrecognized');
        }

        return ['decoded' => true, 'payload' => $parsed, 'error' => null];
    }

    /**
     * @return array{decoded: false, payload: null, error: string}
     */
    private static function failure(string $error): array
    {
        return ['decoded' => false, 'payload' => null, 'error' => $error];
    }
}
