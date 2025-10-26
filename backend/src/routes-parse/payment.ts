// API Routes for Payment (Parse version)
import express from 'express';
import Parse from '../config/parse';
import { Payment } from '../models-parse/Payment';

const router = express.Router();

// GET /payments
router.get('/payments', async (req, res) => {
  try {
    const query = new Parse.Query(Payment);
    
    // Apply filters from query params
    if (req.query.status) query.equalTo('status', req.query.status);
    
    const results = await query.find({ useMasterKey: true });
    const data = results.map(obj => obj.toJSON());
    
    res.json({ payments: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /payments/:id
router.get('/payments/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Payment);
    const result = await query.get(req.params.id, { useMasterKey: true });
    res.json(result.toJSON());
  } catch (error: any) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /payments
router.post('/payments', async (req, res) => {
  try {
    const obj = new Payment();
    
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

// PUT /payments/:id
router.put('/payments/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Payment);
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

// DELETE /payments/:id
router.delete('/payments/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Payment);
    const obj = await query.get(req.params.id, { useMasterKey: true });
    await obj.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
