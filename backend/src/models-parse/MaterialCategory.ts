// Parse Class: MaterialCategory
// Auto-generated from Prisma model

import Parse from 'parse/node';

export class MaterialCategory extends Parse.Object {
  constructor() {
    super('MaterialCategory');
  }

  getName(): string {
    return this.get('name');
  }

  setName(value: string): void {
    this.set('name', value);
  }

  getDescription(): string {
    return this.get('description');
  }

  setDescription(value: string): void {
    this.set('description', value);
  }

  getParentId(): string {
    return this.get('parentId');
  }

  setParentId(value: string): void {
    this.set('parentId', value);
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

  getParent(): any {
    return this.get('parent');
  }

  setParent(value: any): void {
    this.set('parent', value);
  }

  getChildren(): any {
    return this.get('children');
  }

  setChildren(value: any): void {
    this.set('children', value);
  }

  getMaterials(): any {
    return this.get('materials');
  }

  setMaterials(value: any): void {
    this.set('materials', value);
  }

  getCompany(): any {
    return this.get('company');
  }

  setCompany(value: any): void {
    this.set('company', value);
  }

}

Parse.Object.registerSubclass('MaterialCategory', MaterialCategory);
