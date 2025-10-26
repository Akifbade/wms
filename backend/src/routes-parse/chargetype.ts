// API Routes for ChargeType (Parse version)
import express from 'express';
import Parse from '../config/parse';
import { ChargeType } from '../models-parse/ChargeType';

const router = express.Router();

// GET /chargeTypes
router.get('/chargeTypes', async (req, res) => {
  try {
    const query = new Parse.Query(ChargeType);
    
    // Apply filters from query params
    if (req.query.status) query.equalTo('status', req.query.status);
    
    const results = await query.find({ useMasterKey: true });
    const data = results.map(obj => obj.toJSON());
    
    res.json({ chargeTypes: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /chargeTypes/:id
router.get('/chargeTypes/:id', async (req, res) => {
  try {
    const query = new Parse.Query(ChargeType);
    const result = await query.get(req.params.id, { useMasterKey: true });
    res.json(result.toJSON());
  } catch (error: any) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /chargeTypes
router.post('/chargeTypes', async (req, res) => {
  try {
    const obj = new ChargeType();
    
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

// PUT /chargeTypes/:id
router.put('/chargeTypes/:id', async (req, res) => {
  try {
    const query = new Parse.Query(ChargeType);
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

// DELETE /chargeTypes/:id
router.delete('/chargeTypes/:id', async (req, res) => {
  try {
    const query = new Parse.Query(ChargeType);
    const obj = await query.get(req.params.id, { useMasterKey: true });
    await obj.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
