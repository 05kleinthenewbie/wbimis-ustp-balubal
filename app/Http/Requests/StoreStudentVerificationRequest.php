<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Validator;

class StoreStudentVerificationRequest extends FormRequest
{
    private ?array $stored = null;

    /** @return list<\Closure> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            foreach (['student_id', 'cor'] as $field) {
                $file = $this->file($field);
                if (! $file || ! $file->isValid()) {
                    continue;
                }
                $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($file->getRealPath());
                $accepted = config("student-verification.uploads.{$field}.accepted_mimes");
                if (! in_array($mime, (array) $accepted, true)) {
                    $validator->errors()->add($field, 'The uploaded file content is not a supported document.');
                }
            }

            if ($this->file('cor') === null && $this->file('student_id') === null) {
                $validator->errors()->add('cor', 'Upload at least one document to submit.');
            }
        }];
    }

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = $this->user();

        return $user?->isStudent() === true && $user->status !== 'inactive' && $user->approval_status !== 'approved';
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'student_id' => [
                'nullable', 'file', 'mimetypes:image/jpeg,image/png,image/webp',
                'max:'.config('student-verification.uploads.student_id.max_kilobytes'),
            ],
            'cor' => [
                'nullable', 'file', 'mimetypes:'.implode(',', config('student-verification.uploads.cor.accepted_mimes')),
                'max:'.config('student-verification.uploads.cor.max_kilobytes'),
            ],
        ];
    }

    /**
     * Move validated uploads onto the private local disk so later failures
     * (locking, storage races) never touch the student's stored documents.
     *
     * @return array<string, string> paths keyed by document type
     */
    public function storedDocuments(): array
    {
        if ($this->stored === null) {
            $stored = [];

            foreach (['cor', 'student_id'] as $field) {
                $file = $this->file($field);

                if ($file === null || ! $file->isValid()) {
                    continue;
                }

                $path = $file->store('student-verification-pending/'.Str::random(24), 'local');
                if ($path === false) {
                    if ($stored !== []) {
                        Storage::disk('local')->delete($stored);
                    }
                    abort(500, 'Document could not be stored.');
                }
                $stored[$field] = $path;
            }

            $this->stored = $stored;
        }

        return $this->stored;
    }
}
