// API Routes for PackingMaterial (Parse version)
import express from 'express';
import Parse from '../config/parse';
import { PackingMaterial } from '../models-parse/PackingMaterial';

const router = express.Router();

// GET /packingMaterials
router.get('/packingMaterials', async (req, res) => {
  try {
    const query = new Parse.Query(PackingMaterial);
    
    // Apply filters from query params
    if (req.query.status) query.equalTo('status', req.query.status);
    
    const results = await query.find({ useMasterKey: true });
    const data = results.map(obj => obj.toJSON());
    
    res.json({ packingMaterials: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /packingMaterials/:id
router.get('/packingMaterials/:id', async (req, res) => {
  try {
    const query = new Parse.Query(PackingMaterial);
    const result = await query.get(req.params.id, { useMasterKey: true });
    res.json(result.toJSON());
  } catch (error: any) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /packingMaterials
router.post('/packingMaterials', async (req, res) => {
  try {
    const obj = new PackingMaterial();
    
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

// PUT /packingMaterials/:id
router.put('/packingMaterials/:id', async (req, res) => {
  try {
    const query = new Parse.Query(PackingMaterial);
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

// DELETE /packingMaterials/:id
router.delete('/packingMaterials/:id', async (req, res) => {
  try {
    const query = new Parse.Query(PackingMaterial);
    const obj = await query.get(req.params.id, { useMasterKey: true });
    await obj.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
