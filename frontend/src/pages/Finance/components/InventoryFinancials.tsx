import React, { useState, useEffect } from 'react';
import { getAuthToken } from '../../../services/api';

export const InventoryFinancials = () => {
    const [inventory, setInventory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/finance/inventory', {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            const data = await response.json();
            setInventory(data);
        } catch (error) {
            console.error('Failed to fetch inventory financials:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading inventory data...</div>;

    return (
        <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Inventory Financials</h2>
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Material</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Current Stock</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Unit Cost</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Total Purchased</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Total Used</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Total Damaged</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {inventory.map((item) => (
                            <tr key={item.id}>
                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                    {item.name}
                                    <div className="text-gray-500 font-normal text-xs">{item.sku}</div>
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                    {item.currentStock}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                    {(item.unitCost || 0).toFixed(3)} KWD
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-blue-600">
                                    {(item.financials?.purchased?.cost || 0).toFixed(3)} KWD
                                    <div className="text-xs text-gray-400">Qty: {item.financials?.purchased?.qty || 0}</div>
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-600">
                                    {(item.financials?.used?.cost || 0).toFixed(3)} KWD
                                    <div className="text-xs text-gray-400">Qty: {item.financials?.used?.qty || 0}</div>
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-red-600">
                                    {(item.financials?.damaged?.cost || 0).toFixed(3)} KWD
                                    <div className="text-xs text-gray-400">Qty: {item.financials?.damaged?.qty || 0}</div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
