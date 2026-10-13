// ===== Song data: add your own songs here =====
const songs = [
  { id: 1, title: "Casa Tupka ", artist: "Yo-Yo Honey Singh", album: "Slow Hours", duration: "03:05", audio: "assets/audio/song1.wav", artwork: "assets/images/song1.svg", color: "#4da3ff" },
  { id: 2, title: "Maine Chhode Hain Baqi-Tere Sang Yaara", artist: "Atif Aslam & Rustom", album: "Slow Hours", duration: "00:14", audio: "assets/audio/song2.wav", artwork: "assets/images/song2.svg", color: "#2ed3b7" },
  { id: 3, title: "Main Raaj tujhse kahu ", artist: "Arijit Singh", album: "After Midnight", duration: "00:17", audio: "assets/audio/song3.wav", artwork: "assets/images/song3.svg", color: "#d56bff" },
  { id: 4, title: "Tera ban jaunga-Meri raahein..", artist: "Tulsi Kumar", album: "After Midnight", duration: "00:19", audio: "assets/audio/song4.wav", artwork: "assets/images/song4.svg", color: "#ff6b8b" },
  { id: 5, title: "Quiet Orbit", artist: "Sven Alder", album: "Glass Rooms", duration: "00:20", audio: "assets/audio/song5.wav", artwork: "assets/images/song5.svg", color: "#8f7bff" }
];

const $ = id => document.getElementById(id);
const audio = $("audio");
const DEFAULTS = { favorites: [], recent: [], shuffle: false, repeat: 0, autoplay: true, volume: 0.8 }; // repeat: 0 off, 1 all, 2 one
let settings = loadSettings(), queue = [], qPos = 0, current = null;
let activeTab = "playlist", query = "", lastVolume = 0.8, seeking = false, alertTimer;


// ----- Fallback: if a demo audio file is missing, generate the same tune in the browser -----
const DEMO = { 1: [57, [0,3,7,10,12,7,5,3], 84], 2: [52, [0,2,7,9,12,9,7,2], 72], 3: [60, [0,7,12,10,7,3,0,3], 118], 4: [55, [0,4,7,12,16,12,7,4], 128], 5: [62, [0,5,7,12,7,5,3,0], 96] };
function synthWav(id) {
  const [root, sc, bpm] = DEMO[id], sr = 16000, dur = 20, n = sr * dur, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); w(8, "WAVEfmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, n * 2, true);
  const step = 60 / bpm / 2, P = 6.2832;
  for (let i = 0; i < n; i++) {
    const s = i / sr, k = Math.floor(s / step), ph = s - k * step;
    const f = 440 * 2 ** ((root + sc[k % 8] - 69) / 12), bf = 440 * 2 ** ((root - 24 + (Math.floor(k / 8) % 2 ? 5 : 0) - 69) / 12);
    const x = (Math.sin(P * f * s) + .3 * Math.sin(2 * P * f * s)) * Math.exp(-ph * 5) * Math.min(1, ph * 200) * .35 + Math.sin(P * bf * s) * .25 * Math.exp(-(s % (step * 4)) * 1.5);
    v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, x * Math.min(1, s * 4, (dur - s) * 4))) * 32767, true);
  }
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}
let wantPlay = false;

// ----- Settings (Local Storage) -----
function loadSettings() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem("melodySettings")) }; } catch { return { ...DEFAULTS }; }
}
function saveSettings() { try { localStorage.setItem("melodySettings", JSON.stringify(settings)); } catch {} }

