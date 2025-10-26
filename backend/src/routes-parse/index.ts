// Auto-generated Parse routes
import express from 'express';
// 🔐 Authentication & File Upload
import authRoutes from './auth';
import uploadRoutes from './upload';
// 📊 Material Reports
import materialReportsRoutes from './material-reports';
// Auto-generated model routes
import companyRoutes from './company';
import userRoutes from './user';
import rackRoutes from './rack';
import rackinventoryRoutes from './rackinventory';
import rackactivityRoutes from './rackactivity';
import shipmentRoutes from './shipment';
import shipmentboxRoutes from './shipmentbox';
import shipmentitemRoutes from './shipmentitem';
import withdrawalRoutes from './withdrawal';
import expenseRoutes from './expense';
import invoicesettingsRoutes from './invoicesettings';
import billingsettingsRoutes from './billingsettings';
import chargetypeRoutes from './chargetype';
import invoiceRoutes from './invoice';
import invoicelineitemRoutes from './invoicelineitem';
import paymentRoutes from './payment';
import shipmentchargesRoutes from './shipmentcharges';
import customfieldRoutes from './customfield';
import customfieldvalueRoutes from './customfieldvalue';
import shipmentsettingsRoutes from './shipmentsettings';
import templatesettingsRoutes from './templatesettings';
import permissionRoutes from './permission';
import rolepermissionRoutes from './rolepermission';
import movingjobRoutes from './movingjob';
import jobassignmentRoutes from './jobassignment';
import materialcategoryRoutes from './materialcategory';
import packingmaterialRoutes from './packingmaterial';
import vendorRoutes from './vendor';
import stockbatchRoutes from './stockbatch';
import rackstocklevelRoutes from './rackstocklevel';
import materialissueRoutes from './materialissue';
import materialreturnRoutes from './materialreturn';
import materialdamageRoutes from './materialdamage';
import materialapprovalRoutes from './materialapproval';
import jobcostsnapshotRoutes from './jobcostsnapshot';
import systempluginRoutes from './systemplugin';
import systempluginlogRoutes from './systempluginlog';
import materialusageRoutes from './materialusage';
import materialtransferRoutes from './materialtransfer';
import stockalertRoutes from './stockalert';
import purchaseorderRoutes from './purchaseorder';
import purchaseorderitemRoutes from './purchaseorderitem';
import materialpricehistoryRoutes from './materialpricehistory';

export function registerParseRoutes(app: express.Application) {
  // 🔐 Auth & Upload routes (priority)
  app.use('/api/auth', authRoutes);
  app.use('/api/upload', uploadRoutes);
  
  // 📊 Material Reports (before model routes)
  app.use('/api', materialReportsRoutes);
  
  // Auto-generated model routes
  app.use('/api', companyRoutes);
  app.use('/api', userRoutes);
  app.use('/api', rackRoutes);
  app.use('/api', rackinventoryRoutes);
  app.use('/api', rackactivityRoutes);
  app.use('/api', shipmentRoutes);
  app.use('/api', shipmentboxRoutes);
  app.use('/api', shipmentitemRoutes);
  app.use('/api', withdrawalRoutes);
  app.use('/api', expenseRoutes);
  app.use('/api', invoicesettingsRoutes);
  app.use('/api', billingsettingsRoutes);
  app.use('/api', chargetypeRoutes);
  app.use('/api', invoiceRoutes);
  app.use('/api', invoicelineitemRoutes);
  app.use('/api', paymentRoutes);
  app.use('/api', shipmentchargesRoutes);
  app.use('/api', customfieldRoutes);
  app.use('/api', customfieldvalueRoutes);
  app.use('/api', shipmentsettingsRoutes);
  app.use('/api', templatesettingsRoutes);
  app.use('/api', permissionRoutes);
  app.use('/api', rolepermissionRoutes);
  app.use('/api', movingjobRoutes);
  app.use('/api', jobassignmentRoutes);
  app.use('/api', materialcategoryRoutes);
  app.use('/api', packingmaterialRoutes);
  app.use('/api', vendorRoutes);
  app.use('/api', stockbatchRoutes);
  app.use('/api', rackstocklevelRoutes);
  app.use('/api', materialissueRoutes);
  app.use('/api', materialreturnRoutes);
  app.use('/api', materialdamageRoutes);
  app.use('/api', materialapprovalRoutes);
  app.use('/api', jobcostsnapshotRoutes);
  app.use('/api', systempluginRoutes);
  app.use('/api', systempluginlogRoutes);
  app.use('/api', materialusageRoutes);
  app.use('/api', materialtransferRoutes);
  app.use('/api', stockalertRoutes);
  app.use('/api', purchaseorderRoutes);
  app.use('/api', purchaseorderitemRoutes);
  app.use('/api', materialpricehistoryRoutes);
}
