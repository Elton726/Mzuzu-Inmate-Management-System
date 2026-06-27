<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: DejaVu Sans, sans-serif; color: #111827; font-size: 13px; line-height: 1.5; }
        h1 { font-size: 22px; margin-bottom: 4px; }
        h2 { font-size: 15px; margin: 0 0 8px; color: #374151; }
        .muted { color: #6b7280; }
        .box { border: 1px solid #d1d5db; padding: 14px; margin-top: 18px; border-radius: 4px; }
        .row { margin-bottom: 10px; }
        .label { font-weight: bold; display: inline-block; min-width: 190px; }
        .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; }
        .badge-male   { background: #dbeafe; color: #1d4ed8; }
        .badge-female { background: #fce7f3; color: #9d174d; }
        .badge-all { background: #dcfce7; color: #166534; }
        .status-pending  { color: #d97706; font-weight: bold; }
    </style>
</head>
<body>
    <h1>Charity Visit Booking Submission</h1>
    <div class="muted">Reference: {{ $reference }} &nbsp;&nbsp;|&nbsp;&nbsp; Status: <span class="status-pending">PENDING APPROVAL</span></div>

    <div class="box">
        <h2>Organisation Details</h2>
        <div class="row"><span class="label">Organisation:</span> {{ $booking->organisation_name }}</div>
        <div class="row"><span class="label">Contact Person:</span> {{ $booking->contact_person }}</div>
        <div class="row"><span class="label">Contact Phone / WhatsApp:</span> {{ $booking->contact_person_phone }}</div>
    </div>

    <div class="box">
        <h2>Visit Details</h2>
        <div class="row">
            <span class="label">Inmate Category:</span>
            <span class="badge {{ $booking->inmate_category === 'male' ? 'badge-male' : ($booking->inmate_category === 'female' ? 'badge-female' : 'badge-all') }}">
                {{ $booking->inmate_category === 'all' ? 'All Wings' : ucfirst($booking->inmate_category) . ' Wing' }}
            </span>
        </div>
        <div class="row"><span class="label">Proposed Date:</span> {{ \Carbon\Carbon::parse($booking->proposed_date)->format('d M Y') }}</div>
        <div class="row"><span class="label">Proposed Time:</span> {{ substr($booking->proposed_time, 0, 5) }}</div>
        <div class="row"><span class="label">Duration:</span> {{ $booking->duration_minutes }} minutes</div>
    </div>

    <div class="box">
        <h2>Purpose of Visit</h2>
        <p>{{ $booking->purpose }}</p>
    </div>

    <div class="muted" style="margin-top: 24px; font-size: 11px;">
        Submitted on {{ \Carbon\Carbon::parse($booking->created_at)->format('d M Y, H:i') }}.
        This document must be presented to the station officer for approval.
    </div>
</body>
</html>
