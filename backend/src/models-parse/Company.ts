// Parse Class: Company
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class Company extends Parse.Object {
  constructor() {
    super('Company');
  }

  getName(): string {
    return this.get('name');
  }

  setName(value: string): void {
    this.set('name', value);
  }

  getEmail(): string {
    return this.get('email');
  }

  setEmail(value: string): void {
    this.set('email', value);
  }

  getPhone(): string {
    return this.get('phone');
  }

  setPhone(value: string): void {
    this.set('phone', value);
  }

  getAddress(): string {
    return this.get('address');
  }

  setAddress(value: string): void {
    this.set('address', value);
  }

  getWebsite(): string {
    return this.get('website');
  }

  setWebsite(value: string): void {
    this.set('website', value);
  }

  getLogo(): string {
    return this.get('logo');
  }

  setLogo(value: string): void {
    this.set('logo', value);
  }

  getPlan(): string {
    return this.get('plan');
  }

  setPlan(value: string): void {
    this.set('plan', value);
  }

  getRatePerDay(): number {
    return this.get('ratePerDay');
  }

  setRatePerDay(value: number): void {
    this.set('ratePerDay', value);
  }

  getCurrency(): string {
    return this.get('currency');
  }

  setCurrency(value: string): void {
    this.set('currency', value);
  }

  getIsActive(): boolean {
    return this.get('isActive');
  }

  setIsActive(value: boolean): void {
    this.set('isActive', value);
  }

  getPrimaryColor(): string {
    return this.get('primaryColor');
  }

  setPrimaryColor(value: string): void {
    this.set('primaryColor', value);
  }

  getSecondaryColor(): string {
    return this.get('secondaryColor');
  }

  setSecondaryColor(value: string): void {
    this.set('secondaryColor', value);
  }

  getAccentColor(): string {
    return this.get('accentColor');
  }

  setAccentColor(value: string): void {
    this.set('accentColor', value);
  }

  getShowCompanyName(): boolean {
    return this.get('showCompanyName');
  }

  setShowCompanyName(value: boolean): void {
    this.set('showCompanyName', value);
  }

  getLogoSize(): string {
    return this.get('logoSize');
  }

  setLogoSize(value: string): void {
    this.set('logoSize', value);
  }

  getCreatedAt(): Date {
    return this.get('createdAt');
  }

  setCreatedAt(value: Date): void {
    this.set('createdAt', value);
  }

  getUpdatedAt(): Date {
    return this.get('updatedAt');
  }

  setUpdatedAt(value: Date): void {
    this.set('updatedAt', value);
  }

  getUsers(): any {
    return this.get('users');
  }

  setUsers(value: any): void {
    this.set('users', value);
  }

  getRacks(): any {
    return this.get('racks');
  }

  setRacks(value: any): void {
    this.set('racks', value);
  }

  getShipments(): any {
    return this.get('shipments');
  }

  setShipments(value: any): void {
    this.set('shipments', value);
  }

  getMovingJobs(): any {
    return this.get('movingJobs');
  }

  setMovingJobs(value: any): void {
    this.set('movingJobs', value);
  }

  getExpenses(): any {
    return this.get('expenses');
  }

  setExpenses(value: any): void {
    this.set('expenses', value);
  }

  getInvoiceSettings(): any {
    return this.get('invoiceSettings');
  }

  setInvoiceSettings(value: any): void {
    this.set('invoiceSettings', value);
  }

  getCustomFields(): any {
    return this.get('customFields');
  }

  setCustomFields(value: any): void {
    this.set('customFields', value);
  }

  getBillingSettings(): any {
    return this.get('billingSettings');
  }

  setBillingSettings(value: any): void {
    this.set('billingSettings', value);
  }

  getChargeTypes(): any {
    return this.get('chargeTypes');
  }

  setChargeTypes(value: any): void {
    this.set('chargeTypes', value);
  }

  getInvoices(): any {
    return this.get('invoices');
  }

  setInvoices(value: any): void {
    this.set('invoices', value);
  }

  getInvoiceLineItems(): any {
    return this.get('invoiceLineItems');
  }

  setInvoiceLineItems(value: any): void {
    this.set('invoiceLineItems', value);
  }

  getPayments(): any {
    return this.get('payments');
  }

  setPayments(value: any): void {
    this.set('payments', value);
  }

  getShipmentCharges(): any {
    return this.get('shipmentCharges');
  }

  setShipmentCharges(value: any): void {
    this.set('shipmentCharges', value);
  }

  getShipmentSettings(): any {
    return this.get('shipmentSettings');
  }

  setShipmentSettings(value: any): void {
    this.set('shipmentSettings', value);
  }

  getTemplateSettings(): any {
    return this.get('templateSettings');
  }

  setTemplateSettings(value: any): void {
    this.set('templateSettings', value);
  }

  getRolePermissions(): any {
    return this.get('rolePermissions');
  }

  setRolePermissions(value: any): void {
    this.set('rolePermissions', value);
  }

  getPackingMaterials(): any {
    return this.get('packingMaterials');
  }

  setPackingMaterials(value: any): void {
    this.set('packingMaterials', value);
  }

  getMaterialCategories(): any {
    return this.get('materialCategories');
  }

  setMaterialCategories(value: any): void {
    this.set('materialCategories', value);
  }

  getVendors(): any {
    return this.get('vendors');
  }

  setVendors(value: any): void {
    this.set('vendors', value);
  }

  getStockBatches(): any {
    return this.get('stockBatches');
  }

  setStockBatches(value: any): void {
    this.set('stockBatches', value);
  }

  getRackLevels(): any {
    return this.get('rackLevels');
  }

  setRackLevels(value: any): void {
    this.set('rackLevels', value);
  }

  getMaterialIssues(): any {
    return this.get('materialIssues');
  }

  setMaterialIssues(value: any): void {
    this.set('materialIssues', value);
  }

  getMaterialReturns(): any {
    return this.get('materialReturns');
  }

  setMaterialReturns(value: any): void {
    this.set('materialReturns', value);
  }

  getMaterialDamages(): any {
    return this.get('materialDamages');
  }

  setMaterialDamages(value: any): void {
    this.set('materialDamages', value);
  }

  getMaterialApprovals(): any {
    return this.get('materialApprovals');
  }

  setMaterialApprovals(value: any): void {
    this.set('materialApprovals', value);
  }

  getJobCostSnapshots(): any {
    return this.get('jobCostSnapshots');
  }

  setJobCostSnapshots(value: any): void {
    this.set('jobCostSnapshots', value);
  }

  getSystemPlugins(): any {
    return this.get('systemPlugins');
  }

  setSystemPlugins(value: any): void {
    this.set('systemPlugins', value);
  }

  getJobAssignment(): any {
    return this.get('JobAssignment');
  }

  setJobAssignment(value: any): void {
    this.set('JobAssignment', value);
  }

  getSystemPluginLog(): any {
    return this.get('SystemPluginLog');
  }

  setSystemPluginLog(value: any): void {
    this.set('SystemPluginLog', value);
  }

  getShipmentItems(): any {
    return this.get('shipmentItems');
  }

  setShipmentItems(value: any): void {
    this.set('shipmentItems', value);
  }

  getMaterialUsages(): any {
    return this.get('materialUsages');
  }

  setMaterialUsages(value: any): void {
    this.set('materialUsages', value);
  }

  getMaterialTransfers(): any {
    return this.get('materialTransfers');
  }

  setMaterialTransfers(value: any): void {
    this.set('materialTransfers', value);
  }

  getStockAlerts(): any {
    return this.get('stockAlerts');
  }

  setStockAlerts(value: any): void {
    this.set('stockAlerts', value);
  }

  getPurchaseOrders(): any {
    return this.get('purchaseOrders');
  }

  setPurchaseOrders(value: any): void {
    this.set('purchaseOrders', value);
  }

  getPurchaseOrderItems(): any {
    return this.get('purchaseOrderItems');
  }

  setPurchaseOrderItems(value: any): void {
    this.set('purchaseOrderItems', value);
  }

  getMaterialPriceHistory(): any {
    return this.get('materialPriceHistory');
  }

  setMaterialPriceHistory(value: any): void {
    this.set('materialPriceHistory', value);
  }

}

Parse.Object.registerSubclass('Company', Company);
