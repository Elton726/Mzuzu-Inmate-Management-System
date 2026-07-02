/**
 * AdmissionsReportPage — Admission Module Operational Reports
 *
 * Generates Daily, Weekly, Monthly and Yearly reports.
 * Export: browser print / save-as-PDF.
 *
 * Print layout follows official government document standards:
 *  • A4 page size with 20 mm margins
 *  • Letterhead header with institution name, crest area, document reference
 *  • Running page footer with "CONFIDENTIAL", page number, and generation date
 *  • Section page-break control so sections never split mid-table
 *  • Zebra-striped tables with solid borders for readability on paper
 */

import React, { useCallback, useEffect, useState } from 'react';
import apiService from '../../../services/apiService';
import { useToast } from '../../../contexts/useToast';
import {
  MdPrint,
  MdRefresh,
  MdPeople,
  MdAssignment,
  MdGavel,
  MdHomeWork,
  MdWarning,
  MdCheckCircle,
  MdBarChart,
} from 'react-icons/md';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { value: 'daily',   label: 'Daily' },
  { value: 'weekly',  label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly',  label: 'Yearly' },
];

const TYPE_LABELS = {
  convict:         'Convict',
  remandee:        'Remandee',
  murder_remandee: 'Murder Remandee',
};

const TYPE_BAR_COLOR = {
  convict:         '#2563eb',
  remandee:        '#f59e0b',
  murder_remandee: '#dc2626',
};

const GENDER_LABELS = { male: 'Male', female: 'Female', unknown: 'Unknown' };
const GENDER_BAR_COLOR = { male: '#0ea5e9', female: '#ec4899', unknown: '#9ca3af' };

// ─────────────────────────────────────────────────────────────────────────────
// Shared sub-components (screen + print)
// ─────────────────────────────────────────────────────────────────────────────

/** Horizontal progress bar — renders identically on screen and when printed */
function PrintBar({ value, max, color = '#16a34a' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4 }} />
      </div>
      <span style={{ fontSize: 11, fontFamily: 'monospace', minWidth: 24, textAlign: 'right', color: '#374151' }}>
        {value}
      </span>
    </div>
  );
}

