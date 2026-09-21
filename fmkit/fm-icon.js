// <fm-icon name="IconSearch" size="18"> — icon set extracted from the
// Football Manager 26 UI recreation .fig (see fmkit/icon-data.js).
// Renders into a SHADOW ROOT and paints with currentColor, so colour comes
// from the parent's `color`.
//
// Figma exports some glyphs with a full-bleed "mask" rectangle path that
// covers the whole viewBox; drawn as-is it paints a solid block. Those
// paths are stripped at render time (only when the icon has other paths).
//
// Ported from the design project's ES-module version to a classic script so
// the app runs from file:// (ES modules need http://). icon-data.js sets
// window.FM_ICONS; load it before this file.
(function () {
  var icons = window.FM_ICONS || {};

  function clean(body, viewBox) {
    var vb = String(viewBox || '0 0 24 24').split(/\s+/).map(Number);
    var w = vb[2] || 24, h = vb[3] || 24;
    var paths = body.match(/<path\b[^>]*\/>/g) || [];
    if (paths.length < 2) return body;
    // A mask path traces the full box; detect the four corners in its first moves.
    var isMask = function (p) {
      var d = (p.match(/\bd="([^"]*)"/) || [])[1] || '';
      var nums = (d.match(/-?\d+(?:\.\d+)?/g) || []).slice(0, 8).map(Number);
      if (nums.length < 8) return false;
      var hit = function (x, y) {
        return nums.some(function (n, i) {
          return i % 2 === 0 && Math.abs(n - x) < 0.6 && Math.abs(nums[i + 1] - y) < 0.6;
        });
      };
      return hit(0, 0) && hit(w, 0) && hit(w, h) && hit(0, h);
    };
    var kept = paths.filter(function (p) { return !isMask(p); });
    return kept.length ? kept.join('') : body;
  }

  function FmIcon() { return Reflect.construct(HTMLElement, [], FmIcon); }
  FmIcon.prototype = Object.create(HTMLElement.prototype);
  FmIcon.prototype.constructor = FmIcon;
  Object.setPrototypeOf(FmIcon, HTMLElement);

  FmIcon.observedAttributes = ['name', 'size'];
  FmIcon.prototype.connectedCallback = function () { this._render(); };
  FmIcon.prototype.attributeChangedCallback = function () { this._render(); };
  FmIcon.prototype._render = function () {
    if (!this._root) this._root = this.attachShadow({ mode: 'open' });
    var name = this.getAttribute('name') || '';
    var size = this.getAttribute('size') || '20';
    var d = icons[name];
    this.style.display = 'inline-flex';
    this.style.flexShrink = '0';
    this.style.lineHeight = '0';
    this._root.innerHTML = d
      ? '<svg width="' + size + '" height="' + size + '" viewBox="' + d.viewBox +
        '" fill="none" aria-hidden="true" focusable="false" style="display:block">' +
        clean(d.body, d.viewBox) + '</svg>'
      : '';
  };

  if (!customElements.get('fm-icon')) customElements.define('fm-icon', FmIcon);
})();
