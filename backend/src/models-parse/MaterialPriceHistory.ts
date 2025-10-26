// Parse Class: MaterialPriceHistory
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class MaterialPriceHistory extends Parse.Object {
  constructor() {
    super('MaterialPriceHistory');
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

  getEffectiveDate(): Date {
    return this.get('effectiveDate');
  }

  setEffectiveDate(value: Date): void {
    this.set('effectiveDate', value);
  }

  getSource(): string {
    return this.get('source');
  }

  setSource(value: string): void {
    this.set('source', value);
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

  getVendor(): any {
    return this.get('vendor');
  }

  setVendor(value: any): void {
    this.set('vendor', value);
  }

  getCompany(): any {
    return this.get('company');
  }

  setCompany(value: any): void {
    this.set('company', value);
  }

}

Parse.Object.registerSubclass('MaterialPriceHistory', MaterialPriceHistory);
