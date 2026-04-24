// ============================================================================
// CONSTANTS AND CONFIGURATION
// ============================================================================

const STORAGE_KEYS = {
  TASKS: 'tasks',
  QUICK_LINKS: 'quickLinks',
  PREFERENCES: 'preferences'
};

const DEFAULT_PREFERENCES = {
  theme: 'light',
  customName: null,
  pomodoroMinutes: 25
};

// ============================================================================
// STORAGE MANAGER
// ============================================================================

/**
 * Storage Manager - Centralized interface for all Local Storage operations
 * Handles JSON serialization/deserialization and error handling
 */
const StorageManager = {
  /**
   * Check if Local Storage is available
   * @returns {boolean} True if storage is available, false otherwise
   */
  isStorageAvailable() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.error('Local Storage is not available:', e);
      return false;
    }
  },

  /**
   * Get item from Local Storage
   * @param {string} key - Storage key
   * @returns {any|null} Parsed value or null if not found/error
   */
  get(key) {
    if (!this.isStorageAvailable()) {
      console.error('Storage unavailable: cannot get item');
      return null;
    }

    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.error(`Error getting item from storage (key: ${key}):`, e);
      return null;
    }
  },

  /**
   * Set item in Local Storage
   * @param {string} key - Storage key
   * @param {any} value - Value to store (will be JSON stringified)
   * @returns {boolean} True if successful, false otherwise
   */
  set(key, value) {
    if (!this.isStorageAvailable()) {
      console.error('Storage unavailable: cannot set item');
      NotificationSystem.showError('Storage is unavailable. Your changes may not be saved.');
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        console.error('Storage quota exceeded. Please delete some items.');
        NotificationSystem.showError('Storage limit reached. Please delete some items to free up space.');
      } else {
        console.error(`Error setting item in storage (key: ${key}):`, e);
        NotificationSystem.showError('Failed to save data. Please try again.');
      }
      return false;
    }
  },

  /**
   * Remove item from Local Storage
   * @param {string} key - Storage key
   * @returns {boolean} True if successful, false otherwise
   */
  remove(key) {
    if (!this.isStorageAvailable()) {
      console.error('Storage unavailable: cannot remove item');
      return false;
    }

    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error(`Error removing item from storage (key: ${key}):`, e);
      return false;
    }
  },

  /**
   * Get all tasks from storage
   * @returns {Array<Task>} Array of task objects, empty array if none found
   */
  getTasks() {
    const tasks = this.get(STORAGE_KEYS.TASKS);
    return Array.isArray(tasks) ? tasks : [];
  },

  /**
   * Save all tasks to storage
   * @param {Array<Task>} tasks - Array of task objects
   * @returns {boolean} True if successful, false otherwise
   */
  saveTasks(tasks) {
    if (!Array.isArray(tasks)) {
      console.error('saveTasks: tasks must be an array');
      return false;
    }
    return this.set(STORAGE_KEYS.TASKS, tasks);
  },

  /**
   * Get all quick links from storage
   * @returns {Array<QuickLink>} Array of quick link objects, empty array if none found
   */
  getQuickLinks() {
    const links = this.get(STORAGE_KEYS.QUICK_LINKS);
    return Array.isArray(links) ? links : [];
  },

  /**
   * Save all quick links to storage
   * @param {Array<QuickLink>} links - Array of quick link objects
   * @returns {boolean} True if successful, false otherwise
   */
  saveQuickLinks(links) {
    if (!Array.isArray(links)) {
      console.error('saveQuickLinks: links must be an array');
      return false;
    }
    return this.set(STORAGE_KEYS.QUICK_LINKS, links);
  },

  /**
   * Get user preferences from storage
   * @returns {UserPreferences} User preferences object with defaults applied
   */
  getPreferences() {
    const prefs = this.get(STORAGE_KEYS.PREFERENCES);
    // Merge with defaults to ensure all properties exist
    return {
      ...DEFAULT_PREFERENCES,
      ...(prefs || {})
    };
  },

  /**
   * Save user preferences to storage
   * @param {UserPreferences} prefs - User preferences object
   * @returns {boolean} True if successful, false otherwise
   */
  savePreferences(prefs) {
    if (!prefs || typeof prefs !== 'object') {
      console.error('savePreferences: prefs must be an object');
      return false;
    }
    // Merge with existing preferences to preserve any unmodified values
    const currentPrefs = this.getPreferences();
    const updatedPrefs = {
      ...currentPrefs,
      ...prefs
    };
    return this.set(STORAGE_KEYS.PREFERENCES, updatedPrefs);
  }
};

// ============================================================================
// NOTIFICATION SYSTEM
// ============================================================================

/**
 * Notification System - Displays user-friendly toast notifications
 * Provides visual feedback for errors, success, and info messages
 */
const NotificationSystem = {
  container: null,
  activeNotifications: [],

  /**
   * Initialize notification system
   * Creates notification container if it doesn't exist
   */
  init() {
    // Check if container already exists
    this.container = document.getElementById('notification-container');
    
    if (!this.container) {
      // Create notification container
      this.container = document.createElement('div');
      this.container.id = 'notification-container';
      this.container.className = 'notification-container';
      this.container.setAttribute('aria-live', 'polite');
      this.container.setAttribute('aria-atomic', 'true');
      document.body.appendChild(this.container);
    }
  },

  /**
   * Show notification
   * @param {string} message - Notification message
   * @param {string} type - Notification type ('error', 'success', 'info')
   * @param {number} duration - Duration in milliseconds (default: 5000)
   */
  show(message, type = 'info', duration = 5000) {
    // Ensure container exists
    if (!this.container) {
      this.init();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    notification.setAttribute('aria-atomic', 'true');
    
    // Create message text
    const messageText = document.createElement('span');
    messageText.className = 'notification-message';
    messageText.textContent = message;
    
    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'notification-close';
    closeBtn.setAttribute('aria-label', `Close ${type} notification: ${message}`);
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => {
      this.remove(notification);
    });

    // Assemble notification
    notification.appendChild(messageText);
    notification.appendChild(closeBtn);

    // Add to container
    this.container.appendChild(notification);
    this.activeNotifications.push(notification);

    // Trigger animation (add show class after a brief delay for CSS transition)
    setTimeout(() => {
      notification.classList.add('notification-show');
    }, 10);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        this.remove(notification);
      }, duration);
    }

    return notification;
  },

  /**
   * Remove notification
   * @param {HTMLElement} notification - Notification element to remove
   */
  remove(notification) {
    if (!notification || !notification.parentElement) {
      return;
    }

    // Trigger fade-out animation
    notification.classList.remove('notification-show');
    notification.classList.add('notification-hide');

    // Remove from DOM after animation completes
    setTimeout(() => {
      if (notification.parentElement) {
        notification.parentElement.removeChild(notification);
      }
      
      // Remove from active notifications array
      const index = this.activeNotifications.indexOf(notification);
      if (index > -1) {
        this.activeNotifications.splice(index, 1);
      }
    }, 300);
  },

  /**
   * Show error notification
   * @param {string} message - Error message
   */
  showError(message) {
    return this.show(message, 'error', 5000);
  },

  /**
   * Show success notification
   * @param {string} message - Success message
   */
  showSuccess(message) {
    return this.show(message, 'success', 3000);
  },

  /**
   * Show info notification
   * @param {string} message - Info message
   */
  showInfo(message) {
    return this.show(message, 'info', 3000);
  },

  /**
   * Clear all notifications
   */
  clearAll() {
    this.activeNotifications.forEach(notification => {
      this.remove(notification);
    });
  }
};

