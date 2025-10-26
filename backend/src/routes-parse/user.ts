// API Routes for User (Parse version)
import express from 'express';
import Parse from '../config/parse';
import { User } from '../models-parse/User';

const router = express.Router();

// GET /users
router.get('/users', async (req, res) => {
  try {
    const query = new Parse.Query(User);
    
    // Apply filters from query params
    if (req.query.status) query.equalTo('status', req.query.status);
    
    const results = await query.find({ useMasterKey: true });
    const data = results.map(obj => obj.toJSON());
    
    res.json({ users: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /users/:id
router.get('/users/:id', async (req, res) => {
  try {
    const query = new Parse.Query(User);
    const result = await query.get(req.params.id, { useMasterKey: true });
    res.json(result.toJSON());
  } catch (error: any) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /users
router.post('/users', async (req, res) => {
  try {
    const obj = new User();
    
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

// PUT /users/:id
router.put('/users/:id', async (req, res) => {
  try {
    const query = new Parse.Query(User);
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

// DELETE /users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    const query = new Parse.Query(User);
    const obj = await query.get(req.params.id, { useMasterKey: true });
    await obj.destroy({ useMasterKey: true });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
