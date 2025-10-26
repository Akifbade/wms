// Parse Class: JobAssignment
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class JobAssignment extends Parse.Object {
  constructor() {
    super('JobAssignment');
  }

  getJobId(): string {
    return this.get('jobId');
  }

  setJobId(value: string): void {
    this.set('jobId', value);
  }

  getUserId(): string {
    return this.get('userId');
  }

  setUserId(value: string): void {
    this.set('userId', value);
  }

  getRole(): string {
    return this.get('role');
  }

  setRole(value: string): void {
    this.set('role', value);
  }

  getCheckInAt(): Date {
    return this.get('checkInAt');
  }

  setCheckInAt(value: Date): void {
    this.set('checkInAt', value);
  }

  getCheckOutAt(): Date {
    return this.get('checkOutAt');
  }

  setCheckOutAt(value: Date): void {
    this.set('checkOutAt', value);
  }

  getHourlyRate(): number {
    return this.get('hourlyRate');
  }

  setHourlyRate(value: number): void {
    this.set('hourlyRate', value);
  }

  getHoursWorked(): number {
    return this.get('hoursWorked');
  }

  setHoursWorked(value: number): void {
    this.set('hoursWorked', value);
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

  getJob(): any {
    return this.get('job');
  }

  setJob(value: any): void {
    this.set('job', value);
  }

  getUser(): any {
    return this.get('user');
  }

  setUser(value: any): void {
    this.set('user', value);
  }

  getCompany(): any {
    return this.get('company');
  }

  setCompany(value: any): void {
    this.set('company', value);
  }

}

Parse.Object.registerSubclass('JobAssignment', JobAssignment);
