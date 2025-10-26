// API Routes for Invoice (Parse version)
import express from 'express';
import Parse from '../config/parse';
import { Invoice } from '../models-parse/Invoice';

const router = express.Router();

// GET /invoices
router.get('/invoices', async (req, res) => {
  try {
    const query = new Parse.Query(Invoice);
    
    // Apply filters from query params
    if (req.query.status) query.equalTo('status', req.query.status);
    
    const results = await query.find({ useMasterKey: true });
    const data = results.map(obj => obj.toJSON());
    
    res.json({ invoices: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /invoices/:id
router.get('/invoices/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Invoice);
    const result = await query.get(req.params.id, { useMasterKey: true });
    res.json(result.toJSON());
  } catch (error: any) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /invoices
router.post('/invoices', async (req, res) => {
  try {
    const obj = new Invoice();
    
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

// PUT /invoices/:id
router.put('/invoices/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Invoice);
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

// DELETE /invoices/:id
router.delete('/invoices/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Invoice);
    const obj = await query.get(req.params.id, { useMasterKey: true });
    await obj.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
