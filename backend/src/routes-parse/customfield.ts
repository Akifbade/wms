// API Routes for CustomField (Parse version)
import express from 'express';
import Parse from '../config/parse';
import { CustomField } from '../models-parse/CustomField';

const router = express.Router();

// GET /customFields
router.get('/customFields', async (req, res) => {
  try {
    const query = new Parse.Query(CustomField);
    
    // Apply filters from query params
    if (req.query.status) query.equalTo('status', req.query.status);
    
    const results = await query.find({ useMasterKey: true });
    const data = results.map(obj => obj.toJSON());
    
    res.json({ customFields: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /customFields/:id
router.get('/customFields/:id', async (req, res) => {
  try {
    const query = new Parse.Query(CustomField);
    const result = await query.get(req.params.id, { useMasterKey: true });
    res.json(result.toJSON());
  } catch (error: any) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /customFields
router.post('/customFields', async (req, res) => {
  try {
    const obj = new CustomField();
    
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

// PUT /customFields/:id
router.put('/customFields/:id', async (req, res) => {
  try {
    const query = new Parse.Query(CustomField);
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

// DELETE /customFields/:id
router.delete('/customFields/:id', async (req, res) => {
  try {
    const query = new Parse.Query(CustomField);
    const obj = await query.get(req.params.id, { useMasterKey: true });
    await obj.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
