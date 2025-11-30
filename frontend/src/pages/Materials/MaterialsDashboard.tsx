import React, { useState, useEffect } from 'react';
import {
    Package, AlertTriangle, TrendingUp, Clock, Plus, Search, Filter,
    ChevronDown, X, Save
} from 'lucide-react';
import { apiFetch } from '../../services/api';

interface Material {
    id: string;
    sku: string;
    name: string;
    category: string;
    unit: string;
    totalQuantity: number;
    minStockLevel: number;
    unitCost?: number;
    sellingPrice?: number;
    isActive: boolean;
}

interface MaterialIssue {
    id: string;
    jobId?: string;
    job?: { id: string; jobTitle: string; jobCode: string };
    issueType: string;
    reference?: string;
    materialId: string;
    material?: Material;
    quantity: number;
    unitCost: number;
    totalCost: number;
    issuedAt: string;
    notes?: string;
}

interface StockPurchase {
    id: string;
    batchNumber: string;
    orderNumber?: string;
    invoiceNumber?: string;
    vendorName?: string;
    vendorId?: string;
    materialId: string;
    material?: { sku: string; name: string; unit?: string };
    quantity: number;
    quantityPurchased: number;
    quantityRemaining: number;
    unitCost: number;
    sellingPrice?: number;
    totalCost: number;
    purchaseDate: string;
    orderDate?: string;
    receivedDate?: string;
    status?: string;
    notes?: string;
}

interface DashboardStats {
    totalMaterials: number;
    lowStockCount: number;
    inventoryValue: number;
    recentIssues: number;
}

const MaterialsDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'issues' | 'purchases'>('overview');
    const [materials, setMaterials] = useState<Material[]>([]);
    const [issues, setIssues] = useState<MaterialIssue[]>([]);
    const [purchases, setPurchases] = useState<StockPurchase[]>([]);
    const [stats, setStats] = useState<DashboardStats>({
        totalMaterials: 0,
        lowStockCount: 0,
        inventoryValue: 0,
        recentIssues: 0
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [stockFilter, setStockFilter] = useState<'all' | 'adequate' | 'low' | 'out'>('all');
    const [categories, setCategories] = useState<string[]>([]);
    const [vendors, setVendors] = useState<string[]>([]);

    const [showIssueForm, setShowIssueForm] = useState(false);
    const [showPurchaseForm, setShowPurchaseForm] = useState(false);
    const [issueForm, setIssueForm] = useState({
        materialId: '',
        quantity: 0,
        issueType: 'JOB',
        jobId: '',
        reference: '',
        notes: ''
    });
    const [purchaseForm, setPurchaseForm] = useState({
        orderNumber: '',
        invoiceNumber: '',
        vendorName: '',
        materialId: '',
        quantity: 0,
        unitCost: 0,
        orderDate: new Date().toISOString().split('T')[0],
        receivedDate: '',
        status: 'PENDING',
        notes: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const token = localStorage.getItem('authToken');
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        try {
            // Load materials
            const matsRes = await apiFetch('/materials', { headers });
            const matsData = await matsRes.json();
            const matsList = Array.isArray(matsData) ? matsData : [];
            setMaterials(matsList);

            // Load issues
            const issuesRes = await apiFetch('/materials/issues', { headers });
            const issuesData = await issuesRes.json();
            setIssues(Array.isArray(issuesData) ? issuesData : []);

            // Load stock batches (purchases)
            const purchasesRes = await apiFetch('/materials/stock/all', { headers });
            const purchasesData = await purchasesRes.json();
            if (Array.isArray(purchasesData)) {
                // Transform stock batches to match StockPurchase interface
                const transformed = purchasesData.map((batch: any) => ({
                    ...batch,
                    quantity: batch.quantityPurchased,
                    totalCost: batch.quantityPurchased * (batch.unitCost || 0),
                    orderDate: batch.purchaseDate,
                    vendorName: batch.vendorName || 'Direct Entry',
                    orderNumber: batch.batchNumber || batch.purchaseOrder || 'BATCH',
                    status: 'RECEIVED'
                }));
                setPurchases(transformed);
            }

            // Calculate stats
            const lowStock = matsList.filter((m: Material) => m.totalQuantity <= m.minStockLevel).length;
            const inventoryValue = matsList.reduce((sum: number, m: Material) =>
                sum + (m.totalQuantity * (m.unitCost || 0)), 0
            );
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const recentCount = (Array.isArray(issuesData) ? issuesData : []).filter((i: MaterialIssue) =>
                new Date(i.issuedAt) >= thirtyDaysAgo
            ).length;

            setStats({
                totalMaterials: matsList.length,
                lowStockCount: lowStock,
                inventoryValue,
                recentIssues: recentCount
            });

            // Extract unique categories from materialCategory relationship
            const cats = [...new Set(
                matsList
                    .map((m: any) => m.materialCategory?.name || m.category)
                    .filter(Boolean)
            )];
            setCategories(cats as string[]);

            const vends = [...new Set(
                Array.isArray(purchasesData)
                    ? purchasesData.map((p: StockPurchase) => p.vendorName).filter(Boolean)
                    : []
            )];
            setVendors(vends as string[]);
        } catch (error) {
            console.error('Failed to load materials data:', error);
        }
    };

    const getStockStatus = (material: Material): 'adequate' | 'low' | 'out' => {
        if (material.totalQuantity === 0) return 'out';
        if (material.totalQuantity <= material.minStockLevel) return 'low';
        return 'adequate';
    };

    const filteredMaterials = materials.filter(m => {
        const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.sku.toLowerCase().includes(searchTerm.toLowerCase());
        const materialCat = (m as any).materialCategory?.name || m.category;
        const matchesCategory = categoryFilter === 'all' || materialCat === categoryFilter;
        const status = getStockStatus(m);
        const matchesStock = stockFilter === 'all' || status === stockFilter;
        return matchesSearch && matchesCategory && matchesStock;
    });

    const handleCreateIssue = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const token = localStorage.getItem('authToken');
        try {
            const response = await apiFetch('/materials/issues', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(issueForm)
            });

            if (response.ok) {
                alert('Material issue created successfully!');
                setShowIssueForm(false);
                setIssueForm({
                    materialId: '',
                    quantity: 0,
                    issueType: 'JOB',
                    jobId: '',
                    reference: '',
                    notes: ''
                });
                loadData();
            } else {
                alert('Failed to create issue');
            }
        } catch (error) {
            console.error('Error creating issue:', error);
            alert('Error creating issue');
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePurchase = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const token = localStorage.getItem('authToken');
        try {
            const purchaseData = {
                orderNumber: purchaseForm.orderNumber,
                invoiceNumber: purchaseForm.invoiceNumber,
                vendorName: purchaseForm.vendorName,
                materialId: purchaseForm.materialId,
                quantity: purchaseForm.quantity,
                unitCost: purchaseForm.unitCost,
                orderDate: purchaseForm.orderDate,
                receivedDate: purchaseForm.receivedDate || null,
                status: purchaseForm.status,
                notes: purchaseForm.notes
            };

            const response = await apiFetch('/materials/purchase-orders', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(purchaseData)
            });

            if (response.ok) {
                alert('Stock purchase created successfully!');
                setShowPurchaseForm(false);
                setPurchaseForm({
                    orderNumber: '',
                    invoiceNumber: '',
                    vendorName: '',
                    materialId: '',
                    quantity: 0,
                    unitCost: 0,
                    orderDate: new Date().toISOString().split('T')[0],
                    receivedDate: '',
                    status: 'PENDING',
                    notes: ''
                });
                loadData();
            } else {
                alert('Failed to create purchase order');
            }
        } catch (error) {
            console.error('Error creating purchase:', error);
            alert('Error creating purchase order');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Materials Dashboard</h1>
                    <p className="text-gray-600">Manage inventory, track issues, and monitor stock levels</p>
                </div>

                {/* Dashboard Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* Total Materials */}
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Total Materials</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalMaterials}</p>
                            </div>
                            <div className="bg-blue-100 rounded-full p-3">
                                <Package className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </div>

                    {/* Low Stock Alerts */}
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Low Stock Alerts</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.lowStockCount}</p>
                            </div>
                            <div className="bg-orange-100 rounded-full p-3">
                                <AlertTriangle className="w-6 h-6 text-orange-600" />
                            </div>
                        </div>
                    </div>

                    {/* Inventory Value */}
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Inventory Value</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">
                                    {(stats.inventoryValue / 1000).toFixed(1)}K KWD
                                </p>
                            </div>
                            <div className="bg-green-100 rounded-full p-3">
                                <TrendingUp className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </div>

                    {/* Recent Issues */}
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Issues (30 Days)</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.recentIssues}</p>
                            </div>
                            <div className="bg-purple-100 rounded-full p-3">
                                <Clock className="w-6 h-6 text-purple-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="bg-white rounded-lg shadow mb-6">
                    <div className="flex gap-2 p-4 border-b border-gray-200">
                        {[
                            { id: 'overview', label: 'Overview', count: null },
                            { id: 'inventory', label: 'Inventory', count: materials.length },
                            { id: 'issues', label: 'Material Issues', count: issues.length },
                            { id: 'purchases', label: 'Stock Purchases', count: purchases.length }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`relative px-6 py-3 rounded-full font-medium transition-all flex items-center gap-2 ${activeTab === tab.id
                                    ? 'bg-blue-500 text-white shadow-lg'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                    }`}
                            >
                                {tab.label}
                                {tab.count !== null && (
                                    <span className={`ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold ${activeTab === tab.id
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-200 text-gray-800'
                                        }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                        {/* Overview Tab */}
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Stats</h2>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <p className="text-sm text-gray-600">Active Materials</p>
                                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                                {materials.filter(m => m.isActive).length}
                                            </p>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <p className="text-sm text-gray-600">Out of Stock</p>
                                            <p className="text-2xl font-bold text-red-600 mt-1">
                                                {materials.filter(m => m.totalQuantity === 0).length}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-3">Recent Issues (Last 30 Days)</h3>
                                    <div className="space-y-2">
                                        {issues.slice(0, 5).map(issue => (
                                            <div key={issue.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                                                <div>
                                                    <p className="font-medium text-gray-900">
                                                        {materials.find(m => m.id === issue.materialId)?.name || 'Unknown'}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {issue.issueType === 'JOB' ? `Job: ${issue.jobId}` : `Ref: ${issue.reference}`}
                                                    </p>
                                                </div>
                                                <span className="text-lg font-bold text-blue-600">{issue.quantity}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Inventory Tab */}
                        {activeTab === 'inventory' && (
                            <div className="space-y-6">
                                {/* Filters */}
                                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* Search */}
                                        <div className="relative">
                                            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Search by name or SKU..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>

                                        {/* Category Filter */}
                                        <div className="relative">
                                            <Filter className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                            <select
                                                value={categoryFilter}
                                                onChange={(e) => setCategoryFilter(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                                            >
                                                <option value="all">All Categories</option>
                                                {categories.map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
                                        </div>

                                        {/* Stock Filter */}
                                        <div className="relative">
                                            <select
                                                value={stockFilter}
                                                onChange={(e) => setStockFilter(e.target.value as any)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                                            >
                                                <option value="all">All Stock Levels</option>
                                                <option value="adequate">Adequate</option>
                                                <option value="low">Low Stock</option>
                                                <option value="out">Out of Stock</option>
                                            </select>
                                            <ChevronDown className="absolute right-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>

                                {/* Materials Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-gray-100 border-b border-gray-200">
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">SKU</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Material Name</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Category</th>
                                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Stock</th>
                                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Min Level</th>
                                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Status</th>
                                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Value</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredMaterials.map((material, idx) => {
                                                const status = getStockStatus(material);
                                                return (
                                                    <tr
                                                        key={material.id}
                                                        className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                                            }`}
                                                    >
                                                        <td className="px-6 py-4 font-mono text-sm text-gray-900">{material.sku}</td>
                                                        <td className="px-6 py-4 font-medium text-gray-900">{material.name}</td>
                                                        <td className="px-6 py-4 text-sm text-gray-600">{(material as any).materialCategory?.name || material.category}</td>
                                                        <td className="px-6 py-4 text-right font-semibold text-gray-900">
                                                            {material.totalQuantity} {material.unit}
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-gray-600">{material.minStockLevel}</td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${status === 'adequate'
                                                                ? 'bg-green-100 text-green-700'
                                                                : status === 'low'
                                                                    ? 'bg-orange-100 text-orange-700'
                                                                    : 'bg-red-100 text-red-700'
                                                                }`}>
                                                                {status === 'adequate' ? 'Adequate' : status === 'low' ? 'Low' : 'Out'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-semibold text-gray-900">
                                                            {((material.totalQuantity * (material.unitCost || 0)) / 1000).toFixed(1)}K KWD
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    {filteredMaterials.length === 0 && (
                                        <div className="text-center py-12">
                                            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                            <p className="text-gray-500">No materials found</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Issues Tab */}
                        {activeTab === 'issues' && (
                            <div className="space-y-6">
                                {/* Create Issue Form */}
                                <button
                                    onClick={() => setShowIssueForm(!showIssueForm)}
                                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <Plus className="w-5 h-5" />
                                    Create Material Issue
                                </button>

                                {showIssueForm && (
                                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-bold text-gray-900">Create Material Issue</h3>
                                            <button onClick={() => setShowIssueForm(false)}>
                                                <X className="w-5 h-5 text-gray-500 hover:text-gray-700" />
                                            </button>
                                        </div>

                                        <form onSubmit={handleCreateIssue} className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Material *</label>
                                                    <select
                                                        required
                                                        value={issueForm.materialId}
                                                        onChange={(e) => setIssueForm({ ...issueForm, materialId: e.target.value })}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    >
                                                        <option value="">Select material</option>
                                                        {materials.map(m => (
                                                            <option key={m.id} value={m.id}>
                                                                {m.sku} - {m.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                                                    <input
                                                        type="number"
                                                        required
                                                        min="1"
                                                        value={issueForm.quantity}
                                                        onChange={(e) => setIssueForm({ ...issueForm, quantity: parseInt(e.target.value) || 0 })}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Issue Type *</label>
                                                <div className="flex gap-4">
                                                    {['JOB', 'INTERNAL', 'MAINTENANCE'].map(type => (
                                                        <label key={type} className="flex items-center gap-2">
                                                            <input
                                                                type="radio"
                                                                value={type}
                                                                checked={issueForm.issueType === type}
                                                                onChange={(e) => setIssueForm({ ...issueForm, issueType: e.target.value })}
                                                                className="w-4 h-4"
                                                            />
                                                            <span className="text-sm text-gray-700">{type}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            {issueForm.issueType === 'JOB' ? (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Job ID</label>
                                                    <input
                                                        type="text"
                                                        value={issueForm.jobId}
                                                        onChange={(e) => setIssueForm({ ...issueForm, jobId: e.target.value })}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        placeholder="Job ID"
                                                    />
                                                </div>
                                            ) : (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                                                    <input
                                                        type="text"
                                                        value={issueForm.reference}
                                                        onChange={(e) => setIssueForm({ ...issueForm, reference: e.target.value })}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        placeholder="e.g., Office, Truck 1"
                                                    />
                                                </div>
                                            )}

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                                <textarea
                                                    value={issueForm.notes}
                                                    onChange={(e) => setIssueForm({ ...issueForm, notes: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    rows={3}
                                                    placeholder="Additional notes..."
                                                />
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                                            >
                                                <Save className="w-4 h-4" />
                                                {loading ? 'Creating...' : 'Create Issue'}
                                            </button>
                                        </form>
                                    </div>
                                )}

                                {/* Issues History */}
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">Issue History</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-gray-100 border-b border-gray-200">
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Material</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Reference</th>
                                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Quantity</th>
                                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Total Cost</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {issues.map((issue, idx) => (
                                                    <tr
                                                        key={issue.id}
                                                        className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                                            }`}
                                                    >
                                                        <td className="px-6 py-4 font-medium text-gray-900">
                                                            {issue.material?.name || materials.find(m => m.id === issue.materialId)?.name || 'Unknown'}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${issue.issueType === 'JOB'
                                                                ? 'bg-blue-100 text-blue-700'
                                                                : issue.issueType === 'INTERNAL'
                                                                    ? 'bg-yellow-100 text-yellow-700'
                                                                    : 'bg-purple-100 text-purple-700'
                                                                }`}>
                                                                {issue.issueType}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-600">
                                                            {issue.issueType === 'JOB'
                                                                ? (issue.job ? `${issue.job.jobCode} - ${issue.job.jobTitle}` : issue.jobId || '-')
                                                                : (issue.reference || '-')}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-semibold text-gray-900">{issue.quantity}</td>
                                                        <td className="px-6 py-4 text-right font-semibold text-gray-900">
                                                            {(issue.quantity * issue.unitCost).toFixed(3)} KWD
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-600">
                                                            {new Date(issue.issuedAt).toLocaleDateString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {issues.length === 0 && (
                                            <div className="text-center py-12">
                                                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                                <p className="text-gray-500">No issues recorded</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Stock Purchases Tab */}
                        {activeTab === 'purchases' && (
                            <div className="space-y-6">
                                {/* Create Purchase Form */}
                                <button
                                    onClick={() => setShowPurchaseForm(!showPurchaseForm)}
                                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    <Plus className="w-5 h-5" />
                                    Add Stock Purchase
                                </button>

                                {showPurchaseForm && (
                                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-bold text-gray-900">Create Stock Purchase</h3>
                                            <button onClick={() => setShowPurchaseForm(false)}>
                                                <X className="w-5 h-5 text-gray-500 hover:text-gray-700" />
                                            </button>
                                        </div>

                                        <form onSubmit={handleCreatePurchase} className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">PO Number *</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={purchaseForm.orderNumber}
                                                        onChange={(e) => setPurchaseForm({ ...purchaseForm, orderNumber: e.target.value })}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        placeholder="PO-2024-001"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                                                    <input
                                                        type="text"
                                                        value={purchaseForm.invoiceNumber}
                                                        onChange={(e) => setPurchaseForm({ ...purchaseForm, invoiceNumber: e.target.value })}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        placeholder="INV-123456"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name *</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={purchaseForm.vendorName}
                                                        onChange={(e) => setPurchaseForm({ ...purchaseForm, vendorName: e.target.value })}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        placeholder="e.g., Acme Supplies"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Material *</label>
                                                    <select
                                                        required
                                                        value={purchaseForm.materialId}
                                                        onChange={(e) => setPurchaseForm({ ...purchaseForm, materialId: e.target.value })}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    >
                                                        <option value="">Select material</option>
                                                        {materials.map(m => (
                                                            <option key={m.id} value={m.id}>
                                                                {m.sku} - {m.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                                                    <input
                                                        type="number"
                                                        required
                                                        min="1"
                                                        value={purchaseForm.quantity}
                                                        onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: parseInt(e.target.value) || 0 })}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost (KWD) *</label>
                                                    <input
                                                        type="number"
                                                        required
                                                        min="0"
                                                        step="0.01"
                                                        value={purchaseForm.unitCost}
                                                        onChange={(e) => setPurchaseForm({ ...purchaseForm, unitCost: parseFloat(e.target.value) || 0 })}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Order Date *</label>
                                                    <input
                                                        type="date"
                                                        required
                                                        value={purchaseForm.orderDate}
                                                        onChange={(e) => setPurchaseForm({ ...purchaseForm, orderDate: e.target.value })}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Received Date</label>
                                                    <input
                                                        type="date"
                                                        value={purchaseForm.receivedDate}
                                                        onChange={(e) => setPurchaseForm({ ...purchaseForm, receivedDate: e.target.value })}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                                <select
                                                    value={purchaseForm.status}
                                                    onChange={(e) => setPurchaseForm({ ...purchaseForm, status: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                >
                                                    <option value="PENDING">Pending</option>
                                                    <option value="APPROVED">Approved</option>
                                                    <option value="ORDERED">Ordered</option>
                                                    <option value="RECEIVED">Received</option>
                                                    <option value="CANCELLED">Cancelled</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                                <textarea
                                                    value={purchaseForm.notes}
                                                    onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    rows={3}
                                                    placeholder="Additional purchase details..."
                                                />
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                                            >
                                                <Save className="w-4 h-4" />
                                                {loading ? 'Creating...' : 'Create Purchase'}
                                            </button>
                                        </form>
                                    </div>
                                )}

                                {/* Purchase History */}
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">Stock Purchase History</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-gray-100 border-b border-gray-200">
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Batch #</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Material</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Vendor</th>
                                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Purchased</th>
                                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Remaining</th>
                                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Unit Cost</th>
                                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Total</th>
                                                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Status</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {purchases.map((purchase, idx) => (
                                                    <tr
                                                        key={purchase.id}
                                                        className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                                            }`}
                                                    >
                                                        <td className="px-6 py-4 font-mono font-semibold text-gray-900">{purchase.batchNumber || purchase.orderNumber}</td>
                                                        <td className="px-6 py-4 text-sm text-gray-700">
                                                            <div className="font-medium">{purchase.material?.name || 'Unknown'}</div>
                                                            <div className="text-xs text-gray-500">{purchase.material?.sku}</div>
                                                        </td>
                                                        <td className="px-6 py-4 font-medium text-gray-900">{purchase.vendorName || '-'}</td>
                                                        <td className="px-6 py-4 text-right font-semibold text-green-600">+{purchase.quantityPurchased || purchase.quantity}</td>
                                                        <td className="px-6 py-4 text-right font-semibold text-gray-900">{purchase.quantityRemaining || purchase.quantity}</td>
                                                        <td className="px-6 py-4 text-right text-gray-600">{(purchase.unitCost || 0).toFixed(3)} KWD</td>
                                                        <td className="px-6 py-4 text-right font-semibold text-gray-900">
                                                            {((purchase.quantityPurchased || purchase.quantity) * (purchase.unitCost || 0)).toFixed(3)} KWD
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                                                RECEIVED
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-600">
                                                            {purchase.orderDate ? new Date(purchase.orderDate).toLocaleDateString() : '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {purchases.length === 0 && (
                                            <div className="text-center py-12">
                                                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                                <p className="text-gray-500">No stock purchases found</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MaterialsDashboard;

