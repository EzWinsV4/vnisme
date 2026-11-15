const $  = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const clamp = (n, min, max) => Math.max(min, Math.min(n, max));

const desktop  = $('#desktop');
const allWins  = $$('.win');
const startMenu = $('#start');
let topZ = 10;


allWins.forEach(win => {
  const btn = document.createElement('button');
  btn.className = 'btn task';
  btn.hidden = true;
  btn.dataset.win = win.id;
  btn.innerHTML = `<img class="ic" src="${win.dataset.icon}" alt="">${win.dataset.title.replace(' - Notepad', '')}`;

  btn.onclick = () => {
    const isActive = win.classList.contains('active') && !win.classList.contains('min');
    isActive ? minimizeWin(win) : openWin(win.id);
  };
  $('#tasks').append(btn);
});

const taskButton = win => $(`.task[data-win="${win.id}"]`);


function focusWin(win) {
  allWins.forEach(w => {
    w.classList.toggle('active', w === win);
    taskButton(w).classList.toggle('on', w === win);
  });
  if (win) win.style.zIndex = ++topZ;
}


function placeWin(win) {
  const maxX = Math.max(0, desktop.clientWidth  - win.offsetWidth);
  const maxY = Math.max(0, desktop.clientHeight - win.offsetHeight);
  win.style.left = (Number(win.dataset.fx) * maxX) + 'px';
  win.style.top  = (Number(win.dataset.fy) * maxY) + 'px';
}

function rememberPos(win) {
  const maxX = desktop.clientWidth  - win.offsetWidth;
  const maxY = desktop.clientHeight - win.offsetHeight;
  if (maxX > 0) win.dataset.fx = clamp(win.offsetLeft / maxX, 0, 1);
  if (maxY > 0) win.dataset.fy = clamp(win.offsetTop  / maxY, 0, 1);
}

function keepInside(win) {
  const maxX = Math.max(0, desktop.clientWidth  - win.offsetWidth);
  const maxY = Math.max(0, desktop.clientHeight - win.offsetHeight);
  win.style.left = clamp(win.offsetLeft, 0, maxX) + 'px';
  win.style.top  = clamp(win.offsetTop,  0, maxY) + 'px';
  rememberPos(win);
}


function openWin(id) {
  const win = document.getElementById(id);
  win.classList.add('open');
  win.classList.remove('min');
  taskButton(win).hidden = false;
  if (win.dataset.fx === undefined) {
    win.dataset.fx = 0;
    win.dataset.fy = 0;
    rememberPos(win);
  }
  placeWin(win);
  focusWin(win);
  startMenu.classList.remove('show');
}

function minimizeWin(win) {
  win.classList.add('min');
  focusWin(null);
}

function closeWin(win) {
  win.classList.remove('open', 'min');
  taskButton(win).hidden = true;
  focusWin(null);
}


function makeDraggable(win) {
  const bar = $('.topbar', win);

  bar.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;

    const grabX = e.clientX - win.offsetLeft;
    const grabY = e.clientY - win.offsetTop;
    bar.setPointerCapture(e.pointerId);

    const move = ev => {
      const maxX = desktop.clientWidth  - win.offsetWidth;
      const maxY = desktop.clientHeight - win.offsetHeight;
      win.style.left = clamp(ev.clientX - grabX, 0, maxX) + 'px';
      win.style.top  = clamp(ev.clientY - grabY, 0, maxY) + 'px';
    };
    const drop = () => {
      rememberPos(win);
      bar.removeEventListener('pointermove', move);
      bar.removeEventListener('pointerup', drop);
    };
    bar.addEventListener('pointermove', move);
    bar.addEventListener('pointerup', drop);
  });
}


