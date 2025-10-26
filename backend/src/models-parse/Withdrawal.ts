// Parse Class: Withdrawal
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class Withdrawal extends Parse.Object {
  constructor() {
    super('Withdrawal');
  }

  getShipmentId(): string {
    return this.get('shipmentId');
  }

  setShipmentId(value: string): void {
    this.set('shipmentId', value);
  }

  getWithdrawnBoxCount(): number {
    return this.get('withdrawnBoxCount');
  }

  setWithdrawnBoxCount(value: number): void {
    this.set('withdrawnBoxCount', value);
  }

  getRemainingBoxCount(): number {
    return this.get('remainingBoxCount');
  }

  setRemainingBoxCount(value: number): void {
    this.set('remainingBoxCount', value);
  }

  getWithdrawalDate(): Date {
    return this.get('withdrawalDate');
  }

  setWithdrawalDate(value: Date): void {
    this.set('withdrawalDate', value);
  }

  getStatus(): string {
    return this.get('status');
  }

  setStatus(value: string): void {
    this.set('status', value);
  }

  getReason(): string {
    return this.get('reason');
  }

  setReason(value: string): void {
    this.set('reason', value);
  }

  getNotes(): string {
    return this.get('notes');
  }

  setNotes(value: string): void {
    this.set('notes', value);
  }

  getPhotos(): string {
    return this.get('photos');
  }

  setPhotos(value: string): void {
    this.set('photos', value);
  }

  getReceiptNumber(): string {
    return this.get('receiptNumber');
  }

  setReceiptNumber(value: string): void {
    this.set('receiptNumber', value);
  }

  getWithdrawnBy(): string {
    return this.get('withdrawnBy');
  }

  setWithdrawnBy(value: string): void {
    this.set('withdrawnBy', value);
  }

  getAuthorizedBy(): string {
    return this.get('authorizedBy');
  }

  setAuthorizedBy(value: string): void {
    this.set('authorizedBy', value);
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

  getShipment(): any {
    return this.get('shipment');
  }

  setShipment(value: any): void {
    this.set('shipment', value);
  }

}

Parse.Object.registerSubclass('Withdrawal', Withdrawal);
