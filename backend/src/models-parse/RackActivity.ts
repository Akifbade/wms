// Parse Class: RackActivity
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class RackActivity extends Parse.Object {
  constructor() {
    super('RackActivity');
  }

  getRackId(): string {
    return this.get('rackId');
  }

  setRackId(value: string): void {
    this.set('rackId', value);
  }

  getUserId(): string {
    return this.get('userId');
  }

  setUserId(value: string): void {
    this.set('userId', value);
  }

  getActivityType(): string {
    return this.get('activityType');
  }

  setActivityType(value: string): void {
    this.set('activityType', value);
  }

  getItemDetails(): string {
    return this.get('itemDetails');
  }

  setItemDetails(value: string): void {
    this.set('itemDetails', value);
  }

  getQuantityBefore(): number {
    return this.get('quantityBefore');
  }

  setQuantityBefore(value: number): void {
    this.set('quantityBefore', value);
  }

  getQuantityAfter(): number {
    return this.get('quantityAfter');
  }

  setQuantityAfter(value: number): void {
    this.set('quantityAfter', value);
  }

  getPhotos(): string {
    return this.get('photos');
  }

  setPhotos(value: string): void {
    this.set('photos', value);
  }

  getNotes(): string {
    return this.get('notes');
  }

  setNotes(value: string): void {
    this.set('notes', value);
  }

  getGpsLocation(): string {
    return this.get('gpsLocation');
  }

  setGpsLocation(value: string): void {
    this.set('gpsLocation', value);
  }

  getTimestamp(): Date {
    return this.get('timestamp');
  }

  setTimestamp(value: Date): void {
    this.set('timestamp', value);
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

  getUser(): any {
    return this.get('user');
  }

  setUser(value: any): void {
    this.set('user', value);
  }

}

Parse.Object.registerSubclass('RackActivity', RackActivity);
