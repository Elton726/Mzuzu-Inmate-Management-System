import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';
import {
  listSentenceAdjustmentTypes,
  createSentenceAdjustmentType,
  updateSentenceAdjustmentType,
  deleteSentenceAdjustmentType
} from '../services/sentenceAdjustmentTypeService';

const emptyForm = {
  name: '',
  years_to_reduce: 0,
  info: '',
  is_active: true,
};

export default function SentenceAdjustmentTypesPage() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const loadTypes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await listSentenceAdjustmentTypes({ per_page: 100 });
      setTypes(response.data || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to load sentence adjustment types');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTypes();
  }, [loadTypes]);

  const openModal = (type = null) => {
    setSelectedType(type);
    setForm(type ? {
      name: type.name || '',
      years_to_reduce: type.years_to_reduce || 0,
      info: type.info || '',
      is_active: type.is_active ?? true,
    } : emptyForm);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedType(null);
    setForm(emptyForm);
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }

    try {
      setSaving(true);
      if (selectedType) {
        await updateSentenceAdjustmentType(selectedType.id, form);
        toast.success('Sentence adjustment type updated successfully');
      } else {
        await createSentenceAdjustmentType(form);
        toast.success('Sentence adjustment type created successfully');
      }
      closeModal();
      await loadTypes();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save sentence adjustment type');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (type) => {
    if (!window.confirm(`Delete "${type.name}"? This action cannot be undone.`)) return;
    try {
      await deleteSentenceAdjustmentType(type.id);
      toast.success('Sentence adjustment type deleted successfully');
      await loadTypes();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to delete sentence adjustment type');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 md:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-widest text-malawiGreen font-bold">Administration</p>
            <h1 className="mt-2 text-3xl font-black text-gray-900">Sentence Adjustment Types</h1>
            <p className="mt-2 text-sm text-gray-600">Manage adjustment names, reduction years, and explanatory info for station officer release adjustments.</p>
          </div>
          <Button onClick={() => openModal()}>
            <FiPlus /> Add Adjustment Type
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Available Types</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Years to Reduce</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Info</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {types.map((type) => (
                  <tr key={type.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{type.name.replace(/_/g, ' ')}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{type.years_to_reduce}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{type.info || '-'}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${type.is_active ? 'bg-malawiGreen/10 text-malawiGreen' : 'bg-gray-100 text-gray-500'}`}>
                        {type.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 space-x-2">
                      <Button variant="outline" onClick={() => openModal(type)}>
                        <FiEdit /> Edit
                      </Button>
                      <Button variant="danger" onClick={() => handleDelete(type)}>
                        <FiTrash2 /> Delete
                      </Button>
                    </td>
                  </tr>
                ))}
                {types.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">No sentence adjustment types configured.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <Modal title={selectedType ? 'Edit Adjustment Type' : 'Create Adjustment Type'} onClose={closeModal} widthClass="max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. remission"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-malawiGreen"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Years to Reduce</label>
              <input
                type="number"
                value={form.years_to_reduce}
                onChange={(e) => handleChange('years_to_reduce', Number(e.target.value))}
                min={0}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-malawiGreen"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Info</label>
              <textarea
                value={form.info}
                onChange={(e) => handleChange('info', e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-malawiGreen"
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                id="is_active"
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => handleChange('is_active', e.target.checked)}
                className="h-4 w-4 text-malawiGreen rounded border-gray-300 focus:ring-malawiGreen"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Active</label>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button variant="secondary" type="button" onClick={closeModal}>Cancel</Button>
              <Button type="submit" loading={saving}>{selectedType ? 'Save Changes' : 'Create Type'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
