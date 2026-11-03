<?php

namespace App\Http\Requests;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StorePushSubscriptionRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'endpoint' => ['bail', 'required', 'string', 'max:2048', 'url:https', function (string $attribute, mixed $value, Closure $fail): void {
                $host = strtolower((string) parse_url($value, PHP_URL_HOST));
                $allowed = in_array($host, ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com'], true)
                    || str_ends_with($host, '.notify.windows.com');

                if (! $allowed || parse_url($value, PHP_URL_USER) !== null || parse_url($value, PHP_URL_PASS) !== null
                    || ! in_array(parse_url($value, PHP_URL_PORT), [null, 443], true)) {
                    $fail('The push endpoint must belong to a supported browser push service.');
                }
            }],
            'keys' => ['required', 'array:p256dh,auth'],
            'keys.p256dh' => ['required', 'string', 'regex:/^[A-Za-z0-9_-]{87}=?$/'],
            'keys.auth' => ['required', 'string', 'regex:/^[A-Za-z0-9_-]{22}(==)?$/'],
        ];
    }
}
