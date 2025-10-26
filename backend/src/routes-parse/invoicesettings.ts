// API Routes for InvoiceSettings (Parse version)
import express from 'express';
import Parse from '../config/parse';
import { InvoiceSettings } from '../models-parse/InvoiceSettings';

const router = express.Router();

// GET /invoiceSettingss
router.get('/invoiceSettingss', async (req, res) => {
  try {
    const query = new Parse.Query(InvoiceSettings);
    
    // Apply filters from query params
    if (req.query.status) query.equalTo('status', req.query.status);
    
    const results = await query.find({ useMasterKey: true });
    const data = results.map(obj => obj.toJSON());
    
    res.json({ invoiceSettingss: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /invoiceSettingss/:id
router.get('/invoiceSettingss/:id', async (req, res) => {
  try {
    const query = new Parse.Query(InvoiceSettings);
    const result = await query.get(req.params.id, { useMasterKey: true });
    res.json(result.toJSON());
  } catch (error: any) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /invoiceSettingss
router.post('/invoiceSettingss', async (req, res) => {
  try {
    const obj = new InvoiceSettings();
    
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

// PUT /invoiceSettingss/:id
router.put('/invoiceSettingss/:id', async (req, res) => {
  try {
    const query = new Parse.Query(InvoiceSettings);
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

// DELETE /invoiceSettingss/:id
router.delete('/invoiceSettingss/:id', async (req, res) => {
  try {
    const query = new Parse.Query(InvoiceSettings);
    const obj = await query.get(req.params.id, { useMasterKey: true });
    await obj.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
