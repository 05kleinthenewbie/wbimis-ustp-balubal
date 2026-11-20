<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Facility;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class FacilityController extends Controller
{
    /**
     * List all facilities (admin only).
     */
    public function index(Request $request): Response
    {
        $this->ensureAdmin();

        $facilities = Facility::withCount('bookings')->latest()->get();

        return Inertia::render('facilities/index', [
            'facilities' => $facilities,
            'status' => $request->session()->get('status'),
            'error' => $request->session()->get('error'),
            'stats' => [
                'total' => $facilities->count(),
                'available' => $facilities->where('availability_status', 'available')->count(),
                'unavailable' => $facilities->whereIn('availability_status', ['unavailable', 'under_maintenance'])->count(),
                'total_bookings' => (int) $facilities->sum('bookings_count'),
            ],
        ]);
    }

    /**
     * Show the create facility form.
     */
    public function create(): Response
    {
        $this->ensureAdmin();

        return Inertia::render('facilities/create');
    }

    /**
     * Store a new facility.
     */
    public function store(Request $request): RedirectResponse
    {
        $this->ensureAdmin();

        $validated = $request->validate([
            'facility_name' => ['required', 'string', 'max:150'],
            'facility_type' => ['required', 'in:computer_lab,office,classroom'],
            'capacity' => ['nullable', 'integer', 'min:1'],
            'location' => ['nullable', 'string', 'max:150'],
            'availability_status' => ['required', 'in:available,unavailable,under_maintenance'],
        ]);

        $facility = Facility::create($validated);

        AuditLog::record('Created facility "'.$facility->facility_name.'"', 'facilities', $facility->id);

        return redirect()->route('facilities.index')
            ->with('status', 'Facility created successfully.');
    }

    /**
     * Show the edit facility form.
     */
    public function edit(Facility $facility): Response
    {
        $this->ensureAdmin();

        return Inertia::render('facilities/edit', [
            'facility' => $facility,
        ]);
    }

    /**
     * Update an existing facility.
     */
    public function update(Request $request, Facility $facility): RedirectResponse
    {
        $this->ensureAdmin();

        $validated = $request->validate([
            'facility_name' => ['required', 'string', 'max:150'],
            'facility_type' => ['required', 'in:computer_lab,office,classroom'],
            'capacity' => ['nullable', 'integer', 'min:1'],
            'location' => ['nullable', 'string', 'max:150'],
            'availability_status' => ['required', 'in:available,unavailable,under_maintenance'],
        ]);

        $original = $facility->only([
            'facility_name',
            'facility_type',
            'capacity',
            'location',
            'availability_status',
        ]);

        $facility->update($validated);

        AuditLog::record(
            'Updated facility "'.$facility->facility_name.'"',
            'facilities',
            $facility->id,
            null,
            $original,
            $facility->only(array_keys($original)),
        );

        return redirect()->route('facilities.index')
            ->with('status', 'Facility updated successfully.');
    }

    /**
     * Remove a facility that has no bookings yet.
     */
    public function destroy(Facility $facility): RedirectResponse
    {
        $this->ensureAdmin();

        if ($facility->bookings()->exists()) {
            return back()->with('error', 'Cannot delete a facility that already has bookings. Mark it as unavailable instead.');
        }

        $facilityName = $facility->facility_name;
        $facility->delete();

        AuditLog::record('Deleted facility "'.$facilityName.'"', 'facilities', $facility->id);

        return redirect()->route('facilities.index')
            ->with('status', 'Facility deleted successfully.');
    }

    /**
     * Only ICT Admins can manage facilities.
     */
    private function ensureAdmin(): void
    {
        if (Auth::user()->role->role_name !== 'ict_admin') {
            abort(403, 'Only ICT Admins can manage facilities.');
        }
    }
}
