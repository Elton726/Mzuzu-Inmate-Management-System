<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #222; }
        .header { text-align: center; margin-bottom: 18px; }
        .header h1 { margin: 0; font-size: 18px; }
        .header p { margin: 4px 0; }
        .meta { margin-bottom: 14px; border: 1px solid #ddd; padding: 8px; }
        .meta span { display: inline-block; margin-right: 18px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 6px 5px; vertical-align: top; }
        th { background: #f2f2f2; text-align: left; font-weight: bold; }
        .status { text-transform: capitalize; }
        .footer { margin-top: 18px; font-size: 10px; color: #555; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Mzuzu Inmate Management System</h1>
        <p>Release History Report</p>
        <p>Generated {{ $generatedAt->format('d M Y H:i') }}</p>
    </div>

    <div class="meta">
        <span><strong>Search:</strong> {{ $filters['search'] ?: 'All records' }}</span>
        <span><strong>Status:</strong> {{ $filters['status'] ? str_replace('_', ' ', $filters['status']) : 'All statuses' }}</span>
        <span><strong>Total Records:</strong> {{ $records->count() }}</span>
    </div>

    <table>
        <thead>
            <tr>
                <th>Inmate Name</th>
                <th>Prison Number</th>
                <th>Status</th>
                <th>Projected Release</th>
                <th>Approved By</th>
                <th>Approved At</th>
                <th>Confirmed By</th>
                <th>Confirmed At</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($records as $record)
                <tr>
                    <td>{{ trim(($record->first_name ?? '') . ' ' . ($record->last_name ?? '')) ?: '-' }}</td>
                    <td>{{ $record->prison_number ?? '-' }}</td>
                    <td class="status">{{ str_replace('_', ' ', $record->status ?? '-') }}</td>
                    <td>{{ $record->projected_release_date ?? '-' }}</td>
                    <td>{{ $record->approved_by_name ?? '-' }}</td>
                    <td>{{ $record->approved_at ?? '-' }}</td>
                    <td>{{ $record->confirmed_by_name ?? '-' }}</td>
                    <td>{{ $record->confirmed_at ?? '-' }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="8">No release history records found.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">
        This report is generated from release workflow records and should be verified against the official inmate file where required.
    </div>
</body>
</html>
