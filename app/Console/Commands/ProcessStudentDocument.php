<?php

namespace App\Console\Commands;

use App\Services\StudentVerification\CorParser;
use App\Services\StudentVerification\StudentIdQrDecoder;
use Illuminate\Console\Command;

class ProcessStudentDocument extends Command
{
    protected $signature = 'students:process-document {type} {path}';

    protected $description = 'Extract one private student document in a bounded worker process';

    public function handle(StudentIdQrDecoder $decoder, CorParser $parser): int
    {
        $path = $this->argument('path');
        if (! is_file($path) || filesize($path) > 16 * 1024 * 1024) {
            return self::FAILURE;
        }
        $bytes = file_get_contents($path);
        if ($bytes === false) {
            return self::FAILURE;
        }
        $result = match ($this->argument('type')) {
            'student_id' => $decoder->decode($bytes),
            'cor' => $parser->parse($bytes),
            default => null,
        };
        if ($result === null) {
            return self::FAILURE;
        }
        $this->line(json_encode($result, JSON_THROW_ON_ERROR));

        return self::SUCCESS;
    }
}
