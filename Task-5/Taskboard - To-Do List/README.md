# Taskboard - To-Do List Application

A responsive task manager built with plain HTML, CSS and JavaScript. No frameworks, no build step, no server. All data is stored in the browser using Local Storage.

## Project structure

```
todo-app/
├── index.html   # Page structure and form
├── style.css    # Layout, themes (light/dark) and responsive styles
├── script.js    # App logic, validation, filtering and Local Storage
└── README.md
```

## How to run

1. Keep all three files (`index.html`, `style.css`, `script.js`) in the same folder.
2. Double-click `index.html` to open it in any modern browser (Chrome, Edge, Firefox, Safari).

No installation is needed. An internet connection is only used to load the Google Font; without it the app falls back to the system font.

## Features

### Core
- **Add tasks** with validation (title required, minimum 3 characters, maximum 100; due date cannot be in the past).
- **Edit tasks**: click the pencil icon, change the details, then choose "Save changes". Cancel or press `Esc` to leave edit mode.
- **Delete tasks** with a confirmation prompt. "Clear completed" removes all finished tasks at once.
- **Mark complete or pending** with the checkbox on each task.
- **Persistent data**: tasks are saved to Local Storage after every change and restored on reload.
- **Live counts**: total, pending and completed tasks, plus a progress bar.
- **Search and filters**: search by title or category; filter by status, category and priority; sort by newest, due date, priority or A to Z.

### Bonus
- **Categories**: Personal, Work, Study, Health, Shopping, Other.
- **Priority levels**: Low, Medium, High (shown as a coloured edge and label).
- **Due dates**: shows "Due today", "Due tomorrow" or "Overdue" (highlighted in red).
- **Dark mode**: toggle in the header. Defaults to your system setting and remembers your choice.

## Local Storage keys

| Key | Contents |
| --- | --- |
| `taskboard.tasks.v1` | JSON array of all tasks |
| `taskboard.theme` | `light` or `dark` |

Each task is stored like this:

```json
{
  "id": "lq3x9k2ab1c",
  "title": "Finish project report",
  "category": "Work",
  "priority": "high",
  "due": "2026-10-20",
  "completed": false,
  "createdAt": 1760270000000
}
```

To reset the app, clear the site's data in your browser, or run `localStorage.clear()` in the developer console.

## Customising

- **Add or rename categories**: edit the `<option>` lists in `index.html`. There are two lists: the form and the category filter.
- **Change colours**: edit the CSS variables at the top of `style.css`. The light theme is under `:root`, the dark theme under `:root[data-theme="dark"]`.
- **Change validation rules**: edit the `validate()` function in `script.js`.

## Accessibility

- Every control has a label and a visible keyboard focus outline.
- Form errors are announced to screen readers.
- Animations are turned off for users who prefer reduced motion.

## Browser support

Any modern browser with Local Storage support. Note that private or incognito windows may clear saved data when closed.
