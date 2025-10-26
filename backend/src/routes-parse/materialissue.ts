// API Routes for MaterialIssue (Parse version)
import express from 'express';
import Parse from '../config/parse';
import { MaterialIssue } from '../models-parse/MaterialIssue';

const router = express.Router();

// GET /materialIssues
router.get('/materialIssues', async (req, res) => {
  try {
    const query = new Parse.Query(MaterialIssue);
    
    // Apply filters from query params
    if (req.query.status) query.equalTo('status', req.query.status);
    
    const results = await query.find({ useMasterKey: true });
    const data = results.map(obj => obj.toJSON());
    
    res.json({ materialIssues: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /materialIssues/:id
router.get('/materialIssues/:id', async (req, res) => {
  try {
    const query = new Parse.Query(MaterialIssue);
    const result = await query.get(req.params.id, { useMasterKey: true });
    res.json(result.toJSON());
  } catch (error: any) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /materialIssues
router.post('/materialIssues', async (req, res) => {
  try {
    const obj = new MaterialIssue();
    
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

// PUT /materialIssues/:id
router.put('/materialIssues/:id', async (req, res) => {
  try {
    const query = new Parse.Query(MaterialIssue);
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

// DELETE /materialIssues/:id
router.delete('/materialIssues/:id', async (req, res) => {
  try {
    const query = new Parse.Query(MaterialIssue);
    const obj = await query.get(req.params.id, { useMasterKey: true });
    await obj.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
