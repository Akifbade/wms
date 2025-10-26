// API Routes for MaterialPriceHistory (Parse version)
import express from 'express';
import Parse from '../config/parse';
import { MaterialPriceHistory } from '../models-parse/MaterialPriceHistory';

const router = express.Router();

// GET /materialPriceHistorys
router.get('/materialPriceHistorys', async (req, res) => {
  try {
    const query = new Parse.Query(MaterialPriceHistory);
    
    // Apply filters from query params
    if (req.query.status) query.equalTo('status', req.query.status);
    
    const results = await query.find({ useMasterKey: true });
    const data = results.map(obj => obj.toJSON());
    
    res.json({ materialPriceHistorys: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /materialPriceHistorys/:id
router.get('/materialPriceHistorys/:id', async (req, res) => {
  try {
    const query = new Parse.Query(MaterialPriceHistory);
    const result = await query.get(req.params.id, { useMasterKey: true });
    res.json(result.toJSON());
  } catch (error: any) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /materialPriceHistorys
router.post('/materialPriceHistorys', async (req, res) => {
  try {
    const obj = new MaterialPriceHistory();
    
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

// PUT /materialPriceHistorys/:id
router.put('/materialPriceHistorys/:id', async (req, res) => {
  try {
    const query = new Parse.Query(MaterialPriceHistory);
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

// DELETE /materialPriceHistorys/:id
router.delete('/materialPriceHistorys/:id', async (req, res) => {
  try {
    const query = new Parse.Query(MaterialPriceHistory);
    const obj = await query.get(req.params.id, { useMasterKey: true });
    await obj.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
