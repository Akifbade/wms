// API Routes for MaterialReturn (Parse version)
import express from 'express';
import Parse from '../config/parse';
import { MaterialReturn } from '../models-parse/MaterialReturn';

const router = express.Router();

// GET /materialReturns
router.get('/materialReturns', async (req, res) => {
  try {
    const query = new Parse.Query(MaterialReturn);
    
    // Apply filters from query params
    if (req.query.status) query.equalTo('status', req.query.status);
    
    const results = await query.find({ useMasterKey: true });
    const data = results.map(obj => obj.toJSON());
    
    res.json({ materialReturns: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /materialReturns/:id
router.get('/materialReturns/:id', async (req, res) => {
  try {
    const query = new Parse.Query(MaterialReturn);
    const result = await query.get(req.params.id, { useMasterKey: true });
    res.json(result.toJSON());
  } catch (error: any) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /materialReturns
router.post('/materialReturns', async (req, res) => {
  try {
    const obj = new MaterialReturn();
    
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

// PUT /materialReturns/:id
router.put('/materialReturns/:id', async (req, res) => {
  try {
    const query = new Parse.Query(MaterialReturn);
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

// DELETE /materialReturns/:id
router.delete('/materialReturns/:id', async (req, res) => {
  try {
    const query = new Parse.Query(MaterialReturn);
    const obj = await query.get(req.params.id, { useMasterKey: true });
    await obj.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
