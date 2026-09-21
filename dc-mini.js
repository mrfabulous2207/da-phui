/* dc-mini — the smallest runtime that renders the Claude Design `.dc.html`
   template language on plain DOM, so the design markup can be kept verbatim
   instead of hand-translated into render code.

   Supported (this is the complete feature set the Da Phui FM design uses —
   nothing speculative):
     {{ path }}                       text + attribute interpolation
     <sc-if value="{{ path }}">       conditional block
     <sc-for list="{{ path }}" as="x">  repeat block, `x` in scope
     onClick / onChange / onKeyDown / onContextMenu
       / onDragStart / onDragOver / onDrop
     style-hover="css"                hover-only style
     value="{{ path }}"               controlled input / select / textarea

   Every expression in the design is a plain dotted path (verified: 0 of 771
   distinct expressions use an operator), so there is no expression parser —
   a path walker is enough.

   ponytail: re-renders the whole tree on each state change and restores
   focus + scroll by node path. The app's largest view is ~500 nodes, so a
   real keyed diff would be more code than it saves. Swap in reconciliation
   only if a view ever gets big enough to drop frames. */
(function (global) {
  'use strict';

  // Keyed lowercase: the HTML parser lowercases attribute names, so the
  // template's onClick / onDragStart arrive as onclick / ondragstart.
  var EVENTS = {
    onclick: 'click',
    onchange: 'input',
    onkeydown: 'keydown',
    oncontextmenu: 'contextmenu',
    ondragstart: 'dragstart',
    ondragend: 'dragend',
    ondragover: 'dragover',
    ondrop: 'drop',
    // Added for the context-menu work: touch has no right-click, so a long press
    // on the same target opens the same menu.
    onpointerdown: 'pointerdown',
    onpointerup: 'pointerup',
    onpointercancel: 'pointercancel'
  };
  var FIELD = { INPUT: 1, SELECT: 1, TEXTAREA: 1 };

  /* ---------- template source -> parseable HTML ----------
     <sc-if>/<sc-for> become <template>, which is the one wrapper the HTML
     parser keeps intact inside <select> (the design puts <sc-for> around
     <option>). Inside <svg> the parser leaves <template> as an ordinary
     foreign element with normal children, so compile() reads whichever of
     .content / .childNodes is present. */
  function toParseable(src) {
    return src
      .replace(/<sc-if\b/g, '<template data-sc="if"')
      .replace(/<\/sc-if>/g, '</template>')
      .replace(/<sc-for\b/g, '<template data-sc="for"')
      .replace(/<\/sc-for>/g, '</template>');
  }

  var PATH_RE = /\{\{([^}]*)\}\}/g;

  // "a {{ x }} b" -> [{lit:'a '}, {path:'x'}, {lit:' b'}]; null when static.
  function parts(str) {
    if (str.indexOf('{{') < 0) return null;
    var out = [], last = 0, m;
    PATH_RE.lastIndex = 0;
    while ((m = PATH_RE.exec(str))) {
      if (m.index > last) out.push({ lit: str.slice(last, m.index) });
      out.push({ path: m[1].trim() });
      last = m.index + m[0].length;
    }
    if (last < str.length) out.push({ lit: str.slice(last) });
    return out;
  }

  // A lone "{{ path }}" — used where a raw value (function, boolean) is wanted.
  function solePath(str) {
    var p = parts(str);
    return p && p.length === 1 && p[0].path ? p[0].path : null;
  }

  function compileNodes(parent) {
    var kids = parent.content ? parent.content.childNodes : parent.childNodes;
    var out = [];
    for (var i = 0; i < kids.length; i++) {
      var c = compile(kids[i]);
      if (c) out.push(c);
    }
    return out;
  }

  function compile(node) {
    if (node.nodeType === 3) {
      var p = parts(node.nodeValue);
      if (p) return { t: 'text', parts: p };
      // Collapse pure-whitespace text to keep the tree small, but keep the
      // single spaces the design relies on between inline spans.
      return { t: 'static', text: node.nodeValue };
    }
    if (node.nodeType !== 1) return null;

    var sc = node.getAttribute && node.getAttribute('data-sc');
    if (sc === 'if') {
      return { t: 'if', path: solePath(node.getAttribute('value') || ''), kids: compileNodes(node) };
    }
    if (sc === 'for') {
      return {
        t: 'for',
        path: solePath(node.getAttribute('list') || ''),
        as: node.getAttribute('as') || 'it',
        kids: compileNodes(node)
      };
    }

    var dyn = [], ev = [], hover = null, valPath = null;
    var attrs = node.attributes, drop = [];
    for (var i = 0; i < attrs.length; i++) {
      var name = attrs[i].name, val = attrs[i].value, low = name.toLowerCase();
      if (EVENTS[low]) { ev.push([EVENTS[low], solePath(val)]); drop.push(name); continue; }
      if (name === 'style-hover') { hover = val; drop.push(name); continue; }
      if (name.indexOf('hint-placeholder') === 0) { drop.push(name); continue; }
      if (name === 'value' && FIELD[node.tagName]) { valPath = solePath(val); drop.push(name); continue; }
      var p2 = parts(val);
      if (p2) dyn.push([name, p2]);
    }

    var proto = node.cloneNode(false);
    for (var j = 0; j < drop.length; j++) proto.removeAttribute(drop[j]);

    return {
      t: 'el',
      proto: proto,
      dyn: dyn.length ? dyn : null,
      ev: ev.length ? ev : null,
      hover: hover,
      valPath: valPath,
      kids: compileNodes(node)
    };
  }

  /* ---------- value lookup ---------- */
  function lookup(path, scope, vals, missing) {
    if (!path) return undefined;
    var segs = path.split('.');
    if (path === 'true') return true;
    if (path === 'false') return false;
    var cur;
    if (scope && Object.prototype.hasOwnProperty.call(scope, segs[0])) cur = scope[segs[0]];
    else {
      if (missing && !(segs[0] in vals)) missing[segs[0]] = 1;
      cur = vals[segs[0]];
    }
    for (var i = 1; i < segs.length && cur != null; i++) cur = cur[segs[i]];
    return cur;
  }

  function render(nodes, scope, vals, missing, into) {
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];

      if (n.t === 'static') { into.appendChild(document.createTextNode(n.text)); continue; }

      if (n.t === 'text') {
        var s = '';
        for (var k = 0; k < n.parts.length; k++) {
          var pt = n.parts[k];
          if (pt.lit != null) s += pt.lit;
          else { var v = lookup(pt.path, scope, vals, missing); s += v == null ? '' : v; }
        }
        into.appendChild(document.createTextNode(s));
        continue;
      }

      if (n.t === 'if') {
        if (lookup(n.path, scope, vals, missing)) render(n.kids, scope, vals, missing, into);
        continue;
      }

      if (n.t === 'for') {
        var list = lookup(n.path, scope, vals, missing);
        if (!list || !list.length) continue;
        for (var li = 0; li < list.length; li++) {
          var sub = Object.create(scope || null);
          sub[n.as] = list[li];
          render(n.kids, sub, vals, missing, into);
        }
        continue;
      }

      // element
      var el = n.proto.cloneNode(false);
      if (n.dyn) {
        for (var d = 0; d < n.dyn.length; d++) {
          var name = n.dyn[d][0], ps = n.dyn[d][1], out = '';
          for (var q = 0; q < ps.length; q++) {
            var pp = ps[q];
            if (pp.lit != null) out += pp.lit;
            else { var vv = lookup(pp.path, scope, vals, missing); out += vv == null ? '' : vv; }
          }
          el.setAttribute(name, out);
        }
      }
      if (n.ev) {
        for (var e = 0; e < n.ev.length; e++) {
          var fn = lookup(n.ev[e][1], scope, vals, missing);
          if (typeof fn === 'function') {
            el.addEventListener(n.ev[e][0], fn);
            if (n.ev[e][0] === 'click') makeKeyboardControl(el);
          }
        }
      }
      if (n.hover) bindHover(el, n.hover);
      if (n.kids.length) render(n.kids, scope, vals, missing, el);
      if (n.valPath) {
        var value = lookup(n.valPath, scope, vals, missing);
        el.value = value == null ? '' : String(value);
      }
      into.appendChild(el);
    }
  }

  /* ---------- keyboard access for non-native controls ----------
     The design's controls are styled div/span with onClick, so the browser
     gives them no focus and no Enter/Space. Rather than rewrite 162 elements
     into <button> (which would nest buttons inside buttons where a row has
     its own dismiss control, and drag in the UA button box model), any
     element that takes a click and is not already focusable becomes a real
     role="button" tab stop here, once, for every view. */
  var NATIVE_CONTROL = { BUTTON: 1, A: 1, INPUT: 1, SELECT: 1, TEXTAREA: 1, SUMMARY: 1 };

  function makeKeyboardControl(el) {
    if (NATIVE_CONTROL[el.tagName]) return;
    if (el.hasAttribute('tabindex')) return;
    el.setAttribute('tabindex', '0');
    if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
    el.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Enter' && ev.key !== ' ' && ev.key !== 'Spacebar') return;
      if (ev.target !== el) return;   // let a nested control answer for itself
      ev.preventDefault();
      el.click();
    });
  }

  function bindHover(el, css) {
    var base = el.getAttribute('style') || '';
    el.addEventListener('mouseenter', function () { el.style.cssText = base + ';' + css; });
    el.addEventListener('mouseleave', function () { el.style.cssText = base; });
  }

  /* ---------- focus + scroll across a full re-render ---------- */
  function pathOf(root, node) {
    var out = [];
    while (node && node !== root) {
      var p = node.parentNode;
      if (!p) return null;
      out.unshift(Array.prototype.indexOf.call(p.childNodes, node));
      node = p;
    }
    return node === root ? out : null;
  }

  function nodeAt(root, path) {
    var cur = root;
    for (var i = 0; i < path.length && cur; i++) cur = cur.childNodes[path[i]];
    return cur;
  }

  function snapshot(root) {
    var snap = { scroll: [], focus: null };
    var a = document.activeElement;
    if (a && root.contains(a)) {
      var p = pathOf(root, a);
      if (p) {
        snap.focus = { path: p };
        try { snap.focus.start = a.selectionStart; snap.focus.end = a.selectionEnd; } catch (err) {}
      }
    }
    var all = root.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      if (all[i].scrollTop) {
        var sp = pathOf(root, all[i]);
        if (sp) snap.scroll.push([sp, all[i].scrollTop]);
      }
    }
    return snap;
  }

  function restore(root, snap) {
    for (var i = 0; i < snap.scroll.length; i++) {
      var el = nodeAt(root, snap.scroll[i][0]);
      if (el) el.scrollTop = snap.scroll[i][1];
    }
    if (snap.focus) {
      var f = nodeAt(root, snap.focus.path);
      if (f && f.focus) {
        f.focus();
        if (snap.focus.start != null && f.setSelectionRange) {
          try { f.setSelectionRange(snap.focus.start, snap.focus.end); } catch (err) {}
        }
      }
    }
  }

  /* ---------- component base ---------- */
  function DCLogic(props) {
    this.props = props || {};
    this.state = {};
  }
  DCLogic.prototype.setState = function (patch) {
    var next = typeof patch === 'function' ? patch(this.state) : patch;
    if (!next) return;
    var changed = false;
    for (var k in next) { if (this.state[k] !== next[k]) changed = true; this.state[k] = next[k]; }
    if (changed || next) this._schedule();
  };
  /* Ve lai o KHUNG HINH KE TIEP, khong phai o microtask ngay sau setState.

     Do duoc tren may that: go mot ky tu vao o "Tim cau thu" khi danh sach con
     day tốn 40-50ms de dung lai 865 nut. Voi `Promise.resolve()` toan bo 50ms do
     chay TRUOC khi trinh duyet kip ve, nen chinh ky tu vua go cung phai doi --
     nguoi go thay tay minh bi tre. Cong viec khong doi, nhung thu tu thi doi:
     `requestAnimationFrame` de trinh duyet ve ky tu truoc, roi moi dung lai.

     Va no gop that: go nhanh hai ba ky tu trong cung mot khung 16ms thi chi con
     mot lan dung lai thay vi hai ba lan.

     Giu `Promise.resolve()` lam duong lui cho moi truong khong co rAF (tab an,
     may chu, bo kiem) -- rAF khong chay khi tab an, va mot cai setState khong
     bao gio ve lai la mot lo hong te hon cham. */
  DCLogic.prototype._schedule = function () {
    if (this._pending) return;
    this._pending = true;
    var self = this;
    var done = false;
    var run = function () { if (done) return; done = true; self._pending = false; self._draw(); };
    /* Dat CA HAI: khung hinh ke tiep, va mot cai hen gio 60ms lam duong lui.
       rAF khong chay khi tab nam duoi hoac cua so bi an -- chi dua vao no thi
       mot setState trong tab nen se KHONG BAO GIO duoc ve, va nguoi dung quay
       lai thay mot man hinh dung im. `document.hidden` khong phu het: khung
       trinh duyet bi che van co the giu hidden=false ma rAF da dung (dinh dung
       cai nay khi do). Cai nao toi truoc thi ve, cai kia tu tat. */
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
    setTimeout(run, 60);
  };
  DCLogic.prototype._draw = function () {
    var root = this._root;
    if (!root) return;
    var vals, missing = {};
    try {
      vals = this.renderVals();
    } catch (err) {
      console.error('renderVals threw', err);
      return;
    }
    var snap = snapshot(root);
    var frag = document.createDocumentFragment();
    render(this._tree, null, vals, missing, frag);
    root.textContent = '';
    root.appendChild(frag);
    restore(root, snap);
    var miss = Object.keys(missing);
    if (miss.length && String(missing) !== String(this._lastMiss)) {
      this._lastMiss = miss.join(',');
      console.warn('[dc-mini] template reads undefined bindings:', miss.join(', '));
    }
  };

  /* ---------- mount ---------- */
  function mount(opts) {
    var host = opts.host;
    var src = opts.template;
    var doc = new DOMParser().parseFromString(
      '<body>' + toParseable(src) + '</body>', 'text/html');
    var tree = compileNodes(doc.body);

    var inst = new opts.Component(opts.props || {});
    inst._tree = tree;
    inst._root = host;
    inst._draw();
    if (inst.componentDidMount) inst.componentDidMount();
    window.addEventListener('beforeunload', function () {
      if (inst.componentWillUnmount) inst.componentWillUnmount();
    });
    return inst;
  }

  global.DCLogic = DCLogic;
  global.DC = { mount: mount };
})(window);
