// Dashboard API Routes (Parse version)
import express from 'express';
import Parse from '../config/parse';

const router = express.Router();

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics and overview data
 */
router.get('/dashboard/stats', async (req, res) => {
  try {
    // Get counts from different collections
    const shipmentQuery = new Parse.Query('Shipment');
    const shipmentCount = await shipmentQuery.count({ useMasterKey: true });

    const movingJobQuery = new Parse.Query('MovingJob');
    const movingJobCount = await movingJobQuery.count({ useMasterKey: true });

    const userQuery = new Parse.Query(Parse.User);
    const userCount = await userQuery.count({ useMasterKey: true });

    const rackQuery = new Parse.Query('Rack');
    const rackCount = await rackQuery.count({ useMasterKey: true });

    // Get active shipments
    const activeShipmentsQuery = new Parse.Query('Shipment');
    activeShipmentsQuery.equalTo('status', 'ACTIVE');
    const activeShipments = await activeShipmentsQuery.count({ useMasterKey: true });

    // Get pending shipments
    const pendingShipmentsQuery = new Parse.Query('Shipment');
    pendingShipmentsQuery.equalTo('status', 'PENDING');
    const pendingShipments = await pendingShipmentsQuery.count({ useMasterKey: true });

    // Get active moving jobs
    const activeJobsQuery = new Parse.Query('MovingJob');
    activeJobsQuery.equalTo('status', 'IN_PROGRESS');
    const activeJobs = await activeJobsQuery.count({ useMasterKey: true });

    // Calculate total revenue (from invoices if available)
    let totalRevenue = 0;
    try {
      const invoiceQuery = new Parse.Query('Invoice');
      invoiceQuery.equalTo('status', 'PAID');
      const invoices = await invoiceQuery.find({ useMasterKey: true });
      totalRevenue = invoices.reduce((sum: number, inv: any) => sum + (inv.get('totalAmount') || 0), 0);
    } catch (e) {
      // Invoice table might not exist yet
      totalRevenue = 0;
    }

    // Get recent shipments
    const recentShipmentsQuery = new Parse.Query('Shipment');
    recentShipmentsQuery.descending('createdAt');
    recentShipmentsQuery.limit(5);
    const recentShipments = await recentShipmentsQuery.find({ useMasterKey: true });

    // Get recent moving jobs
    const recentJobsQuery = new Parse.Query('MovingJob');
    recentJobsQuery.descending('createdAt');
    recentJobsQuery.limit(5);
    const recentJobs = await recentJobsQuery.find({ useMasterKey: true });

    // Get storage by section (rack utilization)
    const racks = await rackQuery.find({ useMasterKey: true });
    const storageBySection = racks.map((rack: any) => ({
      name: rack.get('name') || rack.get('code'),
      value: rack.get('occupiedCapacity') || 0,
      total: rack.get('totalCapacity') || 100,
      percentage: Math.round(((rack.get('occupiedCapacity') || 0) / (rack.get('totalCapacity') || 100)) * 100)
    }));

    // Get top clients (companies with most shipments)
    const companyQuery = new Parse.Query('Company');
    const companies = await companyQuery.find({ useMasterKey: true });
    const topClients = companies.slice(0, 5).map((company: any) => ({
      name: company.get('name'),
      shipments: 0, // TODO: Count shipments per company
      revenue: 0,
    }));

    // Recent activities (simplified for now)
    const recentActivities = [
      ...recentShipments.slice(0, 3).map((s: any) => ({
        id: s.id,
        type: 'shipment',
        action: 'created',
        description: `New shipment ${s.get('trackingNumber') || s.id}`,
        timestamp: s.get('createdAt'),
      })),
      ...recentJobs.slice(0, 2).map((j: any) => ({
        id: j.id,
        type: 'job',
        action: 'created',
        description: `New moving job ${j.get('jobNumber') || j.id}`,
        timestamp: j.get('createdAt'),
      }))
    ].sort((a, b) => b.timestamp - a.timestamp);

    res.json({
      success: true,
      stats: {
        totalShipments: shipmentCount,
        activeShipments,
        pendingShipments,
        totalMovingJobs: movingJobCount,
        activeJobs,
        totalUsers: userCount,
        totalRacks: rackCount,
        totalRevenue,
        rackUtilization: racks.length > 0 
          ? Math.round((racks.reduce((sum: number, r: any) => sum + (r.get('occupiedCapacity') || 0), 0) / 
             racks.reduce((sum: number, r: any) => sum + (r.get('totalCapacity') || 100), 0)) * 100)
          : 0,
      },
      topClients,
      storageBySection,
      recentShipments: recentShipments.map((s: any) => ({
        id: s.id,
        trackingNumber: s.get('trackingNumber'),
        status: s.get('status'),
        customerName: s.get('customerName'),
        createdAt: s.get('createdAt'),
      })),
      recentJobs: recentJobs.map((j: any) => ({
        id: j.id,
        jobNumber: j.get('jobNumber'),
        status: j.get('status'),
        customerName: j.get('customerName'),
        scheduledDate: j.get('scheduledDate'),
        createdAt: j.get('createdAt'),
      })),
      recentActivities,
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

export default router;
