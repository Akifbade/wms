// Parse Class: MaterialIssue
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class MaterialIssue extends Parse.Object {
  constructor() {
    super('MaterialIssue');
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

  getUnitCost(): number {
    return this.get('unitCost');
  }

  setUnitCost(value: number): void {
    this.set('unitCost', value);
  }

  getTotalCost(): number {
    return this.get('totalCost');
  }

  setTotalCost(value: number): void {
    this.set('totalCost', value);
  }

  getRackId(): string {
    return this.get('rackId');
  }

  setRackId(value: string): void {
    this.set('rackId', value);
  }

  getIssuedById(): string {
    return this.get('issuedById');
  }

  setIssuedById(value: string): void {
    this.set('issuedById', value);
  }

  getIssuedAt(): Date {
    return this.get('issuedAt');
  }

  setIssuedAt(value: Date): void {
    this.set('issuedAt', value);
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

  getStockBatch(): any {
    return this.get('stockBatch');
  }

  setStockBatch(value: any): void {
    this.set('stockBatch', value);
  }

  getRack(): any {
    return this.get('rack');
  }

  setRack(value: any): void {
    this.set('rack', value);
  }

  getIssuedBy(): any {
    return this.get('issuedBy');
  }

  setIssuedBy(value: any): void {
    this.set('issuedBy', value);
  }

  getCompany(): any {
    return this.get('company');
  }

  setCompany(value: any): void {
    this.set('company', value);
  }

  getReturns(): any {
    return this.get('returns');
  }

  setReturns(value: any): void {
    this.set('returns', value);
  }

}

Parse.Object.registerSubclass('MaterialIssue', MaterialIssue);
