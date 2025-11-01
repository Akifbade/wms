import React, { useState, useEffect } from 'react';
import { LockClosedIcon, EnvelopeIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { authAPI } from '../../services/api';

interface Branding {
  logo?: string;
  name?: string;
  primaryColor?: string;
  secondaryColor?: string;
  showCompanyName?: boolean;
  logoSize?: string;
}

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [branding, setBranding] = useState<Branding>({
    primaryColor: '#4F46E5',
    secondaryColor: '#7C3AED',
    showCompanyName: true,
    logoSize: 'medium'
  });

  // Load branding settings (public endpoint, no auth required)
  useEffect(() => {
    const loadBranding = async () => {
      try {
        const response = await fetch('/api/company/branding');
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Loaded branding:', data.branding);
          setBranding({
            name: data.branding.name,
            logo: data.branding.logoUrl || data.branding.logo,
            primaryColor: data.branding.primaryColor,
            secondaryColor: data.branding.secondaryColor,
            showCompanyName: data.branding.showCompanyName,
            logoSize: data.branding.logoSize || 'medium',
          });
        } else {
          console.log('⚠️ Failed to load branding, using defaults');
        }
      } catch (error) {
        console.log('⚠️ Error loading branding, using defaults:', error);
      }
    };
    loadBranding();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.login(email, password);
      console.log('✅ Login successful:', response.user);
      console.log('✅ Token saved:', response.token ? 'Yes' : 'No');
      console.log('✅ User saved:', localStorage.getItem('user') ? 'Yes' : 'No');
      console.log('✅ Auth token:', localStorage.getItem('authToken') ? 'Yes' : 'No');
      
      // Small delay to ensure localStorage is saved
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('🔄 Navigating to dashboard...');
      // Force navigation using window.location for reliability
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
      console.error('❌ Login error:', err);
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-500"
      style={{
        background: `linear-gradient(135deg, ${branding.primaryColor}15 0%, ${branding.secondaryColor}15 100%)`
      }}
    >
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-0 -left-4 w-72 h-72 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"
          style={{ backgroundColor: `${branding.primaryColor}30` }}
        />
        <div 
          className="absolute top-0 -right-4 w-72 h-72 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"
          style={{ backgroundColor: `${branding.secondaryColor}30` }}
        />
        <div 
          className="absolute -bottom-8 left-20 w-72 h-72 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"
          style={{ backgroundColor: `${branding.primaryColor}20` }}
        />
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Logo and Title */}
        <div className="text-center animate-fade-in-down">
          {branding.logo ? (
            <div className={`mx-auto mb-4 flex items-center justify-center ${
              branding.logoSize === 'small' ? 'h-12' : 
              branding.logoSize === 'large' ? 'h-32' : 
              'h-20'
            }`}>
              <img 
                src={branding.logo} 
                alt="Company Logo" 
                className={`object-contain ${
                  branding.logoSize === 'small' ? 'max-h-12' : 
                  branding.logoSize === 'large' ? 'max-h-32' : 
                  'max-h-20'
                }`}
              />
            </div>
          ) : (
            <div 
              className="mx-auto h-16 w-16 rounded-xl flex items-center justify-center mb-4 shadow-lg transition-all duration-300"
              style={{
                background: `linear-gradient(135deg, ${branding.primaryColor} 0%, ${branding.secondaryColor} 100%)`
              }}
            >
              <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          )}
          <h2 className="text-3xl font-extrabold text-gray-900">
            {branding.showCompanyName && branding.name ? branding.name : 'Warehouse Management'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to access your account
          </p>
        </div>

        {/* Login Form */}
        <form 
          className="mt-8 space-y-6 bg-white/80 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-white/20 animate-fade-in-up" 
          onSubmit={handleLogin}
        >
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg animate-shake">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="admin@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <a href="#" className="font-medium text-primary-600 hover:text-primary-500">
                Forgot password?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: loading 
                  ? `linear-gradient(135deg, ${branding.primaryColor} 0%, ${branding.secondaryColor} 100%)`
                  : `linear-gradient(135deg, ${branding.primaryColor} 0%, ${branding.secondaryColor} 100%)`,
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <a href="#" className="font-medium text-primary-600 hover:text-primary-500">
                Contact your administrator
              </a>
            </p>
          </div>
        </form>

        {/* Demo Credentials */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-blue-900">🎯 Demo Login Credentials</p>
          </div>
          
          <div className="space-y-2">
            {/* Admin Account */}
            <div className="bg-white rounded-md p-3 border border-blue-100">
              <p className="text-xs font-semibold text-blue-800 mb-1">👑 Admin Account</p>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-700"><span className="font-medium">Email:</span> admin@demo.com</p>
                  <p className="text-xs text-gray-700"><span className="font-medium">Password:</span> demo123</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('admin@demo.com');
                    setPassword('demo123');
                  }}
                  className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Use
                </button>
              </div>
            </div>

            {/* Manager Account */}
            <div className="bg-white rounded-md p-3 border border-blue-100">
              <p className="text-xs font-semibold text-blue-800 mb-1">👔 Manager Account</p>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-700"><span className="font-medium">Email:</span> manager@demo.com</p>
                  <p className="text-xs text-gray-700"><span className="font-medium">Password:</span> demo123</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('manager@demo.com');
                    setPassword('demo123');
                  }}
                  className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Use
                </button>
              </div>
            </div>
          </div>
          
          <p className="text-xs text-blue-600 italic text-center">Click "Use" to auto-fill credentials</p>
        </div>
      </div>
    </div>
  );
};
