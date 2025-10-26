// Parse Class: Rack
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class Rack extends Parse.Object {
  constructor() {
    super('Rack');
  }

  getCode(): string {
    return this.get('code');
  }

  setCode(value: string): void {
    this.set('code', value);
  }

  getQrCode(): string {
    return this.get('qrCode');
  }

  setQrCode(value: string): void {
    this.set('qrCode', value);
  }

  getRackType(): string {
    return this.get('rackType');
  }

  setRackType(value: string): void {
    this.set('rackType', value);
  }

  getLocation(): string {
    return this.get('location');
  }

  setLocation(value: string): void {
    this.set('location', value);
  }

  getCapacityTotal(): number {
    return this.get('capacityTotal');
  }

  setCapacityTotal(value: number): void {
    this.set('capacityTotal', value);
  }

  getCapacityUsed(): number {
    return this.get('capacityUsed');
  }

  setCapacityUsed(value: number): void {
    this.set('capacityUsed', value);
  }

  getMinCapacity(): number {
    return this.get('minCapacity');
  }

  setMinCapacity(value: number): void {
    this.set('minCapacity', value);
  }

  getStatus(): string {
    return this.get('status');
  }

  setStatus(value: string): void {
    this.set('status', value);
  }

  getLastActivity(): Date {
    return this.get('lastActivity');
  }

  setLastActivity(value: Date): void {
    this.set('lastActivity', value);
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

  getBoxes(): any {
    return this.get('boxes');
  }

  setBoxes(value: any): void {
    this.set('boxes', value);
  }

  getActivities(): any {
    return this.get('activities');
  }

  setActivities(value: any): void {
    this.set('activities', value);
  }

  getInventory(): any {
    return this.get('inventory');
  }

  setInventory(value: any): void {
    this.set('inventory', value);
  }

  getMaterialLevels(): any {
    return this.get('materialLevels');
  }

  setMaterialLevels(value: any): void {
    this.set('materialLevels', value);
  }

  getMaterialReturn(): any {
    return this.get('MaterialReturn');
  }

  setMaterialReturn(value: any): void {
    this.set('MaterialReturn', value);
  }

  getJobMaterials(): any {
    return this.get('jobMaterials');
  }

  setJobMaterials(value: any): void {
    this.set('jobMaterials', value);
  }

  getTransfersFrom(): any {
    return this.get('transfersFrom');
  }

  setTransfersFrom(value: any): void {
    this.set('transfersFrom', value);
  }

  getTransfersTo(): any {
    return this.get('transfersTo');
  }

  setTransfersTo(value: any): void {
    this.set('transfersTo', value);
  }

}

Parse.Object.registerSubclass('Rack', Rack);
