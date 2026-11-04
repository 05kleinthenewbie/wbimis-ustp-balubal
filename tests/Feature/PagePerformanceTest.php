<?php

use App\Models\Role;
use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Foundation\Vite;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

test('dashboard query counts stay within a small budget for each portal', function (string $roleName, int $budget) {
    $role = Role::firstOrCreate(['role_name' => $roleName]);
    $user = User::factory()->create(['role_id' => $role->id]);
    ServiceRequest::create([
        'user_id' => $user->id,
        'problem_description' => 'Performance regression check',
        'request_status' => 'pending',
    ]);

    DB::enableQueryLog();

    try {
        $this->actingAs($user)->get(route('dashboard'))->assertOk();
        $queries = DB::getQueryLog();
    } finally {
        DB::disableQueryLog();
        DB::flushQueryLog();
    }

    expect(count($queries))->toBeLessThanOrEqual($budget);
})->with([
    'admin' => ['ict_admin', 24],
    'faculty' => ['faculty_staff', 13],
    'student' => ['student', 9],
]);

test('combined dashboard summaries preserve period totals and private all time status counts', function (string $roleName) {
    $role = Role::firstOrCreate(['role_name' => $roleName]);
    $user = User::factory()->create(['role_id' => $role->id]);
    $otherUser = User::factory()->create(['role_id' => $role->id]);
    $old = ServiceRequest::create([
        'user_id' => $user->id, 'problem_description' => 'Old pending request', 'request_status' => 'pending',
    ]);
    $old->forceFill(['created_at' => now()->subDays(45)])->save();
    foreach (['approved', 'completed'] as $status) {
        ServiceRequest::create([
            'user_id' => $user->id, 'problem_description' => $status.' request', 'request_status' => $status,
        ]);
    }
    ServiceRequest::create([
        'user_id' => $otherUser->id, 'problem_description' => 'Private request', 'request_status' => 'pending',
    ]);

    $this->actingAs($user)->get(route('dashboard', ['period' => 'month']))
        ->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('overview.serviceRequests.total', 2)
        ->where('overview.serviceRequests.pending', 1)
        ->where('overview.serviceRequests.approved', 1)
        ->where('overview.serviceRequests.completed', 1)
        ->where('stats.myRequests', 3)
        ->where('stats.pendingRequests', 1));
})->with(['faculty_staff', 'student']);

test('production pages preload shared javascript dependencies and resolve current font assets', function () {
    Storage::fake('page-assets');
    $publicPath = Storage::disk('page-assets')->path('public');
    File::ensureDirectoryExists($publicPath.'/build/assets');
    File::put($publicPath.'/build/manifest.json', json_encode([
        'resources/css/app.css' => ['file' => 'assets/app-test.css', 'src' => 'resources/css/app.css', 'isEntry' => true],
        'resources/js/app.tsx' => ['file' => 'assets/app-test.js', 'src' => 'resources/js/app.tsx', 'isEntry' => true, 'imports' => ['_vendor.js']],
        'resources/js/pages/welcome.tsx' => ['file' => 'assets/welcome-test.js', 'src' => 'resources/js/pages/welcome.tsx', 'isDynamicEntry' => true, 'imports' => ['_vendor.js']],
        '_vendor.js' => ['file' => 'assets/vendor-test.js', 'imports' => ['_runtime.js']],
        '_runtime.js' => ['file' => 'assets/runtime-test.js'],
    ], JSON_THROW_ON_ERROR));
    File::put($publicPath.'/build/fonts-manifest.json', json_encode([
        'version' => 1,
        'families' => [],
        'preloads' => [],
        'style' => ['file' => 'assets/fonts-current.css'],
    ], JSON_THROW_ON_ERROR));
    File::put($publicPath.'/build/assets/fonts-current.css', '@font-face { font-family: "Portal Test"; src: url("/build/assets/portal-test.woff2"); }');

    app()->usePublicPath($publicPath);
    app(Vite::class)->useHotFile($publicPath.'/hot');

    $this->get(route('home'))->assertOk()
        ->assertSee('rel="modulepreload"', false)
        ->assertSee('/build/assets/vendor-test.js', false)
        ->assertSee('/build/assets/runtime-test.js', false)
        ->assertSee('Portal Test', false)
        ->assertSee('/build/assets/portal-test.woff2', false)
        ->assertDontSee('/@vite/client', false);
});