// ============================================================================
// THEME MANAGER
// ============================================================================

/**
 * Theme Manager - Manages light/dark theme switching
 * Handles theme persistence and UI updates
 */
const ThemeManager = {
  /**
   * Initialize theme system
   * Loads saved theme preference and applies it
   */
  init() {
    try {
      // Get saved theme preference from storage
      const prefs = StorageManager.getPreferences();
      const savedTheme = prefs.theme || 'light';
      
      // Apply the saved theme
      this.setTheme(savedTheme);
      
      // Wire up theme toggle button event listener
      const themeToggleBtn = document.getElementById('theme-toggle');
      if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
          this.toggle();
        });
      }
    } catch (error) {
      console.error('Error initializing Theme Manager:', error);
      NotificationSystem.showError('Failed to initialize theme. Using default light theme.');
    }
  },

  /**
   * Toggle between light and dark themes
   */
  toggle() {
    const currentTheme = this.getCurrentTheme();
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  },

  /**
   * Set theme to specified value
   * @param {string} theme - Theme to apply ('light' or 'dark')
   */
  setTheme(theme) {
    // Validate theme value
    if (theme !== 'light' && theme !== 'dark') {
      console.error(`Invalid theme: ${theme}. Using 'light' as default.`);
      theme = 'light';
    }

    // Apply theme by adding/removing dark-theme class
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }

    // Update theme toggle button icon and aria-pressed state
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = document.querySelector('.theme-icon');
    
    if (themeIcon) {
      // 🌙 for light mode (click to go dark), ☀️ for dark mode (click to go light)
      themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
    }
    
    if (themeToggleBtn) {
      // Update aria-pressed to indicate current state
      themeToggleBtn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
      // Update aria-label to describe current action
      themeToggleBtn.setAttribute('aria-label', 
        theme === 'light' 
          ? 'Switch to dark theme' 
          : 'Switch to light theme'
      );
    }

    // Save theme preference to storage
    StorageManager.savePreferences({ theme });
  },

  /**
   * Get current theme
   * @returns {string} Current theme ('light' or 'dark')
   */
  getCurrentTheme() {
    return document.body.classList.contains('dark-theme') ? 'dark' : 'light';
  }
};

// ============================================================================
// GREETING COMPONENT
// ============================================================================

/**
 * Greeting Component - Displays time, date, and personalized greeting
 * Updates every second and shows time-based greeting messages
 */
const GreetingComponent = {
  intervalId: null,

  /**
   * Initialize greeting component
   * Sets up interval to update time/date/greeting every second
   */
  init() {
    try {
      // Initial update
      this.updateTime();
      this.updateGreeting();

      // Update every second
      this.intervalId = setInterval(() => {
        this.updateTime();
        this.updateGreeting();
      }, 1000);
    } catch (error) {
      console.error('Error initializing Greeting Component:', error);
      NotificationSystem.showError('Failed to initialize greeting display. Please refresh the page.');
    }
  },

  /**
   * Update time and date display
   * Formats time as 12-hour with AM/PM
   * Formats date as "DayOfWeek, Month Day, Year"
   */
  updateTime() {
    const now = new Date();

    // Format time (12-hour format with AM/PM)
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    // Convert to 12-hour format
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    
    // Pad with zeros
    const minutesStr = minutes.toString().padStart(2, '0');
    const secondsStr = seconds.toString().padStart(2, '0');
    
    const timeStr = `${hours}:${minutesStr}:${secondsStr} ${ampm}`;

    // Format date (e.g., "Monday, January 15, 2024")
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    const dateStr = now.toLocaleDateString('en-US', options);

    // Update DOM elements
    const timeElement = document.getElementById('current-time');
    const dateElement = document.getElementById('current-date');
    
    if (timeElement) {
      timeElement.textContent = timeStr;
    }
    
    if (dateElement) {
      dateElement.textContent = dateStr;
    }
  },

  /**
   * Update greeting based on time of day
   * Morning: 5:00-11:59, Afternoon: 12:00-16:59
   * Evening: 17:00-20:59, Night: 21:00-4:59
   */
  updateGreeting() {
    const now = new Date();
    const hours = now.getHours();
    
    // Determine time-based greeting
    let greeting;
    if (hours >= 5 && hours < 12) {
      greeting = 'Good morning';
    } else if (hours >= 12 && hours < 17) {
      greeting = 'Good afternoon';
    } else if (hours >= 17 && hours < 21) {
      greeting = 'Good evening';
    } else {
      greeting = 'Good night';
    }

    // Get custom name from preferences
    const prefs = StorageManager.getPreferences();
    const customName = prefs.customName;

    // Add name if set
    if (customName) {
      greeting = `${greeting}, ${customName}`;
    }

    // Update DOM element
    const greetingElement = document.getElementById('greeting-text');
    if (greetingElement) {
      greetingElement.textContent = greeting;
    }
  },

  /**
   * Update displayed name from preferences
   * Called when user changes their name in settings
   * @param {string|null} name - User's custom name or null
   */
  updateName(name) {
    // Save to preferences
    StorageManager.savePreferences({ customName: name });
    
    // Update greeting display immediately
    this.updateGreeting();
  }
};

