// Parse Class: CustomField
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class CustomField extends Parse.Object {
  constructor() {
    super('CustomField');
  }

  getCompanyId(): string {
    return this.get('companyId');
  }

  setCompanyId(value: string): void {
    this.set('companyId', value);
  }

  getFieldName(): string {
    return this.get('fieldName');
  }

  setFieldName(value: string): void {
    this.set('fieldName', value);
  }

  getFieldType(): string {
    return this.get('fieldType');
  }

  setFieldType(value: string): void {
    this.set('fieldType', value);
  }

  getFieldOptions(): string {
    return this.get('fieldOptions');
  }

  setFieldOptions(value: string): void {
    this.set('fieldOptions', value);
  }

  getIsRequired(): boolean {
    return this.get('isRequired');
  }

  setIsRequired(value: boolean): void {
    this.set('isRequired', value);
  }

  getIsActive(): boolean {
    return this.get('isActive');
  }

  setIsActive(value: boolean): void {
    this.set('isActive', value);
  }

  getSection(): string {
    return this.get('section');
  }

  setSection(value: string): void {
    this.set('section', value);
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

  getValues(): any {
    return this.get('values');
  }

  setValues(value: any): void {
    this.set('values', value);
  }

}

Parse.Object.registerSubclass('CustomField', CustomField);