allWins.forEach(win => {
  win.addEventListener('pointerdown', () => focusWin(win));

  $$('.topbar button', win).forEach(btn => {
    btn.onclick = () => btn.dataset.act === 'min' ? minimizeWin(win) : closeWin(win);
  });

  makeDraggable(win);

  new ResizeObserver(() => {
    if (win.classList.contains('open')) keepInside(win);
  }).observe(win);
});

window.addEventListener('resize', () => {
  allWins.filter(w => w.classList.contains('open')).forEach(placeWin);
});


const isTouch = matchMedia('(pointer: coarse)').matches;
const deselectAll = () => $$('.icon').forEach(i => i.classList.remove('sel'));

$$('.icon').forEach(icon => {
  icon.onclick = e => {
    e.stopPropagation();
    deselectAll();
    icon.classList.add('sel');
    if (isTouch) openWin(icon.dataset.open);
  };
  icon.ondblclick = () => openWin(icon.dataset.open);
  icon.onkeydown  = e => { if (e.key === 'Enter') openWin(icon.dataset.open); };
});
desktop.onclick = deselectAll;


$('#start-btn').onclick = e => {
  e.stopPropagation();
  startMenu.classList.toggle('show');
  $('#start-btn').classList.toggle('on');
};
document.addEventListener('click', () => {
  startMenu.classList.remove('show');
  $('#start-btn').classList.remove('on');
});
$$('#start [data-open]').forEach(b => b.onclick = () => openWin(b.dataset.open));


function updateClock() {
  $('#clock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
updateClock();
setInterval(updateClock, 10000);


const audio    = $('#audio');
const tracks   = $$('#playlist li');
const seekBar  = $('#seek');
const musicWin = $('#music');
const playBtn  = $('#play');
let current = 0;

function formatTime(sec) {
  if (!isFinite(sec)) return '00:00';
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(Math.floor(sec % 60)).padStart(2, '0');
  return `${m}:${s}`;
}

function loadTrack(index, autoplay) {
  if (!tracks.length) return;
  current = (index + tracks.length) % tracks.length;

  tracks.forEach((li, i) => li.classList.toggle('cur', i === current));
  audio.src = tracks[current].dataset.src;
  $('#now').textContent = tracks[current].textContent.trim();
  seekBar.value = 0;
  $('#time-now').textContent = $('#time-total').textContent = '00:00';

  if (autoplay) audio.play().catch(() => {});
}

tracks.forEach((li, i) => li.onclick = () => loadTrack(i, true));
playBtn.onclick = () => audio.paused ? audio.play().catch(() => {}) : audio.pause();
$('#prev').onclick = () => loadTrack(current - 1, true);
$('#next').onclick = () => loadTrack(current + 1, true);
$('#vol').oninput  = e => audio.volume = e.target.value;
seekBar.oninput    = () => { if (audio.duration) audio.currentTime = seekBar.value / 1000 * audio.duration; };

audio.volume = 0.8;
audio.onplay  = () => { musicWin.classList.add('playing');    playBtn.textContent = 'II'; playBtn.classList.add('on'); };
audio.onpause = () => { musicWin.classList.remove('playing'); playBtn.textContent = '>';  playBtn.classList.remove('on'); };
audio.onloadedmetadata = () => $('#time-total').textContent = formatTime(audio.duration);
audio.ontimeupdate = () => {
  if (audio.duration) seekBar.value = audio.currentTime / audio.duration * 1000;
  $('#time-now').textContent = formatTime(audio.currentTime);
};
audio.onended = () => loadTrack(current + 1, true);
audio.onerror = () => { if (audio.src) $('#now').textContent = 'no music'; };

loadTrack(0, false);


const startWindows = ['music', 'notepad', 'photos'];
startWindows.forEach(id => openWin(id));

const intro = $('#intro');
let entered = false;

function enterSite() {
  if (entered) return;
  entered = true;
  intro.classList.add('hide');
  audio.play().catch(() => {});
  setTimeout(() => intro.remove(), 600);
}
intro.addEventListener('click', enterSite);
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') enterSite();
})