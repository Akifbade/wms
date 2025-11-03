import React, { useState, useEffect } from 'react';
import {
  LockClosedIcon,
  EnvelopeIcon,
  EyeIcon,
  EyeSlashIcon,
  QrCodeIcon,
  CubeIcon,
  ChartBarIcon,
  UserGroupIcon,
  TruckIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { authAPI } from '../../services/api';

interface Branding {
  logo?: string;
  name?: string;
  primaryColor?: string;
  secondaryColor?: string;
  showCompanyName?: boolean;
  logoSize?: string;
  loginVideoUrl?: string;
  loginVideoEnabled?: boolean;
  loginGlassEffect?: boolean;
  loginBackgroundType?: string;
  loginBackgroundImage?: string;
  loginShowFeatures?: boolean;
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
    logoSize: 'medium',
    loginVideoUrl: 'https://cdn.pixabay.com/video/2024/03/08/203404-921381913_large.mp4',
    loginVideoEnabled: true,
    loginGlassEffect: true,
    loginBackgroundType: 'video',
    loginBackgroundImage: undefined,
    loginShowFeatures: true,
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
            loginVideoUrl: data.branding.loginVideoUrl || 'https://cdn.pixabay.com/video/2024/03/08/203404-921381913_large.mp4',
            loginVideoEnabled: data.branding.loginVideoEnabled !== false,
            loginGlassEffect: data.branding.loginGlassEffect !== false,
            loginBackgroundType: data.branding.loginBackgroundType || 'video',
            loginBackgroundImage: data.branding.loginBackgroundImage,
            loginShowFeatures: data.branding.loginShowFeatures !== false,
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

  const features = [
    {
      icon: QrCodeIcon,
      title: 'QR Code Scanning',
      description: 'Fast shipment & rack scanning with mobile support'
    },
    {
      icon: CubeIcon,
      title: 'Smart Inventory',
      description: 'Real-time tracking of shipments, boxes & pallets'
    },
    {
      icon: ChartBarIcon,
      title: 'Live Dashboard',
      description: 'Visual analytics and performance metrics'
    },
    {
      icon: UserGroupIcon,
      title: 'Multi-Role Access',
      description: 'Admin, Manager & Worker role management'
    },
    {
      icon: TruckIcon,
      title: 'Warehouse Operations',
      description: 'Complete shipment intake & rack assignment'
    },
    {
      icon: DocumentTextIcon,
      title: 'Billing System',
      description: 'Automated invoicing & payment tracking'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 relative">
      {/* Background Video (if enabled) */}
      {branding.loginVideoEnabled && branding.loginBackgroundType === 'video' && branding.loginVideoUrl && (
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={branding.loginVideoUrl} type="video/mp4" />
        </video>
      )}

      {/* Background Image (if selected) */}
      {branding.loginBackgroundType === 'image' && branding.loginBackgroundImage && (
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center"
          style={{ backgroundImage: `url(${branding.loginBackgroundImage})` }}
        />
      )}

      {/* Overlay with optional blur effect */}
      <div className={`absolute inset-0 bg-blue-900/40 ${branding.loginGlassEffect ? 'backdrop-blur-sm' : ''}`} />

      <div className="min-h-screen flex relative z-10">
        {/* Left Side - Features Showcase (if enabled) */}
        {branding.loginShowFeatures && (
          <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 p-12 relative overflow-hidden">
            {/* Glass Effect Background */}
            <div className={`absolute inset-0 ${branding.loginGlassEffect ? 'bg-white/5 backdrop-blur-md' : 'bg-white/10'}`} />

            {/* Subtle Pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0" style={{
                backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                backgroundSize: '40px 40px'
              }} />
            </div>

            <div className="relative z-10 flex flex-col justify-between w-full">
              {/* Header */}
              <div>
                {branding.logo ? (
                  <div className="flex items-center gap-3 mb-12">
                    <img
                      src={branding.logo}
                      alt="Logo"
                      className="h-12 w-auto"
                    />
                    {branding.showCompanyName && branding.name && (
                      <h1 className="text-2xl font-bold text-white">{branding.name}</h1>
                    )}
                  </div>
                ) : (
                  <div className="mb-12">
                    <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                      <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center">
                        <CubeIcon className="h-6 w-6 text-blue-600" />
                      </div>
                      <span className="text-2xl font-bold text-white">
                        {branding.showCompanyName && branding.name ? branding.name : 'Warehouse WMS'}
                      </span>
                    </div>
                  </div>
                )}

                <h2 className="text-4xl font-bold text-white mb-4">
                  Complete Warehouse Management System
                </h2>
                <p className="text-xl text-blue-100 mb-12">
                  Streamline your warehouse operations with modern technology
                </p>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-2 gap-6 mb-12">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border-2 border-white/30 hover:bg-white/20 hover:border-white/40 transition-all duration-300 group shadow-xl hover:shadow-2xl hover:scale-105"
                  >
                    <div className="bg-white/20 backdrop-blur-sm w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:bg-white/30 transition-all">
                      <feature.icon className="h-7 w-7 text-white group-hover:scale-110 transition-transform" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                    <p className="text-sm text-blue-100 leading-relaxed">{feature.description}</p>
                  </div>
                ))}
              </div>

              {/* Footer Stats */}
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 shadow-lg hover:bg-white/15 transition-all">
                  <div className="text-3xl font-bold text-white mb-1">100%</div>
                  <div className="text-sm text-blue-100">Mobile Ready</div>
                </div>
                <div className="text-center bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 shadow-lg hover:bg-white/15 transition-all">
                  <div className="text-3xl font-bold text-white mb-1">24/7</div>
                  <div className="text-sm text-blue-100">Real-time Sync</div>
                </div>
                <div className="text-center bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 shadow-lg hover:bg-white/15 transition-all">
                  <div className="text-3xl font-bold text-white mb-1">Fast</div>
                  <div className="text-sm text-blue-100">QR Scanning</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Right Side - Login Form */}
        <div className={`w-full ${branding.loginShowFeatures ? 'lg:w-1/2 xl:w-2/5' : 'max-w-md mx-auto'} flex items-center justify-center p-8 sm:p-12 relative`}>
          {/* Glass Background for Login Area */}
          <div className="absolute inset-0 bg-white/10 backdrop-blur-xl lg:bg-white/70 lg:backdrop-blur-sm" />

          <div className="w-full max-w-md relative z-10">
            {/* Company Logo - Always Visible Above Login */}
            <div className="mb-8 text-center">
              {branding.logo ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-2xl border-2 border-white/50">
                    <img
                      src={branding.logo}
                      alt="Logo"
                      className="h-20 w-auto"
                    />
                  </div>
                  {branding.showCompanyName && branding.name && (
                    <h1 className="text-2xl font-bold text-white lg:text-gray-900 drop-shadow-lg">{branding.name}</h1>
                  )}
                </div>
              ) : (
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl border-2 border-white/50">
                  <div className="h-12 w-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                    <CubeIcon className="h-8 w-8 text-white" />
                  </div>
                  <span className="text-2xl font-bold text-gray-900">
                    {branding.showCompanyName && branding.name ? branding.name : 'Warehouse WMS'}
                  </span>
                </div>
              )}
            </div>

            {/* Welcome Text */}
            <div className="mb-8 text-center">
              <h3 className="text-3xl font-bold text-white lg:text-gray-900 mb-2 drop-shadow-lg">Welcome Back</h3>
              <p className="text-blue-100 lg:text-gray-600 drop-shadow">Sign in to access your warehouse dashboard</p>
            </div>

            {/* Login Form - Glass Effect */}
            <form onSubmit={handleLogin} className="space-y-6 bg-white/95 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-white/50">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="admin@demo.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <LockClosedIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Remember me</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    Sign In
                    <ArrowRightIcon className="ml-2 h-5 w-5" />
                  </span>
                )}
              </button>
            </form>

            {/* Demo Credentials - Glass Effect */}
            <div className="mt-8 bg-gradient-to-br from-blue-50/95 to-white/95 backdrop-blur-xl rounded-2xl p-6 border-2 border-white/50 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircleIcon className="h-5 w-5 text-blue-600" />
                <p className="font-semibold text-blue-900">Demo Credentials</p>
              </div>

              <div className="space-y-3">
                <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-blue-200/50 shadow-lg hover:shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">Admin Account</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail('admin@demo.com');
                        setPassword('demo123');
                      }}
                      className="text-xs px-4 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg"
                    >
                      Auto-fill
                    </button>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p><span className="font-medium">Email:</span> admin@demo.com</p>
                    <p><span className="font-medium">Password:</span> demo123</p>
                  </div>
                </div>

                <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-blue-200/50 shadow-lg hover:shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">Manager Account</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail('manager@demo.com');
                        setPassword('demo123');
                      }}
                      className="text-xs px-4 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg"
                    >
                      Auto-fill
                    </button>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p><span className="font-medium">Email:</span> manager@demo.com</p>
                    <p><span className="font-medium">Password:</span> demo123</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
