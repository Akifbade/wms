// Parse Class: CustomFieldValue
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class CustomFieldValue extends Parse.Object {
  constructor() {
    super('CustomFieldValue');
  }

  getCustomFieldId(): string {
    return this.get('customFieldId');
  }

  setCustomFieldId(value: string): void {
    this.set('customFieldId', value);
  }

  getEntityType(): string {
    return this.get('entityType');
  }

  setEntityType(value: string): void {
    this.set('entityType', value);
  }

  getEntityId(): string {
    return this.get('entityId');
  }

  setEntityId(value: string): void {
    this.set('entityId', value);
  }

  getFieldValue(): string {
    return this.get('fieldValue');
  }

  setFieldValue(value: string): void {
    this.set('fieldValue', value);
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

  getCustomField(): any {
    return this.get('customField');
  }

  setCustomField(value: any): void {
    this.set('customField', value);
  }

}

Parse.Object.registerSubclass('CustomFieldValue', CustomFieldValue);
