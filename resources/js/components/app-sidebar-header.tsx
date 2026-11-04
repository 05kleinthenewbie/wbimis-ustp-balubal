import { usePage } from '@inertiajs/react';
import { Moon, Sun } from 'lucide-react';
import { NotificationBell } from '@/components/notification-bell';
import { PushNotificationButton } from '@/components/push-notification-button';
import { StudentLoginCodeButton } from '@/components/student-login-code-button';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAppearance } from '@/hooks/use-appearance';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const {
        component,
        props: { auth },
    } = usePage();
    const isStudent =
        (auth.user.role as { role_name?: string } | undefined)?.role_name ===
        'student';
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const isDark = resolvedAppearance === 'dark';
    const pageTitles: Record<string, string> = {
        dashboard: 'Dashboard',
        'requests/index': 'Service Requests',
        'requests/my-requests': 'My Requests',
        'requests/create': 'New Service Request',
        'requests/show': 'Request Details',
        'requests/approvals': 'Request Approvals',
        'job-orders/index': 'Job Orders',
        'job-orders/show': 'Job Order Details',
        'job-orders/assignments': 'Job Order Assignments',
        'job-orders/progress': 'Work Progress',
        'inventory/index': 'Inventory',
        'inventory/create': 'Add Inventory Item',
        'inventory/edit': 'Edit Inventory Item',
        'inventory/show': 'Inventory Item Details',
        'inventory/expirations': 'Monitor Expiration',
        'inventory/defective': 'Defective Items',
        'inventory/under-repair': 'Items Under Repair',
        'bookings/index': 'Facility Booking',
        'bookings/create': 'Book a Facility',
        'bookings/show': 'Booking Details',
        'bookings/approvals': 'Booking Approvals',
        'facilities/index': 'Facilities',
        'facilities/create': 'Add Facility',
        'facilities/edit': 'Edit Facility',
        'incidents/index': 'Laboratory Incident Reports',
        'incidents/create': 'Report Laboratory Incident',
        'incidents/show': 'Laboratory Incident Details',
        'liabilities/index': 'My Liabilities',
        'notifications/index': 'Notifications',
        'audit-log/index': 'Audit Log',
        'reports/index': 'Summary Reports',
        'users/index': 'User Management',
        'settings/profile': 'Profile Settings',
        'settings/security': 'Security Settings',
        'settings/appearance': 'Appearance Settings',
    };
    const title =
        breadcrumbs.at(-1)?.title ??
        pageTitles[component] ??
        component
            .split('/')
            .filter((segment) => segment !== 'index')
            .join(' ')
            .replace(/-/g, ' ')
            .replace(/\b\w/g, (letter) => letter.toUpperCase());

    return (
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-ustp-gold/20 bg-ustp-navy px-3 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex min-w-0 items-center gap-2">
                <SidebarTrigger className="-ml-1 size-9 shrink-0 text-white hover:bg-ustp-navy-light hover:text-ustp-gold md:size-7" />
                <h1 className="truncate text-lg font-semibold tracking-tight text-white md:text-xl">
                    {title}
                </h1>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
                {isStudent && <StudentLoginCodeButton />}
                <PushNotificationButton />
                <NotificationBell />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => updateAppearance(isDark ? 'light' : 'dark')}
                    aria-label={
                        isDark ? 'Switch to light mode' : 'Switch to dark mode'
                    }
                    title={
                        isDark ? 'Switch to light mode' : 'Switch to dark mode'
                    }
                    className="text-white hover:bg-ustp-navy-light hover:text-ustp-gold"
                >
                    {isDark ? (
                        <Sun className="size-5" />
                    ) : (
                        <Moon className="size-5" />
                    )}
                </Button>
            </div>
        </header>
    );
}
