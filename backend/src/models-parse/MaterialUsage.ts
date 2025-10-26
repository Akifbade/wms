// Parse Class: MaterialUsage
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class MaterialUsage extends Parse.Object {
  constructor() {
    super('MaterialUsage');
  }

  getMaterialId(): string {
    return this.get('materialId');
  }

  setMaterialId(value: string): void {
    this.set('materialId', value);
  }

  getShipmentId(): string {
    return this.get('shipmentId');
  }

  setShipmentId(value: string): void {
    this.set('shipmentId', value);
  }

  getStockBatchId(): string {
    return this.get('stockBatchId');
  }

  setStockBatchId(value: string): void {
    this.set('stockBatchId', value);
  }

  getQuantityUsed(): number {
    return this.get('quantityUsed');
  }

  setQuantityUsed(value: number): void {
    this.set('quantityUsed', value);
  }

  getUnitCost(): number {
    return this.get('unitCost');
  }

  setUnitCost(value: number): void {
    this.set('unitCost', value);
  }

  getTotalCost(): number {
    return this.get('totalCost');
  }

  setTotalCost(value: number): void {
    this.set('totalCost', value);
  }

  getUsageType(): string {
    return this.get('usageType');
  }

  setUsageType(value: string): void {
    this.set('usageType', value);
  }

  getUsedById(): string {
    return this.get('usedById');
  }

  setUsedById(value: string): void {
    this.set('usedById', value);
  }

  getUsedAt(): Date {
    return this.get('usedAt');
  }

  setUsedAt(value: Date): void {
    this.set('usedAt', value);
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

  getMaterial(): any {
    return this.get('material');
  }

  setMaterial(value: any): void {
    this.set('material', value);
  }

  getShipment(): any {
    return this.get('shipment');
  }

  setShipment(value: any): void {
    this.set('shipment', value);
  }

  getUsedBy(): any {
    return this.get('usedBy');
  }

  setUsedBy(value: any): void {
    this.set('usedBy', value);
  }

  getCompany(): any {
    return this.get('company');
  }

  setCompany(value: any): void {
    this.set('company', value);
  }

}

Parse.Object.registerSubclass('MaterialUsage', MaterialUsage);
