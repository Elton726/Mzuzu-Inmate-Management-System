import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/useAuth';
import { useToast } from '../../../contexts/useToast';
import { getRoleName } from '../../../utils/helpers';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    
    if (result.success) {
      // Redirect admins to dashboard, others to home
      const redirectPath = getRoleName(result.user) === 'admin' ? '/admin/dashboard' : '/';
      navigate(redirectPath);
    } else {
      setError(result.error);
      if (result.apiError) toast.fromError(result.apiError);
      const retryAfter = result?.rateLimit?.retryAfter;
      if (result?.status === 429 && typeof retryAfter === 'number' && retryAfter > 0) {
        setCooldown(retryAfter);
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center p-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-yellow-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      </div>

      {/* Main login container */}
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header section with accent bar */}
          <div className="bg-white px-8 py-6">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-malawiBlack mb-1">
                MIMS
              </h1>
              <p className="text-gray-600 text-sm font-semibold tracking-wide">
                Malawi Inmate Management System
              </p>
            </div>
          </div>

          {/* Form section */}
          <div className="p-8">
            {error && (
              <div className="bg-malawiRed/10 border-l-4 border-malawiRed p-4 mb-6 rounded-r">
                <p className="text-malawiRed font-semibold text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-malawiBlack font-semibold mb-3 text-sm">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-malawiBlack focus:border-transparent hover:border-gray-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-malawiBlack font-semibold mb-3 text-sm">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-malawiBlack focus:border-transparent hover:border-gray-400 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading || cooldown > 0}
                className="w-full bg-malawiBlack hover:bg-gray-800 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition duration-200 text-base mt-6"
              >
                {loading ? 'Signing in...' : cooldown > 0 ? `Try again in ${cooldown}s` : 'Sign In'}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-center text-gray-500 text-xs">
                © 2026 Malawi Prison Service. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
