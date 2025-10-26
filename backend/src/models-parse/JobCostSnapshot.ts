// Parse Class: JobCostSnapshot
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class JobCostSnapshot extends Parse.Object {
  constructor() {
    super('JobCostSnapshot');
  }

  getJobId(): string {
    return this.get('jobId');
  }

  setJobId(value: string): void {
    this.set('jobId', value);
  }

  getRecordedAt(): Date {
    return this.get('recordedAt');
  }

  setRecordedAt(value: Date): void {
    this.set('recordedAt', value);
  }

  getMaterialsCost(): number {
    return this.get('materialsCost');
  }

  setMaterialsCost(value: number): void {
    this.set('materialsCost', value);
  }

  getLaborCost(): number {
    return this.get('laborCost');
  }

  setLaborCost(value: number): void {
    this.set('laborCost', value);
  }

  getDamageLoss(): number {
    return this.get('damageLoss');
  }

  setDamageLoss(value: number): void {
    this.set('damageLoss', value);
  }

  getOtherCost(): number {
    return this.get('otherCost');
  }

  setOtherCost(value: number): void {
    this.set('otherCost', value);
  }

  getRevenue(): number {
    return this.get('revenue');
  }

  setRevenue(value: number): void {
    this.set('revenue', value);
  }

  getProfit(): number {
    return this.get('profit');
  }

  setProfit(value: number): void {
    this.set('profit', value);
  }

  getProfitMargin(): number {
    return this.get('profitMargin');
  }

  setProfitMargin(value: number): void {
    this.set('profitMargin', value);
  }

  getCurrency(): string {
    return this.get('currency');
  }

  setCurrency(value: string): void {
    this.set('currency', value);
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

  getCompany(): any {
    return this.get('company');
  }

  setCompany(value: any): void {
    this.set('company', value);
  }

}

Parse.Object.registerSubclass('JobCostSnapshot', JobCostSnapshot);
