(() => {
  'use strict';

  const STORAGE_KEY = 'taskboard.tasks.v1';
  const THEME_KEY = 'taskboard.theme';
  const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

  /* ---------- Element references ---------- */
  const $ = (id) => document.getElementById(id);
  const els = {
    form: $('taskForm'),
    formTitle: $('formTitle'),
    title: $('title'),
    category: $('category'),
    priority: $('priority'),
    due: $('due'),
    titleError: $('titleError'),
    dueError: $('dueError'),
    submitBtn: $('submitBtn'),
    cancelBtn: $('cancelBtn'),
    list: $('taskList'),
    empty: $('emptyState'),
    emptyTitle: $('emptyTitle'),
    emptyText: $('emptyText'),
    footer: $('listFooter'),
    resultCount: $('resultCount'),
    clearDone: $('clearDone'),
    search: $('search'),
    filterCategory: $('filterCategory'),
    filterPriority: $('filterPriority'),
    sortBy: $('sortBy'),
    tabs: document.querySelectorAll('.tab'),
    statTotal: $('statTotal'),
    statPending: $('statPending'),
    statDone: $('statDone'),
    progress: $('progress'),
    progressFill: $('progressFill'),
    progressText: $('progressText'),
    themeToggle: $('themeToggle'),
    todayLabel: $('todayLabel'),
    toast: $('toast'),
  };

  /* ---------- State ---------- */
  let tasks = loadTasks();
  let editingId = null;
  const filters = { query: '', status: 'all', category: 'all', priority: 'all', sort: 'created' };

  /* ---------- Storage ---------- */
  function loadTasks() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
      showToast('Could not save. Browser storage may be full or blocked.');
    }
  }

  /* ---------- Date helpers ---------- */
  function todayISO() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }

  function parseISO(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function dayDiff(iso) {
    return Math.round((parseISO(iso) - parseISO(todayISO())) / 86400000);
  }

  function formatDue(iso) {
    const diff = dayDiff(iso);
    const short = parseISO(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    if (diff === 0) return 'Due today';
    if (diff === 1) return 'Due tomorrow';
    if (diff < 0) return `Overdue, ${short}`;
    return `Due ${short}`;
  }

  /* ---------- Theme ---------- */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    els.themeToggle.setAttribute(
      'aria-label',
      theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
    );
  }

  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(saved || (prefersDark ? 'dark' : 'light'));
  }

  els.themeToggle.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
  });

  /* ---------- Toast ---------- */
  let toastTimer;
  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2200);
  }

  /* ---------- Validation ---------- */
  function setError(input, errorEl, message) {
    errorEl.textContent = message;
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }

  function validate() {
    const title = els.title.value.trim();
    const due = els.due.value;
    let valid = true;

    if (!title) {
      setError(els.title, els.titleError, 'Enter a task title.');
      valid = false;
    } else if (title.length < 3) {
      setError(els.title, els.titleError, 'Use at least 3 characters.');
      valid = false;
    } else {
      setError(els.title, els.titleError, '');
    }

    // Allow an unchanged past date while editing an existing task
    const original = editingId ? tasks.find((t) => t.id === editingId) : null;
    const unchanged = original && original.due === due;
    if (due && !unchanged && dayDiff(due) < 0) {
      setError(els.due, els.dueError, 'Choose today or a later date.');
      valid = false;
    } else {
      setError(els.due, els.dueError, '');
    }

    return valid;
  }

  /* ---------- Create / update / delete ---------- */
  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) {
      (els.titleError.textContent ? els.title : els.due).focus();
      return;
    }

    const data = {
      title: els.title.value.trim(),
      category: els.category.value,
      priority: els.priority.value,
      due: els.due.value || '',
    };

    if (editingId) {
      const task = tasks.find((t) => t.id === editingId);
      if (task) Object.assign(task, data);
      showToast('Task updated');
      exitEditMode();
    } else {
      tasks.unshift({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        ...data,
        completed: false,
        createdAt: Date.now(),
      });
      resetForm();
      showToast('Task added');
    }

    saveTasks();
    render();
  }

  function toggleTask(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    task.completed = !task.completed;
    saveTasks();
    render();
  }

  function deleteTask(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    tasks = tasks.filter((t) => t.id !== id);
    if (editingId === id) exitEditMode();
    saveTasks();
    render();
    showToast('Task deleted');
  }

  function clearCompleted() {
    const count = tasks.filter((t) => t.completed).length;
    if (!count) return;
    if (!window.confirm(`Delete ${count} completed task${count === 1 ? '' : 's'}?`)) return;
    tasks = tasks.filter((t) => !t.completed);
    if (editingId && !tasks.some((t) => t.id === editingId)) exitEditMode();
    saveTasks();
    render();
    showToast('Completed tasks cleared');
  }

  /* ---------- Edit mode ---------- */
  function enterEditMode(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    editingId = id;
    els.title.value = task.title;
    els.category.value = task.category;
    els.priority.value = task.priority;
    els.due.value = task.due;
    els.formTitle.textContent = 'Edit task';
    els.submitBtn.textContent = 'Save changes';
    els.cancelBtn.hidden = false;
    setError(els.title, els.titleError, '');
    setError(els.due, els.dueError, '');
    render();
    els.form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    els.title.focus();
  }

  function exitEditMode() {
    editingId = null;
    resetForm();
    els.formTitle.textContent = 'New task';
    els.submitBtn.textContent = 'Add task';
    els.cancelBtn.hidden = true;
    render();
  }

  function resetForm() {
    els.form.reset();
    els.priority.value = 'medium';
    setError(els.title, els.titleError, '');
    setError(els.due, els.dueError, '');
  }

  /* ---------- Filtering + sorting ---------- */
  function getVisibleTasks() {
    const q = filters.query.trim().toLowerCase();

    const result = tasks.filter((t) => {
      if (filters.status === 'pending' && t.completed) return false;
      if (filters.status === 'completed' && !t.completed) return false;
      if (filters.category !== 'all' && t.category !== filters.category) return false;
      if (filters.priority !== 'all' && t.priority !== filters.priority) return false;
      if (q && !(t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))) return false;
      return true;
    });

    result.sort((a, b) => {
      switch (filters.sort) {
        case 'due':
          if (!a.due && !b.due) return b.createdAt - a.createdAt;
          if (!a.due) return 1;
          if (!b.due) return -1;
          return a.due.localeCompare(b.due);
        case 'priority':
          return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || b.createdAt - a.createdAt;
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return b.createdAt - a.createdAt;
      }
    });

    return result;
  }

  /* ---------- Rendering ---------- */
  function svgIcon(path) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '18');
    svg.setAttribute('height', '18');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = path;
    return svg;
  }

  function chip(text, cls) {
    const span = document.createElement('span');
    span.className = 'chip ' + (cls || '');
    span.textContent = text;
    return span;
  }

  function actionButton(label, cls, iconPath, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'act ' + cls;
    btn.setAttribute('aria-label', label);
    btn.title = label;
    btn.appendChild(svgIcon(iconPath));
    btn.addEventListener('click', onClick);
    return btn;
  }

  function buildTask(task) {
    const li = document.createElement('li');
    li.className = `task p-${task.priority}` +
      (task.completed ? ' completed' : '') +
      (task.id === editingId ? ' editing' : '');

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'check';
    check.checked = task.completed;
    check.setAttribute('aria-label', `Mark "${task.title}" as ${task.completed ? 'pending' : 'completed'}`);
    check.addEventListener('change', () => toggleTask(task.id));

    const body = document.createElement('div');
    body.className = 'task-body';

    const title = document.createElement('p');
    title.className = 'task-title';
    title.textContent = task.title;

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.appendChild(chip(task.category, 'cat'));
    meta.appendChild(chip(task.priority[0].toUpperCase() + task.priority.slice(1), task.priority));
    if (task.due) {
      const overdue = !task.completed && dayDiff(task.due) < 0;
      meta.appendChild(chip(formatDue(task.due), overdue ? 'overdue' : ''));
    }

    body.append(title, meta);

    const actions = document.createElement('div');
    actions.className = 'actions';
    actions.append(
      actionButton('Edit task', 'edit',
        '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
        () => enterEditMode(task.id)),
      actionButton('Delete task', 'del',
        '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>',
        () => deleteTask(task.id))
    );

    li.append(check, body, actions);
    return li;
  }

  function renderStats() {
    const total = tasks.length;
    const done = tasks.filter((t) => t.completed).length;
    const pct = total ? Math.round((done / total) * 100) : 0;

    els.statTotal.textContent = total;
    els.statDone.textContent = done;
    els.statPending.textContent = total - done;
    els.progressFill.style.width = pct + '%';
    els.progress.setAttribute('aria-valuenow', pct);
    els.progressText.textContent = total
      ? `${pct}% complete` + (total === done ? '. Everything is done.' : '')
      : 'No tasks yet';
  }

  function render() {
    renderStats();

    const visible = getVisibleTasks();
    els.list.replaceChildren(...visible.map(buildTask));

    const hasFilters =
      filters.query || filters.status !== 'all' || filters.category !== 'all' || filters.priority !== 'all';

    els.empty.hidden = visible.length > 0;
    if (!visible.length) {
      if (!tasks.length) {
        els.emptyTitle.textContent = 'Nothing on your list';
        els.emptyText.textContent = 'Add your first task using the form.';
      } else if (hasFilters) {
        els.emptyTitle.textContent = 'No tasks match';
        els.emptyText.textContent = 'Change the search or filters to see more.';
      }
    }

    els.footer.hidden = tasks.length === 0;
    els.resultCount.textContent = `Showing ${visible.length} of ${tasks.length}`;
    els.clearDone.hidden = !tasks.some((t) => t.completed);
  }

  /* ---------- Events ---------- */
  els.form.addEventListener('submit', handleSubmit);
  els.cancelBtn.addEventListener('click', exitEditMode);
  els.clearDone.addEventListener('click', clearCompleted);

  els.title.addEventListener('input', () => { if (els.titleError.textContent) validate(); });
  els.due.addEventListener('change', () => { if (els.dueError.textContent) validate(); });

  els.search.addEventListener('input', (e) => { filters.query = e.target.value; render(); });
  els.filterCategory.addEventListener('change', (e) => { filters.category = e.target.value; render(); });
  els.filterPriority.addEventListener('change', (e) => { filters.priority = e.target.value; render(); });
  els.sortBy.addEventListener('change', (e) => { filters.sort = e.target.value; render(); });

  els.tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      filters.status = tab.dataset.status;
      els.tabs.forEach((t) => {
        const active = t === tab;
        t.classList.toggle('active', active);
        t.setAttribute('aria-pressed', active);
      });
      render();
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && editingId) exitEditMode();
  });

  /* ---------- Init ---------- */
  initTheme();
  els.due.min = todayISO();
  els.todayLabel.textContent = new Date().toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  render();
})();
