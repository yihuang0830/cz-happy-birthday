(function () {
  // ── Countdown ──
  const config = window.BIRTHDAY_SITE || {};
  const target = new Date(config.birthdayDate);

  const el = {
    body: document.body,
    title: document.getElementById("main-title"),
    birthdayTitle: document.getElementById("birthday-title"),
    message: document.getElementById("main-message"),
    countdown: document.getElementById("countdown"),
    days: document.getElementById("days"),
    hours: document.getElementById("hours"),
    minutes: document.getElementById("minutes"),
    seconds: document.getElementById("seconds"),
  };

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function showBirthday() {
    el.body.classList.add("is-birthday");
    el.birthdayTitle.textContent = config.birthdayTitle || "生日快乐";
    el.message.textContent = config.birthdayMessage || "";
  }

  function showCountdown(ms) {
    const total = Math.floor(ms / 1000);
    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;

    el.message.textContent = config.countdownMessage || "";
    el.days.textContent = d;
    el.hours.textContent = pad(h);
    el.minutes.textContent = pad(m);
    el.seconds.textContent = pad(s);
  }

  function tick() {
    const diff = target.getTime() - Date.now();
    if (Number.isNaN(target.getTime()) || diff <= 0) {
      showBirthday();
      return;
    }
    showCountdown(diff);
    setTimeout(tick, 1000);
  }

  tick();

  // ── Page 2 fade-in via Intersection Observer ──
  const page2Content = document.querySelector(".page-2-content");
  if (page2Content) {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          page2Content.classList.add("visible");
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(page2Content);
  }
}());
