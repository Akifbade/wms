// Parse Class: Payment
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class Payment extends Parse.Object {
  constructor() {
    super('Payment');
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

  getAmount(): number {
    return this.get('amount');
  }

  setAmount(value: number): void {
    this.set('amount', value);
  }

  getPaymentDate(): Date {
    return this.get('paymentDate');
  }

  setPaymentDate(value: Date): void {
    this.set('paymentDate', value);
  }

  getPaymentMethod(): string {
    return this.get('paymentMethod');
  }

  setPaymentMethod(value: string): void {
    this.set('paymentMethod', value);
  }

  getTransactionRef(): string {
    return this.get('transactionRef');
  }

  setTransactionRef(value: string): void {
    this.set('transactionRef', value);
  }

  getReceiptNumber(): string {
    return this.get('receiptNumber');
  }

  setReceiptNumber(value: string): void {
    this.set('receiptNumber', value);
  }

  getNotes(): string {
    return this.get('notes');
  }

  setNotes(value: string): void {
    this.set('notes', value);
  }

  getCreatedBy(): string {
    return this.get('createdBy');
  }

  setCreatedBy(value: string): void {
    this.set('createdBy', value);
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

Parse.Object.registerSubclass('Payment', Payment);
