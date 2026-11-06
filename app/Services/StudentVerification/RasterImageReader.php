<?php

namespace App\Services\StudentVerification;

/**
 * Converts uploaded image bytes into a luminance matrix the QR decoder can
 * work with. When the GD extension is available it handles every format;
 * otherwise a built-in, standards-compliant PNG sampler covers PNG uploads
 * without native dependencies. Returns null for any image it cannot read.
 *
 * @phpstan-type LuminanceMap array{width: int, height: int, luminances: array<int, int>}
 */
final class RasterImageReader
{
    private const PNG_SIGNATURE = "\x89PNG\r\n\x1a\n";

    /**
     * @return LuminanceMap|null
     */
    public function luminances(string $bytes, int $maxPixels): ?array
    {
        $dimensions = @getimagesizefromstring($bytes);
        if ($dimensions === false || $maxPixels < $dimensions[0] * $dimensions[1]) {
            return null;
        }
        if (function_exists('imagecreatefromstring')) {
            $image = @imagecreatefromstring($bytes);

            if ($image instanceof \GdImage) {
                try {
                    $wide = (int) imagesx($image);
                    $tall = (int) imagesy($image);

                    if ($wide * $tall > $maxPixels) {
                        return null;
                    }

                    $luminances = [];
                    $index = 0;

                    for ($y = 0; $y < $tall; $y++) {
                        for ($x = 0; $x < $wide; $x++) {
                            $argb = (int) imagecolorat($image, $x, $y);
                            $r = ($argb >> 16) & 0xFF;
                            $g = ($argb >> 8) & 0xFF;
                            $b = $argb & 0xFF;
                            $luminances[$index++] = self::luminance($r, $g, $b);
                        }
                    }

                    return ['width' => $wide, 'height' => $tall, 'luminances' => $luminances];
                } finally {
                    imagedestroy($image);
                }
            }
        }

        if (str_starts_with($bytes, self::PNG_SIGNATURE)) {
            return $this->luminancesFromPng($bytes, $maxPixels);
        }

        return null;
    }

