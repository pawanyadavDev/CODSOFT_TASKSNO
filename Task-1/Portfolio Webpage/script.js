/* ==========================================================
 Portfolio — script.js
   ========================================================== */
(function () {
  "use strict";

  document.documentElement.classList.add("js");
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Footer year ---------- */
  $("#year").textContent = new Date().getFullYear();

  /* ---------- Header: scrolled state + back-to-top ---------- */
  const header = $("#header");
  const toTop = $("#toTop");
  function onScroll() {
    const y = window.scrollY;
    header.classList.toggle("scrolled", y > 20);
    toTop.hidden = y < 600;
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }));

  /* ---------- Mobile menu ---------- */
  const nav = $("#nav");
  const toggle = $("#menuToggle");

  function setMenu(open) {
    nav.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.style.overflow = open ? "hidden" : "";
  }
  toggle.addEventListener("click", () => setMenu(!nav.classList.contains("open")));
  $$(".nav a").forEach(a => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", e => { if (e.key === "Escape") setMenu(false); });
  window.addEventListener("resize", () => { if (window.innerWidth > 820) setMenu(false); });

  /* ---------- Smooth scroll (fallback for browsers without CSS support) ---------- */
  if (!("scrollBehavior" in document.documentElement.style)) {
    $$('a[href^="#"]').forEach(a => {
      a.addEventListener("click", e => {
        const target = $(a.getAttribute("href"));
        if (!target) return;
        e.preventDefault();
        window.scrollTo({ top: target.offsetTop - 72, behavior: "smooth" });
      });
    });
  }

  /* ---------- Active nav link on scroll ---------- */
  const links = $$(".nav-link");
  const sections = links.map(l => $(l.getAttribute("href"))).filter(Boolean);
  if ("IntersectionObserver" in window) {
    const spy = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          links.forEach(l => l.classList.toggle("active", l.getAttribute("href") === "#" + entry.target.id));
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(s => spy.observe(s));
  }

  /* ---------- Typing effect ---------- */
  const typed = $("#typed");
  const roles = ["Web Developer", "Graphic Designer", "Frontend Developer"];
  if (reduceMotion) {
    typed.textContent = "Web Developer & graphic Designer";
  } else {
    let r = 0, i = 0, deleting = false;
    (function tick() {
      const word = roles[r];
      typed.textContent = word.slice(0, i);
      let delay = deleting ? 45 : 90;
      if (!deleting && i === word.length) { deleting = true; delay = 1600; }
      else if (deleting && i === 0) { deleting = false; r = (r + 1) % roles.length; delay = 350; }
      i += deleting ? -1 : 1;
      setTimeout(tick, delay);
    })();
  }

  /* ---------- Scroll reveal, skill bars, counters ---------- */
  function animateCount(el) {
    const end = parseInt(el.dataset.count, 10);
    if (reduceMotion) { el.textContent = end; return; }
    const start = performance.now(), dur = 1200;
    (function step(now) {
      const p = Math.min((now - start) / dur, 1);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    })(start);
  }

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add("in");
        $$("[data-level]", el).forEach(b => { b.style.width = b.dataset.level + "%"; });
        if (el.matches("[data-count]")) animateCount(el);
        obs.unobserve(el);
      });
    }, { threshold: 0.15 });
    $$(".reveal, [data-count]").forEach(el => io.observe(el));
  } else {
    // Old browsers: show everything immediately
    $$(".reveal").forEach(el => el.classList.add("in"));
    $$("[data-level]").forEach(b => { b.style.width = b.dataset.level + "%"; });
    $$("[data-count]").forEach(el => { el.textContent = el.dataset.count; });
  }

  /* ---------- Project filter ---------- */
  const chips = $$(".chip");
  const cards = $$(".project-card");
  const empty = $("#emptyState");

  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      const f = chip.dataset.filter;
      chips.forEach(c => {
        const on = c === chip;
        c.classList.toggle("active", on);
        c.setAttribute("aria-pressed", String(on));
      });
      let shown = 0;
      cards.forEach(card => {
        const match = f === "all" || card.dataset.category.split(" ").includes(f);
        card.classList.toggle("hide", !match);
        card.classList.remove("pop");
        if (match) { shown++; void card.offsetWidth; card.classList.add("pop"); }
      });
      empty.hidden = shown > 0;
    });
  });

  /* ---------- Testimonial slider ---------- */
  const quotes = $$(".quote");
  const dotsWrap = $("#dots");
  let current = 0, timer;

  quotes.forEach((_, idx) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-label", "Show testimonial " + (idx + 1));
    b.addEventListener("click", () => { show(idx); restart(); });
    dotsWrap.appendChild(b);
  });
  const dots = $$("button", dotsWrap);

  function show(n) {
    current = (n + quotes.length) % quotes.length;
    quotes.forEach((q, i) => q.classList.toggle("active", i === current));
    dots.forEach((d, i) => d.classList.toggle("active", i === current));
  }
  function restart() {
    clearInterval(timer);
    if (!reduceMotion) timer = setInterval(() => show(current + 1), 6000);
  }
  $("#prev").addEventListener("click", () => { show(current - 1); restart(); });
  $("#next").addEventListener("click", () => { show(current + 1); restart(); });
  $("#slider").addEventListener("mouseenter", () => clearInterval(timer));
  $("#slider").addEventListener("mouseleave", restart);
  show(0);
  restart();

  /* ---------- Contact form validation ---------- */
  const form = $("#contactForm");
  const status = $("#formStatus");
  const submitBtn = $("#submitBtn");

  const rules = {
    name: v => {
      if (!v) return "Enter your name.";
      if (v.length < 2) return "Name must be at least 2 characters.";
      if (!/^[\p{L}][\p{L}\s'.-]*$/u.test(v)) return "Name can only contain letters and spaces.";
      return "";
    },
    email: v => {
      if (!v) return "Enter your email address.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "Enter a valid email, like name@example.com.";
      return "";
    },
    subject: v => {
      if (!v) return "Enter a subject.";
      if (v.length < 3) return "Subject must be at least 3 characters.";
      return "";
    },
    message: v => {
      if (!v) return "Write a message.";
      if (v.length < 10) return "Message must be at least 10 characters (" + v.length + " so far).";
      if (v.length > 1000) return "Message must be 1000 characters or fewer.";
      return "";
    }
  };

  function validateField(input) {
    const msg = rules[input.name](input.value.trim());
    const field = input.closest(".field");
    $(".error", field).textContent = msg;
    field.classList.toggle("invalid", !!msg);
    field.classList.toggle("valid", !msg);
    input.setAttribute("aria-invalid", String(!!msg));
    return !msg;
  }

  $$("input, textarea", form).forEach(input => {
    input.addEventListener("blur", () => validateField(input));
    input.addEventListener("input", () => {
      if (input.closest(".field").classList.contains("invalid")) validateField(input);
    });
  });

  form.addEventListener("submit", e => {
    e.preventDefault();
    status.textContent = "";
    status.className = "form-status";

    const inputs = $$("input, textarea", form);
    const results = inputs.map(validateField);
    if (results.includes(false)) {
      inputs[results.indexOf(false)].focus();
      status.textContent = "Fix the highlighted fields and try again.";
      status.classList.add("fail");
      return;
    }

    // Demo submit. Replace this block with a real request, for example:
    // fetch("https://formspree.io/f/your-id", { method: "POST", body: new FormData(form) })
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";
    setTimeout(() => {
      form.reset();
      $$(".field", form).forEach(f => f.classList.remove("valid", "invalid"));
      submitBtn.disabled = false;
      submitBtn.textContent = "Send message";
      status.textContent = "Message sent. I'll reply within 24 hours.";
      status.classList.add("ok");
    }, 900);
  });
})();
