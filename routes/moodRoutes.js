const express = require('express');
const router = express.Router();
const { dbService } = require('../db');

// GET /api/moods - Fetch all logged moods
router.get('/', async (req, res) => {
  try {
    const moods = await dbService.getMoods();
    res.json({ success: true, count: moods.length, data: moods });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching moods', error: error.message });
  }
});

// POST /api/moods - Log new mood entry
router.post('/', async (req, res) => {
  try {
    const { mood, energyLevel, note } = req.body;
    if (!mood) {
      return res.status(400).json({ success: false, message: 'Mood selection is required' });
    }
    if (!energyLevel || energyLevel < 1 || energyLevel > 5) {
      return res.status(400).json({ success: false, message: 'Energy level must be between 1 and 5' });
    }

    const newMood = await dbService.createMood({
      mood,
      energyLevel: Number(energyLevel),
      note: note ? note.trim() : ''
    });

    res.status(201).json({ success: true, data: newMood });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to log mood', error: error.message });
  }
});

// DELETE /api/moods/:id - Delete a mood entry
router.delete('/:id', async (req, res) => {
  try {
    const deletedMood = await dbService.deleteMood(req.params.id);
    if (!deletedMood) {
      return res.status(404).json({ success: false, message: 'Mood entry not found' });
    }
    res.json({ success: true, message: 'Mood entry deleted', data: deletedMood });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete mood', error: error.message });
  }
});

// GET /api/stats - Dashboard analytics summary
router.get('/stats/summary', async (req, res) => {
  try {
    const tasks = await dbService.getTasks();
    const moods = await dbService.getMoods();

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const pendingTasks = totalTasks - completedTasks;
    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    let avgEnergy = 0;
    let moodCounts = { Happy: 0, Productive: 0, Calm: 0, Tired: 0, Burnout: 0 };
    
    if (moods.length > 0) {
      const sumEnergy = moods.reduce((acc, curr) => acc + (curr.energyLevel || 0), 0);
      avgEnergy = (sumEnergy / moods.length).toFixed(1);

      moods.forEach(m => {
        if (moodCounts[m.mood] !== undefined) {
          moodCounts[m.mood]++;
        }
      });
    }

    // Determine top mood
    let dominantMood = 'None';
    let maxCount = -1;
    for (const [m, count] of Object.entries(moodCounts)) {
      if (count > maxCount && count > 0) {
        maxCount = count;
        dominantMood = m;
      }
    }

    res.json({
      success: true,
      data: {
        totalTasks,
        completedTasks,
        pendingTasks,
        completionPercentage,
        avgEnergy: Number(avgEnergy),
        dominantMood,
        moodCounts,
        dbMode: dbService.isMongo() ? 'MongoDB Atlas' : 'In-Memory DB'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error generating stats summary', error: error.message });
  }
});

module.exports = router;
