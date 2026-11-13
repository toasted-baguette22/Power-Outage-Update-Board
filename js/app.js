/* app.js - Power Outage Update Board (client-side only).
   Uses only vanilla JS. All user text is inserted with textContent,
   never innerHTML, so user input cannot inject markup. */
'use strict';

/* ---------- State ---------- */
let reports = buildSampleReports();
let nextId = reports.length + 1;
const confirmedByMe = new Set();   // report ids this browser already confirmed
let operatorMode = false;
let openDetailId = null;
let allowDuplicate = false;        // set when the user chooses "Submit as a new report"

/* ---------- Small helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}

const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const fmtDate = iso => dateFmt.format(new Date(iso));

function fmtDuration(ms) {
  const totalMin = Math.max(0, Math.round(ms / MIN));
  const d = Math.floor(totalMin / 1440);
  const hrs = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d) return `${d} d ${hrs} h`;
  if (hrs) return `${hrs} h ${m} min`;
  return `${m} min`;
}

// Date -> value for <input type="datetime-local"> in LOCAL time (not UTC).
function toLocalInput(date) {
  const p = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
}

const serviceLabel = key => (SERVICES.find(s => s.key === key) || { label: key }).label;
const isActive = r => r.status !== 'restored';
const elapsedMs = r => (r.restoredAt ? new Date(r.restoredAt) : new Date()) - new Date(r.startedAt);

function addEvent(report, type, text) {
  report.timeline.push({ at: new Date().toISOString(), type, text });
}

/* ---------- Business rules ---------- */
function confirmReport(report) {
  if (confirmedByMe.has(report.id) || report.status === 'restored') return false;
  confirmedByMe.add(report.id);
  report.confirmations += 1;
  if (report.status === 'reported' && report.confirmations >= VERIFY_THRESHOLD) {
    report.status = 'verified';
    addEvent(report, 'verified', `Reached ${VERIFY_THRESHOLD} neighbour confirmations - auto-verified.`);
  }
  return true;
}

function findDuplicate(zone, startedIso) {
  const windowMs = DUPLICATE_WINDOW_HOURS * 60 * MIN;
  return reports.find(r =>
    r.zone === zone && isActive(r) &&
    Math.abs(new Date(r.startedAt) - new Date(startedIso)) <= windowMs);
}

// Returns an array of error messages (empty array = valid). Handles invalid input.
function validateReport(data) {
  const errors = [];
  if (!ZONES.includes(data.zone)) errors.push('Choose a zone from the list.');
  if (data.name.trim().length < 2) errors.push('Enter your name (at least 2 characters).');
  if (!data.started || Number.isNaN(new Date(data.started).getTime())) {
    errors.push('Enter a valid start time.');
  } else {
    const t = new Date(data.started);
    if (t > new Date()) errors.push('Start time cannot be in the future.');
    if (Date.now() - t > 7 * 24 * 60 * MIN) errors.push('Start time is more than 7 days ago - please check the date.');
  }
  if (!data.severity) errors.push('Say whether the outage is partial or full.');
  if (data.description.trim().length < 10) errors.push('Describe what you are seeing (at least 10 characters).');
  return errors;
}

/* ---------- Rendering: summary ---------- */
function renderSummary() {
  const active = reports.filter(isActive);
  $('#stat-active').textContent = active.length;
  $('#stat-unverified').textContent = active.filter(r => r.status === 'reported').length;

  const restored = reports.filter(r => r.status === 'restored');
  $('#stat-avg').textContent = restored.length
    ? fmtDuration(restored.reduce((sum, r) => sum + elapsedMs(r), 0) / restored.length)
    : 'No data';

  const counts = {};
  active.forEach(r => { counts[r.zone] = (counts[r.zone] || 0) + 1; });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  $('#stat-zone').textContent = top ? top[0].split(' - ')[0] + ` (${top[1]})` : 'None';
}

/* ---------- Rendering: list ---------- */
function getFilters() {
  const f = $('#filter-form');
  return {
    search: f.search.value.trim().toLowerCase(),
    zone: f.zone.value,
    status: f.status.value,
    service: f.service.value,
    sort: f.sort.value
  };
}

function applyFilters() {
  const f = getFilters();
  let list = reports.filter(r => {
    if (f.zone && r.zone !== f.zone) return false;
    if (f.status === 'active' && !isActive(r)) return false;
    if (f.status && f.status !== 'active' && r.status !== f.status) return false;
    if (f.service && !r.services.includes(f.service)) return false;
    if (f.search && !(`${r.reporter} ${r.description} ${r.zone}`.toLowerCase().includes(f.search))) return false;
    return true;
  });
  const sorters = {
    newest: (a, b) => new Date(b.startedAt) - new Date(a.startedAt),
    longest: (a, b) => elapsedMs(b) - elapsedMs(a),
    confirmed: (a, b) => b.confirmations - a.confirmations
  };
  return list.sort(sorters[f.sort] || sorters.newest);
}

