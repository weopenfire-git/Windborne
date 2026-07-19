// ============================================================
// FlightLog — App Logic
// ============================================================

const STORAGE_KEY = 'flightlog_data';

// ===== Data Layer =====
function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) return JSON.parse(raw);
  return getInitialData();
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getInitialData() {
  return {
    user: {
      name: "飞行记录",
      regNo: "Reg. Unknown",
      bio: "记录每一次飞行",
      avatar: null
    },
    flights: [
      {
        id: "zh9507-20260730",
        date: "2026-07-30",
        flightNumber: "ZH9507",
        from: { icao: "ZGSZ", name: "深圳宝安", lat: 22.6393, lng: 113.8107 },
        to: { icao: "ZSSS", name: "上海虹桥", lat: 31.1443, lng: 121.8083 },
        aircraft: { model: "A350-900", reg: "" },
        airline: "深圳航空",
        seat: "40L",
        seatPosition: "window",
        cabinClass: "经济舱",
        purpose: "终点无锡",
        via: "",
        arrivalCity: "上海",
        pax: "",
        takeoffWeight: "",
        fuelOnboard: "",
        crzAlt: "",
        crzSpeed: "",
        v1: "", vr: "", v2: "",
        flightLevel: "",
        embark: "廊桥",
        disembark: "廊桥",
        departure: { terminal: "T3", gate: "304", runway: "", parkingBay: "", scheduledTime: "17:05", actualTime: "" },
        arrival: { terminal: "T2", runway: "", actualTime: "", parkingBay: "", vref: "", apprProgram: "" },
        reflections: "",
        captainLog: "",
        firstOfficerNotes: "",
        purserNotes: "",
        ticketImages: [],
        photos: []
      }
    ]
  };
}

// ===== State =====
let currentData = loadData();
let currentFlightId = null;
let editingFlightId = null;
let tempTicketImages = [];

