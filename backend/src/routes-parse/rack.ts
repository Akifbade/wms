// API Routes for Rack (Parse version)
import express from 'express';
import Parse from '../config/parse';
import { Rack } from '../models-parse/Rack';

const router = express.Router();

// GET /racks
router.get('/racks', async (req, res) => {
  try {
    const query = new Parse.Query(Rack);
    
    // Apply filters from query params
    if (req.query.status) query.equalTo('status', req.query.status);
    
    const results = await query.find({ useMasterKey: true });
    const data = results.map(obj => obj.toJSON());
    
    res.json({ racks: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /racks/:id
router.get('/racks/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Rack);
    const result = await query.get(req.params.id, { useMasterKey: true });
    res.json(result.toJSON());
  } catch (error: any) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /racks
router.post('/racks', async (req, res) => {
  try {
    const obj = new Rack();
    
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

// PUT /racks/:id
router.put('/racks/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Rack);
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

// DELETE /racks/:id
router.delete('/racks/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Rack);
    const obj = await query.get(req.params.id, { useMasterKey: true });
    await obj.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
