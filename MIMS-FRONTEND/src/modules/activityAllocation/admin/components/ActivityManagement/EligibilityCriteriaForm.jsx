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

export default function EligibilityCriteriaForm({ value, onChange }) {
  const criteria = value || {};
  const selectedSkills = Array.isArray(criteria.skills_required) ? criteria.skills_required : [];

  const update = (patch) => {
    onChange?.({ allowed_inmate_types: ['convict'], ...criteria, ...patch });
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

        <Input
          type="number"
          min={0}
          label="Minimum Sentence (Years)"
          hint="Example: 0 means no minimum."
          value={criteria.min_sentence_years ?? ''}
          onChange={(e) => {
            const next = e.target.value;
            update({ min_sentence_years: next === '' ? undefined : Number(next) });
          }}
        />

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