function statusBadge(status) {
  return h('span', { class: `badge badge-${status}` }, STATUSES[status].label);
}

function etrText(r) {
  if (r.status === 'restored') return `Restored ${fmtDate(r.restoredAt)}`;
  if (!r.etr) return 'Recovery estimate not yet available';
  const diff = new Date(r.etr) - new Date();
  const rel = diff >= 0 ? `in ${fmtDuration(diff)}` : `overdue by ${fmtDuration(-diff)}`;
  return `Estimated recovery ${fmtDate(r.etr)} (${rel})`;
}

function renderCard(r) {
  const confirmed = confirmedByMe.has(r.id);
  const confirmBtn = h('button', {
    type: 'button',
    class: 'btn',
    disabled: confirmed || r.status === 'restored',
    'aria-label': `${confirmed ? 'Confirmed' : 'I see this too'} (${r.confirmations}) - ${r.zone}`,
    onclick: () => { if (confirmReport(r)) refresh(`Thanks - confirmation recorded for ${r.zone}.`); }
  }, confirmed ? 'Confirmed' : 'I see this too', ` (${r.confirmations})`);

  const progress = Math.min(r.confirmations, VERIFY_THRESHOLD);
  return h('li', { class: `card card-${r.status}`, 'data-id': r.id },
    h('div', { class: 'card-head' },
      h('h3', {}, r.zone),
      statusBadge(r.status)),
    h('p', { class: 'meta' },
      r.severity === 'full' ? 'Full zone outage' : 'Partial outage', ' · started ',
      h('time', { datetime: r.startedAt }, fmtDate(r.startedAt)), ' · ',
      r.status === 'restored' ? 'lasted ' : 'ongoing for ', h('strong', {}, fmtDuration(elapsedMs(r)))),
    h('p', { class: 'desc' }, r.description),
    h('ul', { class: 'chips', 'aria-label': 'Affected services' },
      r.services.length
        ? r.services.map(s => h('li', {}, serviceLabel(s)))
        : h('li', { class: 'chip-none' }, 'No special services listed')),
    h('p', { class: 'etr' }, etrText(r)),
    h('div', { class: 'verify' },
      h('progress', { max: VERIFY_THRESHOLD, value: progress, 'aria-label': 'Confirmations toward verification' }),
      h('span', {}, r.status === 'reported'
        ? `${r.confirmations}/${VERIFY_THRESHOLD} confirmations to verify`
        : `${r.confirmations} confirmations`)),
    h('div', { class: 'card-actions' },
      confirmBtn,
      h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => openDetail(r.id) }, 'View timeline')));
}

function renderList() {
  const list = applyFilters();
  const ul = $('#outage-list');
  ul.replaceChildren(...list.map(renderCard));
  $('#empty-state').hidden = list.length > 0;
  ul.hidden = list.length === 0;
  const total = reports.length;
  $('#result-count').textContent = `Showing ${list.length} of ${total} report${total === 1 ? '' : 's'}.`;
}

/* ---------- Rendering: detail dialog ---------- */
function openDetail(id) {
  openDetailId = id;
  renderDetail();
  const dlg = $('#detail');
  if (!dlg.open) dlg.showModal();
}

function renderDetail() {
  const r = reports.find(x => x.id === openDetailId);
  if (!r) return;
  $('#detail-title').textContent = `${r.zone} outage`;
  const body = $('#detail-body');

  const events = [...r.timeline].sort((a, b) => new Date(a.at) - new Date(b.at));
  const parts = [
    h('p', {}, statusBadge(r.status), ' ', r.severity === 'full' ? 'Full zone outage' : 'Partial outage'),
    h('p', { class: 'desc' }, r.description),
    h('dl', { class: 'facts' },
      h('div', {}, h('dt', {}, 'Reported by'), h('dd', {}, r.reporter)),
      h('div', {}, h('dt', {}, 'Started'), h('dd', {}, fmtDate(r.startedAt))),
      h('div', {}, h('dt', {}, r.status === 'restored' ? 'Duration' : 'Elapsed'), h('dd', {}, fmtDuration(elapsedMs(r)))),
      h('div', {}, h('dt', {}, 'Recovery'), h('dd', {}, etrText(r))),
      h('div', {}, h('dt', {}, 'Services'), h('dd', {}, r.services.length ? r.services.map(serviceLabel).join(', ') : 'None listed'))),
    r.etrNote ? h('p', { class: 'note' }, h('strong', {}, 'Recovery note: '), r.etrNote) : null,
    h('h3', {}, 'Update timeline'),
    h('ol', { class: 'timeline' },
      events.map(e => h('li', { class: `tl-${e.type}` },
        h('time', { datetime: e.at }, fmtDate(e.at)),
        h('span', {}, e.text))))
  ];

  if (operatorMode && r.status !== 'restored') parts.push(buildUpdateForm(r));
  else if (!operatorMode && r.status !== 'restored') {
    parts.push(h('p', { class: 'hint' }, 'Utility staff can switch on "Utility desk view" in the header to post updates.'));
  }
  body.replaceChildren(...parts);
}

