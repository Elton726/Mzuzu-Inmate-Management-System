import React, { useEffect, useMemo, useState } from 'react';
import {
  MdAdd,
  MdDelete,
  MdEdit,
  MdHomeWork,
  MdRefresh,
  MdSave,
  MdShield,
  MdWc
} from 'react-icons/md';
import Button from '../../../components/common/Button';
import Card from '../../../components/common/Card';
import Spinner from '../../../components/common/Spinner';
import { useToast } from '../../../contexts/useToast';
import { createCell, deleteCell, listCells, updateCell } from '../services/cellService';

const SECURITY_LEVELS = [
  { value: 'maximum', label: 'Maximum', tone: 'border-red-200 bg-red-50 text-red-700' },
  { value: 'medium', label: 'Medium', tone: 'border-yellow-200 bg-yellow-50 text-yellow-700' },
  { value: 'minimum', label: 'Minimum', tone: 'border-green-200 bg-green-50 text-green-700' },
];

const GENDER_GROUPS = [
  { value: 'male', label: 'Male Cells' },
  { value: 'female', label: 'Female Cells' },
  { value: 'unassigned', label: 'Unassigned Cells' },
];

const emptyForm = {
  cell_number: '',
  block: '',
  gender: 'male',
  security_classification: 'medium',
  capacity: 6,
  status: 'available',
};

const titleCase = (value) => {
  if (!value) return 'Unassigned';
  return String(value).replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

const getCellGender = (cell) => {
  const raw = cell?.gender || cell?.assigned_gender || cell?.sex || cell?.cell_gender || cell?.cellGender;
  const normalized = String(raw || '').toLowerCase();
  if (['male', 'm'].includes(normalized)) return 'male';
  if (['female', 'f'].includes(normalized)) return 'female';
  return 'unassigned';
};

const occupancyPercent = (cell) => {
  const capacity = Number(cell?.capacity || 0);
  const occupied = Number(cell?.current_occupancy || 0);
  if (capacity <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((occupied / capacity) * 100)));
};

const normalizeCells = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

function SummaryTile({ label, value, helper, icon: Icon }) {
  return (
    <Card className="border border-gray-200 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">{label}</p>
          <p className="mt-2 text-3xl font-black text-gray-900">{value}</p>
          <p className="mt-1 text-xs text-gray-500">{helper}</p>
        </div>
        <Icon className="text-2xl text-malawiGreen" />
      </div>
    </Card>
  );
}

