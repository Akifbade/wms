// API Routes for MaterialApproval (Parse version)
import express from 'express';
import Parse from '../config/parse';
import { MaterialApproval } from '../models-parse/MaterialApproval';

const router = express.Router();

// GET /materialApprovals
router.get('/materialApprovals', async (req, res) => {
  try {
    const query = new Parse.Query(MaterialApproval);
    
    // Apply filters from query params
    if (req.query.status) query.equalTo('status', req.query.status);
    
    const results = await query.find({ useMasterKey: true });
    const data = results.map(obj => obj.toJSON());
    
    res.json({ materialApprovals: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /materialApprovals/:id
router.get('/materialApprovals/:id', async (req, res) => {
  try {
    const query = new Parse.Query(MaterialApproval);
    const result = await query.get(req.params.id, { useMasterKey: true });
    res.json(result.toJSON());
  } catch (error: any) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /materialApprovals
router.post('/materialApprovals', async (req, res) => {
  try {
    const obj = new MaterialApproval();
    
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

// PUT /materialApprovals/:id
router.put('/materialApprovals/:id', async (req, res) => {
  try {
    const query = new Parse.Query(MaterialApproval);
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

// DELETE /materialApprovals/:id
router.delete('/materialApprovals/:id', async (req, res) => {
  try {
    const query = new Parse.Query(MaterialApproval);
    const obj = await query.get(req.params.id, { useMasterKey: true });
    await obj.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