function buildUpdateForm(r) {
  const next = Object.entries(STATUSES).filter(([k, v]) => v.order > STATUSES[r.status].order);
  const errBox = h('div', { class: 'form-errors', role: 'alert', hidden: true });

  const form = h('form', { class: 'update-form', novalidate: true },
    h('h3', {}, 'Post an update (utility desk)'),
    h('div', { class: 'field' },
      h('label', { for: 'u-status' }, 'New status'),
      h('select', { id: 'u-status', name: 'status' },
        h('option', { value: r.status }, `${STATUSES[r.status].label} (no change)`),
        next.map(([k, v]) => h('option', { value: k }, v.label)))),
    h('div', { class: 'field' },
      h('label', { for: 'u-note' }, 'Update note (required)'),
      h('textarea', { id: 'u-note', name: 'note', rows: 2, maxlength: 200, required: true })),
    h('div', { class: 'field' },
      h('label', { for: 'u-etr' }, 'Recovery estimate (optional)'),
      h('input', { type: 'datetime-local', id: 'u-etr', name: 'etr', min: toLocalInput(new Date(r.startedAt)) })),
    h('div', { class: 'field' },
      h('label', { for: 'u-etr-note' }, 'Estimate note (optional)'),
      h('input', { type: 'text', id: 'u-etr-note', name: 'etrNote', maxlength: 120 })),
    errBox,
    h('button', { type: 'submit', class: 'btn btn-primary' }, 'Post update'));

  form.addEventListener('submit', ev => {
    ev.preventDefault();
    const errors = [];
    const note = form.note.value.trim();
    if (!note) errors.push('Write a short update note.');
    let etrIso = null;
    if (form.etr.value) {
      const etr = new Date(form.etr.value);
      if (Number.isNaN(etr.getTime())) errors.push('Recovery estimate is not a valid date.');
      else if (etr <= new Date(r.startedAt)) errors.push('Recovery estimate must be after the outage start time.');
      else etrIso = etr.toISOString();
    }
    if (form.status.value === 'restored' && etrIso) errors.push('Remove the recovery estimate when marking as restored.');
    if (errors.length) {
      errBox.replaceChildren(h('ul', {}, errors.map(e => h('li', {}, e))));
      errBox.hidden = false;
      return;
    }
    if (form.status.value !== r.status) {
      r.status = form.status.value;
      if (r.status === 'restored') r.restoredAt = new Date().toISOString();
    }
    if (etrIso) { r.etr = etrIso; r.etrNote = form.etrNote.value.trim(); }
    addEvent(r, r.status === 'restored' ? 'restored' : (r.status === 'crew' ? 'crew' : 'note'), note);
    refresh();
    renderDetail();
  });
  return form;
}

/* ---------- Report form ---------- */
function showFormErrors(errors) {
  const box = $('#form-errors');
  if (!errors.length) { box.hidden = true; box.replaceChildren(); return; }
  box.replaceChildren(h('p', {}, 'Please fix the following:'), h('ul', {}, errors.map(e => h('li', {}, e))));
  box.hidden = false;
}

function resetReportForm() {
  allowDuplicate = false;
  $('#duplicate-notice').hidden = true;
  $('#report-form').querySelectorAll('.touched').forEach(el => el.classList.remove('touched'));
  showFormErrors([]);
  $('#r-desc-count').textContent = '0 / 280 characters';
  stampStartInput();
}

function stampStartInput() {
  const input = $('#r-started');
  const now = new Date();
  input.max = toLocalInput(now);
  input.min = toLocalInput(new Date(now.getTime() - 7 * 24 * 60 * MIN));
}

