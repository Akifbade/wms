// API Routes for MaterialCategory (Parse version)
import express from 'express';
import Parse from '../config/parse';
import { MaterialCategory } from '../models-parse/MaterialCategory';

const router = express.Router();

// GET /materialCategorys
router.get('/materialCategorys', async (req, res) => {
  try {
    const query = new Parse.Query(MaterialCategory);
    
    // Apply filters from query params
    if (req.query.status) query.equalTo('status', req.query.status);
    
    const results = await query.find({ useMasterKey: true });
    const data = results.map(obj => obj.toJSON());
    
    res.json({ materialCategorys: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /materialCategorys/:id
router.get('/materialCategorys/:id', async (req, res) => {
  try {
    const query = new Parse.Query(MaterialCategory);
    const result = await query.get(req.params.id, { useMasterKey: true });
    res.json(result.toJSON());
  } catch (error: any) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /materialCategorys
router.post('/materialCategorys', async (req, res) => {
  try {
    const obj = new MaterialCategory();
    
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

// PUT /materialCategorys/:id
router.put('/materialCategorys/:id', async (req, res) => {
  try {
    const query = new Parse.Query(MaterialCategory);
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

// DELETE /materialCategorys/:id
router.delete('/materialCategorys/:id', async (req, res) => {
  try {
    const query = new Parse.Query(MaterialCategory);
    const obj = await query.get(req.params.id, { useMasterKey: true });
    await obj.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
