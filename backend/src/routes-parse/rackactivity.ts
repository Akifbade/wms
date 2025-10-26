// API Routes for RackActivity (Parse version)
import express from 'express';
import Parse from '../config/parse';
import { RackActivity } from '../models-parse/RackActivity';

const router = express.Router();

// GET /rackActivitys
router.get('/rackActivitys', async (req, res) => {
  try {
    const query = new Parse.Query(RackActivity);
    
    // Apply filters from query params
    if (req.query.status) query.equalTo('status', req.query.status);
    
    const results = await query.find({ useMasterKey: true });
    const data = results.map(obj => obj.toJSON());
    
    res.json({ rackActivitys: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /rackActivitys/:id
router.get('/rackActivitys/:id', async (req, res) => {
  try {
    const query = new Parse.Query(RackActivity);
    const result = await query.get(req.params.id, { useMasterKey: true });
    res.json(result.toJSON());
  } catch (error: any) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /rackActivitys
router.post('/rackActivitys', async (req, res) => {
  try {
    const obj = new RackActivity();
    
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

// PUT /rackActivitys/:id
router.put('/rackActivitys/:id', async (req, res) => {
  try {
    const query = new Parse.Query(RackActivity);
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

// DELETE /rackActivitys/:id
router.delete('/rackActivitys/:id', async (req, res) => {
  try {
    const query = new Parse.Query(RackActivity);
    const obj = await query.get(req.params.id, { useMasterKey: true });
    await obj.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
