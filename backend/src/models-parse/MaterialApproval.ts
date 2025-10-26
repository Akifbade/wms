// Parse Class: MaterialApproval
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class MaterialApproval extends Parse.Object {
  constructor() {
    super('MaterialApproval');
  }

  getJobId(): string {
    return this.get('jobId');
  }

  setJobId(value: string): void {
    this.set('jobId', value);
  }

  getApprovalType(): string {
    return this.get('approvalType');
  }

  setApprovalType(value: string): void {
    this.set('approvalType', value);
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

  getRequestedAt(): Date {
    return this.get('requestedAt');
  }

  setRequestedAt(value: Date): void {
    this.set('requestedAt', value);
  }

  getDecisionById(): string {
    return this.get('decisionById');
  }

  setDecisionById(value: string): void {
    this.set('decisionById', value);
  }

  getDecidedAt(): Date {
    return this.get('decidedAt');
  }

  setDecidedAt(value: Date): void {
    this.set('decidedAt', value);
  }

  getDecisionNotes(): string {
    return this.get('decisionNotes');
  }

  setDecisionNotes(value: string): void {
    this.set('decisionNotes', value);
  }

  getSubjectReturnId(): string {
    return this.get('subjectReturnId');
  }

  setSubjectReturnId(value: string): void {
    this.set('subjectReturnId', value);
  }

  getSubjectDamageId(): string {
    return this.get('subjectDamageId');
  }

  setSubjectDamageId(value: string): void {
    this.set('subjectDamageId', value);
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

  getRequestedBy(): any {
    return this.get('requestedBy');
  }

  setRequestedBy(value: any): void {
    this.set('requestedBy', value);
  }

  getDecisionBy(): any {
    return this.get('decisionBy');
  }

  setDecisionBy(value: any): void {
    this.set('decisionBy', value);
  }

  getSubjectReturn(): any {
    return this.get('subjectReturn');
  }

  setSubjectReturn(value: any): void {
    this.set('subjectReturn', value);
  }

  getSubjectDamage(): any {
    return this.get('subjectDamage');
  }

  setSubjectDamage(value: any): void {
    this.set('subjectDamage', value);
  }

  getCompany(): any {
    return this.get('company');
  }

  setCompany(value: any): void {
    this.set('company', value);
  }

}

Parse.Object.registerSubclass('MaterialApproval', MaterialApproval);
