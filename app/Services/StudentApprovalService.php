<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Notification;
use App\Models\StudentVerification;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Records a manual review decision for a student application and notifies
 * the applicant. Shared by the dedicated student queue and the combined
 * pending-approvals panel in User Management.
 */
class StudentApprovalService
{
    public function decide(User $student, User $reviewer, string $decision, ?string $reason = null): void
    {
        DB::transaction(function () use ($student, $reviewer, $decision, $reason): void {
            $locked = User::lockForUpdate()->findOrFail($student->id);
            $previous = $locked->approval_status;
            $locked->forceFill(['approval_status' => $decision])->save();

            $verification = StudentVerification::firstOrNew(['user_id' => $locked->id]);
            $verification->user_id = $locked->id;
            $verification->forceFill([
                'reviewed_by' => $reviewer->id,
                'reviewed_at' => now(),
                'review_notes' => $reason,
            ])->save();

            AuditLog::record(
                'Student application '.$decision,
                'users',
                $locked->id,
                null,
                ['approval_status' => $previous],
                ['approval_status' => $decision],
            );

            $approved = $decision === 'approved';

            Notification::create([
                'user_id' => $locked->id,
                'message' => $approved
                    ? 'Your student registration has been approved. You can now sign in.'
                    : 'Your student registration was rejected.'.(filled($reason) ? ' Reason: '.$reason : ''),
                'notification_type' => $approved ? 'account_approval' : 'account_rejection',
                'link' => '/dashboard',
                'notification_status' => 'unread',
            ]);
        });

        try {
            app(BrevoMailService::class)->sendStudentRegistrationDecisionEmail(
                $student->email,
                $student->name,
                $decision,
                $reason,
            );
        } catch (\Throwable) {
            // The recorded decision remains authoritative if mail delivery fails.
        }
    }
}
