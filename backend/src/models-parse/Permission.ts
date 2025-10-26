// Parse Class: Permission
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class Permission extends Parse.Object {
  constructor() {
    super('Permission');
  }

  getResource(): string {
    return this.get('resource');
  }

  setResource(value: string): void {
    this.set('resource', value);
  }

  getAction(): string {
    return this.get('action');
  }

  setAction(value: string): void {
    this.set('action', value);
  }

  getDescription(): string {
    return this.get('description');
  }

  setDescription(value: string): void {
    this.set('description', value);
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

  getRolePermissions(): any {
    return this.get('rolePermissions');
  }

  setRolePermissions(value: any): void {
    this.set('rolePermissions', value);
  }

}

Parse.Object.registerSubclass('Permission', Permission);
