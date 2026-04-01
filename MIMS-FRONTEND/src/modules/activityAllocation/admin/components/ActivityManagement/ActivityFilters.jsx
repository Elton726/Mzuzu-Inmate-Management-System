import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCategories } from '../../store/activitySlice';
import Card from '../../../../../components/common/Card';
import Input from '../../../../../components/common/Input';
import Select from '../../../../../components/common/Select';
import Button from '../../../../../components/common/Button';

export default function ActivityFilters({ filters, onFilterChange }) {
  const dispatch = useDispatch();
  const { categories } = useSelector((s) => s.activity);
  const [local, setLocal] = useState(filters || {});

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  useEffect(() => {
    setLocal(filters || {});
  }, [filters]);

  const categoryOptions = useMemo(
    () => (categories || []).map((c) => ({ value: c.id, label: c.name })),
    [categories]
  );

  const apply = () => onFilterChange({ ...local });
  const reset = () => onFilterChange({});

  return (
    <Card className="mb-6" title="Filters">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          label="Search"
          placeholder="Search by name…"
          value={local.search || ''}
          onChange={(e) => setLocal((p) => ({ ...p, search: e.target.value || undefined }))}
        />
        <Select
          label="Category"
          value={local.category_id || ''}
          onChange={(e) => setLocal((p) => ({ ...p, category_id: e.target.value ? Number(e.target.value) : undefined }))}
          options={categoryOptions}
        />
        <Select
          label="Status"
          value={local.is_active ?? ''}
          onChange={(e) => setLocal((p) => ({ ...p, is_active: e.target.value === '' ? undefined : e.target.value }))}
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
