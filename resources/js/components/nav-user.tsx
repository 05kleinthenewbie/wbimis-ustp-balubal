import { Link, router, usePage } from '@inertiajs/react';
import { LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useInitials } from '@/hooks/use-initials';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { logout } from '@/routes';
import { edit } from '@/routes/profile';

export function NavUser() {
    const { auth } = usePage().props;
    const getInitials = useInitials();
    const cleanup = useMobileNavigation();

    const user = auth.user;
    const roleName = (user.role as { role_name?: string } | undefined)
        ?.role_name;
    const roleLabel =
        roleName === 'ict_admin'
            ? 'Administrator'
            : roleName === 'faculty_staff'
              ? 'Faculty'
              : roleName === 'student'
                ? 'Student'
                : (roleName?.replace(/_/g, ' ') ?? 'Member');
    const showAvatar = Boolean(user.avatar);

    const handleLogout = () => {
        cleanup();
        router.flushAll();
    };

    return (
        <SidebarMenu className="gap-1">
            <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    size="lg"
                    className="group h-auto rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-slate-600 shadow-none transition-colors group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0! hover:border-slate-300 hover:bg-slate-50"
                >
                    <Link href={edit()} prefetch onClick={cleanup}>
                        <Avatar className="size-9 shrink-0 group-data-[collapsible=icon]:size-8">
                            {showAvatar ? (
                                <AvatarImage
                                    src={user.avatar}
                                    alt={user.name}
                                />
                            ) : null}
                            <AvatarFallback className="bg-ustp-navy/10 text-xs font-semibold text-ustp-navy">
                                {getInitials(user.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                            <span className="truncate font-semibold text-ustp-navy">
                                {user.name}
                            </span>
                            <span className="mt-0.5 truncate text-xs text-slate-500">
                                {roleLabel}
                            </span>
                        </div>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    tooltip="Sign Out"
                    className="h-9 rounded-lg px-3 text-sm font-medium text-slate-500 group-data-[collapsible=icon]:justify-center hover:bg-red-50 hover:text-red-600"
                >
                    <Link
                        href={logout()}
                        as="button"
                        onClick={handleLogout}
                        data-test="logout-button"
                    >
                        <LogOut />
                        <span>Sign Out</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
