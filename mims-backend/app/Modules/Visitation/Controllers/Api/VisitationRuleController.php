<?php

namespace App\Modules\Visitation\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\Visitation\Models\VisitationRule;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class VisitationRuleController extends Controller
{
    public function index()
    {
        $this->ensureDefaults();

        return response()->json([
            'data' => VisitationRule::query()->orderBy('id')->get(),
        ]);
    }

    public function update(Request $request)
    {
        $this->ensureDefaults();

        $data = $request->validate([
            'rules' => ['required', 'array', 'min:1'],
            'rules.*.key' => ['required', 'string', Rule::in(array_keys(VisitationRule::DEFAULTS))],
            'rules.*.value' => ['required', 'string', 'max:255'],
        ]);

        $updated = collect($data['rules'])->map(function (array $rule) use ($request) {
            $definition = VisitationRule::DEFAULTS[$rule['key']];
            $value = $this->normalizeValue($rule['key'], $rule['value'], $definition['type']);

            $model = VisitationRule::query()->where('key', $rule['key'])->firstOrFail();
            $model->update([
                'value' => $value,
                'updated_by' => $request->user()->id,
            ]);

            return $model->fresh();
        });

        return response()->json(['data' => $updated->values()]);
    }

    private function ensureDefaults(): void
    {
        foreach (VisitationRule::DEFAULTS as $key => $definition) {
            VisitationRule::query()->firstOrCreate(
                ['key' => $key],
                [
                    'value' => $definition['value'],
                    'label' => $definition['label'],
                    'type' => $definition['type'],
                    'description' => $definition['description'],
                ]
            );
        }
    }

    private function normalizeValue(string $key, string $value, string $type): string
    {
        if ($type === 'boolean') {
            return in_array(strtolower($value), ['1', 'true', 'yes', 'on'], true) ? '1' : '0';
        }

        if ($type === 'time') {
            if (! preg_match('/^\d{2}:\d{2}$/', $value)) {
                throw ValidationException::withMessages([
                    "rules.{$key}" => ['Time values must use HH:mm format.'],
                ]);
            }

            return $value;
        }

        if ($type === 'integer') {
            $number = filter_var($value, FILTER_VALIDATE_INT);
            if ($number === false || $number < 0 || $number > 100) {
                throw ValidationException::withMessages([
                    "rules.{$key}" => ['Number values must be between 0 and 100.'],
                ]);
            }

            return (string) $number;
        }

        return $value;
    }
}
