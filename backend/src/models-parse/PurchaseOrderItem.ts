// Parse Class: PurchaseOrderItem
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class PurchaseOrderItem extends Parse.Object {
  constructor() {
    super('PurchaseOrderItem');
  }

  getPurchaseOrderId(): string {
    return this.get('purchaseOrderId');
  }

  setPurchaseOrderId(value: string): void {
    this.set('purchaseOrderId', value);
  }

  getMaterialId(): string {
    return this.get('materialId');
  }

  setMaterialId(value: string): void {
    this.set('materialId', value);
  }

  getQuantity(): number {
    return this.get('quantity');
  }

  setQuantity(value: number): void {
    this.set('quantity', value);
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

  getReceivedQuantity(): number {
    return this.get('receivedQuantity');
  }

  setReceivedQuantity(value: number): void {
    this.set('receivedQuantity', value);
  }

  getCompanyId(): string {
    return this.get('companyId');
  }

  setCompanyId(value: string): void {
    this.set('companyId', value);
  }

  getPurchaseOrder(): any {
    return this.get('purchaseOrder');
  }

  setPurchaseOrder(value: any): void {
    this.set('purchaseOrder', value);
  }

  getMaterial(): any {
    return this.get('material');
  }

  setMaterial(value: any): void {
    this.set('material', value);
  }

  getCompany(): any {
    return this.get('company');
  }

  setCompany(value: any): void {
    this.set('company', value);
  }

}

Parse.Object.registerSubclass('PurchaseOrderItem', PurchaseOrderItem);
