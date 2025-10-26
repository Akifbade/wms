// Parse Class: SystemPlugin
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class SystemPlugin extends Parse.Object {
  constructor() {
    super('SystemPlugin');
  }

  getName(): string {
    return this.get('name');
  }

  setName(value: string): void {
    this.set('name', value);
  }

  getDescription(): string {
    return this.get('description');
  }

  setDescription(value: string): void {
    this.set('description', value);
  }

  getVersion(): string {
    return this.get('version');
  }

  setVersion(value: string): void {
    this.set('version', value);
  }

  getStatus(): string {
    return this.get('status');
  }

  setStatus(value: string): void {
    this.set('status', value);
  }

  getEntryPointUrl(): string {
    return this.get('entryPointUrl');
  }

  setEntryPointUrl(value: string): void {
    this.set('entryPointUrl', value);
  }

  getChecksum(): string {
    return this.get('checksum');
  }

  setChecksum(value: string): void {
    this.set('checksum', value);
  }

  getInstalledAt(): Date {
    return this.get('installedAt');
  }

  setInstalledAt(value: Date): void {
    this.set('installedAt', value);
  }

  getActivatedAt(): Date {
    return this.get('activatedAt');
  }

  setActivatedAt(value: Date): void {
    this.set('activatedAt', value);
  }

  getDeactivatedAt(): Date {
    return this.get('deactivatedAt');
  }

  setDeactivatedAt(value: Date): void {
    this.set('deactivatedAt', value);
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

  getAuditLogs(): any {
    return this.get('auditLogs');
  }

  setAuditLogs(value: any): void {
    this.set('auditLogs', value);
  }

}

Parse.Object.registerSubclass('SystemPlugin', SystemPlugin);
