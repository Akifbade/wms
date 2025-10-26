// Parse Class: SystemPluginLog
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class SystemPluginLog extends Parse.Object {
  constructor() {
    super('SystemPluginLog');
  }

  getPluginId(): string {
    return this.get('pluginId');
  }

  setPluginId(value: string): void {
    this.set('pluginId', value);
  }

  getAction(): string {
    return this.get('action');
  }

  setAction(value: string): void {
    this.set('action', value);
  }

  getStatus(): string {
    return this.get('status');
  }

  setStatus(value: string): void {
    this.set('status', value);
  }

  getMessage(): string {
    return this.get('message');
  }

  setMessage(value: string): void {
    this.set('message', value);
  }

  getPerformedBy(): string {
    return this.get('performedBy');
  }

  setPerformedBy(value: string): void {
    this.set('performedBy', value);
  }

  getCreatedAt(): Date {
    return this.get('createdAt');
  }

  setCreatedAt(value: Date): void {
    this.set('createdAt', value);
  }

  getCompanyId(): string {
    return this.get('companyId');
  }

  setCompanyId(value: string): void {
    this.set('companyId', value);
  }

  getPlugin(): any {
    return this.get('plugin');
  }

  setPlugin(value: any): void {
    this.set('plugin', value);
  }

  getCompany(): any {
    return this.get('company');
  }

  setCompany(value: any): void {
    this.set('company', value);
  }

}

Parse.Object.registerSubclass('SystemPluginLog', SystemPluginLog);
