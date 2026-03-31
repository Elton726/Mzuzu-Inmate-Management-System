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
    <div className="min-h-screen bg-gradient-to-br from-malawiBlack to-malawiRed flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-malawiBlack mb-2">
              MIMS System
            </h1>
            <p className="text-malawiGold font-semibold">Malawi Prison Service</p>
          </div>

          {error && (
            <div className="bg-malawiRed/10 border-l-4 border-malawiRed p-4 mb-6">
              <p className="text-malawiRed font-semibold">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-malawiBlack font-semibold mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-4 py-2 border-2 border-malawiGold rounded-lg focus:outline-none focus:ring-2 focus:ring-malawiRed focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-malawiBlack font-semibold mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-2 border-2 border-malawiGold rounded-lg focus:outline-none focus:ring-2 focus:ring-malawiRed focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={loading || cooldown > 0}
              className="w-full bg-malawiRed hover:bg-malawiGreen disabled:bg-gray-400 text-malawiGold font-bold py-2 px-4 rounded-lg transition duration-200"
            >
              {loading ? 'Logging in...' : cooldown > 0 ? `Try again in ${cooldown}s` : 'Login'}
            </button>
          </form>

          <div className="mt-4 text-center text-malawiBlack text-sm">
            <p>Demo Credentials:</p>
            <p className="font-mono text-xs mt-2 text-malawiRed font-semibold">admin@example.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
