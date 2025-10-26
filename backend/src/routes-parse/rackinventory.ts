// API Routes for RackInventory (Parse version)
import express from 'express';
import Parse from '../config/parse';
import { RackInventory } from '../models-parse/RackInventory';

const router = express.Router();

// GET /rackInventorys
router.get('/rackInventorys', async (req, res) => {
  try {
    const query = new Parse.Query(RackInventory);
    
    // Apply filters from query params
    if (req.query.status) query.equalTo('status', req.query.status);
    
    const results = await query.find({ useMasterKey: true });
    const data = results.map(obj => obj.toJSON());
    
    res.json({ rackInventorys: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /rackInventorys/:id
router.get('/rackInventorys/:id', async (req, res) => {
  try {
    const query = new Parse.Query(RackInventory);
    const result = await query.get(req.params.id, { useMasterKey: true });
    res.json(result.toJSON());
  } catch (error: any) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /rackInventorys
router.post('/rackInventorys', async (req, res) => {
  try {
    const obj = new RackInventory();
    
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

// PUT /rackInventorys/:id
router.put('/rackInventorys/:id', async (req, res) => {
  try {
    const query = new Parse.Query(RackInventory);
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

// DELETE /rackInventorys/:id
router.delete('/rackInventorys/:id', async (req, res) => {
  try {
    const query = new Parse.Query(RackInventory);
    const obj = await query.get(req.params.id, { useMasterKey: true });
    await obj.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
