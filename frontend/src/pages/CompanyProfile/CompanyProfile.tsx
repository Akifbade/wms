import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  TruckIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  BanknotesIcon,
  ArchiveBoxIcon,
  CalendarIcon,
  ArrowLeftIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { getBackendUrl } from '../../services/api';

interface CompanyAnalytics {
  profile: {
    id: string;
    name: string;
    description?: string;
    contactPerson?: string;
    contactPhone?: string;
    logoUrl?: string;
    createdAt: string;
    isPlaceholder?: boolean;
    placeholderMessage?: string;
  };
  stats: {
    totalShipments: number;
    activeShipments: number;
    releasedShipments: number;
    pendingShipments: number;
    totalBoxes: number;
    currentBoxes: number;
    avgStorageDays: number;
    totalInvoices: number;
    totalInvoiceAmount: number;
    paidInvoices: number;
    partialInvoices: number;
    pendingInvoices: number;
    overdueInvoices: number;
    totalPaidAmount: number;
    outstandingBalance: number;
    totalPayments: number;
    avgInvoiceAmount: number;
  };
  paymentMethods: Record<string, number>;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    invoiceCount: number;
  }>;
  recentActivity: {
    shipments: any[];
    invoices: any[];
    payments: any[];
  };
}

interface ContractData {
  id: string;
  monthlyRate: number;
  paymentDueDay?: number;
  maxCBM?: number;
  maxStorageDays?: number;
  contractStartDate: string;
  contractEndDate?: string;
  status: string;
  totalPaid: number;
  totalBilled?: number;
  notes?: string;
}

interface EditContractFormData {
  monthlyRate: number;
  paymentDueDay: number;
  maxCBM: number;
  maxStorageDays: number;
  contractStartDate: string;
  contractEndDate: string;
  status: string;
  notes: string;
}

interface ShipmentCharges {
  [shipmentId: string]: {
    totalCharge: number;
    daysStored: number;
    loading: boolean;
  };
}

