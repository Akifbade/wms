// API Routes for ShipmentSettings (Parse version)
import express from 'express';
import Parse from '../config/parse';
import { ShipmentSettings } from '../models-parse/ShipmentSettings';

const router = express.Router();

// GET /shipmentSettingss
router.get('/shipmentSettingss', async (req, res) => {
  try {
    const query = new Parse.Query(ShipmentSettings);
    
    // Apply filters from query params
    if (req.query.status) query.equalTo('status', req.query.status);
    
    const results = await query.find({ useMasterKey: true });
    const data = results.map(obj => obj.toJSON());
    
    res.json({ shipmentSettingss: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /shipmentSettingss/:id
router.get('/shipmentSettingss/:id', async (req, res) => {
  try {
    const query = new Parse.Query(ShipmentSettings);
    const result = await query.get(req.params.id, { useMasterKey: true });
    res.json(result.toJSON());
  } catch (error: any) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /shipmentSettingss
router.post('/shipmentSettingss', async (req, res) => {
  try {
    const obj = new ShipmentSettings();
    
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

// PUT /shipmentSettingss/:id
router.put('/shipmentSettingss/:id', async (req, res) => {
  try {
    const query = new Parse.Query(ShipmentSettings);
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

// DELETE /shipmentSettingss/:id
router.delete('/shipmentSettingss/:id', async (req, res) => {
  try {
    const query = new Parse.Query(ShipmentSettings);
    const obj = await query.get(req.params.id, { useMasterKey: true });
    await obj.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
