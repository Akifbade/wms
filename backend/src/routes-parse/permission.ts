// API Routes for Permission (Parse version)
import express from 'express';
import Parse from '../config/parse';
import { Permission } from '../models-parse/Permission';

const router = express.Router();

// GET /permissions
router.get('/permissions', async (req, res) => {
  try {
    const query = new Parse.Query(Permission);
    
    // Apply filters from query params
    if (req.query.status) query.equalTo('status', req.query.status);
    
    const results = await query.find({ useMasterKey: true });
    const data = results.map(obj => obj.toJSON());
    
    res.json({ permissions: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /permissions/:id
router.get('/permissions/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Permission);
    const result = await query.get(req.params.id, { useMasterKey: true });
    res.json(result.toJSON());
  } catch (error: any) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /permissions
router.post('/permissions', async (req, res) => {
  try {
    const obj = new Permission();
    
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

// PUT /permissions/:id
router.put('/permissions/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Permission);
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

// DELETE /permissions/:id
router.delete('/permissions/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Permission);
    const obj = await query.get(req.params.id, { useMasterKey: true });
    await obj.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
