// API Routes for Shipment (Parse version)
import express from 'express';
import Parse from '../config/parse';
import { Shipment } from '../models-parse/Shipment';

const router = express.Router();

// GET /shipments
router.get('/shipments', async (req, res) => {
  try {
    const query = new Parse.Query(Shipment);
    
    // Apply filters from query params
    if (req.query.status) query.equalTo('status', req.query.status);
    
    const results = await query.find({ useMasterKey: true });
    const data = results.map(obj => obj.toJSON());
    
    res.json({ shipments: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /shipments/:id
router.get('/shipments/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Shipment);
    const result = await query.get(req.params.id, { useMasterKey: true });
    res.json(result.toJSON());
  } catch (error: any) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /shipments
router.post('/shipments', async (req, res) => {
  try {
    const obj = new Shipment();
    
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

// PUT /shipments/:id
router.put('/shipments/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Shipment);
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

// DELETE /shipments/:id
router.delete('/shipments/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Shipment);
    const obj = await query.get(req.params.id, { useMasterKey: true });
    await obj.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
