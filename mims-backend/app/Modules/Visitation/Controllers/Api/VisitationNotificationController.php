<?php

namespace App\Modules\Visitation\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\Visitation\Models\VisitationNotification;
use Illuminate\Http\Request;

class VisitationNotificationController extends Controller
{
    public function index(Request $request)
    {
        $role = $request->user()->role_name;

        $notifications = VisitationNotification::query()
            ->where(function ($query) use ($request, $role) {
                $query->where('user_id', $request->user()->id)
                    ->orWhere('recipient_role', $role);
            })
            ->latest()
            ->limit(50)
            ->get();

        return response()->json(['data' => $notifications]);
    }

    public function markRead(VisitationNotification $notification, Request $request)
    {
        $role = $request->user()->role_name;

        abort_unless(
            $notification->user_id === $request->user()->id || $notification->recipient_role === $role,
            403
        );

        $notification->update([
            'is_read' => true,
            'read_at' => now(),
        ]);

        return response()->json(['data' => $notification->fresh()]);
    }
}
