// API Routes for RolePermission (Parse version)
import express from 'express';
import Parse from '../config/parse';
import { RolePermission } from '../models-parse/RolePermission';

const router = express.Router();

// GET /rolePermissions
router.get('/rolePermissions', async (req, res) => {
  try {
    const query = new Parse.Query(RolePermission);
    
    // Apply filters from query params
    if (req.query.status) query.equalTo('status', req.query.status);
    
    const results = await query.find({ useMasterKey: true });
    const data = results.map(obj => obj.toJSON());
    
    res.json({ rolePermissions: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /rolePermissions/:id
router.get('/rolePermissions/:id', async (req, res) => {
  try {
    const query = new Parse.Query(RolePermission);
    const result = await query.get(req.params.id, { useMasterKey: true });
    res.json(result.toJSON());
  } catch (error: any) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /rolePermissions
router.post('/rolePermissions', async (req, res) => {
  try {
    const obj = new RolePermission();
    
    // Set all fields from request body
    Object.keys(req.body).forEach(key => {
      if (key !== 'id') obj.set(key, req.body[key]);
    });
    
    await obj.save(null, { useMasterKey: true });
    res.json(obj.toJSON());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /rolePermissions/:id
router.put('/rolePermissions/:id', async (req, res) => {
  try {
    const query = new Parse.Query(RolePermission);
    const obj = await query.get(req.params.id, { useMasterKey: true });
    
    // Update fields
    Object.keys(req.body).forEach(key => {
      if (key !== 'id') obj.set(key, req.body[key]);
    });
    
    await obj.save(null, { useMasterKey: true });
    res.json(obj.toJSON());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /rolePermissions/:id
router.delete('/rolePermissions/:id', async (req, res) => {
  try {
    const query = new Parse.Query(RolePermission);
    const obj = await query.get(req.params.id, { useMasterKey: true });
    await obj.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
