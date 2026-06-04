import React, { useState, useEffect } from 'react';
import {
  LockClosedIcon, EnvelopeIcon, EyeIcon, EyeSlashIcon, CubeIcon, TruckIcon,
  DocumentTextIcon, CheckCircleIcon, ArrowRightIcon, BuildingOffice2Icon,
  GlobeAltIcon, ShieldCheckIcon, CameraIcon, MapPinIcon, StarIcon, XMarkIcon, PhoneIcon
} from '@heroicons/react/24/outline';
import { authAPI } from '../../services/api';

interface Branding {
  logo?: string; name?: string; primaryColor?: string;
}

export const SwiftCargoLanding: React.FC = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [branding, setBranding] = useState<Branding>({ name: 'QGO Cargo' });
  const [heroTitle, setHeroTitle] = useState<string>('Efficient & Reliable Shipping And Logistics Company');
  const [heroSubtitle, setHeroSubtitle] = useState<string>('Seamless and dependable logistics solutions designed to keep your business moving forward.');
  const [galleryImages, setGalleryImages] = useState<string[]>([
    'https://images.unsplash.com/photo-1515169067865-5387ec356754?q=80&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1586521997393-f2f79fbe133d?q=80&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1544473244-fb1a6c4cbcf8?q=80&w=1600&auto=format&fit=crop'
  ]);
  const [services, setServices] = useState<Array<{ iconKey?: string; title: string; desc: string }>>([]);
  const [features, setFeatures] = useState<Array<{ iconKey?: string; title: string; desc: string }>>([]);
  const [partners, setPartners] = useState<Array<{ name?: string; logoUrl: string; link?: string }>>([]);

  useEffect(() => {
    const loadBranding = async () => {
      try {
        const response = await fetch('/api/company/branding');
        if (response.ok) {
          const data = await response.json();
          setBranding({ name: data.branding.name || 'QGO Cargo', logo: data.branding.logoUrl || data.branding.logo });
          if ((data.branding as any).loginHeroTitle) setHeroTitle((data.branding as any).loginHeroTitle);
          if ((data.branding as any).loginHeroSubtitle) setHeroSubtitle((data.branding as any).loginHeroSubtitle);
          const csv = (data.branding as any).loginGalleryCsv as string | undefined;
          if (csv && typeof csv === 'string') {
            const arr = csv.split(',').map(s => s.trim()).filter(Boolean);
            if (arr.length) setGalleryImages(arr);
          }
          if ((data.branding as any).loginServices) setServices((data.branding as any).loginServices);
          if ((data.branding as any).loginFeatures) setFeatures((data.branding as any).loginFeatures);
          if ((data.branding as any).loginPartners) setPartners((data.branding as any).loginPartners);
        }
      } catch (error) {
      }
    };
    loadBranding();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authAPI.login(email, password);
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
      setLoading(false);
    }
  };

  // settings-driven arrays (loaded in useEffect)

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              {branding.logo ? (
                <img src={branding.logo} alt="Logo" className="h-12 w-auto" />
              ) : (
                <div className="h-12 w-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <CubeIcon className="h-7 w-7 text-white" />
                </div>
              )}
              <span className="text-2xl font-bold text-gray-900">{branding.name}</span>
            </div>

            <button
              onClick={() => setShowLoginModal(true)}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2"
            >
              <LockClosedIcon className="h-5 w-5" />
              Customer Login
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 to-white">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full mb-6">
            <StarIcon className="h-5 w-5 text-blue-600" />
            <span className="text-blue-900 font-semibold text-sm">Kuwait's #1 Logistics Partner</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            {heroTitle}
          </h1>

          <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto">
            {heroSubtitle}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-8 py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <LockClosedIcon className="h-5 w-5" />
              Access Customer Portal
            </button>
            <a
              href="#services"
              className="px-8 py-4 bg-white text-blue-600 font-bold rounded-lg border-2 border-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
            >
              <ArrowRightIcon className="h-5 w-5" />
              Our Services
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="text-4xl font-bold text-blue-600 mb-2">10+</div>
              <div className="text-gray-600">Years Experience</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="text-4xl font-bold text-blue-600 mb-2">194K+</div>
              <div className="text-gray-600">Customers</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="text-4xl font-bold text-blue-600 mb-2">24/7</div>
              <div className="text-gray-600">Support</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="text-4xl font-bold text-blue-600 mb-2">99%</div>
              <div className="text-gray-600">On-Time Delivery</div>
            </div>
          </div>
        </div>
      </section>

      {/* Scrolling Image Gallery */}
      <section className="py-6 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto overflow-hidden">
          <div className="flex gap-4 animate-[scroll_30s_linear_infinite]">
            {galleryImages.concat(galleryImages).map((url, idx) => (
              <img key={idx} src={url} alt="Logistics" className="h-32 w-auto object-cover rounded-xl shadow-sm border border-gray-100" />
            ))}
          </div>
        </div>
        <style>{`
          @keyframes scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        `}</style>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-blue-600 font-semibold uppercase tracking-wider">Our Services</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-3 mb-4">Complete Logistics Solutions</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              From warehouse storage to international moving, we handle all your logistics needs
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all border border-gray-100 group">
                <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600 transition-all">
                  {(
                    service.iconKey === 'ShieldCheckIcon' ? <ShieldCheckIcon className="h-8 w-8 text-blue-600 group-hover:text-white transition-all" /> :
                      service.iconKey === 'GlobeAltIcon' ? <GlobeAltIcon className="h-8 w-8 text-blue-600 group-hover:text-white transition-all" /> :
                        service.iconKey === 'TruckIcon' ? <TruckIcon className="h-8 w-8 text-blue-600 group-hover:text-white transition-all" /> :
                          <BuildingOffice2Icon className="h-8 w-8 text-blue-600 group-hover:text-white transition-all" />
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{service.title}</h3>
                <p className="text-gray-600">{service.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Customer Portal Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-cyan-300 font-semibold uppercase tracking-wider">Advanced Portal Features</span>
            <h2 className="text-4xl font-bold mt-3 mb-4">Powerful Customer Dashboard</h2>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Enterprise-grade features to manage your shipments, upload documentation, and collaborate with our team
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {features.map((feature, idx) => (
              <div key={idx} className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                  {(
                    feature.iconKey === 'CameraIcon' ? <CameraIcon className="h-7 w-7 text-white" /> :
                      feature.iconKey === 'DocumentTextIcon' ? <DocumentTextIcon className="h-7 w-7 text-white" /> :
                        feature.iconKey === 'CheckCircleIcon' ? <CheckCircleIcon className="h-7 w-7 text-white" /> :
                          <BuildingOffice2Icon className="h-7 w-7 text-white" />
                  )}
                </div>
                <h4 className="text-lg font-bold mb-2">{feature.title}</h4>
                <p className="text-blue-100 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* Advanced Features Highlight */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold mb-2">📸</div>
                <h4 className="text-lg font-semibold mb-2">Photo Upload System</h4>
                <p className="text-blue-100 text-sm">Upload and manage unlimited high-quality photos of shipments with instant cloud storage</p>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">⚙️</div>
                <h4 className="text-lg font-semibold mb-2">Customizable Settings</h4>
                <p className="text-blue-100 text-sm">Configure your branding, company profiles, invoice templates, and operational preferences</p>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">📊</div>
                <h4 className="text-lg font-semibold mb-2">Advanced Analytics</h4>
                <p className="text-blue-100 text-sm">Real-time dashboards with insights on storage costs, shipment history, and business metrics</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partners Strip */}
      {partners.length > 0 && (
        <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <h3 className="text-center text-sm font-semibold text-gray-500 uppercase tracking-wider mb-6">Trusted by Partners & Sister Companies</h3>
            <div className="flex flex-wrap items-center justify-center gap-6">
              {partners.map((p, idx) => (
                p.link ? (
                  <a key={idx} href={p.link} target="_blank" rel="noreferrer" className="opacity-80 hover:opacity-100 transition">
                    <img src={p.logoUrl} alt={p.name || 'Partner'} className="h-12 w-auto object-contain" />
                  </a>
                ) : (
                  <img key={idx} src={p.logoUrl} alt={p.name || 'Partner'} className="h-12 w-auto object-contain opacity-80" />
                )
              ))}
            </div>
          </div>
        </section>
      )}
      {/* Contact Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MapPinIcon className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Visit Us</h3>
              <p className="text-gray-600">Industrial Area<br />Kuwait City, Kuwait</p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <PhoneIcon className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Call Us</h3>
              <p className="text-gray-600">+965 XXXX XXXX<br />+965 XXXX XXXX</p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <EnvelopeIcon className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Email Us</h3>
              <p className="text-gray-600">info@qgocargo.com<br />sales@qgocargo.com</p>
            </div>
          </div>
        </div>
      </section>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative animate-in zoom-in duration-200">
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>

            <div className="p-8">
              <div className="text-center mb-6">
                {branding.logo ? (
                  <img src={branding.logo} alt="Logo" className="h-16 w-auto mx-auto mb-3" />
                ) : (
                  <div className="h-16 w-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <CubeIcon className="h-9 w-9 text-white" />
                  </div>
                )}
                <h3 className="text-2xl font-bold text-gray-900">Customer Login</h3>
                <p className="text-gray-600 text-sm">Access your dashboard</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="relative">
                    <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <LockClosedIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    >
                      {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
