import { Link, usePage } from '@inertiajs/react';
import {
    LayoutGrid,
    Activity,
    UserCog,
    FileText,
    FilePlus2,
    ClipboardList,
    Box,
    Calendar,
    CalendarClock,
    Building2,
    CheckCircle2,
    AlertTriangle,
    ShieldAlert,
    History,
    BarChart3,
    Users,
    UserCheck,
    Wrench,
    Bell,
    Settings,
    Shield,
    Palette,
    UserRound,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { edit as appearanceEdit } from '@/routes/appearance';
import { index as incidentsIndex } from '@/routes/incidents';
import { index as liabilitiesIndex } from '@/routes/liabilities';
import { index as notificationsIndex } from '@/routes/notifications';
import { edit as profileEdit } from '@/routes/profile';
import { create as requestCreate } from '@/routes/requests';
import { edit as securityEdit } from '@/routes/security';
import type { NavItem } from '@/types';

export function AppSidebar() {
    const dashboardUrl = '/dashboard';
    const { auth, unreadNotificationsCount } = usePage().props as any;
    const roleName = auth?.user?.role?.role_name;
    const unreadCount = Number(unreadNotificationsCount ?? 0);

    const adminNavItems: NavItem[] = [
        { title: 'Dashboard', href: dashboardUrl, icon: LayoutGrid },
        {
            title: 'Service Requests',
            href: '/requests',
            icon: FileText,
            children: [
                { title: 'All Requests', href: '/requests', icon: FileText },
                {
                    title: 'Request Approvals',
                    href: '/requests/approvals',
                    icon: CheckCircle2,
                },
            ],
        },
        {
            title: 'Job Orders',
            href: '/job-orders',
            icon: ClipboardList,
            children: [
                {
                    title: 'All Job Orders',
                    href: '/job-orders',
                    icon: ClipboardList,
                },
                {
                    title: 'Assignments',
                    href: '/job-orders/assignments',
                    icon: UserCog,
                },
                {
                    title: 'Work Progress',
                    href: '/job-orders/progress',
                    icon: Activity,
                },
            ],
        },
        {
            title: 'Inventory',
            href: '/inventory',
            icon: Box,
            children: [
                {
                    title: 'All Items',
                    href: '/inventory',
                    icon: Box,
                },
                {
                    title: 'Monitor Expiration',
                    href: '/inventory/expirations',
                    icon: CalendarClock,
                },
                {
                    title: 'Defective',
                    href: '/inventory/defective',
                    icon: AlertTriangle,
                },
                {
                    title: 'Under Repair',
                    href: '/inventory/under-repair',
                    icon: Wrench,
                },
            ],
        },
        {
            title: 'Facility Booking',
            href: '/bookings',
            icon: Calendar,
            children: [
                {
                    title: 'Reservations',
                    href: '/bookings',
                    icon: ClipboardList,
                },
                {
                    title: 'Facilities',
                    href: '/facilities',
                    icon: Building2,
                },
                {
                    title: 'Booking Approvals',
                    href: '/bookings/approvals',
                    icon: CheckCircle2,
                },
            ],
        },
        {
            title: 'Laboratory Incident Reports',
            href: '/incidents',
            icon: AlertTriangle,
        },
        { title: 'Audit Log', href: '/audit-log', icon: History },
        { title: 'Reports', href: '/reports', icon: BarChart3 },
        {
            title: 'User Management',
            href: '/users',
            icon: Users,
            children: [
                { title: 'All Users', href: '/users', icon: Users },
                {
                    title: 'Pending Approvals',
                    href: '/users/approvals',
                    icon: UserCheck,
                },
            ],
        },
    ];

    const facultyNavItems: NavItem[] = [
        { title: 'Dashboard', href: dashboardUrl, icon: LayoutGrid },
        {
            title: 'Service Requests',
            href: '/requests',
            icon: FileText,
            children: [
                {
                    title: 'New Request',
                    href: requestCreate().url,
                    icon: FilePlus2,
                },
                { title: 'My Requests', href: '/requests', icon: FileText },
            ],
        },
        {
            title: 'Facility Booking',
            href: '/bookings',
            icon: Calendar,
            children: [
                {
                    title: 'Reservations',
                    href: '/bookings',
                    icon: ClipboardList,
                },
            ],
        },
        {
            title: 'Laboratory Incident Reports',
            href: '/incidents',
            icon: AlertTriangle,
            children: [
                {
                    title: 'Incident Reports',
                    href: '/incidents',
                    icon: AlertTriangle,
                },
                {
                    title: 'My Liabilities',
                    href: liabilitiesIndex().url,
                    icon: ShieldAlert,
                },
            ],
        },
    ];

    const studentNavItems: NavItem[] = [
        { title: 'Dashboard', href: dashboardUrl, icon: LayoutGrid },
        {
            title: 'Service Requests',
            href: '/requests',
            icon: FileText,
            children: [
                {
                    title: 'New Request',
                    href: requestCreate().url,
                    icon: FilePlus2,
                },
                { title: 'My Requests', href: '/requests', icon: FileText },
            ],
        },
        {
            title: 'Laboratory Incident Reports',
            href: incidentsIndex().url,
            icon: AlertTriangle,
            children: [
                {
                    title: 'Incident Reports',
                    href: incidentsIndex().url,
                    icon: AlertTriangle,
                },
                {
                    title: 'My Liabilities',
                    href: liabilitiesIndex().url,
                    icon: ShieldAlert,
                },
            ],
        },
    ];

    let mainNavItems: NavItem[] = facultyNavItems;

    if (roleName === 'student') {
        mainNavItems = studentNavItems;
    } else if (roleName === 'ict_admin') {
        mainNavItems = adminNavItems;
    }

    const communicationNavItems: NavItem[] = [
        {
            title: 'Notifications',
            href: notificationsIndex().url,
            icon: Bell,
            badge: unreadCount,
        },
    ];

    const accountNavItems: NavItem[] = [
        {
            title: 'Settings',
            href: profileEdit().url,
            icon: Settings,
            children: [
                {
                    title: 'Account',
                    href: profileEdit().url,
                    icon: UserRound,
                    children: [
                        {
                            title: 'Profile',
                            href: profileEdit().url,
                        },
                    ],
                },
                {
                    title: 'Security',
                    href: securityEdit().url,
                    icon: Shield,
                },
                {
                    title: 'Appearance',
                    href: appearanceEdit().url,
                    icon: Palette,
                },
            ],
        },
    ];

    return (
        <Sidebar collapsible="icon" variant="sidebar">
            <SidebarHeader className="h-16 justify-center border-b border-ustp-gold/20 bg-ustp-navy px-3 py-0 group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:px-1">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            asChild
                            className="h-auto hover:bg-transparent"
                        >
                            <Link href={dashboardUrl} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="py-2">
                <NavMain items={mainNavItems} label="Main Menu" />
                <NavMain items={communicationNavItems} label="Communication" />
                <NavMain items={accountNavItems} label="Account" />
            </SidebarContent>

            <SidebarFooter className="mt-auto border-t border-slate-100 p-3 group-data-[collapsible=icon]:p-1">
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
