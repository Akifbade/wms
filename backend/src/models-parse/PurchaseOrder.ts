// Parse Class: PurchaseOrder
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class PurchaseOrder extends Parse.Object {
  constructor() {
    super('PurchaseOrder');
  }

  getOrderNumber(): string {
    return this.get('orderNumber');
  }

  setOrderNumber(value: string): void {
    this.set('orderNumber', value);
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

  getOrderDate(): Date {
    return this.get('orderDate');
  }

  setOrderDate(value: Date): void {
    this.set('orderDate', value);
  }

  getExpectedDate(): Date {
    return this.get('expectedDate');
  }

  setExpectedDate(value: Date): void {
    this.set('expectedDate', value);
  }

  getReceivedDate(): Date {
    return this.get('receivedDate');
  }

  setReceivedDate(value: Date): void {
    this.set('receivedDate', value);
  }

  getStatus(): string {
    return this.get('status');
  }

  setStatus(value: string): void {
    this.set('status', value);
  }

  getTotalAmount(): number {
    return this.get('totalAmount');
  }

  setTotalAmount(value: number): void {
    this.set('totalAmount', value);
  }

  getNotes(): string {
    return this.get('notes');
  }

  setNotes(value: string): void {
    this.set('notes', value);
  }

  getCreatedById(): string {
    return this.get('createdById');
  }

  setCreatedById(value: string): void {
    this.set('createdById', value);
  }

  getApprovedById(): string {
    return this.get('approvedById');
  }

  setApprovedById(value: string): void {
    this.set('approvedById', value);
  }

  getApprovedAt(): Date {
    return this.get('approvedAt');
  }

  setApprovedAt(value: Date): void {
    this.set('approvedAt', value);
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

  getVendor(): any {
    return this.get('vendor');
  }

  setVendor(value: any): void {
    this.set('vendor', value);
  }

  getCreatedBy(): any {
    return this.get('createdBy');
  }

  setCreatedBy(value: any): void {
    this.set('createdBy', value);
  }

  getApprovedBy(): any {
    return this.get('approvedBy');
  }

  setApprovedBy(value: any): void {
    this.set('approvedBy', value);
  }

  getCompany(): any {
    return this.get('company');
  }

  setCompany(value: any): void {
    this.set('company', value);
  }

  getItems(): any {
    return this.get('items');
  }

  setItems(value: any): void {
    this.set('items', value);
  }

}

Parse.Object.registerSubclass('PurchaseOrder', PurchaseOrder);
