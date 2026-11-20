import { Head } from '@inertiajs/react';
import {
    ArrowLeft,
    BookOpen,
    ChevronDown,
    FileText,
    Scale,
} from 'lucide-react';
import { Children, isValidElement } from 'react';
import type { ReactNode } from 'react';
import ustpLogo from '@/assets/ustp-logo.png';
import TextLink from '@/components/text-link';
import { register } from '@/routes';

type LegalPageProps = {
    title: string;
    updated: string;
    children: ReactNode;
};

type LegalSectionItem = {
    title: string;
    id: string;
};

export function legalSectionId(title: string): string {
    return title
        .toLowerCase()
        .replace(/^\d+\.\s*/, '')
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

function sectionHeading(title: string): string {
    return title.replace(/^\d+\.\s*/, '');
}

export default function LegalPage({
    title,
    updated,
    children,
}: LegalPageProps) {
    const sections: LegalSectionItem[] = Children.toArray(children).flatMap(
        (child) => {
            if (!isValidElement<{ title?: string }>(child)) {
                return [];
            }

            const sectionTitle = child.props.title;

            if (!sectionTitle) {
                return [];
            }

            return [
                {
                    title: sectionTitle,
                    id: legalSectionId(sectionTitle),
                },
            ];
        },
    );

    return (
        <div className="min-h-screen scroll-smooth bg-[#f6f4ee] text-foreground dark:bg-background">
            <Head title={title} />

            <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-white p-1 shadow-sm">
                            <img
                                src={ustpLogo}
                                alt="USTP logo"
                                className="size-full object-contain"
                            />
                        </span>
                        <span className="min-w-0 leading-tight">
                            <span className="block text-sm font-bold tracking-tight text-ustp-navy dark:text-white">
                                WBIMIS
                            </span>
                            <span className="hidden text-xs text-muted-foreground sm:block">
                                USTP Balubal ICT Portal
                            </span>
                        </span>
                    </div>

                    <TextLink
                        href={register()}
                        className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-background px-3.5 py-2 text-xs font-semibold whitespace-nowrap text-ustp-navy shadow-sm transition-colors hover:border-ustp-gold hover:bg-ustp-gold/10 hover:no-underline dark:text-white dark:hover:bg-white/10"
                    >
                        <ArrowLeft className="size-3.5" />
                        <span className="hidden sm:inline">
                            Back to registration
                        </span>
                        <span className="sm:hidden">Back</span>
                    </TextLink>
                </div>
            </header>

            <main>
                <section className="relative overflow-hidden bg-ustp-navy text-white">
                    <div className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full border border-white/10" />
                    <div className="pointer-events-none absolute -bottom-28 -left-10 size-64 rounded-full bg-ustp-gold/10 blur-2xl" />

                    <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14">
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-white/80 uppercase">
                            <Scale className="size-3.5 text-ustp-gold" />
                            Legal and Compliance
                        </span>

                        <h1 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight text-balance md:text-4xl">
                            {title}
                        </h1>

                        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/70">
                            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5">
                                <FileText className="size-3.5 text-ustp-gold" />
                                Last updated: {updated}
                            </span>
                            <span>USTP Balubal Campus</span>
                        </div>
                    </div>
                </section>

                <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:py-10">
                    <aside className="hidden lg:block">
                        <div className="sticky top-24 rounded-2xl border border-border bg-card p-5 shadow-sm">
                            <p className="flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">
                                <BookOpen className="size-4 text-ustp-navy dark:text-ustp-gold" />
                                On this page
                            </p>

                            <nav className="mt-4 flex flex-col gap-0.5">
                                {sections.map((section, index) => (
                                    <a
                                        key={section.id}
                                        href={`#${section.id}`}
                                        className="group flex items-start gap-3 rounded-lg px-2.5 py-2 text-sm leading-snug text-muted-foreground transition-colors hover:bg-muted hover:text-foreground hover:no-underline"
                                    >
                                        <span className="mt-0.5 font-mono text-[10px] font-semibold text-ustp-gold">
                                            {String(index + 1).padStart(2, '0')}
                                        </span>
                                        <span>
                                            {sectionHeading(section.title)}
                                        </span>
                                    </a>
                                ))}
                            </nav>
                        </div>
                    </aside>

                    <div className="min-w-0">
                        <details className="group mb-5 rounded-2xl border border-border bg-card p-4 shadow-sm lg:hidden">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase [&::-webkit-details-marker]:hidden">
                                <span className="flex items-center gap-2">
                                    <BookOpen className="size-4 text-ustp-navy dark:text-ustp-gold" />
                                    On this page
                                </span>
                                <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                            </summary>

                            <nav className="mt-3 grid gap-1 border-t border-border pt-3 sm:grid-cols-2">
                                {sections.map((section, index) => (
                                    <a
                                        key={section.id}
                                        href={`#${section.id}`}
                                        className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground hover:no-underline"
                                    >
                                        <span className="mt-0.5 font-mono text-[10px] font-semibold text-ustp-gold">
                                            {String(index + 1).padStart(2, '0')}
                                        </span>
                                        {sectionHeading(section.title)}
                                    </a>
                                ))}
                            </nav>
                        </details>

                        <article className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8 md:p-10">
                            <div className="mb-8 flex items-center gap-3 border-b border-border pb-6">
                                <span className="flex size-10 items-center justify-center rounded-xl bg-ustp-gold/15 text-ustp-navy dark:text-ustp-gold">
                                    <Scale className="size-5" />
                                </span>
                                <div>
                                    <p className="text-sm font-semibold text-foreground">
                                        {title}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Please read this document carefully.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-8">
                                {children}
                            </div>
                        </article>

                        <div className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
                            <p className="text-sm font-semibold text-foreground">
                                Questions about this document?
                            </p>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                                Contact the ICT Office at USTP Balubal Campus
                                for clarification.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export function LegalSection({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    const number = title.match(/^(\d+)\./)?.[1];

    return (
        <section
            id={legalSectionId(title)}
            className="scroll-mt-24 border-b border-border/70 pb-8 last:border-0 last:pb-0"
        >
            <div className="flex items-start gap-4">
                {number && (
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted font-mono text-[11px] font-bold text-ustp-navy ring-1 ring-border dark:text-ustp-gold">
                        {number.padStart(2, '0')}
                    </span>
                )}

                <div className="min-w-0 flex-1">
                    <h2 className="text-base font-bold text-foreground md:text-lg">
                        {sectionHeading(title)}
                    </h2>

                    <div className="mt-2 flex flex-col gap-3 text-[15px] leading-7 text-muted-foreground [&_strong]:font-semibold [&_strong]:text-foreground">
                        {children}
                    </div>
                </div>
            </div>
        </section>
    );
}
