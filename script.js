(function () {
  "use strict";

  /* ============================================
     WEDDING DATE
  ============================================ */
  const WEDDING_DATE = new Date("2026-06-20T17:30:00+03:00");

  /* ============================================
     DOM REFERENCES
  ============================================ */
  const envelopeScreen = document.getElementById("envelope-screen");
  const envelopeVideo = document.getElementById("envelope-video");
  const openEnvBtn = document.getElementById("open-envelope-btn");
  const introPrompt = document.getElementById("intro-prompt");
  const musicBtn = document.querySelector(".music-btn");

  const cdDays = document.getElementById("days");
  const cdHours = document.getElementById("hours");
  const cdMinutes = document.getElementById("minutes");
  const cdSeconds = document.getElementById("seconds");

  const navLinks = document.getElementById("nav-links");
  const sections = document.querySelectorAll("section[id]");
  const navAnchors = navLinks ? navLinks.querySelectorAll("a") : [];

  const RSVP_API_URL = "submit_rsvp.php";

  async function postRsvpRequest(formData) {
    const response = await fetch(RSVP_API_URL, {
      method: "POST",
      body: formData,
      headers: {
        Accept: "application/json"
      },
      cache: "no-store"
    });

    const text = await response.text();

    if (!text.trim()) {
      console.error("Empty response from PHP.");
      throw new Error("Empty response from server.");
    }

    let result;

    try {
      result = JSON.parse(text);
    } catch (error) {
      console.error("PHP did not return JSON:", text);
      throw new Error("Invalid response from server.");
    }

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Request failed.");
    }

    return result;
  }

  /* ============================================
     CLONE TEXT NORMALIZATION
     Keeps your HTML/CSS as-is, but aligns small visible text
     differences with the reference site.
  ============================================ */
  function normalizeCloneText() {
    document.querySelectorAll(".hotel-pill").forEach(function (pill) {
      if (pill.textContent.trim() === "Voco") {
        pill.textContent = "Vocco";
      }
    });

    document.querySelectorAll(".timeline-item").forEach(function (item) {
      const title = item.querySelector(".event-title");
      const time = item.querySelector(".time");

      if (
        title &&
        time &&
        title.textContent.trim() === "Ceremony" &&
        time.textContent.trim() === ""
      ) {
        time.textContent = "";
      }
    });
  }

  normalizeCloneText();

  /* ============================================
     AUDIO SETUP
  ============================================ */
  let bgMusic = document.getElementById("bg-music");

  if (!bgMusic) {
    bgMusic = document.createElement("audio");
    bgMusic.id = "bg-music";
    bgMusic.src = "assets/song.m4a";
    bgMusic.loop = true;
    bgMusic.volume = 0;
    document.body.appendChild(bgMusic);
  }

  /* ============================================
     ENVELOPE
  ============================================ */
  let introState = "idle";
  let fadeInterval = null;
  let mainRevealed = false;

  function fadeInMusic() {
    if (fadeInterval) clearInterval(fadeInterval);

    fadeInterval = setInterval(function () {
      if (bgMusic.volume < 0.97) {
        bgMusic.volume = Math.min(bgMusic.volume + 0.02, 1);
      } else {
        bgMusic.volume = 1;
        clearInterval(fadeInterval);
        fadeInterval = null;
      }
    }, 60);
  }

  function revealMain() {
    if (mainRevealed) return;
    mainRevealed = true;

    if (envelopeScreen) {
      envelopeScreen.classList.add("hidden");
    }

    startCountdown();
    observeFadeIns();
    updateActiveNav();
  }

  function handleEnvelopeClick() {
    if (introState !== "idle") return;

    introState = "playing";

    if (introPrompt) {
      introPrompt.classList.add("prompt-hidden");
    }

    musicPlaying = true;
    updateMusicBtn();

    bgMusic.currentTime = 0;
    bgMusic.volume = 0;

    const revealFallback = setTimeout(revealMain, 5000);

    function playVideo() {
      if (!envelopeVideo) {
        clearTimeout(revealFallback);
        revealMain();
        return;
      }

      const playPromise = envelopeVideo.play();

      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(function () {
          clearTimeout(revealFallback);
          revealMain();
        });
      }
    }

    bgMusic
      .play()
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

        if (envelopeScreen) {
          envelopeScreen.classList.add("fading");
        }

        setTimeout(revealMain, 800);
      }
    });

    envelopeVideo.addEventListener("ended", function () {
      if (introState !== "fading") {
        revealMain();
      }
    });
  }

  if (openEnvBtn) {
    openEnvBtn.addEventListener("click", handleEnvelopeClick);
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

  window.addEventListener("pagehide", function () {
    bgMusic.pause();
  });

  /* ============================================
     ACTIVE NAV LINK ON SCROLL
  ============================================ */
  function updateActiveNav() {
    const scrollY = window.scrollY + 130;

    sections.forEach(function (section) {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute("id");

      if (scrollY >= top && scrollY < top + height) {
        navAnchors.forEach(function (anchor) {
          anchor.classList.toggle("active", anchor.getAttribute("href") === "#" + id);
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
      const now = new Date();
      const diff = WEDDING_DATE - now;

      if (diff <= 0) {
        if (cdDays) cdDays.textContent = "0";
        if (cdHours) cdHours.textContent = "00";
        if (cdMinutes) cdMinutes.textContent = "00";
        if (cdSeconds) cdSeconds.textContent = "00";

        if (!countdownDone) {
          countdownDone = true;
          onCountdownComplete();
        }

        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      if (cdDays) cdDays.textContent = days;
      if (cdHours) cdHours.textContent = String(hours).padStart(2, "0");
      if (cdMinutes) cdMinutes.textContent = String(minutes).padStart(2, "0");
      if (cdSeconds) cdSeconds.textContent = String(seconds).padStart(2, "0");
    }

    tick();

    if (!startCountdown.intervalId) {
      startCountdown.intervalId = setInterval(tick, 1000);
    }
  }

  /* ============================================
     COUNTDOWN COMPLETE
  ============================================ */
  function onCountdownComplete() {
    const title = document.querySelector(".countdown-section .section-title");

    if (title && !document.querySelector(".countdown-complete-note")) {
      const note = document.createElement("p");
      note.className = "section-subtitle countdown-complete-note";
      note.textContent = "The celebration has begun!";
      title.parentNode.insertBefore(note, title.nextSibling);
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
      canvas.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:1;";
      section.style.position = "relative";
      section.appendChild(canvas);
    }

    const ctx = canvas.getContext("2d");

    function resize() {
      canvas.width = section.offsetWidth;
      canvas.height = section.offsetHeight;
    }

    resize();
    window.addEventListener("resize", resize);

    const colors = [
      [239, 223, 213],
      [88, 112, 66],
      [169, 180, 148]
    ];

    let particles = [];
    let rockets = [];
    let sparks = [];

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
      this.x = x;
      this.y = y;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.alpha = 1;
      this.life = life || 60 + Math.random() * 40;
      this.decay = 1 / this.life;
      this.color = color;
      this.size = 1.5 + Math.random() * 2;
      this.gravity = 0.025;
    }

    function Spark(x, y, color) {
      this.x = x;
      this.y = y;
      this.vx = (Math.random() - 0.5) * 0.8;
      this.vy = -Math.random() * 1.5;
      this.alpha = 0.8;
      this.life = 30 + Math.random() * 20;
      this.decay = 1 / this.life;
      this.color = color;
      this.size = 1 + Math.random();
    }

    function explode(x, y, color) {
      const count = 60 + Math.floor(Math.random() * 50);

      for (let i = 0; i < count; i += 1) {
        const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.3;
        const speed = 1.5 + Math.random() * 3.5;
        const particleColor = Math.random() > 0.3
          ? color
          : colors[Math.floor(Math.random() * colors.length)];

        particles.push(new Particle(x, y, particleColor, speed, angle));
      }

      for (let j = 0; j < 20; j += 1) {
        particles.push(
          new Particle(x, y, [239, 223, 213], 0.5 + Math.random() * 1.5, Math.random() * Math.PI * 2, 25)
        );
      }
    }

    let frameId = null;
    let lastLaunch = 0;
    let launchInterval = 600;

    function loop(timestamp) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(239,223,213,0.15)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (timestamp - lastLaunch > launchInterval) {
        rockets.push(new Rocket(canvas.width * (0.15 + Math.random() * 0.7)));

        if (Math.random() > 0.5) {
          rockets.push(new Rocket(canvas.width * (0.15 + Math.random() * 0.7)));
        }

        lastLaunch = timestamp;
        launchInterval = 500 + Math.random() * 800;
      }

      for (let r = rockets.length - 1; r >= 0; r -= 1) {
        const rocket = rockets[r];

        rocket.trail.push({ x: rocket.x, y: rocket.y });
        if (rocket.trail.length > 8) rocket.trail.shift();

        rocket.x += rocket.vx;
        rocket.y += rocket.vy;
        rocket.vy *= 0.985;

        rocket.trail.forEach(function (point, index) {
          const alpha = (index / rocket.trail.length) * 0.6;
          ctx.fillStyle = `rgba(${rocket.color[0]},${rocket.color[1]},${rocket.color[2]},${alpha})`;
          ctx.beginPath();
          ctx.arc(point.x, point.y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.fillStyle = "rgba(255,240,200,0.9)";
        ctx.beginPath();
        ctx.arc(rocket.x, rocket.y, 2.5, 0, Math.PI * 2);
        ctx.fill();

        if (Math.random() > 0.4) {
          sparks.push(new Spark(rocket.x, rocket.y, rocket.color));
        }

        if (rocket.y <= rocket.targetY) {
          explode(rocket.x, rocket.y, rocket.color);
          rockets.splice(r, 1);
        }
      }

      for (let p = particles.length - 1; p >= 0; p -= 1) {
        const particle = particles[p];

        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += particle.gravity;
        particle.vx *= 0.99;
        particle.alpha -= particle.decay;

        if (particle.alpha <= 0) {
          particles.splice(p, 1);
          continue;
        }

        ctx.globalAlpha = particle.alpha;
        ctx.fillStyle = `rgb(${particle.color[0]},${particle.color[1]},${particle.color[2]})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * particle.alpha, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = particle.alpha * 0.3;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * particle.alpha * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let s = sparks.length - 1; s >= 0; s -= 1) {
        const spark = sparks[s];

        spark.x += spark.vx;
        spark.y += spark.vy;
        spark.vy += 0.03;
        spark.alpha -= spark.decay;

        if (spark.alpha <= 0) {
          sparks.splice(s, 1);
          continue;
        }

        ctx.globalAlpha = spark.alpha * 0.7;
        ctx.fillStyle = `rgb(${spark.color[0]},${spark.color[1]},${spark.color[2]})`;
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      frameId = requestAnimationFrame(loop);
    }

    let running = false;

    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !running) {
          running = true;
          resize();
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
     SCROLL REVEAL
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
      ".countdown-section .section-subtitle",
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
    if (
      btn.nextElementSibling &&
      btn.nextElementSibling.classList.contains("accordion-panel")
    ) {
      return;
    }

    const labelSpan = btn.querySelector("span:first-child");
    const label = labelSpan ? labelSpan.textContent.trim() : "";
    const items = RESTAURANT_DATA[label];

    const panel = document.createElement("div");
    panel.className = "accordion-panel";
    panel.style.cssText =
      "max-height:0;overflow:hidden;transition:max-height 0.4s ease;" +
      "border-left:1px solid rgba(88,112,66,0.25);" +
      "border-right:1px solid rgba(88,112,66,0.25);" +
      "border-bottom:1px solid rgba(88,112,66,0.25);" +
      "border-radius:0 0 6px 6px;" +
      "margin-top:-0.75rem;margin-bottom:0.75rem;";

    if (items && items.length) {
      const ul = document.createElement("ul");
      ul.className = "restaurant-list";
      ul.style.cssText = "list-style:none;padding:0.75rem 1.25rem 1rem;text-align:left;";

      items.forEach(function (name) {
        const li = document.createElement("li");
        li.textContent = name;
        li.style.cssText =
          "font-family:var(--font-body);font-size:0.92rem;" +
          "color:var(--muted-fg);position:relative;" +
          "padding:0.35rem 0 0.45rem 1rem;" +
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
        if (otherArrow) {
          otherArrow.style.transform = "rotate(0deg)";
        }
      });

      if (!isOpen) {
        btn.classList.add("open");
        panel.style.maxHeight = panel.scrollHeight + "px";

        const arrow = btn.querySelector(".accordion-arrow");
        if (arrow) {
          arrow.style.transform = "rotate(180deg)";
        }
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
    "St Simon Church": "https://maps.app.goo.gl/otE6Xrh9mTWNcGKv5",
    "Chateau Rweiss": "https://maps.app.goo.gl/iyVH4mhKM9Xcf4kg9"
  };

  document.querySelectorAll(".venue-card").forEach(function (card) {
    const nameEl = card.querySelector(".venue-name");
    const mapBtn = card.querySelector(".btn-map");

    if (!nameEl || !mapBtn) return;

    const venueName = nameEl.textContent.trim();
    const url = MAP_LINKS[venueName];

    if (url) {
      mapBtn.setAttribute("href", url);
      mapBtn.setAttribute("target", "_blank");
      mapBtn.setAttribute("rel", "noopener noreferrer");
    }
  });

  /* ============================================
     HOTEL LINKS
  ============================================ */
  const HOTEL_LINKS = {
    "O Monot": "https://www.omonot.com/",
    "Saifi Suites": "https://www.saifisuites.com/",
    "Arthaus Beirut": "https://arthaus.international/your-stay/beirut/",
    "Albergo": "https://www.albergobeirut.com/",
    "Saint George Hotel & Resort": "https://saintgeorgebeirut.com/",
    "Lost": "",
    "Vocco": "",
    "Voco": ""
  };

  document.querySelectorAll(".hotel-pill").forEach(function (pill) {
    const name = pill.textContent.trim();
    const url = HOTEL_LINKS[name];

    if (url) {
      pill.setAttribute("href", url);
      pill.setAttribute("target", "_blank");
      pill.setAttribute("rel", "noopener noreferrer");
    } else {
      pill.setAttribute("href", "#");
      pill.addEventListener("click", function (e) {
        e.preventDefault();
      });
    }
  });

  /* ============================================
     GIFTS
  ============================================ */
  const registryBtn = document.querySelector(".registry-btn");

  if (registryBtn) {
    const details = {
      lbTitle: "Lebanese Accounts",
      lbRows: [
        ["Beneficiary Name", "Isaac Corm"],
        ["Bank", "BLOM Bank"],
        ["Account No.", "1737018"],
        ["IBAN", "LB75 0014 0000 5902 6731 7370 1816"],
        ["BIC / SWIFT", "BLOMLBBX"]
      ],
      intTitle: "International Accounts",
      intRows: [
        ["Account Holder", "Isaac Corm"],
        ["Account Number", "8312130374"],
        ["Routing Number", "026073150"],
        ["SWIFT / BIC", "CMFGUS33"],
        ["Bank Address", "Community Federal Savings Bank<br>89-16 Jamaica Ave, Woodhaven, NY<br>11421, United States"]
      ]
    };

    registryBtn.addEventListener("click", function () {
      if (registryBtn.dataset.open === "true") return;

      registryBtn.dataset.open = "true";

      const card = registryBtn.closest(".registry-card");
      if (!card) return;

      card.classList.add("opened");

      const wrap = document.createElement("div");
      wrap.className = "registry-details";

      function buildTable(title, rows) {
        const section = document.createElement("div");
        section.className = "registry-account-box";

        const h4 = document.createElement("h4");
        h4.textContent = title;
        section.appendChild(h4);

        const table = document.createElement("div");
        table.className = "registry-account-table";

        rows.forEach(function (row) {
          const line = document.createElement("div");
          line.className = "registry-details-row";

          const label = document.createElement("span");
          label.className = "registry-details-label";
          label.textContent = row[0];

          const value = document.createElement("span");
          value.className = "registry-details-value";
          value.innerHTML = row[1];

          line.appendChild(label);
          line.appendChild(value);
          table.appendChild(line);
        });

        section.appendChild(table);
        return section;
      }

      const accounts = document.createElement("div");
      accounts.className = "registry-accounts-grid";
      accounts.appendChild(buildTable(details.lbTitle, details.lbRows));
      accounts.appendChild(buildTable(details.intTitle, details.intRows));
      wrap.appendChild(accounts);

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
     RSVP AJAX
  ============================================ */
  const rsvpContainer = document.querySelector(".rsvp-form-container");

  let currentGuest = null;

  let rsvpChoices = {
    pre_wedding_attendance: "",
    wedding_attendance: "",
    pre_wedding_guest_attendance: "",
    wedding_guest_attendance: ""
  };

  if (rsvpContainer) {
    attachRsvpSearchHandler();
  }

  function attachRsvpSearchHandler() {
    const form = document.getElementById("rsvp-form");
    const input = document.getElementById("guest-name");
    const button = form ? form.querySelector(".btn-submit") : null;

    if (!form || !input || !button) return;

    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      const name = input.value.trim();

      if (!name) {
        showRsvpMessage("Please enter your full name.", "error");
        return;
      }

      button.disabled = true;
      button.textContent = "Checking...";

      try {
        const formData = new FormData();
        formData.append("action", "find");
        formData.append("full_name", name);

        const result = await postRsvpRequest(formData);

        if (result.status === "already_submitted") {
          showRsvpMessage(
            "Your RSVP has already been recorded. If you need to make changes, please contact us directly.",
            "error"
          );
          return;
        }

        if (!result.success) {
          showRsvpMessage(result.message || "Invitation not found.", "error");
          return;
        }

        currentGuest = {
          id: result.guest_id,
          name: result.guest_name
        };

        if (result.status === "found") {
          showInvitationForm(result.guest_name);
        }
      } catch (error) {
        console.error("RSVP search error:", error);
        showRsvpMessage(error.message || "Could not check your invitation. Please try again.", "error");
      } finally {
        button.disabled = false;
        button.textContent = "Find Your Invitation";
      }
    });
  }

  function showInvitationForm(guestName) {
    rsvpChoices = {
      pre_wedding_attendance: "",
      wedding_attendance: "",
      pre_wedding_guest_attendance: "",
      wedding_guest_attendance: ""
    };

    rsvpContainer.innerHTML = `
      <button type="button" class="rsvp-back-btn">← Back</button>

      <div class="rsvp-guest-card">
        <div class="rsvp-heart">♡</div>
        <h3>${escapeHtml(guestName)}</h3>
        <div class="rsvp-star">✦</div>
      </div>

      <div class="rsvp-note-card">
        <div class="rsvp-star-small">✽</div>
        <p><strong>The celebrations will begin before the big day!</strong></p>
        <p>If you can, we encourage you to arrive starting <strong>Tuesday</strong>, as we'll be enjoying a few fun plans throughout the week!<br>More details to follow.</p>
      </div>

      <div class="rsvp-event-card" data-event="pre_wedding_attendance">
        <h3>Pre-Wedding</h3>
        <p>Thursday 18 June 2026</p>
        <em>Details to follow</em>

        <div class="rsvp-event-options" data-event="pre_wedding_attendance">
          <div class="rsvp-event-name">${escapeHtml(guestName)}</div>

          <button type="button" class="rsvp-choice-btn" data-value="attending">
            <span>✓</span>
            Attending
          </button>

          <button type="button" class="rsvp-choice-btn" data-value="declining">
            <span>✕</span>
            Declining
          </button>
        </div>

        <div class="rsvp-event-options guest-plus-one" data-event="pre_wedding_guest_attendance">
          <div class="rsvp-event-name">Guest +1</div>

          <button type="button" class="rsvp-choice-btn" data-value="attending">
            <span>✓</span>
            Attending
          </button>

          <button type="button" class="rsvp-choice-btn" data-value="declining">
            <span>✕</span>
            Declining
          </button>
        </div>
      </div>

      <div class="rsvp-event-card" data-event="wedding_attendance">
        <h3>Wedding</h3>
        <p>Saturday 20 June 2026</p>

        <div class="rsvp-event-options" data-event="wedding_attendance">
          <div class="rsvp-event-name">${escapeHtml(guestName)}</div>

          <button type="button" class="rsvp-choice-btn" data-value="attending">
            <span>✓</span>
            Attending
          </button>

          <button type="button" class="rsvp-choice-btn" data-value="declining">
            <span>✕</span>
            Declining
          </button>
        </div>

        <div class="rsvp-event-options guest-plus-one" data-event="wedding_guest_attendance">
          <div class="rsvp-event-name">Guest +1</div>

          <button type="button" class="rsvp-choice-btn" data-value="attending">
            <span>✓</span>
            Attending
          </button>

          <button type="button" class="rsvp-choice-btn" data-value="declining">
            <span>✕</span>
            Declining
          </button>
        </div>
      </div>

      <button type="button" class="btn-submit rsvp-confirm-btn">
        Send Confirmation
      </button>
    `;

    const backBtn = rsvpContainer.querySelector(".rsvp-back-btn");
    if (backBtn) {
      backBtn.addEventListener("click", resetRsvpSearch);
    }

    rsvpContainer.querySelectorAll(".rsvp-choice-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const optionsGroup = btn.closest(".rsvp-event-options");
        const eventCard = btn.closest(".rsvp-event-card");

        const eventName =
          optionsGroup && optionsGroup.dataset.event
            ? optionsGroup.dataset.event
            : eventCard
              ? eventCard.dataset.event
              : "";

        const value = btn.dataset.value;

        if (!eventName) return;

        rsvpChoices[eventName] = value;

        if (optionsGroup) {
          optionsGroup.querySelectorAll(".rsvp-choice-btn").forEach(function (otherBtn) {
            otherBtn.classList.remove("selected");
          });
        }

        btn.classList.add("selected");
      });
    });

    const confirmBtn = rsvpContainer.querySelector(".rsvp-confirm-btn");
    if (confirmBtn) {
      confirmBtn.addEventListener("click", submitFinalRsvp);
    }
  }

  async function submitFinalRsvp() {
    if (!currentGuest) return;

    if (!rsvpChoices.pre_wedding_attendance) {
      showRsvpMessage("Please select your Pre-Wedding attendance.", "error");
      return;
    }

    if (!rsvpChoices.wedding_attendance) {
      showRsvpMessage("Please select your Wedding attendance.", "error");
      return;
    }

    if (!rsvpChoices.pre_wedding_guest_attendance) {
      showRsvpMessage("Please select your Guest +1 Pre-Wedding attendance.", "error");
      return;
    }

    if (!rsvpChoices.wedding_guest_attendance) {
      showRsvpMessage("Please select your Guest +1 Wedding attendance.", "error");
      return;
    }

    const confirmBtn = rsvpContainer.querySelector(".rsvp-confirm-btn");
    if (!confirmBtn) return;

    confirmBtn.disabled = true;
    confirmBtn.textContent = "Sending...";

    try {
      const formData = new FormData();
      formData.append("action", "submit");
      formData.append("guest_id", currentGuest.id);
      formData.append("full_name", currentGuest.name);
      formData.append("pre_wedding_attendance", rsvpChoices.pre_wedding_attendance);
      formData.append("wedding_attendance", rsvpChoices.wedding_attendance);
      formData.append("pre_wedding_guest_attendance", rsvpChoices.pre_wedding_guest_attendance);
      formData.append("wedding_guest_attendance", rsvpChoices.wedding_guest_attendance);

      const result = await postRsvpRequest(formData);

      if (result.success) {
        resetRsvpSearch();
        showRsvpMessage("Thank you! Your RSVP was submitted successfully.", "success");
      } else {
        showRsvpMessage(result.message || "Could not submit RSVP.", "error");
      }
    } catch (error) {
      console.error("RSVP submit error:", error);
      showRsvpMessage(error.message || "Could not submit RSVP. Please try again.", "error");
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.textContent = "Send Confirmation";
    }
  }

  function resetRsvpSearch() {
    currentGuest = null;

    if (!rsvpContainer) return;

    rsvpContainer.innerHTML = `
      <form id="rsvp-form" class="rsvp-form" action="${escapeHtml(RSVP_API_URL)}" method="POST">
        <input type="hidden" name="action" value="find">

        <p class="rsvp-form-title">Find your invitation</p>

        <label for="guest-name" class="form-label">Your Full Name</label>

        <input
          type="text"
          id="guest-name"
          name="full_name"
          placeholder="Enter your name as it appears on your invitation"
          required
          class="form-input"
        >

        <button type="submit" class="btn-submit">
          Find Your Invitation
        </button>
      </form>
    `;

    attachRsvpSearchHandler();
  }

  function showRsvpMessage(text, type) {
    const existing = document.querySelector(".rsvp-inline-msg");
    if (existing) existing.remove();

    const msg = document.createElement("p");
    msg.className = "rsvp-inline-msg";
    msg.textContent = text;

    msg.style.cssText =
      "font-family:var(--font-body);font-size:1.25rem;" +
      "margin-top:1.8rem;text-align:center;line-height:1.6;" +
      (type === "error" ? "color:#9c4f5a;" : "color:var(--sage-dark);");

    if (rsvpContainer) {
      rsvpContainer.appendChild(msg);
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  /* ============================================
     DISCOVER LEBANON PAGE
     Creates the full destination page from JS, so HTML/CSS stay as-is.
  ============================================ */
  const discoverMainBtn = document.querySelector(".discover-main-btn");

  const DISCOVER_DESTINATIONS = [
    { title: "Beirut", image: "assets/beirut.webp", text: "Saifi · Downtown · Musee de Sursock · Gemayze · MK" },
    { title: "Baalbek", image: "assets/baalbek.webp", text: "Ancient Roman temples & UNESCO heritage" },
    { title: "Jbeil — Byblos", image: "assets/byblos.webp", text: "One of the oldest continuously inhabited cities" },
    { title: "Batroun", image: "assets/batroun.webp", text: "Charming coastal town & seaside dining" },
    { title: "Jeita Grotto", image: "assets/jeita.webp", text: "Stunning limestone caves & underground river" },
    { title: "Harissa", image: "assets/harissa.webp", text: "Our Lady of Lebanon & panoramic views" },
    { title: "Beiteddine Palace", image: "assets/beiteddine.webp", text: "19th-century palace & Mir Amine" },
    { title: "Cedars of God", image: "assets/cedars.webp", text: "Ancient cedars & Wadi Qannoubine" },
    { title: "Wine Tasting", image: "assets/wine-tasting.webp", text: "Ixsir winery & Lebanese vineyards" },
    { title: "Hiking", image: "assets/hiking.webp", text: "Tannourine · Cedars of God · Barouk" },
    { title: "Mar Charbel", image: "assets/mar-charbel.webp", text: "Historic monastery & pilgrimage site" }
  ];

  function ensureDiscoverPage() {
    let page = document.getElementById("discover-page");
    if (page) return page;

    page = document.createElement("section");
    page.id = "discover-page";
    page.className = "discover-page";
    page.hidden = true;

    page.innerHTML = `
      <div class="discover-page-hero">
        <img src="assets/lebanon.webp" alt="Lebanon" class="discover-page-bg">

        <div class="discover-page-content">
          <h1>Discover Lebanon</h1>
          <p>While you're here, explore the beauty of this ancient land</p>
        </div>
      </div>

      <div class="discover-destinations-grid"></div>

      <button type="button" class="back-to-wedding-btn">
        ← Back to Wedding
      </button>
    `;

    const grid = page.querySelector(".discover-destinations-grid");

    DISCOVER_DESTINATIONS.forEach(function (destination) {
      const card = document.createElement("article");
      card.className = "destination-card";

      card.innerHTML = `
        <img src="${destination.image}" alt="${escapeHtml(destination.title)}">
        <h3>${escapeHtml(destination.title)}</h3>
        <p>${escapeHtml(destination.text)}</p>
      `;

      grid.appendChild(card);
    });

    document.body.appendChild(page);
    return page;
  }

  function setWeddingPageVisible(isVisible) {
    document
      .querySelectorAll("header, .music-btn, body > section:not(#discover-page), footer")
      .forEach(function (el) {
        el.style.display = isVisible ? "" : "none";
      });
  }

  if (discoverMainBtn) {
    discoverMainBtn.addEventListener("click", function (e) {
      e.preventDefault();

      const page = ensureDiscoverPage();
      const backBtn = page.querySelector(".back-to-wedding-btn");

      setWeddingPageVisible(false);
      page.hidden = false;
      page.style.display = "block";
      window.scrollTo({ top: 0, behavior: "smooth" });

      if (backBtn && !backBtn.dataset.bound) {
        backBtn.dataset.bound = "true";

        backBtn.addEventListener("click", function () {
          page.hidden = true;
          page.style.display = "none";
          setWeddingPageVisible(true);

          const discoverSection = document.getElementById("discover");
          if (discoverSection) {
            discoverSection.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        });
      }
    });
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
  updateMusicBtn();

  if (!envelopeVideo || !envelopeVideo.src) {
    revealMain();
  }
})();
