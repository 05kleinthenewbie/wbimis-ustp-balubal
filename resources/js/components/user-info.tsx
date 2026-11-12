import { Avatar } from '@heroui/react';
import { useInitials } from '@/hooks/use-initials';
import type { User } from '@/types';

export function UserInfo({
    user,
    showEmail = false,
    showRole = false,
    hideDetailsOnMobile = false,
}: {
    user: User;
    showEmail?: boolean;
    showRole?: boolean;
    hideDetailsOnMobile?: boolean;
}) {
    const getInitials = useInitials();
    const showAvatar = Boolean(user.avatar && user.avatar !== '');

    const role = (user.role as { role_name?: string } | undefined)?.role_name;

    return (
        <>
            <Avatar>
                {showAvatar ? (
                    <Avatar.Image src={user.avatar} alt={user.name} />
                ) : null}
                <Avatar.Fallback>{getInitials(user.name)}</Avatar.Fallback>
            </Avatar>
            <div
                className={`grid flex-1 text-left text-sm leading-tight ${
                    hideDetailsOnMobile ? 'hidden md:grid' : ''
                }`}
            >
                <span className="truncate font-semibold text-white">
                    {user.name}
                </span>
                {showRole && role ? (
                    <span className="mt-0.5 truncate text-[10px] font-medium tracking-wider text-ustp-gold uppercase">
                        {role === 'faculty'
                            ? 'Faculty'
                            : role.replace(/_/g, ' ')}
                    </span>
                ) : showEmail ? (
                    <span className="truncate text-xs text-muted-foreground">
                        {user.email}
                    </span>
                ) : null}
            </div>
        </>
    );
}