// ============================================================================
// TIMER COMPONENT
// ============================================================================

/**
 * Timer Component - Focus timer with countdown functionality
 * Implements Pomodoro-style timer with start/stop/reset controls
 */
const TimerComponent = {
  // Timer state
  duration: 0,        // Total duration in seconds
  remaining: 0,       // Remaining time in seconds
  isRunning: false,   // Timer active state
  intervalId: null,   // setInterval reference

  /**
   * Initialize timer component
   * Loads duration from preferences and sets up event listeners
   */
  init() {
    try {
      // Load initial duration from preferences
      const prefs = StorageManager.getPreferences();
      const minutes = prefs.pomodoroMinutes || 25;
      this.setDuration(minutes);

      // Wire up control button event listeners
      const startBtn = document.getElementById('timer-start');
      const stopBtn = document.getElementById('timer-stop');
      const resetBtn = document.getElementById('timer-reset');

      if (startBtn) {
        startBtn.addEventListener('click', () => {
          this.start();
        });
      }

      if (stopBtn) {
        stopBtn.addEventListener('click', () => {
          this.stop();
        });
      }

      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          this.reset();
        });
      }

      // Initial display update
      this.updateDisplay();
    } catch (error) {
      console.error('Error initializing Timer Component:', error);
      NotificationSystem.showError('Failed to initialize timer. Please refresh the page.');
    }
  },

  /**
   * Set timer duration from preferences
   * @param {number} minutes - Duration in minutes
   */
  setDuration(minutes) {
    // Convert minutes to seconds
    this.duration = minutes * 60;
    this.remaining = this.duration;
    
    // Update display
    this.updateDisplay();
  },

  /**
   * Start countdown timer
   * Begins counting down from current remaining time
   */
  start() {
    // Don't start if already running
    if (this.isRunning) {
      return;
    }

    // Set running state
    this.isRunning = true;

    // Disable start button while running
    const startBtn = document.getElementById('timer-start');
    if (startBtn) {
      startBtn.disabled = true;
    }

    // Start countdown interval (1000ms = 1 second)
    this.intervalId = setInterval(() => {
      // Decrement remaining time
      this.remaining--;

      // Update display
      this.updateDisplay();

      // Check if timer reached zero
      if (this.remaining <= 0) {
        this.stop();
      }
    }, 1000);
  },

  /**
   * Stop/pause countdown timer
   * Pauses at current time, can be resumed
   */
  stop() {
    // Clear interval
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Set running state
    this.isRunning = false;

    // Re-enable start button
    const startBtn = document.getElementById('timer-start');
    if (startBtn) {
      startBtn.disabled = false;
    }
  },

  /**
   * Reset timer to initial duration
   * Stops timer and returns to starting time
   */
  reset() {
    // Stop timer if running
    this.stop();

    // Reset remaining time to duration
    this.remaining = this.duration;

    // Update display
    this.updateDisplay();
  },

  /**
   * Update timer display
   * Formats time as MM:SS and updates DOM
   */
  updateDisplay() {
    // Calculate minutes and seconds
    const minutes = Math.floor(this.remaining / 60);
    const seconds = this.remaining % 60;

    // Format with leading zeros
    const minutesStr = minutes.toString().padStart(2, '0');
    const secondsStr = seconds.toString().padStart(2, '0');

    // Update DOM elements
    const minutesElement = document.getElementById('timer-minutes');
    const secondsElement = document.getElementById('timer-seconds');

    if (minutesElement) {
      minutesElement.textContent = minutesStr;
    }

    if (secondsElement) {
      secondsElement.textContent = secondsStr;
    }
  }
};

// ============================================================================
// TODO LIST COMPONENT
// ============================================================================

/**
 * Todo List Component - Manages task list with CRUD operations
 * Handles task creation, editing, deletion, completion toggle, and persistence
 */
