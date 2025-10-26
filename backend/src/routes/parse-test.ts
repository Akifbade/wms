import express from 'express';
import Parse from '../config/parse';

const router = express.Router();

// Test Parse connection
router.get('/parse-test', async (req, res) => {
  try {
    // Create a test object
    const TestObject = Parse.Object.extend('TestObject');
    const testObj = new TestObject();
    testObj.set('message', 'Parse is working!');
    testObj.set('timestamp', new Date());
    
    await testObj.save();
    
    // Query it back
    const query = new Parse.Query('TestObject');
    const results = await query.find();
    
    res.json({
      success: true,
      message: 'Parse Server is working!',
      testObjectId: testObj.id,
      totalTestObjects: results.length,
      parseServerUrl: Parse.serverURL
    });
  } catch (error: any) {
    console.error('Parse test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      parseServerUrl: Parse.serverURL
    });
  }
});

// Get all MovingJobs (Parse version)
router.get('/moving-jobs-parse', async (req, res) => {
  try {
    const MovingJob = Parse.Object.extend('MovingJob');
    const query = new Parse.Query(MovingJob);
    
    // Add filters if provided
    const { status } = req.query;
    if (status) {
      const statuses = (status as string).split(',');
      if (statuses.length > 1) {
        query.containedIn('status', statuses);
      } else {
        query.equalTo('status', status);
      }
    }
    
    // Include related data
    query.include('customer');
    query.descending('createdAt');
    
    const jobs = await query.find({ useMasterKey: true });
    
    // Convert Parse objects to JSON
    const jobsJSON = jobs.map((job: Parse.Object) => ({
      id: job.id,
      ...job.toJSON()
    }));
    
    res.json({
      success: true,
      jobs: jobsJSON,
      count: jobs.length
    });
  } catch (error: any) {
    console.error('Get moving jobs error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create MovingJob (Parse version)
router.post('/moving-jobs-parse', async (req, res) => {
  try {
    const MovingJob = Parse.Object.extend('MovingJob');
    const job = new MovingJob();
    
    // Set all fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined && req.body[key] !== null) {
        job.set(key, req.body[key]);
      }
    });
    
    await job.save(null, { useMasterKey: true });
    
    res.json({
      success: true,
      job: {
        id: job.id,
        ...job.toJSON()
      }
    });
  } catch (error: any) {
    console.error('Create moving job error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
