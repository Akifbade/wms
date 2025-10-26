// Parse Class: RolePermission
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class RolePermission extends Parse.Object {
  constructor() {
    super('RolePermission');
  }

  getRole(): string {
    return this.get('role');
  }

  setRole(value: string): void {
    this.set('role', value);
  }

  getPermissionId(): string {
    return this.get('permissionId');
  }

  setPermissionId(value: string): void {
    this.set('permissionId', value);
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

  getPermission(): any {
    return this.get('permission');
  }

  setPermission(value: any): void {
    this.set('permission', value);
  }

  getCompany(): any {
    return this.get('company');
  }

  setCompany(value: any): void {
    this.set('company', value);
  }

}

Parse.Object.registerSubclass('RolePermission', RolePermission);
