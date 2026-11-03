import { Link } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/types';

export function NavMain({
    items = [],
    label = 'Navigation',
}: {
    items?: NavItem[];
    label?: string;
}) {
    const { isCurrentUrl, isCurrentOrParentUrl } = useCurrentUrl();
    const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

    const setOpen = (key: string, open: boolean) => {
        setOpenItems((current) => ({ ...current, [key]: open }));
    };

    const isItemActive = (item: NavItem): boolean =>
        isCurrentUrl(item.href) ||
        isCurrentOrParentUrl(item.href) ||
        (item.children?.some(isItemActive) ?? false);

    const renderSubItem = (item: NavItem, key: string): ReactNode => {
        const hasChildren = Boolean(item.children?.length);
        const isActive = isItemActive(item);
        const isOpen = openItems[key] ?? isActive;

        return (
            <SidebarMenuSubItem key={key} className="relative">
                <SidebarMenuSubButton
                    asChild
                    size="sm"
                    isActive={isActive}
                    className={cn(
                        'group h-8 rounded-lg px-2 text-[13px] font-medium',
                        hasChildren && 'pr-8',
                        isActive
                            ? 'bg-ustp-navy/[0.06] font-semibold text-ustp-navy'
                            : 'text-slate-500 hover:bg-slate-100/80 hover:text-ustp-navy',
                        '[&>svg]:size-4 [&>svg]:shrink-0',
                        isActive
                            ? '[&>svg]:text-ustp-navy'
                            : '[&>svg]:text-slate-400 group-hover:[&>svg]:text-ustp-navy',
                    )}
                >
                    <Link
                        href={item.href}
                        prefetch
                        onClick={
                            hasChildren ? () => setOpen(key, true) : undefined
                        }
                    >
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                    </Link>
                </SidebarMenuSubButton>

                {hasChildren && (
                    <button
                        type="button"
                        onClick={() => setOpen(key, !isOpen)}
                        aria-expanded={isOpen}
                        aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${item.title}`}
                        className={cn(
                            'absolute top-1/2 right-1 z-10 flex size-5 -translate-y-1/2 items-center justify-center rounded-md transition-colors',
                            'group-data-[collapsible=icon]:hidden',
                            isActive
                                ? 'text-ustp-navy/60 hover:bg-ustp-navy/10 hover:text-ustp-navy'
                                : 'text-slate-400 hover:bg-slate-100 hover:text-ustp-navy',
                        )}
                    >
                        <ChevronDown
                            className={cn(
                                'size-3.5 transition-transform duration-200',
                                isOpen && 'rotate-180',
                            )}
                        />
                    </button>
                )}

                {hasChildren && isOpen && (
                    <SidebarMenuSub className="mt-0.5 ml-2 gap-0.5 border-slate-200">
                        {item.children?.map((child) =>
                            renderSubItem(child, `${key}/${child.title}`),
                        )}
                    </SidebarMenuSub>
                )}
            </SidebarMenuSubItem>
        );
    };

    return (
        <SidebarGroup className="px-2 py-1.5">
            <SidebarGroupLabel className="h-7 px-3 text-[10px] font-semibold tracking-[0.18em] text-slate-400 uppercase">
                {label}
            </SidebarGroupLabel>
            <SidebarMenu className="gap-0.5">
                {items.map((item) => {
                    const hasChildren = Boolean(item.children?.length);
                    const isActive = isItemActive(item);
                    const key = item.title;
                    const isOpen = openItems[key] ?? isActive;

                    return (
                        <SidebarMenuItem key={key} className="relative">
                            <SidebarMenuButton
                                asChild
                                isActive={isActive}
                                tooltip={{ children: item.title }}
                                className={cn(
                                    'group relative h-10 rounded-xl px-3 text-sm font-medium transition-colors duration-200',
                                    hasChildren && 'pr-9',
                                    isActive
                                        ? 'bg-ustp-navy/[0.07] font-semibold text-ustp-navy'
                                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-ustp-navy',
                                    '[&>svg]:size-4.5 [&>svg]:shrink-0',
                                    isActive
                                        ? '[&>svg]:text-ustp-navy'
                                        : '[&>svg]:text-slate-400 group-hover:[&>svg]:text-ustp-navy',
                                )}
                            >
                                <Link
                                    href={item.href}
                                    prefetch
                                    onClick={
                                        hasChildren
                                            ? () => setOpen(key, true)
                                            : undefined
                                    }
                                >
                                    {item.icon && <item.icon />}
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>

                            {Boolean(item.badge) && (
                                <SidebarMenuBadge className="bg-ustp-gold font-bold text-ustp-navy peer-data-[active=true]/menu-button:bg-ustp-gold peer-data-[active=true]/menu-button:text-ustp-navy">
                                    {item.badge! > 99 ? '99+' : item.badge}
                                </SidebarMenuBadge>
                            )}

                            {hasChildren && (
                                <button
                                    type="button"
                                    onClick={() => setOpen(key, !isOpen)}
                                    aria-expanded={isOpen}
                                    aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${item.title}`}
                                    className={cn(
                                        'absolute top-1/2 right-2 z-10 flex size-6 -translate-y-1/2 items-center justify-center rounded-md transition-colors',
                                        'group-data-[collapsible=icon]:hidden',
                                        isActive
                                            ? 'text-ustp-navy/60 hover:bg-ustp-navy/10 hover:text-ustp-navy'
                                            : 'text-slate-400 hover:bg-slate-100 hover:text-ustp-navy',
                                    )}
                                >
                                    <ChevronDown
                                        className={cn(
                                            'size-3.5 transition-transform duration-200',
                                            isOpen && 'rotate-180',
                                        )}
                                    />
                                </button>
                            )}

                            {hasChildren && isOpen && (
                                <SidebarMenuSub className="mt-1 gap-0.5 border-slate-200">
                                    {item.children?.map((child) =>
                                        renderSubItem(
                                            child,
                                            `${key}/${child.title}`,
                                        ),
                                    )}
                                </SidebarMenuSub>
                            )}
                        </SidebarMenuItem>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}
