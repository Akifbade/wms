// Parse Class: ChargeType
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class ChargeType extends Parse.Object {
  constructor() {
    super('ChargeType');
  }

  getCompanyId(): string {
    return this.get('companyId');
  }

  setCompanyId(value: string): void {
    this.set('companyId', value);
  }

  getBillingSettingsId(): string {
    return this.get('billingSettingsId');
  }

  setBillingSettingsId(value: string): void {
    this.set('billingSettingsId', value);
  }

  getName(): string {
    return this.get('name');
  }

  setName(value: string): void {
    this.set('name', value);
  }

  getCode(): string {
    return this.get('code');
  }

  setCode(value: string): void {
    this.set('code', value);
  }

  getDescription(): string {
    return this.get('description');
  }

  setDescription(value: string): void {
    this.set('description', value);
  }

  getCategory(): string {
    return this.get('category');
  }

  setCategory(value: string): void {
    this.set('category', value);
  }

  getCalculationType(): string {
    return this.get('calculationType');
  }

  setCalculationType(value: string): void {
    this.set('calculationType', value);
  }

  getRate(): number {
    return this.get('rate');
  }

  setRate(value: number): void {
    this.set('rate', value);
  }

  getMinCharge(): number {
    return this.get('minCharge');
  }

  setMinCharge(value: number): void {
    this.set('minCharge', value);
  }

  getMaxCharge(): number {
    return this.get('maxCharge');
  }

  setMaxCharge(value: number): void {
    this.set('maxCharge', value);
  }

  getApplyOnRelease(): boolean {
    return this.get('applyOnRelease');
  }

  setApplyOnRelease(value: boolean): void {
    this.set('applyOnRelease', value);
  }

  getApplyOnStorage(): boolean {
    return this.get('applyOnStorage');
  }

  setApplyOnStorage(value: boolean): void {
    this.set('applyOnStorage', value);
  }

  getIsTaxable(): boolean {
    return this.get('isTaxable');
  }

  setIsTaxable(value: boolean): void {
    this.set('isTaxable', value);
  }

  getIsActive(): boolean {
    return this.get('isActive');
  }

  setIsActive(value: boolean): void {
    this.set('isActive', value);
  }

  getIsDefault(): boolean {
    return this.get('isDefault');
  }

  setIsDefault(value: boolean): void {
    this.set('isDefault', value);
  }

  getDisplayOrder(): number {
    return this.get('displayOrder');
  }

  setDisplayOrder(value: number): void {
    this.set('displayOrder', value);
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

  getBillingSettings(): any {
    return this.get('billingSettings');
  }

  setBillingSettings(value: any): void {
    this.set('billingSettings', value);
  }

}

Parse.Object.registerSubclass('ChargeType', ChargeType);
