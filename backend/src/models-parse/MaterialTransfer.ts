// Parse Class: MaterialTransfer
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class MaterialTransfer extends Parse.Object {
  constructor() {
    super('MaterialTransfer');
  }

  getMaterialId(): string {
    return this.get('materialId');
  }

  setMaterialId(value: string): void {
    this.set('materialId', value);
  }

  getFromRackId(): string {
    return this.get('fromRackId');
  }

  setFromRackId(value: string): void {
    this.set('fromRackId', value);
  }

  getToRackId(): string {
    return this.get('toRackId');
  }

  setToRackId(value: string): void {
    this.set('toRackId', value);
  }

  getStockBatchId(): string {
    return this.get('stockBatchId');
  }

  setStockBatchId(value: string): void {
    this.set('stockBatchId', value);
  }

  getQuantity(): number {
    return this.get('quantity');
  }

  setQuantity(value: number): void {
    this.set('quantity', value);
  }

  getTransferType(): string {
    return this.get('transferType');
  }

  setTransferType(value: string): void {
    this.set('transferType', value);
  }

  getStatus(): string {
    return this.get('status');
  }

  setStatus(value: string): void {
    this.set('status', value);
  }

  getRequestedById(): string {
    return this.get('requestedById');
  }

  setRequestedById(value: string): void {
    this.set('requestedById', value);
  }

  getApprovedById(): string {
    return this.get('approvedById');
  }

  setApprovedById(value: string): void {
    this.set('approvedById', value);
  }

  getCompletedById(): string {
    return this.get('completedById');
  }

  setCompletedById(value: string): void {
    this.set('completedById', value);
  }

  getRequestedAt(): Date {
    return this.get('requestedAt');
  }

  setRequestedAt(value: Date): void {
    this.set('requestedAt', value);
  }

  getApprovedAt(): Date {
    return this.get('approvedAt');
  }

  setApprovedAt(value: Date): void {
    this.set('approvedAt', value);
  }

  getCompletedAt(): Date {
    return this.get('completedAt');
  }

  setCompletedAt(value: Date): void {
    this.set('completedAt', value);
  }

  getNotes(): string {
    return this.get('notes');
  }

  setNotes(value: string): void {
    this.set('notes', value);
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

  getFromRack(): any {
    return this.get('fromRack');
  }

  setFromRack(value: any): void {
    this.set('fromRack', value);
  }

  getToRack(): any {
    return this.get('toRack');
  }

  setToRack(value: any): void {
    this.set('toRack', value);
  }

  getRequestedBy(): any {
    return this.get('requestedBy');
  }

  setRequestedBy(value: any): void {
    this.set('requestedBy', value);
  }

  getApprovedBy(): any {
    return this.get('approvedBy');
  }

  setApprovedBy(value: any): void {
    this.set('approvedBy', value);
  }

  getCompletedBy(): any {
    return this.get('completedBy');
  }

  setCompletedBy(value: any): void {
    this.set('completedBy', value);
  }

  getCompany(): any {
    return this.get('company');
  }

  setCompany(value: any): void {
    this.set('company', value);
  }

}

Parse.Object.registerSubclass('MaterialTransfer', MaterialTransfer);
