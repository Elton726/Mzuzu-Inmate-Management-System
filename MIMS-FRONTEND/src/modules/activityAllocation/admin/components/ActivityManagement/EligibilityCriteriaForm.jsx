import React from 'react';
import Card from '../../../../../components/common/Card';
import Input from '../../../../../components/common/Input';

const SKILL_OPTIONS = [
  { value: 'cooking', label: 'Cooking' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'tailoring', label: 'Tailoring' },
  { value: 'carpentry', label: 'Carpentry' },
  { value: 'farming', label: 'Farming' },
  { value: 'literacy', label: 'Literacy' },
  { value: 'maintenance', label: 'Maintenance' },
];

export default function EligibilityCriteriaForm({ value, onChange, errors = {} }) {
  const criteria = value || {};
  const selectedSkills = Array.isArray(criteria.skills_required) ? criteria.skills_required : [];
  const minRemaining = criteria.min_remaining_years ?? criteria.min_sentence_years ?? '';
  const maxRemaining = criteria.max_remaining_years ?? '';
  const hasRangeError = minRemaining !== '' && maxRemaining !== '' && Number(maxRemaining) > 0 && Number(maxRemaining) < Number(minRemaining);

  const update = (patch) => {
    const next = { allowed_inmate_types: ['convict'], ...criteria, ...patch };
    Object.keys(next).forEach((key) => {
      if (next[key] === undefined) delete next[key];
    });
    delete next.min_sentence_years;
    onChange?.(next);
  };

  return (
    <Card title="Eligibility Criteria">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded p-3 bg-gray-50">
          <div className="text-xs uppercase text-gray-500">Allowed Inmate Type</div>
          <div className="font-semibold text-gray-800 mt-1">Convict (fixed)</div>
          <p className="text-xs text-gray-500 mt-1">
            Remandees are not eligible for activity allocation.
          </p>
        </div>

        <div className="md:col-span-2 rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-gray-800">Remaining Sentence Range</h3>
            <p className="mt-1 text-xs text-gray-500">
              Filter inmates based on how many years they have left to serve. Leave at 0 for no limit.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              type="number"
              min={0}
              step="0.1"
              label="Min. Remaining (Years)"
              value={minRemaining}
              onChange={(e) => {
                const next = e.target.value;
                update({ min_remaining_years: next === '' ? undefined : Number(next) });
              }}
              error={errors.min_remaining_years}
            />
            <Input
              type="number"
              min={0}
              step="0.1"
              label="Max. Remaining (Years)"
              value={maxRemaining}
              onChange={(e) => {
                const next = e.target.value;
                update({ max_remaining_years: next === '' ? undefined : Number(next) });
              }}
              error={errors.max_remaining_years}
            />
          </div>

          {hasRangeError && (
            <p className="mt-2 text-sm font-medium text-red-600">
              Maximum must be greater than or equal to Minimum.
            </p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Skills Required (Optional)
            <select
              multiple
              value={selectedSkills}
              onChange={(e) => {
                const next = Array.from(e.target.selectedOptions, (option) => option.value);
                update({ skills_required: next.length ? next : undefined });
              }}
              className="mt-1 min-h-32 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-malawiGreen focus:outline-none focus:ring-2 focus:ring-malawiGreen/20"
            >
              {SKILL_OPTIONS.map((skill) => (
                <option key={skill.value} value={skill.value}>{skill.label}</option>
              ))}
            </select>
          </label>
          <p className="mt-1 text-xs text-gray-500">Hold Ctrl or Shift to select more than one skill.</p>
        </div>
      </div>
    </Card>
  );
}