function CellCard({ cell, adminMode, onEdit, onDelete }) {
  const percent = occupancyPercent(cell);
  const isFull = Number(cell.current_occupancy || 0) >= Number(cell.capacity || 0);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-gray-900">Block {cell.block || '-'} · Cell {cell.cell_number || '-'}</p>
          <p className="mt-1 text-xs text-gray-500">
            Status: <span className="font-semibold text-gray-700">{titleCase(cell.status)}</span>
          </p>
        </div>
        <span className={`rounded border px-2 py-1 text-xs font-bold ${isFull ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
          {cell.current_occupancy ?? 0}/{cell.capacity ?? 0}
        </span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
        <div className={percent >= 100 ? 'h-full bg-malawiRed' : 'h-full bg-malawiGreen'} style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs font-semibold text-gray-500">
        <span>{percent}% occupied</span>
        <span>{Math.max(0, Number(cell.capacity || 0) - Number(cell.current_occupancy || 0))} space(s) free</span>
      </div>

      {adminMode && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" className="!px-3 !py-1.5 text-xs" onClick={() => onEdit(cell)}>
            <MdEdit /> Edit
          </Button>
          <Button variant="danger" className="!px-3 !py-1.5 text-xs" onClick={() => onDelete(cell)} disabled={Number(cell.current_occupancy || 0) > 0}>
            <MdDelete /> Delete
          </Button>
        </div>
      )}
    </div>
  );
}

function CellSection({ gender, cells, adminMode, onEdit, onDelete }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <MdWc className="text-xl text-malawiGreen" />
        <h2 className="text-xl font-bold text-gray-900">{gender.label}</h2>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">{cells.length}</span>
      </div>

      {gender.value === 'unassigned' && cells.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          These cells do not include a stored gender assignment yet. They are separated here until the backend records male or female cell designation.
        </div>
      )}

      <div className="grid gap-4">
        {SECURITY_LEVELS.map((level) => {
          const levelCells = cells.filter((cell) => cell.security_classification === level.value);
          const occupied = levelCells.reduce((sum, cell) => sum + Number(cell.current_occupancy || 0), 0);
          const capacity = levelCells.reduce((sum, cell) => sum + Number(cell.capacity || 0), 0);

          return (
            <Card key={level.value} className="border border-gray-200 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MdShield className="text-xl text-gray-700" />
                  <div>
                    <h3 className="font-bold text-gray-900">{level.label} Security</h3>
                    <p className="text-xs text-gray-500">{levelCells.length} cell(s) · {occupied}/{capacity} occupied</p>
                  </div>
                </div>
                <span className={`rounded border px-3 py-1 text-xs font-bold ${level.tone}`}>
                  {capacity ? Math.round((occupied / capacity) * 100) : 0}% full
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {levelCells.length ? (
                  levelCells.map((cell) => (
                    <CellCard key={cell.id} cell={cell} adminMode={adminMode} onEdit={onEdit} onDelete={onDelete} />
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500 md:col-span-2 xl:col-span-3">
                    No {level.label.toLowerCase()} security cells in this group.
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

export default function CellManagementPage({ adminMode = false }) {
  const toast = useToast();
  const [cells, setCells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadCells = async () => {
    try {
      setLoading(true);
      const data = await listCells();
      setCells(normalizeCells(data));
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to load cells');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCells();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = useMemo(() => {
    const groups = { male: [], female: [], unassigned: [] };
    cells.forEach((cell) => groups[getCellGender(cell)].push(cell));
    return groups;
  }, [cells]);

  const totals = useMemo(() => {
    const capacity = cells.reduce((sum, cell) => sum + Number(cell.capacity || 0), 0);
    const occupied = cells.reduce((sum, cell) => sum + Number(cell.current_occupancy || 0), 0);
    return { capacity, occupied, available: Math.max(0, capacity - occupied) };
  }, [cells]);

  const startEdit = (cell) => {
    setEditingCell(cell);
    setForm({
      cell_number: cell.cell_number || '',
      block: cell.block || '',
      gender: getCellGender(cell) === 'unassigned' ? 'male' : getCellGender(cell),
      security_classification: cell.security_classification || 'medium',
      capacity: cell.capacity || 1,
      status: cell.status || 'available',
    });
  };

  const resetForm = () => {
    setEditingCell(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const payload = { ...form, capacity: Number(form.capacity) };
      if (editingCell?.id) {
        await updateCell(editingCell.id, payload);
        toast.success('Cell updated successfully');
      } else {
        await createCell(payload);
        toast.success('Cell created successfully');
      }
      resetForm();
      await loadCells();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save cell');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cell) => {
    if (!window.confirm(`Delete cell ${cell.cell_number}?`)) return;
    try {
      await deleteCell(cell.id);
      toast.success('Cell deleted successfully');
      await loadCells();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to delete cell');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8 md:px-8 flex items-center justify-center">
        <Spinner label="Loading cell management..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 md:px-8 text-gray-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-malawiGreen">
                <MdHomeWork /> {adminMode ? 'Admin Cell Management' : 'Cell Allocation Overview'}
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-gray-900">Cell Management</h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-600">
                Review cell allocations and capacity by male or female designation, then by minimum, medium, and maximum security levels.
              </p>
            </div>
            <Button onClick={loadCells} className="shrink-0">
              <MdRefresh /> Refresh
            </Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <SummaryTile label="Total Cells" value={cells.length} helper="Registered cells in MIMS" icon={MdHomeWork} />
          <SummaryTile label="Occupied Spaces" value={totals.occupied} helper={`${totals.capacity} total capacity`} icon={MdShield} />
          <SummaryTile label="Available Spaces" value={totals.available} helper="Remaining capacity across all cells" icon={MdWc} />
        </section>

        {adminMode && (
          <Card className="border border-gray-200 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{editingCell ? 'Edit Cell' : 'Add Cell'}</h2>
                  <p className="text-sm text-gray-500">Create or update cell number, block, capacity, security level, and availability status.</p>
                </div>
                {editingCell && (
                  <Button type="button" variant="outline" onClick={resetForm}>Cancel Edit</Button>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                <label className="text-sm font-semibold text-gray-700">
                  Cell Number
                  <input className="mt-1 w-full rounded border border-gray-300 px-3 py-2" value={form.cell_number} onChange={(event) => setForm({ ...form, cell_number: event.target.value })} required />
                </label>
                <label className="text-sm font-semibold text-gray-700">
                  Block
                  <input className="mt-1 w-full rounded border border-gray-300 px-3 py-2" value={form.block} onChange={(event) => setForm({ ...form, block: event.target.value })} required />
                </label>
                <label className="text-sm font-semibold text-gray-700">
                  Gender
                  <select className="mt-1 w-full rounded border border-gray-300 px-3 py-2" value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </label>
                <label className="text-sm font-semibold text-gray-700">
                  Security
                  <select className="mt-1 w-full rounded border border-gray-300 px-3 py-2" value={form.security_classification} onChange={(event) => setForm({ ...form, security_classification: event.target.value })}>
                    {SECURITY_LEVELS.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}
                  </select>
                </label>
                <label className="text-sm font-semibold text-gray-700">
                  Capacity
                  <input type="number" min="1" className="mt-1 w-full rounded border border-gray-300 px-3 py-2" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} required />
                </label>
                <label className="text-sm font-semibold text-gray-700">
                  Status
                  <select className="mt-1 w-full rounded border border-gray-300 px-3 py-2" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                    <option value="available">Available</option>
                    <option value="full">Full</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </label>
              </div>

              <Button type="submit" loading={saving}>
                {editingCell ? <MdSave /> : <MdAdd />} {editingCell ? 'Save Changes' : 'Add Cell'}
              </Button>
            </form>
          </Card>
        )}

        <div className="space-y-8">
          {GENDER_GROUPS.map((gender) => (
            <CellSection
              key={gender.value}
              gender={gender}
              cells={grouped[gender.value]}
              adminMode={adminMode}
              onEdit={startEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
