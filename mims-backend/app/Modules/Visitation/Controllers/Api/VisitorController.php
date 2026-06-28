<?php

namespace App\Modules\Visitation\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\Visitation\Models\Visitor;
use Illuminate\Http\Request;

class VisitorController extends Controller
{
    public function search(Request $request)
    {
        $data = $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:255'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:25'],
        ]);

        $query = trim($data['q']);

        $visitors = Visitor::query()
            ->withCount('sessions')
            ->withMax('sessions', 'created_at')
            ->where(function ($builder) use ($query) {
                $builder->where('full_name', 'like', "%{$query}%")
                    ->orWhere('phone', 'like', "%{$query}%");
            })
            ->latest('updated_at')
            ->limit($data['per_page'] ?? 8)
            ->get();

        return response()->json(['data' => $visitors]);
    }

    public function updateWatchlist(Visitor $visitor, Request $request)
    {
        $data = $request->validate([
            'is_watchlisted' => ['required', 'boolean'],
            'watchlist_reason' => ['nullable', 'string', 'max:2000', 'required_if:is_watchlisted,true'],
        ]);

        $visitor->update([
            'is_watchlisted' => $data['is_watchlisted'],
            'watchlist_reason' => $data['is_watchlisted'] ? ($data['watchlist_reason'] ?? null) : null,
            'watchlisted_by' => $data['is_watchlisted'] ? $request->user()->id : null,
            'watchlisted_at' => $data['is_watchlisted'] ? now() : null,
        ]);

        return response()->json(['data' => $visitor->fresh(['watchlistedBy'])]);
    }
}
