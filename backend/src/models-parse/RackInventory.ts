// Parse Class: RackInventory
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class RackInventory extends Parse.Object {
  constructor() {
    super('RackInventory');
  }

  getRackId(): string {
    return this.get('rackId');
  }

  setRackId(value: string): void {
    this.set('rackId', value);
  }

  getItemType(): string {
    return this.get('itemType');
  }

  setItemType(value: string): void {
    this.set('itemType', value);
  }

  getItemId(): string {
    return this.get('itemId');
  }

  setItemId(value: string): void {
    this.set('itemId', value);
  }

  getQuantityCurrent(): number {
    return this.get('quantityCurrent');
  }

  setQuantityCurrent(value: number): void {
    this.set('quantityCurrent', value);
  }

  getQuantityReserved(): number {
    return this.get('quantityReserved');
  }

  setQuantityReserved(value: number): void {
    this.set('quantityReserved', value);
  }

  getLastMovement(): Date {
    return this.get('lastMovement');
  }

  setLastMovement(value: Date): void {
    this.set('lastMovement', value);
  }

  getUpdatedBy(): string {
    return this.get('updatedBy');
  }

  setUpdatedBy(value: string): void {
    this.set('updatedBy', value);
  }

  getCompanyId(): string {
    return this.get('companyId');
  }

  setCompanyId(value: string): void {
    this.set('companyId', value);
  }

  getRack(): any {
    return this.get('rack');
  }

  setRack(value: any): void {
    this.set('rack', value);
  }

}

Parse.Object.registerSubclass('RackInventory', RackInventory);
