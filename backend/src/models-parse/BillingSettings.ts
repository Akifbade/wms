// Parse Class: BillingSettings
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class BillingSettings extends Parse.Object {
  constructor() {
    super('BillingSettings');
  }

  getCompanyId(): string {
    return this.get('companyId');
  }

  setCompanyId(value: string): void {
    this.set('companyId', value);
  }

  getStorageRateType(): string {
    return this.get('storageRateType');
  }

  setStorageRateType(value: string): void {
    this.set('storageRateType', value);
  }

  getStorageRatePerBox(): number {
    return this.get('storageRatePerBox');
  }

  setStorageRatePerBox(value: number): void {
    this.set('storageRatePerBox', value);
  }

  getStorageRatePerWeek(): number {
    return this.get('storageRatePerWeek');
  }

  setStorageRatePerWeek(value: number): void {
    this.set('storageRatePerWeek', value);
  }

  getStorageRatePerMonth(): number {
    return this.get('storageRatePerMonth');
  }

  setStorageRatePerMonth(value: number): void {
    this.set('storageRatePerMonth', value);
  }

  getTaxEnabled(): boolean {
    return this.get('taxEnabled');
  }

  setTaxEnabled(value: boolean): void {
    this.set('taxEnabled', value);
  }

  getTaxRate(): number {
    return this.get('taxRate');
  }

  setTaxRate(value: number): void {
    this.set('taxRate', value);
  }

  getCurrency(): string {
    return this.get('currency');
  }

  setCurrency(value: string): void {
    this.set('currency', value);
  }

  getInvoicePrefix(): string {
    return this.get('invoicePrefix');
  }

  setInvoicePrefix(value: string): void {
    this.set('invoicePrefix', value);
  }

  getInvoiceDueDays(): number {
    return this.get('invoiceDueDays');
  }

  setInvoiceDueDays(value: number): void {
    this.set('invoiceDueDays', value);
  }

  getGracePeriodDays(): number {
    return this.get('gracePeriodDays');
  }

  setGracePeriodDays(value: number): void {
    this.set('gracePeriodDays', value);
  }

  getMinimumCharge(): number {
    return this.get('minimumCharge');
  }

  setMinimumCharge(value: number): void {
    this.set('minimumCharge', value);
  }

  getLogoUrl(): string {
    return this.get('logoUrl');
  }

  setLogoUrl(value: string): void {
    this.set('logoUrl', value);
  }

  getLogoPosition(): string {
    return this.get('logoPosition');
  }

  setLogoPosition(value: string): void {
    this.set('logoPosition', value);
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

  getShowCompanyDetails(): boolean {
    return this.get('showCompanyDetails');
  }

  setShowCompanyDetails(value: boolean): void {
    this.set('showCompanyDetails', value);
  }

  getShowBankDetails(): boolean {
    return this.get('showBankDetails');
  }

  setShowBankDetails(value: boolean): void {
    this.set('showBankDetails', value);
  }

  getShowTermsConditions(): boolean {
    return this.get('showTermsConditions');
  }

  setShowTermsConditions(value: boolean): void {
    this.set('showTermsConditions', value);
  }

  getBankName(): string {
    return this.get('bankName');
  }

  setBankName(value: string): void {
    this.set('bankName', value);
  }

  getAccountNumber(): string {
    return this.get('accountNumber');
  }

  setAccountNumber(value: string): void {
    this.set('accountNumber', value);
  }

  getAccountName(): string {
    return this.get('accountName');
  }

  setAccountName(value: string): void {
    this.set('accountName', value);
  }

  getIban(): string {
    return this.get('iban');
  }

  setIban(value: string): void {
    this.set('iban', value);
  }

  getSwiftCode(): string {
    return this.get('swiftCode');
  }

  setSwiftCode(value: string): void {
    this.set('swiftCode', value);
  }

  getInvoiceFooterText(): string {
    return this.get('invoiceFooterText');
  }

  setInvoiceFooterText(value: string): void {
    this.set('invoiceFooterText', value);
  }

  getTermsAndConditions(): string {
    return this.get('termsAndConditions');
  }

  setTermsAndConditions(value: string): void {
    this.set('termsAndConditions', value);
  }

  getPaymentInstructions(): string {
    return this.get('paymentInstructions');
  }

  setPaymentInstructions(value: string): void {
    this.set('paymentInstructions', value);
  }

  getTaxRegistrationNo(): string {
    return this.get('taxRegistrationNo');
  }

  setTaxRegistrationNo(value: string): void {
    this.set('taxRegistrationNo', value);
  }

  getCompanyRegistrationNo(): string {
    return this.get('companyRegistrationNo');
  }

  setCompanyRegistrationNo(value: string): void {
    this.set('companyRegistrationNo', value);
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

  getChargeTypes(): any {
    return this.get('chargeTypes');
  }

  setChargeTypes(value: any): void {
    this.set('chargeTypes', value);
  }

}

Parse.Object.registerSubclass('BillingSettings', BillingSettings);
