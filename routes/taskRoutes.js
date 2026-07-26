const express = require('express');
const router = express.Router();
const { dbService } = require('../db');

// GET /api/tasks - Retrieve all tasks (with optional priority & search filter)
router.get('/', async (req, res) => {
  try {
    const { priority, search } = req.query;
    const tasks = await dbService.getTasks({ priority, search });
    res.json({ success: true, count: tasks.length, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error retrieving tasks', error: error.message });
  }
});

// POST /api/tasks - Create a new task
router.post('/', async (req, res) => {
  try {
    const { title, description, priority, dueDate, category } = req.body;
    if (!title || title.trim() === '') {
      return res.status(400).json({ success: false, message: 'Task title is required' });
    }

    const newTask = await dbService.createTask({
      title: title.trim(),
      description: description ? description.trim() : '',
      priority: priority || 'Medium',
      dueDate: dueDate || null,
      category: category || 'General'
    });

    res.status(201).json({ success: true, data: newTask });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create task', error: error.message });
  }
});

// PUT /api/tasks/:id - Update task by ID
router.put('/:id', async (req, res) => {
  try {
    const updatedTask = await dbService.updateTask(req.params.id, req.body);
    if (!updatedTask) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    res.json({ success: true, data: updatedTask });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update task', error: error.message });
  }
});

// DELETE /api/tasks/:id - Delete task by ID
router.delete('/:id', async (req, res) => {
  try {
    const deletedTask = await dbService.deleteTask(req.params.id);
    if (!deletedTask) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    res.json({ success: true, message: 'Task deleted successfully', data: deletedTask });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete task', error: error.message });
  }
});

module.exports = router;
