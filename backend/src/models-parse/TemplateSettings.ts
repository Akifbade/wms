// Parse Class: TemplateSettings
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class TemplateSettings extends Parse.Object {
  constructor() {
    super('TemplateSettings');
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

  getCompanyName(): string {
    return this.get('companyName');
  }

  setCompanyName(value: string): void {
    this.set('companyName', value);
  }

  getCompanyLogo(): string {
    return this.get('companyLogo');
  }

  setCompanyLogo(value: string): void {
    this.set('companyLogo', value);
  }

  getCompanyAddress(): string {
    return this.get('companyAddress');
  }

  setCompanyAddress(value: string): void {
    this.set('companyAddress', value);
  }

  getCompanyPhone(): string {
    return this.get('companyPhone');
  }

  setCompanyPhone(value: string): void {
    this.set('companyPhone', value);
  }

  getCompanyEmail(): string {
    return this.get('companyEmail');
  }

  setCompanyEmail(value: string): void {
    this.set('companyEmail', value);
  }

  getCompanyWebsite(): string {
    return this.get('companyWebsite');
  }

  setCompanyWebsite(value: string): void {
    this.set('companyWebsite', value);
  }

  getCompanyLicense(): string {
    return this.get('companyLicense');
  }

  setCompanyLicense(value: string): void {
    this.set('companyLicense', value);
  }

  getInvoiceTemplateType(): string {
    return this.get('invoiceTemplateType');
  }

  setInvoiceTemplateType(value: string): void {
    this.set('invoiceTemplateType', value);
  }

  getInvoiceTitle(): string {
    return this.get('invoiceTitle');
  }

  setInvoiceTitle(value: string): void {
    this.set('invoiceTitle', value);
  }

  getInvoiceShowLogo(): boolean {
    return this.get('invoiceShowLogo');
  }

  setInvoiceShowLogo(value: boolean): void {
    this.set('invoiceShowLogo', value);
  }

  getInvoiceShowAddress(): boolean {
    return this.get('invoiceShowAddress');
  }

  setInvoiceShowAddress(value: boolean): void {
    this.set('invoiceShowAddress', value);
  }

  getInvoiceShowPhone(): boolean {
    return this.get('invoiceShowPhone');
  }

  setInvoiceShowPhone(value: boolean): void {
    this.set('invoiceShowPhone', value);
  }

  getInvoiceShowEmail(): boolean {
    return this.get('invoiceShowEmail');
  }

  setInvoiceShowEmail(value: boolean): void {
    this.set('invoiceShowEmail', value);
  }

  getInvoiceShowWebsite(): boolean {
    return this.get('invoiceShowWebsite');
  }

  setInvoiceShowWebsite(value: boolean): void {
    this.set('invoiceShowWebsite', value);
  }

  getInvoiceShowLicense(): boolean {
    return this.get('invoiceShowLicense');
  }

  setInvoiceShowLicense(value: boolean): void {
    this.set('invoiceShowLicense', value);
  }

  getInvoiceShowFooter(): boolean {
    return this.get('invoiceShowFooter');
  }

  setInvoiceShowFooter(value: boolean): void {
    this.set('invoiceShowFooter', value);
  }

  getInvoiceHeaderBg(): string {
    return this.get('invoiceHeaderBg');
  }

  setInvoiceHeaderBg(value: string): void {
    this.set('invoiceHeaderBg', value);
  }

  getInvoiceHeaderText(): string {
    return this.get('invoiceHeaderText');
  }

  setInvoiceHeaderText(value: string): void {
    this.set('invoiceHeaderText', value);
  }

  getInvoiceFooterText(): string {
    return this.get('invoiceFooterText');
  }

  setInvoiceFooterText(value: string): void {
    this.set('invoiceFooterText', value);
  }

  getInvoiceTerms(): string {
    return this.get('invoiceTerms');
  }

  setInvoiceTerms(value: string): void {
    this.set('invoiceTerms', value);
  }

  getInvoiceShowBorders(): boolean {
    return this.get('invoiceShowBorders');
  }

  setInvoiceShowBorders(value: boolean): void {
    this.set('invoiceShowBorders', value);
  }

  getInvoiceShowGrid(): boolean {
    return this.get('invoiceShowGrid');
  }

  setInvoiceShowGrid(value: boolean): void {
    this.set('invoiceShowGrid', value);
  }

  getInvoiceTableStyle(): string {
    return this.get('invoiceTableStyle');
  }

  setInvoiceTableStyle(value: string): void {
    this.set('invoiceTableStyle', value);
  }

  getInvoiceFontSize(): string {
    return this.get('invoiceFontSize');
  }

  setInvoiceFontSize(value: string): void {
    this.set('invoiceFontSize', value);
  }

  getInvoicePaperSize(): string {
    return this.get('invoicePaperSize');
  }

  setInvoicePaperSize(value: string): void {
    this.set('invoicePaperSize', value);
  }

  getInvoicePrimaryColor(): string {
    return this.get('invoicePrimaryColor');
  }

  setInvoicePrimaryColor(value: string): void {
    this.set('invoicePrimaryColor', value);
  }

  getInvoiceSecondaryColor(): string {
    return this.get('invoiceSecondaryColor');
  }

  setInvoiceSecondaryColor(value: string): void {
    this.set('invoiceSecondaryColor', value);
  }

  getInvoiceAccentColor(): string {
    return this.get('invoiceAccentColor');
  }

  setInvoiceAccentColor(value: string): void {
    this.set('invoiceAccentColor', value);
  }

  getInvoiceDangerColor(): string {
    return this.get('invoiceDangerColor');
  }

  setInvoiceDangerColor(value: string): void {
    this.set('invoiceDangerColor', value);
  }

  getReleaseNoteTemplate(): string {
    return this.get('releaseNoteTemplate');
  }

  setReleaseNoteTemplate(value: string): void {
    this.set('releaseNoteTemplate', value);
  }

  getReleaseNoteTitle(): string {
    return this.get('releaseNoteTitle');
  }

  setReleaseNoteTitle(value: string): void {
    this.set('releaseNoteTitle', value);
  }

  getReleaseNoteHeaderBg(): string {
    return this.get('releaseNoteHeaderBg');
  }

  setReleaseNoteHeaderBg(value: string): void {
    this.set('releaseNoteHeaderBg', value);
  }

  getReleaseNoteShowLogo(): boolean {
    return this.get('releaseNoteShowLogo');
  }

  setReleaseNoteShowLogo(value: boolean): void {
    this.set('releaseNoteShowLogo', value);
  }

  getReleaseShowShipment(): boolean {
    return this.get('releaseShowShipment');
  }

  setReleaseShowShipment(value: boolean): void {
    this.set('releaseShowShipment', value);
  }

  getReleaseShowStorage(): boolean {
    return this.get('releaseShowStorage');
  }

  setReleaseShowStorage(value: boolean): void {
    this.set('releaseShowStorage', value);
  }

  getReleaseShowItems(): boolean {
    return this.get('releaseShowItems');
  }

  setReleaseShowItems(value: boolean): void {
    this.set('releaseShowItems', value);
  }

  getReleaseShowCollector(): boolean {
    return this.get('releaseShowCollector');
  }

  setReleaseShowCollector(value: boolean): void {
    this.set('releaseShowCollector', value);
  }

  getReleaseShowCharges(): boolean {
    return this.get('releaseShowCharges');
  }

  setReleaseShowCharges(value: boolean): void {
    this.set('releaseShowCharges', value);
  }

  getReleaseShowPhotos(): boolean {
    return this.get('releaseShowPhotos');
  }

  setReleaseShowPhotos(value: boolean): void {
    this.set('releaseShowPhotos', value);
  }

  getReleaseShowTerms(): boolean {
    return this.get('releaseShowTerms');
  }

  setReleaseShowTerms(value: boolean): void {
    this.set('releaseShowTerms', value);
  }

  getReleaseShowSignatures(): boolean {
    return this.get('releaseShowSignatures');
  }

  setReleaseShowSignatures(value: boolean): void {
    this.set('releaseShowSignatures', value);
  }

  getReleaseTerms(): string {
    return this.get('releaseTerms');
  }

  setReleaseTerms(value: string): void {
    this.set('releaseTerms', value);
  }

  getReleaseFooterText(): string {
    return this.get('releaseFooterText');
  }

  setReleaseFooterText(value: string): void {
    this.set('releaseFooterText', value);
  }

  getReleasePrimaryColor(): string {
    return this.get('releasePrimaryColor');
  }

  setReleasePrimaryColor(value: string): void {
    this.set('releasePrimaryColor', value);
  }

  getPrintMarginTop(): number {
    return this.get('printMarginTop');
  }

  setPrintMarginTop(value: number): void {
    this.set('printMarginTop', value);
  }

  getPrintMarginBottom(): number {
    return this.get('printMarginBottom');
  }

  setPrintMarginBottom(value: number): void {
    this.set('printMarginBottom', value);
  }

  getPrintMarginLeft(): number {
    return this.get('printMarginLeft');
  }

  setPrintMarginLeft(value: number): void {
    this.set('printMarginLeft', value);
  }

  getPrintMarginRight(): number {
    return this.get('printMarginRight');
  }

  setPrintMarginRight(value: number): void {
    this.set('printMarginRight', value);
  }

  getLanguage(): string {
    return this.get('language');
  }

  setLanguage(value: string): void {
    this.set('language', value);
  }

  getDateFormat(): string {
    return this.get('dateFormat');
  }

  setDateFormat(value: string): void {
    this.set('dateFormat', value);
  }

  getTimeFormat(): string {
    return this.get('timeFormat');
  }

  setTimeFormat(value: string): void {
    this.set('timeFormat', value);
  }

  getCurrencySymbol(): string {
    return this.get('currencySymbol');
  }

  setCurrencySymbol(value: string): void {
    this.set('currencySymbol', value);
  }

  getCurrencyPosition(): string {
    return this.get('currencyPosition');
  }

  setCurrencyPosition(value: string): void {
    this.set('currencyPosition', value);
  }

  getCustomField1Label(): string {
    return this.get('customField1Label');
  }

  setCustomField1Label(value: string): void {
    this.set('customField1Label', value);
  }

  getCustomField1Value(): string {
    return this.get('customField1Value');
  }

  setCustomField1Value(value: string): void {
    this.set('customField1Value', value);
  }

  getCustomField2Label(): string {
    return this.get('customField2Label');
  }

  setCustomField2Label(value: string): void {
    this.set('customField2Label', value);
  }

  getCustomField2Value(): string {
    return this.get('customField2Value');
  }

  setCustomField2Value(value: string): void {
    this.set('customField2Value', value);
  }

  getCustomField3Label(): string {
    return this.get('customField3Label');
  }

  setCustomField3Label(value: string): void {
    this.set('customField3Label', value);
  }

  getCustomField3Value(): string {
    return this.get('customField3Value');
  }

  setCustomField3Value(value: string): void {
    this.set('customField3Value', value);
  }

  getRequireStaffSignature(): boolean {
    return this.get('requireStaffSignature');
  }

  setRequireStaffSignature(value: boolean): void {
    this.set('requireStaffSignature', value);
  }

  getRequireClientSignature(): boolean {
    return this.get('requireClientSignature');
  }

  setRequireClientSignature(value: boolean): void {
    this.set('requireClientSignature', value);
  }

  getSignatureHeight(): number {
    return this.get('signatureHeight');
  }

  setSignatureHeight(value: number): void {
    this.set('signatureHeight', value);
  }

  getShowQRCode(): boolean {
    return this.get('showQRCode');
  }

  setShowQRCode(value: boolean): void {
    this.set('showQRCode', value);
  }

  getQrCodePosition(): string {
    return this.get('qrCodePosition');
  }

  setQrCodePosition(value: string): void {
    this.set('qrCodePosition', value);
  }

  getQrCodeSize(): number {
    return this.get('qrCodeSize');
  }

  setQrCodeSize(value: number): void {
    this.set('qrCodeSize', value);
  }

  getShowWatermark(): boolean {
    return this.get('showWatermark');
  }

  setShowWatermark(value: boolean): void {
    this.set('showWatermark', value);
  }

  getWatermarkText(): string {
    return this.get('watermarkText');
  }

  setWatermarkText(value: string): void {
    this.set('watermarkText', value);
  }

  getWatermarkOpacity(): number {
    return this.get('watermarkOpacity');
  }

  setWatermarkOpacity(value: number): void {
    this.set('watermarkOpacity', value);
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

}

Parse.Object.registerSubclass('TemplateSettings', TemplateSettings);
