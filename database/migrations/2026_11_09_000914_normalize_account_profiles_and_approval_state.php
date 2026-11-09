<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('departments', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 100)->unique();
            $table->timestamps();
        });
        Schema::create('programs', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 100)->unique();
            $table->string('name');
            $table->timestamps();
        });
        Schema::create('student_profiles', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('program_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('id_number', 20)->nullable()->unique();
            $table->string('educational_level', 50)->nullable();
            $table->string('year_level', 20)->nullable();
            $table->timestamps();
        });
        Schema::create('faculty_profiles', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('department_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('employment_type', 20)->nullable();
            $table->string('position')->nullable();
            $table->timestamps();
        });

        foreach (config('student-verification.programs', []) as $code => $program) {
            DB::table('programs')->insert(['code' => $code, 'name' => $program['name'], 'created_at' => now(), 'updated_at' => now()]);
        }

        DB::table('users')->leftJoin('roles', 'roles.id', '=', 'users.role_id')
            ->select('users.*', 'roles.role_name')->orderBy('users.id')->chunkById(100, function ($users): void {
                foreach ($users as $user) {
                    $student = $user->role_name === 'student';
                    $programId = null;
                    $departmentId = null;
                    if (filled($user->department)) {
                        $table = $student ? 'programs' : 'departments';
                        $key = $student ? 'code' : 'name';
                        $reference = DB::table($table)->where($key, $user->department)->first();
                        $id = $reference?->id ?? DB::table($table)->insertGetId([
                            $key => $user->department,
                            ...($student ? ['name' => $user->department] : []),
                            'created_at' => now(), 'updated_at' => now(),
                        ]);
                        if ($student) {
                            $programId = $id;
                        } else {
                            $departmentId = $id;
                        }
                    }
                    if ($student || filled($user->id_number) || filled($user->educational_level) || filled($user->year_level)) {
                        DB::table('student_profiles')->insert([
                            'user_id' => $user->id, 'program_id' => $programId,
                            'id_number' => $user->id_number, 'educational_level' => $user->educational_level,
                            'year_level' => $user->year_level, 'created_at' => $user->created_at, 'updated_at' => $user->updated_at,
                        ]);
                    }
                    if ($departmentId !== null || filled($user->employment_type) || filled($user->position)) {
                        DB::table('faculty_profiles')->insert([
                            'user_id' => $user->id, 'department_id' => $departmentId,
                            'employment_type' => $user->employment_type, 'position' => $user->position,
                            'created_at' => $user->created_at, 'updated_at' => $user->updated_at,
                        ]);
                    }
                    $approval = $student && in_array($user->approval_status, ['approved', 'pending', 'rejected'], true)
                        ? $user->approval_status
                        : ($user->is_approved ? 'approved' : ($user->status === 'rejected' ? 'rejected' : 'pending'));
                    DB::table('users')->where('id', $user->id)->update(['approval_status' => $approval]);
                }
            }, 'users.id', 'id');

        Schema::table('users', function (Blueprint $table): void {
            $table->dropUnique(['id_number']);
            $table->dropIndex(['is_approved', 'email_verified_at']);
        });
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['department', 'id_number', 'educational_level', 'year_level', 'employment_type', 'position', 'is_approved']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('department', 100)->nullable();
            $table->string('id_number', 20)->nullable()->unique();
            $table->string('educational_level', 50)->nullable();
            $table->string('year_level', 20)->nullable();
            $table->string('employment_type', 20)->nullable();
            $table->string('position')->nullable();
            $table->boolean('is_approved')->default(false);
            $table->index(['is_approved', 'email_verified_at']);
        });
        DB::table('users')->orderBy('id')->chunkById(100, function ($users): void {
            foreach ($users as $user) {
                $student = DB::table('student_profiles')->where('user_id', $user->id)->first();
                $faculty = DB::table('faculty_profiles')->where('user_id', $user->id)->first();
                DB::table('users')->where('id', $user->id)->update([
                    'department' => $student?->program_id
                        ? DB::table('programs')->where('id', $student->program_id)->value('code')
                        : DB::table('departments')->where('id', $faculty?->department_id)->value('name'),
                    'id_number' => $student?->id_number, 'educational_level' => $student?->educational_level,
                    'year_level' => $student?->year_level, 'employment_type' => $faculty?->employment_type,
                    'position' => $faculty?->position, 'is_approved' => $user->approval_status === 'approved',
                ]);
            }
        });
        Schema::dropIfExists('faculty_profiles');
        Schema::dropIfExists('student_profiles');
        Schema::dropIfExists('programs');
        Schema::dropIfExists('departments');
    }
};
