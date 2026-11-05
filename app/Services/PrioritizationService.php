<?php

namespace App\Services;

use App\Models\JobOrder;
use App\Models\ServiceRequest;

class PrioritizationService
{
    /**
     * Priority weight used for queue ordering (1 = highest).
     */
    public static function priorityRankExpression(string $column = 'priority_level'): string
    {
        return "CASE COALESCE({$column}, 'medium') WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END";
    }

    /**
     * Determine priority based on rules from NOTE 2.
     *
     * Rules:
     * 1. Computer viruses = high
     * 2. Department-wide issues (affecting multiple users) = high
     * 3. Non-operational equipment = high
     * 4. Intermittent problems = medium
     * 5. Same urgency = first-come-first-served
     */
    public static function determinePriority(ServiceRequest $request): string
    {
        $description = strtolower($request->problem_description);
        $serviceNames = $request->requestServices
            ->pluck('serviceType.service_name')
            ->map(fn ($name) => strtolower($name))
            ->toArray();

        // Virus-related problems receive high priority under the manual.
        $virusKeywords = ['virus', 'malware', 'ransomware', 'trojan', 'infected', 'infection'];
        foreach ($virusKeywords as $keyword) {
            if (str_contains($description, $keyword) || in_array($keyword, $serviceNames)) {
                return 'high';
            }
        }

        // A service name alone does not imply that the issue affects a group.
        $impactPatterns = [
            '/\b(entire|whole|all)\s+(department|office|unit|laboratory|lab|computers|users)\b/',
            '/\b(multiple|many|several)\s+(users|computers|devices|staff|students)\b/',
            '/\b(department[- ]wide|office[- ]wide|campus[- ]wide)\b/',
            '/\b(affecting|affects)\s+(the\s+)?(entire|whole|multiple)\b/',
        ];
        foreach ($impactPatterns as $pattern) {
            if (preg_match($pattern, $description) === 1) {
                return 'high';
            }
        }

        // Rule 3: Non-operational equipment = high
        $nonOperationalKeywords = ['not working', 'dead', 'broken', 'won\'t turn on', 'no power', 'black screen', 'blue screen'];
        foreach ($nonOperationalKeywords as $keyword) {
            if (str_contains($description, $keyword)) {
                return 'high';
            }
        }

        // Rule 4: Intermittent problems = medium
        $intermittentKeywords = ['intermittent', 'sometimes', 'occasional', 'slow', 'freezing', 'lagging'];
        foreach ($intermittentKeywords as $keyword) {
            if (str_contains($description, $keyword)) {
                return 'medium';
            }
        }

        // Default priority
        return 'medium';
    }

    /**
     * Check if replacement should be provided (>5 days).
     */
    public static function shouldProvideReplacement(JobOrder $jobOrder): bool
    {
        if ($jobOrder->date_assigned === null) {
            return false;
        }

        $daysSinceAssignment = $jobOrder->date_assigned->diffInDays(now());

        return $daysSinceAssignment > 5 && ! $jobOrder->replacement_provided;
    }

    /**
     * Propagate priority from service request to job order.
     */
    public static function propagatePriority(JobOrder $jobOrder): void
    {
        if ($jobOrder->priority_level === null && $jobOrder->serviceRequest->priority_level !== null) {
            $jobOrder->update(['priority_level' => $jobOrder->serviceRequest->priority_level]);
        }
    }
}
