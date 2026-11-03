<?php

namespace App\Http\Controllers;

use App\Mail\ServiceRequestApproved;
use App\Mail\ServiceRequestRejected;
use App\Models\AuditLog;
use App\Models\Notification;
use App\Models\ServiceCategory;
use App\Models\ServiceRequest as ServiceRequestModel;
use App\Models\ServiceType;
use App\Services\PrioritizationService;
use App\Services\SlaService;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ServiceRequestController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $isAdmin = $user->role->role_name === 'ict_admin';

        $query = ServiceRequestModel::with(['user', 'requestServices.serviceType.category']);

        if (! $isAdmin) {
            $query->where('user_id', $user->id);
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('id', 'like', "%{$search}%")
                    ->orWhere('problem_description', 'like', "%{$search}%")
                    ->orWhereHas('user', fn ($q) => $q->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('requestServices.serviceType', fn ($q) => $q->where('service_name', 'like', "%{$search}%"));
            });
        }

        $sort = $request->input('sort', 'status');
        if ($sort === 'oldest') {
            $query->oldest();
        } elseif ($sort === 'newest') {
            $query->latest();
        } else {
            $query->orderByRaw("CASE WHEN request_status = 'pending' THEN 1 WHEN request_status = 'approved' THEN 2 WHEN request_status = 'rejected' THEN 3 WHEN request_status = 'completed' THEN 4 ELSE 5 END ASC")
                ->orderByRaw(PrioritizationService::priorityRankExpression())
                ->oldest('date_requested');
        }

        return Inertia::render($isAdmin ? 'requests/index' : 'requests/my-requests', [
            'requests' => $query->paginate(25)->withQueryString(),
            'isAdmin' => $isAdmin,
            'filters' => $request->only(['search', 'sort']),
        ]);
    }

    /**
     * Display the queue of service requests waiting for review.
     */
    public function approvals()
    {
        abort_unless(Auth::user()->role->role_name === 'ict_admin', 403);

        $requests = ServiceRequestModel::with(['user', 'requestServices.serviceType.category'])
            ->where('request_status', 'pending')
            ->orderByRaw(PrioritizationService::priorityRankExpression())
            ->oldest('date_requested')
            ->get();

        return Inertia::render('requests/approvals', [
            'requests' => $requests,
            'stats' => [
                'pending' => $requests->count(),
                'today' => ServiceRequestModel::whereDate('date_requested', today())->count(),
                'approved' => ServiceRequestModel::where('request_status', 'approved')->count(),
                'rejected' => ServiceRequestModel::where('request_status', 'rejected')->count(),
            ],
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $isStudent = Auth::user()->role->role_name === 'student';

        $categories = ServiceCategory::query()
            ->when(
                $isStudent,
                fn ($query) => $query
                    ->where('category_name', 'Information System Services')
                    ->with(['serviceTypes' => fn ($types) => $types->whereIn('service_name', ['E-mail', 'Office 365'])]),
                fn ($query) => $query->with('serviceTypes'),
            )
            ->get();

        return Inertia::render('requests/create', [
            'categories' => $categories,
            'isStudent' => $isStudent,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $isStudent = Auth::user()->role->role_name === 'student';

        $serviceTypeIdRules = ['required', 'exists:service_types,id'];
        $messages = [];

        if ($isStudent) {
            $serviceTypeIdRules = ['required', Rule::in($this->studentAllowedServiceTypeIds())];
            $messages['problem_description.required'] = 'The purpose field is required.';
        }

        $validated = $request->validate([
            'problem_description' => ['required', 'string'],
            'location' => ['nullable', 'string', 'max:255'],
            'contact_details' => ['nullable', 'string', 'max:255'],
            'services' => ['required', 'array', 'min:1'],
            'services.*.service_type_id' => $serviceTypeIdRules,
            'services.*.specification' => ['nullable', 'string'],
            'services.*.quantity' => ['required', 'integer', 'min:1'],
            'services.*.action_type' => ['nullable', 'string'],
            'attachments' => ['nullable', 'array', 'max:5'],
            'attachments.*' => ['file', 'mimes:pdf,jpg,jpeg,png,doc,docx,xls,xlsx', 'max:5120'],
        ], $messages);

        $serviceRequest = ServiceRequestModel::create([
            'user_id' => Auth::id(),
            'problem_description' => $validated['problem_description'],
            'location' => $validated['location'] ?? null,
            'contact_details' => $validated['contact_details'] ?? null,
            'request_status' => 'pending',
            'date_requested' => now(),
        ]);

        foreach ($validated['services'] as $service) {
            $serviceRequest->requestServices()->create($service);
        }

        $serviceRequest->load('requestServices.serviceType');
        $serviceRequest->update([
            'priority_level' => PrioritizationService::determinePriority($serviceRequest),
        ]);

        foreach ($request->file('attachments', []) as $file) {
            $serviceRequest->attachments()->create([
                'file_name' => $file->getClientOriginalName(),
                'file_path' => $file->store('attachments/'.$serviceRequest->id, 'public'),
                'uploaded_at' => now(),
            ]);
        }

        return redirect()->route('requests.index')
            ->with('status', 'Service request submitted successfully.');
    }

    /**
     * Service type IDs a student account is allowed to request.
     *
     * @return Collection<int, int>
     */
    private function studentAllowedServiceTypeIds()
    {
        return ServiceType::query()
            ->whereIn('service_name', ['E-mail', 'Office 365'])
            ->whereHas('category', fn ($query) => $query->where('category_name', 'Information System Services'))
            ->pluck('id');
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $serviceRequest = ServiceRequestModel::with([
            'user', 'requestServices.serviceType.category', 'attachments', 'jobOrders.technician',
        ])->findOrFail($id);

        abort_unless(
            Auth::user()->role->role_name === 'ict_admin' || $serviceRequest->user_id === Auth::id(),
            403,
            'You can only view your own service requests.',
        );

        return Inertia::render('requests/show', [
            'request' => $serviceRequest,
            'isAdmin' => Auth::user()->role->role_name === 'ict_admin',
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
            abort(403, 'Only ICT Admins can review service requests.');
        }

        $validated = $request->validate([
            'request_status' => ['required', 'in:pending,approved,rejected,completed'],
            'priority_level' => ['nullable', 'required_if:request_status,approved', 'in:low,medium,high,urgent'],
            'rejection_reason' => ['nullable', 'string'],
        ]);

        $serviceRequest = ServiceRequestModel::findOrFail($id);
        $wasPending = $serviceRequest->request_status === 'pending';

        $updateData = $validated;

        if ($wasPending && $validated['request_status'] === 'approved') {
            $updateData['approved_by'] = $user->id;
            $updateData['date_approved'] = now();
            $updateData['sla_deadline'] = SlaService::calculateResponseDeadline($serviceRequest);
            $updateData['sla_status'] = 'on_track';
        }

        if ($wasPending && $validated['request_status'] === 'rejected') {
            $updateData['approved_by'] = $user->id;
            $updateData['date_approved'] = now();
        }

        $original = $serviceRequest->only(['request_status', 'priority_level']);

        $serviceRequest->update($updateData);

        if ($wasPending && $validated['request_status'] === 'approved') {
            $serviceRequest->jobOrders()->create([
                'status' => 'open',
                'date_assigned' => null,
                'priority_level' => $validated['priority_level'] ?? null,
            ]);
        }

        if ($wasPending && in_array($validated['request_status'], ['approved', 'rejected'])) {
            Notification::create([
                'user_id' => $serviceRequest->user_id,
                'message' => "Your service request #{$serviceRequest->form_number} has been {$validated['request_status']}.",
                'notification_type' => 'service_request',
                'link' => '/requests/'.$serviceRequest->id,
                'notification_status' => 'unread',
            ]);

            if ($validated['request_status'] === 'approved') {
                Mail::to($serviceRequest->user->email)->queue(
                    new ServiceRequestApproved($serviceRequest->user->name, $serviceRequest->id)
                );
            } else {
                Mail::to($serviceRequest->user->email)->queue(
                    new ServiceRequestRejected($serviceRequest->user->name, $serviceRequest->id, $validated['rejection_reason'] ?? null)
                );
            }
        }

        AuditLog::record(
            "Set request status to {$validated['request_status']}",
            'service_requests',
            $serviceRequest->id,
            null,
            $original,
            $serviceRequest->only(array_keys($original)),
        );

        return redirect()->back()->with('status', 'Request updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
