import type { PropsWithChildren } from 'react';

export default function SettingsLayout({ children }: PropsWithChildren) {
    return (
        <div className="min-h-full flex-1 bg-slate-50 p-4 text-slate-800 md:p-6 lg:p-8">
            <section className="mx-auto max-w-6xl space-y-8">
                {children}
            </section>
        </div>
    );
}
