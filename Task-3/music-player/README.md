# MelodyPlayer

A frontend-only music player (HTML, CSS, JavaScript, Bootstrap 5) with playlist, queue, search, favorites, recently played, shuffle, repeat, autoplay and keyboard shortcuts.

## Run
Keep the folder structure as is, then double-click `index.html` (internet is needed once for the Bootstrap CDN), or run `python -m http.server` in this folder and open http://localhost:8000.

## Add your own songs
1. Copy legally obtained audio files into `assets/audio/` and cover images into `assets/images/`.
2. Add an entry to the `songs` array at the top of `script.js` (`id`, `title`, `artist`, `album`, `duration`, `audio`, `artwork`, `color`).
The included demo tracks are synthesized `.wav` files, so no copyrighted music ships with the project. MP3, WAV, OGG and M4A all work.

## Shortcuts
Space play/pause, ←/→ seek 5s, ↑/↓ volume, M mute.

## How the Audio API works
One `<audio>` element does the work. `audio.play()` / `audio.pause()` control playback, `currentTime` and `duration` drive the progress bar and seeking, `volume` (0–1) and `muted` handle sound, and events (`timeupdate`, `ended`, `error`) keep the UI in sync.

## How Local Storage is used
Favorites, recently played, shuffle, repeat, autoplay and volume are saved as one JSON object under the key `melodySettings` and restored on load. It is stored per browser only.
