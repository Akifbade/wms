// Parse Class: InvoiceLineItem
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class InvoiceLineItem extends Parse.Object {
  constructor() {
    super('InvoiceLineItem');
  }

  getInvoiceId(): string {
    return this.get('invoiceId');
  }

  setInvoiceId(value: string): void {
    this.set('invoiceId', value);
  }

  getCompanyId(): string {
    return this.get('companyId');
  }

  setCompanyId(value: string): void {
    this.set('companyId', value);
  }

  getChargeTypeId(): string {
    return this.get('chargeTypeId');
  }

  setChargeTypeId(value: string): void {
    this.set('chargeTypeId', value);
  }

  getDescription(): string {
    return this.get('description');
  }

  setDescription(value: string): void {
    this.set('description', value);
  }

  getCategory(): string {
    return this.get('category');
  }

  setCategory(value: string): void {
    this.set('category', value);
  }

  getQuantity(): number {
    return this.get('quantity');
  }

  setQuantity(value: number): void {
    this.set('quantity', value);
  }

  getUnitPrice(): number {
    return this.get('unitPrice');
  }

  setUnitPrice(value: number): void {
    this.set('unitPrice', value);
  }

  getAmount(): number {
    return this.get('amount');
  }

  setAmount(value: number): void {
    this.set('amount', value);
  }

  getIsTaxable(): boolean {
    return this.get('isTaxable');
  }

  setIsTaxable(value: boolean): void {
    this.set('isTaxable', value);
  }

  getTaxRate(): number {
    return this.get('taxRate');
  }

  setTaxRate(value: number): void {
    this.set('taxRate', value);
  }

  getTaxAmount(): number {
    return this.get('taxAmount');
  }

  setTaxAmount(value: number): void {
    this.set('taxAmount', value);
  }

  getDisplayOrder(): number {
    return this.get('displayOrder');
  }

  setDisplayOrder(value: number): void {
    this.set('displayOrder', value);
  }

  getCreatedAt(): Date {
    return this.get('createdAt');
  }

  setCreatedAt(value: Date): void {
    this.set('createdAt', value);
  }

  getInvoice(): any {
    return this.get('invoice');
  }

  setInvoice(value: any): void {
    this.set('invoice', value);
  }

  getCompany(): any {
    return this.get('company');
  }

  setCompany(value: any): void {
    this.set('company', value);
  }

}

Parse.Object.registerSubclass('InvoiceLineItem', InvoiceLineItem);
