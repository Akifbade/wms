// API Routes for MovingJob (Parse version)
import express from 'express';
import Parse from '../config/parse';
import { MovingJob } from '../models-parse/MovingJob';

const router = express.Router();

// GET /movingJobs
router.get('/movingJobs', async (req, res) => {
  try {
    const query = new Parse.Query(MovingJob);
    
    // Apply filters from query params
    if (req.query.status) query.equalTo('status', req.query.status);
    
    const results = await query.find({ useMasterKey: true });
    const data = results.map(obj => obj.toJSON());
    
    res.json({ movingJobs: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /movingJobs/:id
router.get('/movingJobs/:id', async (req, res) => {
  try {
    const query = new Parse.Query(MovingJob);
    const result = await query.get(req.params.id, { useMasterKey: true });
    res.json(result.toJSON());
  } catch (error: any) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /movingJobs
router.post('/movingJobs', async (req, res) => {
  try {
    const obj = new MovingJob();
    
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

// PUT /movingJobs/:id
router.put('/movingJobs/:id', async (req, res) => {
  try {
    const query = new Parse.Query(MovingJob);
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

// DELETE /movingJobs/:id
router.delete('/movingJobs/:id', async (req, res) => {
  try {
    const query = new Parse.Query(MovingJob);
    const obj = await query.get(req.params.id, { useMasterKey: true });
    await obj.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
