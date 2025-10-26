// Parse Class: Expense
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class Expense extends Parse.Object {
  constructor() {
    super('Expense');
  }

  getTitle(): string {
    return this.get('title');
  }

  setTitle(value: string): void {
    this.set('title', value);
  }

  getCategory(): string {
    return this.get('category');
  }

  setCategory(value: string): void {
    this.set('category', value);
  }

  getAmount(): number {
    return this.get('amount');
  }

  setAmount(value: number): void {
    this.set('amount', value);
  }

  getCurrency(): string {
    return this.get('currency');
  }

  setCurrency(value: string): void {
    this.set('currency', value);
  }

  getDescription(): string {
    return this.get('description');
  }

  setDescription(value: string): void {
    this.set('description', value);
  }

  getReceipts(): string {
    return this.get('receipts');
  }

  setReceipts(value: string): void {
    this.set('receipts', value);
  }

  getExpenseDate(): Date {
    return this.get('expenseDate');
  }

  setExpenseDate(value: Date): void {
    this.set('expenseDate', value);
  }

  getApprovedBy(): string {
    return this.get('approvedBy');
  }

  setApprovedBy(value: string): void {
    this.set('approvedBy', value);
  }

  getStatus(): string {
    return this.get('status');
  }

  setStatus(value: string): void {
    this.set('status', value);
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

}

Parse.Object.registerSubclass('Expense', Expense);
