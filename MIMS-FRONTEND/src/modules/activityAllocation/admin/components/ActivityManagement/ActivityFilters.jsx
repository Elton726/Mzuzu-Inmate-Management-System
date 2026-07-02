import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCategories } from '../../store/activitySlice';
import Card from '../../../../../components/common/Card';
import Input from '../../../../../components/common/Input';
import Select from '../../../../../components/common/Select';
import Button from '../../../../../components/common/Button';
import { useDebouncedValue } from '../../../../../utils/useDebouncedValue';
import * as activityService from '../../services/activityService';

function HighlightMatch({ text, query }) {
  if (!query) return text;

  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return text;

  const before = text.slice(0, index);
  const match = text.slice(index, index + query.length);
  const after = text.slice(index + query.length);

  return (
    <>
      {before}
      <strong className="font-semibold text-gray-900 dark:text-gray-100">{match}</strong>
      {after}
    </>
  );
}

export default function ActivityFilters({ filters, onFilterChange }) {
  const dispatch = useDispatch();
  const { categories } = useSelector((s) => s.activity);
  const [local, setLocal] = useState(filters || {});
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [selectedSuggestionFilters, setSelectedSuggestionFilters] = useState(null);
  const searchRef = useRef(null);
  const searchTerm = local.search || '';
  const debouncedSearch = useDebouncedValue(searchTerm, 350);

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  useEffect(() => {
    const term = debouncedSearch.trim();

    if (!term) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      setSuggestionsOpen(false);
      return undefined;
    }

    let cancelled = false;
    setSuggestionsLoading(true);
    setSuggestionsOpen(true);

    activityService.searchActivities(term)
      .then((response) => {
        if (cancelled) return;
        setSuggestions(response.data || []);
      })
      .catch(() => {
        if (cancelled) return;
        setSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setSuggestionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!searchRef.current?.contains(event.target)) {
        setSuggestionsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSuggestionsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const categoryOptions = useMemo(
    () => (categories || []).map((c) => ({ value: c.id, label: c.name })),
    [categories]
  );

  const buildAppliedFilters = () => {
    if (!selectedSuggestionFilters) {
      return { ...local };
    }

    const { search, ...filtersWithoutDisplaySearch } = local;
    return {
      ...filtersWithoutDisplaySearch,
      ...selectedSuggestionFilters,
    };
  };

  const apply = () => {
    setSuggestionsOpen(false);
    onFilterChange(buildAppliedFilters());
  };

  const reset = () => {
    setLocal({});
    setSuggestions([]);
    setSuggestionsOpen(false);
    setSelectedSuggestionFilters(null);
    onFilterChange({});
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;

    if (value === '') {
      reset();
      return;
    }

    setSelectedSuggestionFilters(null);
    setLocal((p) => ({ ...p, search: value || undefined }));
    setSuggestionsOpen(Boolean(value.trim()));
  };

  const selectSuggestion = (suggestion) => {
    const suggestionFilters = suggestion.filters || { search: suggestion.value };
    const next = {
      ...local,
      ...suggestionFilters,
      search: suggestion.value,
    };
    const { search, ...filtersWithoutDisplaySearch } = next;
    const appliedFilters = {
      ...filtersWithoutDisplaySearch,
      ...suggestionFilters,
    };

    setLocal(next);
    setSelectedSuggestionFilters(suggestionFilters);
    setSuggestionsOpen(false);
    onFilterChange(appliedFilters);
  };

  const shouldShowSuggestions = suggestionsOpen && Boolean(searchTerm.trim());

  return (
    <Card className="mb-6" title="Filters">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative" ref={searchRef}>
          <Input
            label="Search"
            placeholder="Search by name..."
            value={local.search || ''}
            onChange={handleSearchChange}
            onFocus={() => setSuggestionsOpen(Boolean(searchTerm.trim()))}
            autoComplete="off"
          />

          {shouldShowSuggestions && (
            <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
              {suggestionsLoading ? (
                <div className="flex items-center gap-2 px-3 py-3 text-sm text-gray-500 dark:text-gray-400">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-b-malawiGreen" />
                  Searching activities...
                </div>
              ) : suggestions.length > 0 ? (
                <ul className="max-h-64 overflow-y-auto py-1">
                  {suggestions.map((suggestion) => (
                    <li key={`${suggestion.type}-${suggestion.value}`}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none dark:text-gray-200 dark:hover:bg-slate-700 dark:focus:bg-slate-700"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectSuggestion(suggestion)}
                      >
                        <span className="truncate">
                          <HighlightMatch text={suggestion.label} query={searchTerm} />
                        </span>
                        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-slate-700 dark:text-gray-300">
                          {suggestion.type}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400">No matching activities found.</div>
              )}
            </div>
          )}
        </div>
        <Select
          label="Category"
          value={local.category_id || ''}
          onChange={(e) => {
            setSelectedSuggestionFilters(null);
            setLocal((p) => ({ ...p, category_id: e.target.value ? Number(e.target.value) : undefined }));
          }}
          options={categoryOptions}
        />
        <Select
          label="Status"
          value={local.is_active ?? ''}
          onChange={(e) => {
            setSelectedSuggestionFilters(null);
            setLocal((p) => ({ ...p, is_active: e.target.value === '' ? undefined : e.target.value }));
          }}
          options={[
            { value: 'true', label: 'Active' },
            { value: 'false', label: 'Inactive' },
          ]}
        />
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={reset}>Reset</Button>
        <Button onClick={apply}>Apply</Button>
      </div>
    </Card>
  );
}
