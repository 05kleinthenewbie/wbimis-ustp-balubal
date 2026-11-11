<?php

namespace App\Http\Controllers;

use App\Models\IncidentReport;
use App\Models\InventoryItem;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class IncidentReportController extends Controller
{
    /**
     * Allowed status transitions for a manual review workflow.
     */
    private const TRANSITIONS = [
        'open' => ['under_review', 'closed'],
        'under_review' => ['resolved', 'closed'],
        'resolved' => ['closed'],
        'closed' => [],
    ];

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $user = Auth::user();

        $query = IncidentReport::with(['reporter', 'inventoryItem', 'userLiabilities'])->latest();

        // Non-admins only see incidents they personally reported.
        if ($user->role->role_name !== 'ict_admin') {
            $query->where('reported_by', $user->id);
        }

        return Inertia::render('incidents/index', [
            'incidents' => $query->get(),
            'isAdmin' => $user->role->role_name === 'ict_admin',
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('incidents/create', [
            'inventoryItems' => InventoryItem::select('id', 'item_name', 'property_no')->get(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'item_id' => ['nullable', 'exists:inventory_items,id'],
            'incident_type' => ['required', 'string', 'max:100'],
            'incident_description' => ['required', 'string'],
            'incident_date' => ['nullable', 'date'],
            'attachments' => ['nullable', 'array', 'max:5'],
            'attachments.*' => ['file', 'mimes:pdf,jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $incident = IncidentReport::create([
            ...collect($validated)->except('attachments')->all(),
            'reported_by' => Auth::id(),
            'status' => 'open',
        ]);

        foreach ($request->file('attachments', []) as $file) {
            $path = $file->store('incident-attachments/'.$incident->id, 'local');

            if ($path !== false) {
                $incident->attachments()->create([
                    'file_name' => $file->getClientOriginalName(),
                    'file_path' => $path,
                    'uploaded_at' => now(),
                ]);
            }
        }

        return redirect()->route('incidents.index')
            ->with('status', 'Incident report submitted successfully.');
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $incident = IncidentReport::with([
            'reporter', 'inventoryItem', 'userLiabilities.user', 'attachments',
        ])->findOrFail($id);

        $isAdmin = Auth::user()->role->role_name === 'ict_admin';

        abort_unless($isAdmin || $incident->reported_by === Auth::id(), 403, 'You can only view incidents you reported.');

        return Inertia::render('incidents/show', [
            'incident' => $incident,
            'isAdmin' => $isAdmin,
            'users' => $isAdmin
                ? User::query()->orderBy('name')->get(['id', 'name'])
                : [],
        ]);
    }

    /**
     * Download an evidence file attached to an incident.
     */
    public function downloadAttachment(Request $request, string $incident, string $attachment)
    {
        $incidentReport = IncidentReport::findOrFail($incident);
        $user = Auth::user();
        $isAdmin = $user->role->role_name === 'ict_admin';
        $isReporter = $incidentReport->reported_by === $user->id;
        $isLiable = $incidentReport->userLiabilities()->where('user_id', $user->id)->exists();

        abort_unless($isAdmin || $isReporter || $isLiable, 403, 'You cannot access this attachment.');

        $record = $incidentReport->attachments()->findOrFail($attachment);

        abort_unless(Storage::disk('local')->exists($record->file_path), 404);

        return response()->download(
            Storage::disk('local')->path($record->file_path),
            $record->file_name,
            ['Cache-Control' => 'private, no-store'],
        );
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
            abort(403, 'Only ICT Admins can review incident reports.');
        }

        $validated = $request->validate([
            'status' => ['required', 'in:open,under_review,resolved,closed'],
            'resolution_notes' => ['nullable', 'string', 'max:2000', 'required_if:status,resolved,closed'],
            'liability_user_id' => ['nullable', 'exists:users,id'],
            'liability_description' => ['nullable', 'string'],
            'liability_amount' => ['nullable', 'numeric', 'min:0', 'max:9999999999.99'],
        ]);

        $incident = IncidentReport::with('userLiabilities')->findOrFail($id);
        $oldStatus = $incident->status;
        $newStatus = $validated['status'];

        if ($newStatus !== $oldStatus) {
            if (! in_array($newStatus, self::TRANSITIONS[$oldStatus] ?? [], true)) {
                throw ValidationException::withMessages([
                    'status' => 'An incident cannot move from '.str_replace('_', ' ', $oldStatus)
                        .' to '.str_replace('_', ' ', $newStatus).'.',
                ]);
            }

            if (in_array($newStatus, ['resolved', 'closed'], true)
                && $incident->userLiabilities()->where('liability_status', 'pending')->exists()) {
                throw ValidationException::withMessages([
                    'status' => 'Settle or waive pending liabilities before resolving or closing this incident.',
                ]);
            }
        }

        $incident->update([
            'status' => $newStatus,
            'resolution_notes' => $validated['resolution_notes'] ?? $incident->resolution_notes,
        ]);

        if (! empty($validated['liability_user_id'])) {
            $liability = $incident->userLiabilities()->create([
                'user_id' => $validated['liability_user_id'],
                'liability_description' => $validated['liability_description'] ?? null,
                'liability_amount' => $validated['liability_amount'] ?? null,
                'liability_status' => 'pending',
                'date_assigned' => now(),
            ]);

        }

        if ($newStatus !== $oldStatus && $incident->reported_by !== $user->id) {
            Notification::create([
                'user_id' => $incident->reported_by,
                'message' => 'Your laboratory incident #'.$incident->id.' is now '
                    .str_replace('_', ' ', $newStatus).'.',
                'notification_type' => 'incident',
                'link' => '/incidents/'.$incident->id,
                'notification_status' => 'unread',
            ]);
        }

        return redirect()->back()->with('status', 'Incident updated successfully.');
    }

    /**
     * Settle or waive a liability assigned from this incident.
     */
    public function resolveLiability(Request $request, string $incident, string $liability)
    {
        if (Auth::user()->role->role_name !== 'ict_admin') {
            abort(403, 'Only ICT Admins can resolve liabilities.');
        }

        $validated = $request->validate([
            'liability_status' => ['required', 'in:settled,waived'],
        ]);

        $incidentReport = IncidentReport::findOrFail($incident);
        $liabilityRecord = $incidentReport->userLiabilities()->findOrFail($liability);

        $liabilityRecord->update([
            'liability_status' => $validated['liability_status'],
            'date_settled' => now(),
        ]);

        return redirect()->back()->with(
            'status',
            'Liability marked as '.$validated['liability_status'].'.',
        );
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
