import { Head, Link, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    Box,
    Calendar,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    FileText,
    Globe,
    Inbox,
    Mail,
    Shield,
    Users,
    Wifi,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import ustpLogo from '@/assets/ustp-logo.png';
import { Button } from '@/components/tailgrids/core/button';
import { dashboard, login, register } from '@/routes';
import { login as adminLogin } from '@/routes/admin';
import { login as facultyLogin } from '@/routes/faculty';
import { login as studentLogin } from '@/routes/student';

const modules = [
    {
        icon: FileText,
        title: 'Service Requests',
        description:
            'Submit and track ICT service requests for equipment, software, and network support across campus.',
    },
    {
        icon: ClipboardList,
        title: 'Job Orders',
        description:
            'ICT staff can create, assign, and monitor job orders to resolve service requests efficiently.',
    },
    {
        icon: Inbox,
        title: 'Inventory',
        description:
            'Track ICT equipment, property records, and monitor defective items across the campus.',
    },
    {
        icon: Calendar,
        title: 'Facility Booking',
        description:
            'Reserve computer laboratories and audio-visual rooms for academic and official use.',
    },
    {
        icon: Shield,
        title: 'Laboratory Incident Reports',
        description:
            'Document laboratory incidents and monitor user responsibilities and liabilities.',
    },
    {
        icon: Mail,
        title: 'Notifications',
        description:
            'Receive email updates on request statuses, approvals, bookings, and system alerts.',
    },
];

const roles = [
    {
        icon: Users,
        role: 'Faculty',
        description:
            'Submit service requests, book facilities, report laboratory incidents, and keep track of any liabilities assigned to you.',
        features: [
            'Submit Requests',
            'Book Facilities',
            'Report Laboratory Incidents',
            'Track Status',
            'View My Liabilities',
        ],
        href: facultyLogin().url,
        registerHref: register().url,
        registrationNote:
            'Select your employment type, department, and position to create your account.',
    },
    {
        icon: Wifi,
        role: 'Students',
        description:
            'Register with your program and year level, upload your Certificate of Registration, and wait for ICT Admin approval. Then submit limited service requests, report laboratory incidents, and review any assigned liabilities.',
        features: [
            'Limited Service Requests',
            'Track Requests',
            'Report Laboratory Incidents',
            'View My Liabilities',
        ],
        href: studentLogin().url,
        registerHref: register({ query: { role: 'student' } }).url,
        registrationNote:
            'Enter your details, program, year level, and student ID, then upload your Certificate of Registration.',
    },
    {
        icon: Shield,
        role: 'ICT Administrators',
        description:
            'Oversee all ICT operations while still using faculty services such as submitting requests, booking facilities, reporting incidents, and tracking liabilities.',
        features: [
            'Submit Requests',
            'Book Facilities',
            'Report Laboratory Incidents',
            'Track Status',
            'View My Liabilities',
            'Manage Requests',
            'Process Job Orders',
            'Monitor Inventory',
            'Record Laboratory Incidents',
        ],
        href: adminLogin().url,
        registerHref: null,
        registrationNote:
            'Administrator accounts are managed by the ICT office.',
    },
];

const workflowSteps = [
    {
        step: '1',
        title: 'Create Your Account',
        description:
            'Register with your name, email address, and password. Students upload their Certificate of Registration and enter their student ID; faculty choose their department, position, and employment type.',
    },
    {
        step: '2',
        title: 'Verify Your Email',
        description:
            'Enter the six-digit code sent to your email address to confirm that the account belongs to you.',
    },
    {
        step: '3',
        title: 'Wait for ICT Admin Approval',
        description:
            'The ICT office reviews your registration, including the uploaded COR for students. Sign-in unlocks as soon as your account is approved.',
    },
    {
        step: '4',
        title: 'Sign In & Get Support',
        description:
            'Sign in with your email and password to access the services available to your role.',
    },
];

export default function Welcome() {
    const { auth } = usePage().props;
    const dashboardUrl = dashboard();
    const [currentPage, setCurrentPage] = useState(0);
    const [itemsPerView, setItemsPerView] = useState(1);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => {
            const contactSection = document.getElementById('contact');
            const modulesSection = document.getElementById('modules');

            if (
                contactSection &&
                contactSection.getBoundingClientRect().top <= 80
            ) {
                setIsScrolled(false);

                return;
            }

            if (modulesSection) {
                // When top of modules section reaches the bottom of the header (approx 80px)
                const rect = modulesSection.getBoundingClientRect();
                setIsScrolled(rect.top <= 80);
            } else {
                setIsScrolled(window.scrollY > 400);
            }
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();

        return () => {
            window.removeEventListener('scroll', onScroll);
        };
    }, []);

    useEffect(() => {
        const queries = [
            { query: '(min-width: 1024px)', count: 3 },
            {
                query: '(min-width: 640px) and (max-width: 1023px)',
                count: 2,
            },
            { query: '(max-width: 639px)', count: 1 },
        ];

        const mediaQueryLists = queries.map(({ query, count }) => {
            const maxPage = Math.ceil(modules.length / count) - 1;

            const mql = window.matchMedia(query);

            if (mql.matches) {
                setItemsPerView(count);
                setCurrentPage((page) => Math.min(page, maxPage));
            }

            const handler = (event: MediaQueryListEvent) => {
                if (event.matches) {
                    setItemsPerView(count);
                    setCurrentPage((page) => Math.min(page, maxPage));
                }
            };

            mql.addEventListener('change', handler);

            return { mql, handler };
        });

        return () => {
            mediaQueryLists.forEach(({ mql, handler }) => {
                mql.removeEventListener('change', handler);
            });
        };
    }, []);

    const totalPages = Math.ceil(modules.length / itemsPerView);

    return (
        <>
            <Head title="USTP Balubal ICT Portal" />

            <div id="top" className="min-h-screen scroll-smooth bg-white">
                {/* Header */}
                <header
                    className={`fixed inset-x-0 top-0 z-40 border-b transition-all duration-300 ease-in-out motion-reduce:transition-none ${
                        isScrolled
                            ? 'border-black/5 bg-white/95 shadow-md backdrop-blur-md'
                            : 'border-white/10 bg-ustp-navy-dark/95 backdrop-blur-md'
                    }`}
                >
                    <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
                        <a
                            href="#top"
                            className="flex items-center gap-3 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ustp-gold focus-visible:ring-offset-2"
                        >
                            <div className="flex size-12 items-center justify-center rounded-lg bg-white p-1 shadow-sm">
                                <img
                                    src={ustpLogo}
                                    alt="USTP Logo"
                                    className="size-full object-contain"
                                />
                            </div>
                            <div>
                                <p
                                    className={`font-serif text-base leading-tight font-bold transition-colors sm:text-lg ${
                                        isScrolled
                                            ? 'text-ustp-navy'
                                            : 'text-white'
                                    }`}
                                >
                                    University of Science and Technology
                                </p>
                                <p
                                    className={`font-serif text-xs font-bold transition-colors sm:text-sm ${
                                        isScrolled
                                            ? 'text-ustp-navy'
                                            : 'text-white'
                                    }`}
                                >
                                    of Southern Philippines
                                </p>
                                <p
                                    className={`hidden text-[11px] tracking-[0.12em] uppercase transition-colors sm:block ${
                                        isScrolled
                                            ? 'text-ustp-navy/60'
                                            : 'text-white/60'
                                    }`}
                                >
                                    Balubal Campus, Cagayan de Oro City
                                </p>
                            </div>
                        </a>

                        <nav
                            aria-label="Page sections"
                            className="hidden items-center gap-1 md:flex"
                        >
                            {[
                                { label: 'About', href: '#about' },
                                { label: 'Modules', href: '#modules' },
                                {
                                    label: 'How It Works',
                                    href: '#how-it-works',
                                },
                                { label: 'Roles', href: '#roles' },
                                { label: 'Contact', href: '#contact' },
                            ].map((link) => (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ustp-gold ${
                                        isScrolled
                                            ? 'text-ustp-navy/70 hover:bg-ustp-gray/70 hover:text-ustp-navy'
                                            : 'text-white/80 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    {link.label}
                                </a>
                            ))}
                        </nav>

                        <div className="flex items-center gap-3">
                            {auth.user ? (
                                <Link
                                    href={dashboardUrl}
                                    className="rounded-lg bg-ustp-gold px-5 py-2.5 text-sm font-bold text-ustp-navy shadow-md transition-all hover:bg-ustp-gold-dark hover:text-white"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <Link
                                    href={login()}
                                    className={`rounded-xl px-5 py-2 text-sm font-semibold transition-all ${
                                        isScrolled
                                            ? 'bg-ustp-navy text-white shadow-sm hover:bg-ustp-navy-dark'
                                            : 'bg-ustp-gold font-bold text-ustp-navy shadow-md hover:bg-ustp-gold-dark hover:text-white'
                                    }`}
                                >
                                    Sign in
                                </Link>
                            )}
                        </div>
                    </div>
                </header>

                {/* Hero Section */}
                <section className="relative flex min-h-screen items-center overflow-hidden bg-ustp-navy">
                    <div className="absolute inset-0 bg-linear-to-r from-ustp-navy-dark to-ustp-navy" />
                    {/* Corner glow for depth */}
                    <div className="pointer-events-none absolute -top-32 right-0 h-150 w-150 rounded-full bg-ustp-light-blue/8 blur-3xl" />
                    <div className="pointer-events-none absolute bottom-0 left-1/3 h-100 w-100 rounded-full bg-ustp-gold/5 blur-3xl" />
                    <div
                        className="pointer-events-none absolute inset-0 opacity-5"
                        style={{
                            backgroundImage:
                                'radial-gradient(circle, #F2A900 1px, transparent 1px)',
                            backgroundSize: '32px 32px',
                        }}
                    />
                    {/* Real module badges — subtle fill behind stat cards */}
                    <div className="pointer-events-none absolute top-1/2 -right-6 hidden -translate-y-1/2 grid-cols-3 gap-5 opacity-[0.08] lg:grid">
                        <AlertTriangle
                            className="size-16 text-white"
                            strokeWidth={1}
                        />
                        <Shield
                            className="size-16 text-white"
                            strokeWidth={1}
                        />
                        <ClipboardList
                            className="size-16 text-white"
                            strokeWidth={1}
                        />
                        <Box className="size-16 text-white" strokeWidth={1} />
                        <Calendar
                            className="size-16 text-white"
                            strokeWidth={1}
                        />
                        <Wifi className="size-16 text-white" strokeWidth={1} />
                        <FileText
                            className="size-16 text-white"
                            strokeWidth={1}
                        />
                        <Mail className="size-16 text-white" strokeWidth={1} />
                        <Inbox className="size-16 text-white" strokeWidth={1} />
                    </div>
                    <div className="relative mx-auto w-full max-w-7xl px-6 py-20 lg:py-28">
                        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-12">
                            <div>
                                <h1 className="font-serif text-3xl leading-tight font-bold text-white sm:text-5xl lg:text-[3.4rem]">
                                    Web-Based ICT Management and Information
                                    System
                                </h1>
                                <p className="mt-6 max-w-lg text-base leading-relaxed text-white/70 sm:mt-7 sm:text-lg">
                                    A centralized platform for managing ICT
                                    service requests, job orders, inventory,
                                    defective equipment, incident reporting with
                                    user liability, facility bookings, and
                                    notifications across the Balubal Campus.
                                </p>
                                <div className="mt-10 flex flex-wrap gap-4">
                                    {auth.user ? (
                                        <Link
                                            href={dashboardUrl}
                                            className="group flex items-center gap-2 rounded-lg bg-ustp-gold px-7 py-3.5 text-sm font-bold text-ustp-navy shadow-lg shadow-ustp-gold/20 transition-all hover:-translate-y-0.5 hover:bg-ustp-gold-dark hover:text-white hover:shadow-xl hover:shadow-ustp-gold/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ustp-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ustp-navy"
                                        >
                                            Go to Dashboard
                                            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                                        </Link>
                                    ) : (
                                        <>
                                            <Button
                                                asChild
                                                variant="secondary"
                                                size="lg"
                                                className="px-7"
                                            >
                                                <Link href={login()}>
                                                    Sign in
                                                </Link>
                                            </Button>
                                            <Button
                                                asChild
                                                variant="outline"
                                                size="lg"
                                                className="border-white/20 px-7 text-white/80 hover:border-ustp-gold/50 hover:bg-white/5 hover:text-white"
                                            >
                                                <Link href={register()}>
                                                    Faculty Registration
                                                </Link>
                                            </Button>
                                            <Button
                                                asChild
                                                variant="outline"
                                                size="lg"
                                                className="border-white/20 px-7 text-white/80 hover:border-ustp-gold/50 hover:bg-white/5 hover:text-white"
                                            >
                                                <Link
                                                    href={register({
                                                        query: {
                                                            role: 'student',
                                                        },
                                                    })}
                                                >
                                                    Student Registration
                                                </Link>
                                            </Button>
                                        </>
                                    )}
                                </div>

                                {!auth.user && (
                                    <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/50">
                                        <span className="inline-flex items-center gap-1.5">
                                            <CheckCircle className="size-3.5 text-ustp-gold" />
                                            Campus-only access
                                        </span>
                                        <span className="inline-flex items-center gap-1.5">
                                            <CheckCircle className="size-3.5 text-ustp-gold" />
                                            Role-based dashboards
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="hidden lg:block">
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        {
                                            icon: FileText,
                                            label: 'Service Requests',
                                            value: 'Streamlined',
                                        },
                                        {
                                            icon: Calendar,
                                            label: 'Facility Booking',
                                            value: 'Reservable',
                                        },
                                        {
                                            icon: Box,
                                            label: 'Inventory',
                                            value: 'Tracked',
                                        },
                                        {
                                            icon: Shield,
                                            label: 'Laboratory Incidents',
                                            value: 'Accountable',
                                        },
                                    ].map((stat) => {
                                        const Icon = stat.icon;

                                        return (
                                            <div
                                                key={stat.label}
                                                className="group/card rounded-xl border border-white/15 bg-linear-to-br from-white/10 to-white/2 p-5 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-ustp-gold/60 hover:shadow-lg hover:shadow-black/20"
                                            >
                                                <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-ustp-gold/15 text-ustp-gold transition-colors group-hover/card:bg-ustp-gold/25">
                                                    <Icon className="size-4" />
                                                </div>
                                                <p className="text-xs tracking-wider text-white/40 uppercase">
                                                    {stat.label}
                                                </p>
                                                <p className="mt-1 font-serif text-lg font-bold text-ustp-gold">
                                                    {stat.value}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* About */}
                <section id="about" className="scroll-mt-24 bg-ustp-gray/40">
                    <div className="mx-auto max-w-7xl px-6 py-20">
                        <div className="mb-12 text-center">
                            <h2 className="font-serif text-2xl font-bold text-ustp-navy sm:text-3xl">
                                One platform for USTP Balubal ICT operations
                            </h2>
                            <div className="mx-auto mt-3 h-1 w-16 rounded-full bg-ustp-gold" />
                            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-ustp-navy/60">
                                WBIMIS is the centralized ICT management
                                platform of the University of Science and
                                Technology of Southern Philippines — Balubal
                                Campus.
                            </p>
                        </div>

                        <div className="grid items-stretch gap-8 lg:grid-cols-3">
                            <div className="flex flex-col gap-8 lg:col-span-2">
                                <div className="rounded-2xl border border-ustp-gray-medium bg-white p-8 shadow-sm">
                                    <h3 className="font-serif text-lg font-bold text-ustp-navy">
                                        Why it exists
                                    </h3>
                                    <div className="mt-4 space-y-4 text-sm leading-relaxed text-ustp-navy/70 sm:text-base">
                                        <p>
                                            Before WBIMIS, ICT transactions were
                                            recorded in logbooks, paper forms,
                                            and separate spreadsheets. Records
                                            were hard to trace, status updates
                                            depended on follow-ups, and asset
                                            accountability was difficult to
                                            establish.
                                        </p>
                                        <p>
                                            WBIMIS brings service requests, job
                                            orders, inventory, facility
                                            bookings, and laboratory incidents
                                            into one role-based workspace. Each
                                            record stays linked to the people,
                                            assets, and approvals involved,
                                            giving the ICT office a single
                                            source of truth from submission to
                                            resolution.
                                        </p>
                                    </div>

                                    <div className="mt-8 grid gap-4 sm:grid-cols-2">
                                        {[
                                            {
                                                icon: FileText,
                                                title: 'Single source of truth',
                                                text: 'Requests, assets, bookings, and incidents share one system of record.',
                                            },
                                            {
                                                icon: Wifi,
                                                title: 'Real-time visibility',
                                                text: 'Status changes and notifications appear as ICT staff act on each record.',
                                            },
                                            {
                                                icon: Shield,
                                                title: 'Accountability',
                                                text: 'Incidents, liabilities, and audit logs keep every action traceable.',
                                            },
                                            {
                                                icon: Users,
                                                title: 'Role-based access',
                                                text: 'Faculty, students, and administrators see only the tools they need.',
                                            },
                                        ].map((pillar) => {
                                            const Icon = pillar.icon;

                                            return (
                                                <div
                                                    key={pillar.title}
                                                    className="rounded-xl border border-ustp-gray-medium bg-ustp-gray/30 p-5"
                                                >
                                                    <div className="flex size-9 items-center justify-center rounded-lg bg-ustp-gold/10 text-ustp-gold">
                                                        <Icon className="size-4" />
                                                    </div>
                                                    <p className="mt-3 text-sm font-bold text-ustp-navy">
                                                        {pillar.title}
                                                    </p>
                                                    <p className="mt-1 text-xs leading-relaxed text-ustp-navy/60">
                                                        {pillar.text}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-ustp-gray-medium bg-white p-8 shadow-sm">
                                    <h3 className="font-serif text-lg font-bold text-ustp-navy">
                                        Who uses it
                                    </h3>
                                    <p className="mt-2 text-sm text-ustp-navy/60">
                                        Access is tailored to each campus role.
                                    </p>
                                    <div className="mt-6 grid gap-4 sm:grid-cols-3">
                                        {[
                                            {
                                                role: 'Faculty & Staff',
                                                text: 'Submit service requests, book facilities, report incidents, and track liabilities.',
                                            },
                                            {
                                                role: 'Students',
                                                text: 'File limited service requests, report incidents, and monitor assigned liabilities.',
                                            },
                                            {
                                                role: 'ICT Administrators',
                                                text: 'Approve requests, dispatch job orders, manage inventory, and resolve incidents.',
                                            },
                                        ].map((item) => (
                                            <div
                                                key={item.role}
                                                className="rounded-xl border border-ustp-gray-medium bg-ustp-gray/30 p-4"
                                            >
                                                <p className="text-sm font-bold text-ustp-navy">
                                                    {item.role}
                                                </p>
                                                <p className="mt-1 text-xs leading-relaxed text-ustp-navy/60">
                                                    {item.text}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex h-full flex-col rounded-2xl border border-ustp-gray-medium bg-white p-8 shadow-sm">
                                <h3 className="font-serif text-lg font-bold text-ustp-navy">
                                    What it covers
                                </h3>
                                <p className="mt-2 text-sm text-ustp-navy/60">
                                    End-to-end modules for daily ICT operations.
                                </p>
                                <div className="mt-6 space-y-6">
                                    {[
                                        {
                                            title: 'Service Operations',
                                            items: [
                                                'Service request submission and approval',
                                                'Job order assignment and SLA monitoring',
                                                'Email notifications and status updates',
                                            ],
                                        },
                                        {
                                            title: 'Assets & Facilities',
                                            items: [
                                                'ICT inventory and QR asset tagging',
                                                'Defect, repair, and disposal lifecycle',
                                                'Facility booking with conflict checks',
                                            ],
                                        },
                                        {
                                            title: 'Accountability',
                                            items: [
                                                'Laboratory incident reporting',
                                                'Liability assignment and settlement',
                                                'Activity and audit trail',
                                            ],
                                        },
                                    ].map((group) => (
                                        <div key={group.title}>
                                            <p className="text-[11px] font-bold tracking-[0.18em] text-ustp-gold-dark uppercase">
                                                {group.title}
                                            </p>
                                            <ul className="mt-3 space-y-2.5">
                                                {group.items.map((item) => (
                                                    <li
                                                        key={item}
                                                        className="flex items-start gap-2.5 text-sm text-ustp-navy/70"
                                                    >
                                                        <CheckCircle className="mt-0.5 size-4 shrink-0 text-ustp-gold" />
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-auto pt-6">
                                    <div className="flex items-start gap-3 rounded-xl bg-ustp-gold/10 p-4 text-xs leading-relaxed text-ustp-navy/70">
                                        <Shield className="mt-0.5 size-4 shrink-0 text-ustp-gold-dark" />
                                        <span>
                                            Available only to verified USTP
                                            Balubal faculty, staff, and
                                            students.
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* System Modules */}
                <section id="modules" className="scroll-mt-24 bg-white">
                    <div className="mx-auto max-w-7xl px-6 py-20">
                        <div className="mb-12 text-center">
                            <h2 className="font-serif text-2xl font-bold text-ustp-navy sm:text-3xl">
                                System Modules
                            </h2>
                            <div className="mx-auto mt-3 h-1 w-16 rounded-full bg-ustp-gold" />
                            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-ustp-navy/60">
                                The system integrates six core modules to
                                centralize and streamline ICT management
                                operations at USTP Balubal Campus.
                            </p>
                        </div>

                        <div className="relative">
                            <div className="mx-auto overflow-hidden px-9 py-2 sm:px-0">
                                <div
                                    className="flex transition-transform duration-500 ease-out"
                                    style={{
                                        transform: `translateX(-${currentPage * 100}%)`,
                                    }}
                                >
                                    {modules.map((mod) => {
                                        const Icon = mod.icon;

                                        return (
                                            <div
                                                key={mod.title}
                                                className="min-w-0 shrink-0 px-3"
                                                style={{
                                                    flexBasis: `${100 / itemsPerView}%`,
                                                }}
                                            >
                                                <div className="group flex h-full flex-col rounded-xl border border-ustp-gray-medium bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-ustp-gold/40 hover:shadow-lg">
                                                    <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-ustp-navy/5 text-ustp-navy transition-colors group-hover:bg-ustp-gold/10 group-hover:text-ustp-gold">
                                                        <Icon className="size-6" />
                                                    </div>
                                                    <h3 className="font-serif text-lg font-bold text-ustp-navy">
                                                        {mod.title}
                                                    </h3>
                                                    <p className="mt-2 text-sm leading-relaxed text-ustp-navy/60">
                                                        {mod.description}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {totalPages > 1 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setCurrentPage((page) =>
                                                Math.max(page - 1, 0),
                                            )
                                        }
                                        disabled={currentPage === 0}
                                        aria-label="Previous slide"
                                        className="absolute top-1/2 left-0 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-ustp-gray-medium bg-white text-ustp-navy shadow-md transition-all hover:border-ustp-gold hover:text-ustp-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-ustp-gold disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <ChevronLeft className="size-5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setCurrentPage((page) =>
                                                Math.min(
                                                    page + 1,
                                                    totalPages - 1,
                                                ),
                                            )
                                        }
                                        disabled={
                                            currentPage === totalPages - 1
                                        }
                                        aria-label="Next slide"
                                        className="absolute top-1/2 right-0 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-ustp-gray-medium bg-white text-ustp-navy shadow-md transition-all hover:border-ustp-gold hover:text-ustp-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-ustp-gold disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <ChevronRight className="size-5" />
                                    </button>

                                    <div className="mt-8 flex items-center justify-center gap-2">
                                        {Array.from({ length: totalPages }).map(
                                            (_, index) => (
                                                <button
                                                    key={index}
                                                    type="button"
                                                    onClick={() =>
                                                        setCurrentPage(index)
                                                    }
                                                    aria-label={`Go to slide ${index + 1}`}
                                                    className={`h-2.5 rounded-full transition-all ${
                                                        index === currentPage
                                                            ? 'w-8 bg-ustp-gold'
                                                            : 'w-2.5 bg-ustp-navy/20 hover:bg-ustp-navy/40'
                                                    }`}
                                                />
                                            ),
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </section>

                {/* How It Works */}
                <section
                    id="how-it-works"
                    className="scroll-mt-24 bg-ustp-gray/50"
                >
                    <div className="mx-auto max-w-7xl px-6 py-20">
                        <div className="mb-12 text-center">
                            <h2 className="font-serif text-2xl font-bold text-ustp-navy sm:text-3xl">
                                From Registration to ICT Support
                            </h2>
                            <div className="mx-auto mt-3 h-1 w-16 rounded-full bg-ustp-gold" />
                            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-ustp-navy/60">
                                Create your account, verify your email, and wait
                                for ICT Admin approval before signing in.
                            </p>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                            {workflowSteps.map((step) => (
                                <div
                                    key={step.step}
                                    className="group relative rounded-xl border border-ustp-gray-medium bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-ustp-gold/40 hover:shadow-lg"
                                >
                                    <span className="text-[11px] font-bold tracking-[0.18em] text-ustp-navy/40 uppercase">
                                        Step {step.step}
                                    </span>
                                    <div className="mt-3 mb-4 flex size-11 items-center justify-center rounded-full bg-ustp-navy text-lg font-bold text-white transition-colors group-hover:bg-ustp-gold group-hover:text-ustp-navy">
                                        {step.step}
                                    </div>
                                    <h3 className="font-serif text-base font-bold text-ustp-navy">
                                        {step.title}
                                    </h3>
                                    <p className="mt-2 text-sm leading-relaxed text-ustp-navy/60">
                                        {step.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* User Roles */}
                <section id="roles" className="scroll-mt-24 bg-white">
                    <div className="mx-auto max-w-7xl px-6 py-20">
                        <div className="mb-12 text-center">
                            <h2 className="font-serif text-2xl font-bold text-ustp-navy sm:text-3xl">
                                Built for Every Role
                            </h2>
                            <div className="mx-auto mt-3 h-1 w-16 rounded-full bg-ustp-gold" />
                            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-ustp-navy/60">
                                The system provides tailored access and features
                                for each user type within the campus.
                            </p>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-3">
                            {roles.map((item) => {
                                const Icon = item.icon;

                                return (
                                    <div
                                        key={item.role}
                                        className="group flex flex-col rounded-xl border border-ustp-gray-medium bg-white p-8 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-ustp-gold/40 hover:shadow-lg"
                                    >
                                        <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-ustp-gold/10 text-ustp-gold transition-colors group-hover:bg-ustp-gold/20">
                                            <Icon className="size-6" />
                                        </div>
                                        <h3 className="font-serif text-lg font-bold text-ustp-navy">
                                            {item.role}
                                        </h3>
                                        <p className="mt-2 text-sm leading-relaxed text-ustp-navy/60">
                                            {item.description}
                                        </p>
                                        <ul className="mt-4 space-y-2">
                                            {item.features.map((feature) => (
                                                <li
                                                    key={feature}
                                                    className="flex items-center gap-2 text-sm text-ustp-navy/70"
                                                >
                                                    <CheckCircle className="size-4 shrink-0 text-ustp-gold" />
                                                    {feature}
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="mt-auto">
                                            <p className="mt-4 min-h-10 text-xs leading-relaxed text-ustp-navy/60">
                                                {item.registrationNote}
                                            </p>
                                            <Link
                                                href={item.href}
                                                className="mt-6 inline-flex items-center gap-1.5 border-t border-ustp-gray-medium pt-4 text-sm font-bold text-ustp-navy transition-colors hover:text-ustp-gold-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-ustp-gold"
                                            >
                                                Sign in
                                            </Link>
                                            <div className="mt-3 min-h-5">
                                                {!auth.user &&
                                                    item.registerHref && (
                                                        <Link
                                                            href={
                                                                item.registerHref
                                                            }
                                                            className="inline-flex items-center gap-1.5 text-sm font-bold text-ustp-navy transition-colors hover:text-ustp-gold-dark"
                                                        >
                                                            Create an account{' '}
                                                            <ArrowRight className="size-4" />
                                                        </Link>
                                                    )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="bg-ustp-gray/50">
                    <div className="mx-auto max-w-7xl px-6 py-20">
                        <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-ustp-navy to-ustp-navy-dark p-10 text-center shadow-xl sm:p-14">
                            <div className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-ustp-gold/10 blur-3xl" />
                            <div className="pointer-events-none absolute -bottom-24 -left-16 size-64 rounded-full bg-ustp-light-blue/10 blur-3xl" />
                            <div className="relative">
                                <h2 className="font-serif text-2xl font-bold text-white sm:text-3xl">
                                    Ready to streamline your ICT services?
                                </h2>
                                <p className="mx-auto mt-4 max-w-lg text-white/60">
                                    Sign in to the USTP Balubal ICT Portal to
                                    submit requests, book facilities, and manage
                                    ICT operations all in one place.
                                </p>
                                <div className="mt-8 flex flex-wrap justify-center gap-4">
                                    {!auth.user && (
                                        <>
                                            <Button
                                                asChild
                                                variant="secondary"
                                                size="lg"
                                                className="px-7"
                                            >
                                                <Link href={login()}>
                                                    Sign in
                                                </Link>
                                            </Button>
                                            <Button
                                                asChild
                                                variant="outline"
                                                size="lg"
                                                className="border-white/20 px-7 text-white/80 hover:border-ustp-gold/50 hover:bg-white/5 hover:text-white"
                                            >
                                                <Link href={register()}>
                                                    Faculty Registration
                                                </Link>
                                            </Button>
                                            <Button
                                                asChild
                                                variant="outline"
                                                size="lg"
                                                className="border-white/20 px-7 text-white/80 hover:border-ustp-gold/50 hover:bg-white/5 hover:text-white"
                                            >
                                                <Link
                                                    href={register({
                                                        query: {
                                                            role: 'student',
                                                        },
                                                    })}
                                                >
                                                    Student Registration
                                                </Link>
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Clean Multi-Column Footer Architecture for USTP Balubal WBIMIS */}
                <footer
                    id="contact"
                    className="border-t border-ustp-gold/20 bg-ustp-navy text-white"
                >
                    <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
                        {/* Top System Identity Strip */}
                        <div className="mb-14 flex flex-col items-start justify-between gap-6 border-b border-white/10 pb-10 sm:flex-row sm:items-center">
                            <div className="flex items-center gap-3.5">
                                <div className="flex size-11 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm">
                                    <img
                                        src={ustpLogo}
                                        alt="USTP Logo"
                                        className="size-full object-contain"
                                    />
                                </div>
                                <div>
                                    <h3 className="font-serif text-base font-bold text-white">
                                        Web-Based ICT Management and Information
                                        System (WBIMIS)
                                    </h3>
                                    <p className="text-xs font-medium text-ustp-gold">
                                        USTP Balubal Campus
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 6-Column Structured Grid */}
                        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6 lg:gap-8">
                            {/* Column 1: Services */}
                            <div>
                                <h4 className="text-xs font-bold tracking-wider text-ustp-gold uppercase">
                                    Services
                                </h4>
                                <ul className="mt-4 space-y-3 text-sm text-white/70">
                                    <li>
                                        <a
                                            href="#modules"
                                            className="transition-colors hover:text-ustp-gold"
                                        >
                                            Service Requests
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="#modules"
                                            className="transition-colors hover:text-ustp-gold"
                                        >
                                            Job Order Dispatch
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="#modules"
                                            className="transition-colors hover:text-ustp-gold"
                                        >
                                            SLA Monitoring
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="#modules"
                                            className="transition-colors hover:text-ustp-gold"
                                        >
                                            Facility Booking
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="#modules"
                                            className="transition-colors hover:text-ustp-gold"
                                        >
                                            Email & MS 365
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="#modules"
                                            className="transition-colors hover:text-ustp-gold"
                                        >
                                            Lab Incidents
                                        </a>
                                    </li>
                                </ul>
                            </div>

                            {/* Column 2: System Features */}
                            <div>
                                <h4 className="text-xs font-bold tracking-wider text-ustp-gold uppercase">
                                    Features
                                </h4>
                                <ul className="mt-4 space-y-3 text-sm text-white/70">
                                    <li>
                                        <a
                                            href="#modules"
                                            className="transition-colors hover:text-ustp-gold"
                                        >
                                            Equipment Inventory
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="#modules"
                                            className="transition-colors hover:text-ustp-gold"
                                        >
                                            Defect Lifecycle
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="#modules"
                                            className="transition-colors hover:text-ustp-gold"
                                        >
                                            QR Asset Tagging
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="#modules"
                                            className="transition-colors hover:text-ustp-gold"
                                        >
                                            Schedule Overlaps
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="#modules"
                                            className="transition-colors hover:text-ustp-gold"
                                        >
                                            Liability Settlement
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="#modules"
                                            className="transition-colors hover:text-ustp-gold"
                                        >
                                            Brevo Email Alerts
                                        </a>
                                    </li>
                                </ul>
                            </div>

                            {/* Column 3: Portals */}
                            <div>
                                <h4 className="text-xs font-bold tracking-wider text-ustp-gold uppercase">
                                    Portals
                                </h4>
                                <ul className="mt-4 space-y-3 text-sm text-white/70">
                                    <li>
                                        <Link
                                            href={facultyLogin().url}
                                            className="transition-colors hover:text-ustp-gold"
                                        >
                                            Faculty & Staff
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href={studentLogin().url}
                                            className="transition-colors hover:text-ustp-gold"
                                        >
                                            Student Portal
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href={adminLogin().url}
                                            className="transition-colors hover:text-ustp-gold"
                                        >
                                            ICT Administrator
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href={register()}
                                            className="transition-colors hover:text-ustp-gold"
                                        >
                                            Faculty Registration
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href={
                                                register({
                                                    query: { role: 'student' },
                                                }).url
                                            }
                                            className="transition-colors hover:text-ustp-gold"
                                        >
                                            Student Registration
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href={login()}
                                            className="transition-colors hover:text-ustp-gold"
                                        >
                                            Portal Selection
                                        </Link>
                                    </li>
                                </ul>
                            </div>

                            {/* Column 4: Resources */}
                            <div>
                                <h4 className="text-xs font-bold tracking-wider text-ustp-gold uppercase">
                                    Resources
                                </h4>
                                <ul className="mt-4 space-y-3 text-sm text-white/70">
                                    <li>
                                        <a
                                            href="#how-it-works"
                                            className="transition-colors hover:text-ustp-gold"
                                        >
                                            Registration Flow
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="#how-it-works"
                                            className="transition-colors hover:text-ustp-gold"
                                        >
                                            Email OTP Setup
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="#roles"
                                            className="transition-colors hover:text-ustp-gold"
                                        >
                                            Role Privileges
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="#modules"
                                            className="transition-colors hover:text-ustp-gold"
                                        >
                                            Service Catalog
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="#modules"
                                            className="transition-colors hover:text-ustp-gold"
                                        >
                                            Form FM-USTP-ICT-001
                                        </a>
                                    </li>
                                </ul>
                            </div>

                            {/* Column 5: Campus Office */}
                            <div>
                                <h4 className="text-xs font-bold tracking-wider text-ustp-gold uppercase">
                                    Campus Office
                                </h4>
                                <ul className="mt-4 space-y-3 text-sm text-white/70">
                                    <li>
                                        <span>Balubal Campus</span>
                                    </li>
                                    <li>
                                        <span>Cagayan de Oro City</span>
                                    </li>
                                    <li>
                                        <span>Misamis Oriental, 9000</span>
                                    </li>
                                    <li>
                                        <a
                                            href="tel:+63888561234"
                                            className="transition-colors hover:text-ustp-gold"
                                        >
                                            +63 88 856 1234
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="mailto:balubal@ustp.edu.ph"
                                            className="transition-colors hover:text-ustp-gold"
                                        >
                                            balubal@ustp.edu.ph
                                        </a>
                                    </li>
                                </ul>
                            </div>

                            {/* Column 6: Legal & Socials */}
                            <div>
                                <h4 className="text-xs font-bold tracking-wider text-ustp-gold uppercase">
                                    Legal
                                </h4>
                                <ul className="mt-4 space-y-3 text-sm text-white/70">
                                    <li>
                                        <Link
                                            href="/terms"
                                            className="transition-colors hover:text-ustp-gold"
                                        >
                                            Terms of Service
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href="/privacy-policy"
                                            className="transition-colors hover:text-ustp-gold"
                                        >
                                            Privacy Policy
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href="/data-privacy"
                                            className="transition-colors hover:text-ustp-gold"
                                        >
                                            Data Privacy (RA 10173)
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href="/acceptable-use"
                                            className="transition-colors hover:text-ustp-gold"
                                        >
                                            Acceptable Use Policy
                                        </Link>
                                    </li>
                                </ul>

                                <h4 className="mt-8 text-xs font-bold tracking-wider text-ustp-gold uppercase">
                                    Socials
                                </h4>
                                <ul className="mt-3 space-y-2.5 text-sm text-white/70">
                                    <li>
                                        <a
                                            href="https://www.facebook.com/USTPBalubal"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group flex items-center gap-2.5 transition-colors hover:text-ustp-gold"
                                        >
                                            <span className="flex size-6 items-center justify-center rounded-md bg-white/10 transition-colors group-hover:bg-ustp-gold/20">
                                                <svg
                                                    className="size-3.5 fill-current"
                                                    viewBox="0 0 24 24"
                                                    aria-hidden="true"
                                                >
                                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                                </svg>
                                            </span>
                                            <span>Facebook</span>
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="mailto:balubal@ustp.edu.ph"
                                            className="group flex items-center gap-2.5 transition-colors hover:text-ustp-gold"
                                        >
                                            <span className="flex size-6 items-center justify-center rounded-md bg-white/10 transition-colors group-hover:bg-ustp-gold/20">
                                                <Mail className="size-3.5" />
                                            </span>
                                            <span>Campus Email</span>
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="https://www.ustp.edu.ph"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group flex items-center gap-2.5 transition-colors hover:text-ustp-gold"
                                        >
                                            <span className="flex size-6 items-center justify-center rounded-md bg-white/10 transition-colors group-hover:bg-ustp-gold/20">
                                                <Globe className="size-3.5" />
                                            </span>
                                            <span>USTP Website</span>
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Bottom Bar */}
                        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs text-white/50 sm:flex-row">
                            <p>
                                &copy; {new Date().getFullYear()} University of
                                Science and Technology of Southern Philippines —
                                Balubal Campus.
                            </p>
                            <p>
                                Web-Based ICT Management and Information System
                            </p>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
