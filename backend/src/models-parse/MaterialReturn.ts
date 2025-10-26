// Parse Class: MaterialReturn
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class MaterialReturn extends Parse.Object {
  constructor() {
    super('MaterialReturn');
  }

  getJobId(): string {
    return this.get('jobId');
  }

  setJobId(value: string): void {
    this.set('jobId', value);
  }

  getMaterialId(): string {
    return this.get('materialId');
  }

  setMaterialId(value: string): void {
    this.set('materialId', value);
  }

  getIssueId(): string {
    return this.get('issueId');
  }

  setIssueId(value: string): void {
    this.set('issueId', value);
  }

  getQuantityIssued(): number {
    return this.get('quantityIssued');
  }

  setQuantityIssued(value: number): void {
    this.set('quantityIssued', value);
  }

  getQuantityUsed(): number {
    return this.get('quantityUsed');
  }

  setQuantityUsed(value: number): void {
    this.set('quantityUsed', value);
  }

  getQuantityGood(): number {
    return this.get('quantityGood');
  }

  setQuantityGood(value: number): void {
    this.set('quantityGood', value);
  }

  getQuantityDamaged(): number {
    return this.get('quantityDamaged');
  }

  setQuantityDamaged(value: number): void {
    this.set('quantityDamaged', value);
  }

  getRestocked(): boolean {
    return this.get('restocked');
  }

  setRestocked(value: boolean): void {
    this.set('restocked', value);
  }

  getRestockedAt(): Date {
    return this.get('restockedAt');
  }

  setRestockedAt(value: Date): void {
    this.set('restockedAt', value);
  }

  getRackId(): string {
    return this.get('rackId');
  }

  setRackId(value: string): void {
    this.set('rackId', value);
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

  getJob(): any {
    return this.get('job');
  }

  setJob(value: any): void {
    this.set('job', value);
  }

  getMaterial(): any {
    return this.get('material');
  }

  setMaterial(value: any): void {
    this.set('material', value);
  }

  getIssue(): any {
    return this.get('issue');
  }

  setIssue(value: any): void {
    this.set('issue', value);
  }

  getRack(): any {
    return this.get('rack');
  }

  setRack(value: any): void {
    this.set('rack', value);
  }

  getRecordedBy(): any {
    return this.get('recordedBy');
  }

  setRecordedBy(value: any): void {
    this.set('recordedBy', value);
  }

  getDamages(): any {
    return this.get('damages');
  }

  setDamages(value: any): void {
    this.set('damages', value);
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

Parse.Object.registerSubclass('MaterialReturn', MaterialReturn);
