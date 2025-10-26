// API Routes for Expense (Parse version)
import express from 'express';
import Parse from '../config/parse';
import { Expense } from '../models-parse/Expense';

const router = express.Router();

// GET /expenses
router.get('/expenses', async (req, res) => {
  try {
    const query = new Parse.Query(Expense);
    
    // Apply filters from query params
    if (req.query.status) query.equalTo('status', req.query.status);
    
    const results = await query.find({ useMasterKey: true });
    const data = results.map(obj => obj.toJSON());
    
    res.json({ expenses: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /expenses/:id
router.get('/expenses/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Expense);
    const result = await query.get(req.params.id, { useMasterKey: true });
    res.json(result.toJSON());
  } catch (error: any) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /expenses
router.post('/expenses', async (req, res) => {
  try {
    const obj = new Expense();
    
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

// PUT /expenses/:id
router.put('/expenses/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Expense);
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

// DELETE /expenses/:id
router.delete('/expenses/:id', async (req, res) => {
  try {
    const query = new Parse.Query(Expense);
    const obj = await query.get(req.params.id, { useMasterKey: true });
    await obj.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
