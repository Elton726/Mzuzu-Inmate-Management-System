import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { FiRefreshCw, FiSave, FiSettings } from 'react-icons/fi';
import Button from '../../../components/common/Button';
import { getVisitationRules, updateVisitationRules } from '../../visitation/services/visitationService';

const getErrorMessage = (err, fallback) =>
  err?.response?.data?.message || err?.response?.data?.error || err?.message || fallback;

export default function VisitationRulesPage() {
  const [rules, setRules] = useState([]);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadRules = async () => {
    try {
      setLoading(true);
      const data = await getVisitationRules();
      setRules(data || []);
      setValues(Object.fromEntries((data || []).map((rule) => [rule.key, rule.value])));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load visitation rules'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const changedRules = useMemo(() => rules
    .filter((rule) => String(values[rule.key] ?? '') !== String(rule.value ?? ''))
    .map((rule) => ({ key: rule.key, value: String(values[rule.key] ?? '') })), [rules, values]);

  const saveRules = async () => {
    if (changedRules.length === 0) {
      toast.info('No visitation rule changes to save');
      return;
    }

    try {
      setSaving(true);
      const updated = await updateVisitationRules(changedRules);
      const nextRules = rules.map((rule) => updated.find((row) => row.key === rule.key) || rule);
      setRules(nextRules);
      setValues(Object.fromEntries(nextRules.map((rule) => [rule.key, rule.value])));
      toast.success('Visitation rules updated');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update visitation rules'));
    } finally {
      setSaving(false);
    }
  };

  const setRuleValue = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold uppercase text-malawiGreen">
                <FiSettings className="h-4 w-4" />
                Admin controls
              </div>
              <h1 className="text-3xl font-bold text-slate-950">Visitation Rules</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Configure regular visit access hours and inmate visit limits enforced at gatekeeper check-in.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="outline" loading={loading} onClick={loadRules}>
                <FiRefreshCw /> Refresh
              </Button>
              <Button loading={saving} disabled={changedRules.length === 0} onClick={saveRules}>
                <FiSave /> Save changes
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-[1.1fr_0.8fr] border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-bold uppercase text-slate-500">
            <div>Rule</div>
            <div>Value</div>
          </div>

          {loading && rules.length === 0 ? (
            <div className="p-8 text-center text-sm font-semibold text-slate-500">Loading rules...</div>
          ) : rules.map((rule) => (
            <div key={rule.key} className="grid gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0 md:grid-cols-[1.1fr_0.8fr]">
              <div>
                <div className="font-bold text-slate-900">{rule.label}</div>
                <div className="mt-1 text-sm text-slate-500">{rule.description}</div>
              </div>

              <RuleInput
                rule={rule}
                value={values[rule.key] ?? ''}
                onChange={(value) => setRuleValue(rule.key, value)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RuleInput({ rule, value, onChange }) {
  if (rule.type === 'boolean') {
    return (
      <label className="inline-flex items-center gap-3 text-sm font-semibold text-slate-700">
        <input
          type="checkbox"
          checked={String(value) === '1'}
          onChange={(event) => onChange(event.target.checked ? '1' : '0')}
          className="h-5 w-5 rounded border-slate-300 text-malawiGreen focus:ring-malawiGreen"
        />
        Regular visits are enabled
      </label>
    );
  }

  return (
    <input
      type={rule.type === 'integer' ? 'number' : rule.type}
      min={rule.type === 'integer' ? 0 : undefined}
      max={rule.type === 'integer' ? 100 : undefined}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-malawiGreen focus:ring-2 focus:ring-green-100"
    />
  );
}
