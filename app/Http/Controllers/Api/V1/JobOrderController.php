<?php

namespace App\Http\Controllers\Api\V1;

use App\Mail\JobOrderCompleted;
use App\Mail\TechnicianAssigned;
use App\Mail\TechnicianResponse;
use App\Models\AuditLog;
use App\Models\JobOrder;
use App\Models\Notification;
use App\Models\User;
use App\Services\SlaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class JobOrderController extends ApiController
{
    /**
     * List job orders.
     */
    public function index(Request $request): JsonResponse
    {
        $query = JobOrder::with(['serviceRequest.user', 'serviceRequest.requestServices.serviceType', 'technician']);

        if (! $this->isAdmin()) {
            $query->where('assigned_to', $this->user()->id);
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('id', 'like', "%{$search}%")
                    ->orWhereHas('serviceRequest.user', fn ($q) => $q->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('technician', fn ($q) => $q->where('name', 'like', "%{$search}%"));
            });
        }

        $sort = $request->input('sort', 'status');
        if ($sort === 'oldest') {
            $query->oldest();
        } elseif ($sort === 'newest') {
            $query->latest();
        } else {
            $query->orderByRaw("CASE WHEN status = 'open' THEN 1 WHEN status = 'in_progress' THEN 2 WHEN status = 'completed' THEN 3 WHEN status = 'closed' THEN 4 ELSE 5 END ASC")->latest();
        }

        $jobOrders = $query->paginate((int) $request->input('per_page', 25))->withQueryString();

        return response()->json([
            'data' => $jobOrders->items(),
            'meta' => collect($jobOrders->toArray())->except(['data']),
        ]);
    }

    /**
     * Show a single job order.
     */
    public function show(string $id): JsonResponse
    {
        $jobOrder = JobOrder::with([
            'serviceRequest.user',
            'serviceRequest.requestServices.serviceType',
            'technician',
            'technicianResponses.technician',
        ])->findOrFail($id);

        $isAdmin = $this->isAdmin();
        $isRequester = $jobOrder->serviceRequest->user_id === $this->user()->id;
        $isAssigned = $jobOrder->assigned_to === $this->user()->id;

        if (! $isAdmin && ! $isRequester && ! $isAssigned) {
            abort(403, 'You are not allowed to view this job order.');
        }

        return response()->json([
            'jobOrder' => $jobOrder,
            'isAdmin' => $isAdmin,
            'canRate' => $isRequester
                && in_array($jobOrder->status, ['completed', 'closed'])
                && is_null($jobOrder->rating),
            'canVerify' => $isRequester && $jobOrder->status === 'completed',
            'technicians' => User::whereHas('role', fn ($q) => $q->where('role_name', 'ict_admin'))->get(['id', 'name']),
        ]);
    }

    /**
     * Update a job order (admin management).
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $this->ensureAdmin();

        $validated = $request->validate([
            'assigned_to' => ['nullable', 'exists:users,id'],
            'status' => ['required', 'in:open,in_progress,completed,closed'],
            'final_remarks' => ['nullable', 'in:outsource_repair,replacement,disposal,task_completed'],
            'support_type' => ['nullable', 'in:on_site,remote'],
            'user_permission_granted' => ['nullable', 'boolean'],
            'estimated_repair_days' => ['nullable', 'integer', 'min:1'],
            'replacement_provided' => ['nullable', 'boolean'],
            'replacement_item_id' => ['nullable', 'exists:inventory_items,id'],
            'report' => ['nullable', 'string'],
            'resolution' => ['nullable', 'string'],
            'action_taken' => ['nullable', 'string', 'max:150'],
        ]);

        $jobOrder = JobOrder::findOrFail($id);
        $oldStatus = $jobOrder->status;

        $supportType = $validated['support_type'] ?? $jobOrder->support_type;
        $userPermissionGranted = $validated['user_permission_granted']
            ?? $jobOrder->user_permission_granted;

        if ($supportType === 'remote' && ! $userPermissionGranted) {
            throw ValidationException::withMessages([
                'user_permission_granted' => 'Requester permission is required before remote support can be saved.',
            ]);
        }

        if ($validated['status'] === 'closed' && $oldStatus !== 'closed') {
            throw ValidationException::withMessages([
                'status' => 'The requester must verify the completed work before the job order can be closed.',
            ]);
        }

        if (isset($validated['assigned_to']) && ! $jobOrder->date_assigned) {
            $validated['date_assigned'] = now();
            $jobOrder->date_assigned = $validated['date_assigned'];
            $validated['sla_deadline'] = SlaService::calculateResolutionDeadline($jobOrder);
            $validated['sla_status'] = 'on_track';

            $technician = User::find($validated['assigned_to']);
            if ($technician) {
                Notification::create([
                    'user_id' => $technician->id,
                    'message' => 'You have been assigned to job order #'.$jobOrder->job_order_number.'.',
                    'notification_type' => 'job_order',
                    'link' => '/job-orders/'.$jobOrder->id,
                    'notification_status' => 'unread',
                ]);

                Mail::to($technician->email)->queue(
                    new TechnicianAssigned($technician->name, $jobOrder->job_order_number, $jobOrder->id)
                );
            }
        }

        if ($validated['status'] === 'in_progress' && ! $jobOrder->date_in_progress) {
            $validated['date_in_progress'] = now();
        }

        if ($validated['status'] === 'completed' && ! $jobOrder->date_completed) {
            $validated['date_completed'] = now();
        }

        if ($validated['status'] === 'closed' && ! $jobOrder->date_closed) {
            $validated['date_closed'] = now();
        }

        $jobOrder->update($validated);

        if ($validated['status'] !== $oldStatus) {
            AuditLog::record("Job order status changed from {$oldStatus} to {$validated['status']}", 'job_orders', $jobOrder->id);
        }

        if ($validated['status'] === 'completed' && $oldStatus !== 'completed') {
            Notification::create([
                'user_id' => $jobOrder->serviceRequest->user_id,
                'message' => 'Your job order #'.$jobOrder->job_order_number.' has been completed. Please rate the service.',
                'notification_type' => 'job_order',
                'link' => '/job-orders/'.$jobOrder->id,
                'notification_status' => 'unread',
            ]);

            Mail::to($jobOrder->serviceRequest->user->email)->queue(
                new JobOrderCompleted($jobOrder->serviceRequest->user->name, $jobOrder->id)
            );
        }

        $this->updateServiceRequestStatus($jobOrder);

        return response()->json([
            'message' => 'Job order updated successfully.',
            'jobOrder' => $jobOrder->load('serviceRequest'),
        ]);
    }

    /**
     * Rate a completed job order (requester).
     */
    public function rate(Request $request, string $id): JsonResponse
    {
        $jobOrder = JobOrder::with('serviceRequest')->findOrFail($id);

        if ($jobOrder->serviceRequest->user_id !== $this->user()->id) {
            abort(403, 'Only the requester can rate this job order.');
        }

        if (! in_array($jobOrder->status, ['completed', 'closed'])) {
            abort(422, 'Job order must be completed or closed before rating.');
        }

        if (! is_null($jobOrder->rating)) {
            abort(422, 'This job order has already been rated.');
        }

        $validated = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'requester_comment' => ['nullable', 'string', 'max:1000'],
        ]);

        $jobOrder->update($validated);

        return response()->json(['message' => 'Thank you for your feedback!', 'jobOrder' => $jobOrder]);
    }

    /**
     * Add a technician response to a job order (admin).
     */
    public function addResponse(Request $request, string $id): JsonResponse
    {
        $this->ensureAdmin();

        $validated = $request->validate([
            'response_report' => ['required', 'string'],
            'response_type' => ['nullable', 'in:progress,finding,resolution'],
            'time_spent_minutes' => ['nullable', 'integer', 'min:0'],
        ]);

        $jobOrder = JobOrder::findOrFail($id);

        $jobOrder->technicianResponses()->create([
            'technician_id' => $this->user()->id,
            'response_report' => $validated['response_report'],
            'response_type' => $validated['response_type'] ?? 'progress',
            'time_spent_minutes' => $validated['time_spent_minutes'] ?? null,
            'date_responded' => now(),
        ]);

        Notification::create([
            'user_id' => $jobOrder->serviceRequest->user_id,
            'message' => 'Technician has added an update to your job order #'.$jobOrder->job_order_number.'.',
            'notification_type' => 'job_order',
            'link' => '/job-orders/'.$jobOrder->id,
            'notification_status' => 'unread',
        ]);

        Mail::to($jobOrder->serviceRequest->user->email)->queue(
            new TechnicianResponse(
                $jobOrder->serviceRequest->user->name,
                $jobOrder->job_order_number,
                $jobOrder->id,
                $this->user()->name
            )
        );

        return response()->json(['message' => 'Response added successfully.'], 201);
    }

    /**
     * Verify a completed job order (requester).
     */
    public function verify(Request $request, string $id): JsonResponse
    {
        $jobOrder = JobOrder::with('serviceRequest')->findOrFail($id);

        if ($jobOrder->serviceRequest->user_id !== $this->user()->id) {
            abort(403, 'Only the requester can verify this job order.');
        }

        if ($jobOrder->status !== 'completed') {
            abort(422, 'Job order must be completed before verification.');
        }

        $validated = $request->validate([
            'verified' => ['required', 'boolean'],
        ]);

        if ($validated['verified']) {
            $jobOrder->update([
                'status' => 'closed',
                'date_closed' => now(),
            ]);

            AuditLog::record('Job order verified and closed by requester', 'job_orders', $jobOrder->id);

            if ($jobOrder->assigned_to) {
                Notification::create([
                    'user_id' => $jobOrder->assigned_to,
                    'message' => 'Job order #'.$jobOrder->job_order_number.' has been verified and closed by the requester.',
                    'notification_type' => 'job_order',
                    'link' => '/job-orders/'.$jobOrder->id,
                    'notification_status' => 'unread',
                ]);
            }

            $this->updateServiceRequestStatus($jobOrder);

            return response()->json(['message' => 'Job order verified and closed successfully.', 'jobOrder' => $jobOrder]);
        }

        $jobOrder->update(['status' => 'in_progress']);

        AuditLog::record('Job order returned to in_progress by requester', 'job_orders', $jobOrder->id);

        if ($jobOrder->assigned_to) {
            Notification::create([
                'user_id' => $jobOrder->assigned_to,
                'message' => 'Job order #'.$jobOrder->job_order_number.' has been returned by the requester. The issue persists.',
                'notification_type' => 'job_order',
                'link' => '/job-orders/'.$jobOrder->id,
                'notification_status' => 'unread',
            ]);
        }

        return response()->json(['message' => 'Job order returned to technician for further work.', 'jobOrder' => $jobOrder]);
    }

    /**
     * Update the service request status when all job orders are complete.
     */
    protected function updateServiceRequestStatus(JobOrder $jobOrder): void
    {
        $serviceRequest = $jobOrder->serviceRequest;
        $allJobOrders = $serviceRequest->jobOrders;
        $allComplete = $allJobOrders->every(fn ($jo) => in_array($jo->status, ['completed', 'closed']));

        if ($allComplete && $serviceRequest->request_status !== 'completed') {
            $serviceRequest->update(['request_status' => 'completed']);
        }
    }
}
