// Parse Class: StockBatch
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class StockBatch extends Parse.Object {
  constructor() {
    super('StockBatch');
  }

  getBatchNumber(): string {
    return this.get('batchNumber');
  }

  setBatchNumber(value: string): void {
    this.set('batchNumber', value);
  }

  getMaterialId(): string {
    return this.get('materialId');
  }

  setMaterialId(value: string): void {
    this.set('materialId', value);
  }

  getVendorId(): string {
    return this.get('vendorId');
  }

  setVendorId(value: string): void {
    this.set('vendorId', value);
  }

  getVendorName(): string {
    return this.get('vendorName');
  }

  setVendorName(value: string): void {
    this.set('vendorName', value);
  }

  getPurchaseOrder(): string {
    return this.get('purchaseOrder');
  }

  setPurchaseOrder(value: string): void {
    this.set('purchaseOrder', value);
  }

  getPurchaseDate(): Date {
    return this.get('purchaseDate');
  }

  setPurchaseDate(value: Date): void {
    this.set('purchaseDate', value);
  }

  getQuantityPurchased(): number {
    return this.get('quantityPurchased');
  }

  setQuantityPurchased(value: number): void {
    this.set('quantityPurchased', value);
  }

  getQuantityRemaining(): number {
    return this.get('quantityRemaining');
  }

  setQuantityRemaining(value: number): void {
    this.set('quantityRemaining', value);
  }

  getUnitCost(): number {
    return this.get('unitCost');
  }

  setUnitCost(value: number): void {
    this.set('unitCost', value);
  }

  getSellingPrice(): number {
    return this.get('sellingPrice');
  }

  setSellingPrice(value: number): void {
    this.set('sellingPrice', value);
  }

  getReceivedById(): string {
    return this.get('receivedById');
  }

  setReceivedById(value: string): void {
    this.set('receivedById', value);
  }

  getNotes(): string {
    return this.get('notes');
  }

  setNotes(value: string): void {
    this.set('notes', value);
  }

  getCompanyId(): string {
    return this.get('companyId');
  }

  setCompanyId(value: string): void {
    this.set('companyId', value);
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

  getMaterial(): any {
    return this.get('material');
  }

  setMaterial(value: any): void {
    this.set('material', value);
  }

  getVendor(): any {
    return this.get('vendor');
  }

  setVendor(value: any): void {
    this.set('vendor', value);
  }

  getReceivedBy(): any {
    return this.get('receivedBy');
  }

  setReceivedBy(value: any): void {
    this.set('receivedBy', value);
  }

  getCompany(): any {
    return this.get('company');
  }

  setCompany(value: any): void {
    this.set('company', value);
  }

  getRackAllocations(): any {
    return this.get('rackAllocations');
  }

  setRackAllocations(value: any): void {
    this.set('rackAllocations', value);
  }

  getIssues(): any {
    return this.get('issues');
  }

  setIssues(value: any): void {
    this.set('issues', value);
  }

}

Parse.Object.registerSubclass('StockBatch', StockBatch);
