(function () {
  "use strict";

  /* ============================================
     WEDDING DATE
  ============================================ */
  const WEDDING_DATE = new Date("2026-06-20T17:30:00+03:00");

  /* ============================================
     DOM REFERENCES
  ============================================ */
  const envelopeScreen  = document.getElementById("envelope-screen");
  const envelopeVideo   = document.getElementById("envelope-video");
  const openEnvBtn      = document.getElementById("open-envelope-btn");
  const introPrompt     = document.getElementById("intro-prompt");
  const musicBtn        = document.querySelector(".music-btn");

  const cdDays    = document.getElementById("days");
  const cdHours   = document.getElementById("hours");
  const cdMinutes = document.getElementById("minutes");
  const cdSeconds = document.getElementById("seconds");

  const navbar   = document.querySelector(".navbar");
  const navLinks = document.getElementById("nav-links");

  /* ============================================
     AUDIO SETUP
  ============================================ */
  let bgMusic = document.getElementById("bg-music");
  if (!bgMusic) {
    bgMusic = document.createElement("audio");
    bgMusic.id  = "bg-music";
    bgMusic.src = "assets/song.m4a";
    bgMusic.loop = true;
    bgMusic.volume = 0;
    document.body.appendChild(bgMusic);
  }

  /* ============================================
    ENVELOPE 
  ============================================ */
  let introState = "idle"; // idle | playing | fading
  let fadeInterval = null;

  /** Gradually raise volume from 0 → 1 over ~3 s */
  function fadeInMusic() {
    if (fadeInterval) clearInterval(fadeInterval);
    fadeInterval = setInterval(function () {
      if (bgMusic.volume < 0.97) {
        bgMusic.volume = Math.min(bgMusic.volume + 0.02, 1.0);
      } else {
        bgMusic.volume = 1.0;
        clearInterval(fadeInterval);
        fadeInterval = null;
      }
    }, 60);
  }

  function handleEnvelopeClick() {
    if (introState !== "idle") return;
    introState = "playing";

    if (introPrompt) introPrompt.classList.add("prompt-hidden");

    musicPlaying = true;
    updateMusicBtn();
    bgMusic.currentTime = 0;
    bgMusic.volume = 0;

    const revealFallback = setTimeout(revealMain, 5000);

    function playVideo() {
      const p = envelopeVideo.play();
      if (p && typeof p.catch === "function") {
        p.catch(function () {
          clearTimeout(revealFallback);
          revealMain();
        });
      }
    }

    bgMusic.play()
      .then(function () {
        fadeInMusic();
        playVideo();
      })
      .catch(function () {
        playVideo();
      });
  }

  if (envelopeVideo) {
    envelopeVideo.addEventListener("timeupdate", function () {
      if (!envelopeVideo.duration) return;
      const remaining = envelopeVideo.duration - envelopeVideo.currentTime;
      if (remaining <= 0.9 && introState === "playing") {
        introState = "fading";
        envelopeScreen.classList.add("fading");
        setTimeout(revealMain, 800);
      }
    });

    envelopeVideo.addEventListener("ended", function () {
      if (introState !== "fading") revealMain();
    });
  }

  if (openEnvBtn) openEnvBtn.addEventListener("click", handleEnvelopeClick);

  function revealMain() {
    envelopeScreen.classList.add("hidden");
    startCountdown();
    observeFadeIns();
    updateActiveNav();
  }

  /* ============================================
     MUSIC BUTTON
  ============================================ */
  let musicPlaying = false;

  function updateMusicBtn() {
    if (!musicBtn) return;
    musicBtn.classList.toggle("playing", musicPlaying);
    musicBtn.setAttribute("aria-label", musicPlaying ? "Pause Music" : "Play Music");
  }

  if (musicBtn) {
    musicBtn.addEventListener("click", function () {
      if (musicPlaying) {
        bgMusic.pause();
        musicPlaying = false;
      } else {
        bgMusic.play().catch(function () {});
        musicPlaying = true;
      }
      updateMusicBtn();
    });
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      bgMusic.pause();
    } else if (musicPlaying) {
      bgMusic.play().catch(function () {});
    }
  });

  window.addEventListener("pagehide", function () { bgMusic.pause(); });

  /* ============================================
     ACTIVE NAV LINK ON SCROLL
  ============================================ */
  const sections = document.querySelectorAll("section[id]");
  const navAnchors = navLinks ? navLinks.querySelectorAll("a") : [];

  function updateActiveNav() {
    const scrollY = window.scrollY + 130;
    sections.forEach(function (section) {
      const top    = section.offsetTop;
      const height = section.offsetHeight;
      const id     = section.getAttribute("id");
      if (scrollY >= top && scrollY < top + height) {
        navAnchors.forEach(function (a) {
          a.classList.toggle("active", a.getAttribute("href") === "#" + id);
        });
      }
    });
  }

  window.addEventListener("scroll", updateActiveNav, { passive: true });

  /* ============================================
     COUNTDOWN TIMER
  ============================================ */
  let countdownDone = false;

  function startCountdown() {
    function tick() {
      const now  = new Date();
      const diff = WEDDING_DATE - now;

      if (diff <= 0) {
        if (cdDays)    cdDays.textContent    = "0";
        if (cdHours)   cdHours.textContent   = "00";
        if (cdMinutes) cdMinutes.textContent = "00";
        if (cdSeconds) cdSeconds.textContent = "00";
        if (!countdownDone) {
          countdownDone = true;
          onCountdownComplete();
        }
        return;
      }

      const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours   = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      if (cdDays)    cdDays.textContent    = days;
      if (cdHours)   cdHours.textContent   = String(hours).padStart(2, "0");
      if (cdMinutes) cdMinutes.textContent = String(minutes).padStart(2, "0");
      if (cdSeconds) cdSeconds.textContent = String(seconds).padStart(2, "0");
    }

    tick();
    setInterval(tick, 1000);
  }

  /* ============================================
     COUNTDOWN
  ============================================ */
  function onCountdownComplete() {
    const subtitle = document.querySelector(".countdown-section .section-title");
    if (subtitle) {
      const note = document.createElement("p");
      note.className = "section-subtitle";
      note.textContent = "The celebration has begun!";
      subtitle.parentNode.insertBefore(note, subtitle.nextSibling);
    }
    startFireworks();
  }

  function startFireworks() {
    const section = document.getElementById("countdown");
    if (!section) return;

    let canvas = section.querySelector(".fireworks-canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.className = "fireworks-canvas";
      canvas.style.cssText =
        "position:absolute;inset:0;pointer-events:none;z-index:1;";
      section.style.position = "relative";
      section.appendChild(canvas);
    }

    const ctx = canvas.getContext("2d");

    function resize() {
      canvas.width  = section.offsetWidth;
      canvas.height = section.offsetHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    const colors = [
      [239, 223, 213],
      [88, 112, 66],
      [169, 180, 148],
    ];

    let particles = [], rockets = [], sparks = [];

    function Rocket(x) {
      this.x = x;
      this.y = canvas.height;
      this.vx = (Math.random() - 0.5) * 1.5;
      this.vy = -(6 + Math.random() * 4);
      this.targetY = canvas.height * (0.15 + Math.random() * 0.35);
      this.trail = [];
      this.color = colors[Math.floor(Math.random() * colors.length)];
    }

    function Particle(x, y, color, speed, angle, life) {
      this.x = x; this.y = y;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.alpha = 1;
      this.life  = life || (60 + Math.random() * 40);
      this.decay = 1 / this.life;
      this.color = color;
      this.size  = 1.5 + Math.random() * 2;
      this.gravity = 0.025;
    }

    function Spark(x, y, color) {
      this.x = x; this.y = y;
      this.vx = (Math.random() - 0.5) * 0.8;
      this.vy = -Math.random() * 1.5;
      this.alpha = 0.8;
      this.life  = 30 + Math.random() * 20;
      this.decay = 1 / this.life;
      this.color = color;
      this.size  = 1 + Math.random();
    }

    function explode(x, y, color) {
      const count = 60 + Math.floor(Math.random() * 50);
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.3;
        const speed = 1.5 + Math.random() * 3.5;
        const c = Math.random() > 0.3 ? color : colors[Math.floor(Math.random() * colors.length)];
        particles.push(new Particle(x, y, c, speed, angle));
      }
      for (let j = 0; j < 20; j++) {
        particles.push(new Particle(x, y, [239, 223, 213],
          0.5 + Math.random() * 1.5, Math.random() * Math.PI * 2, 25));
      }
    }

    let frameId, lastLaunch = 0, launchInterval = 600;

    function loop(ts) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(239,223,213,0.15)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (ts - lastLaunch > launchInterval) {
        rockets.push(new Rocket(canvas.width * (0.15 + Math.random() * 0.7)));
        if (Math.random() > 0.5)
          rockets.push(new Rocket(canvas.width * (0.15 + Math.random() * 0.7)));
        lastLaunch = ts;
        launchInterval = 500 + Math.random() * 800;
      }

      for (let r = rockets.length - 1; r >= 0; r--) {
        const rk = rockets[r];
        rk.trail.push({ x: rk.x, y: rk.y });
        if (rk.trail.length > 8) rk.trail.shift();
        rk.x += rk.vx; rk.y += rk.vy; rk.vy *= 0.985;

        rk.trail.forEach(function (pt, t) {
          const ta = (t / rk.trail.length) * 0.6;
          ctx.fillStyle = `rgba(${rk.color[0]},${rk.color[1]},${rk.color[2]},${ta})`;
          ctx.beginPath(); ctx.arc(pt.x, pt.y, 1.5, 0, Math.PI * 2); ctx.fill();
        });

        ctx.fillStyle = "rgba(255,240,200,0.9)";
        ctx.beginPath(); ctx.arc(rk.x, rk.y, 2.5, 0, Math.PI * 2); ctx.fill();

        if (Math.random() > 0.4) sparks.push(new Spark(rk.x, rk.y, rk.color));
        if (rk.y <= rk.targetY) { explode(rk.x, rk.y, rk.color); rockets.splice(r, 1); }
      }

      for (let p = particles.length - 1; p >= 0; p--) {
        const pt = particles[p];
        pt.x += pt.vx; pt.y += pt.vy; pt.vy += pt.gravity;
        pt.vx *= 0.99; pt.alpha -= pt.decay;
        if (pt.alpha <= 0) { particles.splice(p, 1); continue; }
        ctx.globalAlpha = pt.alpha;
        ctx.fillStyle = `rgb(${pt.color[0]},${pt.color[1]},${pt.color[2]})`;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * pt.alpha, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = pt.alpha * 0.3;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * pt.alpha * 2.5, 0, Math.PI * 2); ctx.fill();
      }

      for (let s = sparks.length - 1; s >= 0; s--) {
        const sp = sparks[s];
        sp.x += sp.vx; sp.y += sp.vy; sp.vy += 0.03; sp.alpha -= sp.decay;
        if (sp.alpha <= 0) { sparks.splice(s, 1); continue; }
        ctx.globalAlpha = sp.alpha * 0.7;
        ctx.fillStyle = `rgb(${sp.color[0]},${sp.color[1]},${sp.color[2]})`;
        ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2); ctx.fill();
      }

      ctx.globalAlpha = 1;
      frameId = requestAnimationFrame(loop);
    }

    let running = false;
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !running) {
          running = true; resize();
          frameId = requestAnimationFrame(loop);
        } else if (!entry.isIntersecting && running) {
          running = false;
          cancelAnimationFrame(frameId);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      });
    }, { threshold: 0.1 }).observe(section);
  }

  /* ============================================
     SCROLL
  ============================================ */
