// Parse Class: ShipmentItem
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class ShipmentItem extends Parse.Object {
  constructor() {
    super('ShipmentItem');
  }

  getShipmentId(): string {
    return this.get('shipmentId');
  }

  setShipmentId(value: string): void {
    this.set('shipmentId', value);
  }

  getItemName(): string {
    return this.get('itemName');
  }

  setItemName(value: string): void {
    this.set('itemName', value);
  }

  getItemDescription(): string {
    return this.get('itemDescription');
  }

  setItemDescription(value: string): void {
    this.set('itemDescription', value);
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

  getWeight(): number {
    return this.get('weight');
  }

  setWeight(value: number): void {
    this.set('weight', value);
  }

  getValue(): number {
    return this.get('value');
  }

  setValue(value: number): void {
    this.set('value', value);
  }

  getBarcode(): string {
    return this.get('barcode');
  }

  setBarcode(value: string): void {
    this.set('barcode', value);
  }

  getPhotos(): string {
    return this.get('photos');
  }

  setPhotos(value: string): void {
    this.set('photos', value);
  }

  getBoxNumbers(): string {
    return this.get('boxNumbers');
  }

  setBoxNumbers(value: string): void {
    this.set('boxNumbers', value);
  }

  getCustomAttributes(): string {
    return this.get('customAttributes');
  }

  setCustomAttributes(value: string): void {
    this.set('customAttributes', value);
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

  getCompany(): any {
    return this.get('company');
  }

  setCompany(value: any): void {
    this.set('company', value);
  }

}

Parse.Object.registerSubclass('ShipmentItem', ShipmentItem);
