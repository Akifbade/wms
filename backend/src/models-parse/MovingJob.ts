// Parse Class: MovingJob
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class MovingJob extends Parse.Object {
  constructor() {
    super('MovingJob');
  }

  getJobCode(): string {
    return this.get('jobCode');
  }

  setJobCode(value: string): void {
    this.set('jobCode', value);
  }

  getJobTitle(): string {
    return this.get('jobTitle');
  }

  setJobTitle(value: string): void {
    this.set('jobTitle', value);
  }

  getClientName(): string {
    return this.get('clientName');
  }

  setClientName(value: string): void {
    this.set('clientName', value);
  }

  getClientPhone(): string {
    return this.get('clientPhone');
  }

  setClientPhone(value: string): void {
    this.set('clientPhone', value);
  }

  getClientEmail(): string {
    return this.get('clientEmail');
  }

  setClientEmail(value: string): void {
    this.set('clientEmail', value);
  }

  getJobDate(): Date {
    return this.get('jobDate');
  }

  setJobDate(value: Date): void {
    this.set('jobDate', value);
  }

  getJobAddress(): string {
    return this.get('jobAddress');
  }

  setJobAddress(value: string): void {
    this.set('jobAddress', value);
  }

  getDropoffAddress(): string {
    return this.get('dropoffAddress');
  }

  setDropoffAddress(value: string): void {
    this.set('dropoffAddress', value);
  }

  getStatus(): string {
    return this.get('status');
  }

  setStatus(value: string): void {
    this.set('status', value);
  }

  getTeamLeaderId(): string {
    return this.get('teamLeaderId');
  }

  setTeamLeaderId(value: string): void {
    this.set('teamLeaderId', value);
  }

  getDriverName(): string {
    return this.get('driverName');
  }

  setDriverName(value: string): void {
    this.set('driverName', value);
  }

  getVehicleNumber(): string {
    return this.get('vehicleNumber');
  }

  setVehicleNumber(value: string): void {
    this.set('vehicleNumber', value);
  }

  getNotes(): string {
    return this.get('notes');
  }

  setNotes(value: string): void {
    this.set('notes', value);
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

  getCompanyId(): string {
    return this.get('companyId');
  }

  setCompanyId(value: string): void {
    this.set('companyId', value);
  }

  getCompany(): any {
    return this.get('company');
  }

  setCompany(value: any): void {
    this.set('company', value);
  }

  getTeamLeader(): any {
    return this.get('teamLeader');
  }

  setTeamLeader(value: any): void {
    this.set('teamLeader', value);
  }

  getAssignments(): any {
    return this.get('assignments');
  }

  setAssignments(value: any): void {
    this.set('assignments', value);
  }

  getMaterialIssues(): any {
    return this.get('materialIssues');
  }

  setMaterialIssues(value: any): void {
    this.set('materialIssues', value);
  }

  getMaterialReturns(): any {
    return this.get('materialReturns');
  }

  setMaterialReturns(value: any): void {
    this.set('materialReturns', value);
  }

  getCostSnapshots(): any {
    return this.get('costSnapshots');
  }

  setCostSnapshots(value: any): void {
    this.set('costSnapshots', value);
  }

  getApprovals(): any {
    return this.get('approvals');
  }

  setApprovals(value: any): void {
    this.set('approvals', value);
  }

}

Parse.Object.registerSubclass('MovingJob', MovingJob);
