<?php

namespace App\Http\Controllers;

use App\Http\Requests\RedeemStudentLoginCodeRequest;
use App\Services\StudentLoginCodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class StudentLoginCodeController extends Controller
{
    public function store(Request $request, StudentLoginCodeService $codes): JsonResponse
    {
        return response()->json($codes->issue($request->user()))
            ->header('Cache-Control', 'private, no-store');
    }

    public function redeem(RedeemStudentLoginCodeRequest $request, StudentLoginCodeService $codes): RedirectResponse
    {
        $user = $codes->redeem($request->validated('code'));
        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->intended(route('dashboard'));
    }
}
