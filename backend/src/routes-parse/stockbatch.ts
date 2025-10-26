// API Routes for StockBatch (Parse version)
import express from 'express';
import Parse from '../config/parse';
import { StockBatch } from '../models-parse/StockBatch';

const router = express.Router();

// GET /stockBatchs
router.get('/stockBatchs', async (req, res) => {
  try {
    const query = new Parse.Query(StockBatch);
    
    // Apply filters from query params
    if (req.query.status) query.equalTo('status', req.query.status);
    
    const results = await query.find({ useMasterKey: true });
    const data = results.map(obj => obj.toJSON());
    
    res.json({ stockBatchs: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /stockBatchs/:id
router.get('/stockBatchs/:id', async (req, res) => {
  try {
    const query = new Parse.Query(StockBatch);
    const result = await query.get(req.params.id, { useMasterKey: true });
    res.json(result.toJSON());
  } catch (error: any) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /stockBatchs
router.post('/stockBatchs', async (req, res) => {
  try {
    const obj = new StockBatch();
    
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

// PUT /stockBatchs/:id
router.put('/stockBatchs/:id', async (req, res) => {
  try {
    const query = new Parse.Query(StockBatch);
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

// DELETE /stockBatchs/:id
router.delete('/stockBatchs/:id', async (req, res) => {
  try {
    const query = new Parse.Query(StockBatch);
    const obj = await query.get(req.params.id, { useMasterKey: true });
    await obj.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
