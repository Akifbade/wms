// Parse Class: Vendor
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class Vendor extends Parse.Object {
  constructor() {
    super('Vendor');
  }

  getName(): string {
    return this.get('name');
  }

  setName(value: string): void {
    this.set('name', value);
  }

  getContact(): string {
    return this.get('contact');
  }

  setContact(value: string): void {
    this.set('contact', value);
  }

  getPhone(): string {
    return this.get('phone');
  }

  setPhone(value: string): void {
    this.set('phone', value);
  }

  getEmail(): string {
    return this.get('email');
  }

  setEmail(value: string): void {
    this.set('email', value);
  }

  getAddress(): string {
    return this.get('address');
  }

  setAddress(value: string): void {
    this.set('address', value);
  }

  getRating(): number {
    return this.get('rating');
  }

  setRating(value: number): void {
    this.set('rating', value);
  }

  getNotes(): string {
    return this.get('notes');
  }

  setNotes(value: string): void {
    this.set('notes', value);
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

  getPurchaseOrders(): any {
    return this.get('purchaseOrders');
  }

  setPurchaseOrders(value: any): void {
    this.set('purchaseOrders', value);
  }

  getPriceHistory(): any {
    return this.get('priceHistory');
  }

  setPriceHistory(value: any): void {
    this.set('priceHistory', value);
  }

}

Parse.Object.registerSubclass('Vendor', Vendor);
