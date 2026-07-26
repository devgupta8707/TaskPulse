require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB, dbService } = require('./db');

const taskRoutes = require('./routes/taskRoutes');
const moodRoutes = require('./routes/moodRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// Mount API routes
app.use('/api/tasks', taskRoutes);
app.use('/api/moods', moodRoutes);

// Database status API endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date(),
    database: dbService.isMongo() ? 'MongoDB Atlas' : 'In-Memory (Fallback)'
  });
});

// Fallback index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize server
async function startServer() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 TaskPulse Server running live at http://localhost:${PORT}`);
    console.log(`📊 Mode: ${dbService.isMongo() ? 'Connected to MongoDB Atlas' : 'In-Memory DB (Ready for instant local testing)'}`);
  });
}

startServer();
