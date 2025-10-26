// API Routes for ShipmentBox (Parse version)
import express from 'express';
import Parse from '../config/parse';
import { ShipmentBox } from '../models-parse/ShipmentBox';

const router = express.Router();

// GET /shipmentBoxs
router.get('/shipmentBoxs', async (req, res) => {
  try {
    const query = new Parse.Query(ShipmentBox);
    
    // Apply filters from query params
    if (req.query.status) query.equalTo('status', req.query.status);
    
    const results = await query.find({ useMasterKey: true });
    const data = results.map(obj => obj.toJSON());
    
    res.json({ shipmentBoxs: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /shipmentBoxs/:id
router.get('/shipmentBoxs/:id', async (req, res) => {
  try {
    const query = new Parse.Query(ShipmentBox);
    const result = await query.get(req.params.id, { useMasterKey: true });
    res.json(result.toJSON());
  } catch (error: any) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /shipmentBoxs
router.post('/shipmentBoxs', async (req, res) => {
  try {
    const obj = new ShipmentBox();
    
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

// PUT /shipmentBoxs/:id
router.put('/shipmentBoxs/:id', async (req, res) => {
  try {
    const query = new Parse.Query(ShipmentBox);
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

// DELETE /shipmentBoxs/:id
router.delete('/shipmentBoxs/:id', async (req, res) => {
  try {
    const query = new Parse.Query(ShipmentBox);
    const obj = await query.get(req.params.id, { useMasterKey: true });
    await obj.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
