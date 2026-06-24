import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/useAuth';
import { validatePassword, getErrorMessage, getFieldErrors, getRoleDisplayName } from '../../../utils/helpers';
import apiService from '../../../services/apiService';
import { useToast } from '../../../contexts/useToast';
import {
  MdPerson,
  MdEmail,
  MdShield,
  MdCalendarToday,
  MdEdit,
  MdLock,
  MdCheckCircle,
  MdError,
  MdVisibility,
  MdVisibilityOff,
  MdSave,
  MdKey,
} from 'react-icons/md';

export const ProfilePage = () => {
  const { user, updateProfile } = useAuth();
  const toast = useToast();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({ name: user.name || '', email: user.email || '' });
    }
  }, [user]);

  // Clear messages when switching tabs
  useEffect(() => {
    setError('');
    setSuccess('');
    setFieldErrors({});
  }, [activeTab]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setFieldErrors({});
    setLoading(true);

    const result = await updateProfile(formData);

    if (result.success) {
      setSuccess('Profile updated successfully');
      setFormData({ name: result.user.name, email: result.user.email });
    } else {
      setError(result.error);
      if (result.apiError) toast.fromError(result.apiError);
    }

    setLoading(false);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setFieldErrors({});

    const passwordErrors = validatePassword(passwordData.password);
    if (passwordErrors.length > 0) {
      setError(passwordErrors.join('\n'));
      return;
    }

    if (passwordData.password !== passwordData.password_confirmation) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await apiService.changePassword(
        passwordData.current_password,
        passwordData.password,
        passwordData.password_confirmation
      );
      setSuccess('Password changed successfully');
      setPasswordData({ current_password: '', password: '', password_confirmation: '' });
    } catch (err) {
      if (err.status === 422) setFieldErrors(getFieldErrors(err));
      setError(getErrorMessage(err));
      toast.fromError(err);
    } finally {
      setLoading(false);
    }
  };

  // Derive avatar initials
  const initials = (user?.name || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—';

  return (
    <div className="min-h-screen py-8 px-4 sm:px-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* ── Hero / Avatar Card ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-200">
          {/* Banner + avatar overlap wrapper */}
          <div className="relative">
            {/* Banner strip */}
            <div className="h-28 rounded-t-2xl bg-gradient-to-r from-malawiGreen via-green-700 to-malawiGreen relative overflow-hidden">
              <div className="absolute inset-0 opacity-10"
                style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '12px 12px' }}
              />
            </div>

            {/* Avatar — anchored to banner bottom edge */}
            <div className="absolute left-8 bottom-0 translate-y-1/2 z-10">
              <div className="w-20 h-20 rounded-2xl bg-malawiBlack border-4 border-white shadow-lg flex items-center justify-center">
                <span className="text-2xl font-extrabold text-malawiGold tracking-wide">{initials}</span>
              </div>
            </div>
          </div>

          {/* Name row — padded to clear the avatar */}
          <div className="px-8 pt-14 pb-4">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{user?.name || '—'}</h1>
            <p className="text-sm text-gray-500 truncate">{user?.email}</p>
          </div>

          {/* Info pills row */}
          <div className="px-8 pb-6 flex flex-wrap gap-3">
            <InfoPill icon={<MdShield />} label={getRoleDisplayName(user)} color="green" />
            <InfoPill icon={<MdEmail />} label={user?.email || '—'} color="gray" />
            <InfoPill icon={<MdCalendarToday />} label={`Member since ${memberSince}`} color="gray" />
          </div>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────── */}
        <div className="flex gap-1 bg-white rounded-xl shadow-sm border border-gray-200 p-1">
          <TabButton
            active={activeTab === 'profile'}
            onClick={() => setActiveTab('profile')}
            icon={<MdEdit />}
            label="Profile Information"
          />
          <TabButton
            active={activeTab === 'password'}
            onClick={() => setActiveTab('password')}
            icon={<MdLock />}
            label="Change Password"
          />
        </div>

        {/* ── Alert Banner ───────────────────────────────────────── */}
        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 shadow-sm">
            <MdError className="text-xl mt-0.5 shrink-0 text-red-500" />
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{error}</p>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 rounded-xl px-5 py-4 shadow-sm">
            <MdCheckCircle className="text-xl shrink-0 text-green-500" />
            <p className="text-sm font-medium">{success}</p>
          </div>
        )}

        {/* ── Profile Tab ────────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8">
            <SectionHeader icon={<MdPerson />} title="Personal Details" />

            <form onSubmit={handleProfileSubmit} className="mt-6 space-y-5">
              <FormField
                label="Full Name"
                icon={<MdPerson />}
                id="profile-name"
              >
                <input
                  id="profile-name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleProfileChange}
                  placeholder="Enter your full name"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900
                    focus:outline-none focus:ring-2 focus:ring-malawiGreen focus:border-malawiGreen
                    transition placeholder-gray-400"
                />
              </FormField>

              <FormField
                label="Email Address"
                icon={<MdEmail />}
                id="profile-email"
                error={fieldErrors.email}
              >
                <input
                  id="profile-email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleProfileChange}
                  placeholder="Enter your email"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900
                    focus:outline-none focus:ring-2 focus:ring-malawiGreen focus:border-malawiGreen
                    transition placeholder-gray-400"
                />
              </FormField>

              <div className="pt-2">
                <SubmitButton loading={loading} label="Save Changes" loadingLabel="Saving…" icon={<MdSave />} />
              </div>
            </form>
          </div>
        )}

        {/* ── Password Tab ───────────────────────────────────────── */}
        {activeTab === 'password' && (
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8">
            <SectionHeader icon={<MdKey />} title="Change Password" />
            <p className="mt-1 text-xs text-gray-500">
              Password must be at least 8 characters and include uppercase, a number, and a special character.
            </p>

            <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-5">
              <PasswordField
                id="current-password"
                label="Current Password"
                name="current_password"
                value={passwordData.current_password}
                onChange={handlePasswordChange}
                show={showCurrentPw}
                onToggle={() => setShowCurrentPw((v) => !v)}
                error={fieldErrors.current_password}
                required
              />

              <PasswordField
                id="new-password"
                label="New Password"
                name="password"
                value={passwordData.password}
                onChange={handlePasswordChange}
                show={showNewPw}
                onToggle={() => setShowNewPw((v) => !v)}
                error={fieldErrors.password}
                required
              />

              <PasswordField
                id="confirm-password"
                label="Confirm Password"
                name="password_confirmation"
                value={passwordData.password_confirmation}
                onChange={handlePasswordChange}
                show={showConfirmPw}
                onToggle={() => setShowConfirmPw((v) => !v)}
                required
              />

              <div className="pt-2">
                <SubmitButton loading={loading} label="Change Password" loadingLabel="Updating…" icon={<MdLock />} />
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Sub-components ──────────────────────────────────────────────────── */

const InfoPill = ({ icon, label, color }) => {
  const colors = {
    green: 'bg-green-50 text-malawiGreen border-green-200',
    gray:  'bg-gray-50  text-gray-600  border-gray-200',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${colors[color] || colors.gray}`}>
      <span className="text-sm">{icon}</span>
      {label}
    </span>
  );
};

const TabButton = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200
      ${active
        ? 'bg-malawiGreen text-white shadow-sm'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
      }`}
  >
    <span className="text-base">{icon}</span>
    {label}
  </button>
);

const SectionHeader = ({ icon, title }) => (
  <div className="flex items-center gap-2.5">
    <span className="text-xl text-malawiGreen">{icon}</span>
    <h2 className="text-base font-bold text-gray-800">{title}</h2>
  </div>
);

const FormField = ({ label, icon, id, error, children }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-semibold text-gray-700 mb-1.5">
      {label}
    </label>
    <div className="relative flex items-center">
      <span className="absolute left-3 text-gray-400 text-lg pointer-events-none">{icon}</span>
      {children}
    </div>
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);

const PasswordField = ({ id, label, name, value, onChange, show, onToggle, error, required }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-semibold text-gray-700 mb-1.5">
      {label}
    </label>
    <div className="relative flex items-center">
      <span className="absolute left-3 text-gray-400 text-lg pointer-events-none">
        <MdLock />
      </span>
      <input
        id={id}
        type={show ? 'text' : 'password'}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={`Enter ${label.toLowerCase()}`}
        className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900
          focus:outline-none focus:ring-2 focus:ring-malawiGreen focus:border-malawiGreen
          transition placeholder-gray-400"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 text-gray-400 hover:text-gray-600 transition"
        tabIndex={-1}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <MdVisibilityOff className="text-lg" /> : <MdVisibility className="text-lg" />}
      </button>
    </div>
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);

const SubmitButton = ({ loading, label, loadingLabel, icon }) => (
  <button
    type="submit"
    disabled={loading}
    className="inline-flex items-center gap-2 bg-malawiGreen hover:bg-green-800 disabled:bg-gray-300
      disabled:cursor-not-allowed text-white font-bold py-2.5 px-6 rounded-lg shadow
      transition-all duration-200 text-sm"
  >
    {loading ? (
      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
    ) : (
      <span className="text-base">{icon}</span>
    )}
    {loading ? loadingLabel : label}
  </button>
);

export default ProfilePage;
