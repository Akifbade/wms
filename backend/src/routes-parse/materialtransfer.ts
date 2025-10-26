// API Routes for MaterialTransfer (Parse version)
import express from 'express';
import Parse from '../config/parse';
import { MaterialTransfer } from '../models-parse/MaterialTransfer';

const router = express.Router();

// GET /materialTransfers
router.get('/materialTransfers', async (req, res) => {
  try {
    const query = new Parse.Query(MaterialTransfer);
    
    // Apply filters from query params
    if (req.query.status) query.equalTo('status', req.query.status);
    
    const results = await query.find({ useMasterKey: true });
    const data = results.map(obj => obj.toJSON());
    
    res.json({ materialTransfers: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /materialTransfers/:id
router.get('/materialTransfers/:id', async (req, res) => {
  try {
    const query = new Parse.Query(MaterialTransfer);
    const result = await query.get(req.params.id, { useMasterKey: true });
    res.json(result.toJSON());
  } catch (error: any) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /materialTransfers
router.post('/materialTransfers', async (req, res) => {
  try {
    const obj = new MaterialTransfer();
    
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

// PUT /materialTransfers/:id
router.put('/materialTransfers/:id', async (req, res) => {
  try {
    const query = new Parse.Query(MaterialTransfer);
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

// DELETE /materialTransfers/:id
router.delete('/materialTransfers/:id', async (req, res) => {
  try {
    const query = new Parse.Query(MaterialTransfer);
    const obj = await query.get(req.params.id, { useMasterKey: true });
    await obj.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
