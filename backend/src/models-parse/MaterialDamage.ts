// Parse Class: MaterialDamage
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class MaterialDamage extends Parse.Object {
  constructor() {
    super('MaterialDamage');
  }

  getReturnId(): string {
    return this.get('returnId');
  }

  setReturnId(value: string): void {
    this.set('returnId', value);
  }

  getMaterialId(): string {
    return this.get('materialId');
  }

  setMaterialId(value: string): void {
    this.set('materialId', value);
  }

  getQuantity(): number {
    return this.get('quantity');
  }

  setQuantity(value: number): void {
    this.set('quantity', value);
  }

  getReason(): string {
    return this.get('reason');
  }

  setReason(value: string): void {
    this.set('reason', value);
  }

  getPhotoUrls(): string {
    return this.get('photoUrls');
  }

  setPhotoUrls(value: string): void {
    this.set('photoUrls', value);
  }

  getStatus(): string {
    return this.get('status');
  }

  setStatus(value: string): void {
    this.set('status', value);
  }

  getRecordedById(): string {
    return this.get('recordedById');
  }

  setRecordedById(value: string): void {
    this.set('recordedById', value);
  }

  getRecordedAt(): Date {
    return this.get('recordedAt');
  }

  setRecordedAt(value: Date): void {
    this.set('recordedAt', value);
  }

  getApprovedById(): string {
    return this.get('approvedById');
  }

  setApprovedById(value: string): void {
    this.set('approvedById', value);
  }

  getApprovedAt(): Date {
    return this.get('approvedAt');
  }

  setApprovedAt(value: Date): void {
    this.set('approvedAt', value);
  }

  getApprovalNotes(): string {
    return this.get('approvalNotes');
  }

  setApprovalNotes(value: string): void {
    this.set('approvalNotes', value);
  }

  getRejectionReason(): string {
    return this.get('rejectionReason');
  }

  setRejectionReason(value: string): void {
    this.set('rejectionReason', value);
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

  getReturn(): any {
    return this.get('return');
  }

  setReturn(value: any): void {
    this.set('return', value);
  }

  getRecordedBy(): any {
    return this.get('recordedBy');
  }

  setRecordedBy(value: any): void {
    this.set('recordedBy', value);
  }

  getApprovedBy(): any {
    return this.get('approvedBy');
  }

  setApprovedBy(value: any): void {
    this.set('approvedBy', value);
  }

  getApproval(): any {
    return this.get('approval');
  }

  setApproval(value: any): void {
    this.set('approval', value);
  }

  getCompany(): any {
    return this.get('company');
  }

  setCompany(value: any): void {
    this.set('company', value);
  }

}

Parse.Object.registerSubclass('MaterialDamage', MaterialDamage);
