// API Routes for SystemPluginLog (Parse version)
import express from 'express';
import Parse from '../config/parse';
import { SystemPluginLog } from '../models-parse/SystemPluginLog';

const router = express.Router();

// GET /systemPluginLogs
router.get('/systemPluginLogs', async (req, res) => {
  try {
    const query = new Parse.Query(SystemPluginLog);
    
    // Apply filters from query params
    if (req.query.status) query.equalTo('status', req.query.status);
    
    const results = await query.find({ useMasterKey: true });
    const data = results.map(obj => obj.toJSON());
    
    res.json({ systemPluginLogs: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /systemPluginLogs/:id
router.get('/systemPluginLogs/:id', async (req, res) => {
  try {
    const query = new Parse.Query(SystemPluginLog);
    const result = await query.get(req.params.id, { useMasterKey: true });
    res.json(result.toJSON());
  } catch (error: any) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /systemPluginLogs
router.post('/systemPluginLogs', async (req, res) => {
  try {
    const obj = new SystemPluginLog();
    
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

// PUT /systemPluginLogs/:id
router.put('/systemPluginLogs/:id', async (req, res) => {
  try {
    const query = new Parse.Query(SystemPluginLog);
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

// DELETE /systemPluginLogs/:id
router.delete('/systemPluginLogs/:id', async (req, res) => {
  try {
    const query = new Parse.Query(SystemPluginLog);
    const obj = await query.get(req.params.id, { useMasterKey: true });
    await obj.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
