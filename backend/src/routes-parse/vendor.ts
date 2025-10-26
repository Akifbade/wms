// API Routes for Vendor (Parse version)
import express from 'express';
import Parse from '../config/parse';
import { Vendor } from '../models-parse/Vendor';

const router = express.Router();

// GET /vendors
router.get('/vendors', async (req, res) => {
  try {
    const query = new Parse.Query(Vendor);
    
    // Apply filters from query params
    if (req.query.status) query.equalTo('status', req.query.status);
    
    const results = await query.find({ useMasterKey: true });
    const data = results.map(obj => obj.toJSON());
    
    res.json({ vendors: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /vendors/:id
router.get('/vendors/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Vendor);
    const result = await query.get(req.params.id, { useMasterKey: true });
    res.json(result.toJSON());
  } catch (error: any) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /vendors
router.post('/vendors', async (req, res) => {
  try {
    const obj = new Vendor();
    
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

// PUT /vendors/:id
router.put('/vendors/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Vendor);
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

// DELETE /vendors/:id
router.delete('/vendors/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Vendor);
    const obj = await query.get(req.params.id, { useMasterKey: true });
    await obj.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