function submitReport(form) {
  const data = {
    zone: form.zone.value,
    name: form.name.value,
    email: form.email.value.trim(),
    started: form.started.value,
    severity: (form.severity.value || ''),
    description: form.description.value,
    services: [...form.querySelectorAll('input[name="service"]:checked')].map(i => i.value)
  };

  const errors = validateReport(data);
  showFormErrors(errors);
  if (errors.length) return;

  const startedIso = new Date(data.started).toISOString();
  const dup = findDuplicate(data.zone, startedIso);
  if (dup && !allowDuplicate) {
    $('#duplicate-text').textContent =
      `There is already an active report for ${dup.zone} started ${fmtDate(dup.startedAt)} (${STATUSES[dup.status].label}). ` +
      'Confirming it helps verification faster than a duplicate.';
    const notice = $('#duplicate-notice');
    notice.hidden = false;
    notice.dataset.id = dup.id;
    return;
  }

  const now = new Date().toISOString();
  const report = {
    id: nextId++, zone: data.zone, reporter: data.name.trim(), email: data.email,
    severity: data.severity, services: data.services, description: data.description.trim(),
    startedAt: startedIso, status: 'reported', confirmations: 1,
    etr: null, etrNote: '', restoredAt: null,
    timeline: [{ at: now, type: 'reported', text: `Reported by ${data.name.trim()}.` }]
  };
  confirmedByMe.add(report.id); // the reporter counts as the first confirmation
  reports.unshift(report);

  form.reset();
  resetReportForm();
  const msg = $('#form-success');
  msg.textContent = `Report submitted for ${report.zone}. It needs ${VERIFY_THRESHOLD - 1} more confirmations to be verified.`;
  msg.hidden = false;
  refresh();
}

/* ---------- Refresh + setup ---------- */
function refresh(message) {
  renderSummary();
  renderList();
  if (openDetailId && $('#detail').open) renderDetail();
  if (message) { const msg = $('#form-success'); msg.textContent = message; msg.hidden = false; }
}

function updateClock() {
  const now = new Date();
  const t = $('#clock');
  t.dateTime = now.toISOString();
  t.textContent = dateFmt.format(now);
}

function fillSelect(select, items, valueKey, labelKey) {
  items.forEach(i => select.append(h('option', { value: valueKey ? i[valueKey] : i }, labelKey ? i[labelKey] : i)));
}

function init() {
  fillSelect($('#f-zone'), ZONES);
  fillSelect($('#r-zone'), ZONES);
  fillSelect($('#f-service'), SERVICES, 'key', 'label');
  $('#service-checks').replaceChildren(...SERVICES.map(s =>
    h('label', { class: 'choice' }, h('input', { type: 'checkbox', name: 'service', value: s.key }), ' ', s.label)));

  $('#tz-name').textContent = Intl.DateTimeFormat().resolvedOptions().timeZone;
  $('#threshold').textContent = VERIFY_THRESHOLD;
  stampStartInput();

  // Filter events: update results live.
  const ff = $('#filter-form');
  ff.addEventListener('input', renderList);
  ff.addEventListener('reset', () => setTimeout(renderList, 0));

  // Report form events.
  const rf = $('#report-form');
  rf.addEventListener('submit', ev => { ev.preventDefault(); $('#form-success').hidden = true; submitReport(rf); });
  rf.addEventListener('reset', () => setTimeout(resetReportForm, 0));
  // Only flag a field as invalid after the user has visited it (or tried to submit).
  rf.addEventListener('focusout', e => e.target.classList && e.target.classList.add('touched'));
  rf.addEventListener('invalid', e => e.target.classList.add('touched'), true);
  rf.addEventListener('input', () => { $('#duplicate-notice').hidden = true; allowDuplicate = false; });
  $('#r-desc').addEventListener('input', e => {
    $('#r-desc-count').textContent = `${e.target.value.length} / 280 characters`;
  });
  $('#dup-new').addEventListener('click', () => { allowDuplicate = true; rf.requestSubmit(); });
  $('#dup-confirm').addEventListener('click', () => {
    const r = reports.find(x => x.id === Number($('#duplicate-notice').dataset.id));
    if (r && confirmReport(r)) {
      rf.reset();
      resetReportForm();
      refresh(`Thanks - you confirmed the existing report for ${r.zone}.`);
    } else {
      $('#duplicate-text').textContent = 'You have already confirmed that report.';
    }
  });

  // Operator toggle and dialog close.
  $('#operator-toggle').addEventListener('change', e => { operatorMode = e.target.checked; if ($('#detail').open) renderDetail(); });
  $('#detail-close').addEventListener('click', () => $('#detail').close());
  $('#detail').addEventListener('click', e => { if (e.target.id === 'detail') e.target.close(); });

  updateClock();
  refresh();
  setInterval(() => { updateClock(); refresh(); }, 60 * 1000); // keep durations current
}

document.addEventListener('DOMContentLoaded', init);
