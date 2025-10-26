// API Routes for TemplateSettings (Parse version)
import express from 'express';
import Parse from '../config/parse';
import { TemplateSettings } from '../models-parse/TemplateSettings';

const router = express.Router();

// GET /templateSettingss
router.get('/templateSettingss', async (req, res) => {
  try {
    const query = new Parse.Query(TemplateSettings);
    
    // Apply filters from query params
    if (req.query.status) query.equalTo('status', req.query.status);
    
    const results = await query.find({ useMasterKey: true });
    const data = results.map(obj => obj.toJSON());
    
    res.json({ templateSettingss: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /templateSettingss/:id
router.get('/templateSettingss/:id', async (req, res) => {
  try {
    const query = new Parse.Query(TemplateSettings);
    const result = await query.get(req.params.id, { useMasterKey: true });
    res.json(result.toJSON());
  } catch (error: any) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /templateSettingss
router.post('/templateSettingss', async (req, res) => {
  try {
    const obj = new TemplateSettings();
    
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

// PUT /templateSettingss/:id
router.put('/templateSettingss/:id', async (req, res) => {
  try {
    const query = new Parse.Query(TemplateSettings);
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

// DELETE /templateSettingss/:id
router.delete('/templateSettingss/:id', async (req, res) => {
  try {
    const query = new Parse.Query(TemplateSettings);
    const obj = await query.get(req.params.id, { useMasterKey: true });
    await obj.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
