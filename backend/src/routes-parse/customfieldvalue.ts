// API Routes for CustomFieldValue (Parse version)
import express from 'express';
import Parse from '../config/parse';
import { CustomFieldValue } from '../models-parse/CustomFieldValue';

const router = express.Router();

// GET /customFieldValues
router.get('/customFieldValues', async (req, res) => {
  try {
    const query = new Parse.Query(CustomFieldValue);
    
    // Apply filters from query params
    if (req.query.status) query.equalTo('status', req.query.status);
    
    const results = await query.find({ useMasterKey: true });
    const data = results.map(obj => obj.toJSON());
    
    res.json({ customFieldValues: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /customFieldValues/:id
router.get('/customFieldValues/:id', async (req, res) => {
  try {
    const query = new Parse.Query(CustomFieldValue);
    const result = await query.get(req.params.id, { useMasterKey: true });
    res.json(result.toJSON());
  } catch (error: any) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /customFieldValues
router.post('/customFieldValues', async (req, res) => {
  try {
    const obj = new CustomFieldValue();
    
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

// PUT /customFieldValues/:id
router.put('/customFieldValues/:id', async (req, res) => {
  try {
    const query = new Parse.Query(CustomFieldValue);
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

// DELETE /customFieldValues/:id
router.delete('/customFieldValues/:id', async (req, res) => {
  try {
    const query = new Parse.Query(CustomFieldValue);
    const obj = await query.get(req.params.id, { useMasterKey: true });
    await obj.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
