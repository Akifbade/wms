import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { billingAPI } from '../services/api';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  onSuccess: () => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}) => {
  const balance = parseFloat(invoice.totalAmount) - parseFloat(invoice.paidAmount || 0);
  
  const [formData, setFormData] = useState({
    amount: balance.toFixed(3),
    paymentMethod: 'CASH',
    transactionReference: '',
    receiptNumber: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (amount > balance) {
      setError(`Amount cannot exceed balance due (${balance.toFixed(3)} KWD)`);
      return;
    }

    try {
      setLoading(true);
      setError('');

      await billingAPI.recordPayment(invoice.id, {
        ...formData,
        amount: parseFloat(formData.amount),
      });

      // Success message with details
      const paymentAmount = parseFloat(formData.amount);
      const newBal = balance - paymentAmount;
      alert(`✅ PAYMENT RECORDED!\n\n💰 Amount: ${paymentAmount.toFixed(3)} KWD\n📄 Method: ${formData.paymentMethod}\n📋 Invoice: ${invoice.invoiceNumber}\n\n${newBal <= 0 ? '✅ Invoice FULLY PAID!' : `⚠️ Remaining Balance: ${newBal.toFixed(3)} KWD`}`);
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const newBalance = balance - parseFloat(formData.amount || '0');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Record Payment</h2>
            <p className="text-sm text-gray-500 mt-1">Invoice: {invoice.invoiceNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Balance Info */}
        <div className="p-6 bg-blue-50 border-b">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Current Balance Due</p>
              <p className="text-2xl font-bold text-red-600">{balance.toFixed(3)} KWD</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">New Balance (After Payment)</p>
              <p className="text-2xl font-bold text-green-600">
                {newBalance >= 0 ? newBalance.toFixed(3) : '0.000'} KWD
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.001"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="0.000"
                required
                max={balance}
                min="0.001"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                KWD
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Maximum: {balance.toFixed(3)} KWD
            </p>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            >
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Transaction Reference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transaction Reference
            </label>
            <input
              type="text"
              value={formData.transactionReference}
              onChange={(e) => setFormData({ ...formData, transactionReference: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Bank ref, card last 4 digits, etc."
            />
          </div>

          {/* Receipt Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Receipt Number
            </label>
            <input
              type="text"
              value={formData.receiptNumber}
              onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="RCP-001"
            />
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.paymentDate}
              onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Additional payment details..."
            />
          </div>

          {/* Payment Summary */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-3">Payment Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Invoice Total</span>
                <span className="font-medium">{parseFloat(invoice.totalAmount).toFixed(3)} KWD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Already Paid</span>
                <span className="font-medium">{parseFloat(invoice.paidAmount || 0).toFixed(3)} KWD</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-gray-600">Current Payment</span>
                <span className="font-bold text-green-600">
                  {parseFloat(formData.amount || '0').toFixed(3)} KWD
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-gray-900 font-semibold">Remaining Balance</span>
                <span className="font-bold text-red-600">
                  {newBalance >= 0 ? newBalance.toFixed(3) : '0.000'} KWD
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
