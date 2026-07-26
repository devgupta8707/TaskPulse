const mongoose = require('mongoose');

const MoodSchema = new mongoose.Schema({
  mood: {
    type: String,
    enum: ['Happy', 'Productive', 'Calm', 'Tired', 'Burnout'],
    required: [true, 'Mood is required']
  },
  energyLevel: {
    type: Number,
    min: 1,
    max: 5,
    required: [true, 'Energy level (1-5) is required']
  },
  note: {
    type: String,
    trim: true,
    default: ''
  },
  loggedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Mood', MoodSchema);
