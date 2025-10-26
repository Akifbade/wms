// API Routes for PurchaseOrderItem (Parse version)
import express from 'express';
import Parse from '../config/parse';
import { PurchaseOrderItem } from '../models-parse/PurchaseOrderItem';

const router = express.Router();

// GET /purchaseOrderItems
router.get('/purchaseOrderItems', async (req, res) => {
  try {
    const query = new Parse.Query(PurchaseOrderItem);
    
    // Apply filters from query params
    if (req.query.status) query.equalTo('status', req.query.status);
    
    const results = await query.find({ useMasterKey: true });
    const data = results.map(obj => obj.toJSON());
    
    res.json({ purchaseOrderItems: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /purchaseOrderItems/:id
router.get('/purchaseOrderItems/:id', async (req, res) => {
  try {
    const query = new Parse.Query(PurchaseOrderItem);
    const result = await query.get(req.params.id, { useMasterKey: true });
    res.json(result.toJSON());
  } catch (error: any) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /purchaseOrderItems
router.post('/purchaseOrderItems', async (req, res) => {
  try {
    const obj = new PurchaseOrderItem();
    
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

// PUT /purchaseOrderItems/:id
router.put('/purchaseOrderItems/:id', async (req, res) => {
  try {
    const query = new Parse.Query(PurchaseOrderItem);
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

// DELETE /purchaseOrderItems/:id
router.delete('/purchaseOrderItems/:id', async (req, res) => {
  try {
    const query = new Parse.Query(PurchaseOrderItem);
    const obj = await query.get(req.params.id, { useMasterKey: true });
    await obj.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
