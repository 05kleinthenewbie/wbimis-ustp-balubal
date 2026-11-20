import { Link, usePage } from '@inertiajs/react';
import {
    LayoutDashboard,
    FileText,
    FilePlus2,
    ClipboardList,
    ListChecks,
    Package,
    Calendar,
    CalendarCheck,
    CalendarClock,
    Building2,
    CheckCircle2,
    AlertTriangle,
    ReceiptText,
    History,
    BarChart3,
    Users,
    UserCheck,
    Wrench,
    Hammer,
    Clock,
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
    const {
        auth,
        unreadNotificationsCount,
        pendingApprovalsCount,
        pendingServiceRequestsCount,
        pendingBookingsCount,
        unassignedJobOrdersCount,
    } = usePage().props as any;
    const roleName = auth?.user?.role?.role_name;
    const unreadCount = Number(unreadNotificationsCount ?? 0);
    const pendingApprovalCount = Number(pendingApprovalsCount ?? 0);
    const pendingServiceRequestCount = Number(pendingServiceRequestsCount ?? 0);
    const pendingBookingCount = Number(pendingBookingsCount ?? 0);
    const unassignedJobOrderCount = Number(unassignedJobOrdersCount ?? 0);

    const adminNavItems: NavItem[] = [
        { title: 'Dashboard', href: dashboardUrl, icon: LayoutDashboard },
        {
            title: 'Service Requests',
            href: '/requests',
            icon: FileText,
            badge: pendingServiceRequestCount,
        },
        {
            title: 'Job Orders',
            href: '/job-orders',
            icon: ClipboardList,
            badge: unassignedJobOrderCount,
            children: [
                {
                    title: 'Job Order List',
                    href: '/job-orders',
                    icon: ListChecks,
                },
                {
                    title: 'Technician Assignments',
                    href: '/job-orders/assignments',
                    icon: Wrench,
                    badge: unassignedJobOrderCount,
                },
                {
                    title: 'Active Work Progress',
                    href: '/job-orders/progress',
                    icon: Clock,
                },
            ],
        },
        {
            title: 'Inventory',
            href: '/inventory',
            icon: Package,
            children: [
                {
                    title: 'All Items',
                    href: '/inventory',
                    icon: Package,
                },
                {
                    title: 'Monitor Shelf Life',
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
                    icon: Hammer,
                },
            ],
        },
        {
            title: 'Facility Booking',
            href: '/bookings',
            icon: Calendar,
            badge: pendingBookingCount,
            children: [
                {
                    title: 'Reservations',
                    href: '/bookings',
                    icon: CalendarCheck,
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
                    badge: pendingBookingCount,
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
            badge: pendingApprovalCount,
            children: [
                { title: 'All Users', href: '/users', icon: Users },
                {
                    title: 'Pending Approvals',
                    href: '/users/approvals',
                    icon: UserCheck,
                    badge: pendingApprovalCount,
                },
            ],
        },
    ];

    const facultyNavItems: NavItem[] = [
        { title: 'Dashboard', href: dashboardUrl, icon: LayoutDashboard },
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
                    icon: CalendarCheck,
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
                    icon: ReceiptText,
                },
            ],
        },
    ];

    const studentNavItems: NavItem[] = [
        { title: 'Dashboard', href: dashboardUrl, icon: LayoutDashboard },
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
                    icon: ReceiptText,
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

            <SidebarContent className="sidebar-scroll py-2 pb-4">
                <NavMain items={mainNavItems} label="Main Menu" />
                <NavMain items={communicationNavItems} label="Communication" />
                <NavMain items={accountNavItems} label="Account" />
            </SidebarContent>

            <SidebarFooter className="relative z-10 shrink-0 border-t border-white/10 bg-ustp-navy p-3 shadow-[0_-8px_24px_rgba(18,16,63,0.35)] group-data-[collapsible=icon]:p-1">
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