const TodoListComponent = {
  // Internal state
  tasks: [],
  containerElement: null,

  /**
   * Initialize todo list component
   * Loads tasks from storage and renders them
   */
  init() {
    try {
      // Get container element (the <ul> where tasks will be rendered)
      this.containerElement = document.getElementById('todo-list');
      
      if (!this.containerElement) {
        console.error('TodoListComponent: container element not found');
        return;
      }

      // Load tasks from Local Storage
      this.tasks = StorageManager.getTasks();

      // Set up form submission event listener
      const todoForm = document.getElementById('todo-form');
      const todoInput = document.getElementById('todo-input');
      const errorElement = document.getElementById('todo-error');

      if (todoForm && todoInput) {
        todoForm.addEventListener('submit', (e) => {
          e.preventDefault();
          
          const taskText = todoInput.value;
          const result = this.addTask(taskText);
          
          if (result.success) {
            // Clear input on success
            todoInput.value = '';
            // Clear any error message
            if (errorElement) {
              errorElement.textContent = '';
            }
          } else {
            // Display error message
            if (errorElement) {
              errorElement.textContent = result.error;
            }
          }
        });
      }

      // Initial render
      this.render();

      console.log('TodoListComponent initialized with', this.tasks.length, 'tasks');
    } catch (error) {
      console.error('Error initializing Todo List Component:', error);
      NotificationSystem.showError('Failed to initialize todo list. Please refresh the page.');
    }
  },

  /**
   * Generate unique task ID
   * Uses timestamp + random string for uniqueness
   * @returns {string} Unique task ID
   */
  generateTaskId() {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 9);
    return `${timestamp}-${randomStr}`;
  },

  /**
   * Add new task to the list
   * Validates text (1-500 characters, trim whitespace)
   * @param {string} text - Task description text
   * @returns {Object} Result object with success flag and optional error message
   */
  addTask(text) {
    // Trim whitespace from input
    const trimmedText = text.trim();
    
    // Validate text length (1-500 characters)
    if (trimmedText.length === 0) {
      return {
        success: false,
        error: 'Task text cannot be empty'
      };
    }
    
    if (trimmedText.length > 500) {
      return {
        success: false,
        error: 'Task text must be 500 characters or less'
      };
    }
    
    // Create new task
    const newTask = {
      id: this.generateTaskId(),
      text: trimmedText,
      completed: false,
      createdAt: Date.now()
    };

    // Add to tasks array
    this.tasks.push(newTask);

    // Save to Local Storage
    const saveSuccess = this.saveTasks();
    
    if (!saveSuccess) {
      // If save failed, remove the task from array
      this.tasks.pop();
      return {
        success: false,
        error: 'Failed to save task. Storage may be full.'
      };
    }

    // Update UI immediately
    this.render();

    // Show success notification
    NotificationSystem.showSuccess('Task added successfully');
    
    // Announce to screen readers
    this.announceToScreenReader(`Task added: ${trimmedText}`);

    return {
      success: true
    };
  },

  /**
   * Edit existing task
   * @param {string} id - Task ID
   * @param {string} newText - Updated task text
   * @returns {Object} Result object with success flag and optional error message
   */
  editTask(id, newText) {
    // Trim whitespace from input
    const trimmedText = newText.trim();
    
    // Validate text length (1-500 characters)
    if (trimmedText.length === 0) {
      return {
        success: false,
        error: 'Task text cannot be empty'
      };
    }
    
    if (trimmedText.length > 500) {
      return {
        success: false,
        error: 'Task text must be 500 characters or less'
      };
    }

    // Find task by ID
    const taskIndex = this.tasks.findIndex(task => task.id === id);
    
    if (taskIndex === -1) {
      console.error(`editTask: task with id ${id} not found`);
      return {
        success: false,
        error: 'Task not found'
      };
    }

    // Update task text
    this.tasks[taskIndex].text = trimmedText;

    // Save to storage
    const saveSuccess = this.saveTasks();
    
    if (!saveSuccess) {
      return {
        success: false,
        error: 'Failed to save task. Storage may be full.'
      };
    }

    // Re-render
    this.render();

    // Show success notification
    NotificationSystem.showSuccess('Task updated successfully');

    return {
      success: true
    };
  },

  /**
   * Delete task from the list
   * @param {string} id - Task ID
   * @returns {boolean} True if task deleted successfully, false otherwise
   */
  deleteTask(id) {
    // Find task index
    const taskIndex = this.tasks.findIndex(task => task.id === id);
    
    if (taskIndex === -1) {
      console.error(`deleteTask: task with id ${id} not found`);
      return false;
    }

    // Remove task from array
    this.tasks.splice(taskIndex, 1);

    // Save to storage
    this.saveTasks();

    // Re-render
    this.render();

    // Show success notification
    NotificationSystem.showSuccess('Task deleted');
    
    // Announce to screen readers
    this.announceToScreenReader('Task deleted');

    return true;
  },

  /**
   * Toggle task completion status
   * @param {string} id - Task ID
   * @returns {boolean} True if task toggled successfully, false otherwise
   */
  toggleTask(id) {
    // Find task by ID
    const task = this.tasks.find(task => task.id === id);
    
    if (!task) {
      console.error(`toggleTask: task with id ${id} not found`);
      return false;
    }

    // Toggle completed status
    task.completed = !task.completed;

    // Save to storage
    this.saveTasks();

    // Re-render
    this.render();
    
    // Announce to screen readers
    this.announceToScreenReader(
      task.completed 
        ? `Task marked as complete: ${task.text}` 
        : `Task marked as incomplete: ${task.text}`
    );

    return true;
  },

  /**
   * Render all tasks to the DOM
   * Clears container and rebuilds task list
   */
  render() {
    if (!this.containerElement) {
      console.error('TodoListComponent: cannot render, container element not found');
      return;
    }

    // Clear existing content
    this.containerElement.innerHTML = '';

    // If no tasks, show empty state message
    if (this.tasks.length === 0) {
      const emptyItem = document.createElement('li');
      emptyItem.className = 'todo-empty-message';
      emptyItem.textContent = 'No tasks yet. Add one to get started!';
      this.containerElement.appendChild(emptyItem);
      return;
    }

    // Render each task
    this.tasks.forEach(task => {
      const taskElement = this.createTaskElement(task);
      this.containerElement.appendChild(taskElement);
    });
  },

  /**
   * Enter edit mode for a task
   * Replaces task text with input field and shows save/cancel buttons
   * @param {string} taskId - Task ID
   */
  enterEditMode(taskId) {
    // Find the task element
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    if (!taskElement) {
      console.error(`enterEditMode: task element not found for id ${taskId}`);
      return;
    }

    // Find the task data
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) {
      console.error(`enterEditMode: task not found for id ${taskId}`);
      return;
    }

    // Check if already in edit mode
    if (taskElement.classList.contains('editing')) {
      return;
    }

    // Add editing class
    taskElement.classList.add('editing');

    // Find the label element
    const label = taskElement.querySelector('.todo-text');
    if (!label) {
      console.error('enterEditMode: label element not found');
      return;
    }

    // Replace label with input field
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'todo-edit-input';
    input.value = task.text;
    input.maxLength = 500;
    input.setAttribute('aria-label', 'Edit task text');
    
    // Replace label with input
    label.replaceWith(input);
    
    // Focus the input and select all text
    input.focus();
    input.select();

    // Find button container
    const buttonContainer = taskElement.querySelector('.todo-buttons');
    if (!buttonContainer) {
      console.error('enterEditMode: button container not found');
      return;
    }

    // Clear existing buttons
    buttonContainer.innerHTML = '';

    // Create save button
    const saveBtn = document.createElement('button');
    saveBtn.className = 'todo-btn todo-save-btn';
    saveBtn.textContent = 'Save';
    saveBtn.setAttribute('aria-label', 'Save changes to task');
    
    // Save button event listener
    saveBtn.addEventListener('click', () => {
      this.saveEdit(taskId, input.value);
    });

    // Create cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'todo-btn todo-cancel-btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.setAttribute('aria-label', 'Cancel editing and discard changes');
    
    // Cancel button event listener
    cancelBtn.addEventListener('click', () => {
      this.cancelEdit(taskId);
    });

    // Add buttons to container
    buttonContainer.appendChild(saveBtn);
    buttonContainer.appendChild(cancelBtn);

    // Handle Enter key to save, Escape to cancel
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.saveEdit(taskId, input.value);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.cancelEdit(taskId);
      }
    });
  },

  /**
   * Save edit and exit edit mode
   * @param {string} taskId - Task ID
   * @param {string} newText - New task text
   */
  saveEdit(taskId, newText) {
    // Validate and save the edit
    const result = this.editTask(taskId, newText);
    
    if (!result.success) {
      // Show error message
      const errorElement = document.getElementById('todo-error');
      if (errorElement) {
        errorElement.textContent = result.error;
        // Clear error after 3 seconds
        setTimeout(() => {
          errorElement.textContent = '';
        }, 3000);
      }
      // Don't exit edit mode if validation failed
      return;
    }

    // Clear any error message
    const errorElement = document.getElementById('todo-error');
    if (errorElement) {
      errorElement.textContent = '';
    }

    // Edit mode will be exited by render()
  },

  /**
   * Cancel edit and exit edit mode
   * @param {string} taskId - Task ID
   */
  cancelEdit(taskId) {
    // Simply re-render to restore original state
    this.render();
  },

  /**
   * Create DOM element for a single task
   * @param {Task} task - Task object
   * @returns {HTMLElement} Task list item element
   */
  createTaskElement(task) {
    // Create list item
    const li = document.createElement('li');
    li.className = 'todo-item';
    li.setAttribute('role', 'listitem');
    li.setAttribute('data-task-id', task.id);
    
    // Add completed class if task is completed
    if (task.completed) {
      li.classList.add('completed');
    }

    // Create checkbox for completion toggle
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'todo-checkbox';
    checkbox.id = `task-checkbox-${task.id}`;
    checkbox.checked = task.completed;
    checkbox.setAttribute('aria-label', `Mark "${task.text}" as ${task.completed ? 'incomplete' : 'complete'}`);
    
    // Checkbox event listener
    checkbox.addEventListener('change', () => {
      this.toggleTask(task.id);
    });

    // Create label for task text
    const label = document.createElement('label');
    label.className = 'todo-text';
    label.htmlFor = `task-checkbox-${task.id}`;
    label.textContent = task.text;

    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'todo-buttons';
    buttonContainer.setAttribute('role', 'group');
    buttonContainer.setAttribute('aria-label', `Actions for task: ${task.text}`);

    // Create edit button
    const editBtn = document.createElement('button');
    editBtn.className = 'todo-btn todo-edit-btn';
    editBtn.textContent = 'Edit';
    editBtn.setAttribute('aria-label', `Edit task: ${task.text}`);
    
    // Edit button event listener
    editBtn.addEventListener('click', () => {
      this.enterEditMode(task.id);
    });

    // Create delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'todo-btn todo-delete-btn';
    deleteBtn.textContent = 'Delete';
    deleteBtn.setAttribute('aria-label', `Delete task: ${task.text}`);
    
    // Delete button event listener
    deleteBtn.addEventListener('click', () => {
      this.deleteTask(task.id);
    });

    // Assemble task element
    buttonContainer.appendChild(editBtn);
    buttonContainer.appendChild(deleteBtn);
    
    li.appendChild(checkbox);
    li.appendChild(label);
    li.appendChild(buttonContainer);

    return li;
  },

  /**
   * Save tasks to Local Storage
   * @returns {boolean} True if saved successfully, false otherwise
   */
  saveTasks() {
    return StorageManager.saveTasks(this.tasks);
  },

  /**
   * Announce message to screen readers using aria-live region
   * @param {string} message - Message to announce
   */
  announceToScreenReader(message) {
    // Use the task list's aria-live region for announcements
    // Create a temporary announcement element
    const announcement = document.createElement('div');
    announcement.className = 'visually-hidden';
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement is made
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }
};

