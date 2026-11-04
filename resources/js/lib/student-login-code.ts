export type LoginScanResult =
    | { type: 'login'; code: string }
    | { type: 'student_id'; idNumber: string }
    | { type: 'unsupported' };

export type LoginCodeGraphic = {
    width: number;
    height: number;
    path: string;
};

export function classifyLoginScan(value: string): LoginScanResult {
    const text = value.trim();

    if (/^WBIMIS:[A-Za-z0-9]{32}$/.test(text)) {
        return { type: 'login', code: text };
    }

    if (/^[0-9]{10}$/.test(text)) {
        return { type: 'student_id', idNumber: text };
    }

    return { type: 'unsupported' };
}

export async function createLoginCodeGraphics(code: string): Promise<{
    qr: LoginCodeGraphic;
    barcode: LoginCodeGraphic;
}> {
    if (classifyLoginScan(code).type !== 'login') {
        throw new Error('Invalid login code.');
    }

    const [{ QRCodeWriter, BarcodeFormat }, { default: JsBarcode }] =
        await Promise.all([import('@zxing/library'), import('jsbarcode')]);
    const matrix = new QRCodeWriter().encode(
        code,
        BarcodeFormat.QR_CODE,
        256,
        256,
        new Map(),
    );
    let qrPath = '';

    for (let y = 0; y < matrix.getHeight(); y++) {
        for (let x = 0; x < matrix.getWidth(); x++) {
            if (!matrix.get(x, y)) {
                continue;
            }

            const start = x;

            while (x + 1 < matrix.getWidth() && matrix.get(x + 1, y)) {
                x++;
            }

            const width = x - start + 1;
            qrPath += `M${start} ${y}h${width}v1h-${width}z`;
        }
    }

    const target: { encodings?: { data: string }[] } = {};
    JsBarcode(target, code, { format: 'CODE128', displayValue: false });
    const bits = target.encodings?.map((entry) => entry.data).join('') ?? '';

    if (!bits) {
        throw new Error('Could not create the barcode.');
    }

    let barcodePath = '';

    for (let x = 0; x < bits.length; x++) {
        if (bits[x] !== '1') {
            continue;
        }

        const start = x;

        while (x + 1 < bits.length && bits[x + 1] === '1') {
            x++;
        }

        const width = x - start + 1;
        barcodePath += `M${start + 20} 10h${width}v100h-${width}z`;
    }

    return {
        qr: {
            width: matrix.getWidth(),
            height: matrix.getHeight(),
            path: qrPath,
        },
        barcode: { width: bits.length + 40, height: 120, path: barcodePath },
    };
}
