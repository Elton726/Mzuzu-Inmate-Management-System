<?php

require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

try {
    $results = DB::select("
        SELECT
            table_name,
            column_name,
            data_type,
            is_nullable,
            column_default,
            character_maximum_length,
            numeric_precision,
            numeric_scale
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
    ");

    file_put_contents('/tmp/db_schema_full.txt', "Table|Column|Type|Nullable|Default|Max Length|Precision|Scale\n");
    foreach ($results as $row) {
        file_put_contents('/tmp/db_schema_full.txt', implode('|', (array)$row) . "\n", FILE_APPEND);
    }

    echo "Schema exported to /tmp/db_schema_full.txt\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