// ============================================================================
// QUICK LINKS COMPONENT
// ============================================================================

/**
 * Quick Links Component - Manages favorite website links
 * Handles link creation, deletion, opening, and persistence
 */
const QuickLinksComponent = {
  // Internal state
  links: [],
  containerElement: null,

  /**
   * Initialize quick links component
   * Loads links from storage and renders them
   */
  init() {
    try {
      // Get container element (the div where links will be rendered)
      this.containerElement = document.getElementById('links-container');
      
      if (!this.containerElement) {
        console.error('QuickLinksComponent: container element not found');
        return;
      }

      // Load quick links from Local Storage
      this.links = StorageManager.getQuickLinks();

      // Set up form submission event listener
      const linksForm = document.getElementById('links-form');
      const linkNameInput = document.getElementById('link-name');
      const linkUrlInput = document.getElementById('link-url');
      const errorElement = document.getElementById('link-error');

      if (linksForm && linkNameInput && linkUrlInput) {
        linksForm.addEventListener('submit', (e) => {
          e.preventDefault();
          
          const name = linkNameInput.value;
          const url = linkUrlInput.value;
          const result = this.addLink(name, url);
          
          if (result.success) {
            // Clear inputs on success
            linkNameInput.value = '';
            linkUrlInput.value = '';
            // Clear any error message
            if (errorElement) {
              errorElement.textContent = '';
            }
          } else {
            // Display error message
            if (errorElement) {
              errorElement.textContent = result.error;
            }
          }
        });
      }

      // Initial render
      this.render();

      console.log('QuickLinksComponent initialized with', this.links.length, 'links');
    } catch (error) {
      console.error('Error initializing Quick Links Component:', error);
      NotificationSystem.showError('Failed to initialize quick links. Please refresh the page.');
    }
  },

  /**
   * Generate unique link ID
   * Uses timestamp + random string for uniqueness
   * @returns {string} Unique link ID
   */
  generateLinkId() {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 9);
    return `${timestamp}-${randomStr}`;
  },

  /**
   * Validate URL format
   * @param {string} url - URL to validate
   * @returns {boolean} True if URL is valid, false otherwise
   */
  isValidURL(url) {
    try {
      const urlObj = new URL(url);
      // Only accept http:// or https:// protocols for security
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch (_) {
      return false;
    }
  },

  /**
   * Add new quick link
   * @param {string} name - Display name for the link
   * @param {string} url - Website URL
   * @returns {Object} Result object with success flag and optional error message
   */
  addLink(name, url) {
    // Trim whitespace from inputs
    const trimmedName = name.trim();
    const trimmedUrl = url.trim();
    
    // Validate name (cannot be empty)
    if (trimmedName.length === 0) {
      return {
        success: false,
        error: 'Link name cannot be empty'
      };
    }
    
    // Validate URL format
    if (!this.isValidURL(trimmedUrl)) {
      return {
        success: false,
        error: 'Please enter a valid URL (must start with http:// or https://)'
      };
    }
    
    // Create new link
    const newLink = {
      id: this.generateLinkId(),
      name: trimmedName,
      url: trimmedUrl
    };

    // Add to links array
    this.links.push(newLink);

    // Save to Local Storage
    const saveSuccess = this.saveLinks();
    
    if (!saveSuccess) {
      // If save failed, remove the link from array
      this.links.pop();
      return {
        success: false,
        error: 'Failed to save link. Storage may be full.'
      };
    }

    // Update UI immediately
    this.render();

    // Show success notification
    NotificationSystem.showSuccess('Quick link added successfully');

    return {
      success: true
    };
  },

  /**
   * Delete quick link
   * @param {string} id - Link ID
   * @returns {boolean} True if link deleted successfully, false otherwise
   */
  deleteLink(id) {
    // Find link index
    const linkIndex = this.links.findIndex(link => link.id === id);
    
    if (linkIndex === -1) {
      console.error(`deleteLink: link with id ${id} not found`);
      return false;
    }

    // Remove link from array
    this.links.splice(linkIndex, 1);

    // Save to storage
    this.saveLinks();

    // Re-render
    this.render();

    // Show success notification
    NotificationSystem.showSuccess('Quick link deleted');

    return true;
  },

  /**
   * Open link in new browser tab
   * @param {string} url - Website URL to open
   */
  openLink(url) {
    // Open URL in new tab
    window.open(url, '_blank', 'noopener,noreferrer');
  },

  /**
   * Render all quick links to the DOM
   * Displays links as buttons
   */
  render() {
    if (!this.containerElement) {
      console.error('QuickLinksComponent: cannot render, container element not found');
      return;
    }

    // Clear existing content
    this.containerElement.innerHTML = '';

    // If no links, show empty state message
    if (this.links.length === 0) {
      const emptyMessage = document.createElement('p');
      emptyMessage.className = 'links-empty-message';
      emptyMessage.textContent = 'No quick links yet. Add one to get started!';
      this.containerElement.appendChild(emptyMessage);
      return;
    }

    // Render each link as a button
    this.links.forEach(link => {
      const linkElement = this.createLinkElement(link);
      this.containerElement.appendChild(linkElement);
    });
  },

  /**
   * Create DOM element for a single quick link
   * @param {QuickLink} link - Link object
   * @returns {HTMLElement} Link button element with delete control
   */
  createLinkElement(link) {
    // Create wrapper div for link button and delete button
    const wrapper = document.createElement('div');
    wrapper.className = 'link-item';
    wrapper.setAttribute('role', 'listitem');
    wrapper.setAttribute('data-link-id', link.id);

    // Create link button
    const linkBtn = document.createElement('button');
    linkBtn.className = 'link-btn';
    linkBtn.textContent = link.name;
    linkBtn.setAttribute('aria-label', `Open ${link.name} in new tab`);
    linkBtn.setAttribute('title', link.url);
    
    // Link button event listener
    linkBtn.addEventListener('click', () => {
      this.openLink(link.url);
    });

    // Create delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'link-delete';
    deleteBtn.textContent = '×';
    deleteBtn.setAttribute('aria-label', `Delete quick link: ${link.name}`);
    deleteBtn.setAttribute('title', 'Delete link');
    
    // Delete button event listener
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent triggering link open
      this.deleteLink(link.id);
    });

    // Assemble link element
    wrapper.appendChild(linkBtn);
    wrapper.appendChild(deleteBtn);

    return wrapper;
  },

  /**
   * Save links to Local Storage
   * @returns {boolean} True if saved successfully, false otherwise
   */
  saveLinks() {
    return StorageManager.saveQuickLinks(this.links);
  }
};

