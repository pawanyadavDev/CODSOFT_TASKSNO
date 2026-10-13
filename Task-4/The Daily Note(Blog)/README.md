# The Daily Note — Responsive Blog Website

A responsive blog website built with plain HTML, CSS, and JavaScript.

## Features
- Responsive homepage with featured story and article cards
- Category filters, searchable titles/excerpts/tags, and Load More
- Individual article detail modal with article content and tags
- Related article suggestions
- Dark mode with local preference saving
- Demo comment section saved in browser localStorage
- Share and copy-link controls
- Newsletter form validation (demo only; no email service connected)
- Responsive navigation menu, accessible labels, keyboard controls, and reduced-motion support

## Run locally
1. Extract the ZIP file.
2. Open `index.html` in a browser, or use VS Code with the Live Server extension.
3. Keep `index.html`, `styles.css`, and `script.js` in the same folder.

## Customize
- Edit the `articles` array near the top of `script.js` to add or change posts.
- Replace image URLs with your own images.
- Update the brand, footer, and about copy in `index.html`.
- To make newsletter signup and comments available to all users, connect a backend/API. This starter stores comments only in the current browser.

## Notes
- Google Fonts and Unsplash images use external URLs and require an internet connection.
- This is a frontend demo; newsletter subscriptions are not actually sent to a mailing list.
