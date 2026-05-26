import { db, push, onValue, remove } from "./firebase.js";
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

// ── Todo list ──
function makeTodoItem(key, item) {
  const li = document.createElement("li");
  li.className = "todo-item";
  li.dataset.createdat = item.createdAt || "";
  li.innerHTML = `
    <button class="todo-check" data-key="${key}" aria-label="标为完成">
      <span class="check-circle"></span>
    </button>
    <div class="todo-body">
      <span class="todo-text">${escapeHtml(item.text)}</span>
      <span class="todo-time">${formatTs(item.createdAt)}</span>
    </div>
    <button class="todo-delete" data-key="${key}" aria-label="删除">×</button>
  `;
  return li;
}

function initTodoCol(owner) {
  const listEl = document.getElementById(`todo-list-${owner}`);
  const form = document.querySelector(`.todo-form[data-owner="${owner}"]`);
  const input = form.querySelector(".todo-input");
  const colRef = ref(db, `todos/${owner}`);

  onValue(colRef, (snapshot) => {
    listEl.innerHTML = "";
    const data = snapshot.val();
    if (!data) return;
    Object.entries(data).forEach(([key, item]) => {
      listEl.appendChild(makeTodoItem(key, item));
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    push(colRef, { text, createdAt: Date.now() });
    input.value = "";
  });

  listEl.addEventListener("click", async (e) => {
    const checkBtn = e.target.closest(".todo-check");
    const deleteBtn = e.target.closest(".todo-delete");

    if (checkBtn) {
      const key = checkBtn.dataset.key;
      const li = checkBtn.closest(".todo-item");
      const text = li.querySelector(".todo-text").textContent;
      const createdAt = Number(li.dataset.createdat) || Date.now();
      li.classList.add("completing");
      await new Promise(r => setTimeout(r, 380));
      await push(ref(db, `completed/${owner}`), { text, createdAt, completedAt: Date.now() });
      await remove(ref(db, `todos/${owner}/${key}`));
    }

    if (deleteBtn) {
      remove(ref(db, `todos/${owner}/${deleteBtn.dataset.key}`));
    }
  });
}

initTodoCol("e");
initTodoCol("jerry");

// ── Completed sidebar ──
["e", "jerry"].forEach(owner => {
  const listEl = document.getElementById(`completed-list-${owner}`);
  onValue(ref(db, `completed/${owner}`), (snapshot) => {
    listEl.innerHTML = "";
    const data = snapshot.val();
    if (!data) {
      listEl.innerHTML = `<li class="completed-empty">暂无</li>`;
      return;
    }
    Object.entries(data)
      .sort(([, a], [, b]) => (b.completedAt || 0) - (a.completedAt || 0))
      .forEach(([, item]) => {
        const li = document.createElement("li");
        li.className = "completed-item";
        li.innerHTML = `
          <span class="completed-text">${escapeHtml(item.text)}</span>
          <span class="completed-time">完成于 ${formatTs(item.completedAt)}</span>
        `;
        listEl.appendChild(li);
      });
  });
});

const sidebar = document.getElementById("sidebar");
document.getElementById("sidebar-trigger").addEventListener("click", () => sidebar.classList.add("open"));
document.getElementById("sidebar-close").addEventListener("click", () => sidebar.classList.remove("open"));

// ── Gift unlock ──
(config.gifts || []).forEach((gift, i) => {
  const card = document.getElementById(`gift-${i}`);
  const dateEl = document.getElementById(`gift-date-${i}`);
  if (!card) return;

  const d = new Date(gift.unlockDate);
  if (dateEl) {
    dateEl.textContent = gift.label || `${d.getMonth() + 1}月${d.getDate()}日解锁`;
  }

  if (Date.now() >= d.getTime()) {
    card.classList.remove("locked");
    card.classList.add("unlocked");
  }
});

// ── Page 3 fade-in ──
const page3Content = document.querySelector(".page-3-content");
if (page3Content) {
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) page3Content.classList.add("visible");
  }, { threshold: 0.1 }).observe(page3Content);
}
