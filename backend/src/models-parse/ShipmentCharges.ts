// Parse Class: ShipmentCharges
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class ShipmentCharges extends Parse.Object {
  constructor() {
    super('ShipmentCharges');
  }

  getShipmentId(): string {
    return this.get('shipmentId');
  }

  setShipmentId(value: string): void {
    this.set('shipmentId', value);
  }

  getCompanyId(): string {
    return this.get('companyId');
  }

  setCompanyId(value: string): void {
    this.set('companyId', value);
  }

  getCurrentStorageCharge(): number {
    return this.get('currentStorageCharge');
  }

  setCurrentStorageCharge(value: number): void {
    this.set('currentStorageCharge', value);
  }

  getDaysStored(): number {
    return this.get('daysStored');
  }

  setDaysStored(value: number): void {
    this.set('daysStored', value);
  }

  getLastCalculatedDate(): Date {
    return this.get('lastCalculatedDate');
  }

  setLastCalculatedDate(value: Date): void {
    this.set('lastCalculatedDate', value);
  }

  getTotalBoxesReleased(): number {
    return this.get('totalBoxesReleased');
  }

  setTotalBoxesReleased(value: number): void {
    this.set('totalBoxesReleased', value);
  }

  getTotalInvoiced(): number {
    return this.get('totalInvoiced');
  }

  setTotalInvoiced(value: number): void {
    this.set('totalInvoiced', value);
  }

  getTotalPaid(): number {
    return this.get('totalPaid');
  }

  setTotalPaid(value: number): void {
    this.set('totalPaid', value);
  }

  getOutstandingBalance(): number {
    return this.get('outstandingBalance');
  }

  setOutstandingBalance(value: number): void {
    this.set('outstandingBalance', value);
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

  getCompany(): any {
    return this.get('company');
  }

  setCompany(value: any): void {
    this.set('company', value);
  }

}

Parse.Object.registerSubclass('ShipmentCharges', ShipmentCharges);
