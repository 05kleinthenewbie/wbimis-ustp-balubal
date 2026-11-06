<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Keep unapproved accounts out of the protected application features.
 * Administrators and approved accounts pass through; everyone else is
 * funneled to the pending-approval notice page. The flag is re-read from
 * the database on every request, so revoking an approval immediately
 * blocks any running session.
 */
class EnsureAccountIsApproved
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user !== null && $user->isStudent()) {
            if ($user->status !== 'inactive' && $user->approval_status === 'approved' && $user->email_verified_at !== null) {
                return $next($request);
            }

            if ($request->is('api/*')) {
                return response()->json(['message' => 'Student verification and administrator approval are required.', 'approval_status' => $user->approval_status], 403);
            }

            return redirect()->route('student.verification.show');
        }

        if ($user === null || $user->is_approved || $user->isAdministrator()) {
            return $next($request);
        }

        $routeName = $request->route()?->getName();

        if (in_array($routeName, ['approval.pending', 'logout'], true)) {
            return $next($request);
        }

        if ($request->is('api/*')) {
            return response()->json([
                'message' => 'Your account is pending administrator approval.',
            ], 403);
        }

        return redirect()->route('approval.pending');
    }
}
