// ==========================================================================
// TaskPulse & Daily Mood Tracker - Client Application Logic
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // State Management
  let tasks = [];
  let moods = [];
  let activePriorityFilter = 'All';
  let searchQuery = '';
  let selectedMood = 'Happy';
  let chartInstance = null;

  // DOM Elements
  const liveClockEl = document.getElementById('liveClock');
  const dbStatusBadge = document.getElementById('dbStatusBadge');
  const dbStatusText = document.getElementById('dbStatusText');
  const currentDateStrEl = document.getElementById('currentDateStr');

  // Stats DOM
  const statTotalTasksEl = document.getElementById('statTotalTasks');
  const statCompletedTasksEl = document.getElementById('statCompletedTasks');
  const statCompletionPctEl = document.getElementById('statCompletionPct');
  const statAvgEnergyEl = document.getElementById('statAvgEnergy');
  const statTopMoodEl = document.getElementById('statTopMood');

  // Mood Form DOM
  const moodBtns = document.querySelectorAll('.mood-btn');
  const selectedMoodInput = document.getElementById('selectedMoodInput');
  const energyRange = document.getElementById('energyRange');
  const energyVal = document.getElementById('energyVal');
  const moodNoteInput = document.getElementById('moodNote');
  const moodForm = document.getElementById('moodForm');
  const moodHistoryList = document.getElementById('moodHistoryList');

  // Task Controls DOM
  const taskSearchInput = document.getElementById('taskSearchInput');
  const filterPills = document.getElementById('filterPills');
  const taskListEl = document.getElementById('taskList');
  const emptyStateEl = document.getElementById('emptyState');

  // Modal DOM
  const openTaskModalBtn = document.getElementById('openTaskModalBtn');
  const taskModal = document.getElementById('taskModal');
  const closeTaskModalBtn = document.getElementById('closeTaskModalBtn');
  const cancelTaskModalBtn = document.getElementById('cancelTaskModalBtn');
  const taskForm = document.getElementById('taskForm');
  const modalTitle = document.getElementById('modalTitle');
  const taskIdInput = document.getElementById('taskIdInput');
  const taskTitleInput = document.getElementById('taskTitleInput');
  const taskDescInput = document.getElementById('taskDescInput');
  const taskPrioritySelect = document.getElementById('taskPrioritySelect');
  const taskCategorySelect = document.getElementById('taskCategorySelect');

  // Toast Container
  const toastContainer = document.getElementById('toastContainer');

  // Initialize App
  initClock();
  fetchHealthStatus();
  fetchStats();
  fetchTasks();
  fetchMoods();
  setupEventListeners();

  // ------------------------------------------------------------------------
  // Clock & Date Setup
  // ------------------------------------------------------------------------
  function initClock() {
    updateClock();
    setInterval(updateClock, 1000);
    
    const now = new Date();
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    currentDateStrEl.textContent = now.toLocaleDateString(undefined, options);
  }

  function updateClock() {
    const now = new Date();
    liveClockEl.textContent = now.toLocaleTimeString();
  }

  // ------------------------------------------------------------------------
  // Health & Database Status
  // ------------------------------------------------------------------------
  async function fetchHealthStatus() {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      if (data.database && data.database.includes('MongoDB')) {
        dbStatusBadge.className = 'db-badge connected';
        dbStatusText.textContent = 'MongoDB Atlas Connected';
      } else {
        dbStatusBadge.className = 'db-badge fallback';
        dbStatusText.textContent = 'In-Memory DB Mode';
      }
    } catch (err) {
      dbStatusBadge.className = 'db-badge fallback';
      dbStatusText.textContent = 'Offline Mode';
    }
  }

  // ------------------------------------------------------------------------
  // Fetch Summary Stats
  // ------------------------------------------------------------------------
  async function fetchStats() {
    try {
      const res = await fetch('/api/moods/stats/summary');
      const json = await res.json();
      if (json.success) {
        const stats = json.data;
        statTotalTasksEl.textContent = stats.totalTasks;
        statCompletedTasksEl.textContent = stats.completedTasks;
        statCompletionPctEl.textContent = `${stats.completionPercentage}%`;
        statAvgEnergyEl.textContent = `${stats.avgEnergy} / 5 ⚡`;
        statTopMoodEl.textContent = stats.dominantMood !== 'None' ? `${getMoodEmoji(stats.dominantMood)} ${stats.dominantMood}` : '--';
      }
    } catch (err) {
      console.error('Error fetching stats summary:', err);
    }
  }

  // ------------------------------------------------------------------------
  // Tasks Logic
  // ------------------------------------------------------------------------
  async function fetchTasks() {
    try {
      let url = '/api/tasks?';
      if (activePriorityFilter !== 'All') {
        url += `priority=${encodeURIComponent(activePriorityFilter)}&`;
      }
      if (searchQuery) {
        url += `search=${encodeURIComponent(searchQuery)}`;
      }

      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        tasks = json.data;
        renderTasks();
      }
    } catch (err) {
      showToast('Error loading tasks', 'error');
    }
  }

  function renderTasks() {
    taskListEl.innerHTML = '';
    
    if (tasks.length === 0) {
      emptyStateEl.style.display = 'flex';
      taskListEl.appendChild(emptyStateEl);
      return;
    }

    emptyStateEl.style.display = 'none';

    tasks.forEach(task => {
      const item = document.createElement('div');
      item.className = `task-item ${task.completed ? 'completed' : ''}`;
      item.dataset.id = task._id;

      item.innerHTML = `
        <div class="task-left">
          <div class="custom-checkbox" data-id="${task._id}" data-completed="${task.completed}" title="Toggle Completion"></div>
          <div class="task-details">
            <div class="task-title">${escapeHTML(task.title)}</div>
            ${task.description ? `<div class="task-desc">${escapeHTML(task.description)}</div>` : ''}
            <div class="task-meta">
              <span class="priority-badge priority-${task.priority}">${task.priority}</span>
              <span class="category-tag">${task.category || 'General'}</span>
            </div>
          </div>
        </div>
        <div class="task-actions">
          <button class="icon-btn edit-btn" data-id="${task._id}" title="Edit Task">✏️</button>
          <button class="icon-btn delete-btn" data-id="${task._id}" title="Delete Task">🗑️</button>
        </div>
      `;

      taskListEl.appendChild(item);
    });
  }

  async function handleToggleTask(id, currentStatus) {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !currentStatus })
      });
      const json = await res.json();
      if (json.success) {
        fetchTasks();
        fetchStats();
        showToast(!currentStatus ? 'Task marked completed! 🎉' : 'Task reopened', 'success');
      }
    } catch (err) {
      showToast('Failed to update task', 'error');
    }
  }

  async function handleDeleteTask(id) {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchTasks();
        fetchStats();
        showToast('Task deleted', 'success');
      }
    } catch (err) {
      showToast('Failed to delete task', 'error');
    }
  }

  function openEditTaskModal(id) {
    const task = tasks.find(t => t._id === id);
    if (!task) return;

    modalTitle.textContent = 'Edit Task';
    taskIdInput.value = task._id;
    taskTitleInput.value = task.title;
    taskDescInput.value = task.description || '';
    taskPrioritySelect.value = task.priority || 'Medium';
    taskCategorySelect.value = task.category || 'Work';

    taskModal.classList.add('active');
  }

  // ------------------------------------------------------------------------
  // Moods & Analytics Logic
  // ------------------------------------------------------------------------
  async function fetchMoods() {
    try {
      const res = await fetch('/api/moods');
      const json = await res.json();
      if (json.success) {
        moods = json.data;
        renderMoodHistory();
        renderMoodChart();
      }
    } catch (err) {
      console.error('Error fetching moods:', err);
    }
  }

  function renderMoodHistory() {
    moodHistoryList.innerHTML = '';
    if (moods.length === 0) {
      moodHistoryList.innerHTML = '<div style="color:var(--text-dim); text-align:center; font-size:12px; padding:10px;">No mood entries logged yet.</div>';
      return;
    }

    moods.slice(0, 5).forEach(m => {
      const dateObj = new Date(m.loggedAt || m.createdAt);
      const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });

      const item = document.createElement('div');
      item.className = 'mood-item';
      item.innerHTML = `
        <div class="mood-item-left">
          <span class="mood-item-emoji">${getMoodEmoji(m.mood)}</span>
          <div>
            <div class="mood-item-title">${m.mood} ${m.note ? `- "${escapeHTML(m.note)}"` : ''}</div>
            <div class="mood-item-date">${dateStr} at ${timeStr}</div>
          </div>
        </div>
        <div class="mood-item-energy">${m.energyLevel} ⚡</div>
      `;
      moodHistoryList.appendChild(item);
    });
  }

  function renderMoodChart() {
    const ctx = document.getElementById('moodChart').getContext('2d');
    
    // Group last 7 entries or organize by mood type
    const moodCounts = { Happy: 0, Productive: 0, Calm: 0, Tired: 0, Burnout: 0 };
    moods.forEach(m => {
      if (moodCounts[m.mood] !== undefined) {
        moodCounts[m.mood]++;
      }
    });

    const labels = Object.keys(moodCounts);
    const dataValues = Object.values(moodCounts);

    if (chartInstance) {
      chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels.map(l => `${getMoodEmoji(l)} ${l}`),
        datasets: [{
          label: 'Logged Frequency',
          data: dataValues,
          backgroundColor: [
            'rgba(236, 72, 153, 0.65)',  // Happy - Pink
            'rgba(139, 92, 246, 0.65)',  // Productive - Purple
            'rgba(6, 182, 212, 0.65)',   // Calm - Cyan
            'rgba(245, 158, 11, 0.65)',  // Tired - Amber
            'rgba(239, 68, 68, 0.65)'    // Burnout - Red
          ],
          borderColor: [
            '#ec4899',
            '#8b5cf6',
            '#06b6d4',
            '#f59e0b',
            '#ef4444'
          ],
          borderWidth: 1.5,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(18, 24, 38, 0.9)',
            titleColor: '#ffffff',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#9ca3af', font: { family: 'Outfit', size: 11 } }
          },
          y: {
            beginAtZero: true,
            ticks: { precision: 0, color: '#9ca3af', font: { family: 'Outfit', size: 11 } },
            grid: { color: 'rgba(255, 255, 255, 0.05)' }
          }
        }
      }
    });
  }

  // ------------------------------------------------------------------------
  // Event Listeners
  // ------------------------------------------------------------------------
  function setupEventListeners() {
    // Mood Buttons Selection
    moodBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        moodBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedMood = btn.dataset.mood;
        selectedMoodInput.value = selectedMood;
      });
    });

    // Default set first button active
    if (moodBtns.length > 0) {
      moodBtns[0].classList.add('active');
    }

    // Energy Slider change
    energyRange.addEventListener('input', (e) => {
      energyVal.textContent = e.target.value;
    });

    // Mood Form Submit
    moodForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const mood = selectedMoodInput.value;
      const energyLevel = Number(energyRange.value);
      const note = moodNoteInput.value;

      try {
        const res = await fetch('/api/moods', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mood, energyLevel, note })
        });
        const json = await res.json();
        if (json.success) {
          moodNoteInput.value = '';
          fetchMoods();
          fetchStats();
          showToast(`Mood logged: ${getMoodEmoji(mood)} ${mood}`, 'success');
        } else {
          showToast(json.message || 'Failed to log mood', 'error');
        }
      } catch (err) {
        showToast('Error connecting to server', 'error');
      }
    });

    // Task Filter Pills
    filterPills.addEventListener('click', (e) => {
      if (e.target.classList.contains('filter-btn')) {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        activePriorityFilter = e.target.dataset.filter;
        fetchTasks();
      }
    });

    // Search Input
    let searchTimeout;
    taskSearchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchQuery = e.target.value;
      searchTimeout = setTimeout(fetchTasks, 250);
    });

    // Task List Click Delegation (Checkbox, Edit, Delete)
    taskListEl.addEventListener('click', (e) => {
      const checkbox = e.target.closest('.custom-checkbox');
      if (checkbox) {
        const id = checkbox.dataset.id;
        const completed = checkbox.dataset.completed === 'true';
        handleToggleTask(id, completed);
        return;
      }

      const editBtn = e.target.closest('.edit-btn');
      if (editBtn) {
        openEditTaskModal(editBtn.dataset.id);
        return;
      }

      const deleteBtn = e.target.closest('.delete-btn');
      if (deleteBtn) {
        handleDeleteTask(deleteBtn.dataset.id);
        return;
      }
    });

    // Modal Control
    openTaskModalBtn.addEventListener('click', () => {
      modalTitle.textContent = 'Create New Task';
      taskIdInput.value = '';
      taskForm.reset();
      taskModal.classList.add('active');
    });

    const closeModal = () => taskModal.classList.remove('active');
    closeTaskModalBtn.addEventListener('click', closeModal);
    cancelTaskModalBtn.addEventListener('click', closeModal);
    taskModal.addEventListener('click', (e) => {
      if (e.target === taskModal) closeModal();
    });

    // Save Task (Form Submit)
    taskForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = taskIdInput.value;
      const title = taskTitleInput.value;
      const description = taskDescInput.value;
      const priority = taskPrioritySelect.value;
      const category = taskCategorySelect.value;

      const payload = { title, description, priority, category };
      const url = id ? `/api/tasks/${id}` : '/api/tasks';
      const method = id ? 'PUT' : 'POST';

      try {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.success) {
          closeModal();
          fetchTasks();
          fetchStats();
          showToast(id ? 'Task updated successfully' : 'New task added! 🚀', 'success');
        } else {
          showToast(json.message || 'Failed to save task', 'error');
        }
      } catch (err) {
        showToast('Error saving task', 'error');
      }
    });
  }

  // ------------------------------------------------------------------------
  // Utilities
  // ------------------------------------------------------------------------
  function getMoodEmoji(mood) {
    switch (mood) {
      case 'Happy': return '😊';
      case 'Productive': return '🚀';
      case 'Calm': return '🧘';
      case 'Tired': return '😴';
      case 'Burnout': return '🔥';
      default: return '✨';
    }
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }

  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `${type === 'success' ? '✅' : '⚠️'} <span>${escapeHTML(message)}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
});