export const CompanyProfile: React.FC = () => {
  const { profileId } = useParams<{ profileId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CompanyAnalytics | null>(null);
  const [contract, setContract] = useState<ContractData | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'shipments' | 'invoices' | 'payments' | 'contract-payments'>('overview');

  // Shipments tab state
  const [allShipments, setAllShipments] = useState<any[]>([]);
  const [shipmentsLoading, setShipmentsLoading] = useState(false);
  const [shipmentStatusFilter, setShipmentStatusFilter] = useState<string>('all');
  const [shipmentSearchTerm, setShipmentSearchTerm] = useState('');
  const [shipmentCharges, setShipmentCharges] = useState<ShipmentCharges>({});

  // Invoices tab state
  const [allInvoices, setAllInvoices] = useState<any[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('all');
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');

  // Contract Payment History state
  const [contractPaymentHistory, setContractPaymentHistory] = useState<{
    invoices: any[];
    paymentHistory?: any[];
    contract?: {
      id: string;
      status: string;
      monthlyRate: number;
      contractStartDate: string;
      contractEndDate: string;
      daysRemaining: number;
      totalPaid: number;
    };
    summary: {
      totalBilled: number;
      totalPaid: number;
      outstanding: number;
      pendingCount: number;
      overdueCount: number;
      hasOverdue: boolean;
      daysRemaining?: number;
    };
  } | null>(null);
  const [loadingPaymentHistory, setLoadingPaymentHistory] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [showGenerateInvoiceModal, setShowGenerateInvoiceModal] = useState(false);
  const [invoiceMonth, setInvoiceMonth] = useState(new Date().getMonth() + 1);
  const [invoiceYear, setInvoiceYear] = useState(new Date().getFullYear());
  const [numberOfMonths, setNumberOfMonths] = useState(1); // Carry forward months
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paymentTransactionRef, setPaymentTransactionRef] = useState('');
  const [paymentReceiptNumber, setPaymentReceiptNumber] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [customExtendDays, setCustomExtendDays] = useState(0); // 0 means auto-calculate

  // Edit Contract Modal state
  const [showEditContractModal, setShowEditContractModal] = useState(false);
  const [editContractData, setEditContractData] = useState<EditContractFormData>({
    monthlyRate: 0,
    paymentDueDay: 25,
    maxCBM: 0,
    maxStorageDays: 0,
    contractStartDate: '',
    contractEndDate: '',
    status: 'ACTIVE',
    notes: ''
  });
  const [savingContract, setSavingContract] = useState(false);
  const formatNumber = (value: number | string | null | undefined, decimals = 3) => {
    const numeric = typeof value === 'number'
      ? value
      : value === null || value === undefined || value === ''
        ? 0
        : parseFloat(String(value));
    return Number.isFinite(numeric) ? numeric.toFixed(decimals) : (0).toFixed(decimals);
  };

  useEffect(() => {
    loadCompanyAnalytics();
    loadContract();
  }, [profileId]);

  useEffect(() => {
    if (activeTab === 'shipments' && allShipments.length === 0) {
      loadCompanyShipments();
    }
    if (activeTab === 'invoices' && allInvoices.length === 0) {
      loadCompanyInvoices();
    }
    if (activeTab === 'contract-payments' && contract && !contractPaymentHistory) {
      loadContractPaymentHistory();
    }
  }, [activeTab, contract]);

  const loadContract = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${getBackendUrl()}/api/contracts/customer/${profileId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data && response.data.hasContract) {
        setContract(response.data);
      } else {
        setContract(null);
      }
    } catch (error) {
      console.error('Failed to load contract:', error);
      setContract(null);
    }
  };

  const loadContractPaymentHistory = async () => {
    if (!contract) return;
    try {
      setLoadingPaymentHistory(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${getBackendUrl()}/api/contracts/payment-history/${profileId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setContractPaymentHistory(response.data);
    } catch (error) {
      console.error('Failed to load contract payment history:', error);
      setContractPaymentHistory(null);
    } finally {
      setLoadingPaymentHistory(false);
    }
  };

  const handleGenerateContractInvoice = async () => {
    try {
      setGeneratingInvoice(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${getBackendUrl()}/api/contracts/generate-invoice/${profileId}`,
        { month: invoiceMonth, year: invoiceYear, numberOfMonths },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowGenerateInvoiceModal(false);
      setNumberOfMonths(1); // Reset
      alert(response.data.message || 'Contract invoice generated successfully!');
      await loadContractPaymentHistory(); // Reload payment history
    } catch (error: any) {
      console.error('Failed to generate contract invoice:', error);
      alert(error.response?.data?.error || 'Failed to generate contract invoice');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoiceForPayment) return;
    try {
      setRecordingPayment(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${getBackendUrl()}/api/contracts/record-payment/${selectedInvoiceForPayment.id}`,
        {
          amount: paymentAmount,
          paymentMethod,
          transactionRef: paymentTransactionRef || null,
          receiptNumber: paymentReceiptNumber || null,
          notes: paymentNotes || null,
          customExtendDays: customExtendDays > 0 ? customExtendDays : null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowRecordPaymentModal(false);
      setSelectedInvoiceForPayment(null);
      setPaymentTransactionRef('');
      setPaymentReceiptNumber('');
      setPaymentNotes('');
      setCustomExtendDays(0);
      alert(response.data.message || 'Payment recorded successfully!');
      await loadContractPaymentHistory(); // Reload payment history
      await loadContract(); // Reload contract to get updated end date
    } catch (error: any) {
      console.error('Failed to record payment:', error);
      alert(error.response?.data?.error || 'Failed to record payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  const openEditContractModal = () => {
    if (contract) {
      setEditContractData({
        monthlyRate: contract.monthlyRate || 0,
        paymentDueDay: contract.paymentDueDay || 25,
        maxCBM: contract.maxCBM || 0,
        maxStorageDays: contract.maxStorageDays || 0,
        contractStartDate: contract.contractStartDate
          ? new Date(contract.contractStartDate).toISOString().split('T')[0]
          : '',
        contractEndDate: contract.contractEndDate
          ? new Date(contract.contractEndDate).toISOString().split('T')[0]
          : '',
        status: contract.status || 'ACTIVE',
        notes: ''
      });
      setShowEditContractModal(true);
    }
  };

  const handleSaveContract = async () => {
    if (!contract) return;

    try {
      setSavingContract(true);
      const token = localStorage.getItem('token');
      await axios.put(
        `${getBackendUrl()}/api/contracts/${contract.id}`,
        {
          monthlyRate: parseFloat(String(editContractData.monthlyRate)) || 0,
          paymentDueDay: parseInt(String(editContractData.paymentDueDay)) || 25,
          maxCBM: parseFloat(String(editContractData.maxCBM)) || null,
          maxStorageDays: parseInt(String(editContractData.maxStorageDays)) || null,
          contractStartDate: editContractData.contractStartDate || null,
          contractEndDate: editContractData.contractEndDate || null,
          status: editContractData.status,
          notes: editContractData.notes || undefined
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setShowEditContractModal(false);
      await loadContract(); // Reload data
      alert('Contract updated successfully!');
    } catch (error: any) {
      console.error('Failed to update contract:', error);
      alert(error.response?.data?.error || 'Failed to update contract');
    } finally {
      setSavingContract(false);
    }
  };

  const isContractExpired = contract?.contractEndDate && new Date(contract.contractEndDate) < new Date();

  const loadCompanyAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${getBackendUrl()}/api/companies/${profileId}/analytics`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const normalizedPaymentMethods = Object.entries(response.data?.paymentMethods || {}).reduce(
        (acc, [method, amount]) => {
          const parsed = typeof amount === 'number' ? amount : parseFloat(`${amount ?? 0}`);
          acc[method] = Number.isFinite(parsed) ? parsed : 0;
          return acc;
        },
        {} as Record<string, number>
      );

      const normalizedMonthlyRevenue = (response.data?.monthlyRevenue || []).map(entry => {
        const parsedRevenue = typeof entry.revenue === 'number'
          ? entry.revenue
          : parseFloat(`${entry.revenue ?? 0}`);
        return {
          ...entry,
          revenue: Number.isFinite(parsedRevenue) ? parsedRevenue : 0,
          invoiceCount: entry.invoiceCount ?? 0,
        };
      });

      setData({
        ...response.data,
        paymentMethods: normalizedPaymentMethods,
        monthlyRevenue: normalizedMonthlyRevenue,
      });
    } catch (error) {
      console.error('Error loading company analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanyShipments = async () => {
    try {
      setShipmentsLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${getBackendUrl()}/api/shipments?companyProfileId=${profileId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      // Backend returns { shipments, pagination }, so ensure we extract the list
      const shipments = response.data?.shipments || response.data || [];
      setAllShipments(shipments);

      // Load charges for in-storage shipments
      loadShipmentCharges(shipments.filter((s: any) => s.status === 'IN_STORAGE'));
    } catch (error) {
      console.error('Error loading company shipments:', error);
    } finally {
      setShipmentsLoading(false);
    }
  };

  const loadShipmentCharges = async (shipments: any[]) => {
    const token = localStorage.getItem('token');

    for (const shipment of shipments) {
      setShipmentCharges(prev => ({
        ...prev,
        [shipment.id]: { totalCharge: 0, daysStored: 0, loading: true }
      }));

      try {
        const response = await axios.get(
          `${getBackendUrl()}/api/billing/shipments/${shipment.id}/live-charges`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setShipmentCharges(prev => ({
          ...prev,
          [shipment.id]: {
            totalCharge: response.data?.totalCharge || 0,
            daysStored: response.data?.daysStored || 0,
            loading: false
          }
        }));
      } catch (error) {
        console.error(`Error loading charges for ${shipment.referenceId}:`, error);
        setShipmentCharges(prev => ({
          ...prev,
          [shipment.id]: { totalCharge: 0, daysStored: 0, loading: false }
        }));
      }
    }
  };

  const getFilteredShipments = () => {
    let filtered = allShipments;

    if (shipmentStatusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === shipmentStatusFilter);
    }

    if (shipmentSearchTerm) {
      filtered = filtered.filter(s =>
        s.referenceId?.toLowerCase().includes(shipmentSearchTerm.toLowerCase()) ||
        s.clientName?.toLowerCase().includes(shipmentSearchTerm.toLowerCase()) ||
        s.clientPhone?.toLowerCase().includes(shipmentSearchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const exportShipmentsToExcel = () => {
    const filtered = getFilteredShipments();
    const exportData = filtered.map(s => ({
      'Reference ID': s.referenceId,
      'Client Name': s.clientName,
      'Client Phone': s.clientPhone,
      'Status': s.status,
      'Boxes': `${s.currentBoxCount}/${s.originalBoxCount}`,
      'Weight': s.totalWeight ? `${s.totalWeight} kg` : 'N/A',
      'Received Date': new Date(s.receivedDate).toLocaleDateString(),
      'Arrival Date': s.arrivalDate ? new Date(s.arrivalDate).toLocaleDateString() : 'N/A',
      'Rack Locations': s.rackLocations || 'N/A',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Shipments');
    XLSX.writeFile(wb, `${data?.profile.name || 'Company'}_Shipments_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const loadCompanyInvoices = async () => {
    try {
      setInvoicesLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${getBackendUrl()}/api/billing/invoices?companyProfileId=${profileId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setAllInvoices(response.data?.invoices || response.data || []);
    } catch (error) {
      console.error('Error loading company invoices:', error);
    } finally {
      setInvoicesLoading(false);
    }
  };

  const getFilteredInvoices = () => {
    let filtered = allInvoices;

    if (invoiceStatusFilter !== 'all') {
      filtered = filtered.filter(i => i.paymentStatus === invoiceStatusFilter);
    }

    if (invoiceSearchTerm) {
      filtered = filtered.filter(i =>
        i.invoiceNumber?.toLowerCase().includes(invoiceSearchTerm.toLowerCase()) ||
        i.clientName?.toLowerCase().includes(invoiceSearchTerm.toLowerCase()) ||
        i.shipment?.referenceId?.toLowerCase().includes(invoiceSearchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const exportInvoicesToExcel = () => {
    const filtered = getFilteredInvoices();
    const exportData = filtered.map(i => {
      const totalAmount = parseFloat(`${i.totalAmount ?? 0}`);
      const paidAmount = parseFloat(`${i.paidAmount ?? 0}`);
      return ({
        'Invoice Number': i.invoiceNumber,
        'Client Name': i.clientName,
        'Shipment Ref': i.shipment?.referenceId || 'N/A',
        'Total Amount': formatNumber(totalAmount),
        'Paid Amount': formatNumber(paidAmount),
        'Outstanding': formatNumber(totalAmount - paidAmount),
        'Status': i.paymentStatus,
        'Invoice Date': new Date(i.invoiceDate).toLocaleDateString(),
        'Due Date': i.dueDate ? new Date(i.dueDate).toLocaleDateString() : 'N/A',
      });
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
    XLSX.writeFile(wb, `${data?.profile.name || 'Company'}_Invoices_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading company profile...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <BuildingOfficeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-700">Company not found</p>
          <button
            onClick={() => navigate('/shipments')}
            className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const { profile, stats, paymentMethods, monthlyRevenue, recentActivity } = data;

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Back
          </button>
          <div className="flex gap-3">
            <button className="inline-flex items-center px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold shadow-sm">
              <PrinterIcon className="h-5 w-5 mr-2" />
              Print Report
            </button>
            <button className="inline-flex items-center px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold shadow-sm">
              <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
              Export Data
            </button>
          </div>
        </div>

        <div className="flex items-start gap-6">
          {/* Company Logo */}
          <div className="flex-shrink-0 relative">
            {profile.logoUrl ? (
              <img
                src={profile.logoUrl}
                alt={profile.name}
                className="w-24 h-24 rounded-lg object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center border-2 border-gray-200">
                <BuildingOfficeIcon className="h-12 w-12 text-gray-400" />
              </div>
            )}
            {/* Contract Badge on Logo */}
            {contract && (
              <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full p-1.5 shadow-lg">
                <span className="text-sm">📄</span>
              </div>
            )}
          </div>

          {/* Company Info */}
          <div className="flex-1">
            {profile.isPlaceholder && profile.placeholderMessage && (
              <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                <strong>Heads up:</strong> {profile.placeholderMessage}
              </div>
            )}
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{profile.name}</h1>
              {contract && (
                <span className={`px-3 py-1 text-white text-sm font-bold rounded-full shadow-sm ${isContractExpired ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`}>
                  📄 {isContractExpired ? 'CONTRACT EXPIRED' : 'CONTRACT CUSTOMER'}
                </span>
              )}
            </div>
            {profile.description && (
              <p className="text-gray-600 mb-4">{profile.description}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {profile.contactPerson && (
                <div className="flex items-center gap-2 text-sm">
                  <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-700 font-medium">{profile.contactPerson}</span>
                </div>
              )}
              {profile.contactPhone && (
                <div className="flex items-center gap-2 text-sm">
                  <PhoneIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-700 font-medium">{profile.contactPhone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <CalendarIcon className="h-5 w-5 text-gray-400" />
                <span className="text-gray-700">
                  Member since {new Date(profile.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Total Business Value */}
          <div className="text-right">
            <p className="text-sm text-gray-600 mb-1">Total Business Value</p>
            <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.totalInvoiceAmount)}</p>
            <p className="text-sm text-gray-500">KWD</p>
          </div>
        </div>
      </div>

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Shipments */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <TruckIcon className="h-7 w-7 text-blue-600" />
            </div>
            <ChartBarIcon className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Total Shipments</p>
          <p className="text-3xl font-bold text-gray-900">{stats.totalShipments}</p>
          <p className="text-xs text-gray-500 mt-2">
            {stats.activeShipments} active • {stats.releasedShipments} released
          </p>
        </div>

        {/* Current Boxes */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-50 rounded-lg">
              <ArchiveBoxIcon className="h-7 w-7 text-purple-600" />
            </div>
            <ChartBarIcon className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Current Boxes</p>
          <p className="text-3xl font-bold text-gray-900">{stats.currentBoxes}</p>
          <p className="text-xs text-gray-500 mt-2">
            Total stored: {stats.totalBoxes} boxes
          </p>
        </div>

        {/* Total Invoices */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-50 rounded-lg">
              <DocumentTextIcon className="h-7 w-7 text-indigo-600" />
            </div>
            <ChartBarIcon className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Total Invoices</p>
          <p className="text-3xl font-bold text-gray-900">{stats.totalInvoices}</p>
          <p className="text-xs text-gray-500 mt-2">
            Avg: {formatNumber(stats.avgInvoiceAmount)} KWD
          </p>
        </div>

        {/* Paid Amount */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircleIcon className="h-7 w-7 text-green-600" />
            </div>
            <BanknotesIcon className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Paid Amount</p>
          <p className="text-3xl font-bold text-green-600">{formatNumber(stats.totalPaidAmount)}</p>
          <p className="text-xs text-gray-500 mt-2">
            {stats.paidInvoices} invoices paid
          </p>
        </div>

        {/* Outstanding Balance */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-50 rounded-lg">
              <CurrencyDollarIcon className="h-7 w-7 text-red-600" />
            </div>
            <XCircleIcon className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Outstanding</p>
          <p className="text-3xl font-bold text-red-600">{formatNumber(stats.outstandingBalance)}</p>
          <p className="text-xs text-gray-500 mt-2">
            {stats.pendingInvoices} pending • {stats.overdueInvoices} overdue
          </p>
        </div>

        {/* Contract Info - Only show if customer has contract */}
        {contract && (
          <div className={`bg-white rounded-lg shadow-sm border-2 p-6 hover:shadow-md transition-shadow ${isContractExpired ? 'border-red-500 bg-red-50' :
            contract.status === 'EXPIRED' ? 'border-red-500 bg-red-50' :
              contract.status === 'SUSPENDED' ? 'border-yellow-500 bg-yellow-50' :
                'border-blue-300'
            }`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${isContractExpired ? 'bg-red-100' : 'bg-blue-50'}`}>
                <DocumentTextIcon className={`h-7 w-7 ${isContractExpired ? 'text-red-600' : 'text-blue-600'}`} />
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs rounded-full ${contract.status === 'ACTIVE' && !isContractExpired ? 'bg-green-100 text-green-700' :
                  contract.status === 'SUSPENDED' ? 'bg-yellow-100 text-yellow-700' :
                    contract.status === 'EXPIRED' || isContractExpired ? 'bg-red-100 text-red-700' :
                      contract.status === 'PENDING' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                  }`}>
                  {isContractExpired ? 'EXPIRED' : contract.status}
                </span>
                <button
                  onClick={openEditContractModal}
                  className="p-1 hover:bg-blue-100 rounded-full transition-colors"
                  title="Edit Contract"
                >
                  <PencilSquareIcon className="h-5 w-5 text-blue-600" />
                </button>
              </div>
            </div>

            {/* Expired Warning */}
            {isContractExpired && (
              <div className="bg-red-100 border border-red-300 rounded-lg p-2 mb-3 flex items-center gap-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                <span className="text-xs text-red-700 font-medium">
                  CONTRACT EXPIRED - Storage/Release blocked until renewed
                </span>
              </div>
            )}

            <p className="text-sm font-medium text-gray-600 mb-1">📄 Contract</p>
            <p className={`text-3xl font-bold ${isContractExpired ? 'text-red-600' : 'text-blue-600'}`}>
              {formatNumber(contract.monthlyRate)} KWD
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Monthly Rate • Due: Day {contract.paymentDueDay || 25}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Max CBM: {contract.maxCBM ? formatNumber(contract.maxCBM) : '∞'}
              {' • '}
              Max Days: {contract.maxStorageDays ? contract.maxStorageDays : '∞'}
            </p>
            {contract.contractEndDate && (
              <p className={`text-xs mt-1 ${isContractExpired ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                Ends: {new Date(contract.contractEndDate).toLocaleDateString()}
                {isContractExpired && ' (EXPIRED)'}
              </p>
            )}
          </div>
        )}

        {/* Storage Duration */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-50 rounded-lg">
              <ClockIcon className="h-7 w-7 text-orange-600" />
            </div>
            <ChartBarIcon className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Avg Storage</p>
          <p className="text-3xl font-bold text-gray-900">{stats.avgStorageDays}</p>
          <p className="text-xs text-gray-500 mt-2">Days per shipment</p>
        </div>

        {/* Total Payments */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-teal-50 rounded-lg">
              <BanknotesIcon className="h-7 w-7 text-teal-600" />
            </div>
            <ChartBarIcon className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Total Payments</p>
          <p className="text-3xl font-bold text-gray-900">{stats.totalPayments}</p>
          <p className="text-xs text-gray-500 mt-2">Payment transactions</p>
        </div>

        {/* Partial Invoices */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-50 rounded-lg">
              <DocumentTextIcon className="h-7 w-7 text-yellow-600" />
            </div>
            <ChartBarIcon className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Partial Payments</p>
          <p className="text-3xl font-bold text-yellow-600">{stats.partialInvoices}</p>
          <p className="text-xs text-gray-500 mt-2">Partially paid invoices</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {[
              { key: 'overview', label: 'Overview', icon: ChartBarIcon },
              { key: 'shipments', label: 'Shipments', icon: TruckIcon },
              { key: 'invoices', label: 'Invoices', icon: DocumentTextIcon },
              { key: 'payments', label: 'Payments', icon: BanknotesIcon },
              ...(contract ? [{ key: 'contract-payments', label: 'Contract Billing', icon: CalendarIcon }] : []),
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 py-4 px-6 text-center font-semibold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === tab.key
                  ? 'border-b-4 border-gray-900 text-gray-900 bg-gray-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <tab.icon className="h-5 w-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Recent Activity */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <ClockIcon className="h-6 w-6 text-gray-700" />
                  Recent Activity
                </h3>

                {/* Recent Shipments */}
                {recentActivity.shipments.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Recent Shipments</h4>
                    <div className="space-y-2">
                      {recentActivity.shipments.map(shipment => (
                        <div key={shipment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-3">
                            <TruckIcon className="h-5 w-5 text-gray-500" />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{shipment.referenceId}</p>
                              <p className="text-xs text-gray-500">{shipment.clientName}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${shipment.status === 'RELEASED' ? 'bg-green-100 text-green-800' :
                              shipment.status === 'IN_WAREHOUSE' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                              {shipment.status}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(shipment.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Invoices */}
                {recentActivity.invoices.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Recent Invoices</h4>
                    <div className="space-y-2">
                      {recentActivity.invoices.map(invoice => (
                        <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-3">
                            <DocumentTextIcon className="h-5 w-5 text-gray-500" />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{invoice.invoiceNumber}</p>
                              <p className="text-xs text-gray-500">{formatNumber(invoice.totalAmount)} KWD</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${invoice.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' :
                              invoice.paymentStatus === 'PARTIAL' ? 'bg-blue-100 text-blue-800' :
                                invoice.paymentStatus === 'OVERDUE' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                              }`}>
                              {invoice.paymentStatus}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(invoice.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Payments */}
                {recentActivity.payments.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Recent Payments</h4>
                    <div className="space-y-2">
                      {recentActivity.payments.map(payment => (
                        <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-3">
                            <BanknotesIcon className="h-5 w-5 text-green-600" />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{formatNumber(payment.amount)} KWD</p>
                              <p className="text-xs text-gray-500">{payment.paymentMethod}</p>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500">
                            {new Date(payment.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Methods Breakdown */}
              {Object.keys(paymentMethods).length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <BanknotesIcon className="h-6 w-6 text-gray-700" />
                    Payment Methods
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(paymentMethods).map(([method, amount]) => {
                      const numericAmount = typeof amount === 'number'
                        ? amount
                        : parseFloat(`${amount ?? 0}`);
                      const safeAmount = Number.isFinite(numericAmount) ? numericAmount : 0;

                      return (
                        <div key={method} className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                          <p className="text-sm text-gray-600 mb-1">{method}</p>
                          <p className="text-xl font-bold text-gray-900">{formatNumber(safeAmount)}</p>
                          <p className="text-xs text-gray-500">KWD</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Monthly Revenue */}
              {monthlyRevenue.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <ChartBarIcon className="h-6 w-6 text-gray-700" />
                    Monthly Revenue (Last 6 Months)
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    {monthlyRevenue.map(month => {
                      const revenueValue = typeof month.revenue === 'number'
                        ? month.revenue
                        : parseFloat(`${month.revenue ?? 0}`);
                      const safeRevenue = Number.isFinite(revenueValue) ? revenueValue : 0;

                      return (
                        <div key={month.month} className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                          <p className="text-xs text-gray-600 mb-2">{month.month}</p>
                          <p className="text-lg font-bold text-gray-900">{formatNumber(safeRevenue, 0)}</p>
                          <p className="text-xs text-gray-500">{month.invoiceCount} invoices</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'shipments' && (
            <div className="space-y-4">
              {/* Filters Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by reference, client..."
                      value={shipmentSearchTerm}
                      onChange={(e) => setShipmentSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <FunnelIcon className="h-5 w-5 text-gray-500" />
                    <select
                      value={shipmentStatusFilter}
                      onChange={(e) => setShipmentStatusFilter(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-gray-400"
                    >
                      <option value="all">All Status</option>
                      <option value="PENDING">Pending</option>
                      <option value="IN_WAREHOUSE">In Warehouse</option>
                      <option value="RELEASED">Released</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={exportShipmentsToExcel}
                  className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-semibold shadow-sm"
                >
                  <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                  Export to Excel
                </button>
              </div>

              {/* Shipments Table */}
              {shipmentsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-gray-900 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading shipments...</p>
                </div>
              ) : getFilteredShipments().length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                  <TruckIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No shipments found</p>
                  <p className="text-sm text-gray-400 mt-2">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-900">
                      <tr>
                        <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Reference ID
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Client Info
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Boxes
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          CBM
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Days Stored
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Est. Charges
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Rack
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getFilteredShipments().map((shipment, index) => {
                        const charges = shipmentCharges[shipment.id];
                        return (
                          <tr
                            key={shipment.id}
                            className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                              }`}
                          >
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm font-bold text-gray-900">{shipment.referenceId}</div>
                              <div className="text-xs text-gray-500">{new Date(shipment.receivedDate).toLocaleDateString()}</div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-gray-900">{shipment.clientName}</div>
                              <div className="text-xs text-gray-500">{shipment.clientPhone}</div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`inline-block px-3 py-1 rounded-lg text-xs font-semibold ${shipment.status === 'RELEASED'
                                ? 'bg-green-100 text-green-800'
                                : shipment.status === 'IN_STORAGE'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                {shipment.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-gray-900">
                                {shipment.currentBoxCount} / {shipment.originalBoxCount}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-blue-600">
                                {shipment.cbm ? formatNumber(shipment.cbm) : 'N/A'}
                              </div>
                              <div className="text-xs text-gray-500">m³</div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              {shipment.status === 'IN_STORAGE' ? (
                                charges?.loading ? (
                                  <div className="animate-pulse h-4 w-12 bg-gray-200 rounded"></div>
                                ) : (
                                  <div className="text-sm font-medium text-gray-900">
                                    {charges?.daysStored || Math.ceil((new Date().getTime() - new Date(shipment.receivedDate).getTime()) / (1000 * 60 * 60 * 24))} days
                                  </div>
                                )
                              ) : (
                                <span className="text-xs text-gray-400">Released</span>
                              )}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              {shipment.status === 'IN_STORAGE' ? (
                                charges?.loading ? (
                                  <div className="animate-pulse h-4 w-16 bg-gray-200 rounded"></div>
                                ) : (
                                  <div className="text-sm font-bold text-green-600">
                                    {formatNumber(charges?.totalCharge || 0)} KWD
                                  </div>
                                )
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-700">
                                {shipment.rackLocations || shipment.rack?.code || 'N/A'}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <button
                                onClick={() => navigate(`/shipment-report/${shipment.id}`)}
                                className="text-sm font-semibold text-gray-900 hover:text-gray-600 underline"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Summary */}
              <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-gray-600 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <span>
                  Showing <span className="font-bold text-gray-900">{getFilteredShipments().length}</span> of{' '}
                  <span className="font-bold text-gray-900">{allShipments.length}</span> shipments
                </span>
                <div className="flex flex-wrap gap-4">
                  <span>
                    Total CBM: <span className="font-bold text-blue-600">
                      {formatNumber(getFilteredShipments().reduce((sum, s) => sum + (parseFloat(s.cbm) || 0), 0))} m³
                    </span>
                  </span>
                  <span>
                    Est. Charges (In-Storage): <span className="font-bold text-green-600">
                      {formatNumber(Object.values(shipmentCharges).reduce((sum, c) => sum + (c.totalCharge || 0), 0))} KWD
                    </span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="space-y-4">
              {/* Filters Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by invoice, client, shipment..."
                      value={invoiceSearchTerm}
                      onChange={(e) => setInvoiceSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <FunnelIcon className="h-5 w-5 text-gray-500" />
                    <select
                      value={invoiceStatusFilter}
                      onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-gray-400"
                    >
                      <option value="all">All Status</option>
                      <option value="PAID">Paid</option>
                      <option value="PARTIAL">Partial</option>
                      <option value="PENDING">Pending</option>
                      <option value="OVERDUE">Overdue</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={exportInvoicesToExcel}
                  className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-semibold shadow-sm"
                >
                  <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                  Export to Excel
                </button>
              </div>

              {/* Invoices Table */}
              {invoicesLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-gray-900 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading invoices...</p>
                </div>
              ) : getFilteredInvoices().length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                  <DocumentTextIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No invoices found</p>
                  <p className="text-sm text-gray-400 mt-2">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-900">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Invoice #
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Shipment Ref
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Total Amount
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Paid Amount
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Outstanding
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Invoice Date
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getFilteredInvoices().map((invoice, index) => {
                        const outstanding = parseFloat(invoice.totalAmount) - parseFloat(invoice.paidAmount || 0);
                        return (
                          <tr
                            key={invoice.id}
                            className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                              }`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-bold text-gray-900">{invoice.invoiceNumber}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-700">
                                {invoice.shipment?.referenceId || 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-bold text-gray-900">
                                {formatNumber(invoice.totalAmount)} KWD
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-bold text-green-600">
                                {formatNumber(invoice.paidAmount)} KWD
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`text-sm font-bold ${outstanding > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                {formatNumber(outstanding)} KWD
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-block px-3 py-1 rounded-lg text-xs font-semibold ${invoice.paymentStatus === 'PAID'
                                ? 'bg-green-100 text-green-800'
                                : invoice.paymentStatus === 'PARTIAL'
                                  ? 'bg-blue-100 text-blue-800'
                                  : invoice.paymentStatus === 'OVERDUE'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                {invoice.paymentStatus}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-700">
                                {new Date(invoice.invoiceDate).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => navigate(`/invoices/${invoice.id}`)}
                                className="text-sm font-semibold text-gray-900 hover:text-gray-600 underline"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Summary */}
              <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <span>
                  Showing <span className="font-bold text-gray-900">{getFilteredInvoices().length}</span> of{' '}
                  <span className="font-bold text-gray-900">{allInvoices.length}</span> invoices
                </span>
                <div className="flex items-center gap-6">
                  <span>
                    Total: <span className="font-bold text-gray-900">
                      {formatNumber(getFilteredInvoices().reduce((sum, i) => sum + parseFloat(`${i.totalAmount ?? 0}`), 0))} KWD
                    </span>
                  </span>
                  <span>
                    Paid: <span className="font-bold text-green-600">
                      {formatNumber(getFilteredInvoices().reduce((sum, i) => sum + parseFloat(`${i.paidAmount ?? 0}`), 0))} KWD
                    </span>
                  </span>
                  <span>
                    Outstanding: <span className="font-bold text-red-600">
                      {formatNumber(getFilteredInvoices().reduce((sum, i) => {
                        const totalAmount = parseFloat(`${i.totalAmount ?? 0}`);
                        const paidAmount = parseFloat(`${i.paidAmount ?? 0}`);
                        return sum + (totalAmount - paidAmount);
                      }, 0))} KWD
                    </span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="text-center py-12">
              <BanknotesIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Payments history will be shown here</p>
              <p className="text-sm text-gray-400 mt-2">Coming in next update</p>
            </div>
          )}

          {/* Contract Billing Tab - REMOVED as per user request to centralize in Finance */}
          {/* Contract Billing Tab - REMOVED as per user request to centralize in Finance */}
          {activeTab === 'contract-payments' && contract && (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <BanknotesIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Contract Billing Moved</h3>
              <p className="mt-2 text-gray-500 max-w-md mx-auto">
                Contract billing and payments have been moved to the centralized
                <span className="font-semibold text-primary-600"> Finance Dashboard</span>.
              </p>
              <button
                onClick={() => navigate('/finance')}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Go to Finance Dashboard
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Generate Contract Invoice Modal */}
      {showGenerateInvoiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 rounded-t-xl">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">Generate Contract Invoice</h3>
                <button
                  onClick={() => setShowGenerateInvoiceModal(false)}
                  className="text-white hover:text-blue-200"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600">Customer: <span className="font-semibold">{data?.profile?.name}</span></p>
                <p className="text-sm text-gray-600">Monthly Rate: <span className="font-semibold">{formatNumber(contract?.monthlyRate || 0)} KWD</span></p>
                {numberOfMonths > 1 && (
                  <p className="text-sm text-blue-600 font-semibold mt-1">
                    Total: {formatNumber((contract?.monthlyRate || 0) * numberOfMonths)} KWD ({numberOfMonths} months)
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Starting Month</label>
                  <select
                    value={invoiceMonth}
                    onChange={(e) => setInvoiceMonth(parseInt(e.target.value))}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                      <option key={m} value={m}>{new Date(2024, m - 1).toLocaleString('default', { month: 'long' })}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <select
                    value={invoiceYear}
                    onChange={(e) => setInvoiceYear(parseInt(e.target.value))}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {[2023, 2024, 2025, 2026].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Carry Forward - Multiple Months */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Months (Carry Forward)
                </label>
                <select
                  value={numberOfMonths}
                  onChange={(e) => setNumberOfMonths(parseInt(e.target.value))}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {[1, 2, 3, 4, 5, 6, 12].map(n => (
                    <option key={n} value={n}>{n} {n === 1 ? 'month' : 'months'} = {formatNumber((contract?.monthlyRate || 0) * n)} KWD</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Pay for multiple months at once. Contract extends {numberOfMonths * 30} days on full payment.
                </p>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => { setShowGenerateInvoiceModal(false); setNumberOfMonths(1); }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateContractInvoice}
                  disabled={generatingInvoice}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {generatingInvoice ? 'Generating...' : `Generate ${numberOfMonths > 1 ? numberOfMonths + '-Month ' : ''}Invoice`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showRecordPaymentModal && selectedInvoiceForPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 rounded-t-xl">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">💰 Record Payment</h3>
                <button
                  onClick={() => { setShowRecordPaymentModal(false); setSelectedInvoiceForPayment(null); }}
                  className="text-white hover:text-green-200"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Invoice: <span className="font-semibold">{selectedInvoiceForPayment.invoiceNumber}</span></p>
                <p className="text-sm text-gray-600">Total Amount: <span className="font-semibold">{formatNumber(selectedInvoiceForPayment.totalAmount)} KWD</span></p>
                <p className="text-sm text-gray-600">Already Paid: <span className="font-semibold text-green-600">{formatNumber(selectedInvoiceForPayment.paidAmount)} KWD</span></p>
                <p className="text-sm text-gray-600">Balance Due: <span className="font-semibold text-red-600">{formatNumber(Number(selectedInvoiceForPayment.totalAmount) - Number(selectedInvoiceForPayment.paidAmount))} KWD</span></p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount (KWD) *</label>
                  <input
                    type="number"
                    step="0.001"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CARD">Card</option>
                    <option value="KNET">KNET</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>

              {/* Transaction Reference - shows for card/bank */}
              {(paymentMethod === 'CARD' || paymentMethod === 'BANK_TRANSFER' || paymentMethod === 'KNET') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transaction Reference / Card Ref #
                  </label>
                  <input
                    type="text"
                    value={paymentTransactionRef}
                    onChange={(e) => setPaymentTransactionRef(e.target.value)}
                    placeholder="e.g., TXN-123456, Card approval #"
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              )}

              {/* Cheque Number - shows for cheque */}
              {paymentMethod === 'CHEQUE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cheque Number
                  </label>
                  <input
                    type="text"
                    value={paymentTransactionRef}
                    onChange={(e) => setPaymentTransactionRef(e.target.value)}
                    placeholder="e.g., CHQ-00123"
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Number</label>
                  <input
                    type="text"
                    value={paymentReceiptNumber}
                    onChange={(e) => setPaymentReceiptNumber(e.target.value)}
                    placeholder="e.g., RCP-001234"
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom Extend Days</label>
                  <input
                    type="number"
                    value={customExtendDays}
                    onChange={(e) => setCustomExtendDays(parseInt(e.target.value) || 0)}
                    placeholder="0 = Auto"
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">0 = Auto (30 days/month)</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Optional payment notes..."
                  rows={2}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              {paymentAmount >= (Number(selectedInvoiceForPayment.totalAmount) - Number(selectedInvoiceForPayment.paidAmount)) && (
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <p className="text-sm text-blue-700 font-medium">✨ Full payment will auto-extend contract!</p>
                  <p className="text-xs text-blue-600">
                    {customExtendDays > 0
                      ? `Custom extension: ${customExtendDays} days`
                      : 'Contract will be extended based on months billed (30 days/month)'}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowRecordPaymentModal(false);
                    setSelectedInvoiceForPayment(null);
                    setPaymentTransactionRef('');
                    setPaymentReceiptNumber('');
                    setPaymentNotes('');
                    setCustomExtendDays(0);
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRecordPayment}
                  disabled={recordingPayment || paymentAmount <= 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {recordingPayment ? 'Processing...' : `Record ${formatNumber(paymentAmount)} KWD Payment`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Contract Modal */}
      {showEditContractModal && contract && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 rounded-t-xl sticky top-0">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <DocumentTextIcon className="h-6 w-6 text-white" />
                  <h3 className="text-lg font-semibold text-white">Edit Contract</h3>
                </div>
                <button
                  onClick={() => setShowEditContractModal(false)}
                  className="text-white hover:text-blue-200"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Customer Info */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-600">Customer</p>
                <p className="font-semibold text-gray-900">{data?.profile?.name}</p>
              </div>

              {/* Monthly Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  💰 Monthly Rate (KWD) *
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={editContractData.monthlyRate}
                  onChange={(e) => setEditContractData({
                    ...editContractData,
                    monthlyRate: parseFloat(e.target.value) || 0
                  })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Fixed monthly payment amount</p>
              </div>

              {/* Payment Due Day */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  📅 Payment Due Day (1-31)
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={editContractData.paymentDueDay}
                  onChange={(e) => setEditContractData({
                    ...editContractData,
                    paymentDueDay: parseInt(e.target.value) || 25
                  })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Day of month when payment is due</p>
              </div>

              {/* CBM Limit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  📦 Max CBM Allowed (leave 0 for unlimited)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={editContractData.maxCBM}
                  onChange={(e) => setEditContractData({
                    ...editContractData,
                    maxCBM: parseFloat(e.target.value) || 0
                  })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Maximum CBM this customer can store. Set 0 for no limit.</p>
              </div>

              {/* Storage Days Limit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  🕐 Max Storage Days (leave 0 for unlimited)
                </label>
                <input
                  type="number"
                  value={editContractData.maxStorageDays}
                  onChange={(e) => setEditContractData({
                    ...editContractData,
                    maxStorageDays: parseInt(e.target.value) || 0
                  })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Maximum days goods can be stored. Set 0 for no limit.</p>
              </div>

              {/* Contract Period */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    📆 Start Date
                  </label>
                  <input
                    type="date"
                    value={editContractData.contractStartDate}
                    onChange={(e) => setEditContractData({
                      ...editContractData,
                      contractStartDate: e.target.value
                    })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    📆 End Date
                  </label>
                  <input
                    type="date"
                    value={editContractData.contractEndDate}
                    onChange={(e) => setEditContractData({
                      ...editContractData,
                      contractEndDate: e.target.value
                    })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty for no expiry</p>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  🔄 Status
                </label>
                <select
                  value={editContractData.status}
                  onChange={(e) => setEditContractData({
                    ...editContractData,
                    status: e.target.value
                  })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="ACTIVE">ACTIVE - Normal operations</option>
                  <option value="PENDING">PENDING - Awaiting activation</option>
                  <option value="SUSPENDED">SUSPENDED - Temporarily suspended</option>
                  <option value="EXPIRED">EXPIRED - Contract expired</option>
                  <option value="CANCELLED">CANCELLED - Contract cancelled</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  📝 Notes (Optional)
                </label>
                <textarea
                  value={editContractData.notes}
                  onChange={(e) => setEditContractData({
                    ...editContractData,
                    notes: e.target.value
                  })}
                  placeholder="Reason for changes..."
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Warning if expired */}
              {editContractData.contractEndDate && new Date(editContractData.contractEndDate) < new Date() && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                  <span className="text-sm text-red-700">
                    Warning: End date is in the past. Customer will be blocked from storage/release.
                  </span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end gap-3 sticky bottom-0">
              <button
                onClick={() => setShowEditContractModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveContract}
                disabled={savingContract}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors flex items-center gap-2"
              >
                {savingContract ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>Save Changes</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
