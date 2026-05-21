import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import VisitationTabs from '../components/VisitationTabs';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Select from '../../../components/common/Select';
import Modal from '../../../components/common/Modal';
import Textarea from '../../../components/common/Textarea';
import apiClient from '../../../services/apiClient';
import * as ruleService from '../services/ruleService';
import { useDebouncedValue } from '../../../utils/useDebouncedValue';
import { getInmateDisplayName, getInmateSearchResults } from '../utils/inmateSearch';

const ruleTypes = [
  { value: 'restricted_visitors', label: 'Restricted visitors' },
  { value: 'contact_only', label: 'Contact only' },
  { value: 'supervised_only', label: 'Supervised only' },
  { value: 'no_visitation', label: 'No visitation' }
];

export default function RulesPage() {
  const [inmateQuery, setInmateQuery] = useState('');
  const [selectedInmate, setSelectedInmate] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [rules, setRules] = useState([]);
  const [formModel, setFormModel] = useState({ rule_type: '', description: '', is_active: true });
  const [editingRule, setEditingRule] = useState(null);
  const [showRuleModal, setShowRuleModal] = useState(false);
const debouncedQuery = useDebouncedValue(inmateQuery, 300);

  useEffect(() => {
    if (!debouncedQuery) {
      return;
    }
    queueMicrotask(() => setLoadingSearch(true));
    apiClient.get('/inmates/search', { params: { q: debouncedQuery } })
      .then((response) => setSearchResults(getInmateSearchResults(response.data)))
      .catch(() => setSearchResults([]))
      .finally(() => setLoadingSearch(false));
  }, [debouncedQuery]);

  useEffect(() => {
    if (!selectedInmate) return;

    ruleService.getRulesForInmate(selectedInmate.id)
      .then((response) => setRules(response.data ?? []))
      .catch((err) => toast.error(err.message || 'Unable to load rules'));
  }, [selectedInmate]);

  const selectedLabel = useMemo(() => {
    if (!selectedInmate) return '';
    return getInmateDisplayName(selectedInmate);
  }, [selectedInmate]);

  const openNewRuleModal = () => {
    setEditingRule(null);
    setFormModel({ rule_type: '', description: '', is_active: true });
    setShowRuleModal(true);
  };

  const openEditRule = (rule) => {
    setEditingRule(rule);
    setFormModel({ rule_type: rule.rule_type, description: rule.description, is_active: rule.is_active });
    setShowRuleModal(true);
  };

  const saveRule = async (event) => {
    event.preventDefault();
    if (!selectedInmate) {
      toast.error('Select an inmate first');
      return;
    }
    const payload = {
      inmate_id: selectedInmate.id,
      rule_type: formModel.rule_type,
      description: formModel.description,
      is_active: formModel.is_active
    };
    try {
      const response = editingRule ? await ruleService.updateVisitationRule(editingRule.id, payload) : await ruleService.createVisitationRule(payload);
      const rule = response.data ?? response;
      toast.success(editingRule ? 'Rule updated' : 'Rule added');
      setShowRuleModal(false);
      setEditingRule(null);
      setRules((current) => {
        if (editingRule) {
          return current.map((item) => (item.id === rule.id ? rule : item));
        }
        return [rule, ...current];
      });
    } catch (err) {
      toast.error(err.message || 'Unable to save rule');
    }
  };

  const deleteRule = async (ruleId) => {
    try {
      await ruleService.deleteVisitationRule(ruleId);
      toast.success('Rule removed');
      setRules((current) => current.filter((item) => item.id !== ruleId));
    } catch (err) {
      toast.error(err.message || 'Unable to remove rule');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <VisitationTabs />
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-malawiBlack dark:text-white">Visitation rules</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">View and manage visitation restrictions for selected inmates.</p>
        </div>
        <Button onClick={openNewRuleModal}>Add rule</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-4 shadow-sm">
          <Input
            label="Search inmate"
            value={inmateQuery}
            onChange={(e) => {
              setInmateQuery(e.target.value);
              if (!e.target.value) {
                setSearchResults([]);
              }
            }}
            placeholder="Search by name or number"
          />
          {loadingSearch && <p className="mt-3 text-sm text-gray-500">Searching inmates…</p>}
          {searchResults.length > 0 && (
            <div className="mt-3 overflow-auto rounded border border-gray-200 bg-white dark:bg-slate-900 dark:border-slate-700 shadow-sm max-h-60">
              {searchResults.map((inmate) => (
                <button
                  key={inmate.id}
                  type="button"
                  onClick={() => {
                    setSelectedInmate(inmate);
                    setSearchResults([]);
                    setInmateQuery('');
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-slate-800"
                >
                  {getInmateDisplayName(inmate)} {inmate.prison_number ? `(${inmate.prison_number})` : ''}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-4 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-2">Selected inmate</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">{selectedLabel || 'No inmate selected'}</p>
        </div>
      </div>

      <div className="rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-4 shadow-sm">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Rules</h2>
        {!selectedInmate ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Select an inmate to show visitation rules.</p>
        ) : rules.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No rules defined for this inmate.</p>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <div key={rule.id} className="rounded-lg border border-gray-200 dark:border-slate-700 p-4 bg-gray-50 dark:bg-slate-800">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{rule.rule_type?.replace('_', ' ')}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{rule.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${rule.is_active ? 'bg-malawiGreen text-white' : 'bg-gray-300 text-gray-700 dark:bg-slate-700 dark:text-gray-200'}`}>{rule.is_active ? 'Active' : 'Inactive'}</span>
                    <Button variant="outline" onClick={() => openEditRule(rule)}>Edit</Button>
                    <Button variant="danger" onClick={() => deleteRule(rule.id)}>Delete</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showRuleModal && (
        <Modal title={editingRule ? 'Edit visitation rule' : 'Add visitation rule'} onClose={() => setShowRuleModal(false)}>
          <form onSubmit={saveRule} className="space-y-4">
            <Select label="Rule type" options={ruleTypes} value={formModel.rule_type} onChange={(e) => setFormModel((prev) => ({ ...prev, rule_type: e.target.value }))} />
            <Textarea label="Description" rows={4} value={formModel.description} onChange={(e) => setFormModel((prev) => ({ ...prev, description: e.target.value }))} />
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <input type="checkbox" checked={formModel.is_active} onChange={(e) => setFormModel((prev) => ({ ...prev, is_active: e.target.checked }))} className="rounded border-gray-300 text-malawiGreen focus:ring-malawiGreen" />
              Active rule
            </label>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
              <Button variant="outline" onClick={() => setShowRuleModal(false)}>Cancel</Button>
              <Button type="submit">Save rule</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
