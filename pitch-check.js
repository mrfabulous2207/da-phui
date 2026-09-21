/* node pitch-check.js — geometry test for the formation grid.
   Every position in the app is generated from (band, channel), the way FM's
   tactic pitch works, so the thing worth testing is that the generator lands
   people in football-legal places. Run after touching FORMATION_SPEC, BAND,
   or the pitch markings in index.html. */
const fs = require("fs");
const src = fs.readFileSync("app.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");

const grab = (start, end, from) => {
  const a = src.indexOf(start, from || 0);
  if (a < 0) throw new Error("not found: " + start);
  const b = src.indexOf(end, a);
  return src.slice(a, b);
};
// Run the app's own generator, not a copy of it, so this fails when the real
// thing breaks rather than when the copy drifts.
const SIZE_FORMATIONS = eval(grab("const BAND = {", "function defaultTactic") + ";SIZE_FORMATIONS");
const SIZE_RATIO = eval("(" + grab("{", "};", src.indexOf("const SIZE_RATIO")) + "})");
// width / height per pitch size, e.g. "3 / 4" -> 0.75
const arOf = size => { const [w, h] = SIZE_RATIO[size].split("/").map(Number); return w / h; };

/* Pitch geometry, read off the markings in index.html so the two cannot drift.
   y is % from the top; our goal line is 100. */
const boxDeep = parseFloat(/bottom:8px; width:59.3%; height:([\d.]+)%/.exec(html)[1]);
const boxWide = 59.3;
const PITCH = {
  ourGoalLine: 100,
  ourBoxTop: 100 - boxDeep,          // penalty area line, ~84.3
  ourSixTop: 100 - boxDeep * (5.5 / 16.5),
  boxLeft: 50 - boxWide / 2,
  boxRight: 50 + boxWide / 2,
  halfway: 50,
  theirBoxTop: boxDeep
};
const TOKEN = 9;   // token diameter, as a % of pitch WIDTH (--tok is 9cqw)
/* Converting a vertical gap into token-widths: a gap of dy% of the HEIGHT is
   dy * H/W = dy / (W/H) percent of the width. Dividing, not multiplying -- on a
   tall pitch a given % of height is a bigger distance than the same % of width. */
const yToWidth = (dy, ar) => dy / ar;

let fails = 0, checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { fails++; console.log("  FAIL " + msg); } };

const FLANK = /^(LB|RB|LM|RM|LW|RW)$/;

