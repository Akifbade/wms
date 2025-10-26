// Material Reports API Routes (Parse version)
import express from 'express';
import Parse from '../config/parse';

const router = express.Router();

/**
 * GET /api/materials/reports/stock-summary
 * Get stock summary with totals
 */
router.get('/materials/reports/stock-summary', async (req, res) => {
  try {
    // Query all materials
    const query = new Parse.Query('Material');
    const materials = await query.find({ useMasterKey: true });

    // Calculate summary
    const summary = materials.map((material: any) => ({
      id: material.id,
      name: material.get('name'),
      category: material.get('category'),
      currentStock: material.get('currentStock') || 0,
      minStock: material.get('minStock') || 0,
      maxStock: material.get('maxStock') || 0,
      unit: material.get('unit'),
      unitPrice: material.get('unitPrice') || 0,
      totalValue: (material.get('currentStock') || 0) * (material.get('unitPrice') || 0),
      status: material.get('status') || 'active',
    }));

    // Calculate totals
    const totals = {
      totalMaterials: materials.length,
      lowStockItems: summary.filter((m: any) => m.currentStock <= m.minStock).length,
      outOfStockItems: summary.filter((m: any) => m.currentStock === 0).length,
      totalValue: summary.reduce((sum: number, m: any) => sum + m.totalValue, 0),
    };

    res.json({
      success: true,
      summary,
      totals,
    });
  } catch (error: any) {
    console.error('Stock summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/materials/reports/low-stock
 * Get materials with low stock
 */
router.get('/materials/reports/low-stock', async (req, res) => {
  try {
    const query = new Parse.Query('Material');
    const materials = await query.find({ useMasterKey: true });

    const lowStockAlerts = materials
      .map((material: any) => ({
        id: material.id,
        name: material.get('name'),
        category: material.get('category'),
        currentStock: material.get('currentStock') || 0,
        minStock: material.get('minStock') || 0,
        unit: material.get('unit'),
        shortage: (material.get('minStock') || 0) - (material.get('currentStock') || 0),
      }))
      .filter((m: any) => m.currentStock <= m.minStock)
      .sort((a: any, b: any) => b.shortage - a.shortage);

    res.json({
      success: true,
      lowStockAlerts,
    });
  } catch (error: any) {
    console.error('Low stock error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/materials/reports/consumption
 * Get material consumption data
 */
router.get('/materials/reports/consumption', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Query material issues (consumption)
    const query = new Parse.Query('MaterialIssue');
    
    if (startDate) {
      query.greaterThanOrEqualTo('createdAt', new Date(startDate as string));
    }
    if (endDate) {
      query.lessThanOrEqualTo('createdAt', new Date(endDate as string));
    }

    const issues = await query.find({ useMasterKey: true });

    // Aggregate by material
    const consumptionMap: any = {};
    
    issues.forEach((issue: any) => {
      const materialId = issue.get('materialId');
      const quantity = issue.get('quantity') || 0;
      
      if (!consumptionMap[materialId]) {
        consumptionMap[materialId] = {
          materialId,
          materialName: issue.get('materialName'),
          totalConsumed: 0,
          issueCount: 0,
        };
      }
      
      consumptionMap[materialId].totalConsumed += quantity;
      consumptionMap[materialId].issueCount += 1;
    });

    const consumptionData = Object.values(consumptionMap);

    res.json({
      success: true,
      consumptionData,
      summary: {
        totalIssues: issues.length,
        dateRange: { startDate, endDate },
      },
    });
  } catch (error: any) {
    console.error('Consumption report error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/materials/reports/purchase-history
 * Get purchase history
 */
router.get('/materials/reports/purchase-history', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Query material transactions (purchases)
    const query = new Parse.Query('MaterialTransaction');
    query.equalTo('type', 'PURCHASE');
    
    if (startDate) {
      query.greaterThanOrEqualTo('createdAt', new Date(startDate as string));
    }
    if (endDate) {
      query.lessThanOrEqualTo('createdAt', new Date(endDate as string));
    }

    const purchases = await query.find({ useMasterKey: true });

    const purchaseHistory = purchases.map((purchase: any) => ({
      id: purchase.id,
      date: purchase.get('createdAt'),
      materialName: purchase.get('materialName'),
      quantity: purchase.get('quantity'),
      unitPrice: purchase.get('unitPrice'),
      totalAmount: purchase.get('totalAmount'),
      vendor: purchase.get('vendor'),
      reference: purchase.get('reference'),
    }));

    const totalSpent = purchaseHistory.reduce((sum: number, p: any) => sum + (p.totalAmount || 0), 0);

    res.json({
      success: true,
      purchases: purchaseHistory,
      summary: {
        totalPurchases: purchases.length,
        totalSpent,
        dateRange: { startDate, endDate },
      },
    });
  } catch (error: any) {
    console.error('Purchase history error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/materials/reports/vendor-performance
 * Get vendor performance data
 */
router.get('/materials/reports/vendor-performance', async (req, res) => {
  try {
    const query = new Parse.Query('MaterialTransaction');
    query.equalTo('type', 'PURCHASE');
    const purchases = await query.find({ useMasterKey: true });

    // Aggregate by vendor
    const vendorMap: any = {};
    
    purchases.forEach((purchase: any) => {
      const vendor = purchase.get('vendor') || 'Unknown';
      
      if (!vendorMap[vendor]) {
        vendorMap[vendor] = {
          vendor,
          totalPurchases: 0,
          totalAmount: 0,
          itemCount: 0,
        };
      }
      
      vendorMap[vendor].totalPurchases += 1;
      vendorMap[vendor].totalAmount += purchase.get('totalAmount') || 0;
      vendorMap[vendor].itemCount += purchase.get('quantity') || 0;
    });

    const vendors = Object.values(vendorMap);

    res.json({
      success: true,
      vendors,
    });
  } catch (error: any) {
    console.error('Vendor performance error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/materials/reports/valuation
 * Get inventory valuation
 */
router.get('/materials/reports/valuation', async (req, res) => {
  try {
    const query = new Parse.Query('Material');
    const materials = await query.find({ useMasterKey: true });

    const valuationData = materials.map((material: any) => ({
      id: material.id,
      name: material.get('name'),
      category: material.get('category'),
      currentStock: material.get('currentStock') || 0,
      unitPrice: material.get('unitPrice') || 0,
      totalValue: (material.get('currentStock') || 0) * (material.get('unitPrice') || 0),
    }));

    const totalValuation = valuationData.reduce((sum: number, m: any) => sum + m.totalValue, 0);

    // Group by category
    const categoryValuation: any = {};
    valuationData.forEach((item: any) => {
      const cat = item.category || 'Uncategorized';
      if (!categoryValuation[cat]) {
        categoryValuation[cat] = { category: cat, totalValue: 0, itemCount: 0 };
      }
      categoryValuation[cat].totalValue += item.totalValue;
      categoryValuation[cat].itemCount += 1;
    });

    res.json({
      success: true,
      totalValuation,
      byCategory: Object.values(categoryValuation),
      items: valuationData,
    });
  } catch (error: any) {
    console.error('Valuation error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
