import { useState, useEffect } from 'react';
import { XMarkIcon, CurrencyDollarIcon, DocumentTextIcon, PrinterIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { billingAPI, withdrawalsAPI, getBackendUrl } from '../services/api';

interface PaymentBeforeReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipment: any;
  withdrawalData: {
    withdrawnBoxCount: number;
    withdrawnBy: string;
    driverName?: string;
    reason: string;
    notes: string;
    receiptNumber: string;
    photos?: string[];
  };
  onSuccess: () => void;
}

interface PrepaidBalance {
  id: string;
  totalPaid: number;
  balanceRemaining: number;
  status: string;
  validUntil?: string;
  monthlyRate?: number;  // Contract monthly rate (if > 0, customer is on a contract)
  contractStartDate?: string;
  contractEndDate?: string;
}

interface PrepaidValidity {
  hasPrepaid: boolean;
  isValid: boolean;
  canOperate: boolean;
  isExpired: boolean;
  message: string;
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

  // Prepaid balance state
  const [prepaidBalance, setPrepaidBalance] = useState<PrepaidBalance | null>(null);
  const [usePrepaid, setUsePrepaid] = useState(false);
  const [prepaidValidity, setPrepaidValidity] = useState<PrepaidValidity | null>(null);

  // Editable line items state
  const [editableLineItems, setEditableLineItems] = useState<any[]>([]);

  const [paymentData, setPaymentData] = useState({
    paymentMethod: 'CASH',
    amount: 0,
    transactionRef: '',
    receiptNumber: '',
    notes: '',
  });

  const [paymentOption, setPaymentOption] = useState<'full' | 'partial' | 'debt'>('full');

  // Release photos state
  const [releasePhotos, setReleasePhotos] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Load prepaid balance
  useEffect(() => {
    if (isOpen && shipment?.companyProfileId) {
      loadPrepaidBalance();
    }
  }, [isOpen, shipment?.companyProfileId]);

  const loadPrepaidBalance = async () => {
    if (!shipment?.companyProfileId) return;

    try {
      const token = localStorage.getItem('token');

      // Check prepaid validity first
      const validityResponse = await fetch(`${getBackendUrl()}/api/prepaid/check-validity/${shipment.companyProfileId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (validityResponse.ok) {
        const validityData = await validityResponse.json();
        setPrepaidValidity(validityData);
      }

      const response = await fetch(`${getBackendUrl()}/api/prepaid/balance/${shipment.companyProfileId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.status !== 'NO_ACCOUNT' && data.balanceRemaining > 0) {
          setPrepaidBalance(data);
          setUsePrepaid(true); // Auto-enable prepaid if available
        } else {
          setPrepaidBalance(null);
        }
      }
    } catch (error) {
      console.error('Failed to load prepaid balance:', error);
      setPrepaidBalance(null);
      setPrepaidValidity(null);
    }
  };

  // Calculate invoice automatically
  useEffect(() => {
    if (isOpen && shipment && !invoice) {
      calculateAndCreateInvoice();
    }
  }, [isOpen, shipment]);

  // Update editableLineItems when invoice is created
  useEffect(() => {
    if (invoice?.lineItems) {
      setEditableLineItems(invoice.lineItems.map((item: any) => ({
        ...item,
        isTaxable: item.taxRate > 0,
      })));
    }
  }, [invoice]);

  // Handle line item changes
  const handleLineItemChange = (index: number, field: string, value: any) => {
    const updated = [...editableLineItems];
    updated[index] = { ...updated[index], [field]: value };

    // Recalculate amount
    if (field === 'quantity' || field === 'unitPrice') {
      updated[index].amount = updated[index].quantity * updated[index].unitPrice;
      updated[index].taxAmount = updated[index].isTaxable
        ? (updated[index].amount * updated[index].taxRate) / 100
        : 0;
    }

    // Recalculate tax if taxable changed
    if (field === 'isTaxable') {
      updated[index].taxAmount = value
        ? (updated[index].amount * updated[index].taxRate) / 100
        : 0;
    }

    setEditableLineItems(updated);
    updateInvoiceTotals(updated);
  };

  // Delete line item
  const handleDeleteLineItem = (index: number) => {
    const updated = editableLineItems.filter((_, i) => i !== index);
    setEditableLineItems(updated);
    updateInvoiceTotals(updated);
  };

