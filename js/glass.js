/* Liquid Glass v2.
   Для каждого .glass считаем «карту смещения» (canvas): в центре пиксели не двигаются,
   у края сдвигаются по выпуклому профилю — как у толстого стекла. Карта идёт в SVG-фильтр
   feDisplacementMap, а тот — в backdrop-filter. Блюра нет, центр остаётся чётким.
   Преломление видно в Chrome/Edge; в остальных браузерах — чистое стекло с кромкой. */
(() => {
  if (!/Chrome\/|Chromium|Edg\//.test(navigator.userAgent)) return;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', 0); svg.setAttribute('height', 0);
  svg.setAttribute('aria-hidden', 'true'); svg.style.position = 'absolute';
  document.body.prepend(svg);
  let uid = 0;

  // Карта: R,G = направление и сила сдвига (128 = без сдвига)
  function makeMap(w, h, r, b, k) {
    const cw = Math.ceil(w * k), ch = Math.ceil(h * k);
    const c = document.createElement('canvas'); c.width = cw; c.height = ch;
    const ctx = c.getContext('2d'), img = ctx.createImageData(cw, ch), d = img.data;
    const hx = w / 2, hy = h / 2;
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const px = (x + .5) / k - hx, py = (y + .5) / k - hy;
      const qx = Math.abs(px) - (hx - r), qy = Math.abs(py) - (hy - r);
      const ox = Math.max(qx, 0), oy = Math.max(qy, 0), len = Math.hypot(ox, oy);
      const dist = -(len + Math.min(Math.max(qx, qy), 0) - r);   // расстояние до края внутрь
      let R = 128, G = 128;
      if (dist < b) {
        let nx, ny;                                              // нормаль наружу
        if (len > 0) { nx = Math.sign(px) * ox / len; ny = Math.sign(py) * oy / len; }
        else if (qx > qy) { nx = Math.sign(px); ny = 0; } else { nx = 0; ny = Math.sign(py); }
        const t = 1 - Math.max(dist, 0) / b, m = 1 - Math.sqrt(1 - t * t); // выпуклый профиль
        R = 128 - 127 * nx * m; G = 128 - 127 * ny * m;
      }
      const i = (y * cw + x) * 4; d[i] = R; d[i + 1] = G; d[i + 2] = 128; d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL();
  }

  function update(el) {
    const w = el.offsetWidth, h = el.offsetHeight; if (!w || !h) return;
    const cs = getComputedStyle(el);
    let r = cs.borderTopLeftRadius; r = r.includes('%') ? parseFloat(r) / 100 * Math.min(w, h) : parseFloat(r);
    r = Math.min(r || 0, w / 2, h / 2);
    const b = Math.min(parseFloat(cs.getPropertyValue('--glass-bezel')) || 22, Math.min(w, h) / 2);
    const depth = parseFloat(cs.getPropertyValue('--glass-depth')) || 1;
    if (!el._gf) {
      el._gf = 'glass-f' + (++uid);
      svg.insertAdjacentHTML('beforeend',
        `<filter id="${el._gf}" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
           <feImage preserveAspectRatio="none" result="m"/>
           <feDisplacementMap in="SourceGraphic" in2="m" xChannelSelector="R" yChannelSelector="G"/></filter>`);
      el.style.backdropFilter = `url(#${el._gf}) saturate(1.4)`;
    }
    const f = svg.querySelector('#' + el._gf), k = w * h > 200000 ? .5 : 1;
    ['x', 'y'].forEach(a => f.setAttribute(a, 0));
    f.setAttribute('width', w); f.setAttribute('height', h);
    const im = f.querySelector('feImage');
    im.setAttribute('width', w); im.setAttribute('height', h); im.setAttribute('x', 0); im.setAttribute('y', 0);
    im.setAttribute('href', makeMap(w, h, r, b, k));
    f.querySelector('feDisplacementMap').setAttribute('scale', 2 * b * depth);
  }

  const ro = new ResizeObserver(es => es.forEach(e => update(e.target)));
  const scan = () => document.querySelectorAll('.glass').forEach(el => { if (!el._ro) { el._ro = 1; ro.observe(el); } });
  scan(); window.Glass = { refresh: scan };   // для элементов, добавленных позже: Glass.refresh()

  // Свет за курсором для .glass--live
  document.addEventListener('pointermove', e => {
    const el = e.target.closest?.('.glass--live'); if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--glass-x', ((e.clientX - r.left) / r.width * 100 - 7) + '%');
  });
})();
