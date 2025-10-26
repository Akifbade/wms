// API Routes for JobCostSnapshot (Parse version)
import express from 'express';
import Parse from '../config/parse';
import { JobCostSnapshot } from '../models-parse/JobCostSnapshot';

const router = express.Router();

// GET /jobCostSnapshots
router.get('/jobCostSnapshots', async (req, res) => {
  try {
    const query = new Parse.Query(JobCostSnapshot);
    
    // Apply filters from query params
    if (req.query.status) query.equalTo('status', req.query.status);
    
    const results = await query.find({ useMasterKey: true });
    const data = results.map(obj => obj.toJSON());
    
    res.json({ jobCostSnapshots: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /jobCostSnapshots/:id
router.get('/jobCostSnapshots/:id', async (req, res) => {
  try {
    const query = new Parse.Query(JobCostSnapshot);
    const result = await query.get(req.params.id, { useMasterKey: true });
    res.json(result.toJSON());
  } catch (error: any) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /jobCostSnapshots
router.post('/jobCostSnapshots', async (req, res) => {
  try {
    const obj = new JobCostSnapshot();
    
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

// PUT /jobCostSnapshots/:id
router.put('/jobCostSnapshots/:id', async (req, res) => {
  try {
    const query = new Parse.Query(JobCostSnapshot);
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

// DELETE /jobCostSnapshots/:id
router.delete('/jobCostSnapshots/:id', async (req, res) => {
  try {
    const query = new Parse.Query(JobCostSnapshot);
    const obj = await query.get(req.params.id, { useMasterKey: true });
    await obj.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
