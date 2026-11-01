/* CmdBook — static, dependency-free. Data comes from data/bundle.js. */
(function () {
  'use strict';

  var DATA = window.CMDBOOK_DATA || { entries: [], commands: {} };
  var TOPIC_LABELS = { linux: 'Linux', git: 'Git', python: 'Python', security: 'Security', web: 'Web' };
  var SAFETY_LABELS = { safe: 'safe', caution: 'caution', danger: 'danger' };

  var state = {
    entries: DATA.entries.slice(),
    commands: DATA.commands || {},
    query: '',
    topic: 'all',
    mode: localStorage.getItem('cmdbook:mode') || 'beginner',
    theme: localStorage.getItem('cmdbook:theme') || 'dark'
  };

  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  var els = {
    search: $('#search'),
    topics: $('#topics'),
    results: $('#results'),
    count: $('#result-count'),
    empty: $('#empty'),
    heroMeta: $('#hero-meta'),
    modeToggle: $('#mode-toggle'),
    themeToggle: $('#theme-toggle'),
    explainForm: $('#explain-form'),
    explainInput: $('#explain-input'),
    explainOutput: $('#explain-output')
  };

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function normalize(value) { return String(value || '').toLowerCase(); }

  function scoreEntry(entry, terms) {
    var fields = [
      [entry.command, 6],
      [entry.id, 3],
      [entry.plain, 2],
      [entry.when, 1],
      [(entry.tags || []).join(' '), 3],
      [(entry.flags || []).map(function (flag) { return flag.flag + ' ' + flag.meaning; }).join(' '), 1],
      [entry.topic, 1]
    ].map(function (pair) { return [normalize(pair[0]), pair[1]]; });

    var score = 0;
    for (var i = 0; i < terms.length; i += 1) {
      var best = 0;
      for (var j = 0; j < fields.length; j += 1) {
        if (fields[j][0].indexOf(terms[i]) !== -1) best = Math.max(best, fields[j][1]);
      }
      if (!best) return 0;
      score += best;
    }
    return score;
  }

  function visibleEntries() {
    var terms = normalize(state.query).trim().split(/\s+/).filter(Boolean);
    var list = state.entries.filter(function (entry) {
      return state.topic === 'all' || entry.topic === state.topic;
    });
    if (!terms.length) return list;
    return list
      .map(function (entry) { return { entry: entry, score: scoreEntry(entry, terms) }; })
      .filter(function (item) { return item.score > 0; })
      .sort(function (a, b) { return b.score - a.score || a.entry.command.localeCompare(b.entry.command); })
      .map(function (item) { return item.entry; });
  }

  function cardHtml(entry) {
    var flags = entry.flags || [];
    var flagsHtml = flags.length
      ? '<div class="flags pro-only"><span class="label">Flags</span><dl>' +
        flags.map(function (flag) {
          return '<div><dt><code>' + escapeHtml(flag.flag) + '</code></dt><dd>' + escapeHtml(flag.meaning) + '</dd></div>';
        }).join('') +
        '</dl></div>'
      : '';

    var related = entry.related || [];
    var relatedHtml = related.length
      ? '<div class="related pro-only"><span class="label">Related</span>' +
        related.map(function (id) {
          return '<button type="button" class="link" data-jump="' + escapeHtml(id) + '">' + escapeHtml(id) + '</button>';
        }).join('') +
        '</div>'
      : '';

    var tags = (entry.tags || []).map(function (tag) {
      return '<button type="button" class="tag" data-tag="' + escapeHtml(tag) + '">#' + escapeHtml(tag) + '</button>';
    }).join('');

    return '<article class="card" id="entry-' + escapeHtml(entry.id) + '">' +
      '<div class="card-head">' +
        '<span class="topic">' + escapeHtml(TOPIC_LABELS[entry.topic] || entry.topic) + '</span>' +
        '<span class="badge safety-' + escapeHtml(entry.safety) + '">' + escapeHtml(SAFETY_LABELS[entry.safety] || entry.safety) + '</span>' +
      '</div>' +
      '<div class="cmd-row">' +
        '<code class="cmd">' + escapeHtml(entry.command) + '</code>' +
        '<button type="button" class="copy" data-copy="' + escapeHtml(entry.command) + '" aria-label="Copy command">copy</button>' +
      '</div>' +
      '<p class="plain">' + escapeHtml(entry.plain) + '</p>' +
      '<p class="when"><span class="label">When</span> ' + escapeHtml(entry.when) + '</p>' +
      flagsHtml +
      relatedHtml +
      '<div class="card-foot">' + tags + '</div>' +
    '</article>';
  }

  function renderTopics() {
    var counts = {};
    state.entries.forEach(function (entry) { counts[entry.topic] = (counts[entry.topic] || 0) + 1; });
    var order = Object.keys(TOPIC_LABELS);
    var topics = Object.keys(counts).sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); });

    var html = '<button type="button" class="chip' + (state.topic === 'all' ? ' active' : '') +
      '" data-topic="all">All <span>' + state.entries.length + '</span></button>';
    topics.forEach(function (topic) {
      html += '<button type="button" class="chip' + (state.topic === topic ? ' active' : '') +
        '" data-topic="' + escapeHtml(topic) + '">' + escapeHtml(TOPIC_LABELS[topic] || topic) +
        ' <span>' + counts[topic] + '</span></button>';
    });
    els.topics.innerHTML = html;
  }

  function render() {
    var list = visibleEntries();
    els.results.innerHTML = list.map(cardHtml).join('');
    els.empty.hidden = list.length > 0;
    els.count.textContent = list.length === state.entries.length
      ? state.entries.length + ' commands'
      : list.length + ' of ' + state.entries.length + ' commands';
    renderTopics();
  }

  function applyMode() {
    document.documentElement.dataset.mode = state.mode;
    els.modeToggle.textContent = state.mode === 'beginner' ? 'Beginner' : 'Pro';
    els.modeToggle.setAttribute('aria-pressed', String(state.mode === 'pro'));
    els.modeToggle.title = state.mode === 'beginner' ? 'Show flags and related commands' : 'Hide flags and related commands';
  }

  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    els.themeToggle.textContent = state.theme === 'dark' ? '☀️' : '🌙';
    els.themeToggle.setAttribute('aria-label', state.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  }

  function copyText(text, button) {
    function done(ok) {
      var original = button.textContent;
      button.textContent = ok ? 'copied' : 'select it';
      button.classList.toggle('copied', ok);
      setTimeout(function () { button.textContent = original; button.classList.remove('copied'); }, 1400);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { fallback(); });
    } else {
      fallback();
    }

    function fallback() {
      var area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (error) { ok = false; }
      area.remove();
      done(ok);
    }
  }

  /* ---------- explain a command ---------- */

  function tokenize(raw) {
    var out = [];
    var current = '';
    var quote = null;
    var text = raw.trim();

    for (var i = 0; i < text.length; i += 1) {
      var ch = text[i];
      if (quote) {
        if (ch === quote) quote = null;
        else current += ch;
      } else if (ch === '"' || ch === "'") {
        quote = ch;
      } else if (/\s/.test(ch)) {
        if (current) { out.push(current); current = ''; }
      } else {
        current += ch;
      }
    }
    if (current) out.push(current);
    return out;
  }

  function explainMode(mode) {
    var digits = mode.length === 4 ? mode.slice(1) : mode.padStart(3, '0');
    var labels = ['owner', 'group', 'other'];
    return digits.split('').map(function (digit, index) {
      var value = Number(digit);
      var rights = [4, 2, 1].map(function (bit, i) {
        return value & bit ? ['read', 'write', 'execute'][i] : null;
      }).filter(Boolean);
      return labels[index] + ': ' + (rights.length ? rights.join('+') : 'none');
    }).join(' · ');
  }

  var DANGER_RULES = [
    { re: /\brm\s+(?:-[a-z]*[rf][a-z]*\s+)+(?:\/|~|\*)(?:\s|$)/i, message: 'Recursive force-delete of a broad path. Double-check the target.' },
    { re: /\bchmod\s+(?:-R\s+)?777\b/i, message: 'World-writable permissions. Usually a security problem.' },
    { re: /\b(?:curl|wget)\b[^|]*\|\s*(?:sudo\s+)?(?:ba|z)?sh\b/i, message: 'Piping a download straight into a shell. Read the script first.' },
    { re: /\bdd\b[^\n]*\bif=/i, message: 'Raw disk write. One wrong path can destroy a drive.' },
    { re: /\bmkfs\b/i, message: 'Formats a filesystem. This erases data.' },
    { re: /\bgit\s+reset\s+--hard\b/i, message: 'Discards uncommitted work permanently.' },
    { re: /\bgit\s+push\b[^\n]*--force\b/i, message: 'Force-push rewrites shared history. Prefer --force-with-lease.' },
    { re: />\s*\/dev\/sd[a-z]/i, message: 'Writing directly to a disk device.' }
  ];

  function findDangers(raw) {
    return DANGER_RULES.filter(function (rule) { return rule.re.test(raw); }).map(function (rule) { return rule.message; });
  }

  function flagDictionary(programKey) {
    var own = (state.commands[programKey] && state.commands[programKey].flags) || {};
    if (!programKey || programKey.indexOf(' ') === -1) return own;
    var parent = state.commands[programKey.split(' ')[0]];
    var parentFlags = (parent && parent.flags) || {};
    return Object.assign({}, parentFlags, own);
  }

  function lookupFlag(programKey, token) {
    var flags = flagDictionary(programKey);

    if (flags[token]) return flags[token];

    if (token.indexOf('=') !== -1) {
      var parts = token.split('=');
      var name = parts[0];
      var value = parts.slice(1).join('=');
      if (flags[name]) return flags[name] + ' (set to "' + value + '")';
    }

    if (/^-[a-zA-Z]{2,}$/.test(token)) {
      var chars = token.slice(1).split('').map(function (ch) { return '-' + ch; });
      var meanings = chars.map(function (flag) { return flags[flag]; });
      if (meanings.every(Boolean)) {
        return chars.map(function (flag, i) { return flag + ' ' + meanings[i]; }).join(' · ');
      }
    }

    return null;
  }

  function splitPipeline(raw) {
    var segments = [];
    var current = '';
    var quote = null;
    var text = raw.trim();

    for (var i = 0; i < text.length; i += 1) {
      var ch = text[i];
      if (quote) {
        current += ch;
        if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'") {
        quote = ch;
        current += ch;
      } else if (ch === '|') {
        segments.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    segments.push(current);

    return segments.map(function (segment) { return segment.trim(); }).filter(Boolean);
  }

  function explainTokens(tokens) {
    var rows = [];
    var index = 0;

    if (/^(sudo|doas)$/.test(tokens[0])) {
      rows.push({
        token: tokens[0],
        meaning: (state.commands[tokens[0]] && state.commands[tokens[0]].desc) || 'Run a command as another user.',
        kind: 'program'
      });
      index = 1;
    }

    var programKey = null;
    var first = tokens[index];

    if (first) {
      var two = tokens[index + 1] ? first + ' ' + tokens[index + 1] : null;
      if (two && state.commands[two]) {
        programKey = two;
        index += 2;
      } else {
        programKey = first;
        index += 1;
      }

      var shown = programKey.indexOf(' ') !== -1 ? programKey : first;
      rows.push({
        token: shown,
        meaning: (state.commands[programKey] && state.commands[programKey].desc) || 'program — not in the dictionary yet',
        kind: state.commands[programKey] ? 'program' : 'unknown'
      });
    }

    for (; index < tokens.length; index += 1) {
      var token = tokens[index];

      if (token.charAt(0) === '-') {
        var meaning = lookupFlag(programKey, token);
        rows.push({ token: token, meaning: meaning || 'flag — not in the dictionary yet', kind: meaning ? 'flag' : 'unknown' });
      } else if (programKey === 'chmod' && /^[0-7]{3,4}$/.test(token)) {
        rows.push({ token: token, meaning: explainMode(token), kind: 'mode' });
      } else if (/^https?:\/\//i.test(token)) {
        rows.push({ token: token, meaning: 'URL', kind: 'arg' });
      } else if (/^(?:\.{0,2}\/|~\/|[A-Za-z]:\\)/.test(token)) {
        rows.push({ token: token, meaning: 'path', kind: 'arg' });
      } else {
        rows.push({ token: token, meaning: 'argument', kind: 'arg' });
      }
    }

    return rows;
  }

  function explainCommand(raw) {
    var segments = splitPipeline(raw);
    if (!segments.length) {
      return '<p class="explain-hint">Type a command above to see what each part does.</p>';
    }

    var rows = [];
    segments.forEach(function (segment, index) {
      if (index > 0) {
        rows.push({ token: '|', meaning: 'pipe the output into the next command', kind: 'pipe' });
      }
      rows = rows.concat(explainTokens(tokenize(segment)));
    });

    var dangers = findDangers(raw);

    return '<div class="explain-result">' +
      '<code class="explain-raw">' + escapeHtml(raw.trim()) + '</code>' +
      '<ul class="explain-list">' + rows.map(function (row) {
        return '<li class="kind-' + row.kind + '"><code>' + escapeHtml(row.token) + '</code><span>' + escapeHtml(row.meaning) + '</span></li>';
      }).join('') + '</ul>' +
      dangers.map(function (message) { return '<p class="danger-note">⚠️ ' + escapeHtml(message) + '</p>'; }).join('') +
    '</div>';
  }

  /* ---------- events ---------- */

  var searchTimer = null;

  function syncQueryToUrl() {
    try {
      var url = new URL(window.location.href);
      if (state.query) url.searchParams.set('q', state.query);
      else url.searchParams.delete('q');
      history.replaceState(null, '', url);
    } catch (error) {
      /* file:// or older browsers: ignore */
    }
  }

  function jumpToEntry(id) {
    var entry = state.entries.filter(function (item) { return item.id === id; })[0];
    if (!entry) return;
    state.topic = 'all';
    state.query = '';
    els.search.value = '';
    render();
    syncQueryToUrl();
    var card = document.getElementById('entry-' + entry.id);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('flash');
      setTimeout(function () { card.classList.remove('flash'); }, 1600);
    }
  }

  function bindEvents() {
    els.search.addEventListener('input', function () {
      state.query = els.search.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () { render(); syncQueryToUrl(); }, 60);
    });

    els.topics.addEventListener('click', function (event) {
      var button = event.target.closest('[data-topic]');
      if (!button) return;
      state.topic = button.dataset.topic;
      render();
    });

    els.results.addEventListener('click', function (event) {
      var copy = event.target.closest('[data-copy]');
      if (copy) { copyText(copy.dataset.copy, copy); return; }

      var tag = event.target.closest('[data-tag]');
      if (tag) {
        state.query = tag.dataset.tag;
        els.search.value = state.query;
        render();
        syncQueryToUrl();
        return;
      }

      var jump = event.target.closest('[data-jump]');
      if (jump) jumpToEntry(jump.dataset.jump);
    });

    els.modeToggle.addEventListener('click', function () {
      state.mode = state.mode === 'beginner' ? 'pro' : 'beginner';
      localStorage.setItem('cmdbook:mode', state.mode);
      applyMode();
    });

    els.themeToggle.addEventListener('click', function () {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('cmdbook:theme', state.theme);
      applyTheme();
    });

    els.explainForm.addEventListener('submit', function (event) {
      event.preventDefault();
      els.explainOutput.innerHTML = explainCommand(els.explainInput.value);
    });

    $$('[data-explain]').forEach(function (button) {
      button.addEventListener('click', function () {
        els.explainInput.value = button.dataset.explain;
        els.explainOutput.innerHTML = explainCommand(button.dataset.explain);
        els.explainInput.focus();
      });
    });

    document.addEventListener('keydown', function (event) {
      var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if (event.key === '/' && !typing) {
        event.preventDefault();
        els.search.focus();
      }
      if (event.key === 'Escape' && document.activeElement === els.search) {
        els.search.value = '';
        state.query = '';
        render();
        syncQueryToUrl();
        els.search.blur();
      }
    });
  }

  function initFromUrl() {
    try {
      var query = new URLSearchParams(window.location.search).get('q');
      if (query) {
        state.query = query;
        els.search.value = query;
      }
    } catch (error) {
      /* ignore */
    }
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(window.location.protocol)) return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function () { /* offline still works after first load */ });
    });
  }

  applyTheme();
  applyMode();
  initFromUrl();
  bindEvents();
  render();

  if (els.heroMeta) {
    var topics = Object.keys(state.entries.reduce(function (acc, entry) { acc[entry.topic] = true; return acc; }, {})).length;
    els.heroMeta.textContent = state.entries.length + ' commands · ' + topics + ' topics · works offline';
  }

  registerServiceWorker();
})();
