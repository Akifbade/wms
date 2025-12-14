import { useState, useEffect } from 'react';
import { XMarkIcon, CameraIcon, UserIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { PaymentBeforeReleaseModal } from './PaymentBeforeReleaseModal';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipment: any;
  onSuccess: () => void;
}

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
  isOpen,
  onClose,
  shipment,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    withdrawnBoxCount: shipment?.currentBoxCount || 0,
    withdrawnBy: '',
    reason: '',
    notes: '',
    receiptNumber: `WD-${Date.now()}`,
  });
  const [error, setError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Reset form when modal opens or shipment changes
  useEffect(() => {
    if (isOpen && shipment) {
      setFormData({
        withdrawnBoxCount: shipment.currentBoxCount || 0,
        withdrawnBy: '',
        reason: '',
        notes: '',
        receiptNumber: `WD-${Date.now()}`,
      });
      setError('');
    }
  }, [isOpen, shipment]);

  const remainingBoxes = shipment ? shipment.currentBoxCount - formData.withdrawnBoxCount : 0;
  const isFullRelease = formData.withdrawnBoxCount === shipment?.currentBoxCount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.withdrawnBy.trim()) {
      setError('Please enter the name of person collecting items');
      return;
    }

    if (formData.withdrawnBoxCount <= 0) {
      setError('Please enter a valid number of boxes');
      return;
    }

    if (formData.withdrawnBoxCount > shipment?.currentBoxCount) {
      setError(`Cannot withdraw ${formData.withdrawnBoxCount} boxes. Only ${shipment.currentBoxCount} available.`);
      return;
    }

    // ✅ Confirmation Dialog
    const releaseType = isFullRelease ? 'FULL RELEASE' : 'PARTIAL RELEASE';
    const confirmMsg = `🚨 CONFIRM ${releaseType}\n\n` +
      `📦 Boxes: ${formData.withdrawnBoxCount} out of ${shipment.currentBoxCount}\n` +
      `👤 Collected By: ${formData.withdrawnBy}\n` +
      `📄 Reason: ${formData.reason || 'N/A'}\n\n` +
      `⚠️ This will trigger payment/invoice process.\n\n` +
      `Are you sure you want to proceed?`;
    
    if (!confirm(confirmMsg)) {
      return;
    }

    // Show payment modal instead of direct withdrawal
    setShowPaymentModal(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">📦 Withdraw Items</h2>
            <p className="text-sm text-gray-600 mt-1">Release items from storage | سحب العناصر من المخزن</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Shipment Info */}
        <div className="p-6 bg-blue-50 border-b">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Shipment ID</p>
              <p className="font-bold text-gray-900">{shipment?.referenceId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Client</p>
              <p className="font-bold text-gray-900">{shipment?.clientName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Available Boxes</p>
              <p className="font-bold text-green-600 text-xl">{shipment?.currentBoxCount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Rack Location</p>
              <p className="font-bold text-gray-900">{shipment?.rack?.code || 'N/A'}</p>
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

          {/* Release Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Release Type
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, withdrawnBoxCount: shipment.currentBoxCount }));
                }}
                className={`p-4 border-2 rounded-xl text-center transition-all ${
                  isFullRelease
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-bold text-lg mb-1">Full Release</p>
                <p className="text-sm text-gray-600">All {shipment?.currentBoxCount} boxes</p>
              </button>
              <button
                type="button"
                onClick={() => {
                  // Don't set to 1, let user enter the amount
                  // Just ensure it's not full release
                  if (isFullRelease) {
                    setFormData(prev => ({ ...prev, withdrawnBoxCount: Math.floor(shipment.currentBoxCount / 2) }));
                  }
                }}
                className={`p-4 border-2 rounded-xl text-center transition-all ${
                  !isFullRelease
                    ? 'border-purple-600 bg-purple-50 text-purple-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-bold text-lg mb-1">Partial Release</p>
                <p className="text-sm text-gray-600">Some boxes only</p>
              </button>
            </div>
          </div>

          {/* Box Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Boxes to Withdraw <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={formData.withdrawnBoxCount || ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                  setFormData({ ...formData, withdrawnBoxCount: value });
                }}
                onFocus={(e) => e.target.select()}
                min="1"
                max={shipment?.currentBoxCount || 0}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg font-semibold"
                placeholder="Enter number of boxes"
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                boxes
              </span>
            </div>
            <div className="flex justify-between mt-2 text-sm">
              <span className="text-gray-600">Remaining after withdrawal:</span>
              <span className="font-bold text-gray-900">{remainingBoxes} boxes</span>
            </div>
          </div>

          {/* Withdrawn By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Collected By (Person Name) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={formData.withdrawnBy}
                onChange={(e) => setFormData({ ...formData, withdrawnBy: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter full name"
                required
              />
            </div>
          </div>

          {/* Receipt Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Receipt Number
            </label>
            <div className="relative">
              <DocumentTextIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={formData.receiptNumber}
                onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="WD-001"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Withdrawal
            </label>
            <select
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select reason...</option>
              <option value="Customer Collection">Customer Collection</option>
              <option value="Delivery">Delivery</option>
              <option value="Transfer">Transfer to Another Location</option>
              <option value="Return to Owner">Return to Owner</option>
              <option value="Disposal">Disposal</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Any additional details..."
            />
          </div>

          {/* Photo Upload Placeholder */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photos (Optional)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors cursor-pointer">
              <CameraIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 text-sm">Click to upload photos</p>
              <p className="text-gray-400 text-xs mt-1">Photo upload feature coming soon</p>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
            <h4 className="font-bold text-gray-900 mb-4 text-lg">Withdrawal Summary</h4>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total boxes in storage:</span>
                <span className="font-semibold">{shipment?.currentBoxCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Boxes to withdraw:</span>
                <span className="font-bold text-red-600 text-lg">{formData.withdrawnBoxCount}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-purple-200">
                <span className="text-gray-900 font-semibold">Remaining boxes:</span>
                <span className="font-bold text-green-600 text-xl">{remainingBoxes}</span>
              </div>
              {isFullRelease && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-sm font-medium">
                    ⚠️ This will fully release the shipment and mark it as RELEASED
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 font-bold transition-all shadow-lg"
            >
              💰 Continue to Payment
            </button>
          </div>
        </form>
      </div>

      {/* Payment Modal */}
      <PaymentBeforeReleaseModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        shipment={shipment}
        withdrawalData={formData}
        onSuccess={() => {
          setShowPaymentModal(false);
          onSuccess();
          onClose();
        }}
      />
    </div>
  );
};
