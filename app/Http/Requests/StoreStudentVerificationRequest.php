<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreStudentVerificationRequest extends FormRequest
{
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
                $accepted = $field === 'cor' ? ['application/pdf'] : config('student-verification.uploads.student_id.accepted_mimes');
                if (! in_array($mime, $accepted, true)) {
                    $validator->errors()->add($field, 'The uploaded file content is not a supported document.');
                }
            }
        }];
    }

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->isStudent() === true && $this->user()->email_verified_at !== null && $this->user()->status !== 'inactive' && $this->user()->approval_status !== 'approved';
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'student_id' => ['required', 'file', 'mimetypes:image/jpeg,image/png,image/webp', 'max:'.config('student-verification.uploads.student_id.max_kilobytes')],
            'cor' => ['required', 'file', 'mimetypes:application/pdf', 'max:'.config('student-verification.uploads.cor.max_kilobytes')],
        ];
    }
}