  // Add manual charge
  const handleAddManualCharge = () => {
    const newItem = {
      description: '',
      category: 'CUSTOM',
      quantity: 1,
      unitPrice: 0,
      amount: 0,
      taxRate: 5,
      taxAmount: 0,
      isTaxable: false,
    };
    const updated = [...editableLineItems, newItem];
    setEditableLineItems(updated);
  };

  // Update invoice totals
  const updateInvoiceTotals = (items: any[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const totalTax = items.reduce((sum, item) => sum + item.taxAmount, 0);
    const totalAmount = subtotal + totalTax;

    setInvoice((prev: any) => ({
      ...prev,
      lineItems: items,
      subtotal,
      taxAmount: totalTax,
      totalAmount,
    }));

    setPaymentData(prev => ({
      ...prev,
      amount: totalAmount,
    }));
  };

  const calculateAndCreateInvoice = async () => {
    try {
      setInvoiceCreating(true);
      setError('');

      // ✅ CHECK FOR CONTRACT-BASED CUSTOMER (monthlyRate > 0)
      // Contract customers pay a fixed monthly rate, so releases are FREE
      const isContractCustomer = prepaidBalance && prepaidBalance.monthlyRate && prepaidBalance.monthlyRate > 0;

      // ✅ CHECK FOR PREPAID/ADVANCE PAYMENT CUSTOMER
      // Prepaid customers have already paid in advance
      const isPrepaidCustomer = prepaidBalance && prepaidBalance.balanceRemaining > 0 && !isContractCustomer;

      // Calculate storage charges
      const arrivalDate = new Date(shipment.arrivalDate || shipment.receivedDate);
      const today = new Date();
      const daysStored = Math.max(1, Math.ceil((today.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24)));

      // 🎯 CONTRACT-BASED: Create invoice with ZERO amount (included in monthly contract)
      if (isContractCustomer) {

        const lineItems = [
          {
            description: `Storage - ${daysStored} days (Covered by Monthly Contract - ${prepaidBalance.monthlyRate?.toFixed(3)} KWD/month)`,
            category: 'CONTRACT_COVERED',
            quantity: 1,
            unitPrice: 0,
            amount: 0,
            taxRate: 0,
            taxAmount: 0,
          },
        ];

        const newInvoice = await billingAPI.createInvoice({
          shipmentId: shipment.id,
          clientName: shipment.clientName,
          clientPhone: shipment.clientPhone,
          clientAddress: shipment.clientAddress || '',
          lineItems,
          notes: `Contract Release - Monthly Rate: ${prepaidBalance.monthlyRate?.toFixed(3)} KWD | Contract ID: ${prepaidBalance.id}`,
          isWarehouseInvoice: false,
        });

        setInvoice(newInvoice);
        setPaymentData(prev => ({
          ...prev,
          amount: 0,
          receiptNumber: `CONTRACT-${Date.now()}`,
        }));
        return;
      }

      // Get billing settings
      const settings = await billingAPI.getSettings();

      // 🔍 DEBUG: Log all shipment data to find the issue
      console.log('🔍 CBM Values:', {
        cbm: shipment.cbm,
        totalCBM: shipment.totalCBM,
        volume: (shipment as any).volume,
        volumeCBM: (shipment as any).volumeCBM,
      });
      console.log('🔍 Custom Rates:', {
        customRateEnabled: shipment.customRateEnabled,
        customRatePerCBMPerDay: shipment.customRatePerCBMPerDay,
        customRatePerBoxPerDay: shipment.customRatePerBoxPerDay,
      });
      console.log('🔍 Settings Rates:', {
        storageRatePerBox: settings.storageRatePerBox,
        storageRatePerCBM: settings.storageRatePerCBM,
      });

      // ✅ USE CBM-BASED PRICING WITH PROPER SETTINGS FALLBACK
      const cbm = parseFloat(shipment.cbm) || parseFloat(shipment.totalCBM) || 0;
      const hasCustomCBMRate = shipment.customRateEnabled && shipment.customRatePerCBMPerDay && shipment.customRatePerCBMPerDay > 0;
      const hasCustomBoxRate = shipment.customRateEnabled && shipment.customRatePerBoxPerDay && shipment.customRatePerBoxPerDay > 0;

      // 🔍 CRITICAL DEBUG
      console.log('🚨 CALCULATION DEBUG:', {
        'shipment.cbm (raw)': shipment.cbm,
        'shipment.cbm (type)': typeof shipment.cbm,
        'cbm (parsed)': cbm,
        'settings.storageRateType': settings.storageRateType,
        'settings.storageRatePerCBM': settings.storageRatePerCBM,
        'hasCustomCBMRate': hasCustomCBMRate,
        'hasCustomBoxRate': hasCustomBoxRate,
        'Will use CBM?': (settings.storageRateType === 'PER_CUBIC_M' && cbm > 0 && settings.storageRatePerCBM)
      });

      // 🚨 ALERT USER IF NO CBM AND SETTINGS WANTS CBM!
      if (settings.storageRateType === 'PER_CUBIC_M' && cbm === 0) {
        console.error('⚠️ PROBLEM: Settings wants CBM pricing but shipment has NO CBM!');
        console.error('Shipment CBM:', cbm);
        console.error('Will fall back to box count instead!');
        alert(`⚠️ WARNING!\n\nSettings: Per Cubic Meter pricing\nShipment CBM: ${cbm} m³ (ZERO!)\n\nFalling back to box count pricing.\n\nTo fix: Edit shipment and add CBM value!`);
      }

      let storageAmount;
      let description;
      let quantity;
      let unitPrice;

      if (hasCustomCBMRate && cbm > 0) {
        // ✅ PRIORITY 1: Shipment has custom CBM rate
        const rate = parseFloat(shipment.customRatePerCBMPerDay);
        storageAmount = daysStored * cbm * rate;
        description = `Storage Charges - ${daysStored} days × ${cbm.toFixed(3)} m³ × ${rate.toFixed(3)} KWD/m³/day [Custom]`;
        quantity = 1; // For display only
        unitPrice = storageAmount; // Total amount
      } else if (hasCustomBoxRate) {
        // ✅ PRIORITY 2: Shipment has custom box rate
        const boxCount = shipment.originalBoxCount || shipment.currentBoxCount || withdrawalData.withdrawnBoxCount;
        const rate = parseFloat(shipment.customRatePerBoxPerDay);
        storageAmount = daysStored * boxCount * rate;
        description = `Storage Charges - ${daysStored} days × ${boxCount} boxes × ${rate.toFixed(3)} KWD/box/day [Custom]`;
        quantity = 1;
        unitPrice = storageAmount;
      } else if (settings.storageRateType === 'PER_CUBIC_M' && cbm > 0 && settings.storageRatePerCBM) {
        // ✅ PRIORITY 3: Settings default is CBM and shipment has CBM
        const rate = parseFloat(settings.storageRatePerCBM as any);
        storageAmount = daysStored * cbm * rate;
        description = `Storage Charges - ${daysStored} days × ${cbm.toFixed(3)} m³ × ${rate.toFixed(3)} KWD/m³/day`;
        quantity = 1;
        unitPrice = storageAmount;
      } else if (settings.storageRateType === 'PER_BOX' && settings.storageRatePerBox) {
        // ✅ PRIORITY 4: Settings default is per box
        const boxCount = shipment.originalBoxCount || shipment.currentBoxCount || withdrawalData.withdrawnBoxCount;
        const rate = parseFloat(settings.storageRatePerBox as any);
        storageAmount = daysStored * boxCount * rate;
        description = `Storage Charges - ${daysStored} days × ${boxCount} boxes × ${rate.toFixed(3)} KWD/box/day`;
        quantity = 1;
        unitPrice = storageAmount;
      } else if (cbm > 0 && settings.storageRatePerCBM) {
        // ✅ FALLBACK 1: Use CBM if available
        const rate = parseFloat(settings.storageRatePerCBM as any);
        storageAmount = daysStored * cbm * rate;
        description = `Storage Charges - ${daysStored} days × ${cbm.toFixed(3)} m³ × ${rate.toFixed(3)} KWD/m³/day`;
        quantity = 1;
        unitPrice = storageAmount;
      } else {
        // ✅ FALLBACK: Box count with default rate
        const boxCount = shipment.originalBoxCount || shipment.currentBoxCount || withdrawalData.withdrawnBoxCount;
        const rate = parseFloat(settings.storageRatePerBox || 0.5);
        storageAmount = daysStored * boxCount * rate;
        description = `Storage Charges - ${daysStored} days × ${boxCount} boxes × ${rate.toFixed(3)} KWD/box/day`;
        quantity = 1;
        unitPrice = storageAmount;
      }

      const taxRate = parseFloat(settings.taxRate) || 5;
      const taxAmount = (storageAmount * taxRate) / 100;

      // Line items
      const lineItems = [
        {
          description,
          category: 'STORAGE',
          quantity,
          unitPrice,
          amount: storageAmount,
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

      // ✅ CONTRACT CUSTOMER - Skip payment, just release
      if (isContractCustomer) {

        // Mark invoice as paid (contract covered)
        if (invoice) {
          await billingAPI.recordPayment(invoice.id, {
            amount: 0,
            paymentMethod: 'CONTRACT',
            transactionRef: `CONTRACT-${prepaidBalance?.id || 'N/A'}`,
            receiptNumber: `CONTRACT-${Date.now()}`,
            notes: `Covered by monthly contract (${prepaidBalance?.monthlyRate?.toFixed(3)} KWD/month)`,
          });
        }

        // Process withdrawal
        const withdrawalResponse = await processWithdrawal();

        alert(`✅ CONTRACT RELEASE COMPLETE!\n\nNo payment required - covered by monthly contract.\nContract Rate: ${prepaidBalance?.monthlyRate?.toFixed(3)} KWD/month`);
        printReleaseReceipt(withdrawalResponse, 0);

        onSuccess();
        onClose();
        return;
      }

      // 🔒 CHECK PREPAID VALIDITY - BLOCK IF EXPIRED
      if (prepaidValidity?.hasPrepaid && !prepaidValidity?.canOperate) {
        setError(`Cannot release shipment: ${prepaidValidity?.message || 'Prepaid account has expired. Please renew the prepaid balance.'}`);
        setLoading(false);
        return;
      }

      // Calculate prepaid deduction
      const prepaidDeduction = usePrepaid && prepaidBalance
        ? Math.min(invoice?.totalAmount || 0, prepaidBalance.balanceRemaining)
        : 0;
      const amountDueAfterPrepaid = Math.max(0, (invoice?.totalAmount || 0) - prepaidDeduction);

      // If fully covered by prepaid, process differently
      if (usePrepaid && prepaidDeduction > 0 && amountDueAfterPrepaid === 0) {
        // Fully covered by prepaid - deduct from prepaid balance
        try {
          const token = localStorage.getItem('token');
          const deductResponse = await fetch(`${getBackendUrl()}/api/prepaid/deduct`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              companyProfileId: shipment.companyProfileId,
              amount: prepaidDeduction,
              shipmentId: shipment.id,
              description: `Invoice ${invoice?.invoiceNumber || 'N/A'} - ${shipment.referenceId} (Full prepaid)`
            })
          });

          if (!deductResponse.ok) {
            console.error('Failed to deduct prepaid balance');
          }
        } catch (prepaidError) {
          console.error('Prepaid deduction error:', prepaidError);
        }

        // Mark invoice as paid via prepaid
        await billingAPI.recordPayment(invoice.id, {
          amount: prepaidDeduction,
          paymentMethod: 'PREPAID',
          transactionRef: `PREPAID-${prepaidBalance?.id || 'N/A'}`,
          receiptNumber: '',
          notes: `Paid via prepaid balance. Deducted: ${prepaidDeduction.toFixed(3)} KWD`,
        });

        // Process withdrawal
        const withdrawalResponse = await processWithdrawal();

        alert(`✅ Invoice fully paid via PREPAID balance!\nDeducted: ${prepaidDeduction.toFixed(3)} KWD\nRelease completed.`);
        printReleaseReceipt(withdrawalResponse, prepaidDeduction);

        onSuccess();
        onClose();
        return;
      }

      if (paymentOption === 'debt') {
        // Mark as debt - no payment recorded yet
        // If prepaid deduction exists, apply it first
        if (prepaidDeduction > 0) {
          try {
            const token = localStorage.getItem('token');
            await fetch(`${getBackendUrl()}/api/prepaid/deduct`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                companyProfileId: shipment.companyProfileId,
                amount: prepaidDeduction,
                shipmentId: shipment.id,
                description: `Invoice ${invoice?.invoiceNumber || 'N/A'} - ${shipment.referenceId} (Partial prepaid)`
              })
            });

            // Record prepaid portion as payment
            await billingAPI.recordPayment(invoice.id, {
              amount: prepaidDeduction,
              paymentMethod: 'PREPAID',
              transactionRef: `PREPAID-${prepaidBalance?.id || 'N/A'}`,
              notes: `Prepaid portion. Remaining: ${amountDueAfterPrepaid.toFixed(3)} KWD as debt`,
            });
          } catch (prepaidError) {
            console.error('Prepaid deduction error:', prepaidError);
          }
        }

