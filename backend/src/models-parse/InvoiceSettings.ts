// Parse Class: InvoiceSettings
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class InvoiceSettings extends Parse.Object {
  constructor() {
    super('InvoiceSettings');
  }

  getCompanyId(): string {
    return this.get('companyId');
  }

  setCompanyId(value: string): void {
    this.set('companyId', value);
  }

  getTemplateType(): string {
    return this.get('templateType');
  }

  setTemplateType(value: string): void {
    this.set('templateType', value);
  }

  getPrimaryColor(): string {
    return this.get('primaryColor');
  }

  setPrimaryColor(value: string): void {
    this.set('primaryColor', value);
  }

  getSecondaryColor(): string {
    return this.get('secondaryColor');
  }

  setSecondaryColor(value: string): void {
    this.set('secondaryColor', value);
  }

  getShowLogo(): boolean {
    return this.get('showLogo');
  }

  setShowLogo(value: boolean): void {
    this.set('showLogo', value);
  }

  getFooterText(): string {
    return this.get('footerText');
  }

  setFooterText(value: string): void {
    this.set('footerText', value);
  }

  getTermsConditions(): string {
    return this.get('termsConditions');
  }

  setTermsConditions(value: string): void {
    this.set('termsConditions', value);
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

  getCompany(): any {
    return this.get('company');
  }

  setCompany(value: any): void {
    this.set('company', value);
  }

}

Parse.Object.registerSubclass('InvoiceSettings', InvoiceSettings);
