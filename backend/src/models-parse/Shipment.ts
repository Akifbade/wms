// Parse Class: Shipment
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class Shipment extends Parse.Object {
  constructor() {
    super('Shipment');
  }

  getName(): string {
    return this.get('name');
  }

  setName(value: string): void {
    this.set('name', value);
  }

  getReferenceId(): string {
    return this.get('referenceId');
  }

  setReferenceId(value: string): void {
    this.set('referenceId', value);
  }

  getOriginalBoxCount(): number {
    return this.get('originalBoxCount');
  }

  setOriginalBoxCount(value: number): void {
    this.set('originalBoxCount', value);
  }

  getCurrentBoxCount(): number {
    return this.get('currentBoxCount');
  }

  setCurrentBoxCount(value: number): void {
    this.set('currentBoxCount', value);
  }

  getType(): string {
    return this.get('type');
  }

  setType(value: string): void {
    this.set('type', value);
  }

  getArrivalDate(): Date {
    return this.get('arrivalDate');
  }

  setArrivalDate(value: Date): void {
    this.set('arrivalDate', value);
  }

  getClientName(): string {
    return this.get('clientName');
  }

  setClientName(value: string): void {
    this.set('clientName', value);
  }

  getClientPhone(): string {
    return this.get('clientPhone');
  }

  setClientPhone(value: string): void {
    this.set('clientPhone', value);
  }

  getClientEmail(): string {
    return this.get('clientEmail');
  }

  setClientEmail(value: string): void {
    this.set('clientEmail', value);
  }

  getDescription(): string {
    return this.get('description');
  }

  setDescription(value: string): void {
    this.set('description', value);
  }

  getEstimatedValue(): number {
    return this.get('estimatedValue');
  }

  setEstimatedValue(value: number): void {
    this.set('estimatedValue', value);
  }

  getNotes(): string {
    return this.get('notes');
  }

  setNotes(value: string): void {
    this.set('notes', value);
  }

  getQrCode(): string {
    return this.get('qrCode');
  }

  setQrCode(value: string): void {
    this.set('qrCode', value);
  }

  getStatus(): string {
    return this.get('status');
  }

  setStatus(value: string): void {
    this.set('status', value);
  }

  getAssignedAt(): Date {
    return this.get('assignedAt');
  }

  setAssignedAt(value: Date): void {
    this.set('assignedAt', value);
  }

  getReleasedAt(): Date {
    return this.get('releasedAt');
  }

  setReleasedAt(value: Date): void {
    this.set('releasedAt', value);
  }

  getStorageCharge(): number {
    return this.get('storageCharge');
  }

  setStorageCharge(value: number): void {
    this.set('storageCharge', value);
  }

  getCompanyId(): string {
    return this.get('companyId');
  }

  setCompanyId(value: string): void {
    this.set('companyId', value);
  }

  getCreatedById(): string {
    return this.get('createdById');
  }

  setCreatedById(value: string): void {
    this.set('createdById', value);
  }

  getAssignedById(): string {
    return this.get('assignedById');
  }

  setAssignedById(value: string): void {
    this.set('assignedById', value);
  }

  getReleasedById(): string {
    return this.get('releasedById');
  }

  setReleasedById(value: string): void {
    this.set('releasedById', value);
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

  getIsWarehouseShipment(): boolean {
    return this.get('isWarehouseShipment');
  }

  setIsWarehouseShipment(value: boolean): void {
    this.set('isWarehouseShipment', value);
  }

  getWarehouseData(): string {
    return this.get('warehouseData');
  }

  setWarehouseData(value: string): void {
    this.set('warehouseData', value);
  }

  getShipper(): string {
    return this.get('shipper');
  }

  setShipper(value: string): void {
    this.set('shipper', value);
  }

  getConsignee(): string {
    return this.get('consignee');
  }

  setConsignee(value: string): void {
    this.set('consignee', value);
  }

  getCategory(): string {
    return this.get('category');
  }

  setCategory(value: string): void {
    this.set('category', value);
  }

  getAwbNumber(): string {
    return this.get('awbNumber');
  }

  setAwbNumber(value: string): void {
    this.set('awbNumber', value);
  }

  getFlightNumber(): string {
    return this.get('flightNumber');
  }

  setFlightNumber(value: string): void {
    this.set('flightNumber', value);
  }

  getOrigin(): string {
    return this.get('origin');
  }

  setOrigin(value: string): void {
    this.set('origin', value);
  }

  getDestination(): string {
    return this.get('destination');
  }

  setDestination(value: string): void {
    this.set('destination', value);
  }

  getCustomerName(): string {
    return this.get('customerName');
  }

  setCustomerName(value: string): void {
    this.set('customerName', value);
  }

  getCompany(): any {
    return this.get('company');
  }

  setCompany(value: any): void {
    this.set('company', value);
  }

  getBoxes(): any {
    return this.get('boxes');
  }

  setBoxes(value: any): void {
    this.set('boxes', value);
  }

  getWithdrawals(): any {
    return this.get('withdrawals');
  }

  setWithdrawals(value: any): void {
    this.set('withdrawals', value);
  }

  getInvoices(): any {
    return this.get('invoices');
  }

  setInvoices(value: any): void {
    this.set('invoices', value);
  }

  getCharges(): any {
    return this.get('charges');
  }

  setCharges(value: any): void {
    this.set('charges', value);
  }

  getItems(): any {
    return this.get('items');
  }

  setItems(value: any): void {
    this.set('items', value);
  }

  getMaterialUsages(): any {
    return this.get('materialUsages');
  }

  setMaterialUsages(value: any): void {
    this.set('materialUsages', value);
  }

  getCreatedBy(): any {
    return this.get('createdBy');
  }

  setCreatedBy(value: any): void {
    this.set('createdBy', value);
  }

  getAssignedBy(): any {
    return this.get('assignedBy');
  }

  setAssignedBy(value: any): void {
    this.set('assignedBy', value);
  }

  getReleasedBy(): any {
    return this.get('releasedBy');
  }

  setReleasedBy(value: any): void {
    this.set('releasedBy', value);
  }

}

Parse.Object.registerSubclass('Shipment', Shipment);
