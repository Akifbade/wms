// API Routes for Company (Parse version)
import express from 'express';
import Parse from '../config/parse';
import { Company } from '../models-parse/Company';

const router = express.Router();

// GET /companys
router.get('/companys', async (req, res) => {
  try {
    const query = new Parse.Query(Company);
    
    // Apply filters from query params
    if (req.query.status) query.equalTo('status', req.query.status);
    
    const results = await query.find({ useMasterKey: true });
    const data = results.map(obj => obj.toJSON());
    
    res.json({ companys: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /companys/:id
router.get('/companys/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Company);
    const result = await query.get(req.params.id, { useMasterKey: true });
    res.json(result.toJSON());
  } catch (error: any) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /companys
router.post('/companys', async (req, res) => {
  try {
    const obj = new Company();
    
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

// PUT /companys/:id
router.put('/companys/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Company);
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

// DELETE /companys/:id
router.delete('/companys/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Company);
    const obj = await query.get(req.params.id, { useMasterKey: true });
    await obj.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
