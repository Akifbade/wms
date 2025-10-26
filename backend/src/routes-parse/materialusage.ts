// API Routes for MaterialUsage (Parse version)
import express from 'express';
import Parse from '../config/parse';
import { MaterialUsage } from '../models-parse/MaterialUsage';

const router = express.Router();

// GET /materialUsages
router.get('/materialUsages', async (req, res) => {
  try {
    const query = new Parse.Query(MaterialUsage);
    
    // Apply filters from query params
    if (req.query.status) query.equalTo('status', req.query.status);
    
    const results = await query.find({ useMasterKey: true });
    const data = results.map(obj => obj.toJSON());
    
    res.json({ materialUsages: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /materialUsages/:id
router.get('/materialUsages/:id', async (req, res) => {
  try {
    const query = new Parse.Query(MaterialUsage);
    const result = await query.get(req.params.id, { useMasterKey: true });
    res.json(result.toJSON());
  } catch (error: any) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /materialUsages
router.post('/materialUsages', async (req, res) => {
  try {
    const obj = new MaterialUsage();
    
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

// PUT /materialUsages/:id
router.put('/materialUsages/:id', async (req, res) => {
  try {
    const query = new Parse.Query(MaterialUsage);
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

// DELETE /materialUsages/:id
router.delete('/materialUsages/:id', async (req, res) => {
  try {
    const query = new Parse.Query(MaterialUsage);
    const obj = await query.get(req.params.id, { useMasterKey: true });
    await obj.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
