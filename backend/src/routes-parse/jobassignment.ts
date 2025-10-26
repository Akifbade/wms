// API Routes for JobAssignment (Parse version)
import express from 'express';
import Parse from '../config/parse';
import { JobAssignment } from '../models-parse/JobAssignment';

const router = express.Router();

// GET /jobAssignments
router.get('/jobAssignments', async (req, res) => {
  try {
    const query = new Parse.Query(JobAssignment);
    
    // Apply filters from query params
    if (req.query.status) query.equalTo('status', req.query.status);
    
    const results = await query.find({ useMasterKey: true });
    const data = results.map(obj => obj.toJSON());
    
    res.json({ jobAssignments: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /jobAssignments/:id
router.get('/jobAssignments/:id', async (req, res) => {
  try {
    const query = new Parse.Query(JobAssignment);
    const result = await query.get(req.params.id, { useMasterKey: true });
    res.json(result.toJSON());
  } catch (error: any) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /jobAssignments
router.post('/jobAssignments', async (req, res) => {
  try {
    const obj = new JobAssignment();
    
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

// PUT /jobAssignments/:id
router.put('/jobAssignments/:id', async (req, res) => {
  try {
    const query = new Parse.Query(JobAssignment);
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

// DELETE /jobAssignments/:id
router.delete('/jobAssignments/:id', async (req, res) => {
  try {
    const query = new Parse.Query(JobAssignment);
    const obj = await query.get(req.params.id, { useMasterKey: true });
    await obj.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
