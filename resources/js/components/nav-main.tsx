import { Link } from '@inertiajs/react';
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
                        isActive
                            ? 'bg-white/10 font-semibold text-ustp-gold'
                            : 'text-white/65 hover:bg-white/10 hover:text-white',
                        '[&>svg]:size-4 [&>svg]:shrink-0',
                        isActive
                            ? '[&>svg]:text-ustp-gold'
                            : '[&>svg]:text-white/50 group-hover:[&>svg]:text-ustp-gold',
                    )}
                >
                    <Link
                        href={item.href}
                        prefetch
                        onClick={
                            hasChildren
                                ? (event) => {
                                      if (isOpen) {
                                          event.preventDefault();
                                          setOpen(key, false);
                                      } else {
                                          setOpen(key, true);
                                      }
                                  }
                                : undefined
                        }
                    >
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                    </Link>
                </SidebarMenuSubButton>

                {Boolean(item.badge) && (
                    <SidebarMenuBadge className="absolute top-1.5 right-1.5 h-4.5 min-w-4.5 rounded-full bg-ustp-gold px-1 text-[10px] font-bold text-ustp-navy peer-data-[active=true]/menu-button:bg-ustp-gold peer-data-[active=true]/menu-button:text-ustp-navy">
                        {item.badge! > 99 ? '99+' : item.badge}
                    </SidebarMenuBadge>
                )}

                {hasChildren && isOpen && (
                    <SidebarMenuSub className="mt-0.5 ml-2 gap-0.5 border-white/10">
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
            <SidebarGroupLabel className="h-7 px-3 text-[10px] font-semibold tracking-[0.18em] text-white/45 uppercase">
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
                                    isActive
                                        ? 'bg-white/12 font-semibold text-white before:absolute before:top-1.5 before:bottom-1.5 before:left-1 before:w-1 before:rounded-full before:bg-ustp-gold'
                                        : 'text-white/70 hover:bg-white/10 hover:text-white',
                                    '[&>svg]:size-4.5 [&>svg]:shrink-0',
                                    isActive
                                        ? '[&>svg]:text-ustp-gold'
                                        : '[&>svg]:text-white/60 group-hover:[&>svg]:text-ustp-gold',
                                )}
                            >
                                <Link
                                    href={item.href}
                                    prefetch
                                    onClick={
                                        hasChildren
                                            ? (event) => {
                                                  if (isOpen) {
                                                      event.preventDefault();
                                                      setOpen(key, false);
                                                  } else {
                                                      setOpen(key, true);
                                                  }
                                              }
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

                            {hasChildren && isOpen && (
                                <SidebarMenuSub className="mt-1 gap-0.5 border-white/10">
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
