// API Routes for InvoiceLineItem (Parse version)
import express from 'express';
import Parse from '../config/parse';
import { InvoiceLineItem } from '../models-parse/InvoiceLineItem';

const router = express.Router();

// GET /invoiceLineItems
router.get('/invoiceLineItems', async (req, res) => {
  try {
    const query = new Parse.Query(InvoiceLineItem);
    
    // Apply filters from query params
    if (req.query.status) query.equalTo('status', req.query.status);
    
    const results = await query.find({ useMasterKey: true });
    const data = results.map(obj => obj.toJSON());
    
    res.json({ invoiceLineItems: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /invoiceLineItems/:id
router.get('/invoiceLineItems/:id', async (req, res) => {
  try {
    const query = new Parse.Query(InvoiceLineItem);
    const result = await query.get(req.params.id, { useMasterKey: true });
    res.json(result.toJSON());
  } catch (error: any) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /invoiceLineItems
router.post('/invoiceLineItems', async (req, res) => {
  try {
    const obj = new InvoiceLineItem();
    
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

// PUT /invoiceLineItems/:id
router.put('/invoiceLineItems/:id', async (req, res) => {
  try {
    const query = new Parse.Query(InvoiceLineItem);
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

// DELETE /invoiceLineItems/:id
router.delete('/invoiceLineItems/:id', async (req, res) => {
  try {
    const query = new Parse.Query(InvoiceLineItem);
    const obj = await query.get(req.params.id, { useMasterKey: true });
    await obj.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
