import ustpLogo from '@/assets/ustp-logo.png';

export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-white p-1 shadow-sm">
                <img
                    src={ustpLogo}
                    alt="USTP Logo"
                    className="size-full object-contain"
                />
            </div>
            <div className="ml-2.5 grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold tracking-tight text-white">
                    USTP Balubal
                </span>
                <span className="truncate text-[10px] font-medium tracking-[0.16em] text-ustp-gold uppercase">
                    ICT Portal
                </span>
            </div>
        </>
    );
}