for (const size of Object.keys(SIZE_FORMATIONS)) {
  for (const name of Object.keys(SIZE_FORMATIONS[size])) {
    const f = SIZE_FORMATIONS[size][name];
    const pts = f.pos.map(p => [parseFloat(p[0]), parseFloat(p[1])]);
    const tag = size + "-a-side " + name + ":";
    const say = m => tag + " " + m;

    ok(pts.length === f.labels.length, say("labels and positions differ in length"));
    ok(pts.length === +size, say("has " + pts.length + " players, not " + size));

    const gk = pts[f.labels.indexOf("GK")];
    ok(!!gk, say("no GK"));
    if (gk) {
      // The whole point of the reported bug: a keeper standing outside his box.
      ok(gk[1] > PITCH.ourBoxTop,
        say("GK at y=" + gk[1] + " is outside the penalty area (line at " + PITCH.ourBoxTop.toFixed(1) + ")"));
      ok(gk[1] < PITCH.ourGoalLine - 4, say("GK at y=" + gk[1] + " is standing in the goal"));
      ok(gk[0] > PITCH.boxLeft && gk[0] < PITCH.boxRight,
        say("GK at x=" + gk[0] + " is outside the width of his own box"));
    }

    pts.forEach((p, i) => {
      const who = f.labels[i];
      // Nobody off the pitch, allowing for the token's own radius.
      ok(p[0] - TOKEN / 2 > 2 && p[0] + TOKEN / 2 < 98, say(who + " x=" + p[0] + " hangs off the touchline"));
      ok(p[1] > 4 && p[1] < 97, say(who + " y=" + p[1] + " is off the goal line"));
      // Outfielders do not stand in their own six-yard box.
      if (who !== "GK") ok(p[1] < PITCH.ourSixTop, say(who + " y=" + p[1] + " is inside his own six-yard box"));
    });

    // Teammates must not overlap, measured in token-widths.
    let tight = Infinity, pair = "";
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const d = Math.hypot(pts[i][0] - pts[j][0], yToWidth(pts[i][1] - pts[j][1], arOf(size)));
      if (d < tight) { tight = d; pair = f.labels[i] + "/" + f.labels[j]; }
    }
    ok(tight >= TOKEN * 0.9, say(pair + " overlap, centres " + tight.toFixed(1) + " apart, token is " + TOKEN));

    // A line is a line: same band, same depth. FM draws flat lines and so
    // should we -- a 6% stagger inside a back three reads as a mistake.
    const byDepth = {};
    pts.forEach((p, i) => { (byDepth[p[1]] = byDepth[p[1]] || []).push(f.labels[i]); });
    const depths = Object.keys(byDepth).map(Number).sort((a, b) => a - b);
    depths.forEach(d => {
      const near = depths.filter(o => o !== d && Math.abs(o - d) < 7);
      ok(!near.length, say("y=" + d + " (" + byDepth[d] + ") sits " +
        near.map(o => Math.abs(o - d).toFixed(0)).join("/") + "% off y=" + near +
        " (" + near.map(o => byDepth[o]).join(",") + ") -- neither one line nor two"));
    });

    // Mirror-image formations should actually be mirror images.
    pts.forEach((p, i) => {
      const who = f.labels[i];
      if (!/^(LB|LM|LW)$/.test(who)) return;
      const mate = who.replace(/^L/, "R");
      const j = f.labels.indexOf(mate);
      if (j < 0) return;
      ok(Math.abs((100 - pts[j][0]) - p[0]) < 0.6, say(who + "/" + mate + " are not symmetric"));
      ok(Math.abs(pts[j][1] - p[1]) < 0.6, say(who + "/" + mate + " sit at different depths"));
    });

    // A full-back stands clearly wider than the centre-backs he plays beside.
    // Stated relative to his own line rather than to the painted box, so it
    // means the same on a 5-a-side pitch as on an 11-a-side one.
    const cbX = f.labels.map((l, i) => l === "CB" ? pts[i][0] : null).filter(x => x !== null);
    f.labels.forEach((who, i) => {
      if (!/^(LB|RB|LM|RM)$/.test(who) || !cbX.length) return;
      const nearest = cbX.reduce((m, x) => Math.min(m, Math.abs(x - pts[i][0])), Infinity);
      ok(nearest >= 10, say(who + " x=" + pts[i][0] + " is only " + nearest.toFixed(1) +
        " from a centre-back -- that is not a wide player"));
    });

    // Attack in front of midfield in front of defence in front of the keeper.
    const bandOf = l => l === "GK" ? 0 : /^(LB|RB|CB)$/.test(l) ? 1 : /^CDM$/.test(l) ? 2
      : /^(CM|LM|RM)$/.test(l) ? 3 : /^CAM$/.test(l) ? 4 : 5;
    const worst = {};
    f.labels.forEach((l, i) => {
      const b = bandOf(l);
      worst[b] = worst[b] === undefined ? pts[i][1] : Math.min(worst[b], pts[i][1]);
    });
    Object.keys(worst).map(Number).sort((a, b) => a - b).forEach((b, n, arr) => {
      if (!n) return;
      ok(worst[b] < worst[arr[n - 1]], say("band " + b + " is not in front of band " + arr[n - 1]));
    });
  }
}
console.log(fails ? "\n" + fails + " failures out of " + checks + " checks"
                  : "ok — " + checks + " geometry checks pass");
process.exit(fails ? 1 : 0);