// ----- Helpers -----
const getSong = id => songs.find(s => s.id === id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function formatTime(sec) { // seconds -> MM:SS or HH:MM:SS, never NaN
  if (!isFinite(sec) || sec < 0) return "00:00";
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60, p = n => String(n).padStart(2, "0");
  return h ? `${p(h)}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}
function showError(msg) {
  const a = $("alert"); a.textContent = msg; a.classList.remove("d-none");
  clearTimeout(alertTimer); alertTimer = setTimeout(() => a.classList.add("d-none"), 5000);
}
const setFill = (el, pct) => el.style.setProperty("--pct", pct + "%");

// ----- Queue -----
function buildQueue() {
  const ids = songs.map(s => s.id);
  if (settings.shuffle) { // current song first, the rest randomized (Fisher-Yates)
    const rest = ids.filter(id => !current || id !== current.id);
    for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
    queue = current ? [current.id, ...rest] : rest; qPos = 0;
  } else { queue = ids; qPos = current ? Math.max(0, ids.indexOf(current.id)) : 0; }
}

// ----- Playback -----
function loadSong(id, play = false) {
  const s = getSong(id);
  if (!s) return showError("Song not found.");
  current = s; wantPlay = play;
  qPos = queue.indexOf(id); if (qPos < 0) buildQueue();
  audio.src = s.audio;
  $("art").src = s.artwork; $("art").alt = `Album artwork for ${s.album}`;
  $("title").textContent = s.title; $("artist").textContent = s.artist; $("album").textContent = s.album;
  $("duration").textContent = s.duration; $("current").textContent = "00:00"; $("seek").value = 0; setFill($("seek"), 0);
  document.documentElement.style.setProperty("--accent", s.color);
  document.body.style.setProperty("--art", `url(${s.artwork})`);
  document.title = `${s.title} · MelodyPlayer`;
  if (play) playSong();
  updateControls(); renderList();
}
function playSong() {
  wantPlay = true;
  if (!current) return showError("Your playlist is empty.");
  const p = audio.play(); if (p) p.catch(() => showError("Unable to play this song. Please check the audio file."));
}
function pauseSong() { wantPlay = false; audio.pause(); }
function nextSong(auto = false) {
  if (!queue.length) return;
  let pos = qPos + 1;
  if (pos >= queue.length) {
    if (settings.repeat === 1 || !auto) pos = 0; // wrap around
    else { pauseSong(); audio.currentTime = 0; return; } // end of queue
  }
  loadSong(queue[pos], true);
}
function previousSong() {
  if (!queue.length) return;
  if (audio.currentTime > 3) { audio.currentTime = 0; return; } // restart current song
  loadSong(queue[(qPos - 1 + queue.length) % queue.length], true);
}
function updateProgress() {
  if (seeking || !isFinite(audio.duration) || !audio.duration) return;
  const pct = audio.currentTime / audio.duration * 100;
  $("seek").value = pct * 10; setFill($("seek"), pct);
  $("current").textContent = formatTime(audio.currentTime);
}
function setProgress(value) { // value 0-1000 from the slider
  if (!isFinite(audio.duration)) return;
  audio.currentTime = value / 1000 * audio.duration;
  $("current").textContent = formatTime(audio.currentTime); setFill($("seek"), value / 10);
}

// ----- Volume -----
function setVolume(v) {
  v = Math.min(1, Math.max(0, v));
  audio.volume = v; audio.muted = false;
  if (v > 0) lastVolume = v;
  settings.volume = v; saveSettings();
  $("volume").value = v; setFill($("volume"), v * 100); updateControls();
}
function toggleMute() {
  if (audio.muted || audio.volume === 0) { audio.muted = false; if (audio.volume === 0) audio.volume = lastVolume; }
  else audio.muted = true;
  const v = audio.muted ? 0 : audio.volume;
  $("volume").value = v; setFill($("volume"), v * 100); updateControls();
}

// ----- Modes -----
function toggleShuffle() { settings.shuffle = !settings.shuffle; saveSettings(); buildQueue(); updateControls(); renderList(); }
function toggleRepeat() { settings.repeat = (settings.repeat + 1) % 3; saveSettings(); updateControls(); }
function toggleAutoplay() { settings.autoplay = !settings.autoplay; saveSettings(); updateControls(); }
function toggleFavorite(id) {
  const i = settings.favorites.indexOf(id);
  i >= 0 ? settings.favorites.splice(i, 1) : settings.favorites.push(id);
  saveSettings(); updateControls(); renderList();
}
function addRecent(id) { // newest first, no duplicates, max 10
  settings.recent = [id, ...settings.recent.filter(x => x !== id)].slice(0, 10);
  saveSettings(); if (activeTab === "recent") renderList();
}

// ----- UI -----
function updateControls() {
  const playing = !audio.paused;
  $("play").innerHTML = `<i class="bi bi-${playing ? "pause" : "play"}-fill"></i>`;
  $("play").setAttribute("aria-label", playing ? "Pause song" : "Play song");
  $("art").classList.toggle("playing", playing);
  $("shuffle").classList.toggle("on", settings.shuffle);
  const rep = ["Repeat off", "Repeat all", "Repeat one"][settings.repeat];
  $("repeat").classList.toggle("on", settings.repeat > 0); $("repeat").setAttribute("aria-label", rep); $("repeat").title = rep;
  $("repeat").innerHTML = `<i class="bi bi-repeat${settings.repeat === 2 ? "-1" : ""}"></i>`;
  $("autoplay").classList.toggle("on", settings.autoplay); $("autoplay").textContent = "Autoplay " + (settings.autoplay ? "on" : "off");
  $("autoplay").setAttribute("aria-pressed", settings.autoplay);
  const fav = current && settings.favorites.includes(current.id);
  $("fav").classList.toggle("on", !!fav); $("fav").innerHTML = `<i class="bi bi-heart${fav ? "-fill" : ""}"></i>`;
  const muted = audio.muted || audio.volume === 0;
  $("mute").innerHTML = `<i class="bi bi-volume-${muted ? "mute" : audio.volume < 0.5 ? "down" : "up"}-fill"></i>`;
  $("mute").setAttribute("aria-label", muted ? "Unmute" : "Mute");
  $("volPct").textContent = Math.round((audio.muted ? 0 : audio.volume) * 100) + "%";
}
function trackHTML(s) {
  const fav = settings.favorites.includes(s.id);
  return `<li class="track ${current && s.id === current.id ? "active" : ""}" data-id="${s.id}" tabindex="0" role="button" aria-label="Play ${esc(s.title)} by ${esc(s.artist)}">
    <img src="${s.artwork}" alt=""><div class="info"><strong>${esc(s.title)}</strong><small>${esc(s.artist)}</small></div>
    <span class="dur">${s.duration}</span>
    <button class="fav ${fav ? "on" : ""}" data-fav="${s.id}" aria-label="${fav ? "Remove" : "Add"} ${esc(s.title)} ${fav ? "from" : "to"} favorites"><i class="bi bi-heart${fav ? "-fill" : ""}"></i></button></li>`;
}
function renderTracks(list, emptyMsg) {
  $("list").innerHTML = list.length ? list.map(trackHTML).join("") : `<li class="empty">${emptyMsg}</li>`;
}
function searchSongs() {
  const q = query.trim().toLowerCase();
  return songs.filter(s => [s.title, s.artist, s.album].some(f => f.toLowerCase().includes(q)));
}
function renderPlaylist() { renderTracks(query ? searchSongs() : songs, songs.length ? "No songs found." : "Your playlist is empty."); }
function renderQueue() { renderTracks(queue.slice(qPos).map(getSong), "Your queue is empty."); }
function renderFavorites() { renderTracks(settings.favorites.map(getSong).filter(Boolean), "You haven't added any favorite songs yet."); }
function renderRecentlyPlayed() { renderTracks(settings.recent.map(getSong).filter(Boolean), "No recently played songs."); }
function renderList() { ({ playlist: renderPlaylist, queue: renderQueue, favorites: renderFavorites, recent: renderRecentlyPlayed })[activeTab](); }
function setTab(tab) {
  activeTab = tab;
  document.querySelectorAll("#tabs button").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  renderList();
}

// ----- Events -----
$("play").onclick = () => (audio.paused ? playSong() : pauseSong());
$("next").onclick = () => nextSong(false); $("prev").onclick = previousSong;
$("shuffle").onclick = toggleShuffle; $("repeat").onclick = toggleRepeat; $("autoplay").onclick = toggleAutoplay;
$("fav").onclick = () => current && toggleFavorite(current.id);
const stepVolume = d => setVolume(Math.round(((audio.muted ? 0 : audio.volume) + d) * 100) / 100); // +/- 10%
$("volDown").onclick = () => stepVolume(-0.1); $("volUp").onclick = () => stepVolume(0.1);
$("mute").onclick = toggleMute; $("volume").oninput = e => setVolume(+e.target.value);
$("seek").addEventListener("input", e => { seeking = true; setProgress(+e.target.value); });
$("seek").addEventListener("change", () => (seeking = false));
$("tabs").onclick = e => { const b = e.target.closest("[data-tab]"); if (b) setTab(b.dataset.tab); };
$("hdrFav").onclick = () => setTab("favorites"); $("hdrList").onclick = () => setTab("playlist");
$("search").oninput = e => { query = e.target.value; setTab("playlist"); };
$("list").addEventListener("click", e => {
  const f = e.target.closest("[data-fav]"); if (f) return toggleFavorite(+f.dataset.fav);
  const t = e.target.closest(".track"); if (!t) return;
  const id = +t.dataset.id;
  current && current.id === id ? (audio.paused ? playSong() : pauseSong()) : loadSong(id, true);
});
$("list").addEventListener("keydown", e => { if (e.key === "Enter" && e.target.classList.contains("track")) e.target.click(); });

audio.addEventListener("timeupdate", updateProgress);
audio.addEventListener("loadedmetadata", () => { if (isFinite(audio.duration)) $("duration").textContent = formatTime(audio.duration); });
audio.addEventListener("play", updateControls); audio.addEventListener("pause", updateControls);
audio.addEventListener("playing", () => current && addRecent(current.id));
audio.addEventListener("error", () => {
  if (current && DEMO[current.id] && !current.fallback) { // demo file missing: use the in-browser version
    current.fallback = true; audio.src = synthWav(current.id); if (wantPlay) playSong(); return;
  }
  showError("Unable to play this song. Please check the audio file.");
});
audio.addEventListener("ended", () => { // repeat one / autoplay logic
  if (settings.repeat === 2) { audio.currentTime = 0; playSong(); }
  else if (settings.autoplay) nextSong(true);
  else updateControls();
});

document.addEventListener("keydown", e => {
  const tag = e.target.tagName;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(tag) || (e.code === "Space" && tag === "BUTTON")) return;
  const keys = {
    Space: () => (audio.paused ? playSong() : pauseSong()),
    ArrowRight: () => (audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5)),
    ArrowLeft: () => (audio.currentTime = Math.max(0, audio.currentTime - 5)),
    ArrowUp: () => setVolume(audio.volume + 0.05), ArrowDown: () => setVolume(audio.volume - 0.05), KeyM: toggleMute
  };
  if (keys[e.code]) { e.preventDefault(); keys[e.code](); }
});

// ----- Init -----
function init() {
  audio.volume = settings.volume; lastVolume = settings.volume || 0.8;
  $("volume").value = settings.volume; setFill($("volume"), settings.volume * 100);
  if (!songs.length) { renderPlaylist(); return showError("Your playlist is empty."); }
  buildQueue(); loadSong(songs[0].id, false);
}
init();
