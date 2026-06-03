import { db, push, onValue, remove, set } from "./firebase.js";
import { ref } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

// ── Countdown ──
const config = window.BIRTHDAY_SITE || {};
const target = new Date(config.birthdayDate);
const el = {
  body: document.body,
  title: document.getElementById("main-title"),
  birthdayTitle: document.getElementById("birthday-title"),
  message: document.getElementById("main-message"),
  days: document.getElementById("days"),
  hours: document.getElementById("hours"),
  minutes: document.getElementById("minutes"),
  seconds: document.getElementById("seconds"),
};

function pad(n) { return String(n).padStart(2, "0"); }

function showBirthday() {
  el.body.classList.add("is-birthday");
  el.birthdayTitle.textContent = config.birthdayTitle || "生日快乐";
  el.message.textContent = config.birthdayMessage || "";
}

function showCountdown(ms) {
  const total = Math.floor(ms / 1000);
  el.days.textContent = Math.floor(total / 86400);
  el.hours.textContent = pad(Math.floor((total % 86400) / 3600));
  el.minutes.textContent = pad(Math.floor((total % 3600) / 60));
  el.seconds.textContent = pad(total % 60);
}

function tick() {
  const diff = target.getTime() - Date.now();
  if (Number.isNaN(target.getTime()) || diff <= 0) { showBirthday(); return; }
  showCountdown(diff);
  setTimeout(tick, 1000);
}
tick();

// ── Page 2 fade-in ──
const page2Content = document.querySelector(".page-2-content");
if (page2Content) {
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) page2Content.classList.add("visible");
  }, { threshold: 0.1 }).observe(page2Content);
}

// ── Helpers ──
function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatTs(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Chat ──
// 把旧的 todos/e 和 todos/jerry 以及新的 chat 消息合并，按时间排序展示
const chatEl = document.getElementById("chat-messages");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");

const allMsgs = {};  // id -> { text, createdAt, _path: string }

function renderChat() {
  if (!chatEl) return;
  const sorted = Object.values(allMsgs).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  chatEl.innerHTML = "";
  sorted.forEach(msg => {
    const div = document.createElement("div");
    div.className = "chat-msg";
    div.innerHTML = `
      <span class="chat-msg-text">${escapeHtml(msg.text)}</span>
      <span class="chat-msg-time">${formatTs(msg.createdAt)}</span>
      <button class="chat-delete" data-path="${msg._path}" aria-label="删除">×</button>
    `;
    chatEl.appendChild(div);
  });
}

// 读取旧的 todos（保留历史消息）
["e", "jerry"].forEach(owner => {
  onValue(ref(db, `todos/${owner}`), snapshot => {
    // 先清掉这个 owner 的旧数据再重新写入，避免已删除的消息残留
    Object.keys(allMsgs).forEach(k => { if (k.startsWith(`${owner}-`)) delete allMsgs[k]; });
    const data = snapshot.val() || {};
    Object.entries(data).forEach(([key, item]) => {
      allMsgs[`${owner}-${key}`] = { ...item, _path: `todos/${owner}/${key}` };
    });
    renderChat();
  });
});

// 读取新的 chat 消息
onValue(ref(db, "chat"), snapshot => {
  Object.keys(allMsgs).forEach(k => { if (k.startsWith("chat-")) delete allMsgs[k]; });
  const data = snapshot.val() || {};
  Object.entries(data).forEach(([key, item]) => {
    allMsgs[`chat-${key}`] = { ...item, _path: `chat/${key}` };
  });
  renderChat();
});

// 删除消息
if (chatEl) {
  chatEl.addEventListener("click", e => {
    const btn = e.target.closest(".chat-delete");
    if (!btn) return;
    remove(ref(db, btn.dataset.path));
  });
}

if (chatForm) {
  chatForm.addEventListener("submit", e => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    push(ref(db, "chat"), { text, createdAt: Date.now() });
    chatInput.value = "";
  });
}

// ── Photo wall ──
const photos = config.photos || [];
const wallEl = document.getElementById("photo-wall");
if (photos.length > 0) {
  wallEl.innerHTML = "";
  photos.forEach(src => {
    const div = document.createElement("div");
    div.className = "photo-item";
    const img = document.createElement("img");
    img.src = src;
    img.alt = "";
    img.loading = "lazy";
    div.appendChild(img);
    wallEl.appendChild(div);
  });
}

const pagePhotosContent = document.querySelector(".page-photos-content");
if (pagePhotosContent) {
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) pagePhotosContent.classList.add("visible");
  }, { threshold: 0.1 }).observe(pagePhotosContent);
}

// ── Lightbox ──
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");

function openLightbox(src) {
  lightboxImg.src = src;
  lightbox.classList.add("open");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  lightbox.classList.remove("open");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

document.getElementById("lightbox-close").addEventListener("click", closeLightbox);
document.querySelector(".lightbox-backdrop").addEventListener("click", closeLightbox);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLightbox(); });

document.getElementById("photo-wall").addEventListener("click", (e) => {
  const img = e.target.closest(".photo-item img");
  if (img) openLightbox(img.src);
});

