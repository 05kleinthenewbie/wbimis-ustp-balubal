import { Link } from '@inertiajs/react';
import { Palette, ShieldIcon, UserIcon } from 'lucide-react';
import { useState } from 'react';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit as editProfile } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';

const sections = [
    {
        icon: UserIcon,
        label: 'Account',
        links: [{ label: 'Profile', href: editProfile() }],
        value: 'account',
    },
    {
        icon: ShieldIcon,
        label: 'Security',
        links: [{ label: 'Password', href: editSecurity() }],
        value: 'security',
    },
    {
        icon: Palette,
        label: 'Appearance',
        links: [{ label: 'Theme', href: editAppearance() }],
        value: 'appearance',
    },
];

export function SettingsSidebarAccordion() {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    const activeValue =
        sections.find((section) =>
            section.links.some((link) => isCurrentOrParentUrl(link.href)),
        )?.value ?? 'account';

    const [open, setOpen] = useState<string[]>([activeValue]);

    const openSections = open.includes(activeValue)
        ? open
        : [...open, activeValue];

    const toggle = (value: string, isOpen: boolean) =>
        setOpen((prev) =>
            isOpen
                ? [...new Set([...prev, value])]
                : prev.filter((v) => v !== value),
        );

    return (
        <div className="mx-auto w-full max-w-xs lg:mx-0">
            <p className="mb-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Settings
            </p>
            {sections.map(({ icon: Icon, label, value, links }) => (
                <Collapsible
                    key={value}
                    open={openSections.includes(value)}
                    onOpenChange={(isOpen) => toggle(value, isOpen)}
                >
                    <CollapsibleTrigger className="flex w-full items-center rounded-md px-2 py-2 hover:bg-accent hover:no-underline">
                        <div className="flex w-full items-center gap-2.5">
                            <Icon className="size-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{label}</span>
                            <svg
                                className={cn(
                                    'ml-auto size-4 shrink-0 text-muted-foreground transition-transform duration-200',
                                    openSections.includes(value) &&
                                        'rotate-180',
                                )}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="m6 9 6 6 6-6" />
                            </svg>
                        </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pb-1">
                        <ul className="ml-6 flex flex-col gap-0.5 border-l pl-3">
                            {links.map((link) => {
                                const active = isCurrentOrParentUrl(link.href);

                                return (
                                    <li key={toUrl(link.href)}>
                                        <Link
                                            className={cn(
                                                'block rounded-sm py-1.5 text-sm transition-colors',
                                                active
                                                    ? 'font-medium text-foreground'
                                                    : 'text-muted-foreground hover:text-foreground',
                                            )}
                                            href={link.href}
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </CollapsibleContent>
                </Collapsible>
            ))}
        </div>
    );
}

export default SettingsSidebarAccordion;
