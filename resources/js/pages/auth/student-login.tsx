import { GraduationCap } from 'lucide-react';
import Login from './login';

type Props = {
    status?: string;
};

export default function StudentLogin({ status }: Props) {
    return (
        <Login
            status={status}
            canResetPassword
            showRegister
            portal="student"
            title="Student Sign In"
        />
    );
}

StudentLogin.layout = {
    wide: false,
    title: 'Student Sign In',
    icon: GraduationCap,
    iconClassName:
        'bg-green-100 text-green-600 dark:bg-green-950/60 dark:text-green-400',
};
