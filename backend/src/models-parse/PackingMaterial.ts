// Parse Class: PackingMaterial
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class PackingMaterial extends Parse.Object {
  constructor() {
    super('PackingMaterial');
  }

  getSku(): string {
    return this.get('sku');
  }

  setSku(value: string): void {
    this.set('sku', value);
  }

  getName(): string {
    return this.get('name');
  }

  setName(value: string): void {
    this.set('name', value);
  }

  getDescription(): string {
    return this.get('description');
  }

  setDescription(value: string): void {
    this.set('description', value);
  }

  getUnit(): string {
    return this.get('unit');
  }

  setUnit(value: string): void {
    this.set('unit', value);
  }

  getCategory(): string {
    return this.get('category');
  }

  setCategory(value: string): void {
    this.set('category', value);
  }

  getCategoryId(): string {
    return this.get('categoryId');
  }

  setCategoryId(value: string): void {
    this.set('categoryId', value);
  }

  getMinStockLevel(): number {
    return this.get('minStockLevel');
  }

  setMinStockLevel(value: number): void {
    this.set('minStockLevel', value);
  }

  getTotalQuantity(): number {
    return this.get('totalQuantity');
  }

  setTotalQuantity(value: number): void {
    this.set('totalQuantity', value);
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

  getIsActive(): boolean {
    return this.get('isActive');
  }

  setIsActive(value: boolean): void {
    this.set('isActive', value);
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

  getMaterialCategory(): any {
    return this.get('materialCategory');
  }

  setMaterialCategory(value: any): void {
    this.set('materialCategory', value);
  }

  getCompany(): any {
    return this.get('company');
  }

  setCompany(value: any): void {
    this.set('company', value);
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

  getPurchaseOrderItems(): any {
    return this.get('purchaseOrderItems');
  }

  setPurchaseOrderItems(value: any): void {
    this.set('purchaseOrderItems', value);
  }

  getPriceHistory(): any {
    return this.get('priceHistory');
  }

  setPriceHistory(value: any): void {
    this.set('priceHistory', value);
  }

}

Parse.Object.registerSubclass('PackingMaterial', PackingMaterial);
