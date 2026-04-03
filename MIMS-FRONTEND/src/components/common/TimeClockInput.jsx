import React, { useEffect, useMemo, useState } from 'react';
import FormField from './FormField';
import Button from './Button';

const pad2 = (n) => String(n).padStart(2, '0');

const parseTime = (value) => {
  const s = String(value || '');
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return { h, m: mm };
};

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

const formatTime = (h, m) => `${pad2(clamp(h, 0, 23))}:${pad2(clamp(m, 0, 59))}`;

const incTimePart = (value, part, delta) => {
  const parsed = parseTime(value) ?? { h: 0, m: 0 };
  if (part === 'h') return formatTime(parsed.h + delta, parsed.m);
  return formatTime(parsed.h, parsed.m + delta);
};

export default function TimeClockInput({ label, value, onChange, hint, error, disabled }) {
  const parsed = useMemo(() => parseTime(value), [value]);
  const [draft, setDraft] = useState(() => ({
    hh: parsed ? pad2(parsed.h) : '',
    mm: parsed ? pad2(parsed.m) : '',
  }));
  const hh = draft.hh;
  const mm = draft.mm;

  useEffect(() => {
    // Sync local draft only when the external value changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(parsed ? { hh: pad2(parsed.h), mm: pad2(parsed.m) } : { hh: '', mm: '' });
  }, [parsed]);

  const commitIfValid = (nextHh, nextMm) => {
    const h = Number(nextHh);
    const m = Number(nextMm);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return;
    if (nextHh === '' || nextMm === '') return;
    onChange?.(formatTime(h, m));
  };

  const clear = () => {
    setDraft({ hh: '', mm: '' });
    onChange?.('');
  };

  return (
    <FormField label={label} hint={hint} error={error}>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            className="px-2 py-1 text-xs"
            disabled={disabled}
            onClick={() => onChange?.(incTimePart(value, 'h', 1))}
          >
            +H
          </Button>
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="HH"
            className="w-16 border rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-malawiGreen text-center"
            value={hh}
            disabled={disabled}
            onChange={(e) => {
              const next = e.target.value.replace(/[^\d]/g, '').slice(0, 2);
              setDraft((p) => ({ ...p, hh: next }));
              commitIfValid(next, mm);
            }}
            onBlur={() => {
              if (hh === '') return;
              const n = clamp(Number(hh || 0), 0, 23);
              const next = pad2(n);
              setDraft((p) => ({ ...p, hh: next }));
              commitIfValid(next, mm);
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="px-2 py-1 text-xs"
            disabled={disabled}
            onClick={() => onChange?.(incTimePart(value, 'h', -1))}
          >
            −H
          </Button>
        </div>

        <span className="text-gray-700 font-semibold">:</span>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            className="px-2 py-1 text-xs"
            disabled={disabled}
            onClick={() => onChange?.(incTimePart(value, 'm', 5))}
          >
            +5m
          </Button>
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="MM"
            className="w-16 border rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-malawiGreen text-center"
            value={mm}
            disabled={disabled}
            onChange={(e) => {
              const next = e.target.value.replace(/[^\d]/g, '').slice(0, 2);
              setDraft((p) => ({ ...p, mm: next }));
              commitIfValid(hh, next);
            }}
            onBlur={() => {
              if (mm === '') return;
              const n = clamp(Number(mm || 0), 0, 59);
              const next = pad2(n);
              setDraft((p) => ({ ...p, mm: next }));
              commitIfValid(hh, next);
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="px-2 py-1 text-xs"
            disabled={disabled}
            onClick={() => onChange?.(incTimePart(value, 'm', -5))}
          >
            −5m
          </Button>
        </div>

        <Button
          type="button"
          variant="outline"
          className="px-3 py-2 text-xs"
          disabled={disabled || (!hh && !mm && !value)}
          onClick={clear}
        >
          Clear
        </Button>
      </div>
    </FormField>
  );
}
