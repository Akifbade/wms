import React, { useState } from 'react';
import MaterialsDashboard from './MaterialsDashboard';
import { MaterialsManagement } from './index';
import { LayoutGrid, Settings } from 'lucide-react';

const MaterialsHub: React.FC = () => {
    const [view, setView] = useState<'dashboard' | 'management'>('dashboard');

    return (
        <div className="w-full">
            {/* View Toggle */}
            <div className="bg-white border-b border-gray-200 p-4 mb-6 rounded-lg shadow-sm">
                <div className="flex gap-4 items-center">
                    <button
                        onClick={() => setView('dashboard')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${view === 'dashboard'
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        <LayoutGrid className="w-5 h-5" />
                        Dashboard
                    </button>
                    <button
                        onClick={() => setView('management')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${view === 'management'
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        <Settings className="w-5 h-5" />
                        Add/Manage Materials
                    </button>
                </div>
            </div>

            {/* Content */}
            {view === 'dashboard' && <MaterialsDashboard />}
            {view === 'management' && <MaterialsManagement />}
        </div>
    );
};

export default MaterialsHub;
