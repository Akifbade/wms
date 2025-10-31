import { useState, useEffect } from 'react';
import { XMarkIcon, CurrencyDollarIcon, DocumentTextIcon, PrinterIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { billingAPI, withdrawalsAPI } from '../services/api';

interface PaymentBeforeReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipment: any;
  withdrawalData: {
    withdrawnBoxCount: number;
    withdrawnBy: string;
    reason: string;
    notes: string;
    receiptNumber: string;
  };
  onSuccess: () => void;
}

export const PaymentBeforeReleaseModal: React.FC<PaymentBeforeReleaseModalProps> = ({
  isOpen,
  onClose,
  shipment,
  withdrawalData,
  onSuccess,
}) => {
  const [step, setStep] = useState<'invoice' | 'payment'>('invoice');
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [invoiceCreating, setInvoiceCreating] = useState(false);
  
  const [paymentData, setPaymentData] = useState({
    paymentMethod: 'CASH',
    amount: 0,
    transactionRef: '',
    receiptNumber: '',
    notes: '',
  });

  const [paymentOption, setPaymentOption] = useState<'full' | 'partial' | 'debt'>('full');

  // Calculate invoice automatically
  useEffect(() => {
    if (isOpen && shipment && !invoice) {
      calculateAndCreateInvoice();
    }
  }, [isOpen, shipment]);

  const calculateAndCreateInvoice = async () => {
    try {
      setInvoiceCreating(true);
      setError('');

      // Calculate storage charges
      const arrivalDate = new Date(shipment.arrivalDate || shipment.receivedDate);
      const today = new Date();
      const daysStored = Math.max(1, Math.ceil((today.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24)));
      
      // Get billing settings
      const settings = await billingAPI.getSettings();
      
      const storageRate = parseFloat(settings.storageRatePerBox) || 0.5;
      const boxCount = shipment.originalBoxCount || shipment.currentBoxCount || withdrawalData.withdrawnBoxCount;
      const totalDayBoxes = daysStored * boxCount;
      const storageCharge = totalDayBoxes * storageRate;
      const taxRate = parseFloat(settings.taxRate) || 5;
      const taxAmount = (storageCharge * taxRate) / 100;
      
      // Line items
      const lineItems = [
        {
          description: `Storage Charges - ${daysStored} days × ${boxCount} boxes @ ${storageRate.toFixed(3)} KWD/day/box`,
          category: 'STORAGE',
          quantity: totalDayBoxes,
          unitPrice: storageRate,
          amount: storageCharge,
          taxRate: taxRate,
          taxAmount: taxAmount,
        },
      ];

      // Create invoice
      const newInvoice = await billingAPI.createInvoice({
        shipmentId: shipment.id,
        clientName: shipment.clientName,
        clientPhone: shipment.clientPhone,
        clientAddress: shipment.clientAddress || '',
        lineItems,
        notes: `Auto-generated for release - ${withdrawalData.withdrawnBoxCount} boxes withdrawn`,
        isWarehouseInvoice: false,
      });

      setInvoice(newInvoice);
      setPaymentData(prev => ({
        ...prev,
        amount: newInvoice.totalAmount,
        receiptNumber: `PMT-${Date.now()}`,
      }));
    } catch (err: any) {
      console.error('Invoice creation error:', err);
      setError(err.message || 'Failed to create invoice');
    } finally {
      setInvoiceCreating(false);
    }
  };

  const handlePrintInvoice = () => {
    if (!invoice) return;
    
    // Open invoice in new window for printing
    const printWindow = window.open(`/invoices/${invoice.id}/print`, '_blank');
    if (printWindow) {
      printWindow.focus();
    }
  };

  const handlePaymentSubmit = async () => {
    try {
      setLoading(true);
      setError('');

      if (paymentOption === 'debt') {
        // Mark as debt - no payment recorded yet
        // Just proceed with withdrawal
        const withdrawalResponse = await processWithdrawal();
        
        // Show success and print receipt
        alert('✅ Withdrawal approved on DEBT. Customer must pay invoice later.');
        printReleaseReceipt(withdrawalResponse);
      } else {
        // Record payment
        if (paymentOption === 'full' && paymentData.amount !== invoice.totalAmount) {
          setError('Full payment amount must match invoice total');
          return;
        }

        if (paymentOption === 'partial' && paymentData.amount >= invoice.totalAmount) {
          setError('Partial payment must be less than total amount');
          return;
        }

        if (paymentData.amount <= 0) {
          setError('Payment amount must be greater than 0');
          return;
        }

        if (paymentData.paymentMethod === 'KNET' && !paymentData.transactionRef.trim()) {
          setError('Transaction reference is required for KNET payments');
          return;
        }

        // Record payment
        await billingAPI.recordPayment(invoice.id, {
          amount: paymentData.amount,
          paymentMethod: paymentData.paymentMethod,
          transactionRef: paymentData.transactionRef,
          receiptNumber: paymentData.receiptNumber,
          notes: paymentData.notes,
        });

        // Process withdrawal
        const withdrawalResponse = await processWithdrawal();

        // Show success message
        if (paymentOption === 'full') {
          alert('✅ Payment recorded successfully! Invoice PAID. Release completed.');
        } else {
          alert(`✅ Partial payment of ${paymentData.amount.toFixed(3)} KWD recorded. Balance: ${(invoice.totalAmount - paymentData.amount).toFixed(3)} KWD. Release completed.`);
        }

        // Print receipt
        printReleaseReceipt(withdrawalResponse);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to process payment and release');
    } finally {
      setLoading(false);
    }
  };

  const printReleaseReceipt = (withdrawalResponse: any) => {
    // Create release receipt data
    const receiptData = {
      withdrawal: withdrawalResponse.withdrawal || withdrawalResponse,
      shipment: shipment,
      invoice: invoice,
      payment: paymentOption !== 'debt' ? {
        amount: paymentData.amount,
        method: paymentData.paymentMethod,
        transactionRef: paymentData.transactionRef,
        receiptNumber: paymentData.receiptNumber,
      } : null,
      releaseDate: new Date(),
      releaseType: withdrawalResponse.withdrawal?.remainingBoxCount === 0 ? 'FULL' : 'PARTIAL',
      boxesReleased: withdrawalData.withdrawnBoxCount,
      boxesRemaining: withdrawalResponse.withdrawal?.remainingBoxCount || 0,
    };

    // Store in sessionStorage for print page
    sessionStorage.setItem('releaseReceipt', JSON.stringify(receiptData));
    
    // Open print window with full path to HTML file
    const printWindow = window.open('/release-receipt.html', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.focus();
    }
  };

  const processWithdrawal = async () => {
    const response = await withdrawalsAPI.create({
      shipmentId: shipment.id,
      ...withdrawalData,
    });
    return response;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">💰 Payment Required Before Release</h2>
            <p className="text-sm text-gray-600 mt-1">Invoice must be paid or marked as debt | يجب دفع الفاتورة</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center p-4 bg-gray-50 border-b">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${step === 'invoice' ? 'text-primary-600' : 'text-green-600'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === 'invoice' ? 'bg-primary-600 text-white' : 'bg-green-600 text-white'
              }`}>
                {step === 'payment' ? <CheckCircleIcon className="h-5 w-5" /> : '1'}
              </div>
              <span className="font-semibold">Invoice Created</span>
            </div>
            
            <div className="w-16 h-0.5 bg-gray-300"></div>
            
            <div className={`flex items-center gap-2 ${step === 'payment' ? 'text-primary-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === 'payment' ? 'bg-primary-600 text-white' : 'bg-gray-300 text-white'
              }`}>
                2
              </div>
              <span className="font-semibold">Payment & Release</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {invoiceCreating ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
              <p className="text-gray-600">Creating invoice...</p>
            </div>
          ) : invoice && step === 'invoice' ? (
            <>
              {/* Invoice Preview */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border-2 border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Invoice #{invoice.invoiceNumber}</h3>
                    <p className="text-sm text-gray-600">Generated: {new Date().toLocaleDateString()}</p>
                  </div>
                  <DocumentTextIcon className="h-12 w-12 text-blue-600" />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-600">Client</p>
                    <p className="font-bold text-gray-900">{shipment.clientName}</p>
                    <p className="text-sm text-gray-600">{shipment.clientPhone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Shipment</p>
                    <p className="font-bold text-gray-900">{shipment.referenceId}</p>
                    <p className="text-sm text-gray-600">Releasing: {withdrawalData.withdrawnBoxCount} boxes</p>
                  </div>
                </div>

                {/* Invoice Items */}
                <div className="bg-white rounded-lg p-4 mb-4">
                  {invoice.lineItems?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.description}</p>
                        <p className="text-sm text-gray-600">Qty: {item.quantity} × {item.unitPrice.toFixed(3)} KWD</p>
                      </div>
                      <p className="font-bold text-gray-900">{item.amount.toFixed(3)} KWD</p>
                    </div>
                  ))}
                  
                  <div className="border-t pt-3 mt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="text-gray-900">{invoice.subtotal.toFixed(3)} KWD</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax (5%)</span>
                      <span className="text-gray-900">{invoice.taxAmount.toFixed(3)} KWD</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold border-t pt-2">
                      <span className="text-gray-900">TOTAL</span>
                      <span className="text-primary-600">{invoice.totalAmount.toFixed(3)} KWD</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handlePrintInvoice}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                  >
                    <PrinterIcon className="h-5 w-5" />
                    Print Invoice
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('payment')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-primary-600 to-purple-600 text-white rounded-lg hover:from-primary-700 hover:to-purple-700 transition-colors font-semibold"
                  >
                    Proceed to Payment
                    <CurrencyDollarIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </>
          ) : step === 'payment' && invoice ? (
            <>
              {/* Payment Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Payment Option
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentOption('full');
                      setPaymentData(prev => ({ ...prev, amount: invoice.totalAmount }));
                    }}
                    className={`p-4 border-2 rounded-xl text-center transition-all ${
                      paymentOption === 'full'
                        ? 'border-green-600 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-bold text-lg mb-1">✅ Full Payment</p>
                    <p className="text-sm">{invoice.totalAmount.toFixed(3)} KWD</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentOption('partial');
                      setPaymentData(prev => ({ ...prev, amount: 0 }));
                    }}
                    className={`p-4 border-2 rounded-xl text-center transition-all ${
                      paymentOption === 'partial'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-bold text-lg mb-1">💵 Partial Payment</p>
                    <p className="text-sm">Pay some now</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentOption('debt')}
                    className={`p-4 border-2 rounded-xl text-center transition-all ${
                      paymentOption === 'debt'
                        ? 'border-orange-600 bg-orange-50 text-orange-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-bold text-lg mb-1">📝 On Debt</p>
                    <p className="text-sm">Pay later</p>
                  </button>
                </div>
              </div>

              {paymentOption !== 'debt' && (
                <>
                  {/* Payment Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Amount (KWD)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={paymentData.amount}
                      onChange={(e) => setPaymentData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                      disabled={paymentOption === 'full'}
                      className="w-full px-4 py-3 text-xl font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                      placeholder="Enter amount"
                    />
                    {paymentOption === 'partial' && (
                      <p className="text-sm text-gray-600 mt-1">
                        Remaining: {(invoice.totalAmount - paymentData.amount).toFixed(3)} KWD
                      </p>
                    )}
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-4 gap-3">
                      {['CASH', 'KNET', 'BANK_TRANSFER', 'CHEQUE'].map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentData(prev => ({ ...prev, paymentMethod: method }))}
                          className={`px-4 py-3 border-2 rounded-lg font-semibold transition-all ${
                            paymentData.paymentMethod === method
                              ? 'border-primary-600 bg-primary-50 text-primary-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {method.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Transaction Reference (for KNET) */}
                  {paymentData.paymentMethod === 'KNET' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Transaction Reference * <span className="text-red-500">(Required)</span>
                      </label>
                      <input
                        type="text"
                        value={paymentData.transactionRef}
                        onChange={(e) => setPaymentData(prev => ({ ...prev, transactionRef: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Enter KNET transaction reference"
                      />
                    </div>
                  )}

                  {/* Receipt Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Receipt Number
                    </label>
                    <input
                      type="text"
                      value={paymentData.receiptNumber}
                      onChange={(e) => setPaymentData(prev => ({ ...prev, receiptNumber: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Receipt number"
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Notes (Optional)
                    </label>
                    <textarea
                      value={paymentData.notes}
                      onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Any additional notes..."
                    />
                  </div>
                </>
              )}

              {paymentOption === 'debt' && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-orange-800 font-semibold">⚠️ Releasing on DEBT</p>
                  <p className="text-sm text-orange-700 mt-2">
                    Customer can collect items without payment. Invoice #{invoice.invoiceNumber} will remain UNPAID and customer must pay later.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setStep('invoice')}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                >
                  ← Back to Invoice
                </button>
                <button
                  type="button"
                  onClick={handlePaymentSubmit}
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Processing...
                    </span>
                  ) : (
                    <>
                      {paymentOption === 'debt' ? '✅ Approve Debt & Release' : '💰 Record Payment & Release'}
                    </>
                  )}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