        // Process withdrawal
        const withdrawalResponse = await processWithdrawal();

        // Show success and print receipt
        if (prepaidDeduction > 0) {
          alert(`✅ Prepaid: ${prepaidDeduction.toFixed(3)} KWD applied.\nRemaining ${amountDueAfterPrepaid.toFixed(3)} KWD marked as DEBT.`);
        } else {
          alert('✅ Withdrawal approved on DEBT. Customer must pay invoice later.');
        }
        printReleaseReceipt(withdrawalResponse, prepaidDeduction);
      } else {
        // Record payment
        const effectiveTotal = usePrepaid ? amountDueAfterPrepaid : invoice.totalAmount;

        if (paymentOption === 'full' && paymentData.amount !== effectiveTotal) {
          setError(`Full payment amount must match ${usePrepaid ? 'amount due after prepaid' : 'invoice total'} (${effectiveTotal.toFixed(3)} KWD)`);
          return;
        }

        if (paymentOption === 'partial' && paymentData.amount >= effectiveTotal) {
          setError('Partial payment must be less than total amount');
          return;
        }

        if (paymentData.amount <= 0 && amountDueAfterPrepaid > 0) {
          setError('Payment amount must be greater than 0');
          return;
        }

        if (paymentData.paymentMethod === 'KNET' && !paymentData.transactionRef.trim()) {
          setError('Transaction reference is required for KNET payments');
          return;
        }

        // Deduct prepaid if used
        if (prepaidDeduction > 0) {
          try {
            const token = localStorage.getItem('token');
            await fetch(`${getBackendUrl()}/api/prepaid/deduct`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                companyProfileId: shipment.companyProfileId,
                amount: prepaidDeduction,
                shipmentId: shipment.id,
                description: `Invoice ${invoice?.invoiceNumber || 'N/A'} - ${shipment.referenceId}`
              })
            });

            // Record prepaid as payment
            await billingAPI.recordPayment(invoice.id, {
              amount: prepaidDeduction,
              paymentMethod: 'PREPAID',
              transactionRef: `PREPAID-${prepaidBalance?.id || 'N/A'}`,
              notes: `Prepaid balance deduction`,
            });
          } catch (prepaidError) {
            console.error('Prepaid deduction error:', prepaidError);
          }
        }

        // Record regular payment
        if (paymentData.amount > 0) {
          await billingAPI.recordPayment(invoice.id, {
            amount: paymentData.amount,
            paymentMethod: paymentData.paymentMethod,
            transactionRef: paymentData.transactionRef,
            receiptNumber: paymentData.receiptNumber,
            notes: paymentData.notes + (prepaidDeduction > 0 ? ` (+ ${prepaidDeduction.toFixed(3)} KWD prepaid)` : ''),
          });
        }

        // Process withdrawal
        const withdrawalResponse = await processWithdrawal();

        // Show success message
        const totalPaid = prepaidDeduction + paymentData.amount;
        if (paymentOption === 'full') {
          alert(`✅ Payment recorded successfully! Invoice PAID.\n${prepaidDeduction > 0 ? `Prepaid: ${prepaidDeduction.toFixed(3)} KWD + ` : ''}Cash/KNET: ${paymentData.amount.toFixed(3)} KWD\nRelease completed.`);
        } else {
          const remaining = effectiveTotal - paymentData.amount;
          alert(`✅ Partial payment of ${paymentData.amount.toFixed(3)} KWD recorded.\n${prepaidDeduction > 0 ? `Prepaid used: ${prepaidDeduction.toFixed(3)} KWD\n` : ''}Balance: ${remaining.toFixed(3)} KWD.\nRelease completed.`);
        }

        // Print receipt
        printReleaseReceipt(withdrawalResponse, prepaidDeduction);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to process payment and release');
    } finally {
      setLoading(false);
    }
  };

  const printReleaseReceipt = (withdrawalResponse: any, prepaidDeduction: number = 0) => {
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
        prepaidDeduction: prepaidDeduction,
      } : { prepaidDeduction: prepaidDeduction },
      releaseDate: new Date(),
      releaseType: withdrawalResponse.withdrawal?.remainingBoxCount === 0 ? 'FULL' : 'PARTIAL',
      boxesReleased: withdrawalData.withdrawnBoxCount,
      boxesRemaining: withdrawalResponse.withdrawal?.remainingBoxCount || 0,
      prepaidDeduction: prepaidDeduction,
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
    // Combine photos from WithdrawalModal and PaymentBeforeReleaseModal
    const allPhotos = [
      ...(withdrawalData.photos || []),
      ...releasePhotos
    ];

    const response = await withdrawalsAPI.create({
      shipmentId: shipment.id,
      ...withdrawalData,
      photos: allPhotos.length > 0 ? allPhotos : undefined,
    });
    return response;
  };

  if (!isOpen) return null;

  // Determine customer type for UI
  const isContractCustomer = prepaidBalance && prepaidBalance.monthlyRate && prepaidBalance.monthlyRate > 0;
  const isPrepaidCustomer = prepaidBalance && prepaidBalance.balanceRemaining > 0 && !isContractCustomer;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b border-gray-200 ${isContractCustomer
            ? 'bg-gradient-to-r from-green-50 to-emerald-50'
            : isPrepaidCustomer
              ? 'bg-gradient-to-r from-purple-50 to-indigo-50'
              : 'bg-gradient-to-r from-red-50 to-orange-50'
          }`}>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">
                {isContractCustomer ? '📋 Contract Release' : isPrepaidCustomer ? '💳 Prepaid Release' : '💰 Payment Required Before Release'}
              </h2>
              {isContractCustomer && (
                <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-bold rounded-full flex items-center gap-1">
                  📋 CONTRACT - {prepaidBalance.monthlyRate?.toFixed(3)} KWD/month
                </span>
              )}
              {isPrepaidCustomer && (
                <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-bold rounded-full flex items-center gap-1">
                  💳 PREPAID - {prepaidBalance.balanceRemaining.toFixed(3)} KWD
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {isContractCustomer
                ? 'This release is covered by the monthly contract | هذا الإصدار مشمول بالعقد الشهري'
                : isPrepaidCustomer
                  ? 'Charges will be deducted from prepaid balance | سيتم خصم الرسوم من الرصيد المسبق'
                  : 'Invoice must be paid or marked as debt | يجب دفع الفاتورة'
              }
            </p>
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
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'invoice' ? 'bg-primary-600 text-white' : 'bg-green-600 text-white'
                }`}>
                {step === 'payment' ? <CheckCircleIcon className="h-5 w-5" /> : '1'}
              </div>
              <span className="font-semibold">Invoice Created</span>
            </div>

            <div className="w-16 h-0.5 bg-gray-300"></div>

            <div className={`flex items-center gap-2 ${step === 'payment' ? 'text-primary-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'payment' ? 'bg-primary-600 text-white' : 'bg-gray-300 text-white'
                }`}>
                2
              </div>
              <span className="font-semibold">Payment & Release</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* PREPAID EXPIRED WARNING BANNER */}
          {prepaidValidity?.hasPrepaid && !prepaidValidity?.canOperate && (
            <div className="bg-red-100 border-2 border-red-500 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">⛔</span>
                <div>
                  <h4 className="text-lg font-bold text-red-700">PREPAID ACCOUNT EXPIRED - RELEASE BLOCKED</h4>
                  <p className="text-sm text-red-600 mt-1">
                    {prepaidValidity.message || 'This customer\'s prepaid balance has expired. Please renew the prepaid balance to release shipments.'}
                  </p>
                  <p className="text-xs text-red-500 mt-2">
                    Contact administrator to renew the prepaid account.
                  </p>
                </div>
              </div>
            </div>
          )}

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
              {/* Editable Invoice Preview */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border-2 border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Invoice #{invoice.invoiceNumber} - Editable</h3>
                    <p className="text-sm text-gray-600">Generated: {new Date().toLocaleDateString()}</p>
                  </div>
                  <DocumentTextIcon className="h-12 w-12 text-blue-600" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
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

                {/* Editable Invoice Items */}
                <div className="bg-white rounded-lg p-4 mb-4 space-y-3">
                  <h4 className="font-semibold text-gray-700 mb-3">Line Items (Click to Edit)</h4>

                  {editableLineItems.map((item, index) => (
                    <div key={index} className="border border-gray-200 bg-gray-50 rounded-lg p-3">
                      <div className="grid grid-cols-12 gap-2 items-center">
                        {/* Description */}
                        <div className="col-span-5">
                          <label className="block text-xs text-gray-600 mb-1">Description</label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        {/* Quantity */}
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-600 mb-1">Qty</label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleLineItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            step="0.001"
                          />
                        </div>

                        {/* Unit Price */}
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-600 mb-1">Price</label>
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleLineItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            step="0.001"
                          />
                        </div>

                        {/* Amount (readonly) */}
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-600 mb-1">Amount</label>
                          <div className="px-2 py-1.5 text-sm font-semibold text-gray-900 bg-gray-100 rounded">
                            {(item.amount || 0).toFixed(3)}
                          </div>
                        </div>

                        {/* Taxable + Delete */}
                        <div className="col-span-1 flex flex-col items-center gap-1">
                          <label className="flex items-center text-xs text-gray-600">
                            <input
                              type="checkbox"
                              checked={item.isTaxable}
                              onChange={(e) => handleLineItemChange(index, 'isTaxable', e.target.checked)}
                              className="mr-1"
                            />
                            Tax
                          </label>
                          <button
                            type="button"
                            onClick={() => handleDeleteLineItem(index)}
                            className="text-red-600 hover:text-red-800 text-xs"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add Manual Charge Button */}
                  <button
                    type="button"
                    onClick={handleAddManualCharge}
                    className="w-full py-2 px-4 border-2 border-dashed border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
                  >
                    + Add Manual Charge
                  </button>

                  {/* Totals */}
                  <div className="border-t pt-3 mt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="text-gray-900">{(invoice?.subtotal || 0).toFixed(3)} KWD</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax (5%)</span>
                      <span className="text-gray-900">{(invoice?.taxAmount || 0).toFixed(3)} KWD</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold border-t pt-2">
                      <span className="text-gray-900">TOTAL</span>
                      <span className="text-primary-600">{(invoice?.totalAmount || 0).toFixed(3)} KWD</span>
                    </div>

                    {/* Prepaid Balance Section */}
                    {prepaidBalance && prepaidBalance.balanceRemaining > 0 && (
                      <div className="border-t border-purple-300 pt-3 mt-3 bg-purple-50 -mx-4 px-4 pb-3 rounded-b-lg">
                        <div className="flex items-center justify-between mb-2">
                          <label className="flex items-center gap-2 text-sm font-medium text-purple-800">
                            <input
                              type="checkbox"
                              checked={usePrepaid}
                              onChange={(e) => setUsePrepaid(e.target.checked)}
                              className="rounded text-purple-600 focus:ring-purple-500"
                            />
                            💳 Use Prepaid Balance
                          </label>
                          <span className="text-sm text-purple-700">
                            Available: <strong>{prepaidBalance.balanceRemaining.toFixed(3)} KWD</strong>
                          </span>
                        </div>

                        {usePrepaid && (
                          <>
                            <div className="flex justify-between text-sm text-purple-700 mt-2">
                              <span>Prepaid Deduction:</span>
                              <span className="font-medium">
                                -{Math.min(invoice?.totalAmount || 0, prepaidBalance.balanceRemaining).toFixed(3)} KWD
                              </span>
                            </div>
                            <div className="flex justify-between text-lg mt-1">
                              <span className="font-semibold text-purple-900">Amount Due:</span>
                              <span className={`font-bold ${Math.max(0, (invoice?.totalAmount || 0) - prepaidBalance.balanceRemaining) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                {Math.max(0, (invoice?.totalAmount || 0) - prepaidBalance.balanceRemaining).toFixed(3)} KWD
                              </span>
                            </div>
                            {(invoice?.totalAmount || 0) <= prepaidBalance.balanceRemaining && (
                              <p className="text-xs text-green-700 mt-1 font-medium">
                                ✅ Fully covered by prepaid balance! No payment required.
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}
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
              {/* Prepaid Banner in Payment Step */}
              {prepaidBalance && prepaidBalance.balanceRemaining > 0 && usePrepaid && (
                <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-4 text-white mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">💳</span>
                      <div>
                        <p className="font-bold">PREPAID CUSTOMER</p>
                        <p className="text-sm text-purple-200">
                          Deducting: {Math.min(invoice?.totalAmount || 0, prepaidBalance.balanceRemaining).toFixed(3)} KWD from prepaid balance
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-purple-200">Amount Due After Prepaid</p>
                      <p className="text-2xl font-bold">
                        {Math.max(0, (invoice?.totalAmount || 0) - prepaidBalance.balanceRemaining).toFixed(3)} KWD
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Payment Option
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Full Payment - adjusted for prepaid */}
                  {(() => {
                    const prepaidDeduction = usePrepaid && prepaidBalance
                      ? Math.min(invoice?.totalAmount || 0, prepaidBalance.balanceRemaining)
                      : 0;
                    const amountDue = Math.max(0, (invoice?.totalAmount || 0) - prepaidDeduction);

                    return (
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentOption('full');
                          setPaymentData(prev => ({ ...prev, amount: amountDue }));
                        }}
                        className={`p-4 border-2 rounded-xl text-center transition-all ${paymentOption === 'full'
                          ? 'border-green-600 bg-green-50 text-green-700'
                          : 'border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        <p className="font-bold text-lg mb-1">✅ Full Payment</p>
                        <p className="text-sm">{amountDue.toFixed(3)} KWD</p>
                        {prepaidDeduction > 0 && (
                          <p className="text-xs text-purple-600 mt-1">
                            +{prepaidDeduction.toFixed(3)} prepaid
                          </p>
                        )}
                      </button>
                    );
                  })()}

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentOption('partial');
                      setPaymentData(prev => ({ ...prev, amount: 0 }));
                    }}
                    className={`p-4 border-2 rounded-xl text-center transition-all ${paymentOption === 'partial'
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
                    className={`p-4 border-2 rounded-xl text-center transition-all ${paymentOption === 'debt'
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {['CASH', 'KNET', 'BANK_TRANSFER', 'CHEQUE'].map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentData(prev => ({ ...prev, paymentMethod: method }))}
                          className={`px-4 py-3 border-2 rounded-lg font-semibold transition-all ${paymentData.paymentMethod === method
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

                  {/* Release Photos Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      📷 Release Photos (Optional)
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-primary-500 transition-colors">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={async (e) => {
                          const files = e.target.files;
                          if (!files) return;

                          setUploadingPhotos(true);
                          const uploadedUrls: string[] = [];
                          for (let i = 0; i < files.length; i++) {
                            const formData = new FormData();
                            formData.append('file', files[i]);
                            formData.append('type', 'release');

                            try {
                              const res = await fetch('/api/upload', {
                                method: 'POST',
                                headers: {
                                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                                },
                                body: formData
                              });
                              const data = await res.json();
                              if (data.url) {
                                uploadedUrls.push(data.url);
                              }
                            } catch (err) {
                              console.error('Upload error:', err);
                            }
                          }
                          setReleasePhotos([...releasePhotos, ...uploadedUrls]);
                          setUploadingPhotos(false);
                        }}
                        className="hidden"
                        id="payment-release-photo-upload"
                        disabled={uploadingPhotos}
                      />
                      <label
                        htmlFor="payment-release-photo-upload"
                        className={`flex flex-col items-center cursor-pointer ${uploadingPhotos ? 'opacity-50' : ''}`}
                      >
                        {uploadingPhotos ? (
                          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                        ) : (
                          <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        )}
                        <span className="text-sm text-gray-600">
                          {uploadingPhotos ? 'Uploading...' : 'Click to upload release photos'}
                        </span>
                        <span className="text-xs text-gray-400 mt-1">Photos will be included in email notification</span>
                      </label>
                    </div>

                    {/* Uploaded Photos Preview */}
                    {releasePhotos.length > 0 && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                        {releasePhotos.map((url, idx) => (
                          <div key={idx} className="relative group">
                            <img
                              src={url.startsWith('http') ? url : `${window.location.origin}${url}`}
                              alt={`Release photo ${idx + 1}`}
                              className="w-full h-16 object-cover rounded-lg border"
                            />
                            <button
                              type="button"
                              onClick={() => setReleasePhotos(releasePhotos.filter((_, i) => i !== idx))}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
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