// ===== Helpers =====
function generateId() { return 'fl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6); }

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function readFileAsBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// Convert lat/lng to SVG coords (simple equirectangular approx)
function latLngToSvg(lat, lng) {
  const x = ((lng + 180) / 360) * 1000;
  const y = ((90 - lat) / 180) * 500;
  return { x, y };
}

// Estimate distance between two airports in km (Haversine)
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2;
  return Math.round(2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

// Estimate duration from distance (assume avg 850 km/h)
function estimateDurationKm(distance) {
  return Math.round(distance / 850 * 10) / 10;
}

// Count unique items
function uniqueCount(items) { return new Set(items).size; }

function getAirportCount(flights) {
  const set = new Set();
  flights.forEach(f => { set.add(f.from.icao); set.add(f.to.icao); });
  return set.size;
}

function getAircraftList(flights) {
  const map = {};
  flights.forEach(f => { const m = f.aircraft?.model || 'Unknown'; map[m] = (map[m] || 0) + 1; });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

function getAirlineList(flights) {
  const map = {};
  flights.forEach(f => { const a = f.airline || 'Unknown'; map[a] = (map[a] || 0) + 1; });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

function getTotalDistance(flights) {
  return flights.reduce((sum, f) => {
    if (!f.from || !f.to || !f.from.lat || !f.to.lat) return sum;
    return sum + haversine(f.from.lat, f.from.lng, f.to.lat, f.to.lng);
  }, 0);
}

function getTotalHours(flights) {
  return flights.reduce((sum, f) => {
    if (!f.from || !f.to || !f.from.lat || !f.to.lat) return sum;
    return sum + estimateDurationKm(haversine(f.from.lat, f.from.lng, f.to.lat, f.to.lng));
  }, 0);
}

// ===== View System =====
function switchView(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('view--active'));
  const el = document.getElementById('view-' + viewName);
  if (el) el.classList.add('view--active');

  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  const nav = document.querySelector(`.nav-links a[data-view="${viewName}"]`);
  if (nav) nav.classList.add('active');

  window.scrollTo({ top: 0, behavior: 'smooth' });

  switch (viewName) {
    case 'home': renderHome(); break;
    case 'flights': renderFlights(); break;
    case 'map': renderMap(); break;
    case 'stats': renderStats(); break;
    case 'settings': renderSettings(); break;
  }
}

// ===== Render Home =====
function renderHome() {
  const user = currentData.user;
  // Avatar
  const img = document.getElementById('hero-avatar-img');
  const ph = document.getElementById('hero-avatar-placeholder');
  if (user.avatar) { img.src = user.avatar; img.style.display = 'block'; ph.style.display = 'none'; }
  else { img.style.display = 'none'; ph.style.display = 'flex'; ph.textContent = (user.name[0] || '?' ); }

  document.getElementById('hero-name').textContent = user.name;
  document.getElementById('hero-reg').textContent = user.regNo;
  document.getElementById('hero-bio').textContent = user.bio;

  // Stats
  animateNumber('stat-flights', currentData.flights.length, 0);
  animateNumber('stat-hours', Math.round(getTotalHours(currentData.flights) * 10) / 10, 0);
  animateNumber('stat-distance', Math.round(getTotalDistance(currentData.flights)), 0);
  animateNumber('stat-airports', getAirportCount(currentData.flights), 0);

  // Recent flights
  const list = document.getElementById('recent-flights-list');
  const recent = currentData.flights.slice(-4).reverse();
  if (recent.length === 0) { list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✈</div><p>还没有记录航程，快去添加第一班吧！</p></div>'; return; }
  list.innerHTML = recent.map(f => renderFlightCard(f)).join('');
  list.querySelectorAll('.flight-card').forEach(c => {
    c.addEventListener('click', () => { currentFlightId = c.dataset.id; switchView('flight-detail'); renderFlightDetail(); });
  });
}

function animateNumber(id, target, decimals) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = parseFloat(el.textContent) || 0;
  const duration = 800;
  const t0 = performance.now();
  function tick(now) {
    const p = Math.min((now - t0) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    const val = start + (target - start) * ease;
    el.textContent = decimals === 0 ? Math.round(val) : val.toFixed(decimals);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function renderFlightCard(f) {
  const hasTickets = f.ticketImages && f.ticketImages.length > 0;
  return `
  <div class="flight-card" data-id="${f.id}">
    <div class="card-header">
      <span class="card-flight-no">${f.flightNumber || 'N/A'}</span>
      <span class="card-date">${f.date || ''}</span>
    </div>
    <div class="card-route">
      <div class="card-from">
        <div class="icao">${f.from?.icao || '??'}</div>
        <div class="name">${f.from?.name || ''}</div>
      </div>
      <div class="card-arrow">——</div>
      <div class="card-to">
        <div class="icao">${f.to?.icao || '??'}</div>
        <div class="name">${f.to?.name || ''}</div>
      </div>
    </div>
    <div class="card-meta">
      <span>✈ ${f.aircraft?.model || 'N/A'}</span>
      <span>🪑 ${f.seat || 'N/A'}</span>
      <span class="card-tag">${f.cabinClass || '经济舱'}</span>
      ${hasTickets ? '<span>🎫</span>' : ''}
    </div>
  </div>`;
}

// ===== Render Flights List =====
function renderFlights() {
  const list = document.getElementById('all-flights-list');
  const flights = [...currentData.flights].reverse();
  if (flights.length === 0) { list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✈</div><p>还没有记录航程</p><button class="btn-hud btn-primary" data-view="add-flight">记录第一班</button></div>'; return; }
  list.innerHTML = flights.map(f => renderFlightCard(f)).join('');
  list.querySelectorAll('.flight-card').forEach(c => {
    c.addEventListener('click', () => { currentFlightId = c.dataset.id; switchView('flight-detail'); renderFlightDetail(); });
  });
}

// ===== Render Flight Detail =====
function renderFlightDetail() {
  const f = currentData.flights.find(f => f.id === currentFlightId);
  if (!f) return;
  const content = document.getElementById('flight-detail-content');

  const hasTickets = f.ticketImages && f.ticketImages.length > 0;
  const ticketGallery = hasTickets ? `
    <div class="detail-notes">
      <div class="detail-notes-title">票据粘贴处</div>
      <div class="image-preview">${f.ticketImages.map((img, i) => `<img class="preview-img" src="${img}" data-index="${i}">`).join('')}</div>
    </div>
  ` : '';

  const notes = [];
  if (f.reflections) notes.push({ title: '乘客留言', text: f.reflections });
  if (f.captainLog) notes.push({ title: '机长留言', text: f.captainLog });
  if (f.firstOfficerNotes) notes.push({ title: '副机长留言', text: f.firstOfficerNotes });
  if (f.purserNotes) notes.push({ title: '乘务长留言', text: f.purserNotes });
  const notesHTML = notes.length > 0 ? notes.map(n => `
    <div class="detail-notes">
      <div class="detail-notes-title">${n.title}</div>
      <p>${escapeHtml(n.text)}</p>
    </div>
  `).join('') : '';

  content.innerHTML = `
    <div class="detail-flight-header">
      <div>
        <div class="detail-flight-no">${f.flightNumber || 'N/A'}</div>
        <div class="detail-date">${f.date || ''} &nbsp;|&nbsp; ${f.airline || ''}</div>
      </div>
      <span class="card-tag">${f.cabinClass || '经济舱'}</span>
    </div>

    <div class="detail-grid">
      <div class="detail-group">
        <div class="detail-group-title">飞行信息</div>
        ${row('日期', f.date)}${row('航班号', f.flightNumber)}${row('航空公司', f.airline)}
        ${row('起飞机场', `${f.from?.name || ''} (${f.from?.icao || ''})`)}
        ${row('目的机场', `${f.to?.name || ''} (${f.to?.icao || ''})`)}
        ${row('机型', f.aircraft?.model)}${row('注册号', f.aircraft?.reg)}
        ${row('座位', f.seat + (f.seatPosition ? ` (${posLabel(f.seatPosition)})` : ''))}
      </div>
      <div class="detail-group">
        <div class="detail-group-title">航行参数</div>
        ${row('经停', f.via)}${row('到达地', f.arrivalCity)}${row('飞行目的', f.purpose)}
        ${row('V1', f.v1)}${row('Vr', f.vr)}${row('V2', f.v2)}
        ${row('飞行层级', f.flightLevel)}${row('巡航高度', f.crzAlt)}${row('巡航速度', f.crzSpeed)}
      </div>
      <div class="detail-group">
        <div class="detail-group-title">离场信息</div>
        ${row('航站楼', f.departure?.terminal)}${row('登机口', f.departure?.gate)}
        ${row('跑道', f.departure?.runway)}${row('停机位', f.departure?.parkingBay)}
        ${row('预计起飞', f.departure?.scheduledTime)}${row('实际起飞', f.departure?.actualTime)}
      </div>
      <div class="detail-group">
        <div class="detail-group-title">到达信息</div>
        ${row('航站楼', f.arrival?.terminal)}${row('着陆跑道', f.arrival?.runway)}
        ${row('停机位', f.arrival?.parkingBay)}${row('实际到达', f.arrival?.actualTime)}
        ${row('Vref/VLS', f.arrival?.vref)}${row('进场程序', f.arrival?.apprProgram)}
      </div>
    </div>

    ${notesHTML}
    ${ticketGallery}
  `;

  // Lightbox
  content.querySelectorAll('.preview-img').forEach(img => {
    img.addEventListener('click', () => {
      const overlay = document.createElement('div'); overlay.className = 'lightbox-overlay';
      overlay.innerHTML = `<img src="${img.src}" alt="ticket">`;
      overlay.addEventListener('click', () => overlay.remove());
      document.body.appendChild(overlay);
    });
  });
}

function row(label, value) {
  if (!value || value === '' || value === 'undefined') return '';
  return `<div class="detail-row"><label>${label}</label><span class="value">${escapeHtml(String(value))}</span></div>`;
}

function posLabel(p) {
  const map = { window: '靠窗', middle: '中间', aisle: '过道' };
  return map[p] || p;
}

function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ===== Add Flight Form =====
function initAddForm() {
  const form = document.getElementById('flight-form');
  const upload = document.getElementById('ticket-upload');
  const preview = document.getElementById('ticket-preview');
  tempTicketImages = [];

  upload.addEventListener('change', async () => {
    for (const file of upload.files) {
      try { const base64 = await readFileAsBase64(file); tempTicketImages.push(base64); }
      catch (e) { console.error(e); }
    }
    renderTicketPreview(preview, tempTicketImages);
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(form);
    const flight = {
      id: editingFlightId || generateId(),
      date: fd.get('date'),
      flightNumber: fd.get('flightNumber'),
      from: { icao: fd.get('fromIcao'), name: fd.get('fromName'), lat: 0, lng: 0 },
      to: { icao: fd.get('toIcao'), name: fd.get('toName'), lat: 0, lng: 0 },
      aircraft: { model: fd.get('aircraftModel'), reg: fd.get('aircraftReg') },
      airline: fd.get('airline'),
      seat: fd.get('seat'),
      seatPosition: fd.get('seatPosition'),
      cabinClass: fd.get('cabinClass'),
      purpose: fd.get('purpose'),
      via: fd.get('via'),
      arrivalCity: fd.get('arrivalCity'),
      pax: '', takeoffWeight: '', fuelOnboard: '',
      crzAlt: fd.get('crzAlt'), crzSpeed: fd.get('crzSpeed'),
      v1: fd.get('v1'), vr: fd.get('vr'), v2: fd.get('v2'),
      flightLevel: fd.get('flightLevel'),
      embark: fd.get('embark'), disembark: fd.get('disembark'),
      departure: { terminal: fd.get('depTerminal'), gate: fd.get('depGate'), runway: fd.get('depRunway'), parkingBay: fd.get('depParkingBay'), scheduledTime: fd.get('depScheduledTime'), actualTime: fd.get('depActualTime') },
      arrival: { terminal: fd.get('arrTerminal'), runway: fd.get('arrRunway'), actualTime: fd.get('arrActualTime'), parkingBay: fd.get('arrParkingBay'), vref: fd.get('vref'), apprProgram: fd.get('apprProgram') },
      reflections: fd.get('reflections'),
      captainLog: fd.get('captainLog'),
      firstOfficerNotes: fd.get('firstOfficerNotes'),
      purserNotes: fd.get('purserNotes'),
      ticketImages: [...tempTicketImages],
      photos: []
    };

    if (editingFlightId) {
      const idx = currentData.flights.findIndex(f => f.id === editingFlightId);
      if (idx >= 0) currentData.flights[idx] = flight;
    } else {
      currentData.flights.push(flight);
    }
    saveData(currentData);
    const isEdit = !!editingFlightId;
    tempTicketImages = [];
    form.reset();
    preview.innerHTML = '';
    editingFlightId = null;
    showToast(isEdit ? '航程已更新' : '航程已保存');
    switchView('flights');
  });

  document.getElementById('btn-cancel').addEventListener('click', () => {
    tempTicketImages = []; form.reset(); preview.innerHTML = '';
    editingFlightId = null; switchView('flights');
  });
}

function renderTicketPreview(el, images) {
  el.innerHTML = images.map((img, i) => `<img class="preview-img" src="${img}" data-index="${i}">`).join('');
  el.querySelectorAll('.preview-img').forEach(img => {
    img.addEventListener('click', () => {
      const idx = parseInt(img.dataset.index);
      tempTicketImages.splice(idx, 1); renderTicketPreview(el, tempTicketImages);
    });
  });
}

// ===== Map =====
function renderMap() {
  const routes = document.getElementById('map-routes');
  const airports = document.getElementById('map-airports');
  routes.innerHTML = ''; airports.innerHTML = '';

  const visited = new Set();
  const routeLines = [];

  currentData.flights.forEach(f => {
    if (!f.from || !f.to || !f.from.lat || !f.to.lat) return;
    const fromPt = latLngToSvg(f.from.lat, f.from.lng);
    const toPt = latLngToSvg(f.to.lat, f.to.lng);

    // Airport markers
    visited.add(`${f.from.icao},${f.from.lat},${f.from.lng}`);
    visited.add(`${f.to.icao},${f.to.lat},${f.to.lng}`);

    // Route line (curved)
    const midX = (fromPt.x + toPt.x) / 2;
    const midY = (fromPt.y + toPt.y) / 2 - 30; // arc up
    const d = `M ${fromPt.x} ${fromPt.y} Q ${midX} ${midY} ${toPt.x} ${toPt.y}`;
    routeLines.push(`<path class="map-route" d="${d}"/>`);
  });

  routes.innerHTML = routeLines.join('');

  const airportMarkers = Array.from(visited).map(s => {
    const [icao, lat, lng] = s.split(',');
    const pt = latLngToSvg(parseFloat(lat), parseFloat(lng));
    return `<circle class="map-airport" cx="${pt.x}" cy="${pt.y}" r="4"/>`;
  });
  airports.innerHTML = airportMarkers.join('');
}

// ===== Stats =====
function renderStats() {
  const dashboard = document.getElementById('stats-dashboard');
  const flights = currentData.flights;
  const totalDist = getTotalDistance(flights);
  const totalHours = Math.round(getTotalHours(flights) * 10) / 10;
  const airportCount = getAirportCount(flights);
  const aircraftList = getAircraftList(flights);
  const airlineList = getAirlineList(flights);

  dashboard.innerHTML = `
    <div class="stat-detail-card">
      <div class="stat-title">总飞行次数</div>
      <div class="stat-value">${flights.length}</div>
    </div>
    <div class="stat-detail-card">
      <div class="stat-title">总飞行距离</div>
      <div class="stat-value">${totalDist.toLocaleString()} <span style="font-size:0.9rem;color:var(--text-muted)">km</span></div>
    </div>
    <div class="stat-detail-card">
      <div class="stat-title">总飞行时长</div>
      <div class="stat-value">${totalHours} <span style="font-size:0.9rem;color:var(--text-muted)">h</span></div>
    </div>
    <div class="stat-detail-card">
      <div class="stat-title">到访机场</div>
      <div class="stat-value">${airportCount}</div>
    </div>
    <div class="stat-detail-card" style="grid-column: span 2;">
      <div class="stat-title">机型统计</div>
      <div class="stat-list">${aircraftList.slice(0, 10).map(([name, count]) => `
        <div class="stat-list-item"><span>${name}</span><span class="value">${count} 次</span></div>
      `).join('')}</div>
    </div>
    <div class="stat-detail-card" style="grid-column: span 2;">
      <div class="stat-title">航空公司统计</div>
      <div class="stat-list">${airlineList.slice(0, 10).map(([name, count]) => `
        <div class="stat-list-item"><span>${name}</span><span class="value">${count} 次</span></div>
      `).join('')}</div>
    </div>
  `;
}

// ===== Settings =====
function renderSettings() {
  const user = currentData.user;
  document.getElementById('setting-name').value = user.name;
  document.getElementById('setting-reg').value = user.regNo;
  document.getElementById('setting-bio').value = user.bio;

  const img = document.getElementById('settings-avatar-img');
  const ph = document.getElementById('settings-avatar-placeholder');
  if (user.avatar) { img.src = user.avatar; img.style.display = 'block'; ph.style.display = 'none'; }
  else { img.style.display = 'none'; ph.style.display = 'flex'; ph.textContent = (user.name[0] || '?' ); }
}

function initSettings() {
  const upload = document.getElementById('avatar-upload');
  upload.addEventListener('change', async () => {
    const file = upload.files[0];
    if (!file) return;
    try {
      const base64 = await readFileAsBase64(file);
      currentData.user.avatar = base64;
      saveData(currentData);
      renderSettings();
      showToast('头像已更新');
    } catch (e) { showToast('上传失败'); }
  });

  document.getElementById('btn-save-settings').addEventListener('click', () => {
    currentData.user.name = document.getElementById('setting-name').value || '飞行员';
    currentData.user.regNo = document.getElementById('setting-reg').value || 'Reg. Unknown';
    currentData.user.bio = document.getElementById('setting-bio').value || '记录每一次飞行';
    saveData(currentData);
    renderSettings();
    showToast('设置已保存');
  });

  document.getElementById('btn-export-data').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(currentData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'flightlog_backup.json'; a.click();
    URL.revokeObjectURL(url); showToast('数据已导出');
  });

  document.getElementById('btn-import-data').addEventListener('click', () => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
    input.onchange = async () => {
      const file = input.files[0]; if (!file) return;
      try {
        const text = await file.text(); const data = JSON.parse(text);
        if (data.flights && data.user) { currentData = data; saveData(currentData); showToast('数据导入成功'); renderSettings(); }
        else { showToast('无效数据格式'); }
      } catch (e) { showToast('导入失败'); }
    }; input.click();
  });

  document.getElementById('btn-clear-data').addEventListener('click', () => {
    if (confirm('⚠️ 确定要清空所有数据吗？此操作不可恢复！')) {
      currentData = getInitialData(); currentData.flights = []; saveData(currentData);
      showToast('数据已清空'); renderSettings();
    }
  });
}

// ===== Starfield Background =====
function initStarfield() {
  const canvas = document.getElementById('starfield');
  const ctx = canvas.getContext('2d');
  let stars = [];
  const W = canvas.width = window.innerWidth;
  const H = canvas.height = window.innerHeight;
  const NUM = 200;

  for (let i = 0; i < NUM; i++) {
    stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.5, s: Math.random() * 0.3 + 0.1, o: Math.random() });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    stars.forEach(s => {
      s.o += Math.random() * 0.02 - 0.01; s.o = Math.max(0.1, Math.min(0.8, s.o));
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180, 200, 255, ${s.o})`; ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  });
}

// ===== Edit Flight =====
function editFlight(flightId) {
  const f = currentData.flights.find(f => f.id === flightId);
  if (!f) return;
  editingFlightId = flightId;
  tempTicketImages = f.ticketImages ? [...f.ticketImages] : [];
  switchView('add-flight');

  const form = document.getElementById('flight-form');
  form.date.value = f.date || '';
  form.flightNumber.value = f.flightNumber || '';
  form.fromIcao.value = f.from?.icao || '';
  form.toIcao.value = f.to?.icao || '';
  form.fromName.value = f.from?.name || '';
  form.toName.value = f.to?.name || '';
  form.aircraftModel.value = f.aircraft?.model || '';
  form.aircraftReg.value = f.aircraft?.reg || '';
  form.airline.value = f.airline || '';
  form.seat.value = f.seat || '';
  form.seatPosition.value = f.seatPosition || '';
  form.cabinClass.value = f.cabinClass || '';
  form.purpose.value = f.purpose || '';
  form.embark.value = f.embark || '';
  form.disembark.value = f.disembark || '';
  form.via.value = f.via || '';
  form.arrivalCity.value = f.arrivalCity || '';
  form.crzAlt.value = f.crzAlt || '';
  form.crzSpeed.value = f.crzSpeed || '';
  form.v1.value = f.v1 || '';
  form.vr.value = f.vr || '';
  form.v2.value = f.v2 || '';
  form.flightLevel.value = f.flightLevel || '';
  form.depTerminal.value = f.departure?.terminal || '';
  form.depGate.value = f.departure?.gate || '';
  form.depRunway.value = f.departure?.runway || '';
  form.depParkingBay.value = f.departure?.parkingBay || '';
  form.depScheduledTime.value = f.departure?.scheduledTime || '';
  form.depActualTime.value = f.departure?.actualTime || '';
  form.arrTerminal.value = f.arrival?.terminal || '';
  form.arrRunway.value = f.arrival?.runway || '';
  form.arrActualTime.value = f.arrival?.actualTime || '';
  form.arrParkingBay.value = f.arrival?.parkingBay || '';
  form.vref.value = f.arrival?.vref || '';
  form.apprProgram.value = f.arrival?.apprProgram || '';
  form.reflections.value = f.reflections || '';
  form.captainLog.value = f.captainLog || '';
  form.firstOfficerNotes.value = f.firstOfficerNotes || '';
  form.purserNotes.value = f.purserNotes || '';

  renderTicketPreview(document.getElementById('ticket-preview'), tempTicketImages);
}

// ===== DOM Events =====
function initEvents() {
  // Nav links
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); const v = a.dataset.view; if (v) switchView(v); });
  });

  // Event delegation for dynamic data-view buttons
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-view]');
    if (el && el.closest('.nav-links') === null) {
      e.preventDefault(); switchView(el.dataset.view);
    }
  });

  // Edit / Delete flight buttons
  document.getElementById('btn-edit-flight').addEventListener('click', () => {
    if (currentFlightId) editFlight(currentFlightId);
  });
  document.getElementById('btn-delete-flight').addEventListener('click', () => {
    if (!currentFlightId) return;
    if (confirm('确定删除这条航程记录吗？')) {
      currentData.flights = currentData.flights.filter(f => f.id !== currentFlightId);
      saveData(currentData); showToast('已删除'); switchView('flights');
    }
  });
}

// ===== Init =====
function init() {
  initStarfield();
  initEvents();
  initAddForm();
  initSettings();
  switchView('home');
}

init();
