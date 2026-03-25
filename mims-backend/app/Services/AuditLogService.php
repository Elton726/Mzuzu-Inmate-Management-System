<?php

namespace App\Services;

use App\Models\AuditLog;

class AuditLogService
{
    /**
     * @param  array<string, mixed>|null  $oldData
     * @param  array<string, mixed>|null  $newData
     */
    public function log(
        ?int $userId,
        string $action,
        string $tableName,
        ?int $recordId = null,
        ?array $oldData = null,
        ?array $newData = null,
        ?string $ipAddress = null
    ): AuditLog {
        return AuditLog::create([
            'user_id' => $userId,
            'action' => $action,
            'table_name' => $tableName,
            'record_id' => $recordId,
            'old_data' => $oldData,
            'new_data' => $newData,
            'ip_address' => $ipAddress,
        ]);
    }
}

