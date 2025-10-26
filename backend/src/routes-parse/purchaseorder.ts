// API Routes for PurchaseOrder (Parse version)
import express from 'express';
import Parse from '../config/parse';
import { PurchaseOrder } from '../models-parse/PurchaseOrder';

const router = express.Router();

// GET /purchaseOrders
router.get('/purchaseOrders', async (req, res) => {
  try {
    const query = new Parse.Query(PurchaseOrder);
    
    // Apply filters from query params
    if (req.query.status) query.equalTo('status', req.query.status);
    
    const results = await query.find({ useMasterKey: true });
    const data = results.map(obj => obj.toJSON());
    
    res.json({ purchaseOrders: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /purchaseOrders/:id
router.get('/purchaseOrders/:id', async (req, res) => {
  try {
    const query = new Parse.Query(PurchaseOrder);
    const result = await query.get(req.params.id, { useMasterKey: true });
    res.json(result.toJSON());
  } catch (error: any) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /purchaseOrders
router.post('/purchaseOrders', async (req, res) => {
  try {
    const obj = new PurchaseOrder();
    
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

// PUT /purchaseOrders/:id
router.put('/purchaseOrders/:id', async (req, res) => {
  try {
    const query = new Parse.Query(PurchaseOrder);
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

// DELETE /purchaseOrders/:id
router.delete('/purchaseOrders/:id', async (req, res) => {
  try {
    const query = new Parse.Query(PurchaseOrder);
    const obj = await query.get(req.params.id, { useMasterKey: true });
    await obj.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