/** SVG sparkline trend chart that renders in print */
function TrendChart({ dailyTrend }) {
  const entries = Object.entries(dailyTrend || {});
  if (!entries.length) {
    return <p style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>No data for this period.</p>;
  }
  const maxVal = Math.max(...entries.map(([, v]) => v), 1);
  const W = 560; const H = 70; const pad = 10;
  const colW = entries.length > 1 ? (W - pad * 2) / (entries.length - 1) : W - pad * 2;
  const points = entries.map(([, v], i) => {
    const x = pad + i * colW;
    const y = H - pad - ((v / maxVal) * (H - pad * 2));
    return `${x},${y}`;
  }).join(' ');

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 70 }} preserveAspectRatio="none">
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map(f => {
          const y = H - pad - f * (H - pad * 2);
          return <line key={f} x1={pad} y1={y} x2={W - pad} y2={y} stroke="#e5e7eb" strokeWidth="0.8" />;
        })}
        {/* Area fill */}
        <polygon
          points={`${pad},${H - pad} ${points} ${pad + (entries.length - 1) * colW},${H - pad}`}
          fill="#dcfce7"
          opacity="0.7"
        />
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke="#16a34a"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Dots */}
        {entries.map(([, v], i) => {
          const x = pad + i * colW;
          const y = H - pad - ((v / maxVal) * (H - pad * 2));
          return <circle key={i} cx={x} cy={y} r="3" fill="#16a34a" stroke="#fff" strokeWidth="1.5" />;
        })}
      </svg>
      {/* Date labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#6b7280', marginTop: 2 }}>
        {entries.length <= 12
          ? entries.map(([d]) => <span key={d}>{d.slice(5)}</span>)
          : <>
              <span>{entries[0][0].slice(5)}</span>
              <span>{entries[Math.floor(entries.length / 4)][0].slice(5)}</span>
              <span>{entries[Math.floor(entries.length / 2)][0].slice(5)}</span>
              <span>{entries[Math.floor(entries.length * 0.75)][0].slice(5)}</span>
              <span>{entries[entries.length - 1][0].slice(5)}</span>
            </>
        }
      </div>
    </div>
  );
}



// ─────────────────────────────────────────────────────────────────────────────
// Print-only document components
// ─────────────────────────────────────────────────────────────────────────────


/** Full-width letterhead printed at the top of the document */
function PrintHeader({ meta }) {
  const docRef = `MMS/ADM/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  return (
    <div className="print-header" style={{
      borderBottom: '3px double #1a1a1a',
      paddingBottom: 14,
      marginBottom: 18,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 16,
    }}>
      {/* Left: crest placeholder */}
      <div style={{
        width: 72, height: 72, border: '2px solid #1a1a1a',
        borderRadius: '50%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0, flexDirection: 'column',
        fontSize: 8, fontWeight: 700, textAlign: 'center', color: '#1a1a1a',
        letterSpacing: 0.5,
      }}>
        <div style={{ fontSize: 20, marginBottom: 2 }}>⚖️</div>
        MALAWI<br />PRISONS
      </div>

      {/* Centre: institution name + report title */}
      <div style={{ flex: 1, textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#111' }}>
          Republic of Malawi — Malawi Prison Service
        </div>
        <div style={{ fontSize: 9, color: '#374151', marginTop: 1, letterSpacing: 1 }}>
          Mzuzu Correctional Facility
        </div>
        <div style={{
          marginTop: 8,
          fontSize: 15,
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: 1.5,
          color: '#111',
        }}>
          Admissions Operational Report
        </div>
        <div style={{
          marginTop: 4, display: 'inline-block',
          background: '#1a1a1a', color: '#fff',
          fontSize: 10, fontWeight: 600,
          padding: '2px 14px', letterSpacing: 0.5,
        }}>
          {meta?.label?.toUpperCase() ?? 'PERIOD REPORT'}
        </div>
      </div>

      {/* Right: document metadata box */}
      <div style={{
        fontSize: 9, color: '#374151', textAlign: 'right',
        border: '1px solid #d1d5db', padding: '8px 10px',
        lineHeight: 1.7, minWidth: 150,
      }}>
        <div><strong>Doc. Ref:</strong> {docRef}</div>
        <div><strong>Period:</strong> {meta?.from} – {meta?.to}</div>
        <div><strong>Generated:</strong> {meta ? new Date(meta.generated_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</div>
        <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px solid #e5e7eb' }}>
          <strong>Classification:</strong> <span style={{ color: '#dc2626', fontWeight: 700 }}>CONFIDENTIAL</span>
        </div>
      </div>
    </div>
  );
}

/** Footer printed at the bottom of every page via CSS @page */
function PrintFooter({ meta }) {
  return (
    <div className="print-footer-content" style={{
      borderTop: '1px solid #374151',
      marginTop: 20,
      paddingTop: 8,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: 8,
      color: '#6b7280',
    }}>
      <span style={{ fontWeight: 700, color: '#dc2626', letterSpacing: 1 }}>CONFIDENTIAL — FOR INTERNAL USE ONLY</span>
      <span>Mzuzu Correctional Facility · Mzuzu-MIMS</span>
      <span>Generated: {meta ? new Date(meta.generated_at).toLocaleDateString('en-GB') : '—'}</span>
    </div>
  );
}

/** Section heading used in the print document */
function SectionHeading({ number, title }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      borderBottom: '2px solid #111', paddingBottom: 6, marginBottom: 14,
    }}>
      <div style={{
        background: '#1a1a1a', color: '#fff',
        width: 26, height: 26, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 900, flexShrink: 0,
      }}>
        {number}
      </div>
      <h2 style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, color: '#111', margin: 0 }}>
        {title}
      </h2>
    </div>
  );
}

/** Key-figure pill for the print layout */
function PrintStat({ label, value, highlight }) {
  return (
    <div style={{
      border: highlight ? '2px solid #dc2626' : '1px solid #d1d5db',
      padding: '8px 12px',
      textAlign: 'center',
      flex: 1,
      minWidth: 100,
      background: highlight ? '#fef2f2' : '#f9fafb',
    }}>
      <div style={{ fontSize: 22, fontWeight: 900, color: highlight ? '#dc2626' : '#111', lineHeight: 1.1 }}>
        {value ?? '—'}
      </div>
      <div style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 3 }}>
        {label}
      </div>
    </div>
  );
}

/** Print table with alternating row shading */
function PrintTable({ headers, rows, highlightRow }) {
  if (!rows?.length) {
    return <p style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic', margin: '4px 0' }}>No records found.</p>;
  }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
      <thead>
        <tr style={{ background: '#1a1a1a' }}>
          {headers.map(h => (
            <th key={h} style={{
              padding: '6px 8px', color: '#fff', fontWeight: 700,
              textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5,
              border: '1px solid #374151',
            }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const isHighlight = highlightRow?.(row, i);
          return (
            <tr key={i} style={{
              background: isHighlight ? '#fef2f2' : i % 2 === 0 ? '#f9fafb' : '#fff',
            }}>
              {row.map((cell, j) => (
                <td key={j} style={{
                  padding: '5px 8px',
                  border: '1px solid #e5e7eb',
                  color: isHighlight && j === 0 ? '#dc2626' : '#111',
                  fontWeight: j === 0 ? 600 : 400,
                }}>
                  {cell}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen-only card wrapper (hidden in print)
// ─────────────────────────────────────────────────────────────────────────────

function ScreenCard({ icon, title, accent = 'green', children }) {
  const CardIcon = icon;
  const borderColor = {
    green: 'border-l-green-600', amber: 'border-l-amber-500',
    red: 'border-l-red-500',    blue: 'border-l-blue-600',
  }[accent] || 'border-l-green-600';

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 ${borderColor}`}>
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
        <CardIcon className="text-xl text-gray-400" />
        <h2 className="font-bold text-gray-800 text-base">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function ScreenStatPill({ label, value, sub }) {
  return (
    <div className="flex-1 min-w-[110px] bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-center">
      <div className="text-2xl font-black text-gray-900">{value ?? '—'}</div>
      <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function ScreenBar({ value, max, color = '#16a34a' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div style={{ width: `${pct}%`, background: color }} className="h-full rounded-full" />
      </div>
      <span className="text-xs font-mono text-gray-600 w-5 text-right">{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page component
// ─────────────────────────────────────────────────────────────────────────────

export default function AdmissionsReportPage() {
  const toast = useToast();

  const [period, setPeriod] = useState('monthly');
  const [dateInput, setDateInput] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [report, setReport]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);



  const loadReport = useCallback(async ({ throwOnError = false } = {}) => {
    setLoading(true);
    try {
      const data = await apiService.getAdmissionsReport({ period, date: dateInput });
      setReport(data);
      return data;
    } catch (err) {
      toast.error(err?.message || 'Failed to load report.');
      if (throwOnError) {
        throw err;
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [period, dateInput, toast]);

  const fetchReport = useCallback(() => loadReport(), [loadReport]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const waitForPrintRender = () => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      await loadReport({ throwOnError: true });
      await waitForPrintRender();
      window.print();
    } catch {
      // loadReport already shows the error toast.
    } finally {
      setExporting(false);
    }
  };

  const handlePeriodChange = (e) => {
    const p = e.target.value;
    setPeriod(p);
    const now = new Date();
    if (p === 'daily' || p === 'weekly') setDateInput(now.toISOString().slice(0, 10));
    if (p === 'monthly') setDateInput(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    if (p === 'yearly')  setDateInput(String(now.getFullYear()));
  };

  const dateInputType = (period === 'daily' || period === 'weekly') ? 'date'
    : period === 'yearly' ? 'number' : 'month';

  const meta       = report?.meta;
  const population = report?.population;
  const adm        = report?.admissions;
  const remand     = report?.remand;
  const cap        = report?.capacity;

  // ── Derived table rows ────────────────────────────────────────────────────

  const overdueRows = (remand?.overdue_list ?? []).map(r => [
    r.prison_number ?? '—',
    r.name || '—',
    r.case_number || '—',
    r.court_date || '—',
    `${r.days_overdue} day(s)`,
    TYPE_LABELS[r.inmate_type] ?? r.inmate_type,
  ]);

  const blockRows = Object.entries(cap?.by_block ?? {}).map(([block, d]) => [
    `Block ${block}`,
    String(d.capacity),
    String(d.occupancy),
    String(Math.max(0, d.capacity - d.occupancy)),
    `${d.occupancy_rate}%`,
    String(d.cells_count),
    String(d.at_capacity),
  ]);

  return (
    <>
      {/* ── Comprehensive print stylesheet ── */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 20mm 18mm 22mm 18mm;
        }

        @media print {
          html,
          body,
          #root {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          body * {
            visibility: hidden !important;
          }

          #print-root,
          #print-root * {
            visibility: visible !important;
          }

          #print-root {
            display: block !important;
            position: absolute;
            inset: 0 auto auto 0;
            width: 100%;
            background: #fff !important;
          }

          /* Screen-only elements vanish */
          .no-print { display: none !important; }

          /* Print-only elements appear */
          .print-only { display: block !important; }

          /* Typography reset for print */
          #print-root {
            font-family: 'Times New Roman', Times, serif;
            font-size: 11pt;
            color: #000;
            line-height: 1.5;
          }

          /* Section page-break control */
          .print-section {
            page-break-inside: avoid;
            break-inside: avoid;
            margin-bottom: 22pt;
          }

          /* Tables never break mid-header */
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; break-inside: avoid; }

          /* Running page footer via fixed positioning trick */
          .print-footer-content {
            position: fixed;
            bottom: 0; left: 0; right: 0;
            padding: 6pt 18mm;
            border-top: 1px solid #374151;
            background: #fff;
          }

          /* Page numbers via CSS counter */
          .page-number::after {
            content: counter(page);
          }
          body { counter-reset: page; }
          .print-footer-content { counter-increment: page; }

          /* Force background colours for table headers to print */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }

        /* Ensure print-only elements are hidden on screen */
        @media screen {
          .print-only { display: none !important; }
          #print-root { display: none !important; }
        }
      `}</style>

      {/* ══════════════════════════════════════════════════════════
          SCREEN VIEW
          ══════════════════════════════════════════════════════════ */}
      <div className="no-print min-h-screen bg-gray-50">

        {/* ── Toolbar ── */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <MdBarChart className="text-malawiGreen text-2xl" />
                Admissions Report
              </h1>
              {meta && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Period: <span className="font-semibold text-gray-700">{meta.label}</span>
                  &nbsp;·&nbsp;Generated {new Date(meta.generated_at).toLocaleString()}
                  &nbsp;·&nbsp;By {meta.generated_by}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={period}
                onChange={handlePeriodChange}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-malawiGreen"
              >
                {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>

              <input
                type={dateInputType}
                value={dateInput}
                min={period === 'yearly' ? '2000' : undefined}
                max={period === 'yearly' ? String(new Date().getFullYear()) : undefined}
                onChange={e => setDateInput(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-malawiGreen"
              />

              <button
                onClick={fetchReport}
                disabled={loading}
                className="flex items-center gap-1.5 bg-malawiGreen text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <MdRefresh className={loading ? 'animate-spin' : ''} />
                {loading ? 'Loading…' : 'Generate'}
              </button>

              <button
                onClick={handleExport}
                disabled={loading || exporting}
                className="flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-black transition-colors disabled:opacity-40"
              >
                <MdPrint /> {exporting ? 'Preparing...' : 'Export PDF'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Screen report body ── */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

          {loading && !report && (
            <div className="flex justify-center py-24">
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <div className="w-10 h-10 border-4 border-malawiGreen border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Building report…</span>
              </div>
            </div>
          )}

          {report && (
            <>
              {/* ── S1: Population ── */}
              <ScreenCard icon={MdPeople} title="1 — Population Summary" accent="green">
                <div className="flex flex-wrap gap-3 mb-5">
                  <ScreenStatPill label="Total Inmates" value={population?.total} />
                  <ScreenStatPill label="Young Offenders" value={population?.young_offenders} />
                  <ScreenStatPill label="First-time" value={population?.by_admission_type?.first_time ?? 0} />
                  <ScreenStatPill label="Repeat" value={population?.by_admission_type?.repeat ?? 0} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">By Inmate Type</h3>
                    <div className="space-y-2">
                      {Object.entries(population?.by_inmate_type || {}).map(([type, count]) => (
                        <div key={type}><div className="text-sm font-medium mb-0.5">{TYPE_LABELS[type] ?? type}</div>
                          <ScreenBar value={count} max={population?.total} color={TYPE_BAR_COLOR[type] ?? '#6b7280'} /></div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">By Gender</h3>
                    <div className="space-y-2">
                      {Object.entries(population?.by_gender || {}).map(([g, count]) => (
                        <div key={g}><div className="text-sm font-medium mb-0.5">{GENDER_LABELS[g] ?? g}</div>
                          <ScreenBar value={count} max={population?.total} color={GENDER_BAR_COLOR[g] ?? '#9ca3af'} /></div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Top Nationalities</h3>
                    <div className="space-y-2">
                      {Object.entries(population?.by_nationality || {}).slice(0, 8).map(([nat, count]) => (
                        <div key={nat}><div className="text-sm font-medium mb-0.5 truncate">{nat}</div>
                          <ScreenBar value={count} max={population?.total} /></div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScreenCard>

              {/* ── S2: Admissions Activity ── */}
              <ScreenCard icon={MdAssignment} title="2 — Admissions Activity" accent="blue">
                <div className="flex flex-wrap gap-3 mb-5">
                  <ScreenStatPill label="Total Admissions" value={adm?.total} sub={`in ${meta?.label}`} />
                  <ScreenStatPill label="First-time" value={adm?.by_admission_type?.first_time ?? 0} />
                  <ScreenStatPill label="Repeat" value={adm?.by_admission_type?.repeat ?? 0} />
                  <ScreenStatPill label="Docs Uploaded" value={adm?.documents_uploaded} />
                </div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Daily Trend</h3>
                <TrendChart dailyTrend={adm?.daily_trend} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-5">
                  <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">By Type</h3>
                    <div className="space-y-2">
                      {Object.entries(adm?.by_inmate_type || {}).map(([type, count]) => (
                        <div key={type}><div className="text-sm font-medium mb-0.5">{TYPE_LABELS[type] ?? type}</div>
                          <ScreenBar value={count} max={adm?.total || 1} color={TYPE_BAR_COLOR[type] ?? '#6b7280'} /></div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">By Officer</h3>
                    <div className="space-y-2">
                      {Object.entries(adm?.by_officer || {}).slice(0, 8).map(([name, count]) => (
                        <div key={name}><div className="text-sm font-medium mb-0.5 truncate">{name}</div>
                          <ScreenBar value={count} max={adm?.total || 1} color="#3b82f6" /></div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">By Court</h3>
                    {Object.keys(adm?.by_court || {}).length === 0
                      ? <p className="text-sm text-gray-400 italic">No court data recorded.</p>
                      : <div className="space-y-2">
                          {Object.entries(adm?.by_court || {}).slice(0, 8).map(([court, count]) => (
                            <div key={court}><div className="text-sm font-medium mb-0.5 truncate">{court}</div>
                              <ScreenBar value={count} max={adm?.total || 1} color="#8b5cf6" /></div>
                          ))}
                        </div>
                    }
                  </div>
                </div>
              </ScreenCard>

              {/* ── S3: Remand ── */}
              <ScreenCard icon={MdGavel} title="3 — Remand Management" accent="amber">
                <div className="flex flex-wrap gap-3 mb-5">
                  <ScreenStatPill label="Total Remandees" value={remand?.total_remandees} />
                  <ScreenStatPill label="Overdue" value={remand?.overdue_count} sub="past court date" />
                  <ScreenStatPill label="Due This Week" value={remand?.due_this_week_count} />
                  <ScreenStatPill label="Due ≤ 30 Days" value={remand?.due_next_30_days_count} />
                  <ScreenStatPill label="Avg. Duration" value={remand?.average_remand_days != null ? `${remand.average_remand_days}d` : '—'} />
                </div>
                {(remand?.overdue_count ?? 0) > 0 && (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <MdWarning className="text-red-500" />
                      <span className="text-xs font-bold text-red-600 uppercase tracking-wide">
                        Overdue Court Appearances ({remand.overdue_count})
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-gray-800 text-white">
                            {['Inmate number', 'Name', 'Case No.', 'Court Date', 'Days Overdue', 'Type'].map(h => (
                              <th key={h} className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide border border-gray-600">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(remand?.overdue_list ?? []).map((r, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-red-50' : 'bg-white'}>
                              <td className="px-3 py-2 border border-gray-200 font-mono text-xs">{r.prison_number ?? '—'}</td>
                              <td className="px-3 py-2 border border-gray-200 font-semibold">{r.name || '—'}</td>
                              <td className="px-3 py-2 border border-gray-200 text-gray-600">{r.case_number || '—'}</td>
                              <td className="px-3 py-2 border border-gray-200 text-gray-600">{r.court_date || '—'}</td>
                              <td className="px-3 py-2 border border-gray-200">
                                <span className="text-red-700 font-bold">{r.days_overdue}d</span>
                              </td>
                              <td className="px-3 py-2 border border-gray-200 text-gray-600">{TYPE_LABELS[r.inmate_type] ?? r.inmate_type}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
                {(remand?.overdue_count ?? 0) === 0 && (
                  <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                    <MdCheckCircle /> No overdue court appearances.
                  </div>
                )}
              </ScreenCard>

              {/* ── S4: Capacity ── */}
              <ScreenCard icon={MdHomeWork} title="4 — Cell & Capacity" accent="red">
                <div className="flex flex-wrap gap-3 mb-5">
                  <ScreenStatPill label="Total Capacity" value={cap?.total_capacity} />
                  <ScreenStatPill label="Occupied" value={cap?.total_occupancy} />
                  <ScreenStatPill label="Occupancy Rate" value={`${cap?.occupancy_rate ?? 0}%`} />
                  <ScreenStatPill label="Available Beds" value={cap?.available_beds} />
                  <ScreenStatPill label="Cells at Capacity" value={cap?.at_or_over_capacity} />
                  <ScreenStatPill label="Unallocated" value={cap?.unallocated_inmates} />
                </div>
                <div className="mb-5">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Overall occupancy</span>
                    <span className="font-bold">{cap?.total_occupancy} / {cap?.total_capacity}</span>
                  </div>
                  <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${(cap?.occupancy_rate ?? 0) >= 100 ? 'bg-red-500' : (cap?.occupancy_rate ?? 0) >= 80 ? 'bg-amber-500' : 'bg-malawiGreen'}`}
                      style={{ width: `${Math.min(100, cap?.occupancy_rate ?? 0)}%` }}
                    />
                  </div>
                </div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">By Block</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-800 text-white">
                        {['Block', 'Capacity', 'Occupied', 'Available', 'Rate', 'Cells', 'At Capacity'].map(h => (
                          <th key={h} className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide border border-gray-600">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(cap?.by_block ?? {}).map(([block, d], i) => {
                        const isOver = d.occupancy_rate >= 100;
                        const isHigh = d.occupancy_rate >= 80 && !isOver;
                        return (
                          <tr key={block} className={isOver ? 'bg-red-50' : isHigh ? 'bg-amber-50' : i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                            <td className="px-3 py-2 border border-gray-200 font-bold">Block {block}</td>
                            <td className="px-3 py-2 border border-gray-200">{d.capacity}</td>
                            <td className="px-3 py-2 border border-gray-200">{d.occupancy}</td>
                            <td className="px-3 py-2 border border-gray-200">{Math.max(0, d.capacity - d.occupancy)}</td>
                            <td className="px-3 py-2 border border-gray-200 font-bold" style={{ color: isOver ? '#dc2626' : isHigh ? '#d97706' : '#16a34a' }}>{d.occupancy_rate}%</td>
                            <td className="px-3 py-2 border border-gray-200">{d.cells_count}</td>
                            <td className="px-3 py-2 border border-gray-200">
                              {d.at_capacity > 0 ? <span className="text-red-600 font-bold">{d.at_capacity}</span> : <span className="text-green-600">0</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </ScreenCard>
            </>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          PRINT DOCUMENT  (hidden on screen, shown only when printing)
          ══════════════════════════════════════════════════════════ */}
      <div id="print-root" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: 11, color: '#000', lineHeight: 1.5 }}>
        {report && (
          <>
            {/* ── Letterhead ── */}
            <PrintHeader meta={meta} />

            {/* ── Executive summary strip ── */}
            <div className="print-section" style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontStyle: 'italic', color: '#374151', border: '1px solid #d1d5db', padding: '8px 12px', background: '#f9fafb' }}>
                <strong>Executive Summary:</strong>&nbsp;
                This report covers the period <strong>{meta?.from}</strong> to <strong>{meta?.to}</strong>.
                As at the report date, the facility holds <strong>{population?.total ?? '—'}</strong> inmates
                across <strong>{Object.keys(cap?.by_block ?? {}).length}</strong> block(s) with an overall
                occupancy rate of <strong>{cap?.occupancy_rate ?? 0}%</strong>.
                A total of <strong>{adm?.total ?? 0}</strong> admissions were recorded during this period.
                There are currently <strong>{remand?.overdue_count ?? 0}</strong> remandee(s) with overdue court appearances requiring immediate attention.
              </div>
            </div>

            {/* ════════════ SECTION 1: Population ════════════ */}
            <div className="print-section">
              <SectionHeading number="1" title="Population Summary" />
              {/* Key stats row */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <PrintStat label="Total Inmates" value={population?.total} />
                <PrintStat label="Young Offenders" value={population?.young_offenders} />
                <PrintStat label="First-time Admissions" value={population?.by_admission_type?.first_time ?? 0} />
                <PrintStat label="Repeat Admissions" value={population?.by_admission_type?.repeat ?? 0} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18 }}>
                {/* By type */}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #374151', marginBottom: 6, paddingBottom: 3 }}>
                    By Inmate Type
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {Object.entries(population?.by_inmate_type || {}).map(([type, count]) => (
                      <div key={type}>
                        <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 2 }}>{TYPE_LABELS[type] ?? type}</div>
                        <PrintBar value={count} max={population?.total} color={TYPE_BAR_COLOR[type] ?? '#6b7280'} />
                      </div>
                    ))}
                  </div>
                </div>
                {/* By gender */}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #374151', marginBottom: 6, paddingBottom: 3 }}>
                    By Gender
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {Object.entries(population?.by_gender || {}).map(([g, count]) => (
                      <div key={g}>
                        <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 2 }}>{GENDER_LABELS[g] ?? g}</div>
                        <PrintBar value={count} max={population?.total} color={GENDER_BAR_COLOR[g] ?? '#9ca3af'} />
                      </div>
                    ))}
                  </div>
                </div>
                {/* By nationality */}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #374151', marginBottom: 6, paddingBottom: 3 }}>
                    Top Nationalities
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {Object.entries(population?.by_nationality || {}).slice(0, 8).map(([nat, count]) => (
                      <div key={nat}>
                        <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 2 }}>{nat}</div>
                        <PrintBar value={count} max={population?.total} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ════════════ SECTION 2: Admissions Activity ════════════ */}
            <div className="print-section" style={{ pageBreakBefore: 'auto' }}>
              <SectionHeading number="2" title="Admissions Activity" />
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <PrintStat label="Total Admissions" value={adm?.total} />
                <PrintStat label="First-time" value={adm?.by_admission_type?.first_time ?? 0} />
                <PrintStat label="Repeat" value={adm?.by_admission_type?.repeat ?? 0} />
                <PrintStat label="Documents Uploaded" value={adm?.documents_uploaded} />
              </div>

              <div style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #374151', marginBottom: 8, paddingBottom: 3 }}>
                Daily Admission Trend
              </div>
              <TrendChart dailyTrend={adm?.daily_trend} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18, marginTop: 14 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #374151', marginBottom: 6, paddingBottom: 3 }}>By Type</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {Object.entries(adm?.by_inmate_type || {}).map(([type, count]) => (
                      <div key={type}>
                        <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 2 }}>{TYPE_LABELS[type] ?? type}</div>
                        <PrintBar value={count} max={adm?.total || 1} color={TYPE_BAR_COLOR[type] ?? '#6b7280'} />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #374151', marginBottom: 6, paddingBottom: 3 }}>By Officer</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {Object.entries(adm?.by_officer || {}).slice(0, 8).map(([name, count]) => (
                      <div key={name}>
                        <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 2 }}>{name}</div>
                        <PrintBar value={count} max={adm?.total || 1} color="#2563eb" />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #374151', marginBottom: 6, paddingBottom: 3 }}>By Court</div>
                  {Object.keys(adm?.by_court || {}).length === 0
                    ? <p style={{ fontSize: 10, color: '#9ca3af', fontStyle: 'italic' }}>No court data recorded.</p>
                    : <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {Object.entries(adm?.by_court || {}).slice(0, 8).map(([court, count]) => (
                          <div key={court}>
                            <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 2 }}>{court}</div>
                            <PrintBar value={count} max={adm?.total || 1} color="#7c3aed" />
                          </div>
                        ))}
                      </div>
                  }
                </div>
              </div>
            </div>

            {/* ════════════ SECTION 3: Remand Management ════════════ */}
            <div className="print-section" style={{ pageBreakBefore: 'auto' }}>
              <SectionHeading number="3" title="Remand Management" />
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <PrintStat label="Total Remandees" value={remand?.total_remandees} />
                <PrintStat label="Overdue" value={remand?.overdue_count} highlight={(remand?.overdue_count ?? 0) > 0} />
                <PrintStat label="Due This Week" value={remand?.due_this_week_count} />
                <PrintStat label="Due ≤ 30 Days" value={remand?.due_next_30_days_count} />
                <PrintStat label="Avg. Duration (days)" value={remand?.average_remand_days ?? '—'} />
              </div>

              {(remand?.overdue_count ?? 0) > 0 && (
                <>
                  <div style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: '#dc2626', borderBottom: '2px solid #dc2626', marginBottom: 8, paddingBottom: 3 }}>
                    ⚠ Overdue Court Appearances ({remand.overdue_count})
                  </div>
                  <PrintTable
                    headers={['Inmate number', 'Full Name', 'Case Number', 'Court Date', 'Days Overdue', 'Inmate Type']}
                    rows={overdueRows}
                    highlightRow={(_, i) => i % 2 === 0}
                  />
                </>
              )}
              {(remand?.overdue_count ?? 0) === 0 && (
                <p style={{ fontSize: 10, color: '#16a34a', fontStyle: 'italic' }}>✓ No overdue court appearances at the time of this report.</p>
              )}
            </div>

            {/* ════════════ SECTION 4: Cell & Capacity ════════════ */}
            <div className="print-section" style={{ pageBreakBefore: 'auto' }}>
              <SectionHeading number="4" title="Cell &amp; Capacity" />
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <PrintStat label="Total Capacity" value={cap?.total_capacity} />
                <PrintStat label="Occupied" value={cap?.total_occupancy} />
                <PrintStat label="Occupancy Rate" value={`${cap?.occupancy_rate ?? 0}%`} highlight={(cap?.occupancy_rate ?? 0) >= 80} />
                <PrintStat label="Available Beds" value={cap?.available_beds} />
                <PrintStat label="Cells at Capacity" value={cap?.at_or_over_capacity} highlight={(cap?.at_or_over_capacity ?? 0) > 0} />
                <PrintStat label="Unallocated" value={cap?.unallocated_inmates} />
              </div>

              <div style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #374151', marginBottom: 8, paddingBottom: 3 }}>
                Capacity by Block
              </div>
              <PrintTable
                headers={['Block', 'Capacity', 'Occupied', 'Available', 'Occupancy Rate', 'No. of Cells', 'At Capacity']}
                rows={blockRows}
                highlightRow={(row) => parseFloat(row[4]) >= 100}
              />
            </div>

            {/* ── Running footer ── */}
            <PrintFooter meta={meta} />
          </>
        )}
      </div>
    </>
  );
}
