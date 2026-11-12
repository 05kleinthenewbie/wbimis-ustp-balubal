<?php

namespace App\Http\Controllers;

use App\Mail\BookingStatusUpdated;
use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Facility;
use App\Models\Notification;
use App\Models\User;
use App\Rules\NotSunday;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;

class BookingController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $this->ensureNotStudent();

        $user = Auth::user();

        $query = Booking::with(['user', 'facility', 'approver'])->latest();

        // Faculty only see their own bookings. Admins see everyone's.
        if ($user->role->role_name !== 'ict_admin') {
            $query->where('user_id', $user->id);
        }

        $bookings = $query->get();

        $statsQuery = Booking::query();
        if ($user->role->role_name !== 'ict_admin') {
            $statsQuery->where('user_id', $user->id);
        }

        $stats = [
            'total' => $statsQuery->count(),
            'pending' => (clone $statsQuery)->where('booking_status', 'pending')->count(),
            'approved' => (clone $statsQuery)->where('booking_status', 'approved')->count(),
            'rejected' => (clone $statsQuery)->where('booking_status', 'rejected')->count(),
            'completed' => (clone $statsQuery)->where('booking_status', 'completed')->count(),
        ];

        return Inertia::render('bookings/index', [
            'bookings' => $bookings,
            'stats' => $stats,
            'calendarBookings' => $this->calendarBookingData(),
            'facilities' => Facility::orderBy('facility_name')->get([
                'id',
                'facility_name',
                'facility_type',
                'availability_status',
            ]),
        ]);
    }

    /**
     * Display the booking approval queue.
     */
    public function approvals()
    {
        $this->ensureAdmin();

        $bookings = Booking::with(['user:id,name,email', 'facility:id,facility_name,facility_type'])
            ->where('booking_status', 'pending')
            ->orderBy('booking_date')
            ->orderBy('start_time')
            ->get();

        return Inertia::render('bookings/approvals', [
            'bookings' => $bookings,
            'stats' => [
                'pending' => $bookings->count(),
                'today' => $bookings->filter(fn (Booking $booking) => $booking->booking_date->isToday())->count(),
                'approved' => Booking::where('booking_status', 'approved')->count(),
                'rejected' => Booking::where('booking_status', 'rejected')->count(),
            ],
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $this->ensureNotStudent();

        return Inertia::render('bookings/create', [
            'facilities' => Facility::where('availability_status', 'available')->get(),
            'upcomingBookings' => Booking::with(['user:id,name', 'facility:id,facility_name'])
                ->active()
                ->orderBy('booking_date')
                ->orderBy('start_time')
                ->get([
                    'id',
                    'user_id',
                    'facility_id',
                    'booking_date',
                    'start_time',
                    'end_time',
                    'booking_status',
                ])
                ->map(fn (Booking $booking) => [
                    'id' => $booking->id,
                    'facility_id' => $booking->facility_id,
                    'facility_name' => $booking->facility?->facility_name ?? 'Facility',
                    'booking_date' => $booking->booking_date->toDateString(),
                    'start_time' => $booking->start_time,
                    'end_time' => $booking->end_time,
                    'booking_status' => $booking->booking_status,
                    'user_name' => $booking->user?->name ?? 'Unknown',
                ]),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $this->ensureNotStudent();

        $validated = $request->validate([
            'facility_id' => ['required', 'exists:facilities,id'],
            'booking_date' => ['required', 'date', 'after_or_equal:today', new NotSunday],
            'start_time' => ['required'],
            'end_time' => ['required', 'after:start_time'],
            'purpose' => ['nullable', 'string'],
        ]);

        $overlap = Booking::where('facility_id', $validated['facility_id'])
            ->where('booking_date', $validated['booking_date'])
            ->active()
            ->where(function ($query) use ($validated) {
                $query->whereBetween('start_time', [$validated['start_time'], $validated['end_time']])
                    ->orWhereBetween('end_time', [$validated['start_time'], $validated['end_time']])
                    ->orWhere(function ($q) use ($validated) {
                        $q->where('start_time', '<=', $validated['start_time'])
                            ->where('end_time', '>=', $validated['end_time']);
                    });
            })
            ->exists();

        if ($overlap) {
            return back()->withErrors(['start_time' => 'This time slot overlaps with an existing booking.']);
        }

        $booking = Booking::create([
            ...$validated,
            'user_id' => Auth::id(),
            'booking_status' => 'pending',
        ]);

        AuditLog::record('Submitted facility booking', 'bookings', $booking->id);

        return redirect()->route('bookings.index')
            ->with('status', 'Booking request submitted successfully.');
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $this->ensureNotStudent();

        $booking = Booking::with(['user', 'facility', 'approver'])->findOrFail($id);

        abort_unless(
            Auth::user()->role->role_name === 'ict_admin' || $booking->user_id === Auth::id(),
            403,
            'You can only view your own bookings.',
        );

        return Inertia::render('bookings/show', [
            'booking' => $booking,
            'isAdmin' => Auth::user()->role->role_name === 'ict_admin',
            'isOwner' => $booking->user_id === Auth::id(),
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
        $this->ensureNotStudent();

        $user = Auth::user();
        $isAdmin = $user->role->role_name === 'ict_admin';

        $validated = $request->validate([
            'booking_status' => ['required', 'in:pending,approved,rejected,cancelled,completed'],
        ]);

        $booking = Booking::with(['user', 'facility'])->findOrFail($id);

        // Admins decide on any booking; owners may cancel their own pending or
        // approved booking at any time, including after the schedule has passed.
        if (! $isAdmin) {
            $isOwner = $booking->user_id === $user->id;
            $isCancellation = $validated['booking_status'] === 'cancelled';
            $isCancellable = in_array($booking->booking_status, ['pending', 'approved'], true);

            if (! $isOwner || ! $isCancellation || ! $isCancellable) {
                abort(403, 'Only ICT Admins can approve or reject bookings.');
            }
        }

        $oldStatus = $booking->booking_status;

        $booking->update([
            ...$validated,
            'approved_by' => $isAdmin ? Auth::id() : $booking->approved_by,
        ]);

        $newStatus = $booking->booking_status;

        if ($oldStatus !== $newStatus) {
            $facilityName = $booking->facility?->facility_name ?? 'a facility';
            $bookingSummary = $booking->booking_date->format('M d, Y')
                .' Â· '.substr($booking->start_time, 0, 5).'-'.substr($booking->end_time, 0, 5);

            // Notify the booker about approvals, rejections, and admin-initiated cancellations.
            if (in_array($newStatus, ['approved', 'rejected'], true)
                || ($newStatus === 'cancelled' && $isAdmin)) {
                Notification::create([
                    'user_id' => $booking->user_id,
                    'message' => 'Your booking for '.$facilityName.' on '.$booking->booking_date->format('M d, Y').' has been '.$newStatus.'.',
                    'notification_type' => 'booking',
                    'link' => '/bookings/'.$booking->id,
                    'notification_status' => 'unread',
                ]);

                Mail::to($booking->user->email)->queue(
                    new BookingStatusUpdated(
                        $booking->user->name,
                        $facilityName,
                        $bookingSummary,
                        $newStatus,
                        $booking->id,
                    )
                );
            }

            // Notify ICT Admins when a booker cancels their own request.
            if ($newStatus === 'cancelled' && ! $isAdmin) {
                User::whereHas('role', fn ($query) => $query->where('role_name', 'ict_admin'))
                    ->where('id', '!=', $user->id)
                    ->get(['id', 'name'])
                    ->each(function (User $admin) use ($booking, $user, $facilityName) {
                        Notification::create([
                            'user_id' => $admin->id,
                            'message' => $user->name.' cancelled their booking for '.$facilityName.' on '.$booking->booking_date->format('M d, Y').'.',
                            'notification_type' => 'booking',
                            'link' => '/bookings/'.$booking->id,
                            'notification_status' => 'unread',
                        ]);
                    });
            }

            AuditLog::record(
                'Set booking status to '.$newStatus,
                'bookings',
                $booking->id,
                null,
                ['booking_status' => $oldStatus],
                ['booking_status' => $newStatus],
            );
        }

        return redirect()->back()->with('status', 'Booking updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }

    /**
     * Pending and approved bookings that are still upcoming or in progress,
     * formatted for the availability calendar.
     */
    private function calendarBookingData()
    {
        return Booking::query()
            ->active()
            ->with(['user:id,name', 'facility:id,facility_name,facility_type'])
            ->orderBy('booking_date')
            ->orderBy('start_time')
            ->get()
            ->map(fn (Booking $booking) => [
                'id' => $booking->id,
                'facility_id' => $booking->facility_id,
                'facility_name' => $booking->facility?->facility_name ?? 'Facility',
                'booking_date' => $booking->booking_date->toDateString(),
                'start_time' => $booking->start_time,
                'end_time' => $booking->end_time,
                'booking_status' => $booking->booking_status,
                'user_name' => $booking->user?->name ?? 'Unknown',
            ]);
    }

    /**
     * Students do not have access to facility booking.
     */
    private function ensureNotStudent(): void
    {
        if (Auth::user()->role->role_name === 'student') {
            abort(403, 'Students do not have access to facility booking.');
        }
    }

    /**
     * Only ICT Admins may manage facilities, approvals, and reports.
     */
    private function ensureAdmin(): void
    {
        if (Auth::user()->role->role_name !== 'ict_admin') {
            abort(403, 'Only ICT Admins can perform this action.');
        }
    }
}