function observeFadeIns() {
  const selectors = [
    ".invitation-rings",
    ".invitation-content .divider",
    ".parents-text",
    ".invite-text",
    ".couple-names",
    ".date-details",
    ".ceremony-details",
    ".reception-details",
    ".countdown-icon",
    ".countdown-section .section-title",
    ".timer-container",
    ".image-container",
    ".location-section .section-title",
    ".venue-card",
    ".schedule-section .section-title",
    ".schedule-section .section-subtitle",
    ".timeline-item",
    ".travel-section .section-title",
    ".travel-section .section-subtitle",
    ".travel-block",
    ".discover-section .section-title",
    ".discover-section .section-subtitle",
    ".discover-main-btn",
    ".discover-small-title",
    ".tip-card",
    ".gifts-section .divider",
    ".gifts-section .section-title",
    ".registry-text",
    ".registry-card",
    ".rsvp-section .section-title",
    ".rsvp-subtitle",
    ".rsvp-deadline",
    ".rsvp-form-container",
    ".footer-content"
  ];

  const targets = document.querySelectorAll(selectors.join(","));

  targets.forEach(function (el) {
    el.classList.add("fade-in");
  });

  const observer = new IntersectionObserver(function (entries, obs) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;

      entry.target.classList.add("visible");
      obs.unobserve(entry.target);
    });
  }, {
    threshold: 0.12,
    rootMargin: "0px 0px -6% 0px"
  });

  targets.forEach(function (el, index) {
    el.style.transitionDelay = Math.min(index % 5, 4) * 0.08 + "s";

    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) {
      el.classList.add("visible");
      return;
    }

    observer.observe(el);
  });
}

  /* ============================================
     ACCORDION
  ============================================ */

  const RESTAURANT_DATA = {
    "Lebanese Cuisines": [
      "Liza", "Em Sherif Cafe", "Em Sherif Sea", "Beit Kanz",
      "Al Sultan Brahim", "Al Khawaja", "Mhanna sur Mer", "Leila Zaitunay Bay"
    ],
    "International Cuisines — Lunch": [
      "Paname", "Malibou", "Meat the Fish", "PizzaWa", "Ginette",
      "Maison Prunelle", "Al Mandaloun", "Bar Tartine", "Tavolina"
    ],
    "International Cuisines — Dinner": [
      "Arthaus Beirut", "Albergo", "Le Sushi Bar", "The Terrible Prince",
      "Le Petit Gris", "Baron", "Buco", "Centrale", "Le Zed",
      "Burgundy", "Kampai", "Mitsu-Ya", "Marly's", "Mayrig"
    ],
    "Beach Restaurants": [
      "Fidar Beach House", "Sporting Club", "BDP Beach", "Butlers Beach Club",
      "A la Pier Batroun", "Bebabel Batroun Bahsa", "Almaza Bay",
      "Le Canoe", "Paradiso Eddesands"
    ],
    "Mountain Restaurants": [
      "Le Montagnou", "Ixsir Winery", "Berdawni Zahle"
    ],
    "Bars & Nightlife": [
      "Cyrano – Le Coin de l'Apero", "House of Butlers", "Albergo Swim Club",
      "Capitole by Analogue", "Analogue Biel", "Centrale Rooftop Bar",
      "Futomama", "Clap"
    ],
    "Nightclubs": [
      "Capitole", "Analogue", "Musichall", "Club Soda",
      "AHM", "Skybar", "Odin Outside Beirut", "Almaza Bay Beach"
    ]
  };

  document.querySelectorAll(".accordion-item").forEach(function (btn) {
    const labelSpan = btn.querySelector("span:first-child");
    const label = labelSpan ? labelSpan.textContent.trim() : "";
    const items = RESTAURANT_DATA[label];

    const panel = document.createElement("div");
    panel.className = "accordion-panel";
    panel.style.cssText =
      "max-height:0;overflow:hidden;transition:max-height 0.4s ease;";

    if (items && items.length) {
      const ul = document.createElement("ul");
      ul.style.cssText =
        "list-style:none;padding:0.75rem 1.25rem 1rem;text-align:left;";
      items.forEach(function (name) {
        const li = document.createElement("li");
        li.textContent = name;
        li.style.cssText =
          "font-family:var(--font-body);font-size:0.9rem;" +
          "color:var(--muted-fg);padding:0.3rem 0;" +
          "border-bottom:1px solid rgba(88,112,66,0.12);";
        ul.appendChild(li);
      });
      panel.appendChild(ul);
    }

    btn.insertAdjacentElement("afterend", panel);

    btn.addEventListener("click", function () {
      const isOpen = btn.classList.contains("open");

      document.querySelectorAll(".accordion-item.open").forEach(function (other) {
        other.classList.remove("open");
        const otherPanel = other.nextElementSibling;
        if (otherPanel && otherPanel.classList.contains("accordion-panel")) {
          otherPanel.style.maxHeight = "0";
        }
        const otherArrow = other.querySelector(".accordion-arrow");
        if (otherArrow) otherArrow.style.transform = "rotate(0deg)";
      });

      if (!isOpen) {
        btn.classList.add("open");
        panel.style.maxHeight = panel.scrollHeight + "px";
        const arrow = btn.querySelector(".accordion-arrow");
        if (arrow) arrow.style.transform = "rotate(180deg)";
      }
    });
  });

  document.querySelectorAll(".accordion-arrow").forEach(function (arrow) {
    arrow.style.transition = "transform 0.3s ease";
  });

  /* ============================================
     LOCATION MAP BUTTONS
  ============================================ */
  const MAP_LINKS = {
    "St Simon Church":  "https://maps.app.goo.gl/otE6Xrh9mTWNcGKv5",
    "Chateau Rweiss":   "https://maps.app.goo.gl/iyVH4mhKM9Xcf4kg9"
  };

  document.querySelectorAll(".venue-card").forEach(function (card) {
    const nameEl = card.querySelector(".venue-name");
    const mapBtn = card.querySelector(".btn-map");
    if (!nameEl || !mapBtn) return;
    const venueName = nameEl.textContent.trim();
    const url = MAP_LINKS[venueName];
    if (url) mapBtn.setAttribute("href", url);
  });

  /* ============================================
     HOTEL LINKS
  ============================================ */
  const HOTEL_LINKS = {
    "O Monot":                  "https://www.omonot.com/",
    "Saifi Suites":             "https://www.saifisuites.com/",
    "Arthaus Beirut":           "https://arthaus.international/your-stay/beirut/",
    "Albergo":                  "https://www.albergobeirut.com/",
    "Saint George Hotel & Resort": "https://saintgeorgebeirut.com/"
  };

  document.querySelectorAll(".hotel-pill").forEach(function (pill) {
    const name = pill.textContent.trim();
    if (HOTEL_LINKS[name]) pill.setAttribute("href", HOTEL_LINKS[name]);
    pill.setAttribute("target", "_blank");
    pill.setAttribute("rel", "noopener noreferrer");
  });

  /* ============================================
     GIFTS 
  ============================================ */
  const registryBtn = document.querySelector(".registry-btn");

  if (registryBtn) {
    const details = {
      lbTitle: "Lebanese Account",
      lbRows: [
        ["Beneficiary", "Isaac Corm"],
        ["Bank",        "BLOM Bank"],
        ["Account No.", "1737018"],
        ["IBAN",        "LB75 0014 0000 5902 6731 7370 1816"],
        ["BIC / SWIFT", "BLOMLBBX"],
      ],
      intTitle: "International Account",
      intRows: [
        ["Account Holder",  "Isaac Corm"],
        ["Account Number",  "8312130374"],
        ["Routing Number",  "026073150"],
        ["SWIFT / BIC",     "CMFGUS33"],
        ["Bank",            "Community Federal Savings Bank"],
        ["Bank Address",    "89-16 Jamaica Ave, Woodhaven, NY 11421, USA"],
      ]
    };

    registryBtn.addEventListener("click", function () {
      if (registryBtn.dataset.open === "true") return;
      registryBtn.dataset.open = "true";

      const card = registryBtn.closest(".registry-card");

      const wrap = document.createElement("div");
      wrap.style.cssText =
        "width:100%;text-align:left;margin-top:1.5rem;" +
        "animation:fadeInUp 0.5s ease forwards;";

      function buildTable(title, rows) {
        const section = document.createElement("div");
        section.style.marginBottom = "1.5rem";

        const h4 = document.createElement("h4");
        h4.textContent = title;
        h4.style.cssText =
          "font-family:var(--font-display);font-size:1rem;font-weight:600;" +
          "letter-spacing:0.1em;text-transform:uppercase;color:var(--sage-dark);" +
          "margin-bottom:0.75rem;";
        section.appendChild(h4);

        rows.forEach(function (row) {
          const line = document.createElement("div");
          line.style.cssText =
            "display:flex;gap:1rem;padding:0.4rem 0;" +
            "border-bottom:1px solid rgba(88,112,66,0.12);";

          const label = document.createElement("span");
          label.textContent = row[0];
          label.style.cssText =
            "font-family:var(--font-display);font-size:0.82rem;" +
            "font-weight:600;letter-spacing:0.08em;text-transform:uppercase;" +
            "color:var(--muted-fg);min-width:130px;flex-shrink:0;";

          const value = document.createElement("span");
          value.textContent = row[1];
          value.style.cssText =
            "font-family:var(--font-body);font-size:0.9rem;color:var(--sage-dark);word-break:break-all;";

          line.appendChild(label);
          line.appendChild(value);
          section.appendChild(line);
        });

        return section;
      }

      wrap.appendChild(buildTable(details.lbTitle, details.lbRows));
      wrap.appendChild(buildTable(details.intTitle, details.intRows));

      registryBtn.style.transition = "opacity 0.35s ease";
      registryBtn.style.opacity = "0";
      setTimeout(function () {
        registryBtn.style.display = "none";
        card.appendChild(wrap);
      }, 350);
    });
  }

  if (!document.getElementById("wedding-keyframes")) {
    const style = document.createElement("style");
    style.id = "wedding-keyframes";
    style.textContent = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;
    document.head.appendChild(style);
  }

  /* ============================================
     RSVP 
  ============================================ */
  const rsvpForm    = document.getElementById("rsvp-form");
  const guestInput  = document.getElementById("guest-name");
  const submitBtn   = rsvpForm ? rsvpForm.querySelector(".btn-submit") : null;

  if (rsvpForm && guestInput && submitBtn) {
    rsvpForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const name = guestInput.value.trim();
      if (!name) {
        showRsvpMessage("Please enter your full name.", "error");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";

      setTimeout(function () {
        showRsvpMessage(
          "Thank you, " + name + "! We've noted your response and will be in touch. " +
          "If you have any questions, please contact us directly.",
          "success"
        );
        guestInput.value = "";
        submitBtn.disabled  = false;
        submitBtn.textContent = "Find Your Invitation";
      }, 900);
    });
  }

  function showRsvpMessage(text, type) {
    const existing = document.querySelector(".rsvp-inline-msg");
    if (existing) existing.remove();

    const msg = document.createElement("p");
    msg.className = "rsvp-inline-msg";
    msg.textContent = text;
    msg.style.cssText =
      "font-family:var(--font-body);font-size:0.9rem;font-style:italic;" +
      "margin-top:1rem;text-align:center;padding:0.75rem 1rem;" +
      "border-radius:6px;animation:fadeInUp 0.4s ease forwards;" +
      (type === "error"
        ? "color:#8b4513;background:rgba(139,69,19,0.08);border:1px solid rgba(139,69,19,0.2);"
        : "color:var(--sage-dark);background:rgba(88,112,66,0.08);border:1px solid rgba(88,112,66,0.25);");

    const container = document.querySelector(".rsvp-form-container");
    if (container) container.appendChild(msg);
  }

  /* ============================================
     NAV LINK SMOOTH SCROLL
  ============================================ */
  if (navLinks) {
    navLinks.querySelectorAll("a[href^='#']").forEach(function (link) {
      link.addEventListener("click", function () {
        navLinks.classList.remove("open");
      });
    });
  }

  /* ============================================
     INIT
  ============================================ */
  if (!envelopeVideo || !envelopeVideo.src) {
    revealMain();
  }

})();
