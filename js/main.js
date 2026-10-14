document.querySelectorAll('[data-current-year]').forEach((element) => {
  element.textContent = new Date().getFullYear();
});

const countdownElements = {
  days: document.getElementById('days'),
  hours: document.getElementById('hours'),
  minutes: document.getElementById('minutes'),
  seconds: document.getElementById('seconds'),
};

const targetDate = new Date(2026, 10, 1, 0, 0, 0);
const pad = (value) => String(value).padStart(2, '0');
let timer;

function updateCountdown() {
  if (Object.values(countdownElements).some((element) => !element)) {
    if (timer) clearInterval(timer);
    return;
  }

  const difference = targetDate.getTime() - Date.now();
  const totalSeconds = Math.max(0, Math.floor(difference / 1000));

  countdownElements.days.textContent = pad(Math.floor(totalSeconds / 86400));
  countdownElements.hours.textContent = pad(Math.floor((totalSeconds % 86400) / 3600));
  countdownElements.minutes.textContent = pad(Math.floor((totalSeconds % 3600) / 60));
  countdownElements.seconds.textContent = pad(totalSeconds % 60);

  if (difference <= 0 && timer) clearInterval(timer);
}

updateCountdown();
if (targetDate.getTime() > Date.now() && Object.values(countdownElements).every(Boolean)) {
  timer = setInterval(updateCountdown, 1000);
}
class ParticlesBg {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.opts = Object.assign({
      density: 9000,            // px² per particle (higher = fewer particles)
      maxParticles: 160,
      color: '79, 140, 255',    // RGB of dots and lines
      size: [1, 2.5],           // min/max radius
      speed: 0.35,              // base velocity
      linkDistance: 130,        // max distance to draw a line
      mouseRadius: 160,         // mouse interaction radius
      mouseMode: 'repel',       // 'repel' | 'attract' | 'link' | 'none'
    }, options);

    this.particles = [];
    this.mouse = { x: null, y: null };
    this.running = false;
    this.visible = true;
    this.reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    this._loop = this._loop.bind(this);
    this._onResize = this._onResize.bind(this);

    this._bind();
    this._resize();
    this.start();
  }

  _bind() {
    window.addEventListener('resize', this._onResize);

    // Track the mouse on the parent so it works even under overlaying content
    const host = this.canvas.parentElement;
    host.addEventListener('pointermove', e => {
      const r = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - r.left;
      this.mouse.y = e.clientY - r.top;
    });
    host.addEventListener('pointerleave', () => { this.mouse.x = this.mouse.y = null; });

    // Pause when the hero is off-screen or the tab is hidden
    new IntersectionObserver(([en]) => {
      this.visible = en.isIntersecting;
      this.visible ? this.start() : this.stop();
    }).observe(this.canvas);

    document.addEventListener('visibilitychange', () => {
      document.hidden ? this.stop() : (this.visible && this.start());
    });
  }

  _onResize() {
    clearTimeout(this._t);
    this._t = setTimeout(() => this._resize(), 150);
  }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { width, height } = this.canvas.getBoundingClientRect();
    this.w = width;
    this.h = height;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const target = Math.min(
      this.opts.maxParticles,
      Math.floor((width * height) / this.opts.density)
    );
    while (this.particles.length < target) this.particles.push(this._create());
    this.particles.length = target;
    this.particles.forEach(p => {
      p.x = Math.min(p.x, this.w);
      p.y = Math.min(p.y, this.h);
    });

    if (!this.running) this._draw();
  }

  _create() {
    const { size, speed } = this.opts;
    const angle = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random() * 0.9);
    return {
      x: Math.random() * this.w,
      y: Math.random() * this.h,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      r: size[0] + Math.random() * (size[1] - size[0]),
    };
  }

  _update() {
    const { mouseRadius, mouseMode, speed } = this.opts;
    const mx = this.mouse.x, my = this.mouse.y;

    for (const p of this.particles) {
      if (mx !== null && (mouseMode === 'repel' || mouseMode === 'attract')) {
        const dx = p.x - mx, dy = p.y - my;
        const d2 = dx * dx + dy * dy;
        if (d2 < mouseRadius * mouseRadius && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const f = (1 - d / mouseRadius) * 0.6;
          const dir = mouseMode === 'repel' ? 1 : -1;
          p.vx += (dx / d) * f * dir * 0.2;
          p.vy += (dy / d) * f * dir * 0.2;
        }
      }

      const sp = Math.hypot(p.vx, p.vy);
      const max = speed * 3;
      if (sp > max) { p.vx = (p.vx / sp) * max; p.vy = (p.vy / sp) * max; }
      p.vx *= 0.995; p.vy *= 0.995;
      if (sp < speed * 0.3) { p.vx *= 1.05; p.vy *= 1.05; }

      p.x += p.vx;
      p.y += p.vy;

      if (p.x < -10) p.x = this.w + 10; else if (p.x > this.w + 10) p.x = -10;
      if (p.y < -10) p.y = this.h + 10; else if (p.y > this.h + 10) p.y = -10;
    }
  }

  _draw() {
    const { ctx, particles: ps } = this;
    const { color, linkDistance, mouseRadius, mouseMode } = this.opts;
    const ld2 = linkDistance * linkDistance;

    ctx.clearRect(0, 0, this.w, this.h);

    ctx.lineWidth = 1;
    for (let i = 0; i < ps.length; i++) {
      const a = ps[i];
      for (let j = i + 1; j < ps.length; j++) {
        const b = ps[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < ld2) {
          ctx.strokeStyle = `rgba(${color}, ${(1 - d2 / ld2) * 0.5})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      if (mouseMode === 'link' && this.mouse.x !== null) {
        const dx = a.x - this.mouse.x, dy = a.y - this.mouse.y;
        const d = Math.hypot(dx, dy);
        if (d < mouseRadius) {
          ctx.strokeStyle = `rgba(${color}, ${(1 - d / mouseRadius) * 0.8})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(this.mouse.x, this.mouse.y);
          ctx.stroke();
        }
      }
    }

    ctx.fillStyle = `rgba(${color}, 0.9)`;
    for (const p of ps) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _loop() {
    if (!this.running) return;
    this._update();
    this._draw();
    this._raf = requestAnimationFrame(this._loop);
  }

  start() {
    if (this.running || this.reduceMotion) { this._draw(); return; }
    this.running = true;
    this._raf = requestAnimationFrame(this._loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this._raf);
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this._onResize);
  }
}

// Auto-init on <canvas id="particles">. Remove if you init it yourself.
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('particles');
  if (canvas) new ParticlesBg(canvas, {
    // color: '255, 255, 255',
    // mouseMode: 'attract',
    // linkDistance: 150,
  });
});
