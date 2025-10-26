// Parse Class: Invoice
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class Invoice extends Parse.Object {
  constructor() {
    super('Invoice');
  }

  getInvoiceNumber(): string {
    return this.get('invoiceNumber');
  }

  setInvoiceNumber(value: string): void {
    this.set('invoiceNumber', value);
  }

  getCompanyId(): string {
    return this.get('companyId');
  }

  setCompanyId(value: string): void {
    this.set('companyId', value);
  }

  getShipmentId(): string {
    return this.get('shipmentId');
  }

  setShipmentId(value: string): void {
    this.set('shipmentId', value);
  }

  getClientName(): string {
    return this.get('clientName');
  }

  setClientName(value: string): void {
    this.set('clientName', value);
  }

  getClientPhone(): string {
    return this.get('clientPhone');
  }

  setClientPhone(value: string): void {
    this.set('clientPhone', value);
  }

  getClientAddress(): string {
    return this.get('clientAddress');
  }

  setClientAddress(value: string): void {
    this.set('clientAddress', value);
  }

  getInvoiceDate(): Date {
    return this.get('invoiceDate');
  }

  setInvoiceDate(value: Date): void {
    this.set('invoiceDate', value);
  }

  getDueDate(): Date {
    return this.get('dueDate');
  }

  setDueDate(value: Date): void {
    this.set('dueDate', value);
  }

  getInvoiceType(): string {
    return this.get('invoiceType');
  }

  setInvoiceType(value: string): void {
    this.set('invoiceType', value);
  }

  getIsWarehouseInvoice(): boolean {
    return this.get('isWarehouseInvoice');
  }

  setIsWarehouseInvoice(value: boolean): void {
    this.set('isWarehouseInvoice', value);
  }

  getWarehouseData(): string {
    return this.get('warehouseData');
  }

  setWarehouseData(value: string): void {
    this.set('warehouseData', value);
  }

  getSubtotal(): number {
    return this.get('subtotal');
  }

  setSubtotal(value: number): void {
    this.set('subtotal', value);
  }

  getTaxAmount(): number {
    return this.get('taxAmount');
  }

  setTaxAmount(value: number): void {
    this.set('taxAmount', value);
  }

  getDiscountAmount(): number {
    return this.get('discountAmount');
  }

  setDiscountAmount(value: number): void {
    this.set('discountAmount', value);
  }

  getTotalAmount(): number {
    return this.get('totalAmount');
  }

  setTotalAmount(value: number): void {
    this.set('totalAmount', value);
  }

  getPaymentStatus(): string {
    return this.get('paymentStatus');
  }

  setPaymentStatus(value: string): void {
    this.set('paymentStatus', value);
  }

  getPaidAmount(): number {
    return this.get('paidAmount');
  }

  setPaidAmount(value: number): void {
    this.set('paidAmount', value);
  }

  getBalanceDue(): number {
    return this.get('balanceDue');
  }

  setBalanceDue(value: number): void {
    this.set('balanceDue', value);
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

  getNotes(): string {
    return this.get('notes');
  }

  setNotes(value: string): void {
    this.set('notes', value);
  }

  getTermsAndConditions(): string {
    return this.get('termsAndConditions');
  }

  setTermsAndConditions(value: string): void {
    this.set('termsAndConditions', value);
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

  getShipment(): any {
    return this.get('shipment');
  }

  setShipment(value: any): void {
    this.set('shipment', value);
  }

  getLineItems(): any {
    return this.get('lineItems');
  }

  setLineItems(value: any): void {
    this.set('lineItems', value);
  }

  getPayments(): any {
    return this.get('payments');
  }

  setPayments(value: any): void {
    this.set('payments', value);
  }

}

Parse.Object.registerSubclass('Invoice', Invoice);
