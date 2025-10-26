// API Routes for Withdrawal (Parse version)
import express from 'express';
import Parse from '../config/parse';
import { Withdrawal } from '../models-parse/Withdrawal';

const router = express.Router();

// GET /withdrawals
router.get('/withdrawals', async (req, res) => {
  try {
    const query = new Parse.Query(Withdrawal);
    
    // Apply filters from query params
    if (req.query.status) query.equalTo('status', req.query.status);
    
    const results = await query.find({ useMasterKey: true });
    const data = results.map(obj => obj.toJSON());
    
    res.json({ withdrawals: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /withdrawals/:id
router.get('/withdrawals/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Withdrawal);
    const result = await query.get(req.params.id, { useMasterKey: true });
    res.json(result.toJSON());
  } catch (error: any) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /withdrawals
router.post('/withdrawals', async (req, res) => {
  try {
    const obj = new Withdrawal();
    
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

// PUT /withdrawals/:id
router.put('/withdrawals/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Withdrawal);
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

// DELETE /withdrawals/:id
router.delete('/withdrawals/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Withdrawal);
    const obj = await query.get(req.params.id, { useMasterKey: true });
    await obj.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
