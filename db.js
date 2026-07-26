const mongoose = require('mongoose');
const Task = require('./models/Task');
const Mood = require('./models/Mood');

let isMongoConnected = false;

// In-memory fallback data store
let memoryTasks = [
  {
    _id: 'task_1',
    title: 'Complete System Architecture Review',
    description: 'Verify API routes, error boundaries, and responsiveness.',
    priority: 'High',
    dueDate: new Date(Date.now() + 86400000).toISOString(),
    completed: false,
    category: 'Work',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
  },
  {
    _id: 'task_2',
    title: 'Log Daily Mood & Energy Reflection',
    description: 'Track afternoon energy levels after lunch.',
    priority: 'Medium',
    dueDate: new Date().toISOString(),
    completed: true,
    category: 'Personal',
    createdAt: new Date(Date.now() - 3600000 * 10).toISOString()
  },
  {
    _id: 'task_3',
    title: 'Plan Weekly Sprint Goals',
    description: 'Outline key milestones for TaskPulse enhancements.',
    priority: 'Low',
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
    completed: false,
    category: 'Work',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
  }
];

let memoryMoods = [
  {
    _id: 'mood_1',
    mood: 'Productive',
    energyLevel: 5,
    note: 'Crushed early morning coding sessions!',
    loggedAt: new Date(Date.now() - 86400000 * 4).toISOString()
  },
  {
    _id: 'mood_2',
    mood: 'Happy',
    energyLevel: 4,
    note: 'Great workout and team call.',
    loggedAt: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    _id: 'mood_3',
    mood: 'Calm',
    energyLevel: 3,
    note: 'Steady progress, relaxed evening.',
    loggedAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    _id: 'mood_4',
    mood: 'Productive',
    energyLevel: 4,
    note: 'Finished UI components and glassmorphism styling.',
    loggedAt: new Date(Date.now() - 86400000 * 1).toISOString()
  },
  {
    _id: 'mood_5',
    mood: 'Happy',
    energyLevel: 5,
    note: 'Feeling energetic today!',
    loggedAt: new Date().toISOString()
  }
];

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri || uri.includes('<username>') || uri.includes('your_mongo_uri')) {
    console.log('ℹ️  No valid MONGO_URI provided in .env. Operating in high-performance In-Memory Mode.');
    isMongoConnected = false;
    return;
  }

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    isMongoConnected = true;
    console.log('✅ Connected successfully to MongoDB Atlas!');
  } catch (err) {
    console.warn('⚠️  MongoDB Atlas Connection warning:', err.message);
    console.log('🔄 Falling back to In-Memory storage so application runs flawlessly.');
    isMongoConnected = false;
  }
}

// Database Service Wrapper
const dbService = {
  isMongo: () => isMongoConnected,

  // TASK OPERATIONS
  async getTasks(filter = {}) {
    if (isMongoConnected) {
      const query = {};
      if (filter.priority && filter.priority !== 'All') {
        query.priority = filter.priority;
      }
      if (filter.search) {
        query.$or = [
          { title: { $regex: filter.search, $options: 'i' } },
          { description: { $regex: filter.search, $options: 'i' } }
        ];
      }
      return await Task.find(query).sort({ createdAt: -1 });
    } else {
      let result = [...memoryTasks];
      if (filter.priority && filter.priority !== 'All') {
        result = result.filter(t => t.priority === filter.priority);
      }
      if (filter.search) {
        const s = filter.search.toLowerCase();
        result = result.filter(t => t.title.toLowerCase().includes(s) || (t.description && t.description.toLowerCase().includes(s)));
      }
      return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  },

  async createTask(data) {
    if (isMongoConnected) {
      const newTask = new Task(data);
      return await newTask.save();
    } else {
      const newTask = {
        _id: 'task_' + Date.now(),
        title: data.title,
        description: data.description || '',
        priority: data.priority || 'Medium',
        dueDate: data.dueDate || null,
        completed: Boolean(data.completed),
        category: data.category || 'General',
        createdAt: new Date().toISOString()
      };
      memoryTasks.unshift(newTask);
      return newTask;
    }
  },

  async updateTask(id, data) {
    if (isMongoConnected) {
      return await Task.findByIdAndUpdate(id, data, { new: true });
    } else {
      const index = memoryTasks.findIndex(t => t._id === id);
      if (index !== -1) {
        memoryTasks[index] = { ...memoryTasks[index], ...data };
        return memoryTasks[index];
      }
      return null;
    }
  },

  async deleteTask(id) {
    if (isMongoConnected) {
      return await Task.findByIdAndDelete(id);
    } else {
      const index = memoryTasks.findIndex(t => t._id === id);
      if (index !== -1) {
        const deleted = memoryTasks[index];
        memoryTasks.splice(index, 1);
        return deleted;
      }
      return null;
    }
  },

  // MOOD OPERATIONS
  async getMoods() {
    if (isMongoConnected) {
      return await Mood.find().sort({ loggedAt: -1 });
    } else {
      return [...memoryMoods].sort((a, b) => new Date(b.loggedAt) - new Date(a.loggedAt));
    }
  },

  async createMood(data) {
    if (isMongoConnected) {
      const newMood = new Mood(data);
      return await newMood.save();
    } else {
      const newMood = {
        _id: 'mood_' + Date.now(),
        mood: data.mood,
        energyLevel: Number(data.energyLevel),
        note: data.note || '',
        loggedAt: new Date().toISOString()
      };
      memoryMoods.unshift(newMood);
      return newMood;
    }
  },

  async deleteMood(id) {
    if (isMongoConnected) {
      return await Mood.findByIdAndDelete(id);
    } else {
      const index = memoryMoods.findIndex(m => m._id === id);
      if (index !== -1) {
        const deleted = memoryMoods[index];
        memoryMoods.splice(index, 1);
        return deleted;
      }
      return null;
    }
  }
};

module.exports = { connectDB, dbService };
