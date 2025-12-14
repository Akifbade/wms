import { useState } from 'react';
import {
    BanknotesIcon,
    DocumentTextIcon,
    Cog6ToothIcon,
    DocumentDuplicateIcon,
    CreditCardIcon,
    ChartPieIcon,
    BuildingOfficeIcon,
    ClipboardDocumentListIcon,
    CubeIcon,
    ChartBarIcon
} from '@heroicons/react/24/outline';
import { Invoices } from '../Invoices/Invoices';
import { Expenses } from '../Expenses/Expenses';
import { BillingSettings } from '../Settings/components/BillingSettings';
import { AdvancesList } from './components/AdvancesList';
import { ContractsList } from './components/ContractsList';
import { FinanceOverview } from './components/FinanceOverview';
import { CompanyFinancials } from './components/CompanyFinancials';
import { GlobalTransactions } from './components/GlobalTransactions';
import { InventoryFinancials } from './components/InventoryFinancials';
import CompanyAnalytics from '../Analytics/CompanyAnalytics';

interface TabCategory {
    id: string;
    name: string;
    tabs: Tab[];
}

interface Tab {
    id: string;
    name: string;
    icon: any;
    component: any;
}

export const FinanceDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [activeCategory, setActiveCategory] = useState('overview');

    const categories: TabCategory[] = [
        {
            id: 'overview',
            name: '📊 Overview & Analytics',
            tabs: [
                { id: 'overview', name: 'Overview', icon: ChartPieIcon, component: FinanceOverview },
                { id: 'analytics', name: 'Analytics', icon: ChartBarIcon, component: CompanyAnalytics },
                { id: 'companies', name: 'Companies', icon: BuildingOfficeIcon, component: CompanyFinancials },
            ]
        },
        {
            id: 'transactions',
            name: '💰 Transactions & Payments',
            tabs: [
                { id: 'transactions', name: 'All Transactions', icon: ClipboardDocumentListIcon, component: GlobalTransactions },
                { id: 'invoices', name: 'Invoices', icon: DocumentTextIcon, component: Invoices },
                { id: 'advances', name: 'Advances', icon: CreditCardIcon, component: AdvancesList },
                { id: 'expenses', name: 'Expenses', icon: BanknotesIcon, component: Expenses },
            ]
        },
        {
            id: 'contracts',
            name: '📑 Contracts & Assets',
            tabs: [
                { id: 'contracts', name: 'Contracts', icon: DocumentDuplicateIcon, component: ContractsList },
                { id: 'inventory', name: 'Inventory', icon: CubeIcon, component: InventoryFinancials },
                { id: 'settings', name: 'Settings', icon: Cog6ToothIcon, component: BillingSettings },
            ]
        }
    ];

    const allTabs = categories.flatMap(cat => cat.tabs);

    return (
        <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-gray-100 pb-16 md:pb-0">
            {/* Glass Header - Mobile Optimized */}
            <div className="bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20">
                <div className="px-3 md:px-4 py-2 md:py-3">
                    <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                            <h1 className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
                                <span className="text-xl md:text-2xl">💎</span>
                                Finance
                            </h1>
                            <p className="text-[10px] md:text-xs text-gray-600 mt-0.5 hidden md:block">
                                Complete financial management & analytics platform
                            </p>
                        </div>
                        {/* Category Pills - Mobile Scrollable */}
                        <div className="flex gap-1.5 md:gap-2 overflow-x-auto no-scrollbar">
                            {categories.map((category) => (
                                <button
                                    key={category.id}
                                    onClick={() => {
                                        setActiveCategory(category.id);
                                        setActiveTab(category.tabs[0].id);
                                    }}
                                    className={`
                                        flex-shrink-0 px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-[10px] md:text-xs font-medium transition-all duration-300
                                        ${activeCategory === category.id
                                            ? 'bg-blue-600/90 text-white shadow-lg shadow-blue-500/30'
                                            : 'bg-white/60 text-gray-700 hover:bg-white/80 border border-gray-200/50'
                                        }
                                    `}
                                >
                                    <span className="md:hidden">{category.name.split(' ')[0]}</span>
                                    <span className="hidden md:inline">{category.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Glass Tabs - Mobile Scrollable */}
                <div className="px-2 md:px-4">
                    <div className="flex gap-1 overflow-x-auto no-scrollbar pb-2">
                        {categories.find(c => c.id === activeCategory)?.tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    flex-shrink-0 inline-flex items-center px-3 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-medium whitespace-nowrap rounded-t-lg
                                    transition-all duration-300 relative
                                    ${activeTab === tab.id
                                        ? 'bg-white/90 text-blue-600 shadow-lg'
                                        : 'bg-white/40 text-gray-600 hover:bg-white/60'
                                    }
                                `}
                            >
                                <tab.icon className={`mr-1 md:mr-1.5 h-3.5 w-3.5 md:h-4 md:w-4 ${activeTab === tab.id ? 'scale-110' : ''}`} />
                                {tab.name}
                                {activeTab === tab.id && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content Area with Glass Effect */}
            <div className="flex-1 overflow-hidden p-3">
                {allTabs.map((tab) => (
                    <div
                        key={tab.id}
                        className={`h-full transition-all duration-500 ${activeTab === tab.id
                                ? 'opacity-100 scale-100'
                                : 'opacity-0 scale-95 hidden'
                            }`}
                    >
                        <div className="h-full bg-white/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 overflow-hidden">
                            <div className="h-full overflow-auto">
                                <tab.component />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <style>{`
                /* Smooth scrollbar */
                ::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                ::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                }
                ::-webkit-scrollbar-thumb {
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 4px;
                    backdrop-filter: blur(10px);
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: rgba(0, 0, 0, 0.3);
                }
                
                /* Smooth transitions */
                * {
                    scroll-behavior: smooth;
                }
            `}</style>
        </div>
    );
};
