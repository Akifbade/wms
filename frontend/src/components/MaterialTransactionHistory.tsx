import React, { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Package, Calendar, MapPin, User } from 'lucide-react';

interface MaterialTransactionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  materialId: string;
  materialName: string;
}

interface Transaction {
  id: string;
  type: 'PURCHASE' | 'ISSUE' | 'RETURN' | 'ADJUSTMENT';
  quantity: number;
  balanceAfter: number;
  date: string;
  details: {
    jobCode?: string;
    jobTitle?: string;
    purchaseOrderNo?: string;
    supplier?: string;
    unitCost?: number;
    rack?: string;
    notes?: string;
  };
}

export const MaterialTransactionHistory: React.FC<MaterialTransactionHistoryProps> = ({
  isOpen,
  onClose,
  materialId,
  materialName
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    currentStock: 0,
    totalPurchased: 0,
    totalIssued: 0,
    totalReturned: 0,
    totalDamaged: 0
  });

  useEffect(() => {
    if (isOpen && materialId) {
      loadHistory();
    }
  }, [isOpen, materialId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/materials/${materialId}/history`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      const data = await response.json();
      setTransactions(data.transactions);
      setSummary(data.summary);
    } catch (error) {
      console.error('Failed to load transaction history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Package className="w-6 h-6" />
              Transaction History
            </h2>
            <p className="text-blue-100 mt-1">{materialName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-5 gap-4 p-6 bg-gray-50 border-b">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Current Stock</p>
            <p className="text-2xl font-bold text-blue-600">{summary.currentStock}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Total Purchased</p>
            <p className="text-2xl font-bold text-green-600">+{summary.totalPurchased}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Total Issued</p>
            <p className="text-2xl font-bold text-orange-600">-{summary.totalIssued}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Total Returned</p>
            <p className="text-2xl font-bold text-blue-600">+{summary.totalReturned}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Total Damaged</p>
            <p className="text-2xl font-bold text-red-600">{summary.totalDamaged}</p>
          </div>
        </div>

        {/* Transactions List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No transactions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((txn) => (
                <div
                  key={txn.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    {/* Left: Type & Details */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {/* Type Icon */}
                        {txn.type === 'PURCHASE' && (
                          <div className="bg-green-100 p-2 rounded-full">
                            <TrendingUp className="w-5 h-5 text-green-600" />
                          </div>
                        )}
                        {txn.type === 'ISSUE' && (
                          <div className="bg-orange-100 p-2 rounded-full">
                            <TrendingDown className="w-5 h-5 text-orange-600" />
                          </div>
                        )}
                        {txn.type === 'RETURN' && (
                          <div className="bg-blue-100 p-2 rounded-full">
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                          </div>
                        )}

                        {/* Type & Quantity */}
                        <div>
                          <h3 className="font-semibold text-lg">
                            {txn.type === 'PURCHASE' && 'Stock Purchase'}
                            {txn.type === 'ISSUE' && 'Material Issued'}
                            {txn.type === 'RETURN' && 'Material Returned'}
                            {txn.type === 'ADJUSTMENT' && 'Stock Adjustment'}
                          </h3>
                          <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(txn.date).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Transaction Details */}
                      <div className="ml-14 space-y-1">
                        {txn.details.jobCode && (
                          <p className="text-sm">
                            <span className="font-medium">Job:</span>{' '}
                            <span className="text-blue-600">{txn.details.jobCode}</span>
                            {txn.details.jobTitle && ` - ${txn.details.jobTitle}`}
                          </p>
                        )}
                        {txn.details.purchaseOrderNo && (
                          <p className="text-sm">
                            <span className="font-medium">PO:</span> {txn.details.purchaseOrderNo}
                          </p>
                        )}
                        {txn.details.supplier && (
                          <p className="text-sm">
                            <span className="font-medium">Supplier:</span> {txn.details.supplier}
                          </p>
                        )}
                        {txn.details.rack && (
                          <p className="text-sm flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span className="font-medium">Rack:</span> {txn.details.rack}
                          </p>
                        )}
                        {txn.details.unitCost && (
                          <p className="text-sm">
                            <span className="font-medium">Unit Cost:</span> ₹{txn.details.unitCost.toFixed(2)}
                          </p>
                        )}
                        {txn.details.notes && (
                          <p className="text-sm text-gray-600 italic">
                            {txn.details.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Quantity & Balance */}
                    <div className="text-right ml-4">
                      <p className={`text-2xl font-bold ${
                        txn.type === 'PURCHASE' || txn.type === 'RETURN' 
                          ? 'text-green-600' 
                          : 'text-orange-600'
                      }`}>
                        {txn.type === 'PURCHASE' || txn.type === 'RETURN' ? '+' : '-'}
                        {txn.quantity}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Balance: <span className="font-semibold text-gray-700">{txn.balanceAfter}</span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
