import { Form, Head, Link, router, usePage } from '@inertiajs/react';
import {
    Camera,
    CheckCircle2,
    Loader2,
    Mail,
    Pencil,
    ShieldAlert,
    Trash2,
    User,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import InputError from '@/components/input-error';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import { edit } from '@/routes/profile';
import { send } from '@/routes/verification';
import type { Auth } from '@/types';

type PageProps = {
    auth: Auth;
};

const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage<PageProps>().props;
    const getInitials = useInitials();
    const role = (auth.user.role as { role_name?: string } | undefined)
        ?.role_name;
    const isStudent = role === 'student';
    const department =
        typeof auth.user.department === 'string' ? auth.user.department : null;
    const isVerified = auth.user.email_verified_at !== null;
    const displayText = (value: unknown): string =>
        typeof value === 'string' && value.trim() !== ''
            ? value.replace(/_/g, ' ')
            : '—';
    const memberSince = new Date(auth.user.created_at).toLocaleDateString(
        'en-US',
        { month: 'long', year: 'numeric' },
    );

    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);
    const nameInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editing) {
            nameInputRef.current?.focus();
        }
    }, [editing]);

    useEffect(() => {
        const preview = avatarPreview;

        return () => {
            if (preview) {
                URL.revokeObjectURL(preview);
            }
        };
    }, [avatarPreview]);

    const handleAvatarSelect = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file) {
            return;
        }

        if (!AVATAR_TYPES.includes(file.type)) {
            setAvatarError('Please choose a JPG, PNG, or WebP image.');

            return;
        }

        if (file.size > AVATAR_MAX_BYTES) {
            setAvatarError('Image must be 2 MB or smaller.');

            return;
        }

        const preview = URL.createObjectURL(file);

        setAvatarPreview(preview);
        setAvatarError(null);
        setAvatarUploading(true);

        router.patch(
            ProfileController.updateAvatar.url(),
            { avatar: file },
            {
                forceFormData: true,
                preserveScroll: true,
                onError: (errors) => {
                    setAvatarPreview(null);
                    setAvatarError(
                        errors.avatar ??
                            'The photo could not be uploaded. Please try again.',
                    );
                },
                onFinish: () => {
                    setAvatarPreview((current) => {
                        if (current) {
                            URL.revokeObjectURL(current);
                        }

                        return null;
                    });
                    setAvatarUploading(false);
                },
            },
        );
    };

    const handleAvatarRemove = () => {
        setAvatarError(null);

        router.delete(ProfileController.removeAvatar.url(), {
            preserveScroll: true,
            onError: (errors) => {
                setAvatarError(
                    errors.avatar ?? 'The photo could not be removed.',
                );
            },
        });
    };

    return (
        <>
            <Head title="Profile settings" />

            <div className="space-y-6">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="h-20 bg-linear-to-r from-ustp-navy via-ustp-navy-light to-ustp-navy-dark" />

                    <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-start">
                            <label
                                className="group relative -mt-14 block size-20 shrink-0 cursor-pointer overflow-hidden rounded-2xl shadow-lg ring-4 ring-white transition-shadow focus-within:ring-ustp-gold hover:shadow-xl"
                                title="Upload a new profile photo"
                            >
                                <input
                                    type="file"
                                    accept={AVATAR_TYPES.join(',')}
                                    className="sr-only"
                                    disabled={avatarUploading}
                                    onChange={handleAvatarSelect}
                                />

                                <Avatar className="size-20 rounded-2xl">
                                    {(avatarPreview ?? auth.user.avatar) && (
                                        <AvatarImage
                                            src={
                                                avatarPreview ??
                                                auth.user.avatar
                                            }
                                            alt={auth.user.name}
                                            className="object-cover"
                                        />
                                    )}
                                    <AvatarFallback className="rounded-2xl bg-ustp-navy text-2xl font-bold text-ustp-gold">
                                        {getInitials(auth.user.name)}
                                    </AvatarFallback>
                                </Avatar>

                                <span
                                    className={cn(
                                        'absolute inset-0 flex items-center justify-center bg-slate-900/0 text-white/0 transition-colors',
                                        !avatarUploading &&
                                            'group-hover:bg-slate-900/50 group-hover:text-white',
                                        avatarUploading &&
                                            'bg-slate-900/60 text-white',
                                    )}
                                    aria-hidden="true"
                                >
                                    {avatarUploading ? (
                                        <Loader2 className="size-5 animate-spin" />
                                    ) : (
                                        <Camera className="size-5" />
                                    )}
                                </span>
                            </label>

                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="truncate text-xl font-bold text-slate-900">
                                        {auth.user.name}
                                    </p>

                                    {role && (
                                        <span className="inline-flex rounded-lg bg-ustp-gold/15 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-ustp-gold-dark uppercase ring-1 ring-ustp-gold/30">
                                            {role === 'faculty'
                                                ? 'Faculty'
                                                : role.replace(/_/g, ' ')}
                                        </span>
                                    )}
                                </div>

                                <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-slate-500">
                                    <Mail className="size-3.5 shrink-0" />
                                    {auth.user.email}
                                </p>

                                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                    {auth.user.avatar && !avatarUploading && (
                                        <button
                                            type="button"
                                            onClick={handleAvatarRemove}
                                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                                        >
                                            <Trash2 className="size-3" />
                                            Remove photo
                                        </button>
                                    )}
                                </div>

                                {avatarError && (
                                    <p
                                        role="alert"
                                        className="mt-2 text-xs font-medium text-red-500"
                                    >
                                        {avatarError}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
                            {!editing && (
                                <Button
                                    type="button"
                                    onClick={() => setEditing(true)}
                                    className="bg-ustp-navy text-white shadow-md shadow-ustp-navy/20 hover:bg-ustp-navy-dark"
                                >
                                    <Pencil className="size-4" />
                                    Edit profile
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                <Form
                    {...ProfileController.update.form()}
                    id="profile-form"
                    options={{
                        preserveScroll: true,
                    }}
                    onSuccess={() => setEditing(false)}
                >
                    {({
                        processing,
                        errors,
                        isDirty,
                        recentlySuccessful,
                        resetAndClearErrors,
                    }) => (
                        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
                            <div className="flex items-start gap-4 border-b border-slate-100 p-6 sm:p-8">
                                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700">
                                    <User className="size-6" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">
                                        Personal information
                                    </h2>
                                    <p className="text-sm text-slate-500">
                                        {editing
                                            ? 'Update your name and email address'
                                            : 'Your account details on file'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-5 p-6 sm:p-8">
                                {mustVerifyEmail && !isVerified && (
                                    <div className="flex flex-col gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-start gap-3">
                                            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
                                            <div>
                                                <p className="text-sm font-semibold text-amber-800">
                                                    Your email address is
                                                    unverified
                                                </p>
                                                <p className="mt-0.5 text-sm text-amber-700">
                                                    We can send a new
                                                    verification link to your
                                                    inbox.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end">
                                            <Link
                                                href={send()}
                                                as="button"
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-semibold text-amber-700 shadow-xs transition-colors hover:bg-amber-100"
                                            >
                                                <Mail className="size-3.5" />
                                                Resend verification email
                                            </Link>

                                            {status ===
                                                'verification-link-sent' && (
                                                <span className="text-xs font-medium text-emerald-600">
                                                    Verification link sent to
                                                    your email address.
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="name"
                                            className="text-slate-700"
                                        >
                                            Name
                                        </Label>

                                        <Input
                                            id="name"
                                            className="mt-1 block w-full"
                                            defaultValue={auth.user.name}
                                            name="name"
                                            required
                                            autoComplete="name"
                                            placeholder="Full name"
                                            disabled={!editing}
                                            ref={nameInputRef}
                                        />

                                        <InputError
                                            className="mt-1"
                                            message={errors.name}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="email"
                                            className="text-slate-700"
                                        >
                                            Email address
                                        </Label>

                                        <Input
                                            id="email"
                                            type="email"
                                            className="mt-1 block w-full"
                                            defaultValue={auth.user.email}
                                            name="email"
                                            required
                                            autoComplete="username"
                                            placeholder="Email address"
                                            disabled={!editing}
                                        />

                                        <InputError
                                            className="mt-1"
                                            message={errors.email}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="department"
                                            className="text-slate-700"
                                        >
                                            {isStudent
                                                ? 'Program'
                                                : 'Department'}
                                        </Label>

                                        <Input
                                            id="department"
                                            className="mt-1 block w-full"
                                            value={department ?? '—'}
                                            readOnly
                                            disabled
                                        />
                                    </div>

                                    <div className="grid gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 sm:col-span-2 sm:grid-cols-2">
                                        <div>
                                            <p className="text-xs text-slate-400">
                                                {isStudent
                                                    ? 'Student ID number'
                                                    : 'Employee ID number'}
                                            </p>
                                            <p className="mt-1 text-sm font-medium text-slate-800">
                                                {displayText(
                                                    auth.user.id_number,
                                                )}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400">
                                                Member since
                                            </p>
                                            <p className="mt-1 text-sm font-medium text-slate-800">
                                                {memberSince}
                                            </p>
                                        </div>

                                        {isStudent ? (
                                            <>
                                                <div>
                                                    <p className="text-xs text-slate-400">
                                                        Year level
                                                    </p>
                                                    <p className="mt-1 text-sm font-medium text-slate-800">
                                                        {displayText(
                                                            auth.user
                                                                .year_level,
                                                        )}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-400">
                                                        Educational level
                                                    </p>
                                                    <p className="mt-1 text-sm font-medium text-slate-800 capitalize">
                                                        {displayText(
                                                            auth.user
                                                                .educational_level,
                                                        )}
                                                    </p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div>
                                                    <p className="text-xs text-slate-400">
                                                        Position
                                                    </p>
                                                    <p className="mt-1 text-sm font-medium text-slate-800">
                                                        {displayText(
                                                            auth.user.position,
                                                        )}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-400">
                                                        Employment type
                                                    </p>
                                                    <p className="mt-1 text-sm font-medium text-slate-800 capitalize">
                                                        {displayText(
                                                            auth.user
                                                                .employment_type,
                                                        )}
                                                    </p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 px-6 py-5 sm:px-8">
                                <div className="flex items-center gap-3">
                                    {recentlySuccessful && (
                                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                                            <CheckCircle2 className="size-4" />
                                            Saved
                                        </span>
                                    )}

                                    {editing && (
                                        <>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                disabled={processing}
                                                onClick={() => {
                                                    resetAndClearErrors();
                                                    setEditing(false);
                                                }}
                                            >
                                                Cancel
                                            </Button>

                                            <Button
                                                type="submit"
                                                disabled={
                                                    processing || !isDirty
                                                }
                                                data-test="update-profile-button"
                                                className="bg-ustp-navy text-white shadow-lg shadow-ustp-navy/20 hover:bg-ustp-navy-dark disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {processing && (
                                                    <Loader2 className="size-4 animate-spin" />
                                                )}
                                                Save changes
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </Form>
            </div>

            <DeleteUser />
        </>
    );
}

Profile.layout = {
    breadcrumbs: [
        {
            title: 'Profile settings',
            href: edit(),
        },
    ],
};
