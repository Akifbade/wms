// Parse Class: StockAlert
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class StockAlert extends Parse.Object {
  constructor() {
    super('StockAlert');
  }

  getMaterialId(): string {
    return this.get('materialId');
  }

  setMaterialId(value: string): void {
    this.set('materialId', value);
  }

  getAlertType(): string {
    return this.get('alertType');
  }

  setAlertType(value: string): void {
    this.set('alertType', value);
  }

  getThreshold(): number {
    return this.get('threshold');
  }

  setThreshold(value: number): void {
    this.set('threshold', value);
  }

  getCurrentStock(): number {
    return this.get('currentStock');
  }

  setCurrentStock(value: number): void {
    this.set('currentStock', value);
  }

  getMessage(): string {
    return this.get('message');
  }

  setMessage(value: string): void {
    this.set('message', value);
  }

  getIsResolved(): boolean {
    return this.get('isResolved');
  }

  setIsResolved(value: boolean): void {
    this.set('isResolved', value);
  }

  getResolvedById(): string {
    return this.get('resolvedById');
  }

  setResolvedById(value: string): void {
    this.set('resolvedById', value);
  }

  getResolvedAt(): Date {
    return this.get('resolvedAt');
  }

  setResolvedAt(value: Date): void {
    this.set('resolvedAt', value);
  }

  getNotificationSent(): boolean {
    return this.get('notificationSent');
  }

  setNotificationSent(value: boolean): void {
    this.set('notificationSent', value);
  }

  getNotificationSentAt(): Date {
    return this.get('notificationSentAt');
  }

  setNotificationSentAt(value: Date): void {
    this.set('notificationSentAt', value);
  }

  getCreatedAt(): Date {
    return this.get('createdAt');
  }

  setCreatedAt(value: Date): void {
    this.set('createdAt', value);
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

  getResolvedBy(): any {
    return this.get('resolvedBy');
  }

  setResolvedBy(value: any): void {
    this.set('resolvedBy', value);
  }

  getCompany(): any {
    return this.get('company');
  }

  setCompany(value: any): void {
    this.set('company', value);
  }

}

Parse.Object.registerSubclass('StockAlert', StockAlert);
