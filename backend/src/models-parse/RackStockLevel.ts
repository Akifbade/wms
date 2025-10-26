// Parse Class: RackStockLevel
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class RackStockLevel extends Parse.Object {
  constructor() {
    super('RackStockLevel');
  }

  getMaterialId(): string {
    return this.get('materialId');
  }

  setMaterialId(value: string): void {
    this.set('materialId', value);
  }

  getRackId(): string {
    return this.get('rackId');
  }

  setRackId(value: string): void {
    this.set('rackId', value);
  }

  getStockBatchId(): string {
    return this.get('stockBatchId');
  }

  setStockBatchId(value: string): void {
    this.set('stockBatchId', value);
  }

  getQuantity(): number {
    return this.get('quantity');
  }

  setQuantity(value: number): void {
    this.set('quantity', value);
  }

  getLastUpdated(): Date {
    return this.get('lastUpdated');
  }

  setLastUpdated(value: Date): void {
    this.set('lastUpdated', value);
  }

  getCompanyId(): string {
    return this.get('companyId');
  }

  setCompanyId(value: string): void {
    this.set('companyId', value);
  }

  getMaterial(): any {
    return this.get('material');
  }

  setMaterial(value: any): void {
    this.set('material', value);
  }

  getRack(): any {
    return this.get('rack');
  }

  setRack(value: any): void {
    this.set('rack', value);
  }

  getStockBatch(): any {
    return this.get('stockBatch');
  }

  setStockBatch(value: any): void {
    this.set('stockBatch', value);
  }

  getCompany(): any {
    return this.get('company');
  }

  setCompany(value: any): void {
    this.set('company', value);
  }

}

Parse.Object.registerSubclass('RackStockLevel', RackStockLevel);
