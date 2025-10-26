// Parse Class: User
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class User extends Parse.Object {
  constructor() {
    super('User');
  }

  getEmail(): string {
    return this.get('email');
  }

  setEmail(value: string): void {
    this.set('email', value);
  }

  getPassword(): string {
    return this.get('password');
  }

  setPassword(value: string): void {
    this.set('password', value);
  }

  getName(): string {
    return this.get('name');
  }

  setName(value: string): void {
    this.set('name', value);
  }

  getPhone(): string {
    return this.get('phone');
  }

  setPhone(value: string): void {
    this.set('phone', value);
  }

  getRole(): string {
    return this.get('role');
  }

  setRole(value: string): void {
    this.set('role', value);
  }

  getSkills(): string {
    return this.get('skills');
  }

  setSkills(value: string): void {
    this.set('skills', value);
  }

  getIsActive(): boolean {
    return this.get('isActive');
  }

  setIsActive(value: boolean): void {
    this.set('isActive', value);
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

  getAvatar(): string {
    return this.get('avatar');
  }

  setAvatar(value: string): void {
    this.set('avatar', value);
  }

  getPosition(): string {
    return this.get('position');
  }

  setPosition(value: string): void {
    this.set('position', value);
  }

  getDepartment(): string {
    return this.get('department');
  }

  setDepartment(value: string): void {
    this.set('department', value);
  }

  getLastLoginAt(): Date {
    return this.get('lastLoginAt');
  }

  setLastLoginAt(value: Date): void {
    this.set('lastLoginAt', value);
  }

  getResetToken(): string {
    return this.get('resetToken');
  }

  setResetToken(value: string): void {
    this.set('resetToken', value);
  }

  getResetTokenExpiry(): Date {
    return this.get('resetTokenExpiry');
  }

  setResetTokenExpiry(value: Date): void {
    this.set('resetTokenExpiry', value);
  }

  getCompany(): any {
    return this.get('company');
  }

  setCompany(value: any): void {
    this.set('company', value);
  }

  getActivities(): any {
    return this.get('activities');
  }

  setActivities(value: any): void {
    this.set('activities', value);
  }

  getJobAssignments(): any {
    return this.get('jobAssignments');
  }

  setJobAssignments(value: any): void {
    this.set('jobAssignments', value);
  }

  getMovingJobsLead(): any {
    return this.get('movingJobsLead');
  }

  setMovingJobsLead(value: any): void {
    this.set('movingJobsLead', value);
  }

  getStockBatchesReceived(): any {
    return this.get('stockBatchesReceived');
  }

  setStockBatchesReceived(value: any): void {
    this.set('stockBatchesReceived', value);
  }

  getMaterialIssuesCreated(): any {
    return this.get('materialIssuesCreated');
  }

  setMaterialIssuesCreated(value: any): void {
    this.set('materialIssuesCreated', value);
  }

  getMaterialReturnsRecorded(): any {
    return this.get('materialReturnsRecorded');
  }

  setMaterialReturnsRecorded(value: any): void {
    this.set('materialReturnsRecorded', value);
  }

  getDamagesRecorded(): any {
    return this.get('damagesRecorded');
  }

  setDamagesRecorded(value: any): void {
    this.set('damagesRecorded', value);
  }

  getDamagesApproved(): any {
    return this.get('damagesApproved');
  }

  setDamagesApproved(value: any): void {
    this.set('damagesApproved', value);
  }

  getApprovalsRequested(): any {
    return this.get('approvalsRequested');
  }

  setApprovalsRequested(value: any): void {
    this.set('approvalsRequested', value);
  }

  getApprovalsDecided(): any {
    return this.get('approvalsDecided');
  }

  setApprovalsDecided(value: any): void {
    this.set('approvalsDecided', value);
  }

  getMaterialUsages(): any {
    return this.get('materialUsages');
  }

  setMaterialUsages(value: any): void {
    this.set('materialUsages', value);
  }

  getTransfersRequested(): any {
    return this.get('transfersRequested');
  }

  setTransfersRequested(value: any): void {
    this.set('transfersRequested', value);
  }

  getTransfersApproved(): any {
    return this.get('transfersApproved');
  }

  setTransfersApproved(value: any): void {
    this.set('transfersApproved', value);
  }

  getTransfersCompleted(): any {
    return this.get('transfersCompleted');
  }

  setTransfersCompleted(value: any): void {
    this.set('transfersCompleted', value);
  }

  getAlertsResolved(): any {
    return this.get('alertsResolved');
  }

  setAlertsResolved(value: any): void {
    this.set('alertsResolved', value);
  }

  getPurchaseOrdersCreated(): any {
    return this.get('purchaseOrdersCreated');
  }

  setPurchaseOrdersCreated(value: any): void {
    this.set('purchaseOrdersCreated', value);
  }

  getPurchaseOrdersApproved(): any {
    return this.get('purchaseOrdersApproved');
  }

  setPurchaseOrdersApproved(value: any): void {
    this.set('purchaseOrdersApproved', value);
  }

  getShipmentsCreated(): any {
    return this.get('shipmentsCreated');
  }

  setShipmentsCreated(value: any): void {
    this.set('shipmentsCreated', value);
  }

  getShipmentsAssigned(): any {
    return this.get('shipmentsAssigned');
  }

  setShipmentsAssigned(value: any): void {
    this.set('shipmentsAssigned', value);
  }

  getShipmentsReleased(): any {
    return this.get('shipmentsReleased');
  }

  setShipmentsReleased(value: any): void {
    this.set('shipmentsReleased', value);
  }

}

Parse.Object.registerSubclass('User', User);