    /**
     * Decode a non-interlaced PNG into luminance samples. Handles grayscale,
     * RGB, palette and alpha variants at bit depths 1-16.
     *
     * @return LuminanceMap|null
     */
    private function luminancesFromPng(string $bytes, int $maxPixels): ?array
    {
        try {
            $header = $this->pngHeader($bytes);

            if ($header === null || $header['interlace'] !== 0 || $maxPixels < $header['width'] * $header['height']) {
                return null;
            }

            $width = $header['width'];
            $height = $header['height'];
            $depth = $header['depth'];
            $colorType = $header['colorType'];

            if (! in_array($colorType, [0, 2, 3, 4, 6], true)) {
                return null;
            }

            if (in_array($colorType, [2, 4, 6], true) && ! in_array($depth, [8, 16], true)) {
                return null;
            }

            $channels = match ($colorType) {
                0, 3 => 1, 2 => 3, 4 => 2, 6 => 4
            };
            $scanlineLength = (int) ceil($width * $channels * $depth / 8);
            $raw = $this->inflateIdat($bytes, $height * ($scanlineLength + 1));

            if ($raw === null || strlen($raw) < $height * ($scanlineLength + 1)) {
                return null;
            }

            $bpp = max(1, (int) ceil($channels * $depth / 8));

            $luminances = [];
            $index = 0;
            $previous = str_repeat("\x00", $scanlineLength);
            $offset = 0;

            for ($y = 0; $y < $height; $y++) {
                $filter = ord($raw[$offset]);
                $row = substr($raw, $offset + 1, $scanlineLength);
                $offset += $scanlineLength + 1;

                if (strlen($row) < $scanlineLength) {
                    return null;
                }

                if ($filter > 4) {
                    return null;
                }

                $recon = str_repeat("\x00", $scanlineLength);

                for ($i = 0; $i < $scanlineLength; $i++) {
                    $x = ord($row[$i]);
                    $a = $i >= $bpp ? ord($recon[$i - $bpp]) : 0;
                    $b = ord($previous[$i]);
                    $c = $i >= $bpp ? ord($previous[$i - $bpp]) : 0;

                    $recon[$i] = chr((match ($filter) {
                        1 => $x + $a,
                        2 => $x + $b,
                        3 => $x + intdiv($a + $b, 2),
                        4 => $x + self::paeth($a, $b, $c),
                        default => $x,
                    }) & 0xFF);
                }

                $previous = $recon;
                $this->sampleRow($recon, $colorType, $depth, $width, $header['palette'], $header['transparency'], $luminances, $index);
            }

            return ['width' => $width, 'height' => $height, 'luminances' => $luminances];
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * @return array{width: int, height: int, depth: int, colorType: int, palette: string|null, transparency: string|null, interlace: int}|null
     */
    private function pngHeader(string $bytes): ?array
    {
        $position = 8;
        $ihdr = null;
        $palette = null;
        $transparency = null;
        $total = strlen($bytes);

        while ($position + 8 <= $total) {
            $chunk = unpack('Nlength', substr($bytes, $position, 4));
            if ($chunk === false || $position + 12 + $chunk['length'] > $total) {
                return null;
            }
            $length = $chunk['length'];
            $type = (string) substr($bytes, $position + 4, 4);
            $payload = (string) substr($bytes, $position + 8, $length);
            $position += 12 + $length;

            if ($type === 'IHDR') {
                if ($length < 13) {
                    return null;
                }
                $ihdr = unpack('Nwidth/Nheight/Cdepth/CcolorType/Ccompression/Cfilter/Cinterlace', $payload);
            } elseif ($type === 'PLTE') {
                $palette = $payload;
            } elseif ($type === 'tRNS') {
                $transparency = $payload;
            } elseif ($type === 'IEND') {
                break;
            }
        }

        if (! is_array($ihdr) || ! isset($ihdr['width'], $ihdr['height'], $ihdr['depth'], $ihdr['colorType'], $ihdr['interlace'])) {
            return null;
        }

        $width = (int) $ihdr['width'];
        $height = (int) $ihdr['height'];
        $depth = (int) $ihdr['depth'];
        $colorType = (int) $ihdr['colorType'];

        if (min($width, $height) === 0 || ! in_array($depth, [1, 2, 4, 8, 16], true)) {
            return null;
        }

        if ($colorType === 3 && $palette === null) {
            return null;
        }

        return [
            'width' => $width,
            'height' => $height,
            'depth' => $depth,
            'colorType' => $colorType,
            'palette' => $palette,
            'transparency' => $transparency,
            'interlace' => (int) $ihdr['interlace'],
        ];
    }

    private function inflateIdat(string $bytes, int $maximum): ?string
    {
        $idat = [];
        $position = 8;
        $total = strlen($bytes);

        while ($position + 8 <= $total) {
            $chunk = unpack('Nlength', substr($bytes, $position, 4));
            if ($chunk === false || $position + 12 + $chunk['length'] > $total) {
                return null;
            }
            $length = $chunk['length'];
            $type = (string) substr($bytes, $position + 4, 4);
            $payload = (string) substr($bytes, $position + 8, $length);

            if ($type === 'IDAT') {
                $idat[] = $payload;
            } elseif ($type === 'IEND') {
                break;
            }

            $position += 12 + $length;
        }

        if ($idat === []) {
            return null;
        }

        $decoded = @gzuncompress(implode('', $idat), $maximum);

        return $decoded === false ? null : $decoded;

    }

    private static function paeth(int $a, int $b, int $c): int
    {
        $p = $a + $b - $c;
        $pa = abs($p - $a);
        $pb = abs($p - $b);
        $pc = abs($p - $c);

        if ($pa <= $pb && $pa <= $pc) {
            return $a;
        }

        return $pb <= $pc ? $b : $c;
    }

    /**
     * Convert one reconstructed scanline into luminance values, compositing
     * transparent pixels onto white as they go.
     *
     * @param  array<int, int>  $luminances
     */
    private function sampleRow(string $row, int $colorType, int $depth, int $width, ?string $palette, ?string $transparency, array &$luminances, int &$index): void
    {
        for ($x = 0; $x < $width; $x++) {
            switch ($colorType) {
                case 0:
                    $raw = $this->component($row, $this->bitOffset($x, 0, $depth), $depth);
                    $value = $depth === 8 || $depth === 16 ? $raw : (int) round($raw * 255 / ((1 << $depth) - 1));

                    if ($transparency !== null && strlen($transparency) >= 1) {
                        $key = ord($transparency[0]);
                        if ($value === $key) {
                            $luminances[$index++] = 255;

                            continue 2;
                        }
                    }
                    $luminances[$index++] = $value;

                    break;

                case 2:
                    $offset = $x * (3 * $depth);
                    $r = $this->component($row, $offset, $depth);
                    $g = $this->component($row, $offset + $depth, $depth);
                    $b = $this->component($row, $offset + 2 * $depth, $depth);
                    $luminances[$index++] = self::luminance($r, $g, $b);

                    break;

                case 3:
                    $pixel = $this->component($row, $x * $depth, $depth);
                    $rgb = substr((string) $palette, $pixel * 3, 3);
                    $r = ord($rgb[0]);
                    $g = ord($rgb[1]);
                    $b = ord($rgb[2]);
                    $alpha = $transparency !== null && strlen($transparency) > $pixel ? ord($transparency[$pixel]) : 255;
                    $luminances[$index++] = self::composite($r, $g, $b, $alpha);

                    break;

                case 4:
                    $offset = $x * (2 * $depth);
                    $value = $this->component($row, $offset, $depth);
                    $alpha = $this->component($row, $offset + $depth, $depth);
                    $composite = (int) round($value * $alpha / 255 + 255 - $alpha);
                    $luminances[$index++] = $composite;

                    break;

                default:
                    $offset = $x * (4 * $depth);
                    $r = $this->component($row, $offset, $depth);
                    $g = $this->component($row, $offset + $depth, $depth);
                    $b = $this->component($row, $offset + 2 * $depth, $depth);
                    $a = $this->component($row, $offset + 3 * $depth, $depth);
                    $luminances[$index++] = self::composite($r, $g, $b, $a);
            }
        }
    }

    private static function composite(int $r, int $g, int $b, int $alpha): int
    {
        if ($alpha >= 255) {
            return self::luminance($r, $g, $b);
        }

        return self::luminance(
            (int) round($r * $alpha / 255 + 255 - $alpha),
            (int) round($g * $alpha / 255 + 255 - $alpha),
            (int) round($b * $alpha / 255 + 255 - $alpha),
        );
    }

    private function bitOffset(int $x, int $channel, int $depth): int
    {
        return ($x + $channel) * $depth;
    }

    /**
     * Big-endian component sample at a bit offset; 16-bit inputs take the
     * high byte. Palette indexes and grayscale scaling happen at call sites.
     */
    private function component(string $bytes, int $bitOffset, int $depth): int
    {
        if ($depth === 8 || $depth === 16) {
            return ord($bytes[intdiv($bitOffset, 8)] ?? "\x00");
        }

        $byte = ord($bytes[intdiv($bitOffset, 8)] ?? "\x00");
        $shift = 8 - ($bitOffset % 8) - $depth;

        return ($byte >> max(0, $shift)) & ((1 << $depth) - 1);
    }

    private static function luminance(int $r, int $g, int $b): int
    {
        return (306 * $r + 601 * $g + 117 * $b) >> 10;
    }
}