// ============================================================================
// SETTINGS COMPONENT
// ============================================================================

/**
 * Settings Component - Manages user preferences
 * Handles settings modal display and preference updates
 */
const SettingsComponent = {
  modalElement: null,
  settingsBtn: null,
  closeBtn: null,
  overlayElement: null,
  formElement: null,
  focusableElements: [],
  lastFocusedElement: null,

  /**
   * Initialize settings component
   * Sets up event listeners for modal open/close and form submission
   */
  init() {
    try {
      // Get DOM elements
      this.modalElement = document.getElementById('settings-modal');
      this.settingsBtn = document.getElementById('settings-btn');
      this.closeBtn = document.getElementById('settings-close');
      this.overlayElement = this.modalElement ? this.modalElement.querySelector('.modal-overlay') : null;
      this.formElement = document.getElementById('settings-form');

      if (!this.modalElement || !this.settingsBtn || !this.closeBtn || !this.formElement) {
        console.error('SettingsComponent: required elements not found');
        return;
      }

      // Wire up settings button to open modal
      this.settingsBtn.addEventListener('click', () => {
        this.show();
      });

      // Wire up close button to close modal
      this.closeBtn.addEventListener('click', () => {
        this.hide();
      });

      // Wire up overlay click to close modal
      if (this.overlayElement) {
        this.overlayElement.addEventListener('click', () => {
          this.hide();
        });
      }

      // Wire up Escape key to close modal
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.modalElement.getAttribute('aria-hidden') === 'false') {
          this.hide();
        }
      });

      // Wire up form submission
      this.formElement.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveSettings();
      });

      // Wire up clear name button
      const clearNameBtn = document.getElementById('clear-name');
      if (clearNameBtn) {
        clearNameBtn.addEventListener('click', () => {
          this.clearName();
        });
      }

      // Wire up reset duration button
      const resetDurationBtn = document.getElementById('reset-duration');
      if (resetDurationBtn) {
        resetDurationBtn.addEventListener('click', () => {
          this.resetDuration();
        });
      }

      console.log('SettingsComponent initialized');
    } catch (error) {
      console.error('Error initializing Settings Component:', error);
      NotificationSystem.showError('Failed to initialize settings. Please refresh the page.');
    }
  },

  /**
   * Show settings modal
   * Opens modal, sets focus, and activates focus trap
   */
  show() {
    if (!this.modalElement) {
      console.error('SettingsComponent: cannot show modal, element not found');
      return;
    }

    // Store the element that had focus before opening modal
    this.lastFocusedElement = document.activeElement;

    // Load current preferences into form
    this.loadPreferences();

    // Show modal by setting aria-hidden to false
    this.modalElement.setAttribute('aria-hidden', 'false');

    // Get all focusable elements within modal for focus trap
    this.updateFocusableElements();

    // Focus first focusable element (typically the first input)
    if (this.focusableElements.length > 0) {
      this.focusableElements[0].focus();
    }

    // Set up focus trap
    this.modalElement.addEventListener('keydown', this.handleFocusTrap);
  },

  /**
   * Hide settings modal
   * Closes modal and returns focus to settings button
   */
  hide() {
    if (!this.modalElement) {
      console.error('SettingsComponent: cannot hide modal, element not found');
      return;
    }

    // Hide modal by setting aria-hidden to true
    this.modalElement.setAttribute('aria-hidden', 'true');

    // Remove focus trap listener
    this.modalElement.removeEventListener('keydown', this.handleFocusTrap);

    // Return focus to the element that opened the modal
    if (this.lastFocusedElement) {
      this.lastFocusedElement.focus();
    }
  },

  /**
   * Update list of focusable elements within modal
   * Used for focus trap implementation
   */
  updateFocusableElements() {
    if (!this.modalElement) {
      return;
    }

    // Query all focusable elements within modal
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'textarea:not([disabled])',
      'select:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    this.focusableElements = Array.from(
      this.modalElement.querySelectorAll(focusableSelectors)
    );
  },

  /**
   * Handle focus trap for modal accessibility
   * Keeps Tab and Shift+Tab navigation within modal
   * @param {KeyboardEvent} e - Keyboard event
   */
  handleFocusTrap(e) {
    // Only trap Tab key
    if (e.key !== 'Tab') {
      return;
    }

    // Get reference to SettingsComponent (since 'this' is the modal element in event listener)
    const component = SettingsComponent;

    if (component.focusableElements.length === 0) {
      return;
    }

    const firstElement = component.focusableElements[0];
    const lastElement = component.focusableElements[component.focusableElements.length - 1];

    // If Shift+Tab on first element, move to last element
    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    }
    // If Tab on last element, move to first element
    else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  },

  /**
   * Load current preferences into form fields
   */
  loadPreferences() {
    const prefs = StorageManager.getPreferences();

    // Load custom name
    const nameInput = document.getElementById('user-name');
    if (nameInput) {
      nameInput.value = prefs.customName || '';
    }

    // Load pomodoro duration
    const durationInput = document.getElementById('pomodoro-duration');
    if (durationInput) {
      durationInput.value = prefs.pomodoroMinutes || 25;
    }
  },

  /**
   * Save custom name
   * Validates name and updates preferences
   * @param {string} name - Custom name to save
   * @returns {Object} Result object with success flag and optional error message
   */
  saveName(name) {
    const trimmedName = name.trim();

    // Validate custom name (1-50 characters when provided, or empty to clear)
    if (trimmedName.length > 0 && trimmedName.length < 1) {
      return {
        success: false,
        error: 'Name must be at least 1 character'
      };
    } else if (trimmedName.length > 50) {
      return {
        success: false,
        error: 'Name must be 50 characters or less'
      };
    }

    // Save to preferences
    const customName = trimmedName.length > 0 ? trimmedName : null;
    StorageManager.savePreferences({ customName });

    // Update greeting component with new name
    GreetingComponent.updateName(customName);

    return {
      success: true
    };
  },

  /**
   * Save pomodoro duration
   * Validates duration (1-120 minutes, positive integer) and updates preferences
   * @param {number} minutes - Duration in minutes
   * @returns {Object} Result object with success flag and optional error message
   */
  saveDuration(minutes) {
    const pomodoroMinutes = parseInt(minutes, 10);

    // Validate pomodoro duration (1-120 minutes, positive integer)
    if (isNaN(pomodoroMinutes)) {
      return {
        success: false,
        error: 'Timer duration must be a valid number'
      };
    }

    if (!Number.isInteger(pomodoroMinutes)) {
      return {
        success: false,
        error: 'Timer duration must be a positive integer'
      };
    }

    if (pomodoroMinutes < 1 || pomodoroMinutes > 120) {
      return {
        success: false,
        error: 'Timer duration must be between 1 and 120 minutes'
      };
    }

    // Save to preferences
    StorageManager.savePreferences({ pomodoroMinutes });

    // Update timer component with new duration immediately
    TimerComponent.setDuration(pomodoroMinutes);

    return {
      success: true
    };
  },

  /**
   * Save settings from form
   * Validates inputs and updates preferences
   */
  saveSettings() {
    const nameInput = document.getElementById('user-name');
    const durationInput = document.getElementById('pomodoro-duration');
    const nameError = document.getElementById('name-error');
    const durationError = document.getElementById('duration-error');

    if (!nameInput || !durationInput) {
      console.error('SettingsComponent: form inputs not found');
      return;
    }

    // Clear previous error messages
    if (nameError) nameError.textContent = '';
    if (durationError) durationError.textContent = '';

    let hasError = false;

    // Save custom name
    const nameResult = this.saveName(nameInput.value);
    if (!nameResult.success) {
      if (nameError) {
        nameError.textContent = nameResult.error;
      }
      hasError = true;
    }

    // Save pomodoro duration
    const durationResult = this.saveDuration(durationInput.value);
    if (!durationResult.success) {
      if (durationError) {
        durationError.textContent = durationResult.error;
      }
      hasError = true;
    }

    // Don't close modal if there are validation errors
    if (hasError) {
      return;
    }

    // Show success notification
    NotificationSystem.showSuccess('Settings saved successfully');

    // Close modal on success
    this.hide();
  },

  /**
   * Clear custom name
   * Removes name from preferences and updates greeting
   */
  clearName() {
    const nameInput = document.getElementById('user-name');
    if (nameInput) {
      nameInput.value = '';
    }

    // Save empty name to preferences
    StorageManager.savePreferences({ customName: null });

    // Update greeting component
    GreetingComponent.updateName(null);
  },

  /**
   * Reset pomodoro duration to default (25 minutes)
   */
  resetDuration() {
    const durationInput = document.getElementById('pomodoro-duration');
    if (durationInput) {
      durationInput.value = '25';
    }

    // Save default duration to preferences
    StorageManager.savePreferences({ pomodoroMinutes: 25 });

    // Update timer component
    TimerComponent.setDuration(25);
  }
};

