import React, { useState, useEffect } from 'react';
import { categoriesAPI } from '../services/api';
import './CategoryManagement.css';

interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  logo: string;
  isActive: boolean;
  createdAt: string;
}

interface CategoryManagementProps {
  companyId: string;
  onRefresh?: () => void;
}

export default function CategoryManagement({ companyId, onRefresh }: CategoryManagementProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#FF5733',
    icon: '',
    logo: null as File | null,
    isActive: true,
  });

  // Load categories on mount and when companyId changes
  useEffect(() => {
    if (companyId) {
      loadCategories();
    }
  }, [companyId]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await categoriesAPI.listByCompany(companyId);
      setCategories(data);
    } catch (err) {
      setError(`Failed to load categories: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Load categories error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({
        ...prev,
        logo: e.target.files![0],
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Category name is required');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('description', formData.description);
      submitData.append('color', formData.color);
      submitData.append('icon', formData.icon);
      submitData.append('isActive', String(formData.isActive));
      if (formData.logo) {
        submitData.append('logo', formData.logo);
      }

      if (editingId) {
        // Update category
        await categoriesAPI.update(editingId, submitData);
      } else {
        // Create new category
        submitData.append('companyId', companyId);
        await categoriesAPI.create(submitData);
      }

      // Reset form
      setFormData({
        name: '',
        description: '',
        color: '#FF5733',
        icon: '',
        logo: null,
        isActive: true,
      });
      setShowForm(false);
      setEditingId(null);

      // Reload categories
      await loadCategories();
      onRefresh?.();
    } catch (err) {
      setError(`Failed to save category: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Save category error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category: Category) => {
    setFormData({
      name: category.name,
      description: category.description,
      color: category.color,
      icon: category.icon,
      logo: null,
      isActive: category.isActive,
    });
    setEditingId(category.id);
    setShowForm(true);
  };

  const handleDelete = async (categoryId: string) => {
    if (!window.confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      await categoriesAPI.delete(categoryId);
      await loadCategories();
      onRefresh?.();
    } catch (err) {
      setError(`Failed to delete category: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Delete category error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      description: '',
      color: '#FF5733',
      icon: '',
      logo: null,
      isActive: true,
    });
    setShowForm(false);
    setEditingId(null);
  };

  return (
    <div className="category-management">
      <div className="category-header">
        <h2>Category Management</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
          disabled={loading}
        >
          {showForm ? 'Cancel' : '+ Add Category'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Form Section */}
      {showForm && (
        <form className="category-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Category Name *</label>
              <input
                id="name"
                type="text"
                name="name"
                placeholder="e.g., DIOR, COMPANY_MATERIAL"
                value={formData.name}
                onChange={handleInputChange}
                disabled={loading}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="color">Color</label>
              <input
                id="color"
                type="color"
                name="color"
                value={formData.color}
                onChange={handleInputChange}
                disabled={loading}
              />
              <span className="color-code">{formData.color}</span>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                placeholder="Category description"
                value={formData.description}
                onChange={handleInputChange}
                disabled={loading}
                rows={3}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="icon">Icon Name</label>
              <input
                id="icon"
                type="text"
                name="icon"
                placeholder="e.g., diamond, crown, package"
                value={formData.icon}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="logo">Logo File</label>
              <input
                id="logo"
                type="file"
                name="logo"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleFileChange}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group checkbox">
              <input
                id="isActive"
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
                disabled={loading}
              />
              <label htmlFor="isActive">Active</label>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-success" disabled={loading}>
              {loading ? 'Saving...' : editingId ? 'Update Category' : 'Create Category'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleCancel} disabled={loading}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Categories List Section */}
      <div className="categories-list">
        {loading && !showForm && <div className="loading">Loading categories...</div>}

        {!loading && categories.length === 0 && !showForm && (
          <div className="empty-state">
            <p>No categories found. Create your first category to get started.</p>
          </div>
        )}

        {categories.length > 0 && (
          <div className="categories-grid">
            {categories.map(category => (
              <div
                key={category.id}
                className={`category-card ${!category.isActive ? 'inactive' : ''}`}
              >
                {category.logo && (
                  <div className="category-logo">
                    <img src={category.logo} alt={category.name} />
                  </div>
                )}

                <div className="category-color-indicator" style={{ backgroundColor: category.color }} />

                <div className="category-content">
                  <h3>{category.name}</h3>
                  {category.description && <p className="description">{category.description}</p>}
                  {category.icon && <p className="icon-label">Icon: {category.icon}</p>}
                  <div className="category-meta">
                    <span className={`status ${category.isActive ? 'active' : 'inactive'}`}>
                      {category.isActive ? '✓ Active' : '✗ Inactive'}
                    </span>
                    <span className="color-label">{category.color}</span>
                  </div>
                </div>

                <div className="category-actions">
                  <button
                    className="btn btn-sm btn-info"
                    onClick={() => handleEdit(category)}
                    disabled={loading}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(category.id)}
                    disabled={loading}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
