// API Routes for StockAlert (Parse version)
import express from 'express';
import Parse from '../config/parse';
import { StockAlert } from '../models-parse/StockAlert';

const router = express.Router();

// GET /stockAlerts
router.get('/stockAlerts', async (req, res) => {
  try {
    const query = new Parse.Query(StockAlert);
    
    // Apply filters from query params
    if (req.query.status) query.equalTo('status', req.query.status);
    
    const results = await query.find({ useMasterKey: true });
    const data = results.map(obj => obj.toJSON());
    
    res.json({ stockAlerts: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /stockAlerts/:id
router.get('/stockAlerts/:id', async (req, res) => {
  try {
    const query = new Parse.Query(StockAlert);
    const result = await query.get(req.params.id, { useMasterKey: true });
    res.json(result.toJSON());
  } catch (error: any) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /stockAlerts
router.post('/stockAlerts', async (req, res) => {
  try {
    const obj = new StockAlert();
    
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

// PUT /stockAlerts/:id
router.put('/stockAlerts/:id', async (req, res) => {
  try {
    const query = new Parse.Query(StockAlert);
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

// DELETE /stockAlerts/:id
router.delete('/stockAlerts/:id', async (req, res) => {
  try {
    const query = new Parse.Query(StockAlert);
    const obj = await query.get(req.params.id, { useMasterKey: true });
    await obj.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
