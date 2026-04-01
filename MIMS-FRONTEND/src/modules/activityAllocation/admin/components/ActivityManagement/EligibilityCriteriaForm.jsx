import React, { useEffect, useMemo, useState } from 'react';
import Card from '../../../../../components/common/Card';
import Checkbox from '../../../../../components/common/Checkbox';
import Input from '../../../../../components/common/Input';
import Select from '../../../../../components/common/Select';

const EDUCATION_LEVELS = [
  { value: 'none', label: 'None' },
  { value: 'primary', label: 'Primary' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'tertiary', label: 'Tertiary' },
];

const normalizeSkills = (csv) =>
  String(csv || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export default function EligibilityCriteriaForm({ value, onChange }) {
  const criteria = value || {};

  // Activity allocation is only for convicts.
  const allowedSet = useMemo(() => new Set(['convict']), []);

  const [skillsCsv, setSkillsCsv] = useState(() =>
    Array.isArray(criteria.skills_required) ? criteria.skills_required.join(', ') : ''
  );

  useEffect(() => {
    setSkillsCsv(Array.isArray(criteria.skills_required) ? criteria.skills_required.join(', ') : '');
  }, [criteria.skills_required]);

  const update = (patch) => {
    onChange?.({ allowed_inmate_types: ['convict'], ...criteria, ...patch });
  };

  return (
    <Card title="Eligibility Criteria">
      <p className="text-sm text-gray-600 mb-4">
        Use these simple options to control who can participate. Activity allocation is only for convicts.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded p-3 bg-gray-50">
          <div className="text-xs uppercase text-gray-500">Allowed Inmate Type</div>
          <div className="font-semibold text-gray-800 mt-1">Convict (fixed)</div>
          <p className="text-xs text-gray-500 mt-1">
            Remandees are not eligible for activity allocation.
          </p>
        </div>

        <div className="space-y-4">
          <Input
            type="number"
            min={0}
            label="Minimum Sentence (Years)"
            hint="Example: 0 means no minimum."
            value={criteria.min_sentence_years ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              update({ min_sentence_years: v === '' ? undefined : Number(v) });
            }}
          />

          <Select
            label="Education Level (Optional)"
            value={criteria.education_level ?? ''}
            onChange={(e) => update({ education_level: e.target.value || undefined })}
            options={EDUCATION_LEVELS}
            hint="Only applies if you want an education requirement."
          />
        </div>

        <div className="md:col-span-2">
          <Checkbox
            label="Requires Good Behavior"
            checked={!!criteria.good_behavior}
            onChange={(e) => update({ good_behavior: e.target.checked })}
          />
          <p className="text-xs text-gray-500 mt-1">
            Turn on if only well-behaved inmates should be eligible.
          </p>
        </div>

        <div className="md:col-span-2">
          <Input
            label="Skills Required (Optional)"
            hint="Type skills separated by commas (e.g. cooking, cleaning)"
            value={skillsCsv}
            onChange={(e) => {
              const next = e.target.value;
              setSkillsCsv(next);
              update({ skills_required: normalizeSkills(next) });
            }}
          />
        </div>
      </div>
    </Card>
  );
}
