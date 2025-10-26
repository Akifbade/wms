// Parse Class: ShipmentSettings
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class ShipmentSettings extends Parse.Object {
  constructor() {
    super('ShipmentSettings');
  }

  getCompanyId(): string {
    return this.get('companyId');
  }

  setCompanyId(value: string): void {
    this.set('companyId', value);
  }

  getRequireClientEmail(): boolean {
    return this.get('requireClientEmail');
  }

  setRequireClientEmail(value: boolean): void {
    this.set('requireClientEmail', value);
  }

  getRequireClientPhone(): boolean {
    return this.get('requireClientPhone');
  }

  setRequireClientPhone(value: boolean): void {
    this.set('requireClientPhone', value);
  }

  getRequireEstimatedValue(): boolean {
    return this.get('requireEstimatedValue');
  }

  setRequireEstimatedValue(value: boolean): void {
    this.set('requireEstimatedValue', value);
  }

  getRequirePhotos(): boolean {
    return this.get('requirePhotos');
  }

  setRequirePhotos(value: boolean): void {
    this.set('requirePhotos', value);
  }

  getAutoGenerateQR(): boolean {
    return this.get('autoGenerateQR');
  }

  setAutoGenerateQR(value: boolean): void {
    this.set('autoGenerateQR', value);
  }

  getQrCodePrefix(): string {
    return this.get('qrCodePrefix');
  }

  setQrCodePrefix(value: string): void {
    this.set('qrCodePrefix', value);
  }

  getShowClientAddress(): boolean {
    return this.get('showClientAddress');
  }

  setShowClientAddress(value: boolean): void {
    this.set('showClientAddress', value);
  }

  getRequireClientAddress(): boolean {
    return this.get('requireClientAddress');
  }

  setRequireClientAddress(value: boolean): void {
    this.set('requireClientAddress', value);
  }

  getShowDescription(): boolean {
    return this.get('showDescription');
  }

  setShowDescription(value: boolean): void {
    this.set('showDescription', value);
  }

  getRequireDescription(): boolean {
    return this.get('requireDescription');
  }

  setRequireDescription(value: boolean): void {
    this.set('requireDescription', value);
  }

  getShowReferenceId(): boolean {
    return this.get('showReferenceId');
  }

  setShowReferenceId(value: boolean): void {
    this.set('showReferenceId', value);
  }

  getRequireReferenceId(): boolean {
    return this.get('requireReferenceId');
  }

  setRequireReferenceId(value: boolean): void {
    this.set('requireReferenceId', value);
  }

  getShowNotes(): boolean {
    return this.get('showNotes');
  }

  setShowNotes(value: boolean): void {
    this.set('showNotes', value);
  }

  getRequireNotes(): boolean {
    return this.get('requireNotes');
  }

  setRequireNotes(value: boolean): void {
    this.set('requireNotes', value);
  }

  getShowWarehouseMode(): boolean {
    return this.get('showWarehouseMode');
  }

  setShowWarehouseMode(value: boolean): void {
    this.set('showWarehouseMode', value);
  }

  getShowShipperDetails(): boolean {
    return this.get('showShipperDetails');
  }

  setShowShipperDetails(value: boolean): void {
    this.set('showShipperDetails', value);
  }

  getRequireShipperDetails(): boolean {
    return this.get('requireShipperDetails');
  }

  setRequireShipperDetails(value: boolean): void {
    this.set('requireShipperDetails', value);
  }

  getShowConsigneeDetails(): boolean {
    return this.get('showConsigneeDetails');
  }

  setShowConsigneeDetails(value: boolean): void {
    this.set('showConsigneeDetails', value);
  }

  getRequireConsigneeDetails(): boolean {
    return this.get('requireConsigneeDetails');
  }

  setRequireConsigneeDetails(value: boolean): void {
    this.set('requireConsigneeDetails', value);
  }

  getShowWeight(): boolean {
    return this.get('showWeight');
  }

  setShowWeight(value: boolean): void {
    this.set('showWeight', value);
  }

  getRequireWeight(): boolean {
    return this.get('requireWeight');
  }

  setRequireWeight(value: boolean): void {
    this.set('requireWeight', value);
  }

  getShowDimensions(): boolean {
    return this.get('showDimensions');
  }

  setShowDimensions(value: boolean): void {
    this.set('showDimensions', value);
  }

  getRequireDimensions(): boolean {
    return this.get('requireDimensions');
  }

  setRequireDimensions(value: boolean): void {
    this.set('requireDimensions', value);
  }

  getShowStorageType(): boolean {
    return this.get('showStorageType');
  }

  setShowStorageType(value: boolean): void {
    this.set('showStorageType', value);
  }

  getShowSpecialInstructions(): boolean {
    return this.get('showSpecialInstructions');
  }

  setShowSpecialInstructions(value: boolean): void {
    this.set('showSpecialInstructions', value);
  }

  getShowEstimatedDays(): boolean {
    return this.get('showEstimatedDays');
  }

  setShowEstimatedDays(value: boolean): void {
    this.set('showEstimatedDays', value);
  }

  getRequireEstimatedDays(): boolean {
    return this.get('requireEstimatedDays');
  }

  setRequireEstimatedDays(value: boolean): void {
    this.set('requireEstimatedDays', value);
  }

  getDefaultEstimatedDays(): number {
    return this.get('defaultEstimatedDays');
  }

  setDefaultEstimatedDays(value: number): void {
    this.set('defaultEstimatedDays', value);
  }

  getFormSectionOrder(): string {
    return this.get('formSectionOrder');
  }

  setFormSectionOrder(value: string): void {
    this.set('formSectionOrder', value);
  }

  getDefaultStorageType(): string {
    return this.get('defaultStorageType');
  }

  setDefaultStorageType(value: string): void {
    this.set('defaultStorageType', value);
  }

  getAllowMultipleRacks(): boolean {
    return this.get('allowMultipleRacks');
  }

  setAllowMultipleRacks(value: boolean): void {
    this.set('allowMultipleRacks', value);
  }

  getRequireRackAssignment(): boolean {
    return this.get('requireRackAssignment');
  }

  setRequireRackAssignment(value: boolean): void {
    this.set('requireRackAssignment', value);
  }

  getAutoAssignRack(): boolean {
    return this.get('autoAssignRack');
  }

  setAutoAssignRack(value: boolean): void {
    this.set('autoAssignRack', value);
  }

  getNotifyOnLowCapacity(): boolean {
    return this.get('notifyOnLowCapacity');
  }

  setNotifyOnLowCapacity(value: boolean): void {
    this.set('notifyOnLowCapacity', value);
  }

  getLowCapacityThreshold(): number {
    return this.get('lowCapacityThreshold');
  }

  setLowCapacityThreshold(value: number): void {
    this.set('lowCapacityThreshold', value);
  }

  getRequireReleaseApproval(): boolean {
    return this.get('requireReleaseApproval');
  }

  setRequireReleaseApproval(value: boolean): void {
    this.set('requireReleaseApproval', value);
  }

  getReleaseApproverRole(): string {
    return this.get('releaseApproverRole');
  }

  setReleaseApproverRole(value: string): void {
    this.set('releaseApproverRole', value);
  }

  getRequireReleasePhotos(): boolean {
    return this.get('requireReleasePhotos');
  }

  setRequireReleasePhotos(value: boolean): void {
    this.set('requireReleasePhotos', value);
  }

  getRequireIDVerification(): boolean {
    return this.get('requireIDVerification');
  }

  setRequireIDVerification(value: boolean): void {
    this.set('requireIDVerification', value);
  }

  getGenerateReleaseInvoice(): boolean {
    return this.get('generateReleaseInvoice');
  }

  setGenerateReleaseInvoice(value: boolean): void {
    this.set('generateReleaseInvoice', value);
  }

  getAutoSendInvoiceEmail(): boolean {
    return this.get('autoSendInvoiceEmail');
  }

  setAutoSendInvoiceEmail(value: boolean): void {
    this.set('autoSendInvoiceEmail', value);
  }

  getStorageRatePerDay(): number {
    return this.get('storageRatePerDay');
  }

  setStorageRatePerDay(value: number): void {
    this.set('storageRatePerDay', value);
  }

  getStorageRatePerBox(): number {
    return this.get('storageRatePerBox');
  }

  setStorageRatePerBox(value: number): void {
    this.set('storageRatePerBox', value);
  }

  getChargePartialDay(): boolean {
    return this.get('chargePartialDay');
  }

  setChargePartialDay(value: boolean): void {
    this.set('chargePartialDay', value);
  }

  getMinimumChargeDays(): number {
    return this.get('minimumChargeDays');
  }

  setMinimumChargeDays(value: number): void {
    this.set('minimumChargeDays', value);
  }

  getReleaseHandlingFee(): number {
    return this.get('releaseHandlingFee');
  }

  setReleaseHandlingFee(value: number): void {
    this.set('releaseHandlingFee', value);
  }

  getReleasePerBoxFee(): number {
    return this.get('releasePerBoxFee');
  }

  setReleasePerBoxFee(value: number): void {
    this.set('releasePerBoxFee', value);
  }

  getReleaseTransportFee(): number {
    return this.get('releaseTransportFee');
  }

  setReleaseTransportFee(value: number): void {
    this.set('releaseTransportFee', value);
  }

  getNotifyClientOnIntake(): boolean {
    return this.get('notifyClientOnIntake');
  }

  setNotifyClientOnIntake(value: boolean): void {
    this.set('notifyClientOnIntake', value);
  }

  getNotifyClientOnRelease(): boolean {
    return this.get('notifyClientOnRelease');
  }

  setNotifyClientOnRelease(value: boolean): void {
    this.set('notifyClientOnRelease', value);
  }

  getNotifyOnStorageAlert(): boolean {
    return this.get('notifyOnStorageAlert');
  }

  setNotifyOnStorageAlert(value: boolean): void {
    this.set('notifyOnStorageAlert', value);
  }

  getStorageAlertDays(): number {
    return this.get('storageAlertDays');
  }

  setStorageAlertDays(value: number): void {
    this.set('storageAlertDays', value);
  }

  getEnableCustomFields(): boolean {
    return this.get('enableCustomFields');
  }

  setEnableCustomFields(value: boolean): void {
    this.set('enableCustomFields', value);
  }

  getRequiredCustomFields(): string {
    return this.get('requiredCustomFields');
  }

  setRequiredCustomFields(value: string): void {
    this.set('requiredCustomFields', value);
  }

  getAllowPartialRelease(): boolean {
    return this.get('allowPartialRelease');
  }

  setAllowPartialRelease(value: boolean): void {
    this.set('allowPartialRelease', value);
  }

  getPartialReleaseMinBoxes(): number {
    return this.get('partialReleaseMinBoxes');
  }

  setPartialReleaseMinBoxes(value: number): void {
    this.set('partialReleaseMinBoxes', value);
  }

  getRequirePartialApproval(): boolean {
    return this.get('requirePartialApproval');
  }

  setRequirePartialApproval(value: boolean): void {
    this.set('requirePartialApproval', value);
  }

  getRequireReleaseSignature(): boolean {
    return this.get('requireReleaseSignature');
  }

  setRequireReleaseSignature(value: boolean): void {
    this.set('requireReleaseSignature', value);
  }

  getRequireCollectorID(): boolean {
    return this.get('requireCollectorID');
  }

  setRequireCollectorID(value: boolean): void {
    this.set('requireCollectorID', value);
  }

  getAllowProxyCollection(): boolean {
    return this.get('allowProxyCollection');
  }

  setAllowProxyCollection(value: boolean): void {
    this.set('allowProxyCollection', value);
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

Parse.Object.registerSubclass('ShipmentSettings', ShipmentSettings);
