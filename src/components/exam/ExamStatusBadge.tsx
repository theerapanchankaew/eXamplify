import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, CheckCircle2, XCircle, Award } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Booking } from '@/types/scheduling';

type ExamStatus = 'scheduled' | 'upcoming' | 'passed' | 'failed' | 'certified';

interface ExamStatusBadgeProps {
    status: ExamStatus;
    booking?: Booking;
}

const STATUS_CONFIG = {
    scheduled: {
        icon: Calendar,
        label: 'Scheduled',
        variant: 'secondary' as const,
    },
    upcoming: {
        icon: Clock,
        label: 'Upcoming',
        variant: 'default' as const,
    },
    passed: {
        icon: CheckCircle2,
        label: 'Passed',
        variant: 'default' as const,
    },
    failed: {
        icon: XCircle,
        label: 'Failed',
        variant: 'destructive' as const,
    },
    certified: {
        icon: Award,
        label: 'Certified',
        variant: 'default' as const,
    },
};

export function ExamStatusBadge({ status, booking }: ExamStatusBadgeProps) {
    const config = STATUS_CONFIG[status];
    const Icon = config.icon;

    return (
        <Badge variant={config.variant} className="gap-1">
            <Icon className="h-3 w-3" />
            {config.label}
            {booking && status === 'upcoming' && (
                <span className="ml-1 text-xs">
                    ({formatDistanceToNow(booking.date.toDate(), { addSuffix: true })})
                </span>
            )}
        </Badge>
    );
}
