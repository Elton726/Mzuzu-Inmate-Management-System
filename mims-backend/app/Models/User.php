<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Modules\ActivityAllocation\Models\OfficerDutyRoster;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role_id',
        'is_active',
        'last_login',
        'is_eligible_for_duty',
        'duty_preferences',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'last_login' => 'datetime',
            'is_eligible_for_duty' => 'boolean',
            'duty_preferences' => 'array',
        ];
    }


    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function getRoleNameAttribute(): ?string
    {
        return $this->role?->name ?? $this->getAttribute('role');
    }

    public function getEffectiveRoleNameAttribute(): ?string
    {
        return $this->isCurrentOfficerOnDuty() ? 'officer_on_duty' : $this->role_name;
    }

    public function isCurrentOfficerOnDuty(): bool
    {
        if (!$this->getKey()) {
            return false;
        }

        return OfficerDutyRoster::query()
            ->where('officer_id', $this->getKey())
            ->where('is_active', true)
            ->whereDate('duty_week_start', '<=', now()->toDateString())
            ->whereDate('duty_week_end', '>=', now()->toDateString())
            ->exists();
    }

    // Helper method to check roles (supports role_id->role->name and legacy string role)
    public function hasRole(string $role): bool
    {
        return $this->role_name === $role
            || ($role === 'officer_on_duty' && $this->isCurrentOfficerOnDuty());
    }

    public function isAdmin(): bool
    {
        return $this->role_name === 'admin';
    }
}
