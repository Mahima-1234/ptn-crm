/**
 * Backend Architecture for Leads Management System
 * Requires: express, mongoose, cors, dotenv
 * Run: npm install express mongoose cors dotenv
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// 1. DATABASE SCHEMA & INDEXING
// ==========================================
const leadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  company: { type: String, required: true },
  status: { type: String, required: true },
  owner: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// CRITICAL PERFORMANCE OPTIMIZATIONS (Indexes)
// Compound text index for the Global Search & Grid Search
leadSchema.index({ name: 'text', email: 'text', company: 'text' });

// Indexes for exact-match filtering and sorting
leadSchema.index({ status: 1 });
leadSchema.index({ owner: 1 });
leadSchema.index({ createdAt: -1 });

const Lead = mongoose.model('Lead', leadSchema);

// ==========================================
// 2. API ENDPOINTS
// ==========================================

/**
 * @route   GET /api/leads
 * @desc    Get paginated, sorted, and filtered leads for Data Grid
 */
app.get('/api/leads', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      status, 
      owner, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build Match Object
    const matchStage = {};
    if (status) matchStage.status = status;
    if (owner) matchStage.owner = owner;
    
    // Fallback regex search if text index behavior isn't desired for partial matches
    if (search) {
      matchStage.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }

    // Build Sort Object
    const sortStage = {};
    sortStage[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Use Aggregation Pipeline with $facet for executing queries in parallel
    // (Gets both the sliced data and the total document count in one DB call)
    const pipeline = [
      { $match: matchStage },
      { $sort: sortStage },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limitNum }],
          totalCount: [{ $count: 'count' }]
        }
      }
    ];

    const result = await Lead.aggregate(pipeline);
    
    const data = result[0].data;
    const total = result[0].totalCount[0] ? result[0].totalCount[0].count : 0;

    res.json({
      data,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    });

  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * @route   GET /api/leads/search
 * @desc    Global Search (Lightweight, top 10 results only)
 */
app.get('/api/leads/search', async (req, res) => {
  try {
    const { search, limit = 10 } = req.query;
    
    if (!search) return res.json({ data: [] });

    // Using Text Index for ultra-fast searching if configured, 
    // or regex for partial substring matches.
    const query = {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ]
    };

    // Use .lean() to return plain JS objects, bypassing Mongoose hydration overhead
    const results = await Lead.find(query)
      .select('name email company') // Projection: only return needed fields
      .limit(parseInt(limit))
      .lean();

    res.json({ data: results });
  } catch (error) {
    console.error('Global search error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ==========================================
// 3. SERVER START & DB CONNECTION
// ==========================================
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/crm_db';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error('MongoDB connection error:', err));