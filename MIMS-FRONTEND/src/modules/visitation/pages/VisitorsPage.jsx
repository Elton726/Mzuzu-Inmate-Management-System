import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { fetchVisitors, fetchApprovedVisitors, registerVisitor, approveVisitor, updateVisitor, deleteVisitor, fetchVisitorById, setPagination } from '../store/visitorSlice';
import { useDebouncedValue } from '../../../utils/useDebouncedValue';
import VisitationTabs from '../components/VisitationTabs';
import VisitorFormModal from '../components/VisitorFormModal';
import VisitorDetailsModal from '../components/VisitorDetailsModal';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Select from '../../../components/common/Select';
import Modal from '../../../components/common/Modal';

const approvalOptions = [
  { value: '', label: 'All statuses' },
  { value: 'true', label: 'Approved' },
  { value: 'false', label: 'Pending approval' }
];

const pageSizeOptions = [10, 25, 50];

const isVisitorApproved = (visitor) => Boolean(visitor?.is_approved ?? visitor?.approved);

export default function VisitorsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [confirmApproveId, setConfirmApproveId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [pageSize, setPageSizeLocal] = useState(10);

  const dispatch = useDispatch();
  const debouncedSearch = useDebouncedValue(search, 300);
  const { visitors, loading, error, pagination, currentVisitor } = useSelector((state) => state.visitor);

  useEffect(() => {
    dispatch(fetchVisitors({ search: debouncedSearch, is_approved: status === '' ? undefined : status, page: pagination.page, per_page: pageSize }));
  }, [dispatch, debouncedSearch, status, pagination.page, pageSize]);

  useEffect(() => {
    dispatch(fetchApprovedVisitors());
  }, [dispatch]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const visitorRows = useMemo(() => visitors || [], [visitors]);

  const handleSaveVisitor = async (payload) => {
    try {
      if (selectedVisitor) {
        await dispatch(updateVisitor({ id: selectedVisitor.id, payload })).unwrap();
        toast.success('Visitor updated successfully');
      } else {
        await dispatch(registerVisitor(payload)).unwrap();
        toast.success('Visitor registered successfully');
      }
      setShowRegisterModal(false);
      setSelectedVisitor(null);
      dispatch(fetchVisitors({ search: debouncedSearch, is_approved: status === '' ? undefined : status, page: pagination.page, per_page: pageSize }));
    } catch (err) {
      toast.error(err.message || 'Unable to save visitor');
    }
  };

  const handleApprove = async () => {
    if (!confirmApproveId) return;
    try {
      await dispatch(approveVisitor(confirmApproveId)).unwrap();
      toast.success('Visitor approved');
      setConfirmApproveId(null);
      dispatch(fetchVisitors({ search: debouncedSearch, is_approved: status === '' ? undefined : status, page: pagination.page, per_page: pageSize }));
    } catch (err) {
      toast.error(err.message || 'Approval failed');
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await dispatch(deleteVisitor(confirmDeleteId)).unwrap();
      toast.success('Visitor deleted');
      setConfirmDeleteId(null);
      dispatch(fetchVisitors({ search: debouncedSearch, is_approved: status === '' ? undefined : status, page: pagination.page, per_page: pageSize }));
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    }
  };

  const openEditVisitor = (visitor) => {
    setSelectedVisitor(visitor);
    setShowRegisterModal(true);
  };

  const openDetails = async (visitor) => {
    try {
      await dispatch(fetchVisitorById(visitor.id)).unwrap();
      setShowDetails(true);
    } catch (err) {
      toast.error(err.message || 'Unable to load visitor details');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <VisitationTabs />
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-malawiBlack dark:text-white">Visitor management</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">Register visitors, approve pending requests, and maintain visitor profiles.</p>
        </div>
        <Button onClick={() => { setSelectedVisitor(null); setShowRegisterModal(true); }}>
          Register new visitor
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-3">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} label="Search" placeholder="Name or national ID" />
            <Select label="Approval status" value={status} onChange={(e) => setStatus(e.target.value)} options={approvalOptions} />
            <Select label="Rows per page" value={String(pageSize)} onChange={(e) => setPageSizeLocal(Number(e.target.value))} options={pageSizeOptions.map((size) => ({ value: String(size), label: String(size) }))} />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
          <thead className="bg-gray-50 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Relationship</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Contact</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {!loading && visitorRows.length === 0 && (
              <tr>
                <td colSpan="5" className="px-4 py-6 text-center text-gray-500 dark:text-gray-300">No visitors found.</td>
              </tr>
            )}
            {loading ? (
              <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">Loading visitors...</td></tr>
            ) : visitorRows.map((visitor) => (
              <tr key={visitor.id} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{visitor.first_name} {visitor.last_name}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{visitor.relationship?.replace('_', ' ')}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{visitor.contact_number}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${isVisitorApproved(visitor) ? 'bg-malawiGreen text-white' : 'bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-gray-200'}`}>
                    {isVisitorApproved(visitor) ? 'Approved' : 'Pending'}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <button onClick={() => openDetails(visitor)} className="text-malawiGreen hover:underline">View</button>
                  {!isVisitorApproved(visitor) && (
                    <button onClick={() => setConfirmApproveId(visitor.id)} className="text-malawiGold hover:underline">Approve</button>
                  )}
                  <button onClick={() => openEditVisitor(visitor)} className="text-blue-600 hover:underline">Edit</button>
                  <button onClick={() => setConfirmDeleteId(visitor.id)} className="text-malawiRed hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between text-sm text-gray-600 dark:text-gray-300">
        <span>Showing {visitorRows.length} visitors.</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => dispatch(setPagination({ page: Math.max(pagination.page - 1, 1) }))} disabled={pagination.page <= 1}>Previous</Button>
          <span>Page {pagination.page}</span>
          <Button variant="outline" onClick={() => dispatch(setPagination({ page: pagination.page + 1 }))} disabled={visitorRows.length < pageSize}>Next</Button>
        </div>
      </div>

      <VisitorFormModal open={showRegisterModal} onClose={() => setShowRegisterModal(false)} onSave={handleSaveVisitor} initialData={selectedVisitor} />
      <VisitorDetailsModal open={showDetails} onClose={() => setShowDetails(false)} visitor={currentVisitor} />

      {confirmApproveId && (
        <Modal title="Approve visitor" onClose={() => setConfirmApproveId(null)}>
          <div className="space-y-4">
            <p>Approve this visitor and allow them to register for inmate visits?</p>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setConfirmApproveId(null)}>Cancel</Button>
              <Button type="button" onClick={handleApprove}>Approve</Button>
            </div>
          </div>
        </Modal>
      )}

      {confirmDeleteId && (
        <Modal title="Delete visitor" onClose={() => setConfirmDeleteId(null)}>
          <div className="space-y-4">
            <p>Deleting a visitor is permanent. Are you sure?</p>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
              <Button type="button" variant="danger" onClick={handleDelete}>Delete</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
