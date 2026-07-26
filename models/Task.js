const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium'
  },
  dueDate: {
    type: Date,
    default: null
  },
  completed: {
    type: Boolean,
    default: false
  },
  category: {
    type: String,
    default: 'General'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Task', TaskSchema);
