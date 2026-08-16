// ════════════════════════════════════════════
//  一封信 · 开封 + 翻页
// ════════════════════════════════════════════

const letter      = document.getElementById("letter");
const envelope    = document.getElementById("envelope-scene");
const stage       = document.getElementById("stage");
// 只认没被 CSS 藏起来的信纸：想增减页面，改 CSS 就行，这里不用动
const sheets      = Array.from(stage.querySelectorAll(".sheet"))
                         .filter(s => getComputedStyle(s).display !== "none");
const dotsWrap    = document.getElementById("dots");
const btnPrev     = document.getElementById("btn-prev");
const btnNext     = document.getElementById("btn-next");
const edgePrev    = document.getElementById("edge-prev");
const edgeNext    = document.getElementById("edge-next");
const progressBar = document.getElementById("progress-bar");

let current = 0;
let opened = false;
let turning = false;

// 只有一页的时候，页码圆点、翻页箭头、进度条都没有意义，收起来
if (sheets.length <= 1) {
  document.querySelector(".controls").style.display = "none";
  document.querySelector(".progress").style.display = "none";
  edgePrev.style.display = "none";
  edgeNext.style.display = "none";
}

// ── 生成页码圆点 ──
sheets.forEach((_, i) => {
  const dot = document.createElement("button");
  dot.className = "dot";
  dot.setAttribute("aria-label", `第 ${i + 1} 页`);
  dot.addEventListener("click", () => goTo(i));
  dotsWrap.appendChild(dot);
});

// ── 渲染当前状态 ──
function render() {
  sheets.forEach((sheet, i) => {
    sheet.dataset.state =
      i === current ? "current" : i < current ? "past" : "future";
    sheet.setAttribute("aria-hidden", i === current ? "false" : "true");
  });

  dotsWrap.querySelectorAll(".dot").forEach((dot, i) => {
    dot.classList.toggle("active", i === current);
  });

  btnPrev.disabled = current === 0;
  btnNext.disabled = current === sheets.length - 1;
  progressBar.style.width = `${((current + 1) / sheets.length) * 100}%`;

  checkOverflow(sheets[current]);
}

function goTo(index) {
  if (turning || index === current) return;
  if (index < 0 || index >= sheets.length) return;

  turning = true;
  current = index;
  render();

  // 翻过去以后，正文从头开始读
  const body = sheets[current].querySelector(".sheet-body");
  if (body) body.scrollTop = 0;

  setTimeout(() => { turning = false; }, 520);
}

const next = () => goTo(current + 1);
const prev = () => goTo(current - 1);

// ── 内容超出一屏时，底部给渐隐提示 ──
function checkOverflow(sheet) {
  if (!sheet) return;
  const body = sheet.querySelector(".sheet-body");
  if (!body) return;
  const overflowing = body.scrollHeight - body.clientHeight > 4;
  sheet.classList.toggle("is-scrollable", overflowing);
  sheet.classList.toggle("is-bottom", !overflowing);
}

sheets.forEach(sheet => {
  const body = sheet.querySelector(".sheet-body");
  if (!body) return;
  body.addEventListener("scroll", () => {
    const atBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 12;
    sheet.classList.toggle("is-bottom", atBottom);
  }, { passive: true });
});

window.addEventListener("resize", () => checkOverflow(sheets[current]));
// 网页字体加载完，行高会变，得重新量一次
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => checkOverflow(sheets[current]));
}

// ── 开封 ──
function openLetter() {
  if (opened) return;
  opened = true;

  letter.classList.add("is-opening");
  setTimeout(() => letter.classList.add("is-open"), 1150);
  setTimeout(() => checkOverflow(sheets[current]), 2200);
}

envelope.addEventListener("click", openLetter);
envelope.addEventListener("keydown", e => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    openLetter();
  }
});

// ── 翻页入口：按钮 / 两侧空白 / 键盘 / 滑动 ──
btnNext.addEventListener("click", next);
btnPrev.addEventListener("click", prev);
edgeNext.addEventListener("click", next);
edgePrev.addEventListener("click", prev);

document.addEventListener("keydown", e => {
  if (!opened) return;
  if (e.key === "ArrowRight" || e.key === "PageDown") next();
  if (e.key === "ArrowLeft"  || e.key === "PageUp")   prev();
});

let touchX = 0, touchY = 0;
stage.addEventListener("touchstart", e => {
  touchX = e.changedTouches[0].clientX;
  touchY = e.changedTouches[0].clientY;
}, { passive: true });

stage.addEventListener("touchend", e => {
  const dx = e.changedTouches[0].clientX - touchX;
  const dy = e.changedTouches[0].clientY - touchY;
  // 横向位移要明显大于纵向，才算翻页，否则是在滚正文
  if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
  dx < 0 ? next() : prev();
}, { passive: true });

render();
