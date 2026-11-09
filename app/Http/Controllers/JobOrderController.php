<?php

namespace App\Http\Controllers;

use App\Mail\JobOrderCompleted;
use App\Mail\TechnicianAssigned;
use App\Mail\TechnicianResponse;
use App\Models\AuditLog;
use App\Models\JobOrder;
use App\Models\Notification;
use App\Models\Role;
use App\Models\User;
use App\Services\PrioritizationService;
use App\Services\SlaService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class JobOrderController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        $query = JobOrder::with(['serviceRequest.user', 'serviceRequest.requestServices.serviceType', 'technician']);

        if ($user->role->role_name !== 'ict_admin') {
            $query->where('assigned_to', $user->id);
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('id', 'like', "%{$search}%")
                    ->orWhereHas('serviceRequest.user', fn ($q) => $q->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('technician', fn ($q) => $q->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('serviceRequest.requestServices.serviceType', fn ($q) => $q->where('service_name', 'like', "%{$search}%"));
            });
        }

        $sort = $request->input('sort', 'status');
        if ($sort === 'oldest') {
            $query->oldest();
        } elseif ($sort === 'newest') {
            $query->latest();
        } else {
            $query->orderByRaw("CASE WHEN status = 'open' THEN 1 WHEN status = 'in_progress' THEN 2 WHEN status = 'completed' THEN 3 WHEN status = 'closed' THEN 4 ELSE 5 END ASC")
                ->orderByRaw(PrioritizationService::priorityRankExpression())
                ->oldest('created_at');
        }

        return Inertia::render('job-orders/index', [
            'jobOrders' => $query->paginate(25)->withQueryString(),
            'filters' => $request->only(['search', 'sort']),
        ]);
    }

    /**
     * Display the technician assignment overview.
     */
    public function assignments()
    {
        abort_unless(Auth::user()->role->role_name === 'ict_admin', 403);

        $jobOrders = JobOrder::with([
            'serviceRequest.user',
            'serviceRequest.requestServices.serviceType',
            'technician',
        ])
            ->orderByRaw(PrioritizationService::priorityRankExpression())
            ->oldest('created_at')
            ->get();

        $technicians = User::query()
            ->whereHas('role', fn ($query) => $query->where('role_name', 'ict_admin'))
            ->orderBy('name')
            ->get(['id', 'name', 'expertise', 'contact_no']);

        $assigned = $jobOrders->whereNotNull('assigned_to')->groupBy('assigned_to');

        $groups = $technicians->map(fn (User $technician) => [
            'technician' => [
                'id' => $technician->id,
                'name' => $technician->name,
                'department' => $technician->department,
                'expertise' => $technician->expertise,
            ],
            'job_orders' => $assigned->get($technician->id, collect())->values(),
        ]);

        return Inertia::render('job-orders/assignments', [
            'groups' => $groups,
            'unassigned' => $jobOrders->whereNull('assigned_to')->values(),
            'technicians' => $technicians->values(),
            'stats' => [
                'technicians' => $technicians->count(),
                'assigned' => $jobOrders->whereNotNull('assigned_to')->count(),
                'unassigned' => $jobOrders->whereNull('assigned_to')->count(),
                'active' => $jobOrders->whereIn('status', ['open', 'in_progress'])->count(),
            ],
        ]);
    }

    /**
     * Display the work progress of active job orders.
     */
    public function progress()
    {
        abort_unless(Auth::user()->role->role_name === 'ict_admin', 403);

        $jobOrders = JobOrder::with([
            'serviceRequest.user',
            'serviceRequest.requestServices.serviceType',
            'technician',
        ])
            ->whereIn('status', ['open', 'in_progress'])
            ->orderByRaw(PrioritizationService::priorityRankExpression())
            ->oldest('date_assigned')
            ->oldest('created_at')
            ->get();

        return Inertia::render('job-orders/progress', [
            'jobOrders' => $jobOrders,
            'stats' => [
                'active' => $jobOrders->count(),
                'in_progress' => $jobOrders->where('status', 'in_progress')->count(),
                'open' => $jobOrders->where('status', 'open')->count(),
                'overdue' => $jobOrders
                    ->whereNotNull('sla_deadline')
                    ->filter(fn (JobOrder $jobOrder) => $jobOrder->sla_deadline->isPast())
                    ->count(),
            ],
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $user = Auth::user();
        $jobOrder = JobOrder::with([
            'serviceRequest.user',
            'serviceRequest.requestServices.serviceType',
            'technician',
            'technicianResponses.technician',
        ])->findOrFail($id);

        $isAdmin = $user->role->role_name === 'ict_admin';
        $isRequester = $jobOrder->serviceRequest->user_id === $user->id;

        abort_unless($isAdmin || $isRequester, 403, 'You can only view job orders for your own requests.');
        $canRate = $isRequester
            && in_array($jobOrder->status, ['completed', 'closed'])
            && is_null($jobOrder->rating);
        $canVerify = $isRequester && $jobOrder->status === 'completed';

        return Inertia::render('job-orders/show', [
            'jobOrder' => $jobOrder,
            'isAdmin' => $isAdmin,
            'isRequester' => $isRequester,
            'canRate' => $canRate,
            'canVerify' => $canVerify,
            'technicians' => User::whereHas('role', fn ($q) => $q->where('role_name', 'ict_admin'))->get(['id', 'name', 'expertise']),
        ]);
    }

    /**
     * Display a printable copy of the official ICT Job Request Form (FM-USTP-ICT-001).
     */
    public function print(string $id)
    {
        $jobOrder = JobOrder::with([
            'serviceRequest.user',
            'serviceRequest.attachments',
            'serviceRequest.requestServices.serviceType.category',
            'technician',
        ])->findOrFail($id);

        return Inertia::render('job-orders/print', [
            'jobOrder' => $jobOrder,
            'hasAttachment' => (bool) ($jobOrder->service_request?->attachments?->isNotEmpty() ?? false),
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $user = Auth::user();

        if ($user->role->role_name !== 'ict_admin') {
            abort(403, 'Only ICT Admins can manage job orders.');
        }

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
            AuditLog::record(
                "Job order status changed from {$oldStatus} to {$validated['status']}",
                'job_orders',
                $jobOrder->id,
                null,
                ['status' => $oldStatus],
                ['status' => $validated['status']],
            );
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

        return redirect()->back()->with('status', 'Job order updated successfully.');
    }

    /**
     * Assign, change, or remove the technician responsible for a job order.
     */
    public function assign(Request $request, JobOrder $jobOrder)
    {
        abort_unless(Auth::user()->role->role_name === 'ict_admin', 403);

        $technicianRoleIds = Role::where('role_name', 'ict_admin')->pluck('id');

        $validated = $request->validate([
            'assigned_to' => ['nullable', Rule::exists('users', 'id')->whereIn('role_id', $technicianRoleIds)],
        ]);

        $assignedTo = $validated['assigned_to'] ? (int) $validated['assigned_to'] : null;
        $previous = $jobOrder->assigned_to ? (int) $jobOrder->assigned_to : null;

        if ($assignedTo === $previous) {
            return redirect()->back()->with('status', 'Technician is already assigned to this job order.');
        }

        $jobOrder->assigned_to = $assignedTo;

        if ($jobOrder->priority_level === null && $jobOrder->serviceRequest?->priority_level !== null) {
            $jobOrder->priority_level = $jobOrder->serviceRequest->priority_level;
        }

        if ($assignedTo && ! $jobOrder->date_assigned) {
            $jobOrder->date_assigned = now();
            $jobOrder->sla_deadline = SlaService::calculateResolutionDeadline($jobOrder);
            $jobOrder->sla_status = 'on_track';
        }

        $jobOrder->save();

        AuditLog::record(
            $assignedTo
                ? 'Job order technician changed to '.User::whereKey($assignedTo)->value('name')
                : 'Job order technician removed',
            'job_orders',
            $jobOrder->id,
            null,
            ['assigned_to' => $previous],
            ['assigned_to' => $assignedTo],
        );

        if ($assignedTo) {
            $technician = User::find($assignedTo);

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

        return redirect()->back()->with('status', $assignedTo
            ? 'Technician assigned successfully.'
            : 'Technician removed from the job order.');
    }

    /**
     * Update service request status based on job order completion.
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

    public function rate(Request $request, string $id)
    {
        $user = Auth::user();
        $jobOrder = JobOrder::with('serviceRequest')->findOrFail($id);

        if ($jobOrder->serviceRequest->user_id !== $user->id) {
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

        return redirect()->back()->with('status', 'Thank you for your feedback!');
    }

    public function addResponse(Request $request, string $id)
    {
        $user = Auth::user();

        if ($user->role->role_name !== 'ict_admin') {
            abort(403, 'Only ICT Admins can add technician responses.');
        }

        $validated = $request->validate([
            'response_report' => ['required', 'string'],
            'response_type' => ['nullable', 'in:progress,finding,resolution'],
            'time_spent_minutes' => ['nullable', 'integer', 'min:0'],
        ]);

        $jobOrder = JobOrder::findOrFail($id);

        $jobOrder->technicianResponses()->create([
            'technician_id' => $user->id,
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
                $user->name
            )
        );

        return redirect()->back()->with('status', 'Response added successfully.');
    }

    /**
     * Verify that the job order has been completed successfully.
     */
    public function verify(Request $request, string $id)
    {
        $user = Auth::user();
        $jobOrder = JobOrder::with('serviceRequest')->findOrFail($id);

        if ($jobOrder->serviceRequest->user_id !== $user->id) {
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

            AuditLog::record(
                'Job order verified and closed by requester',
                'job_orders',
                $jobOrder->id
            );

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

            return redirect()->back()->with('status', 'Job order verified and closed successfully.');
        }

        $jobOrder->update([
            'status' => 'in_progress',
        ]);

        AuditLog::record(
            'Job order returned to in_progress by requester',
            'job_orders',
            $jobOrder->id
        );

        if ($jobOrder->assigned_to) {
            Notification::create([
                'user_id' => $jobOrder->assigned_to,
                'message' => 'Job order #'.$jobOrder->job_order_number.' has been returned by the requester. The issue persists.',
                'notification_type' => 'job_order',
                'link' => '/job-orders/'.$jobOrder->id,
                'notification_status' => 'unread',
            ]);
        }

        return redirect()->back()->with('status', 'Job order returned to technician for further work.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
