<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #222; }
        .header { text-align: center; margin-bottom: 24px; }
        .header h1 { margin: 0; font-size: 18px; }
        .header p { margin: 4px 0; }
        .section { margin-bottom: 18px; }
        .section h2 { font-size: 14px; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 6px 4px; vertical-align: top; }
        .label { width: 150px; font-weight: bold; }
        .approval { margin-top: 32px; }
        .block { border: 1px solid #ddd; padding: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Mzuzu Inmate Management System</h1>
        <p>Charity Visitation Request</p>
        <p>{{ now()->format('d M Y') }}</p>
    </div>

    <div class="section">
        <h2>Inmate Details</h2>
        <table>
            <tr>
                <td class="label">Prison Number</td>
                <td>{{ $session->inmate->prison_number }}</td>
            </tr>
            <tr>
                <td class="label">Name</td>
                <td>{{ $session->inmate->first_name }} {{ $session->inmate->last_name }}</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <h2>Visitor Details</h2>
        <table>
            <tr>
                <td class="label">Name</td>
                <td>{{ $session->visitor->first_name }} {{ $session->visitor->last_name }}</td>
            </tr>
            <tr>
                <td class="label">Relationship</td>
                <td>{{ $session->visitor->relationship }}</td>
            </tr>
            <tr>
                <td class="label">Contact</td>
                <td>{{ $session->visitor->contact_number }}</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <h2>Charity Information</h2>
        <table>
            <tr>
                <td class="label">Organization</td>
                <td>{{ $session->charity_organization }}</td>
            </tr>
            <tr>
                <td class="label">Purpose</td>
                <td>{{ $session->charity_purpose }}</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <h2>Visit Details</h2>
        <table>
            <tr>
                <td class="label">Visit Date</td>
                <td>{{ $session->visit_date->format('d M Y') }}</td>
            </tr>
            <tr>
                <td class="label">Visit Time</td>
                <td>{{ $session->visit_time }}</td>
            </tr>
            <tr>
                <td class="label">Duration</td>
                <td>{{ $session->duration_minutes }} minutes</td>
            </tr>
            <tr>
                <td class="label">Location</td>
                <td>{{ $session->location }}</td>
            </tr>
            <tr>
                <td class="label">Request Submitted By</td>
                <td>{{ optional($session->pdfCreator)->name ?? 'System' }}</td>
            </tr>
        </table>
    </div>

    <div class="approval">
        <div class="block">
            <h2>Regional Approval</h2>
            <p>Approved by: _________________________</p>
            <p>Date: ________________________________</p>
            <p>Comments:</p>
            <p style="min-height: 80px;">&nbsp;</p>
        </div>
    </div>
</body>
</html>
