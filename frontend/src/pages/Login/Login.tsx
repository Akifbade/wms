import React, { useState, useEffect } from 'react';
import {
  LockClosedIcon,
  EnvelopeIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { authAPI } from '../../services/api';

// Default branding
const DEFAULT_BRANDING = {
  name: 'Warehouse WMS',
  logo: null,
  primaryColor: '#2563eb', // Blue-600
  secondaryColor: '#4f46e5', // Indigo-600
  accentColor: '#10b981', // Emerald-500
  showCompanyName: true,
  // Fallback image if no custom background is set
  loginBackgroundImage: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'
};

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [branding, setBranding] = useState<any>(DEFAULT_BRANDING);

  useEffect(() => {
    const loadBranding = async () => {
      try {
        const response = await fetch('/api/company/branding');
        if (response.ok) {
          const data = await response.json();
          // Merge with defaults, ensuring we have a background image
          setBranding({
            ...DEFAULT_BRANDING,
            ...data.branding,
            loginBackgroundImage: data.branding.loginBackgroundImage || DEFAULT_BRANDING.loginBackgroundImage
          });
        }
      } catch (err) {
        console.error('Failed to load branding:', err);
      }
    };
    loadBranding();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authAPI.login(email, password);
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen w-full flex bg-white'>
      {/* LEFT SIDE - IMAGE & BRANDING (Hidden on mobile) */}
      <div className='hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden'>
        <div
          className='absolute inset-0 bg-cover bg-center transition-transform duration-10000 hover:scale-105'
          style={{ backgroundImage: `url(${branding.loginBackgroundImage})` }}
        />
        <div className='absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-slate-900/20' />

        <div className='relative z-10 w-full h-full flex flex-col justify-between p-12 text-white'>
          <div>
            {branding.logoUrl && (
              <img
                src={branding.logoUrl}
                alt='Logo'
                className='h-12 object-contain mb-6'
              />
            )}
          </div>

          <div className='max-w-lg'>
            <h1 className='text-4xl font-bold mb-4 leading-tight'>
              {branding.name}
            </h1>
            <p className='text-lg text-slate-300 leading-relaxed'>
              Streamline your warehouse operations with our advanced management system.
              Track inventory, manage shipments, and optimize workflows in real-time.
            </p>
          </div>

          <div className='text-sm text-slate-400'>
            &copy; {new Date().getFullYear()} {branding.name}. All rights reserved.
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - LOGIN FORM */}
      <div className='w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50'>
        <div className='w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100'>
          <div className='text-center mb-8'>
            <div className='inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600 mb-4'>
              <LockClosedIcon className='w-6 h-6' />
            </div>
            <h2 className='text-2xl font-bold text-gray-900'>Welcome Back</h2>
            <p className='text-gray-500 mt-2'>Please sign in to your account</p>
          </div>

          {error && (
            <div className='mb-6 p-4 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-2'>
              <span className='font-medium'>Error:</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className='space-y-5'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1.5'>Email Address</label>
              <div className='relative'>
                <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                  <EnvelopeIcon className='h-5 w-5 text-gray-400' />
                </div>
                <input
                  type='email'
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className='block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all'
                  placeholder='name@company.com'
                />
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1.5'>Password</label>
              <div className='relative'>
                <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                  <LockClosedIcon className='h-5 w-5 text-gray-400' />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className='block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all'
                  placeholder=''
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}
                  className='absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600'
                >
                  {showPassword ? <EyeSlashIcon className='h-5 w-5' /> : <EyeIcon className='h-5 w-5' />}
                </button>
              </div>
            </div>

            <div className='flex items-center justify-between text-sm'>
              <label className='flex items-center text-gray-600 cursor-pointer'>
                <input type='checkbox' className='mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500' />
                Remember me
              </label>
              <a href='#' className='text-blue-600 hover:text-blue-700 font-medium'>Forgot password?</a>
            </div>

            <button
              type='submit'
              disabled={loading}
              className='w-full flex items-center justify-center py-2.5 px-4 rounded-lg text-white font-medium bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20'
            >
              {loading ? (
                <div className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin' />
              ) : (
                <>
                  Sign In
                  <ArrowRightIcon className='ml-2 h-4 w-4' />
                </>
              )}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
};