// ============================================================================
// VISUAL FEEDBACK UTILITIES
// ============================================================================

/**
 * Visual Feedback Utilities - Provides instant visual feedback for user actions
 * Ensures feedback within 50ms as per performance requirements
 */
const VisualFeedback = {
  /**
   * Add active state to button
   * Provides immediate visual feedback on button click
   * @param {HTMLElement} button - Button element
   */
  addButtonFeedback(button) {
    if (!button) return;

    // Add active class for visual feedback
    button.classList.add('btn-active');
    
    // Remove active class after animation
    setTimeout(() => {
      button.classList.remove('btn-active');
    }, 150);
  },

  /**
   * Add ripple effect to element
   * Creates a ripple animation at click position
   * @param {HTMLElement} element - Element to add ripple to
   * @param {MouseEvent} event - Click event
   */
  addRipple(element, event) {
    if (!element) return;

    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    
    // Calculate ripple position
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    
    element.appendChild(ripple);
    
    // Remove ripple after animation
    setTimeout(() => {
      ripple.remove();
    }, 600);
  },

  /**
   * Flash element to indicate change
   * @param {HTMLElement} element - Element to flash
   */
  flashElement(element) {
    if (!element) return;

    element.classList.add('flash-animation');
    
    setTimeout(() => {
      element.classList.remove('flash-animation');
    }, 300);
  },

  /**
   * Add loading state to button
   * @param {HTMLElement} button - Button element
   * @param {boolean} isLoading - Loading state
   */
  setButtonLoading(button, isLoading) {
    if (!button) return;

    if (isLoading) {
      button.classList.add('btn-loading');
      button.disabled = true;
      
      // Store original text
      if (!button.dataset.originalText) {
        button.dataset.originalText = button.textContent;
      }
      
      // Add loading indicator
      button.innerHTML = '<span class="loading-spinner"></span> ' + button.dataset.originalText;
    } else {
      button.classList.remove('btn-loading');
      button.disabled = false;
      
      // Restore original text
      if (button.dataset.originalText) {
        button.textContent = button.dataset.originalText;
      }
    }
  }
};