// ── Gift unlock ──
(config.gifts || []).forEach((gift, i) => {
  const card = document.getElementById(`gift-${i}`);
  if (!card) return;

  const tasks = gift.tasks || [];

  // Gift with no tasks: simple date unlock
  if (!tasks.length) {
    const d = new Date(gift.unlockDate);
    const dateEl = document.getElementById(`gift-date-${i}`);
    if (dateEl) dateEl.textContent = gift.label || `${d.getMonth() + 1}月${d.getDate()}日解锁`;
    if (Date.now() >= d.getTime()) { card.classList.remove("locked"); card.classList.add("unlocked"); }
    return;
  }

  // Gift with tasks — hide static date/icon, render task list
  const dateEl = document.getElementById(`gift-date-${i}`);
  const iconEl = document.getElementById(`gift-icon-${i}`);
  const tasksEl = document.getElementById(`gift-tasks-${i}`);
  if (dateEl) dateEl.style.display = "none";
  if (iconEl) iconEl.style.display = "none";

  const now = Date.now();

  tasks.forEach((task, t) => {
    const taskDate = new Date(task.unlockDate);
    const revealed = now >= taskDate.getTime();
    const li = document.createElement("li");
    li.className = "gift-task" + (revealed ? "" : " mystery");
    li.dataset.index = t;
    const dateLabel = `${taskDate.getMonth() + 1}/${taskDate.getDate()}`;
    li.innerHTML = `
      <button class="gift-task-check" data-gift="${i}" data-task="${t}" ${!revealed ? "disabled" : ""}>
        <span class="gift-task-dot"></span>
      </button>
      <span class="gift-task-text">${revealed ? escapeHtml(task.text) : "· · ·"}</span>
      ${!revealed ? `<span class="gift-task-date">${dateLabel}</span>` : ""}
    `;
    tasksEl.appendChild(li);
  });

  // Sync completion state from Firebase
  const tasksRef = ref(db, `giftTasks/${i}`);
  onValue(tasksRef, (snapshot) => {
    const data = snapshot.val() || {};
    let allDone = true;
    tasks.forEach((task, t) => {
      const revealed = now >= new Date(task.unlockDate).getTime();
      const done = revealed && !!data[t];
      const li = tasksEl.querySelector(`[data-index="${t}"]`);
      if (li) li.classList.toggle("done", done);
      if (!done) allDone = false;
    });
    if (allDone) { card.classList.remove("locked"); card.classList.add("unlocked"); }
  });

  // Toggle task on click
  tasksEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".gift-task-check");
    if (!btn || btn.disabled) return;
    const t = btn.dataset.task;
    const li = btn.closest(".gift-task");
    set(ref(db, `giftTasks/${i}/${t}`), !li.classList.contains("done"));
  });
});

// ── Background music ──
const audio = document.getElementById("bg-music");
const musicBtn = document.getElementById("music-btn");
const iconPlay = musicBtn.querySelector(".music-icon-play");
const iconPause = musicBtn.querySelector(".music-icon-pause");
let musicStarted = false;

function setPlaying(playing) {
  musicBtn.classList.toggle("playing", playing);
  iconPlay.style.display = playing ? "" : "none";
  iconPause.style.display = playing ? "none" : "";
}

function startMusic() {
  if (musicStarted) return;
  musicStarted = true;
  audio.volume = 0.5;
  audio.play().then(() => setPlaying(true)).catch(() => {});
}

musicBtn.addEventListener("click", () => {
  if (audio.paused) {
    musicStarted = true;
    audio.play().then(() => setPlaying(true)).catch(() => {});
  } else {
    audio.pause();
    setPlaying(false);
  }
});

// 首次交互自动开始
["click", "touchstart", "keydown", "scroll"].forEach(evt =>
  document.addEventListener(evt, startMusic, { once: true, passive: true })
);

// ── Jerry interactive ──
const jerrySprite = document.getElementById("jerry-sprite");
const jerryHint = document.getElementById("jerry-hint");
const jerryMood = document.getElementById("jerry-mood");

const jerryStates = [
  { src: "assets/jerry/wave.png",     hint: "你好你好！",       mood: "攻略值 ❤️❤️❤️❤️❤️" },
  { src: "assets/jerry/surprise.png", hint: "哎呀～",           mood: "攻略值 ❤️❤️❤️❤️❤️" },
  { src: "assets/jerry/think.png",    hint: "让我想想…",        mood: "攻略值 ❤️❤️❤️❤️" },
  { src: "assets/jerry/sleep.png",    hint: "z z z…",           mood: "攻略值 ❤️❤️❤️" },
  { src: "assets/jerry/love.png",     hint: "生日快乐！",       mood: "攻略值 ❤️❤️❤️❤️❤️" },
];
let jerryIdx = -1;
let jerryTimer = null;

const jerryWrap = jerrySprite ? jerrySprite.closest(".jerry-sprite-wrap") : null;
if (jerryWrap) {
  jerryWrap.addEventListener("click", () => {
    jerryIdx = (jerryIdx + 1) % jerryStates.length;
    const state = jerryStates[jerryIdx];
    jerrySprite.src = state.src;
    jerryHint.textContent = state.hint;
    jerryMood.textContent = state.mood;
    jerrySprite.classList.remove("bounce");
    void jerrySprite.offsetWidth;
    jerrySprite.classList.add("bounce");
    clearTimeout(jerryTimer);
    jerryTimer = setTimeout(() => {
      jerrySprite.src = "assets/jerry/idle.png";
      jerryHint.textContent = "点我试试";
      jerryMood.textContent = "攻略值 ❤️❤️❤️❤️❤️";
      jerryIdx = -1;
    }, 3000);
  });
}

const jerryContent = document.querySelector(".page-jerry-content");
if (jerryContent) {
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) jerryContent.classList.add("visible");
  }, { threshold: 0.1 }).observe(jerryContent);
}

// ── Page 3 fade-in ──
const page3Content = document.querySelector(".page-3-content");
if (page3Content) {
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) page3Content.classList.add("visible");
  }, { threshold: 0.1 }).observe(page3Content);
}
