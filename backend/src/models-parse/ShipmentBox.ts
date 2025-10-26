// Parse Class: ShipmentBox
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class ShipmentBox extends Parse.Object {
  constructor() {
    super('ShipmentBox');
  }

  getShipmentId(): string {
    return this.get('shipmentId');
  }

  setShipmentId(value: string): void {
    this.set('shipmentId', value);
  }

  getBoxNumber(): number {
    return this.get('boxNumber');
  }

  setBoxNumber(value: number): void {
    this.set('boxNumber', value);
  }

  getQrCode(): string {
    return this.get('qrCode');
  }

  setQrCode(value: string): void {
    this.set('qrCode', value);
  }

  getRackId(): string {
    return this.get('rackId');
  }

  setRackId(value: string): void {
    this.set('rackId', value);
  }

  getStatus(): string {
    return this.get('status');
  }

  setStatus(value: string): void {
    this.set('status', value);
  }

  getAssignedAt(): Date {
    return this.get('assignedAt');
  }

  setAssignedAt(value: Date): void {
    this.set('assignedAt', value);
  }

  getReleasedAt(): Date {
    return this.get('releasedAt');
  }

  setReleasedAt(value: Date): void {
    this.set('releasedAt', value);
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

  getPieceWeight(): number {
    return this.get('pieceWeight');
  }

  setPieceWeight(value: number): void {
    this.set('pieceWeight', value);
  }

  getPieceQR(): string {
    return this.get('pieceQR');
  }

  setPieceQR(value: string): void {
    this.set('pieceQR', value);
  }

  getShipment(): any {
    return this.get('shipment');
  }

  setShipment(value: any): void {
    this.set('shipment', value);
  }

  getRack(): any {
    return this.get('rack');
  }

  setRack(value: any): void {
    this.set('rack', value);
  }

}

Parse.Object.registerSubclass('ShipmentBox', ShipmentBox);