// ============================================================================
// APPLICATION INITIALIZATION
// ============================================================================

/**
 * Initialize the application
 * Bootstraps all components and loads data from Local Storage
 * 
 * Initialization Order:
 * 1. Load theme preference and apply it
 * 2. Load user preferences (name, timer duration)
 * 3. Initialize Theme Manager
 * 4. Initialize Greeting Component
 * 5. Initialize Timer Component
 * 6. Initialize Todo List Component
 * 7. Initialize Quick Links Component
 * 8. Initialize Settings Component
 * 9. Perform initial render of all components
 */
function init() {
  console.log('Initializing Life Dashboard...');

  // Check if Local Storage is available
  if (!StorageManager.isStorageAvailable()) {
    console.error('Local Storage is not available. The application may not function correctly.');
    // Continue initialization anyway - components will handle missing storage gracefully
  }

  // Step 0: Initialize Notification System
  console.log('Initializing Notification System...');
  NotificationSystem.init();

  // Step 1: Load theme preference and apply it
  // ThemeManager.init() will load from storage and apply the theme
  console.log('Loading theme preference...');
  ThemeManager.init();

  // Step 2: Load user preferences (name, timer duration)
  // This ensures preferences are loaded before components that depend on them
  console.log('Loading user preferences...');
  const preferences = StorageManager.getPreferences();
  console.log('Preferences loaded:', {
    theme: preferences.theme,
    customName: preferences.customName || '(not set)',
    pomodoroMinutes: preferences.pomodoroMinutes
  });

  // Step 3: Initialize Greeting Component
  // Displays time, date, and personalized greeting
  console.log('Initializing Greeting Component...');
  GreetingComponent.init();

  // Step 4: Initialize Timer Component
  // Loads timer duration from preferences
  console.log('Initializing Timer Component...');
  TimerComponent.init();

  // Step 5: Initialize Todo List Component
  // Loads tasks from Local Storage and renders them
  console.log('Initializing Todo List Component...');
  TodoListComponent.init();

  // Step 6: Initialize Quick Links Component
  // Loads quick links from Local Storage and renders them
  console.log('Initializing Quick Links Component...');
  QuickLinksComponent.init();

  // Step 7: Initialize Settings Component
  // Sets up settings modal and event listeners
  console.log('Initializing Settings Component...');
  SettingsComponent.init();

  // Step 8: Add global button feedback listeners
  console.log('Setting up visual feedback...');
  document.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (button && !button.disabled) {
      VisualFeedback.addButtonFeedback(button);
    }
  });

  // Step 9: All components initialized - application ready
  console.log('Life Dashboard initialized successfully!');
  console.log('---');
  console.log('Application State:');
  console.log('- Theme:', ThemeManager.getCurrentTheme());
  console.log('- Tasks loaded:', TodoListComponent.tasks.length);
  console.log('- Quick links loaded:', QuickLinksComponent.links.length);
  console.log('- Custom name:', preferences.customName || '(not set)');
  console.log('- Timer duration:', preferences.pomodoroMinutes, 'minutes');
}

// Add DOMContentLoaded event listener to trigger initialization
document.addEventListener('DOMContentLoaded', init);

/**
 * Data Models (for reference):
 * 
 * Task = {
 *   id: string,           // Unique identifier (timestamp + random)
 *   text: string,         // Task description (1-500 chars)
 *   completed: boolean,   // Completion status
 *   createdAt: number     // Timestamp
 * }
 * 
 * QuickLink = {
 *   id: string,      // Unique identifier
 *   name: string,    // Display name
 *   url: string      // Website URL
 * }
 * 
 * UserPreferences = {
 *   theme: 'light' | 'dark',     // Theme preference
 *   customName: string | null,    // User's name (1-50 chars)
 *   pomodoroMinutes: number       // Timer duration (1-120 mins)
 * }
 */
