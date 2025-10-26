// Dashboard API Routes (Parse version)
import express from 'express';
import Parse from '../config/parse';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

const withCompanyFilter = (query: Parse.Query, companyId: string | null) => {
  if (companyId) {
    query.equalTo('companyId', companyId);
  }
  return query;
};

const toNumber = (value: any): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics and overview data (Parse)
 */
router.get('/dashboard/stats', async (req: AuthRequest, res) => {
  try {
    const companyId = req.user?.companyId ?? null;

    const countWithStatus = async (className: string, status?: string) => {
      const query = withCompanyFilter(new Parse.Query(className), companyId);
      if (status) {
        query.equalTo('status', status);
      }
      return query.count({ useMasterKey: true });
    };

    const [
      totalShipments,
      pendingShipments,
      inStorageShipments,
      releasedShipments,
      totalRacks,
      activeRacks,
      totalJobs,
      scheduledJobs,
      inProgressJobs,
      completedJobs,
    ] = await Promise.all([
      countWithStatus('Shipment'),
      countWithStatus('Shipment', 'PENDING'),
      countWithStatus('Shipment', 'IN_STORAGE'),
      countWithStatus('Shipment', 'RELEASED'),
      countWithStatus('Rack'),
      countWithStatus('Rack', 'ACTIVE'),
      countWithStatus('MovingJob'),
      countWithStatus('MovingJob', 'SCHEDULED'),
      countWithStatus('MovingJob', 'IN_PROGRESS'),
      countWithStatus('MovingJob', 'COMPLETED'),
    ]);

    const activeRackQuery = withCompanyFilter(new Parse.Query('Rack'), companyId);
    activeRackQuery.equalTo('status', 'ACTIVE');
    activeRackQuery.limit(1000);
    const activeRackRecords = await activeRackQuery.find({ useMasterKey: true });

    const totalCapacity = activeRackRecords.reduce((sum, rack: any) => sum + toNumber(rack.get('capacityTotal')), 0);
    const usedCapacity = activeRackRecords.reduce((sum, rack: any) => sum + toNumber(rack.get('capacityUsed')), 0);
    const rackUtilization = totalCapacity > 0 ? Math.round((usedCapacity / totalCapacity) * 100) : 0;

    const revenueQuery = withCompanyFilter(new Parse.Query('JobCostSnapshot'), companyId);
    revenueQuery.limit(1000);
    const costSnapshots = await revenueQuery.find({ useMasterKey: true });
    const totalRevenue = costSnapshots.reduce((sum, snapshot: any) => sum + toNumber(snapshot.get('revenue')), 0);

    const invoiceQuery = withCompanyFilter(new Parse.Query('Invoice'), companyId);
    invoiceQuery.limit(1000);
    const invoices = await invoiceQuery.find({ useMasterKey: true });
    const invoiceRevenue = invoices.reduce(
      (acc, invoice: any) => {
        const totalAmount = toNumber(invoice.get('totalAmount'));
        const paidAmount = toNumber(invoice.get('paidAmount'));
        const paymentStatus = invoice.get('paymentStatus');

        acc.total += totalAmount;
        acc.paid += paidAmount;
        acc.outstanding += totalAmount - paidAmount;
        acc.count += 1;
        if (paymentStatus === 'PAID') {
          acc.paidCount += 1;
        }
        return acc;
      },
      { total: 0, paid: 0, outstanding: 0, count: 0, paidCount: 0 }
    );

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthRevenue = invoices.reduce((sum, invoice: any) => {
      const invoiceDate = invoice.get('invoiceDate');
      if (invoiceDate && new Date(invoiceDate) >= firstDayOfMonth) {
        return sum + toNumber(invoice.get('paidAmount'));
      }
      return sum;
    }, 0);

    const withdrawalQuery = withCompanyFilter(new Parse.Query('Withdrawal'), companyId);
    const [totalWithdrawals, thisMonthWithdrawals] = await Promise.all([
      withdrawalQuery.count({ useMasterKey: true }),
      (() => {
        const monthQuery = withCompanyFilter(new Parse.Query('Withdrawal'), companyId);
        monthQuery.greaterThanOrEqualTo('withdrawalDate', firstDayOfMonth);
        return monthQuery.count({ useMasterKey: true });
      })(),
    ]);

    const topClientMap = new Map<string, { name: string; totalInvoices: number; totalAmount: number }>();
    invoices.forEach((invoice: any) => {
      const clientName = invoice.get('clientName') || 'Unknown Client';
      const entry = topClientMap.get(clientName) || { name: clientName, totalInvoices: 0, totalAmount: 0 };
      entry.totalInvoices += 1;
      entry.totalAmount += toNumber(invoice.get('totalAmount'));
      topClientMap.set(clientName, entry);
    });

    const topClients = Array.from(topClientMap.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5)
      .map(client => ({
        name: client.name,
        totalInvoices: client.totalInvoices,
        shipments: client.totalInvoices,
        totalAmount: client.totalAmount,
        revenue: client.totalAmount,
        currency: 'KWD',
      }));

    const racksForSectionsQuery = withCompanyFilter(new Parse.Query('Rack'), companyId);
    racksForSectionsQuery.limit(1000);
    const rackRecords = await racksForSectionsQuery.find({ useMasterKey: true });
    const storageSectionMap = new Map<string, { section: string; totalRacks: number; capacityTotal: number; capacityUsed: number }>();

    rackRecords.forEach((rack: any) => {
      const sectionName = rack.get('rackType') || 'General';
      const entry = storageSectionMap.get(sectionName) || { section: sectionName, totalRacks: 0, capacityTotal: 0, capacityUsed: 0 };
      entry.totalRacks += 1;
      entry.capacityTotal += toNumber(rack.get('capacityTotal'));
      entry.capacityUsed += toNumber(rack.get('capacityUsed'));
      storageSectionMap.set(sectionName, entry);
    });

    const storageBySection = Array.from(storageSectionMap.values()).map(section => ({
      section: section.section,
      totalRacks: section.totalRacks,
      capacityTotal: section.capacityTotal,
      capacityUsed: section.capacityUsed,
      utilization: section.capacityTotal > 0 ? Math.round((section.capacityUsed / section.capacityTotal) * 100) : 0,
    }));

    const recentShipmentsQuery = withCompanyFilter(new Parse.Query('Shipment'), companyId);
    recentShipmentsQuery.descending('createdAt');
    recentShipmentsQuery.limit(5);
    const recentShipments = await recentShipmentsQuery.find({ useMasterKey: true });

    const recentJobsQuery = withCompanyFilter(new Parse.Query('MovingJob'), companyId);
    recentJobsQuery.descending('createdAt');
    recentJobsQuery.limit(5);
    const recentJobs = await recentJobsQuery.find({ useMasterKey: true });

    const recentActivitiesQuery = withCompanyFilter(new Parse.Query('RackActivity'), companyId);
    recentActivitiesQuery.include('rack');
    recentActivitiesQuery.include('user');
    recentActivitiesQuery.descending('createdAt');
    recentActivitiesQuery.limit(5);
    const rackActivities = await recentActivitiesQuery.find({ useMasterKey: true });

    // Return data matching the legacy Prisma structure so the React dashboard keeps working.
    res.json({
      stats: {
        shipments: {
          total: totalShipments,
          active: inStorageShipments,
          pending: pendingShipments,
        },
        racks: {
          total: totalRacks,
          active: activeRacks,
          utilization: rackUtilization,
          capacity: {
            total: totalCapacity,
            used: usedCapacity,
            available: Math.max(totalCapacity - usedCapacity, 0),
          },
        },
        jobs: {
          total: totalJobs,
          scheduled: scheduledJobs,
          inProgress: inProgressJobs,
          completed: completedJobs,
        },
        revenue: {
          total: totalRevenue,
          currency: 'KWD',
        },
        invoiceRevenue: {
          total: invoiceRevenue.total,
          paid: invoiceRevenue.paid,
          outstanding: invoiceRevenue.outstanding,
          count: invoiceRevenue.count,
          paidCount: invoiceRevenue.paidCount,
          currency: 'KWD',
        },
        thisMonthRevenue: {
          amount: thisMonthRevenue,
          currency: 'KWD',
        },
        withdrawals: {
          total: totalWithdrawals,
          thisMonth: thisMonthWithdrawals,
        },
        shipmentStatusBreakdown: {
          pending: pendingShipments,
          inStorage: inStorageShipments,
          released: releasedShipments,
          total: totalShipments,
        },
      },
      topClients,
      storageBySection,
      recentShipments: recentShipments.map((shipment: any) => ({
        id: shipment.id,
        referenceId: shipment.get('referenceId') || shipment.get('trackingNumber') || shipment.id,
        clientName: shipment.get('clientName') || shipment.get('customerName') || 'Unknown Client',
        currentBoxCount: toNumber(shipment.get('currentBoxCount')),
        status: shipment.get('status') || 'PENDING',
        createdAt: shipment.get('createdAt'),
      })),
      recentJobs: recentJobs.map((job: any) => ({
        id: job.id,
        title: job.get('jobTitle') || job.get('jobCode') || 'Moving Job',
        clientName: job.get('clientName') || 'Unknown Client',
        jobType: job.get('jobType') || 'GENERAL',
        scheduledDate: job.get('jobDate') || job.get('createdAt'),
        status: job.get('status') || 'SCHEDULED',
      })),
      recentActivities: rackActivities.map((activity: any) => {
        const rack = activity.get('rack');
        const user = activity.get('user');
        return {
          id: activity.id,
          activityType: activity.get('activityType') || 'SYSTEM',
          description: activity.get('notes') || activity.get('itemDetails') || 'Activity recorded',
          rack: rack ? { code: rack.get('code') || rack.get('rackType') } : null,
          user: user ? { name: user.get('name') || user.get('email') || 'User' } : null,
          timestamp: activity.get('timestamp') || activity.get('createdAt'),
        };
      }),
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
