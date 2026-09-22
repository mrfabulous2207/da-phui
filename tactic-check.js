/* node tactic-check.js — the tactic model is pure, so it gets a real test.
   Covers the two things that silently rot: Cách đá driving every instruction
   default, and the conflict check firing on the right shapes and staying quiet
   on sane ones. Run after touching MENTALITY_INS, INS_PHASES, ROLES or
   tacticConflicts. */
const fs = require("fs");
const src = fs.readFileSync("app.js", "utf8");
const grab = (a, b) => { const i = src.indexOf(a); return src.slice(i, src.indexOf(b, i)); };
// Indirect eval, so the grabbed source runs in its own global scope: a direct
// eval shares this module's scope and its function declarations collide with
// the names being destructured out of it.
const EXPORTS = "({attState, attGoing, attCounts, ATT_LABEL, ATT_COLOR, ATT_BG, ATT_ORDER, ATT_RANK, fixtureTitle, kitLabelOf, eventFields, slotsForPos, venueOf, splitSides, SPLIT_LINES, phaseOf, forPhase, phaseIndex, ROLES, ROLES_OOP, rolesFor, roleShift, splitLegacyRole, slotKeeps, oopChoices, phaseBase, SIZE_FORMATIONS, FORMATION_SPEC, OOP_SPEC, DUTIES, roleDuty, INS_ROWS, MENTALITY_INS, insOf, tacticConflicts, shapeFor, fitCost, fitLabel, fitUnknown, bestFreeSlot, tallyBy, INSIGHT_MIN, phoneKey, pwSalt, teamListMerge, mergeMembers, adoptMembers, subLog, pitchPct, tweenPos, playHead, ratingOf, gradeOf, starsOf, playerDesc, ageFrom, ageWord, standoutKeys, DESC_POS, DESC_ADJ, parsePos, POS_ALIAS, posCycle, posToText, posCycleSay, cropBox, PHOTO_PX, EV_KINDS, matchDay, evTally, evLabel, evSort, playedIds, ratingView, ratedSquadAvg, starCount, starText, starGapText, ptGapText, ratedCount, ATTRS, seasonRecord, trophySort, clubTimeline, withYearMarks, trophyTally, trophyPlace, oppOf, TROPHY_PLACES, addTarget, debtChip, attrLevel, barValueAt, radarPoints, ratedTop, ratedAvg, posAvg, isKeeper, honourBoard, HONOURS, statCell, memSorted, matchEvSummary, memberMatchRows, scoreProblem, minuteProblem, moneyProblem, dayProblem, matchOrder, memberProblem, memberWarning, safeUrl, occHit, shortName, dmyKey, hurtInfo, calOkDmy, formSummary, readiness, readyTag, roleStars, starGlyphs, matchInsights, extraState, matchByDay, defaultRankBy, benchOf, nearestSlotIdx, restPenalty, sideCost, fitCostAt, SIDE_OF, hexBox, netWhy, debtSessions, planOf, forPlan, planIndex, stampPlans, SITUATIONS, sitOk, sitLabel, planKeyOf})";
const M = (0, eval)(grab("const POS_CODES", "const FORMATIONS = {") + ";" + EXPORTS);
const { attState, attGoing, attCounts, ATT_LABEL, ATT_COLOR, ATT_BG, ATT_ORDER, ATT_RANK, fixtureTitle, kitLabelOf, eventFields, slotsForPos, venueOf, splitSides, SPLIT_LINES, phaseOf, forPhase, phaseIndex, ROLES, ROLES_OOP, rolesFor, roleShift, splitLegacyRole, slotKeeps, oopChoices, phaseBase, SIZE_FORMATIONS, FORMATION_SPEC, OOP_SPEC, DUTIES, roleDuty, INS_ROWS, MENTALITY_INS, insOf, tacticConflicts, shapeFor, fitCost, fitLabel, fitUnknown, bestFreeSlot, tallyBy, INSIGHT_MIN, phoneKey, pwSalt, teamListMerge, mergeMembers, adoptMembers, subLog, pitchPct, tweenPos, playHead, ratingOf, gradeOf, starsOf, playerDesc, ageFrom, ageWord, standoutKeys, DESC_POS, DESC_ADJ, parsePos, POS_ALIAS, posCycle, posToText, posCycleSay, cropBox, PHOTO_PX, EV_KINDS, matchDay, evTally, evLabel, evSort, playedIds, ratingView, ratedSquadAvg, starCount, starText, starGapText, ptGapText, ratedCount, ATTRS, seasonRecord, trophySort, clubTimeline, withYearMarks, trophyTally, trophyPlace, oppOf, TROPHY_PLACES, addTarget, debtChip, attrLevel, barValueAt, radarPoints, ratedTop, ratedAvg, posAvg, isKeeper, honourBoard, HONOURS, statCell, memSorted, matchEvSummary, memberMatchRows, scoreProblem, minuteProblem, moneyProblem, dayProblem, matchOrder, memberProblem, memberWarning, safeUrl, occHit, shortName, dmyKey, hurtInfo, calOkDmy, formSummary, readiness, readyTag, roleStars, starGlyphs, matchInsights, extraState, matchByDay, defaultRankBy, benchOf, nearestSlotIdx, restPenalty, sideCost, fitCostAt, SIDE_OF, hexBox, netWhy, debtSessions, planOf, forPlan, planIndex, stampPlans, SITUATIONS, sitOk, sitLabel, planKeyOf } = M;

let fails = 0, n = 0;
const ok = (cond, msg) => { n++; if (!cond) { fails++; console.log("  FAIL " + msg); } };
const eq = (a, b, msg) => ok(a === b, msg + " — got " + JSON.stringify(a) + ", want " + JSON.stringify(b));

const KEYS = ["tempo", "width", "onLoss", "onWin", "line", "press", "mark"];

// Cách đá sets every instruction, and each mentality is genuinely different.
["def", "bal", "att"].forEach(m => {
  KEYS.forEach(k => ok(insOf({ mentality: m, ins: {} }, k) != null,
    "mentality " + m + " leaves " + k + " undefined"));
});
ok(KEYS.some(k => insOf({ mentality: "def", ins: {} }, k) !== insOf({ mentality: "att", ins: {} }, k)),
  "Phòng ngự and Tấn công produce the same instructions — the control does nothing");
eq(insOf({ mentality: "att", ins: {} }, "press"), "high", "Tấn công should press high");
eq(insOf({ mentality: "def", ins: {} }, "line"), "low", "Phòng ngự should sit low");

// An explicit choice beats the mentality, and only for its own row.
const t = { mentality: "att", ins: { press: "low" } };
eq(insOf(t, "press"), "low", "explicit press should win over mentality");
eq(insOf(t, "line"), "high", "an override on one row must not disturb another");

// Every option key a phase offers must be reachable, and every instruction a
// mentality names must exist as a row — otherwise a value renders as nothing.
INS_ROWS.forEach(r => ok(r.opts.length >= 2, r.key + " has fewer than two options"));
KEYS.forEach(k => ok(INS_ROWS.some(r => r.key === k), "MENTALITY_INS names " + k + " but no row offers it"));
INS_ROWS.forEach(r => ok(Object.keys(MENTALITY_INS).every(m => r.opts.some(o => o[0] === MENTALITY_INS[m][r.key])),
  r.key + ": a mentality default is not one of its options"));
INS_ROWS.forEach(r => r.opts.forEach(o => ok(typeof o[2] === "string" && o[2].length > 8,
  r.key + "/" + o[0] + " has no consequence text — a knob nobody can read is a knob nobody uses")));

// Roles all declare a posture, and it is one the dot can paint.
Object.keys(ROLES).forEach(g => ROLES[g].forEach(r => {
  ok(DUTIES.some(d => d[0] === r[3]), g + "/" + r[0] + " has posture " + r[3] + ", which is not a duty");
  eq(roleDuty(g, r[0]), r[3], "roleDuty(" + g + "," + r[0] + ")");
}));
eq(roleDuty("fb", "nope"), "bal", "an unknown role should fall back to balanced, not crash");

// Conflicts fire on the shapes they name.
const backs = n2 => Array.from({ length: n2 }, () => ({ group: "cb", duty: "def" }));
const has = (t2, keys, frag) => tacticConflicts(t2, keys).some(w => w.indexOf(frag) >= 0);
ok(has({ mentality: "bal", ins: { line: "high" } }, backs(3), "hàng thủ"),
  "high line behind an all-holding defence should warn");
ok(has({ mentality: "bal", ins: { press: "high", line: "low" } }, backs(2).concat([{ group: "fb", duty: "att" }]), "làm đôi"),
  "press high with a low line should warn");
ok(has({ mentality: "bal", ins: { onLoss: "counter", press: "low" } }, backs(2), "ngược nhau"),
  "counter-press with low pressing should warn");
ok(has({ mentality: "bal", ins: { onWin: "direct", tempo: "slow" } }, backs(2), "nhịp hai"),
  "break fast on a slow tempo should warn");

// And stay quiet on a tactic that agrees with itself.
const sane = [{ group: "cb", duty: "def" }, { group: "fb", duty: "bal" }, { group: "fb", duty: "att" },
              { group: "mid", duty: "bal" }, { group: "fw", duty: "att" }];
const quiet = tacticConflicts({ mentality: "bal", ins: {} }, sane);
ok(quiet.length === 0, "a balanced tactic with a mixed shape should not warn: " + quiet.join(" | "));

// The shape has to actually move, stay on the pitch, and keep the keeper home.
const POS = [["50%","92%"],["16%","79%"],["50%","79%"],["84%","79%"],["30%","52%"],["70%","52%"],["50%","22%"]];
const POST = ["gk","def","def","def","bal","bal","att"];
const yOf = sh => sh.map(p => parseFloat(p[1]));
const xOf = sh => sh.map(p => parseFloat(p[0]));
const low  = shapeFor({ mentality: "bal", ins: { line: "low"  } }, POS, POST, "off");
const high = shapeFor({ mentality: "bal", ins: { line: "high" } }, POS, POST, "off");
ok(yOf(high)[4] < yOf(low)[4], "a high line must draw the block further up than a low one");
eq(yOf(low)[0], 92, "the keeper must not follow the block back into his own net");
eq(yOf(high)[0], 92, "the keeper must not follow the block up the pitch either");

const narrow = shapeFor({ mentality: "bal", ins: { width: "narrow" } }, POS, POST, "on");
const wide   = shapeFor({ mentality: "bal", ins: { width: "wide"   } }, POS, POST, "on");
ok(Math.abs(xOf(narrow)[1] - 50) < Math.abs(xOf(wide)[1] - 50), "narrow must pinch the shape in, wide must stretch it out");

const onBall = shapeFor({ mentality: "bal", ins: {} }, POS, POST, "on");
ok(yOf(onBall)[6] < parseFloat(POS[6][1]), "a player told to get forward should be further forward with the ball");

// The clamp is a backstop, not the mechanism: the widest instruction on the
// widest formation must still land inside the pitch on its own.
const widest = shapeFor({ mentality: "att", ins: { width: "wide" } },
  [["50%","92%"],["12%","79%"],["88%","79%"]], ["gk","att","att"], "on");
widest.forEach((p, k) => ok(parseFloat(p[0]) > 8.5 && parseFloat(p[0]) < 91.5,
  "wide should not need the clamp — slot " + k + " landed at " + p[0]));

// Nothing may leave the pitch, at any mentality, in either phase.
["def","bal","att"].forEach(m => ["on","off"].forEach(ph => {
  shapeFor({ mentality: m, ins: {} }, POS, POST, ph).forEach((p, k) => {
    const x = parseFloat(p[0]), y = parseFloat(p[1]);
    ok(x >= 8 && x <= 92 && y >= 6 && y <= 94,
      m + "/" + ph + " puts slot " + k + " off the pitch at " + p.join(","));
  });
}));
// Instructions must move the shape, or the preview is decoration.
const attOff = shapeFor({ mentality: "att", ins: {} }, POS, POST, "off");
const defOff = shapeFor({ mentality: "def", ins: {} }, POS, POST, "off");
ok(yOf(attOff).join() !== yOf(defOff).join(), "Cách đá must change the defensive shape, not just the labels");

// "Chưa ai điền vị trí" must never be reported as "playing out of position": one
// says fix the profile, the other says move him, and 14 of the 36 demo squad have
// no position at all.
const noPos = { main: "", alt: [] };
const natural = { main: "CM", alt: [] };
const wrong = { main: "GK", alt: [] };
ok(fitUnknown(noPos), "a player with no stated position must read as unknown");
ok(!fitUnknown(natural), "a player with a position must not read as unknown");
eq(fitLabel(fitCost(noPos, "TV"), fitUnknown(noPos)), "chưa rõ vị trí", "unknown wording");
eq(fitLabel(fitCost(natural, "TV"), fitUnknown(natural)), "sở trường", "natural wording");
eq(fitLabel(fitCost(wrong, "TĐ"), fitUnknown(wrong)), "lệch tuyến", "out-of-position wording");
// The score is deliberately untouched, so autoFill and the shortlist keep their order.
eq(fitCost(noPos, "TV"), 7, "unknown must still cost 7 — display changed, ranking did not");
ok(fitCost(noPos, "TV") > fitCost(natural, "TV"),
  "an unknown player must still rank below a natural fit");


// Counting what happened, and refusing to dress up one match as a win rate.
const G = [
  { formation: "A", mentality: "bal", gf: 3, ga: 1 },
  { formation: "A", mentality: "bal", gf: 2, ga: 2 },
  { formation: "A", mentality: "att", gf: 0, ga: 4 },
  { formation: "B", mentality: "def", gf: 1, ga: 0 },
  { mentality: "bal", gf: 9, ga: 0 }            // trận cũ, không ghi sơ đồ
];
const byForm = tallyBy(G.filter(g => g.formation), g => g.formation, k => k);
eq(byForm.length, 2, "two formations were played");
eq(byForm[0].label, "A", "the most-played formation sorts first");
eq(byForm[0].record, "1T 1H 1B", "A's record");
ok(/33% th/.test(byForm[0].rate), "three matches is enough to state a rate — got " + byForm[0].rate);
eq(byForm[1].rate, "chưa đủ trận", "one match must not be reported as a win rate");
ok(byForm[1].tone.indexOf("rgba") === 0, "an unproven row must stay neutral, not green");
eq(INSIGHT_MIN, 3, "the threshold below which no rate is claimed");
// A match saved before the app started recording carries no formation and must be
// skipped rather than counted into some blank bucket.
eq(tallyBy(G, g => g.formation, k => k).length, 2, "matches with no formation are skipped");
// Every played match lands in exactly one bucket.
eq(byForm.reduce((a, r) => a + parseInt(r.n, 10), 0), 4, "no match is dropped or double-counted");


/* So dien thoai la tai khoan dang nhap. Admin go "090 000 0123" vao form thanh
   vien, chinh nguoi do go "0900000123" o man dang nhap, va app noi "So nay chua
   thuoc doi nao" -- bao ho chua co trong doi trong khi ho co. So bang SO. */
eq(phoneKey("090 000 0123"), "0900000123", "khoang trang khong doi so");
eq(phoneKey("090.000.0123"), "0900000123", "dau cham khong doi so");
eq(phoneKey("090-000-0123"), "0900000123", "gach ngang khong doi so");
eq(phoneKey("(090) 000 0123"), "0900000123", "ngoac khong doi so");
eq(phoneKey("+84900000123"), "0900000123", "+84 la cung mot so");
eq(phoneKey("84900000123"), "0900000123", "84 khong dau cong cung vay");
eq(phoneKey("0900000123"), "0900000123", "so lien giu nguyen");
eq(phoneKey(""), "", "rong ra rong");
eq(phoneKey(null), "", "null ra rong, khong phai 'null'");
eq(phoneKey(undefined), "", "undefined ra rong");
ok(phoneKey("084") !== "0", "so ngan khong bi cat nham thanh tien to nuoc");
eq(phoneKey("0912345678") === phoneKey("091 234 5678"), true, "hai cach viet cung mot nguoi");
ok(phoneKey("0900000123") !== phoneKey("0900000124"), "hai so khac nhau van khac nhau");

/* Muoi phai ngau nhien va dung do dai, neu khong thi bam ra dung nhau. */
eq(pwSalt().length, 32, "muoi 16 byte = 32 ky tu hex");
ok(pwSalt() !== pwSalt(), "hai lan goi ra hai muoi khac nhau");
ok(/^[0-9a-f]+$/.test(pwSalt()), "muoi chi gom hex");

/* Vao doi thu hai khong duoc lam mat doi thu nhat. Khoa theo `code`. */
eq(teamListMerge([], {code:"A", name:"X"}).length, 1, "them doi dau tien");
eq(teamListMerge([{code:"A",name:"X"}], {code:"A",name:"X moi"}).length, 1, "cung ma thi cap nhat, khong nhan doi");
eq(teamListMerge([{code:"A",name:"X"}], {code:"A",name:"X moi"})[0].name, "X moi", "ban moi de len ban cu");
eq(teamListMerge([{code:"A",name:"X"}], {code:"B",name:"Y"}).length, 2, "ma khac thi them");
eq(teamListMerge([{code:"A",name:"X",adminKey:"k"}], {code:"A",rev:5})[0].adminKey, "k", "cap nhat khong lam mat chia admin");
eq(teamListMerge([{code:"A"},{code:"B"}], {code:"A",name:"moi"})[0].code, "A", "giu nguyen thu tu");

/* Xung dot khong duoc giai bang cach vut viec cua minh di. Cuoc dua that o day
   chi co MOT dang: may khac vua them mot nguoi (team_join). Nen hop nhat danh
   sach nguoi, con lai giu ban cua minh. */
const L=[{id:1,phone:"0901",name:"Toi sua"}], S=[{id:1,phone:"0901",name:"Ban cu"},{id:2,phone:"0902",name:"Nguoi moi"}];
eq(mergeMembers(L,S).length, 2, "nguoi moi tu may chu duoc giu");
eq(mergeMembers(L,S)[0].name, "Toi sua", "sua doi cua minh khong bi de len");
eq(mergeMembers(L,S)[1].name, "Nguoi moi", "nguoi may chu them duoc noi vao");
eq(mergeMembers([],S).length, 2, "minh rong thi lay het cua may chu");
eq(mergeMembers(L,[]).length, 1, "may chu rong thi giu cua minh");
eq(mergeMembers([{phone:"090 1",name:"A"}],[{phone:"0901",name:"B"}]).length, 1, "so viet khac nhau van la mot nguoi");
eq(mergeMembers(null,null).length, 0, "null khong lam no no");

/* Cuc du lieu thuoc dung MOT doi, nen ai nam trong do la nguoi cua doi do. Loc
   theo teamId ben trong cuc ay chi lam nguoi ta bien mat khong tieng dong. */
eq(adoptMembers([{name:"A",teamId:1},{name:"B",teamId:999}], 7).every(m=>m.teamId===7), true, "moi nguoi trong cuc deu thuoc doi do");
eq(adoptMembers([{name:"A",teamId:1}], 7)[0].name, "A", "khong lam hong truong khac");
eq(adoptMembers([], 7).length, 0, "rong van rong");
eq(adoptMembers(null, 7).length, 0, "null khong lam no");
eq(adoptMembers([{name:"A"}], undefined)[0].teamId, undefined, "khong co id doi thi dung bia ra");

/* Thay nguoi la MOT viec, khong phai hai. Ghi lai ai vao thay ai. */
eq(subLog([], {outName:"A", inName:"B", at:"19:30"}).length, 1, "ghi mot luot thay");
eq(subLog([], {outName:"A", inName:"B", at:"19:30"})[0].text, "B vào thay A · 19:30", "cau chu doc duoc");
eq(subLog([{text:"cu"}], {outName:"A", inName:"B", at:"1"}).length, 2, "noi tiep, khong de len");
eq(subLog(null, {outName:"A", inName:"B", at:"1"}).length, 1, "null khong lam no");
eq(subLog([], {outName:"", inName:"B", at:"1"}).length, 0, "thieu nguoi ra thi khong ghi");
eq(subLog([], {outName:"A", inName:"", at:"1"}).length, 0, "thieu nguoi vao thi khong ghi");

/* Toa do mui ten. dc-mini ve lai ca cay moi lan doi state, va vong keo 8 giay
   cung ve lai -- nen mot cu bam co the roi vao the DA BI THAY, rect rong 0, va
   phep chia ra Infinity. Truoc day Infinity ghi thang vao kho va song qua tai
   lai. Chan o nguon: khong huu han thi tu choi, va ep ve trong san. */
eq(pitchPct(50, 0, 200), 25, "giua thi ra 25%");
eq(pitchPct(0, 0, 200), 0, "mep trai ra 0");
eq(pitchPct(200, 0, 200), 100, "mep phai ra 100");
eq(pitchPct(100, 0, 0), null, "rect rong 0 -> null, khong phai Infinity");
eq(pitchPct(-50, 0, 200), 0, "ra ngoai ben trai bi ep ve 0");
eq(pitchPct(400, 0, 200), 100, "ra ngoai ben phai bi ep ve 100");
eq(pitchPct(NaN, 0, 200), null, "NaN -> null");
eq(pitchPct(100, 0, NaN), null, "rect hong -> null");

/* Animation nhieu buoc, kieu bang chien thuat cua HLV: moi buoc la mot anh chup
   vi tri, phat lai thi noi suy giua hai buoc lien tiep. */
const P1=[["10%","20%"],["30%","40%"]], P2=[["20%","20%"],["30%","80%"]];
eq(tweenPos(P1,P2,0)[0][0], "10%", "t=0 la buoc dau");
eq(tweenPos(P1,P2,1)[0][0], "20%", "t=1 la buoc sau");
eq(tweenPos(P1,P2,0.5)[0][0], "15%", "giua duong thi o giua");
eq(tweenPos(P1,P2,0.5)[1][1], "60%", "noi suy ca truc doc");
eq(tweenPos(P1,P2,0.5).length, 2, "giu du so nguoi");
eq(tweenPos(P1,[["9%","9%"]],0.5).length, 1, "buoc sau it nguoi hon thi lay so nho");
eq(tweenPos(null,null,0.5).length, 0, "null khong lam no");

/* playHead: doi mot moc thoi gian thanh (buoc nao, di duoc bao nhieu). */
eq(playHead(0, 3, 1000).i, 0, "moc 0 la buoc 0");
eq(playHead(0, 3, 1000).t, 0, "moc 0 chua di duoc gi");
eq(playHead(500, 3, 1000).i, 0, "nua giay dau van o doan 0->1");
eq(playHead(500, 3, 1000).t, 0.5, "va di duoc nua doan");
eq(playHead(1000, 3, 1000).i, 1, "het giay dau la sang doan 1->2");
eq(playHead(2500, 3, 1000).i, 1, "qua het thi dung o doan cuoi");
eq(playHead(2500, 3, 1000).t, 1, "va dung o cuoi doan");
eq(playHead(500, 1, 1000).i, 0, "mot buoc thi khong co gi de noi suy");
eq(playHead(500, 0, 1000).i, 0, "khong buoc nao cung khong no");

/* Hang phai SUY RA tu chi so, khong phai go tay. Truoc day grp go tay -> rating
   suy tu grp -> 12 chi so khong nuoi gi ca, chi de trang tri. */
const all=(v)=>({finish:v,dribble:v,pass:v,shot:v,defend:v,header:v,position:v,gk:v,stamina:v,pace:v,strength:v,spirit:v});
eq(ratingOf({attrs:all(17)}), 17, "moi chi so 17 thi diem 17");
eq(ratingOf({attrs:all(9)}), 9, "moi chi so 9 thi diem 9");
eq(gradeOf(17), "S", "17 la hang S");
eq(gradeOf(15), "A", "15 la hang A");
eq(gradeOf(13), "B", "13 la hang B");
eq(gradeOf(11), "C", "11 la hang C");
eq(gradeOf(9),  "D", "9 la hang D");
eq(gradeOf(20), "S", "tran tren van S");
eq(gradeOf(1),  "D", "san duoi van D");

/* Bat gon khong duoc keo diem cau thu san xuong. */
const sanTot={...all(17), gk:1};
ok(ratingOf({attrs:sanTot}) >= 16, "cau thu san bat gon te van giu diem cao");
const thuMonTot={...all(1), gk:18, position:18, spirit:18, strength:18, pace:18};
ok(ratingOf({posMain:"GK", attrs:thuMonTot}) >= 16, "thu mon tinh theo chi so thu mon");
ok(ratingOf({posMain:"GK", attrs:{...all(18), gk:1}}) < 16, "thu mon bat gon te thi diem thap");

/* Ban ghi cu chua co chi so: giu nguyen diem cu, dung tu nhien tut hang. */
eq(ratingOf({rating:15}), 15, "chua co chi so thi dung diem cu");
eq(ratingOf({}), 10, "khong co gi ca thi ve mac dinh 10");

/* Ho so dien do dang: chi so chua dat KHONG duoc bo qua, vi nhu the la cham
   nguoi ta chi bang nua ho so da dien. Lay diem cu lam uoc luong cho phan trong. */
eq(ratingOf({rating:17, attrs:{finish:11,dribble:11,pass:11,shot:11,defend:11,header:11}}), 14,
   "6 chi so 11 + 5 con lai uoc luong 17 -> 14");
eq(ratingOf({rating:17, attrs:{finish:17}}), 17, "dien mot chi so bang diem cu thi khong doi");
eq(gradeOf(ratingOf({rating:17, attrs:{finish:11,dribble:11,pass:11,shot:11,defend:11,header:11}})), "B",
   "nua ho so tut xuong B, khong nhay thang xuong C");


/* ---------- hai pha, hai vai tro ----------
   Cau 52 cua ban kiem 100 cau: "Kem chat" va "Boc lot" tung cho ra DUNG MOT cho
   dung, vi ca hai deu la tu the `def`. Hai lua chon khac nhau, mot ket qua.
   Duoi day la phep kiem khang dinh chuyen do khong quay lai duoc. */
const CBT = { g: "cb", r: "tight" }, CBC = { g: "cb", r: "cover" };
ok(roleShift("cb", "off", "tight")[1] < 0,
  "Kem chat la 1 kem 1 -- phai buoc LEN theo nguoi, khong lui");
ok(roleShift("cb", "off", "cover")[1] > 0,
  "Boc lot la cham cho sau lung dong doi -- phai dung SAU, khong dang");
const BASE2 = [["50.0%", "79.0%"], ["50.0%", "79.0%"]];
const twoCb = shapeFor({ mentality: "bal", ins: {} }, BASE2, [CBT, CBC], "off");
ok(twoCb[0][1] !== twoCb[1][1],
  "Kem chat va Boc lot van ve ra cung mot cho -- cau 52 chua duoc sua");
ok(parseFloat(twoCb[0][1]) < parseFloat(twoCb[1][1]),
  "nguoi kem chat phai dung cao hon nguoi boc lot");

ok(roleShift("cb", "on", "tight")[1] === 0,
  "khoa cua pha mat bong khong duoc dich chuyen gi o pha co bong");
ok(roleShift("fb", "on", "wide")[1] < 0 && roleShift("fb", "on", "wide")[0] > 0,
  "Dang bien phai vua len cao vua ra bien khi co bong");
ok(roleShift("fb", "off", "tuck")[0] < 0,
  "Thu vao trong phai keo hau ve bien VAO GIUA khi mat bong");

const legacyOn = shapeFor({ mentality: "bal", ins: {} }, BASE2, ["att", "def"], "on");
ok(parseFloat(legacyOn[0][1]) < parseFloat(legacyOn[1][1]),
  "cach goi cu bang chuoi tu the phai chay y nhu truoc");

const GKB = [["50.0%", "92.0%"]];
eq(shapeFor({ mentality: "bal", ins: { line: "low" } }, GKB, [{ g: "gk", r: "keep" }], "off")[0][1],
  "92.0%", "thu mon khong duoc lui theo khoi");
ok(parseFloat(shapeFor({ mentality: "bal", ins: {} }, GKB, [{ g: "gk", r: "sweep" }], "off")[0][1]) < 92,
  "Quet bong phai dua thu mon ra khoi vach -- cau 62");

/* ---------- so do thu hai ---------- */
Object.keys(FORMATION_SPEC).forEach(size => {
  Object.keys(FORMATION_SPEC[size]).forEach(name => {
    eq(SIZE_FORMATIONS[size][name].pos.length, parseInt(size, 10),
      "so do " + name + " cua san " + size + " sai so nguoi");
    eq(SIZE_FORMATIONS[size][name].labels.length, SIZE_FORMATIONS[size][name].pos.length,
      "so do " + name + ": so nhan khong khop so vi tri");
  });
});

Object.keys(OOP_SPEC).forEach(size => {
  Object.keys(OOP_SPEC[size]).forEach(ip => {
    ok(!!SIZE_FORMATIONS[size][ip], "OOP_SPEC khai so do co bong khong ton tai: " + ip);
    OOP_SPEC[size][ip].forEach(pair => {
      const off = SIZE_FORMATIONS[size][pair[0]];
      ok(!!off, "so do mat bong khong ton tai: " + pair[0] + " (san " + size + ")");
      if (!off) return;
      eq(off.pos.length, SIZE_FORMATIONS[size][ip].pos.length,
        ip + " -> " + pair[0] + " lech so nguoi");
      if (pair[1]) {
        eq(pair[1].length, off.pos.length, ip + " -> " + pair[0] + ": ban do sai do dai");
        const seen = pair[1].slice().sort((a, b) => a - b);
        ok(seen.every((v, k) => v === k),
          ip + " -> " + pair[0] + ": ban do khong phai hoan vi -- co o bi bo hoac dung hai lan");
      }
    });
  });
});

const ipPos = SIZE_FORMATIONS["7"]["1-2-3-1"].pos;
eq(JSON.stringify(phaseBase("7", "1-2-3-1", "", "off")), JSON.stringify(ipPos),
  "chua chon hinh mat bong thi phai giu nguyen hinh co bong");
eq(JSON.stringify(phaseBase("7", "1-2-3-1", "1-4-1-1", "on")), JSON.stringify(ipPos),
  "pha co bong khong duoc dung hinh mat bong");
const offPos = phaseBase("7", "1-2-3-1", "1-4-1-1", "off");
eq(offPos.length, 7, "hinh mat bong sai so nguoi");
ok(parseFloat(offPos[3][1]) > parseFloat(ipPos[3][1]),
  "tien ve trai phai LUI XUONG hang hau ve khi mat bong");
ok(parseFloat(offPos[5][1]) > parseFloat(ipPos[5][1]),
  "tien ve phai phai LUI XUONG hang hau ve khi mat bong");
eq(offPos[0][1], ipPos[0][1], "thu mon khong doi cho giua hai hinh");
eq(JSON.stringify(phaseBase("7", "1-2-3-1", "1-3-1-2", "off")), JSON.stringify(ipPos),
  "cap khong khai trong OOP_SPEC phai roi ve hinh co bong");
eq(phaseBase("7", "khong-co", "", "on"), null, "so do khong ton tai phai tra null");

eq(oopChoices("7", "1-2-3-1")[0][0], "", "lua chon dau tien phai la giu nguyen hinh");
ok(oopChoices("7", "1-2-3-1").length > 1, "san 7 phai co it nhat mot hinh mat bong de chon");
eq(oopChoices("5", "1-3-1").length, 1, "san 5 co y khong doi hinh khi mat bong");

eq(splitLegacyRole("cb", "tight").roleOff, "tight", "Kem chat la vai tro cua pha mat bong");
eq(splitLegacyRole("cb", "tight").role, "", "Kem chat khong phai vai tro pha co bong");
eq(splitLegacyRole("fb", "wide").role, "wide", "Dang bien la vai tro cua pha co bong");
eq(splitLegacyRole("mid", "box").role, "box", "Bao san la vai tro cua pha co bong");
eq(splitLegacyRole("cb", "khong-co").role, "", "khoa la phai tra ve rong, khong nem loi");

Object.keys(ROLES).forEach(gp => {
  const ipKeys = ROLES[gp].map(r => r[0]);
  const oopKeys = (ROLES_OOP[gp] || []).map(r => r[0]);
  ok(!ipKeys.some(k => oopKeys.indexOf(k) >= 0),
    "nhom " + gp + " co khoa vai tro trung giua hai pha -- splitLegacyRole se doan bua");
  ok(oopKeys.length >= 2, "nhom " + gp + " thieu vai tro cho pha mat bong");
  ROLES[gp].forEach(r => eq(r.length, 6, "vai tro co bong " + gp + "/" + r[0] + " thieu do lech"));
});
Object.keys(ROLES_OOP).forEach(gp => {
  const first = ROLES_OOP[gp][0];
  eq(first[4], 0, "vai tro mat bong mac dinh cua " + gp + " phai trung tinh theo chieu ngang");
  eq(first[5], 0, "vai tro mat bong mac dinh cua " + gp + " phai trung tinh theo chieu doc");
});
Object.keys(ROLES).forEach(gp => {
  const first = ROLES[gp][0];
  ok(Math.abs(first[5]) <= 3, "vai tro co bong mac dinh cua " + gp + " keo o di qua xa");
});
Object.keys(ROLES_OOP).forEach(gp => ROLES_OOP[gp].forEach(r => {
  eq(r.length, 6, "vai tro mat bong " + gp + "/" + r[0] + " thieu do lech");
  eq(roleDuty(gp, r[0], "off"), r[3], "roleDuty(" + gp + "," + r[0] + ",off)");
}));


/* ---------- mui ten va buoc thuoc ve mot pha (cau 33, 34) ---------- */
// Ban ghi cu khong co truong `ph`. Luc chung duoc ve thi app chi co MOT san,
// va san do la pha co bong -- nen thieu `ph` phai doc thanh "on", khong phai
// bi vut di.
eq(phaseOf({}), "on", "ban ghi cu khong co ph phai thuoc pha co bong");
eq(phaseOf({ ph: "off" }), "off", "ph=off phai doc dung");
eq(phaseOf(null), "on", "khong co ban ghi thi cung khong duoc nem loi");
const MIX = [{ id: 1 }, { id: 2, ph: "off" }, { id: 3, ph: "on" }, { id: 4, ph: "off" }];
eq(forPhase(MIX, "on").map(v => v.id).join(","), "1,3", "loc pha co bong");
eq(forPhase(MIX, "off").map(v => v.id).join(","), "2,4", "loc pha mat bong");
eq(forPhase([], "on").length, 0, "danh sach rong khong duoc no");
eq(forPhase(null, "on").length, 0, "danh sach null khong duoc nem loi");
// Xoa buoc thu 2 cua pha mat bong phai xoa dung phan tu thu 4 cua mang day du.
eq(phaseIndex(MIX, "off", 1), 3, "chi so trong mang day du cua buoc thu 2 pha mat bong");
eq(phaseIndex(MIX, "on", 0), 0, "buoc dau cua pha co bong");
eq(phaseIndex(MIX, "off", 9), -1, "chi so vuot qua danh sach phai tra -1");
eq(phaseIndex([], "on", 0), -1, "danh sach rong tra -1");

/* ---------- mau thuan chi dao con thieu (cau 73) ---------- */
const K7 = [{ group: "gk", duty: "gk" }, { group: "cb", duty: "def" }, { group: "fb", duty: "att" },
            { group: "mid", duty: "bal" }, { group: "fw", duty: "att" }];
const warns = (ins, frag) => tacticConflicts({ mentality: "bal", ins }, K7).some(w => w.indexOf(frag) >= 0);
ok(warns({ line: "high", onLoss: "drop" }, "chạy ngược"),
  "dang cao + lui ve doi hinh phai bi bat");
ok(warns({ tempo: "fast", width: "narrow" }, "khoảng trống"),
  "da nhanh + bo hep phai bi bat");
ok(warns({ press: "high", onWin: "keep" }, "hạ nhịp"),
  "ap sat nhieu + gianh xong ha nhip phai bi bat");
/* Ba cach da dung san, tren mot doi hinh khong ai duoc giao dang cao hay giu
   cho, khong duoc keu gi. Canh bao keu voi mac dinh thi thoi la canh bao.
   Dung bo mau rieng: K7 co hai nguoi dang cao, va "dung thap + hai nguoi dang
   cao" LA mot mau thuan that -- luat cu bat dung. */
const KBAL = [{ group: "gk", duty: "gk" }, { group: "cb", duty: "bal" },
              { group: "fb", duty: "att" }, { group: "mid", duty: "bal" },
              { group: "fw", duty: "bal" }];
["def", "bal", "att"].forEach(m =>
  eq(tacticConflicts({ mentality: m, ins: {} }, KBAL).length, 0,
    "cach da " + m + " dung nguyen mac dinh khong duoc bao mau thuan"));
// Va luat cu do van phai keu khi that su co nguoi dang cao.
ok(tacticConflicts({ mentality: "def", ins: {} }, K7).length > 0,
  "dung thap ma van co nguoi duoc giao dang cao thi phai bao");


/* ---------- chia hai doi co nhin tuyen (cau 91) ---------- */
// Bo mau co y lech: bon thu mon, va diem chenh nhau ro rang.
const P = (id, ln, r) => ({ id, ln, r });
const SQUAD = [P(1,"TM",18), P(2,"TM",16), P(3,"TM",14), P(4,"TM",12),
               P(5,"HV",17), P(6,"HV",15), P(7,"HV",13), P(8,"HV",11),
               P(9,"TV",18), P(10,"TV",10), P(11,"TĐ",17), P(12,"TĐ",9)];
const rate = m => m.r, line = m => m.ln;
const sp = splitSides(SQUAD, rate, line);
eq(sp.a.length, 6, "chia 12 nguoi thi moi ben 6");
eq(sp.b.length, 6, "chia 12 nguoi thi moi ben 6");
eq(sp.a.concat(sp.b).sort((x, y) => x - y).join(","), "1,2,3,4,5,6,7,8,9,10,11,12",
  "khong duoc mat ai hay nhan doi ai");
// Moi tuyen phai duoc chia deu -- day la ca ly do ham nay ton tai.
SPLIT_LINES.forEach(ln => {
  const inLine = SQUAD.filter(m => m.ln === ln);
  if (inLine.length < 2) return;
  const a2 = inLine.filter(m => sp.a.indexOf(m.id) >= 0).length;
  const b2 = inLine.length - a2;
  ok(Math.abs(a2 - b2) <= 1, "tuyen " + ln + " lech " + a2 + "-" + b2 + " -- mot ben om het");
});
ok(Math.abs(sp.ptA - sp.ptB) <= 4, "hai ben lech diem qua xa: " + sp.ptA + " vs " + sp.ptB);
// Le nguoi thi lech dung mot, khong duoc lech hai.
const ODD = splitSides(SQUAD.slice(0, 11), rate, line);
ok(Math.abs(ODD.a.length - ODD.b.length) === 1, "le nguoi phai lech dung 1");
// Nguoi chua khai vi tri van phai duoc chia, khong bi bo lai.
const NOPOS = splitSides([P(1,"",10), P(2,"",10), P(3,"",10)], rate, line);
eq(NOPOS.a.length + NOPOS.b.length, 3, "nguoi chua khai vi tri khong duoc bo roi");
eq(splitSides([], rate, line).a.length, 0, "danh sach rong khong duoc nem loi");
eq(splitSides(null, rate, line).b.length, 0, "danh sach null khong duoc nem loi");
// Diem cao nhat cua moi tuyen khong duoc roi vao cung mot ben.
const gkTop = sp.a.indexOf(1) >= 0 ? "a" : "b";
const gk2 = sp.a.indexOf(2) >= 0 ? "a" : "b";
ok(gkTop !== gk2, "hai thu mon tot nhat phai o hai ben");


/* ---------- cho giu cho khong duoc lot ra man chinh ---------- */
// "San - (dien sau)" nam trong DU LIEU DA LUU cua doi, khong phai o trong, nen
// nhanh `place || "chua co"` khong bao gio chay va no hien ra 4 lan.
eq(venueOf("Sân - (điền sau)"), "", "cho giu cho phai doc thanh chua co san");
eq(venueOf("Sân 7 – (TBD)"), "", "gach ngang dai + ngoac cung la cho giu cho");
eq(venueOf(""), "", "chuoi rong");
eq(venueOf("   "), "", "chi co khoang trang");
eq(venueOf("-"), "", "mot gach ngang");
eq(venueOf("(điền sau)"), "", "chi co ngoac");
eq(venueOf("???"), "", "dau hoi");
eq(venueOf("chưa có"), "", "chu 'chua co' la chua co");
eq(venueOf(null), "", "null khong duoc nem loi");
eq(venueOf(undefined), "", "undefined khong duoc nem loi");
// Ten san THAT co dau ngoac van phai giu nguyen -- day la cho de sai nhat.
eq(venueOf("Sân Tao Đàn (cỏ 7)"), "Sân Tao Đàn (cỏ 7)",
  "ten san that co ngoac khong duoc coi la cho giu cho");
eq(venueOf("Sân Chảo Lửa"), "Sân Chảo Lửa", "ten san thuong giu nguyen");
eq(venueOf("  Sân A  "), "Sân A", "cat khoang trang hai dau");


/* ---------- doi thu va mau ao cua mot buoi ---------- */
// Buoi CO doi thu thi ten buoi la doi thu; buoi khong co thi ve nhan loai buoi.
// Phan lon ban ghi da luu khong co truong nay, nen nhanh fallback moi la nhanh
// chay nhieu nhat -- de no tra rong la ca the buoi toi mat tieu de.
eq(fixtureTitle("FC Bến Xe", "Buổi đá"), "vs FC Bến Xe", "co doi thu thi hien vs doi thu");
eq(fixtureTitle("", "Buổi đá"), "Buổi đá", "khong co doi thu thi ve nhan loai buoi");
eq(fixtureTitle("   ", "Buổi tập"), "Buổi tập", "chi khoang trang cung la khong co");
eq(fixtureTitle(null, "Buổi đá"), "Buổi đá", "null khong duoc nem loi");
eq(fixtureTitle(undefined, "Họp đội"), "Họp đội", "undefined khong duoc nem loi");
eq(fixtureTitle("  FC Bến Xe  ", "Buổi đá"), "vs FC Bến Xe", "cat khoang trang hai dau");
eq(fixtureTitle("FC Bến Xe", ""), "vs FC Bến Xe", "khong co nhan du phong van chay");
eq(fixtureTitle("", ""), "", "khong co gi ca thi tra rong, khong phai 'vs '");
eq(fixtureTitle("", null), "", "nhan du phong null tra rong chu khong phai 'null'");

eq(kitLabelOf("Đen"), "Áo Đen", "mau tran phai duoc dan chu Ao vao truoc");
eq(kitLabelOf("Áo Đen"), "Áo Đen", "da co chu Ao thi khong dan them lan nua");
eq(kitLabelOf("áo đen"), "áo đen", "chu Ao viet thuong cung tinh la da co");
eq(kitLabelOf("ÁO ĐEN"), "ÁO ĐEN", "viet hoa cung tinh la da co");
eq(kitLabelOf(""), "", "khong khai mau ao thi tra rong de noi goi bo dau cham");
eq(kitLabelOf("   "), "", "chi khoang trang la khong khai");
eq(kitLabelOf(null), "", "null khong duoc nem loi");
eq(kitLabelOf(undefined), "", "undefined khong duoc nem loi");
eq(kitLabelOf("  Trắng  "), "Áo Trắng", "cat khoang trang roi moi dan");
eq(kitLabelOf("bã   trầu"), "Áo bã trầu", "gop khoang trang giua thanh mot");
// "Áo" dung mot minh khong phai mau, nhung cung khong duoc nhan doi thanh "Áo Áo".
eq(kitLabelOf("Áo"), "Áo", "chu Ao dung mot minh khong bi nhan doi");
// Bay de dinh nhat: tu bat dau bang "ao..." nhung KHONG phai chu "áo".
eq(kitLabelOf("Áo khoác xanh"), "Áo khoác xanh", "cum bat dau bang Ao giu nguyen");

// Mot cho dung ban ghi buoi, ba duong ghi cung goi. Truong `fee` tung bi bo
// quen o nhanh tach rieng mot buoi khoi chuoi lap.
const EV = { kind: "match", time: "", place: " Sân K3 ", note: "", repeat: "weekly", fee: "", opp: " FC Bến Xe ", kit: " Đen " };
eq(eventFields(EV, 95000).opp, "FC Bến Xe", "doi thu duoc cat khoang trang khi luu");
eq(eventFields(EV, 95000).kit, "Đen", "mau ao luu nguyen van nguoi go, chi cat khoang trang");
eq(eventFields(EV, 95000).time, "19:30", "gio de trong thi lay mac dinh 19:30");
eq(eventFields(EV, 95000).fee, 95000, "buoi da de trong tien san thi lay tien san mac dinh");
eq(eventFields({ ...EV, kind: "training" }, 95000).fee, 0, "buoi tap khong tu tinh tien san");
eq(eventFields({ ...EV, fee: "120.000" }, 95000).fee, 120000, "tien san go co dau cham van doc ra so");
eq(eventFields({ ...EV, fee: "khong phai so" }, 95000).fee, 0, "chu khong doc ra so thi ve 0, khong phai NaN");
ok(Number.isFinite(eventFields({ ...EV, fee: "abc" }, 95000).fee), "tien san khong bao gio duoc la NaN");
eq(eventFields({ kind: "match", repeat: "none" }, 95000).opp, "", "buoi khong khai doi thu ra chuoi rong, khong phai undefined");
eq(eventFields({ kind: "match", repeat: "none" }, 95000).kit, "", "buoi khong khai mau ao ra chuoi rong");
eq(eventFields({ kind: "match", repeat: "none" }, 95000).place, "", "san de trong ra chuoi rong");


/* ---------- diem danh: bon trang thai, va ba cach viet cu phai giu nguyen nghia ---------- */
// Day la phan de hong nhat cua ca dot nay: hon ba muoi cho trong app tung tu doc
// `v && v !== "no"`, nen mot gia tri thu nam ngam thanh DI o ca ba muoi cho.
eq(attState("yes"), "yes", "yes van la di");
eq(attState("no"), "no", "no van la vang");
eq(attState(""), "none", "o rong la chua tra loi");
eq(attState(null), "none", "null la chua tra loi, khong duoc nem loi");
eq(attState(undefined), "none", "undefined la chua tra loi");
// Hai cach viet cu, sinh ra tu hai duong khac nhau, deu phai con la DI.
eq(attState("yes-paid"), "yes", "yes-paid (da dong tien san) van phai la di");
eq(attState("yes-billed"), "yes", "yes-billed (buoi da chot) van phai la di");
// Chuoi la cung la DI, dung nhu nhanh mac dinh cu -- doi no thanh 'khong ro' la
// lam boc hoi cau tra loi cua nguoi ta khi ban cu va ban moi cung ghi mot bang.
eq(attState("co di"), "yes", "chuoi la doc thanh di, giu dung hanh vi cu");
eq(attState("YES"), "yes", "viet hoa khong phai 'no' nen van la di");
// Va gia tri moi.
eq(attState("maybe"), "maybe", "maybe la trang thai moi, phai duoc khai rieng");

// CHUA CHAC KHONG PHAI LA DI. Day la quyet dinh trung tam cua ca thay doi:
// doi hinh, chia doi va tien san deu hoi qua dung mot ham nay.
ok(attGoing("yes"), "yes tinh la di");
ok(attGoing("yes-paid"), "yes-paid tinh la di");
ok(attGoing("yes-billed"), "yes-billed tinh la di");
ok(!attGoing("maybe"), "chua chac KHONG duoc tinh la di");
ok(!attGoing("no"), "vang khong phai di");
ok(!attGoing(""), "chua tra loi khong phai di");
ok(!attGoing(null), "null khong phai di");

// Dem bon trang thai tren DUNG danh sach nguoi dang tinh.
const A = { 1: "yes", 2: "yes-paid", 3: "no", 4: "maybe", 5: "" };
const C = attCounts(A, [1, 2, 3, 4, 5, 6]);
eq(C.yes, 2, "hai nguoi di");
eq(C.no, 1, "mot nguoi vang");
eq(C.maybe, 1, "mot nguoi chua chac");
eq(C.none, 2, "hai nguoi chua tra loi (mot o rong, mot chua co dong nao)");
eq(C.total, 6, "tong dung bang so nguoi truyen vao");
eq(C.yes + C.no + C.maybe + C.none, C.total, "bon cot phai cong lai dung bang tong");
// Nguoi da roi doi con sot khoa trong bang diem danh khong duoc cong vao dau ca:
// cot 'chua tra loi' suy ra bang phep tru, mot khoa rac la ca cot am.
const C2 = attCounts({ 1: "yes", 99: "yes" }, [1]);
eq(C2.yes, 1, "khoa cua nguoi da roi doi khong duoc dem");
eq(C2.total, 1, "tong khong dinh khoa rac");
eq(attCounts(null, null).total, 0, "khong co gi thi tong bang 0, khong nem loi");
eq(attCounts(null, [1, 2]).none, 2, "khong co bang diem danh thi ca hai la chua tra loi");
// Moi trang thai phai co nhan va mau, khong thi giao dien in ra undefined.
ATT_ORDER.forEach(k => {
  ok(typeof ATT_LABEL[k] === "string" && ATT_LABEL[k].length > 0, k + " khong co nhan tieng Viet");
  ok(typeof ATT_COLOR[k] === "string" && ATT_COLOR[k].length > 0, k + " khong co mau");
  ok(typeof ATT_BG[k] === "string", k + " khong co nen");
});
eq(ATT_ORDER.length, 4, "dung bon trang thai, khong hon khong kem");
["yes", "no", "maybe", "none"].forEach(k => ok(ATT_ORDER.indexOf(k) >= 0, k + " thieu trong ATT_ORDER"));
// attState chi duoc tra ve mot trong bon khoa da khai.
["yes", "no", "maybe", "", null, undefined, "yes-paid", "yes-billed", "rac"]
  .forEach(v => ok(ATT_ORDER.indexOf(attState(v)) >= 0,
    "attState(" + JSON.stringify(v) + ") tra ve trang thai khong co trong ATT_ORDER"));

/* ---------- vi tri so truong nam o dau trong so do ---------- */
// 1-3-2-1: GK LB CB RB CM CM ST
const L7 = SIZE_FORMATIONS["7"]["1-3-2-1"].labels;
eq(L7.join(" "), "GK LB CB RB CM CM ST", "nhan so do 1-3-2-1 doi -- xem lai bai kiem duoi");
// O dung y vi tri
eq(slotsForPos(L7, "CB").exact.join(","), "2", "CB co dung mot o trong 1-3-2-1");
eq(slotsForPos(L7, "CM").exact.join(","), "4,5", "CM co hai o");
eq(slotsForPos(L7, "GK").exact.join(","), "0", "thu mon o o dau");
// Khong co o dung y thi phai chi ra o cung tuyen gan nhat -- day la ca ly do
// ham nay ton tai: ho so ghi CAM ma 1-3-2-1 khong he co o CAM.
eq(slotsForPos(L7, "CAM").exact.length, 0, "1-3-2-1 khong co o CAM");
eq(slotsForPos(L7, "CAM").line.join(","), "4,5", "gan nhat voi CAM la hai o CM");
eq(slotsForPos(L7, "CDM").line.join(","), "4,5", "CDM cung ve hai o CM");
// Hau ve bien: co o dung y, va cac o hau ve khac la cung tuyen
eq(slotsForPos(L7, "LB").exact.join(","), "1", "LB co o rieng");
eq(slotsForPos(L7, "LB").line.join(","), "2,3", "CB va RB cung tuyen voi LB");
// Tuyen khong ton tai trong so do
const L5 = SIZE_FORMATIONS["5"]["1-3-1"].labels;
eq(slotsForPos(L5, "CAM").exact.length + slotsForPos(L5, "CAM").line.length,
   slotsForPos(L5, "CAM").line.length, "san 5: CAM khong co o dung y");
// Dau vao rong khong duoc nem loi
eq(slotsForPos(L7, "").exact.length, 0, "chua chon vi tri thi khong co o nao");
eq(slotsForPos(L7, null).line.length, 0, "null khong duoc nem loi");
eq(slotsForPos(null, "CB").exact.length, 0, "khong co so do thi khong co o nao");
eq(slotsForPos(L7, "KHONG-CO").exact.length, 0, "ma vi tri la khong ra o nao");
eq(slotsForPos(L7, "KHONG-CO").line.length, 0, "ma vi tri la cung khong ra tuyen nao");
// Mot o khong duoc vua exact vua line
L7.forEach((_, i) => {
  const f = slotsForPos(L7, "CB");
  ok(!(f.exact.indexOf(i) >= 0 && f.line.indexOf(i) >= 0), "o " + i + " vua dung y vua cung tuyen");
});

/* ---------- sao thay cho so (kieu Football Manager) ---------- */
const stars = r => starsOf(r).map(k => k === "full" ? "F" : (k === "half" ? "H" : "-")).join("");
eq(stars(20), "FFFFF", "20/20 la nam sao day");
eq(stars(10), "FFH--", "10/20 la hai sao ruoi");
eq(stars(1),  "H----", "nguoi da duoc cham thap nhat van con nua sao");
eq(stars(0),  "-----", "chua cham thi khong sao nao");
eq(stars(null), "-----", "khong co diem thi khong sao nao");
eq(stars("hong"), "-----", "diem hong khong duoc thanh sao");
eq(stars(-5), "-----", "diem am khong duoc thanh sao");
eq(starsOf(13).length, 5, "luon du nam o");
// Sao khong duoc tut khi diem tang
let prev = -1;
for (let r = 1; r <= 20; r++) {
  const f = starsOf(r).filter(k => k === "full").length * 2
          + starsOf(r).filter(k => k === "half").length;
  ok(f >= prev, "sao khong duoc tut khi diem tang o " + r);
  prev = f;
}

/* ---------- mo ta cau thu: vi tri tu khai bao, KHONG suy tu chi so ---------- */
const T0 = new Date(2026, 8, 2);
const FLAT = {finish:17,dribble:17,pass:17,shot:17,defend:17,header:17,
              position:17,gk:17,stamina:17,pace:17,strength:17,spirit:17};
const withA = o => Object.assign({}, FLAT, o);

// Toc do 20 KHONG duoc bien trung ve thanh cau thu chay canh.
eq(playerDesc({posMain:"CB", dob:"", attrs:withA({pace:20})}, T0).indexOf("cánh"), -1,
   "toc do cao khong duoc doi vi tri cua nguoi ta");
ok(playerDesc({posMain:"CB", dob:"", attrs:withA({pace:20})}, T0).indexOf("Trung vệ") === 0,
   "vi tri lay tu khai bao");
// Chua khai vi tri thi khong noi gi -- khong doan tu chi so
eq(playerDesc({posMain:"", dob:"01/01/2000", attrs:withA({pace:20})}, T0), "",
   "chua khai vi tri thi khong bia ra mot cai");
eq(playerDesc({posMain:"KHONG-CO", dob:"", attrs:FLAT}, T0), "", "ma vi tri la thi khong mo ta");
eq(playerDesc(null, T0), "", "khong co ban ghi thi khong nem loi");
eq(playerDesc({}, T0), "", "ban ghi rong thi khong nem loi");
// Chi so phang = khong co net noi bat, khong duoc noi lai diem tong bang chu
eq(playerDesc({posMain:"CM", dob:"", attrs:FLAT}, T0), "Tiền vệ trung tâm",
   "chi so phang thi khong bia ra so truong");
eq(playerDesc({posMain:"CB", dob:"", attrs:null}, T0), "Trung vệ",
   "chua cham chi so nao thi chi co vi tri");
// Tuoi
eq(ageFrom("10/03/2007", T0), 19, "sinh nhat da qua trong nam");
eq(ageFrom("03/12/2007", T0), 18, "sinh nhat chua toi trong nam");
eq(ageFrom("02/09/2007", T0), 19, "dung ngay sinh nhat la du tuoi");
eq(ageFrom("", T0), null, "khong co ngay sinh");
eq(ageFrom("2007-03-10", T0), null, "sai dinh dang thi khong doan");
eq(ageFrom("10/13/2007", T0), null, "thang 13 khong ton tai");
eq(ageFrom("01/01/1900", T0), null, "ngoai khoang nguoi that");
eq(ageFrom("01/01/2020", T0), null, "sau tuoi khong phai cau thu phui");
eq(ageWord(19), "trẻ", "22 tro xuong la tre");
eq(ageWord(22), "trẻ", "dung 22 van la tre");
eq(ageWord(27), "", "tuoi giua thi khong can nhan");
eq(ageWord(33), "kỳ cựu", "33 tro len la ky cuu");
eq(ageWord(null), "", "khong biet tuoi thi khong noi");
// Net noi bat: so voi CHINH NGUOI DO, toi da hai cai, manh nhat truoc
const LOW = {}; Object.keys(FLAT).forEach(k => LOW[k] = 10);
const withL = o => Object.assign({}, LOW, o);
eq(standoutKeys(withA({pace:20, finish:8})).join(","), "pace", "mot net noi bat");
eq(standoutKeys(withL({pace:20, finish:19})).join(","), "pace,finish",
   "hai net, manh nhat dung truoc");
eq(standoutKeys(withL({pace:20, finish:19, dribble:18})).length, 2,
   "nhieu nhat hai net -- ba tinh tu la mot doan van");
eq(standoutKeys(FLAT).length, 0, "phang thi khong co net nao");
eq(standoutKeys({pace:20, finish:19}).length, 0, "duoi sau chi so thi chua du hinh de noi");
eq(standoutKeys(null).length, 0, "khong co chi so thi khong nem loi");
// Cau hoan chinh: "Tien ve canh trai tre, chay nhanh, ben suc"
const d = playerDesc({posMain:"LW", dob:"10/03/2007",
                      attrs:withA({pace:20, stamina:19, defend:9, gk:6})}, T0);
ok(d.indexOf("Tiền vệ cánh trái trẻ") === 0, "vi tri roi den tuoi: " + d);
ok(d.indexOf("chạy nhanh") > 0, "net noi bat co trong cau: " + d);
// Danh tu vi tri phai la DANH TU, khong duoc la cum dong tu trung voi tinh tu
Object.keys(DESC_POS).forEach(k => {
  Object.keys(DESC_ADJ).forEach(a => {
    const first = DESC_ADJ[a].split(" ")[0];
    ok(DESC_POS[k].toLowerCase().indexOf(first) !== 0,
       "ten vi tri " + DESC_POS[k] + " lap chu dau voi tinh tu " + DESC_ADJ[a]);
  });
});

/* ---------- ma vi tri la: doan sai TUYEN nang hon doan sai BEN ---------- */
const LINE4 = {GK:"TM", CB:"HV", LB:"HV", RB:"HV",
               CDM:"TV", CM:"TV", CAM:"TV", LW:"TD", RW:"TD", ST:"TD"};
eq(LINE4[parsePos("IWB").main], "HV", "IWB la hau ve bien, khong phai tien ve");
eq(LINE4[parsePos("WB").main], "HV", "WB la hau ve bien");
eq(LINE4[parsePos("LWB").main], "HV", "LWB la hau ve bien");
eq(parsePos("LWB").main, "LB", "LWB co ben trai ro rang");
eq(LINE4[parsePos("CF").main], "TD", "CF la tien dao");
eq(LINE4[parsePos("SS").main], "TV", "SS lui hon tien dao cam");
eq(parsePos("LM").main, "LW", "LM la canh trai");
eq(parsePos("RM").main, "RW", "RM la canh phai");
eq(parsePos("DM").main, "CDM", "DM la tien ve tru");
eq(parsePos("KITCHEN").main, "", "ma rac khong duoc thanh vi tri");
// Moi bi danh phai tro ve mot ma that
Object.keys(POS_ALIAS).forEach(k => {
  const v = POS_ALIAS[k];
  ok(v === "" || LINE4[v] !== undefined, "bi danh " + k + " tro ve ma la: " + v);
});

/* ---------- thanh tich mua ---------- */
// Tam tran cua mot mua, thu tu nhu trong may
const M8 = [
  {date:"Sài Gòn Vets", gf:3, ga:1, venue:"S.NHÀ"},
  {date:"FC Bình Thạnh", gf:2, ga:2, venue:"KHÁCH"},
  {date:"Thủ Đức United", gf:1, ga:4, venue:"KHÁCH"},
  {date:"Gò Vấp FC", gf:5, ga:0, venue:"S.NHÀ"},
  {date:"Phú Nhuận Old Boys", gf:2, ga:3, venue:"KHÁCH"},
  {date:"FC Tân Bình", gf:4, ga:2, venue:"S.NHÀ"},
  {date:"Quận 7 Rangers", gf:1, ga:1, venue:"S.NHÀ"},
  {date:"FC Bảy Hiền", gf:3, ga:2, venue:"KHÁCH"}
];
const S8 = seasonRecord(M8);
eq(S8.p, 8, "dem du 8 tran");
eq(S8.w + S8.d + S8.l, S8.p, "thang cong hoa cong thua phai bang so tran");
eq(S8.w, 4, "bon tran thang");
eq(S8.d, 2, "hai tran hoa");
eq(S8.l, 2, "hai tran thua");
eq(S8.gf, 21, "ghi 21 ban");
eq(S8.ga, 15, "thung 15 ban");
eq(S8.gd, 6, "hieu so +6");
eq(S8.gd, S8.gf - S8.ga, "hieu so phai khop hai cot ban");
eq(S8.form.join(""), "wdlwl", "phong do la 5 tran GAN NHAT, moi nhat truoc");
eq(S8.formW, 2, "hai tran thang trong 5 gan nhat");
eq(oppOf(S8.best), "Gò Vấp FC", "thang dam nhat la 5-0");
eq(oppOf(S8.worst), "Thủ Đức United", "thua dam nhat la 1-4");
eq(S8.home.w + S8.home.d + S8.home.l, 4, "bon tran san nha");
eq(S8.away.w + S8.away.d + S8.away.l, 4, "bon tran san khach");
eq(S8.home.w, 3, "san nha thang ba");
eq(S8.away.w, 1, "san khach thang mot");
// Chua co tran nao thi khong duoc nem loi, va khong duoc bia ra tran dam nhat
const S0 = seasonRecord([]);
eq(S0.p, 0, "chua tran nao");
eq(S0.gd, 0, "chua tran nao thi hieu so 0");
eq(S0.form.length, 0, "chua tran nao thi khong co phong do");
ok(S0.best === null, "chua tran nao thi khong co tran thang dam nhat");
ok(S0.worst === null, "chua tran nao thi khong co tran thua dam nhat");
eq(seasonRecord(null).p, 0, "dau vao null khong duoc nem loi");
eq(seasonRecord("hong").p, 0, "dau vao hong khong duoc nem loi");
// Dong hong bi loai, khong duoc thanh 0-0
eq(seasonRecord([{gf:2, ga:1}, {gf:null, ga:1}, {gf:"x", ga:"y"}, null]).p, 1,
   "chi dem dong co du hai ti so");
// Toan thang thi khong co tran thua dam nhat
const SW = seasonRecord([{gf:3, ga:0}, {gf:1, ga:0}]);
ok(SW.worst === null, "toan thang thi khong co tran thua dam nhat");
eq(oppOf(SW.best), "-", "tran khong co ten doi thu doc ra gach, khong phai undefined");
// Hoa khong duoc tinh la thang dam nhat
ok(seasonRecord([{gf:2, ga:2}]).best === null, "hoa khong phai tran thang");
ok(seasonRecord([{gf:2, ga:2}]).worst === null, "hoa khong phai tran thua");
// Thieu `venue` mac dinh la san nha, khong duoc roi ra khoi ca hai cot
const SV = seasonRecord([{gf:1, ga:0}]);
eq(SV.home.w + SV.away.w, 1, "tran thieu san van phai nam trong mot cot");
// oppOf doc duoc ca hai hinh dang dong
eq(oppOf({opp:"FC A", date:"05/09"}), "FC A", "dong that doc truong opp");
eq(oppOf({date:"FC B"}), "FC B", "dong seed cu doc truong date");
eq(oppOf(null), "-", "khong co tran thi doc ra gach");

/* ---------- tu danh hieu ---------- */
const TR = trophySort([
  {id:1, title:"Giải A", year:2023, place:"third"},
  {id:2, title:"Giải B", year:2025, place:"runnerup"},
  {id:3, title:"Giải C", year:2025, place:"champion"},
  {id:4, title:"Giải D", year:"", place:"champion"},
  {id:5, title:"Giải E", year:2024, place:"played"}
]);
eq(TR.map(x => x.id).join(","), "3,2,5,1,4", "nam moi truoc, cung nam thi hang cao truoc, thieu nam xep cuoi");
eq(trophySort([]).length, 0, "chua co cup nao");
eq(trophySort(null).length, 0, "null khong duoc nem loi");
eq(trophySort([null, {id:9, year:2020, place:"champion"}]).length, 1, "dong rong bi loai");
eq(trophyPlace("champion").label, "Vô địch", "nhan vo dich");
eq(trophyPlace("khong-co").order, 3, "hang la thi xep cuoi, khong nem loi");
eq(trophyPlace(undefined).label, "Tham dự", "thieu hang thi coi la tham du");
ok(TROPHY_PLACES.length === 4, "bon muc thu hang");
// Sap xep khong duoc doi mang goc
const orig = [{id:1, year:2020, place:"played"}, {id:2, year:2025, place:"champion"}];
trophySort(orig);
eq(orig[0].id, 1, "trophySort khong duoc doi mang goc");

// Nut "+" o DANH SACH tu quyet dua nguoi ra san hay xuong du bi. Nhan tren nut
// va hanh vi cua nut phai doc CUNG mot ham, khong thi nut noi mot dang lam mot neo.
eq(addTarget([null, null]), "pitch", "con o trong thi ra san");
eq(addTarget(["a", null]), "pitch", "chi can mot o trong la ra san");
eq(addTarget(["a", "b"]), "bench", "san day thi xuong du bi");
eq(addTarget([]), "bench", "khong co o nao thi xuong du bi");
eq(addTarget(null), "bench", "thieu du lieu khong duoc nem loi");

// Mot hang trong danh sach Thanh vien phai tra loi "dong tien chua" bang chu,
// khong bat nguoi doc suy tu mot dau gach ngang.
const MZ = n => n + "d";
eq(debtChip(95000, MZ).text, "Nợ 95000d", "con no thi noi ro no bao nhieu");
eq(debtChip(0, MZ).text, "Đủ quỹ", "khong no thi noi la du quy, khong phai dau gach");
eq(debtChip(null, MZ).text, "Đủ quỹ", "thieu du lieu coi nhu khong no");
eq(debtChip("95000", MZ).text, "Nợ 95000d", "chuoi so van tinh la no");
ok(debtChip(95000, MZ).fg !== debtChip(0, MZ).fg, "hai trang thai phai khac mau");
eq(debtChip(-5, MZ).text, "Đủ quỹ", "so am khong duoc hien thanh no");


/* ---- Cham chi so: thang 1-20 chia muc kieu FM ---- */
// Mau va chu muc phai di ra tu MOT ham, khong thi hai bang se lech nhau.
eq(attrLevel(20).key, "elite", "20 la muc cao nhat");
eq(attrLevel(17).key, "elite", "17 da la xuat sac");
eq(attrLevel(16).key, "good", "16 chua phai xuat sac");
eq(attrLevel(11).key, "avg", "11 la trung binh");
eq(attrLevel(8).key, "weak", "8 la yeu");
eq(attrLevel(1).key, "poor", "1 la muc thap nhat");
eq(attrLevel(null).key, "none", "chua cham thi khong phai mot muc diem");
eq(attrLevel(undefined).key, "none", "thieu du lieu khong duoc thanh mau nao do");
eq(attrLevel("").key, "none", "chuoi rong khong phai diem 0");
eq(attrLevel("14").key, "good", "chuoi so van doc duoc");
ok(attrLevel(null).label.indexOf("chưa") >= 0, "muc rong phai NOI la chua cham");
// Cao thi noi, thap thi mo: do dam phai giam dan, khong duoc bang nhau.
/* Truoc day muc cang thap thi thanh cang MO (alpha 0.3 cho "Rat yeu"), nen
   phan da to mau chim han vao nen rong: do 1.32:1 tren nen that, tuc la nhin
   khong ra thanh do da day toi dau. Ma "day toi dau" chinh la thu duy nhat
   thanh nay noi. Nay moi muc to dac, va bai kiem tra la ty so tuong phan that
   -- do tren dung hai mau nen bar dang chay trong app (o Cham nhanh va o Ho so),
   nen doi mau muc ma quen kiem tuong phan thi hong o day chu khong hong o mat
   nguoi dung. */
const _lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const _hex = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
const _lum = c => 0.2126 * _lin(c[0]) + 0.7152 * _lin(c[1]) + 0.0722 * _lin(c[2]);
const _ratio = (a, b) => { const x = _lum(a), y = _lum(b); const h = Math.max(x, y), l = Math.min(x, y); return (h + 0.05) / (l + 0.05); };
// Nen ranh cua thanh: rgba(255,255,255,.05) chong len #161925 (man Cham nhanh)
// va #1B1D32 (o chi so trong Ho so), da chong san.
const TRACKS = [[34, 37, 48], [38, 40, 60]];
const CHIP = [9, 15, 29];               // nen chip chu/so trong thanh, DAC
[20, 19, 15, 12, 9, 4, 1].forEach(v => {
  const c = _hex(attrLevel(v).color);
  TRACKS.forEach(t => ok(_ratio(c, t) >= 3,
    "muc " + v + " (" + attrLevel(v).color + ") chim vao nen ranh: " + _ratio(c, t).toFixed(2) + ":1, can 3:1"));
  ok(_ratio(c, CHIP) >= 4.5,
    "so " + v + " in tren chip khong du 4.5:1: " + _ratio(c, CHIP).toFixed(2) + ":1");
});
ok(new Set([20, 15, 12, 9, 4].map(v => attrLevel(v).color)).size === 5,
  "nam muc phai la nam mau khac nhau");
ok(!("alpha" in attrLevel(4)),
  "khong con nut alpha nao de lam mo mot muc di — do la duong quay lai loi cu");
ok(attrLevel(19).color !== attrLevel(3).color, "hai dau thang phai khac mau");
[20,17,14,11,8,4,1].forEach(v => ok(typeof attrLevel(v).label === "string" && attrLevel(v).label.length > 1,
  "muc cua " + v + " phai co chu, khong chi co mau"));

/* ---- Bam vao thanh = dat thang mot nac ---- */
// 24 nut -/+ bien mat, nen phep quy doi vi tri bam -> diem la thu duy nhat con
// dung giua nguoi dung va du lieu. No phai chinh o hai dau.
eq(barValueAt(0, 200, 20), 1, "bam sat mep trai la 1, khong phai 0");
eq(barValueAt(200, 200, 20), 20, "bam sat mep phai la 20");
eq(barValueAt(100, 200, 20), 10, "bam giua la 10");
eq(barValueAt(105, 200, 20), 11, "qua giua mot chut la 11");
eq(barValueAt(-40, 200, 20), 1, "bam ra ngoai ben trai van la 1");
eq(barValueAt(9999, 200, 20), 20, "bam ra ngoai ben phai van la 20");
eq(barValueAt(50, 0, 20), 1, "thanh rong 0px khong duoc chia cho 0");
ok(barValueAt(137, 200, 20) === Math.round(barValueAt(137, 200, 20)), "diem phai la so nguyen");
// Moi nac phai voi toi duoc bang mot cu bam -- do la ca ly do bo nut +.
const reach = new Set();
for (let x = 0; x <= 200; x++) reach.add(barValueAt(x, 200, 20));
eq(reach.size, 20, "ca 20 nac deu bam toi duoc tren mot thanh 200px");

/* ---- Hinh mang nhen dung tu so lieu, khong ve tay ---- */
const RP = radarPoints([20, 20, 20], 20, 100, 100, 50);
eq(RP.split(" ").length, 3, "ba nhom chi so thi ba dinh");
eq(RP.split(" ")[0], "100,50", "dinh dau tien chi thang len");
eq(radarPoints([0, 0, 0], 20, 100, 100, 50), "100,100 100,100 100,100", "khong diem thi tum ve tam");
eq(radarPoints([10, 10, 10], 20, 100, 100, 50).split(" ")[0], "100,75", "nua thang thi nua ban kinh");
eq(radarPoints([30, 30, 30], 20, 100, 100, 50).split(" ")[0], "100,50", "diem vuot tran bi cat, khong ve loi ra ngoai");
eq(radarPoints([-5, -5, -5], 20, 100, 100, 50).split(" ")[0], "100,100", "diem am khong duoc lat hinh");
eq(radarPoints([], 20, 100, 100, 50), "", "khong co truc thi khong co hinh");
eq(radarPoints([null, 12, 12], 20, 100, 100, 50).split(" ")[0], "100,100", "truc thieu so coi nhu 0, khong NaN");
ok(radarPoints([12, 12, 12], 20, 100, 100, 50).indexOf("NaN") < 0, "khong duoc sinh ra NaN trong duong SVG");
ok(radarPoints([1, 20, 10], 20, 100, 100, 50).split(" ").every(pt => /^-?[0-9.]+,-?[0-9.]+$/.test(pt)),
  "moi dinh phai la mot cap toa do hop le");
// Vong luoi cua mang nhen cung dung chinh ham nay, nen bon truc phai chay duoc.
eq(radarPoints([20, 20, 20, 20], 20, 100, 100, 50).split(" ").length, 4, "so truc theo do dai mang, khong co dinh 3");

/* ---- The cau thu khong duoc in so cho chi so chua ai cham ----
   Loi that: mot nguoi moi cham 1/12 chi so van hien "Tan cong 15 · Re dat 15 ·
   Duong truyen 15", vi ca hai cho tinh so deu lay `m.rating` (diem cu nhap tay)
   dien vao o trong. Hai ham nay chi doc nhung o CO SO. */
const L4 = [{ key: "a", label: "A" }, { key: "b", label: "B" },
            { key: "c", label: "C" }, { key: "d", label: "D" }];

eq(ratedTop({}, L4, 3).length, 0, "chua cham gi thi khong co so truong nao");
eq(ratedTop({ a: 8 }, L4, 3).length, 0, "moi cham mot chi so thi chua goi la manh nhat");
eq(ratedTop({ a: 15, b: 15, c: 15, d: 15 }, L4, 3).length, 0, "bon so bang nhau thi khong co ai noi troi");
eq(JSON.stringify(ratedTop({ a: 18, b: 6 }, L4, 3)), JSON.stringify([["A", 18], ["B", 6]]),
  "chi lay hai o da cham, xep cao truoc");
eq(ratedTop({ a: 18, b: 6, c: 12, d: 3 }, L4, 3).length, 3, "lay dung n o dau bang");
eq(ratedTop({ a: 18, b: 6, c: 12, d: 3 }, L4, 3)[0][0], "A", "o cao nhat dung dau");
ok(ratedTop({ a: 20, b: "", c: null, d: 4 }, L4, 3).every(r => isFinite(r[1])),
  "o rong / null khong duoc lot vao danh sach so truong");
eq(ratedTop({ a: 20, b: "", c: null, d: 4 }, L4, 3).length, 2, "chi hai o that su co so");
eq(ratedTop(null, L4, 3).length, 0, "khong co bang chi so thi tra mang rong, khong no");
eq(ratedTop({ a: 9, b: 9, c: 9, d: 20 }, L4, 3)[0][1], 20, "so cao nhat van dung dau khi phan con lai bang nhau");

eq(ratedAvg({ a: 10, b: 12, c: 14, d: 16 }, L4), 13, "cham du bon o thi tinh trung binh");
eq(ratedAvg({ a: 10, b: 12, c: 14 }, L4), null, "thieu mot o thi khong tinh — nua bang so cu la bia");
eq(ratedAvg({}, L4), null, "chua cham gi thi khong co trung binh");
eq(ratedAvg({ a: 10, b: 12, c: 14, d: "" }, L4), null, "o rong tinh la chua cham");
eq(ratedAvg(null, L4), null, "khong co bang chi so thi null");
eq(ratedAvg({ a: 1, b: 1, c: 1, d: 1 }, L4), 1, "toan diem thap van ra so, khong ra null");
eq(ratedAvg({ a: 20, b: 20, c: 20, d: 20 }, L4), 20, "toan diem cao ra dung 20");
eq(ratedAvg({ a: 10, b: 11, c: 11, d: 11 }, []), null, "danh sach rong thi khong co gi de trung binh");


/* ---------- nhieu vi tri so truong ---------- */
// Nguoi da phui hiem khi chi da mot vi tri. O luoi bam vong ba trang thai.
const VP0 = { main: "", alt: [] };
eq(posCycle(VP0, "CAM").main, "CAM", "chua chon gi thi bam lan dau thanh so truong");
eq(posCycle(VP0, "CAM").alt.length, 0, "so truong dau tien khong sinh ra vi tri phu");
const VP1 = posCycle(VP0, "CAM");
eq(posCycle(VP1, "CAM").main, "", "bam lai chinh so truong thi xuong lam da duoc");
eq(posCycle(VP1, "CAM").alt.join(","), "CAM", "so truong xuong thi nam trong da duoc");
const VP2 = posCycle(VP1, "CAM");
eq(posCycle(VP2, "CAM").alt.length, 0, "bam lan ba thi bo han");
eq(posCycle(VP2, "CAM").main, "", "bo han thi khong con so truong");
// Vi tri thu hai khong duoc dap len vi tri dau
const VQ = posCycle({ main: "CAM", alt: [] }, "CM");
eq(VQ.main, "CAM", "chon vi tri khac khong duoc doi so truong dang co");
eq(VQ.alt.join(","), "CM", "vi tri khac vao thang muc da duoc");
// Bam vao mot vi tri "da duoc" luon la bo no ra, ke ca khi cho so truong trong
const VR = posCycle({ main: "", alt: ["CM", "LW"] }, "CM");
eq(VR.main, "", "bo mot vi tri da duoc khong duoc tu dat no lam so truong");
eq(VR.alt.join(","), "LW", "bo roi thi rut khoi danh sach da duoc, giu cai con lai");
// Ba lan bam phai ve dung cho cu -- do moi la mot vong
const VC = posCycle(posCycle(posCycle({ main: "", alt: [] }, "LW"), "LW"), "LW");
eq(VC.main + "|" + VC.alt.join(","), "|", "ba lan bam ve dung trang thai ban dau");
// Bao nhieu vi tri da duoc cung chua, khong chan cung o hai
const VS3 = posCycle(posCycle(posCycle({ main: "GK", alt: [] }, "CB"), "LB"), "RB");
eq(VS3.alt.length, 3, "ba vi tri da duoc van giu du, khong chan cung o hai");
// Dau vao hong khong duoc nem loi
eq(posCycle(null, "CM").main, "CM", "dau vao null khong duoc nem loi");
eq(posCycle(VP0, "XYZ").main, "", "ma vi tri la thi khong doi gi");
eq(posCycle({ main: "CAM", alt: ["CM"] }, "XYZ").alt.join(","), "CM", "ma la khong duoc lam mat du lieu cu");

// Chuoi luu xuong phai doc nguoc lai duoc bang parsePos -- day la hop dong that
// giua hai ham, khong phai chi de nhin cho dep.
eq(posToText({ main: "CAM", alt: ["CM", "LW"] }), "CAM, CM, LW", "chuoi luu co dang doc duoc");
eq(posToText({ main: "", alt: [] }), "", "chua chon gi thi chuoi rong");
eq(parsePos(posToText({ main: "CAM", alt: ["CM"] })).main, "CAM", "doc nguoc lai ra dung so truong");
eq(parsePos(posToText({ main: "CAM", alt: ["CM"] })).alt.join(","), "CM", "doc nguoc lai ra dung vi tri phu");
eq(posToText(null), "", "dau vao null khong duoc nem loi");

// Cau bao phai noi ra trang thai VUA doi thanh, khong phai trang thai cu
ok(/sở trường/.test(posCycleSay("Billy", "CAM", { main: "CAM", alt: [] })), "len so truong thi noi so truong");
ok(/đá được/.test(posCycleSay("Billy", "CAM", { main: "", alt: ["CAM"] })), "xuong da duoc thi noi da duoc");
ok(/bỏ/.test(posCycleSay("Billy", "CAM", { main: "", alt: [] })), "bo han thi noi la bo");
ok(posCycleSay("Billy", "CAM", { main: "CAM", alt: [] }).indexOf("Billy") >= 0, "cau bao phai co ten nguoi");

/* ---------- cat anh ho so ---------- */
// zoom 1 = phu kin o vuong, canh ngan cua anh vua khit. ox/oy trong -1..1.
const CB1 = cropBox(1000, 600, 1, 0, 0);
eq(CB1.sw, 600, "zoom 1 lay tron canh ngan");
eq(CB1.sh, 600, "o cat luon vuong");
eq(CB1.sx, 200, "anh ngang thi cat giua theo chieu ngang");
eq(CB1.sy, 0, "canh ngan vua khit thi khong con cho de xe doc");
const CB2 = cropBox(600, 1000, 1, 0, 0);
eq(CB2.sx, 0, "anh doc thi khong con cho de xe ngang");
eq(CB2.sy, 200, "anh doc thi cat giua theo chieu doc");
// Phong to thi o cat nho lai
const CB3 = cropBox(1000, 600, 2, 0, 0);
eq(CB3.sw, 300, "zoom 2 thi o cat con mot nua");
eq(CB3.sx, 350, "phong to van giu tam");
// Xe het co sang mot ben thi dung sat mep, khong loi ra ngoai anh
const CL = cropBox(1000, 600, 1, -1, 0);
eq(CL.sx, 0, "xe het sang trai thi dung o mep trai");
const CR = cropBox(1000, 600, 1, 1, 0);
eq(CR.sx, 400, "xe het sang phai thi dung o mep phai");
eq(CR.sx + CR.sw, 1000, "khong duoc loi ra ngoai anh");
const CU = cropBox(600, 1000, 1, 0, -1);
eq(CU.sy, 0, "xe het len tren thi dung o mep tren");
const D2 = cropBox(600, 1000, 1, 0, 1);
eq(D2.sy + D2.sh, 1000, "xe het xuong duoi thi dung o mep duoi");
// Xe qua tay van bi keo ve trong anh
eq(cropBox(1000, 600, 1, -9, 0).sx, 0, "xe qua tay van khong loi ra ngoai");
eq(cropBox(1000, 600, 1, 9, 0).sx + 600, 1000, "xe qua tay ben kia cung vay");
// Anh vuong thi khong co cho de xe
const CSQ = cropBox(800, 800, 1, 1, 1);
eq(CSQ.sx, 0, "anh vuong thi xe ngang khong doi gi");
eq(CSQ.sy, 0, "anh vuong thi xe doc khong doi gi");
// Zoom la nho hon 1 hay so hong deu bi keo ve 1 -- khong duoc cat ra ngoai anh
eq(cropBox(1000, 600, 0.2, 0, 0).sw, 600, "zoom nho hon 1 bi keo ve 1");
eq(cropBox(1000, 600, NaN, 0, 0).sw, 600, "zoom hong bi keo ve 1");
eq(cropBox(1000, 600, 99, 0, 0).sw >= 1, true, "zoom qua lon van con it nhat mot cham");
// Kich thuoc hong thi khong duoc nem loi
eq(cropBox(0, 0, 1, 0, 0).sw, 0, "anh rong khong duoc nem loi");
ok(PHOTO_PX > 0 && PHOTO_PX <= 512, "anh ho so phai nho, khong duoc bang anh nen");

/* ---------- ghi tran theo su kien co phut ---------- */
const EVS = [
  { min: 12, kind: "goal",  who: 1 },
  { min: 45, kind: "assist", who: 2 },
  { min: 45, kind: "goal",  who: 1 },
  { min: 90, kind: "yellow", who: 1 },
  { min: 90, kind: "mvp",   who: 3 },
  { min: 70, kind: "og",    who: 2 }
];
const TL = evTally(EVS);
eq(TL[1].goals, 2, "cong du hai ban cua cung mot nguoi");
eq(TL[1].y, 1, "dem the vang");
eq(TL[2].assists, 1, "dem kien tao");
eq(TL[2].og, 1, "dem phan luoi");
eq(TL[3].mvp, 1, "dem hay nhat tran");
eq(TL[1].assists, 0, "khong cong nham loai khac cho nguoi ghi ban");
eq(TL[2].goals, 0, "phan luoi khong duoc tinh la ban thang");
eq(Object.keys(TL).length, 3, "chi dem nguoi co su kien");
// Dau vao hong khong duoc nem loi, va khong duoc dem bua
eq(Object.keys(evTally([])).length, 0, "chua co su kien nao");
eq(Object.keys(evTally(null)).length, 0, "dau vao null khong duoc nem loi");
eq(Object.keys(evTally([{ kind: "goal" }])).length, 0, "su kien khong co nguoi thi bo qua");
eq(Object.keys(evTally([{ who: 1, kind: "khong-co" }])).length, 0, "loai su kien la thi bo qua");
// Phut khong bat buoc: doi phui hay quen, va quen phut khong duoc mat ca ban thang
eq(evTally([{ who: 5, kind: "goal" }])[5].goals, 1, "quen phut van tinh ban thang");

// Xep theo phut, khong co phut thi xuong cuoi -- de dong thoi gian doc duoc
const SORTED = evSort([
  { min: 90, kind: "goal", who: 1 },
  { kind: "mvp", who: 2 },
  { min: 5, kind: "goal", who: 3 }
]);
eq(SORTED[0].min, 5, "phut nho len truoc");
eq(SORTED[1].min, 90, "phut lon xuong sau");
ok(SORTED[2].min === undefined, "khong ghi phut thi xep cuoi");
eq(evSort(null).length, 0, "dau vao null khong duoc nem loi");
const ORIG = [{ min: 9, kind: "goal", who: 1 }, { min: 2, kind: "goal", who: 2 }];
evSort(ORIG);
eq(ORIG[0].min, 9, "evSort khong duoc doi mang goc");

// Nhan doc duoc, khong phai ma khoa
ok(evLabel("goal").length > 0, "moi loai su kien phai co nhan tieng Viet");
ok(evLabel("khong-co").length > 0, "loai la van tra ve chuoi, khong tra ve undefined");
eq(EV_KINDS.length >= 5, true, "du cac loai: ban, kien tao, the vang, the do, phan luoi, hay nhat");
ok(EV_KINDS.every(k => evLabel(k[0]).length > 0), "moi loai khai bao deu co nhan");

/* ---------- mot cua duy nhat cho moi cho IN diem ra man ----------
   Loi nay da bi va BON lan o bon cho khac nhau truoc khi co cua chung. Khong
   co khang dinh nao gac thi cho thu nam se lai lot -- day la cho gac do. */
const A12 = {}; ATTRS.forEach(a => { A12[a.key] = 15; });
const A3 = { finish: 12, dribble: 12, pass: 12 };

// Chua ai cham: khong duoc in ra bat ky con so nao, du ban ghi con diem cu
const RV0 = ratingView({ name: "X", rating: 17, grp: "S" });
eq(RV0.rated, false, "chua cham chi so nao thi rated phai la false");
eq(RV0.n, 0, "dem dung so chi so da cham");
ok(RV0.rating === null, "chua cham thi khong tra ve con so nao");
eq(RV0.grade, "", "chua cham thi khong co hang");
ok(!/\d/.test(RV0.score), "o diem khong duoc chua chu so khi chua ai cham");
ok(!/\d/.test(RV0.gradeText), "chu hang khong duoc chua chu so khi chua ai cham");
ok(RV0.text.indexOf("17") < 0, "khong duoc ro ri diem cu go tay ra man");
ok(RV0.gradeText.indexOf("S") < 0, "khong duoc ro ri hang go tay ra man");

// Cham du 12: in ra binh thuong
const RV12 = ratingView({ name: "Y", rating: 9, attrs: A12 });
eq(RV12.rated, true, "cham du thi rated la true");
eq(RV12.n, 12, "dem du 12 chi so");
eq(RV12.score, "15", "diem in ra tinh tu chi so that");
ok(RV12.text.indexOf("mới") < 0, "cham du thi khong noi la con do dang");

// Cham do dang: phai NOI RA la con do dang, khong duoc lam nhu da xong
const RV3 = ratingView({ name: "Z", rating: 9, attrs: A3 });
eq(RV3.rated, true, "cham mot vai chi so van tinh la da cham");
eq(RV3.n, 3, "dem dung so o da cham");
ok(RV3.text.indexOf("3") >= 0, "phai noi ra moi cham may chi so");
ok(RV3.text.indexOf("12") >= 0, "phai noi ra tong bao nhieu chi so");
ok(RV3.gradeText.indexOf("3") >= 0, "chu hang cung phai noi la con do dang");

// Dau vao hong khong duoc nem loi
eq(ratingView(null).rated, false, "dau vao null khong duoc nem loi");
eq(ratingView({}).rated, false, "ban ghi rong thi coi nhu chua cham");
eq(ratedCount(null), 0, "dem tren null khong duoc nem loi");

/* Trung binh nhom chi tinh tren nguoi DA duoc cham. Nua nhom la so that nua
   nhom la diem cu thi con so do khong noi ve nhom nay. */
ok(ratedSquadAvg([{ rating: 17 }, { rating: 3 }]) === null, "ca nhom chua ai cham thi khong co trung binh");
ok(ratedSquadAvg([]) === null, "nhom rong thi khong co trung binh");
ok(ratedSquadAvg(null) === null, "dau vao null khong duoc nem loi");
eq(ratedSquadAvg([{ rating: 9, attrs: A12 }]), 15, "mot nguoi da cham thi lay dung diem nguoi do");
// Nguoi chua cham khong duoc keo trung binh xuong
eq(ratedSquadAvg([{ rating: 9, attrs: A12 }, { rating: 3 }]), 15,
   "nguoi chua cham khong duoc tinh vao trung binh nhom");

/* ---------- moi thu nguoi doc nhin thay deu la SAO ----------
   Trong FM ban khong bao gio thay con so 1-20; ban thay sao. Con so la cong cu
   cua doi truong, sao la thu ca doi doc duoc ma khong phai hoc thang diem nao. */
eq(starCount(20), 5, "20 diem la nam sao");
eq(starCount(10), 2.5, "10 diem la hai sao ruoi");
eq(starCount(2), 0.5, "diem thap nhat van con nua sao, khong phai khong sao");
eq(starCount(1), 0.5, "nguoi da duoc cham thi thap nhat cung nua sao");
ok(starCount(0) === 0, "chua cham thi khong sao nao");
ok(starCount(null) === 0, "dau vao null khong duoc nem loi");
ok(starCount("hong") === 0, "dau vao hong khong duoc nem loi");
eq(starCount(99), 5, "diem qua cao van chan o nam sao");
// Buoc nua sao: moi gia tri phai roi dung vach
[1,5,9,13,17,20].forEach(function (v) {
  eq(starCount(v) * 2 === Math.round(starCount(v) * 2), true, "sao phai roi dung buoc nua sao");
});
// Khop voi starsOf -- hai duong khong duoc lech nhau
[3, 8, 11, 15, 19].forEach(function (v) {
  const full = starsOf(v).filter(k => k === "full").length;
  const half = starsOf(v).filter(k => k === "half").length;
  eq(starCount(v), full + half / 2, "starCount phai khop hinh sao ve ra");
});

eq(starText(5), "5 sao", "so tron thi khong co duoi");
eq(starText(2.5), "2,5 sao", "nua sao viet bang dau phay kieu Viet");
eq(starText(0), "chưa có sao", "chua cham thi noi thang");

// Chenh lech doc thanh sao, khong doc thanh diem
ok(starGapText(3.5, 3.5).indexOf("ngang") >= 0, "bang nhau thi noi la ngang");
ok(starGapText(4, 3).indexOf("trên") >= 0, "cao hon thi noi la tren");
ok(starGapText(3, 4).indexOf("dưới") >= 0, "thap hon thi noi la duoi");
ok(starGapText(4, 3.5).indexOf("nửa sao") >= 0, "lech nua sao thi goi ten la nua sao");
ok(!/\d+\/20/.test(starGapText(4, 3)), "khong duoc lot con so thang 20 ra man");
/* Bang vinh danh: khong trao ngoi cho nguoi khong lam duoc gi. */
{
  const T = (id, name, k) => ({ id: id, name: name, games: k[0], goals: k[1], assists: k[2], mvp: k[3] });
  const squad = [
    T(1, "A", [8, 5, 2, 3]),
    T(2, "B", [8, 5, 1, 1]),
    T(3, "C", [6, 3, 4, 0]),
    T(4, "D", [2, 1, 0, 0]),
    T(5, "E", [8, 0, 0, 0])
  ];
  const b = honourBoard(squad);
  const goals = b.filter(x => x.key === "goals")[0];
  eq(goals.value, 5, "vua pha luoi lay so ban cao nhat");
  eq(goals.names.length, 2, "bang diem thi ca hai cung dung dau");
  ok(goals.names.indexOf("A") >= 0 && goals.names.indexOf("B") >= 0, "dung ten hai nguoi do");
  eq(goals.per, null, "bang diem thi khong tinh ti le ban/tran cho rieng ai");
  eq(goals.rest.length, 2, "hai muc diem ke tiep: 3 va 1");
  const as = b.filter(x => x.key === "assists")[0];
  eq(as.names[0], "C", "vua kien tao la nguoi kien tao nhieu nhat");
  eq(as.per, 0.7, "4 kien tao / 6 tran = 0,7 moi tran");
  const noGoals = honourBoard([T(1, "A", [5, 0, 0, 0]), T(2, "B", [4, 0, 0, 0])]);
  ok(!noGoals.some(x => x.key === "goals"), "ca doi 0 ban thi KHONG co vua pha luoi");
  ok(noGoals.some(x => x.key === "games"), "nhung chuyen can van trao duoc");
  const few = honourBoard([T(1, "A", [2, 2, 0, 0])]);
  eq(few.filter(x => x.key === "goals")[0].per, null, "duoi 3 tran thi khong noi ti le");
  eq(honourBoard([]).length, 0, "doi rong thi khong co hang muc nao");
  eq(honourBoard(null).length, 0, "dau vao null khong duoc nem loi");
  ok(HONOURS.every(h => typeof h.title === "string" && h.title), "hang muc nao cung phai co ten");
}

/* Trung binh nhom phai theo VI TRI: "PHONG NGU" cua mot trung ve khong duoc
   nuot Bat gon vao. */
{
  const DEF = [{ key: "defend" }, { key: "header" }, { key: "position" }, { key: "gk" }];
  const cb = { defend: 17, header: 16, position: 15, gk: 3 };
  eq(posAvg(cb, DEF, false), 16, "trung ve: trung binh phong ngu tinh tren 3 chi so that");
  eq(ratedAvg(cb, DEF), 13, "cach cu nuot Bat gon vao va ra 13 -- day la con so bi sai");
  const gk = { defend: 8, header: 9, position: 12, gk: 16 };
  eq(posAvg(gk, DEF, true), 11, "thu mon thi Bat gon PHAI tinh");
  ok(isKeeper({ pos: "GK" }), "ban ghi kieu cu nhan ra thu mon");
  ok(isKeeper({ posMain: "GK", posAlt: [] }), "ban ghi kieu moi nhan ra thu mon");
  ok(!isKeeper({ pos: "CB, LB" }), "trung ve khong phai thu mon");
  ok(!isKeeper(null), "dau vao rong khong duoc nem loi");
}

/* Thu mon phai duoc cham bang bo chi so cua thu mon, du ho so luu vi tri kieu
   CU (chuoi `pos`) hay kieu MOI (`posMain`). Truoc day chi kieu moi duoc nhan
   ra, nen thu mon luu kieu cu bi cham bang Tan cong / Re dat / Sut xa. */
{
  const gkAttrs = { gk: 16, position: 12, spirit: 14, strength: 12, pace: 9,
                    finish: 4, dribble: 5, pass: 9, shot: 4, defend: 11, header: 12, stamina: 14 };
  const oldRec = { pos: "GK", attrs: gkAttrs, rating: 10 };
  const newRec = { posMain: "GK", posAlt: [], attrs: gkAttrs, rating: 10 };
  eq(ratingOf(oldRec), ratingOf(newRec), "thu mon luu kieu cu va kieu moi phai ra cung mot diem");
  eq(ratingOf(oldRec), 13, "diem thu mon tinh tren gk/position/spirit/strength/pace = 63/5");
  const outRec = { pos: "CB, LB", attrs: gkAttrs, rating: 10 };
  ok(ratingOf(outRec) < ratingOf(oldRec), "cung bo chi so do, cham kieu cau thu san phai ra thap hon");
}

/* "Vao san" phai chon O HOP, khong phai o trong dau tien. */
{
  const R = ["TM", "HV", "HV", "TV", "TV", "TV", "TĐ"];
  eq(bestFreeSlot([null, null, null, null, null, null, null], R, { main: "ST", alt: [] }), 6,
     "tien dao vao o tien dao, khong phai o thu mon dang trong");
  eq(bestFreeSlot([1, null, null, null, null, null, null], R, { main: "CB", alt: [] }), 1,
     "trung ve vao o hau ve");
  eq(bestFreeSlot([1, 2, 3, null, null, null, null], R, { main: "CB", alt: ["CM"] }), 3,
     "het o hau ve thi vao o phu da duoc");
  eq(bestFreeSlot([1, 2, 3, 4, 5, 6, null], R, { main: "CB", alt: [] }), 6,
     "chi con mot o thi van vao, du lech tuyen");
  eq(bestFreeSlot([1, 2, 3, 4, 5, 6, 7], R, { main: "CB", alt: [] }), -1, "san day thi tra -1");
  eq(bestFreeSlot([null, null], R, { main: "", alt: [] }), 0, "chua khai vi tri thi lay o dau");
  eq(bestFreeSlot(null, R, { main: "ST", alt: [] }), -1, "dau vao hong khong duoc nem loi");
  eq(bestFreeSlot([null, null, null, null, null, null, null], R, null), 0, "khong co vi tri thi lay o dau");
}

// Man ho so noi bang diem 1-20, khong phai sao -- don vi phai khop voi man hinh.
ok(ptGapText(14, 12.6).indexOf("1,4 điểm") >= 0, "chenh lech noi bang diem, mot chu so le");
ok(ptGapText(14, 12.6).indexOf("trên") >= 0, "cao hon thi noi la tren");
ok(ptGapText(10, 13).indexOf("dưới") >= 0, "thap hon thi noi la duoi");
eq(ptGapText(12, 12), "ngang trung bình đội", "bang nhau thi noi la ngang");
eq(ptGapText(12, null), "", "thieu du lieu thi khong noi gi");
eq(starGapText(3, null), "", "sao cung vay: thieu du lieu thi khong noi gi");
ok(ptGapText(14, 12.6).indexOf("sao") < 0, "man ho so khong duoc noi bang sao");

/* ---------- dong thoi gian cua doi ---------- */
const TLM = [
  { date: "05/09/2026", opp: "FC Bến Xe", gf: 3, ga: 1 },
  { date: "12/09/2026", opp: "Gò Vấp", gf: 5, ga: 0 },
  { date: "19/09/2026", opp: "Thủ Đức", gf: 1, ga: 4 }
];
const TLT = [
  { id: 1, title: "Giải Tứ Hùng", year: 2026, place: "champion" },
  { id: 2, title: "Giải Công Ty", year: 2025, place: "runnerup" }
];
const T1 = clubTimeline(TLM, TLT);
ok(T1.length >= 5, "gom ca tran lan cup vao mot dong");
eq(T1[0].kind, "trophy", "moi nhat len dau: cup 2026 truoc");
eq(T1[0].year, 2026, "nam doc ra dung");
// Tran xep moi truoc trong cung mot nam
const tr = T1.filter(x => x.kind === "match");
eq(tr[0].date, "19/09/2026", "tran moi nhat len truoc");
eq(tr[tr.length - 1].date, "05/09/2026", "tran cu nhat xuong cuoi");
// Cot moc: tran dau tien phai duoc goi ten
ok(T1.some(x => x.kind === "first"), "tran dau tien la mot cot moc");
/* Chi goi ten "tran dau tien" khi biet CHAC no la tran dau. Dong seed cu khong
   co ngay, nen neu tran som nhat khong co ngay thi khong ai biet tran nao truoc
   -- va app tung gan nhan do cho dung cai tran MOI NHAT, tuc mot dong vua dung
   dau danh sach vua mang nhan "dau tien". */
const NOD = clubTimeline([{ date: "Sài Gòn Vets", gf: 1, ga: 0 },
                          { opp: "FC Bến Xe", date: "09/09/2026", gf: 3, ga: 1 }], null);
ok(!NOD.some(x => x.kind === "first"), "tran som nhat khong co ngay thi khong goi ten tran dau tien");
eq(NOD.filter(x => x.kind === "match").length, 2, "van hien du ca hai tran");
// Co ngay day du thi van goi ten binh thuong
const HAD = clubTimeline([{ opp: "A", date: "01/01/2026", gf: 1, ga: 0 },
                          { opp: "B", date: "02/02/2026", gf: 2, ga: 0 }], null);
ok(HAD.some(x => x.kind === "first"), "du ngay thi van co cot moc");
eq(HAD.filter(x => x.kind === "first")[0].opp, "A", "cot moc tro dung tran som nhat");
ok(HAD[HAD.length - 1].kind === "first", "cot moc nam cuoi dong, duoi tran som nhat");
// Dau vao hong khong duoc nem loi
eq(clubTimeline(null, null).length, 0, "chua co gi thi dong thoi gian rong");
eq(clubTimeline([], []).length, 0, "khong tran khong cup thi rong");
eq(clubTimeline(null, TLT).length, 2, "chi co cup van dung");
eq(clubTimeline(TLM, null).length, 4, "chi co tran van dung, ke ca cot moc");
// Dong seed cu cat TEN DOI THU vao truong `date` -- `oppOf` da biet chuyen do.
// Khong duoc in ten doi thu ra cot thoi gian nhu the no la mot cai ngay.
const LEG = clubTimeline([{ date: "Sài Gòn Vets", gf: 3, ga: 1 }], null);
const legMatch = LEG.filter(x => x.kind === "match")[0];
eq(legMatch.date, "", "dong cu khong co ngay that thi cot thoi gian phai trong");
eq(legMatch.opp, "Sài Gòn Vets", "ten doi thu van doc ra dung");
ok(legMatch.year === null, "khong duoc suy ra nam tu mot cai ten");
// Tran thieu ngay van phai co mat, khong duoc bo im lang
eq(clubTimeline([{ opp: "X", gf: 1, ga: 0 }], null).some(x => x.kind === "match"), true,
   "tran thieu ngay van hien, khong duoc bo im lang");
// Khong duoc doi mang goc
const OM = [{ date: "01/01/2026", opp: "A", gf: 1, ga: 0 }, { date: "02/01/2026", opp: "B", gf: 0, ga: 1 }];
clubTimeline(OM, null);
eq(OM[0].opp, "A", "clubTimeline khong duoc doi mang goc");

/* ---------- ai da da tran nay ---------- */
/* App tung dem "tran da da" CHI theo diem danh. Nen mot tran ghi bang su kien
   ma khong ai bam "Di" cho ra ho so noi "ghi 2 ban trong 0 tran". App biet
   Trung ghi ban thi no biet Trung co da. */
eq(playedIds([1,2], [{who:3,kind:"goal"}]).sort().join(","), "1,2,3", "nguoi co su kien duoc tinh la da da");
eq(playedIds([1,2], [{who:1,kind:"goal"}]).sort().join(","), "1,2", "khong dem trung nguoi da diem danh");
eq(playedIds([], [{who:7,kind:"yellow"},{who:7,kind:"goal"}]).join(","), "7", "mot nguoi nhieu su kien van chi mot tran");
eq(playedIds([5], []).join(","), "5", "khong su kien thi van tinh nguoi diem danh");
eq(playedIds([], []).length, 0, "khong ai thi khong ai");
eq(playedIds(null, null).length, 0, "dau vao null khong duoc nem loi");
eq(playedIds([1], [{kind:"goal"}]).join(","), "1", "su kien khong co nguoi thi bo qua");
eq(playedIds([1], [null]).join(","), "1", "su kien rong thi bo qua");
// Id dang chuoi va dang so phai coi la mot nguoi
eq(playedIds([3], [{who:"3",kind:"goal"}]).length, 1, "id chuoi va id so la cung mot nguoi");
// Doi hinh da chinh cua tran do cung la mot khang dinh "nguoi nay co da".
eq(playedIds([1], [], [1,2,3]).sort().join(","), "1,2,3", "doi hinh da chinh duoc tinh la da da");
eq(playedIds([], [], [4,5]).sort().join(","), "4,5", "chi co doi hinh thi van tinh");
eq(playedIds([2], [{who:3,kind:"goal"}], [2,9]).sort().join(","), "2,3,9", "diem danh + su kien + doi hinh gop lai khong trung");
eq(playedIds([1], [], null).join(","), "1", "khong truyen doi hinh thi khong doi hanh vi cu");
eq(playedIds([], [], [null, "6", undefined]).join(","), "6", "o trong trong doi hinh thi bo qua");

// Bang "theo tung tran" trong ho so phai sap theo NGAY THAT, cu toi moi.
{
  const ms = [
    { opp:"A", date:"14/06/2026", xi:[1] },
    { opp:"B", date:"5/9/2026",   xi:[1] },
    { opp:"C", date:"30/08/2026", xi:[1] }
  ];
  eq(memberMatchRows(ms, 1).map(r => r.opp).join(","), "A,C,B", "sap theo ngay that chu khong theo thu tu mang");
}
{
  // Ngay nguoi go khong dem 0 o dau; so sanh chuoi se dat 5/9 truoc 14/06.
  const ms = [{ opp:"X", date:"5/9/2026", xi:[2] }, { opp:"Y", date:"14/09/2026", xi:[2] }];
  eq(memberMatchRows(ms, 2).map(r => r.opp).join(","), "X,Y", "ngay mot chu so van sap dung");
}
{
  const ms = [{ opp:"K", date:"", xi:[3] }, { opp:"L", date:"01/01/2026", xi:[3] }];
  eq(memberMatchRows(ms, 3).map(r => r.opp).join(","), "L,K", "tran khong co ngay xuong cuoi chu khong len dau");
}
eq(dmyKey("5/9/2026"), 20260905, "dmyKey dem 0 giup");
eq(dmyKey("31/2/2026"), 20260231, "dmyKey khong kiem lich, chi kiem khoang -- viec kiem lich la cua calOk");
eq(dmyKey("2026-09-05"), null, "dinh dang khac tra null");
eq(dmyKey(""), null, "rong tra null");
eq(dmyKey(null), null, "null tra null");

// Chan thuong: ghi chu la bat buoc, ngay het la tuy.
eq(hurtInfo({}, "7/9/2026"), null, "khong ghi chu thi khong coi la chan thuong");
eq(hurtInfo({ hurt: "   " }, "7/9/2026"), null, "ghi chu toan khoang trang cung khong tinh");
eq(hurtInfo({ hurt: "rach co" }, "7/9/2026").label, "Chấn thương", "khong co ngay het thi chi ghi Chan thuong");
eq(hurtInfo({ hurt: "rach co", hurtTo: "30/9/2026" }, "7/9/2026").label, "Chấn thương · đến 30/9/2026", "co ngay het thi noi ra");
eq(hurtInfo({ hurt: "rach co", hurtTo: "1/9/2026" }, "7/9/2026"), null, "qua ngay het thi coi nhu lanh");
eq(hurtInfo({ hurt: "rach co", hurtTo: "7/9/2026" }, "7/9/2026").note, "rach co", "dung ngay het van con nghi");
eq(hurtInfo({ hurt: "rach co", hurtTo: "hom nao do" }, "7/9/2026").label, "Chấn thương", "ngay khong doc duoc thi coi nhu chua ro, khong phai da lanh");
eq(hurtInfo(null, "7/9/2026"), null, "null khong nem loi");
// Ngay khong co that thi la CHUA RO, khong phai da lanh.
eq(hurtInfo({ hurt: "rach co", hurtTo: "31/2/2026" }, "7/9/2026").label, "Chấn thương", "ngay 31/2 khong tu chua lanh cho ai");
eq(calOkDmy("31/2/2026"), false, "thang 2 khong co ngay 31");
eq(calOkDmy("29/2/2024"), true, "nam nhuan co 29/2");
eq(calOkDmy("29/2/2026"), false, "nam khong nhuan thi khong");
eq(calOkDmy("30/9/2026"), true, "ngay that thi dung");
eq(calOkDmy("31/9/2026"), false, "thang 9 chi co 30 ngay");
eq(calOkDmy("0/9/2026"), false, "khong co ngay 0");
eq(calOkDmy("1/13/2026"), false, "khong co thang 13");
eq(calOkDmy(""), false, "rong la khong hop le");

// Phong do: dem viec da xay ra o N tran gan nhat, khong bia diem tran.
eq(formSummary([], 5), null, "khong tran nao thi khong co phong do");
eq(formSummary(null, 5), null, "null khong nem loi");
{
  const rows = [
    { result:"B", goals:0, assists:0, mvp:false, y:0, r:0 },
    { result:"T", goals:2, assists:1, mvp:true,  y:0, r:0 },
    { result:"H", goals:0, assists:0, mvp:false, y:1, r:0 }
  ];
  const f = formSummary(rows, 5);
  eq(f.games, 3, "dem du ba tran");
  eq(f.w + "-" + f.d + "-" + f.l, "1-1-1", "thang hoa bai dung");
  eq(f.line, "3 trận gần nhất: 1T 1H 1B · 2 bàn · 1 kiến tạo · 1 lần hay nhất · 1 thẻ", "cau tom tat dung");
}
{
  // Chi lay N tran CUOI danh sach, vi memberMatchRows sap cu-toi-moi.
  const rows = [1,2,3,4,5,6,7].map(i => ({ result:"T", goals: i, assists:0, mvp:false, y:0, r:0 }));
  eq(formSummary(rows, 5).goals, 5+6+7+4+3, "lay dung nam tran gan nhat");
  eq(formSummary(rows, 5).games, 5, "khong lay qua N");
}
// Tran chua co ti so thi KHONG in "0T 0H 0B" -- do la mot khang dinh sai.
eq(formSummary([{ result:"", goals:0, assists:0, mvp:false, y:0, r:0 }], 5).line,
   "1 trận gần nhất: chưa ghi gì thêm", "tran chua co ti so khong bia ra ket qua");
eq(formSummary([{ result:"", goals:0, assists:0, mvp:false, y:0, r:0 }], 5).games, 1, "van dem la mot tran");

// SAN SANG: suy tu tran da da, khong bia chi so.
{
  // moi nhat truoc sau khi matchOrder sap: 5/9 > 3/9 > 1/9
  const ms = [
    { opp:"A", date:"1/9/2026", xi:[1,2] },
    { opp:"B", date:"3/9/2026", xi:[1] },
    { opp:"C", date:"5/9/2026", xi:[1] }
  ];
  const r1 = readiness(1, ms);
  eq(r1.rest + "/" + r1.streak, "0/3", "da ca ba tran gan nhat lien tiep");
  eq(r1.tired, true, "ba buoi lien la can cho nghi");
  const r2 = readiness(2, ms);
  eq(r2.rest + "/" + r2.streak, "2/1", "nghi hai tran gan nhat, truoc do da mot");
  eq(r2.lastDate, "1/9/2026", "lan cuoi ra san lay dung ngay");
  const r3 = readiness(9, ms);
  eq(r3.never, true, "chua co ten tran nao thi la chua ra san");
  eq(r3.rest, 3, "chua ra san thi rest bang so tran da co");
}
eq(readiness(1, []).never, true, "khong tran nao thi ai cung la chua ra san");
eq(readiness(1, null).never, true, "null khong nem loi");
// Nguoi co su kien nhung khong trong doi hinh van tinh la da da.
eq(readiness(7, [{ opp:"X", date:"2/9/2026", xi:[1], events:[{who:7,kind:"goal"}] }]).streak, 1,
   "ghi ban thi tinh la co da du khong co trong xi");
// readyTag: thu tu uu tien
eq(readyTag({ id:1, hurt:"rach co" }, [], "7/9/2026").key, "hurt", "chan thuong dung truoc moi thu");
eq(readyTag({ id:9 }, [{ opp:"A", date:"1/9/2026", xi:[1] }], "7/9/2026").key, "never", "chua ra san");
{
  const ms = [1,2,3].map(i => ({ opp:"M"+i, date:i+"/9/2026", xi:[5] }));
  eq(readyTag({ id:5 }, ms, "7/9/2026").key, "tired", "ba buoi lien ra nhan can nghi");
  eq(readyTag({ id:5 }, ms, "7/9/2026").label, "Đá 3 buổi liền", "nhan noi ro may buoi");
}
{
  const ms = [1,2,3,4,5].map(i => ({ opp:"M"+i, date:i+"/9/2026", xi:(i===1?[6]:[9]) }));
  eq(readyTag({ id:6 }, ms, "7/9/2026").key, "cold", "nghi bon tran gan nhat la lau chua duoc goi");
}
eq(readyTag({ id:1 }, [{ opp:"A", date:"1/9/2026", xi:[1] }], "7/9/2026").key, "ready", "vua ra san, khong chan thuong");

// SAO THEO VAI: hop vi tri nhan voi chi so, chua cham thi khong in sao.
{
  const full = { finish:16, shot:16, dribble:16, pace:16, strength:16, defend:16,
                 header:16, position:16, pass:16, stamina:16, spirit:16, gk:16 };
  const td = { posMain:"ST", pos:"ST", attrs: full };
  const hv = { posMain:"CB", pos:"CB", attrs: full };
  eq(roleStars(td, "TĐ").rated, true, "da cham du thi cham sao duoc");
  eq(roleStars(td, "TĐ").fit, 0, "tien dao dung o tien dao la so truong");
  const sTd = roleStars(td, "TĐ").stars, sHv = roleStars(hv, "TĐ").stars;
  eq(sTd > sHv, true, "cung chi so, dung cho phai hon lech tuyen");
  eq(roleStars(hv, "TĐ").fit >= 4, true, "hau ve len da tien dao la lech tuyen");
}
{
  // Chua cham du chi so cua tuyen do -> khong in sao, khong doan.
  const thieu = { posMain:"ST", pos:"ST", attrs:{ finish:16, shot:16 } };
  eq(roleStars(thieu, "TĐ").rated, false, "thieu chi so thi khong cham sao");
  eq(roleStars(thieu, "TĐ").value, null, "khong cham thi khong co con so");
}
{
  // Chua ro vi tri KHAC voi hop it -- app khong biet, nen khong in.
  const full = { finish:14, shot:14, dribble:14, pace:14, strength:14, defend:14,
                 header:14, position:14, pass:14, stamina:14, spirit:14, gk:14 };
  eq(roleStars({ pos:"", attrs: full }, "TĐ").rated, false, "chua ro vi tri thi khong cham sao");
}
eq(roleStars({ posMain:"ST", pos:"ST", attrs:{} }, "khong-co-tuyen").rated, false, "tuyen la thi tra false");
eq(roleStars(null, "TĐ").rated, false, "null khong nem loi");
eq(starGlyphs(3.5), "★★★½☆", "ba sao ruoi");
eq(starGlyphs(5), "★★★★★", "nam sao");
eq(starGlyphs(0), "☆☆☆☆☆", "khong sao");
eq(starGlyphs(99), "★★★★★", "tran tren nam");
eq(starGlyphs(-1), "☆☆☆☆☆", "tran duoi khong");

// PHAN TICH TRAN: chi ket luan khi du co mau, va luon mang co mau theo.
{
  const mk = (i, gf, ga, extra) => Object.assign({ opp:"D"+i, date:i+"/9/2026", gf:gf, ga:ga }, extra||{});
  eq(matchInsights([mk(1,1,0), mk(2,1,0)]).thin, true, "duoi ba tran thi khong ket luan gi");
  eq(matchInsights([]).sample, 0, "khong tran nao thi co mau bang khong");
  eq(matchInsights(null).thin, true, "null khong nem loi");
  // Ghi nhieu hon thung
  const manh = [mk(1,3,0), mk(2,2,0), mk(3,2,1)];
  eq(matchInsights(manh).pos.some(x => /Ghi nhiều hơn thủng/.test(x.text)), true, "ghi hon thung thi noi ra");
  eq(matchInsights(manh).neg.some(x => /Thủng nhiều hơn/.test(x.text)), false, "doi manh khong bi bao thung nhieu");
  // Thung nhieu hon ghi
  const yeu = [mk(1,0,3), mk(2,0,2), mk(3,1,2)];
  eq(matchInsights(yeu).neg.some(x => /Thủng nhiều hơn ghi/.test(x.text)), true, "thung hon ghi thi noi ra");
  // Co mau luon co trong cau
  eq(/3 trận/.test(matchInsights(manh).pos[0].detail), true, "cau nao cung mang co mau");
}
{
  // So san: nha an, khach khong -- moi ben du ba tran.
  const mk = (i, gf, ga, v) => ({ opp:"D"+i, date:i+"/9/2026", gf:gf, ga:ga, venue:v });
  const ms = [mk(1,2,0,"S.NHÀ"), mk(2,2,0,"S.NHÀ"), mk(3,1,0,"S.NHÀ"),
              mk(4,0,2,"S.KHÁCH"), mk(5,0,1,"S.KHÁCH"), mk(6,0,3,"S.KHÁCH")];
  const r = matchInsights(ms);
  eq(r.pos.some(x => /Sân: S\.NHÀ ăn hơn/.test(x.text)), true, "san nha an hon thi noi ra");
  eq(r.neg.some(x => /Sân: S\.KHÁCH không ăn/.test(x.text)), true, "san khach khong an thi noi ra");
}
{
  // Chi mot nhom du co mau -> khong so sanh (khong co doi chung).
  const mk = (i, v) => ({ opp:"D"+i, date:i+"/9/2026", gf:1, ga:0, venue:v });
  const r = matchInsights([mk(1,"S.NHÀ"), mk(2,"S.NHÀ"), mk(3,"S.NHÀ")]);
  eq(r.pos.some(x => /Sân:/.test(x.text)), false, "mot nhom thi khong co gi de so");
}
{
  // Phut ghi ban: hon nua tu phut 60 -> len chan cuoi tran.
  const g = (i, mins) => ({ opp:"D"+i, date:i+"/9/2026", gf:mins.length, ga:0,
                            events: mins.map(m => ({ who:1, kind:"goal", min:m })) });
  const r = matchInsights([g(1,[70,80]), g(2,[65]), g(3,[20])]);
  eq(r.pos.some(x => /Lên chân cuối trận/.test(x.text)), true, "ba phan tu ban sau phut 60");
  const r2 = matchInsights([g(1,[10,20]), g(2,[15]), g(3,[70])]);
  eq(r2.pos.some(x => /Vào trận nhanh/.test(x.text)), true, "ba phan tu ban truoc phut 30");
}

// CHI DAO CA NHAN: thua (part) hay da nhau voi vai (conflict).
eq(extraState("wide", "fb", "wide"), "part", "hau ve da duoc giao dang bien thi chi dao do la thua");
eq(extraState("wide", "fw", "wideout"), "part", "tien dao bam bien cung vay");
eq(extraState("wide", "fb", "safe"), "conflict", "thu chac ma bao dang bien la hai lenh nguoc nhau");
eq(extraState("wide", "fb", "invert"), "conflict", "bo vao giua ma bao dang bien la da nhau");
eq(extraState("wide", "cb", "stay"), "conflict", "trung ve dung nha thi khong dang bien");
eq(extraState("wide", "fb", "updown"), "", "len xuong thi dang bien la mot lua chon that");
eq(extraState("free", "mid", "box"), "part", "bao san da la da tu do");
eq(extraState("free", "mid", "hold"), "conflict", "giu nhip ma tha tu do la da nhau");
eq(extraState("free", "fw", "run"), "", "tien dao chay cho thi tu do van co nghia");
// "Kem nguoi" theo chi dao DOI, khong theo vai.
eq(extraState("man", "mid", "box", { ins:{ mark:"man" } }), "part", "ca doi da kem nguoi thi lenh rieng la thua");
eq(extraState("man", "mid", "box", { ins:{ mark:"zone" } }), "", "doi da khu vuc thi kem rieng mot nguoi la co nghia");
// Fail-closed
eq(extraState("khong-co", "fb", "wide"), "", "chi dao la thi khong ket luan gi");
eq(extraState("wide", "", ""), "", "khong biet vai thi khong ket luan gi");

/* ---------- ngay tran ---------- */
/* Truoc day app tu dong dau ngay cua BUOI KE TIEP trong lich. Ghi tran da hom
   qua thi ban ghi mang ngay mai, va nhin vao khong ai biet la sai. */
const NOW = new Date(2026, 8, 10);            // 10/09/2026
eq(matchDay("5/9", NOW), "5/9/2026", "go ngay/thang thi lay nam hien tai");
eq(matchDay("05/09", NOW), "5/9/2026", "bo so khong o dau");
eq(matchDay("5/9/2026", NOW), "5/9/2026", "go du nam thi giu dung nam do");
eq(matchDay("", NOW), "10/9/2026", "bo trong thi lay hom nay");
eq(matchDay(null, NOW), "10/9/2026", "null thi lay hom nay");
eq(matchDay("linh tinh", NOW), "10/9/2026", "go bay thi lay hom nay, khong bia ra ngay khac");
eq(matchDay("32/9", NOW), "10/9/2026", "ngay khong co that thi lay hom nay");
eq(matchDay("5/13", NOW), "10/9/2026", "thang khong co that thi lay hom nay");
eq(matchDay("0/9", NOW), "10/9/2026", "ngay 0 khong co that");
eq(matchDay("31/12", NOW), "31/12/2026", "cuoi nam van hop le");
eq(matchDay("5/9/24", NOW), "5/9/2024", "nam hai chu so doc thanh 20xx");
ok(/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(matchDay("5/9", NOW)), "luon tra ve dang co nam de dong thoi gian sap duoc");
eq(matchDay("29/2", NOW), "29/2/2026", "khong kiem nam nhuan -- app khong doan ho ngay");

/* ---------- moc nam tren dong thoi gian ----------
   Football Manager dat vien nam ngay TREN duong thoi gian (2023 · 2024 · Now).
   Khong co moc nam thi mot dong 40 su kien chi la mot danh sach dai. */
const TLY = [
  { kind: "trophy", year: 2026, ord: 20269999 },
  { kind: "match",  year: 2026, ord: 20260901 },
  { kind: "match",  year: 2025, ord: 20251201 },
  { kind: "match",  year: null, ord: -1 }
];
const WY = withYearMarks(TLY);
eq(WY.filter(x => x.kind === "year").length, 3, "moi nam mot moc, cong mot moc cho phan chua ro nam");
eq(WY[0].kind, "year", "moc nam dung truoc nhom cua no");
eq(WY[0].year, 2026, "moc dau la nam moi nhat");
eq(WY[1].kind, "trophy", "ngay sau moc la su kien dau cua nam do");
// Khong duoc chen moc trung khi hai su kien cung nam
eq(WY.filter(x => x.kind === "year" && x.year === 2026).length, 1, "cung nam thi chi mot moc");
// Nhom chua ro nam co moc rieng, va nam cuoi cung
const last = WY[WY.length - 1];
eq(last.kind, "match", "su kien chua ro nam nam cuoi");
ok(WY.filter(x => x.kind === "year" && x.year === null).length === 1, "co mot moc cho nhom chua ro nam");
// Dau vao rong / hong
eq(withYearMarks([]).length, 0, "dong rong thi khong co moc nao");
eq(withYearMarks(null).length, 0, "dau vao null khong duoc nem loi");
// Khong duoc doi mang goc
const OTL = [{ kind: "match", year: 2026, ord: 1 }];
withYearMarks(OTL);
eq(OTL.length, 1, "withYearMarks khong duoc doi mang goc");

/* Thanh dem danh hieu, kieu "2 Trophies · 0 Major Awards" duoi day man FM. */
const TT = trophyTally([
  { place: "champion" }, { place: "champion" }, { place: "runnerup" }, { place: "third" }, { place: "played" }
]);
eq(TT.cups, 2, "chi dem vo dich la cup");
eq(TT.podium, 4, "vo dich, a quan, hang ba deu tinh la co huy chuong");
eq(TT.total, 5, "tong ke ca giai chi tham du");
eq(trophyTally([]).cups, 0, "chua co gi thi khong co cup");
eq(trophyTally(null).total, 0, "dau vao null khong duoc nem loi");
eq(trophyTally([null, { place: "champion" }]).cups, 1, "dong rong bi bo qua");
eq(trophyTally([{ place: "la-hoac-thieu" }]).total, 1, "hang la van dem vao tong");
eq(trophyTally([{ place: "la-hoac-thieu" }]).podium, 0, "hang la khong tinh la co huy chuong");

/* O so trong bang "CA DOI": 0 phai ra dau gach, khong phai so 0. Mot cot toan
   so 0 doc nhu bang bi hong. */
eq(statCell(5), "5", "so duong in ra so");
eq(statCell(0), "—", "0 ra dau gach chu khong phai so 0");
eq(statCell(undefined), "—", "thieu du lieu ra dau gach");
eq(statCell(null), "—", "null ra dau gach");
eq(statCell("7"), "7", "chuoi so van doc duoc");
eq(statCell("abc"), "—", "rac ra dau gach chu khong phai NaN");
eq(statCell(-3), "—", "so am ra dau gach");
eq(statCell(2.6), "3", "so le lam tron");

/* Sap xep bang Thanh vien. Khoa la hoac thieu thi tra nguyen danh sach, khong nem.
   Mang goc khong duoc doi -- bang duoc ve lai moi lan bam, doi mang goc la sap
   xep chong len chinh no. */
const MS = [{ name: "Bao", num: 1, goals: 2 }, { name: "An", num: 11, goals: 9 }, { name: "Cuong", num: 7, goals: 0 }];
eq(memSorted(MS, { key: "goals", dir: 1 }).map(m => m.name).join(","), "An,Bao,Cuong", "ban thang: lon truoc");
eq(memSorted(MS, { key: "goals", dir: -1 }).map(m => m.name).join(","), "Cuong,Bao,An", "dao chieu thi nho truoc");
eq(memSorted(MS, { key: "num", dir: 1 }).map(m => m.num).join(","), "11,7,1", "so ao xep duoc");
eq(memSorted(MS, { key: "name", dir: 1 }).map(m => m.name).join(","), "An,Bao,Cuong", "ten xep A-Z");
eq(memSorted(MS, { key: "khong-co", dir: 1 }).map(m => m.name).join(","), "Bao,An,Cuong", "khoa la thi giu nguyen thu tu");
eq(memSorted(MS, null).length, 3, "khong co bo sap thi van tra du danh sach");
/* Hai cot cua bong da phui: ai di, ai no. Chung di qua `extra` vi du lieu chi
   ton tai trong mot luot dung (buoi dang mo), khong nam duoc trong bang khoa
   tinh o dau tep. */
const MSX = [{ id: "a1" }, { id: "a2" }, { id: "a3" }];
const MX = {
  att:  m => ATT_RANK[attState(({ a1: "yes", a2: "", a3: "no" })[m.id])],
  owed: m => ({ a1: 0, a2: 190000, a3: 95000 })[m.id]
};
eq(memSorted(MSX, { key: "owed", dir: 1 }, MX).map(m => m.id).join(","), "a2,a3,a1", "no nhieu nhat len dau");
eq(memSorted(MSX, { key: "owed", dir: -1 }, MX).map(m => m.id).join(","), "a1,a3,a2", "dao chieu thi ai du quy len dau");
eq(memSorted(MSX, { key: "att", dir: 1 }, MX).map(m => m.id).join(","), "a1,a3,a2", "diem danh: di truoc, chua tra loi cuoi");
eq(memSorted(MSX, { key: "att", dir: -1 }, MX).map(m => m.id).join(","), "a2,a3,a1", "bam lan hai: chua tra loi len dau de nhac");
eq(memSorted(MSX, { key: "owed", dir: 1 }).map(m => m.id).join(","), MSX.map(m => m.id).join(","), "khong co extra thi khoa la, giu nguyen");
eq(ATT_RANK.none < ATT_RANK.no, true, "chua tra loi xep duoi ca vang");
eq(memSorted(null, { key: "goals", dir: 1 }).length, 0, "dau vao null khong nem loi");

/* Cot DIEM tung la cot DUY NHAT trong bang khong bam sap duoc: tieu de khai
   `key:""` nen trong giong het cac cot kia ma bam vao khong xay ra gi. Trong tai
   vong 22 bam hai lan roi doc thu tu: 14,14,13,14,14 -- khong tang khong giam. */
const mk = (name, v) => ({ name: name, attrs: ATTRS.reduce((o, a) => { o[a.key] = v; return o; }, {}) });
const MR = [mk("Bao", 13), mk("An", 16), { name: "Cuong" }];
eq(memSorted(MR, { key: "rating", dir: 1 }).map(m => m.name).join(","), "An,Bao,Cuong", "diem: cao truoc");
eq(memSorted(MR, { key: "rating", dir: -1 }).map(m => m.name).join(","), "Cuong,Bao,An", "dao chieu thi thap truoc");
eq(memSorted(MR, { key: "rating", dir: 1 })[2].name, "Cuong", "chua cham diem thi xuong duoi cung");

/* 12 cot chi so o bang doi hinh cung bam sap duoc, khoa dang "a:<chi so>". */
const MA = [{ name: "Bao", attrs: { finish: 9 } }, { name: "An", attrs: { finish: 17 } }, { name: "Cuong", attrs: {} }];
eq(memSorted(MA, { key: "a:finish", dir: 1 }).map(m => m.name).join(","), "An,Bao,Cuong", "chi so: cao truoc");
eq(memSorted(MA, { key: "a:finish", dir: -1 }).map(m => m.name).join(","), "Cuong,Bao,An", "dao chieu");
eq(memSorted(MA, { key: "a:khong-co", dir: 1 }).length, 3, "chi so la thi van tra du danh sach");

/* Ti so va phut go vao. Trong tai vong 23 go "-5" va "-3": app keo ve 0 roi LUU
   mot tran that 0-0 va bao "Da luu tran 0-0". Rac vao thi phai bi chan, khong
   phai duoc don thanh du lieu. */
ok(scoreProblem("3", "1") === null, "ti so binh thuong thi khong sao");
ok(scoreProblem("", "") === null, "de trong = 0 ban, la cach ghi tran thua trang");
ok(scoreProblem("0", "0") === null, "0-0 la mot ti so that");
ok(scoreProblem("-5", "3") !== null, "ti so am bi chan");
ok(scoreProblem("3", "-1") !== null, "ti so am ben doi thu cung bi chan");
ok(scoreProblem("abc", "1") !== null, "chu khong phai so thi bi chan");
ok(scoreProblem("120", "1") !== null, "ti so vo ly bi chan");
ok(String(scoreProblem("-5", "3")).indexOf("đội mình") >= 0, "cau bao loi noi ro sai o dau");
ok(minuteProblem("") === null, "de trong phut la duoc");
ok(minuteProblem("45") === null, "phut binh thuong");
ok(minuteProblem("999") !== null, "phut 999 bi chan chu khong bi vut lang le");
ok(minuteProblem("-3") !== null, "phut am bi chan");

/* So tien mot dong so quy. Trong tai vong 24 go -999999999999: app bo dau tru,
   lay dau tu o Thu/Chi, roi ghi thang -- so du xuong -999.994.974.999d. */
ok(moneyProblem("95000") === null, "so tien binh thuong");
ok(moneyProblem("") !== null, "de trong thi bao");
ok(moneyProblem("0") !== null, "khong ghi dong 0 dong");
ok(moneyProblem("-999999999999") !== null, "so am/vo ly bi chan");
ok(moneyProblem("999999999999") !== null, "so qua lon bi chan");
ok(moneyProblem("1.235.000") === null, "co dau cham ngan cach van doc duoc");
ok(moneyProblem("abc") !== null, "chu khong phai so thi bi chan");

/* Ngay da tran: de trong = hom nay (dung), nhung "45/13" thi phai noi ra chu
   khong duoc lang le thay bang hom nay. */
ok(dayProblem("") === null, "de trong la duoc, mac dinh hom nay");
ok(dayProblem("28/8") === null, "ngay binh thuong");
ok(dayProblem("28/8/2026") === null, "co nam cung duoc");
ok(dayProblem("45/13") !== null, "ngay va thang vo ly bi chan");
ok(dayProblem("31/2") !== null, "thang 2 khong co ngay 31");
ok(dayProblem("29/2") === null, "29/2 cho qua, khong xet nam nhuan");
ok(dayProblem("hom qua") !== null, "chu thi bi chan");

/* Thu tu tran theo NGAY that, moi nhat truoc, va giu vi tri goc trong mang. */
const MO = [
  { date: "14/06/2026", opp: "A" },
  { date: "30/08/2026", opp: "B" },
  { date: "26/07/2026", opp: "C" },
  { opp: "khong ngay" }
];
eq(matchOrder(MO).map(o => o.m.opp).join(","), "B,C,A,khong ngay", "moi nhat truoc, dong khong ngay xuong cuoi");
eq(matchOrder(MO).map(o => o.i).join(","), "1,2,0,3", "giu vi tri goc de sua dung dong");
eq(matchOrder([]).length, 0, "mang rong khong nem loi");
eq(matchOrder(null).length, 0, "null khong nem loi");

/* Ho so mot nguoi. Trong tai vong 25 them duoc thanh vien voi so ao -5, so dien
   thoai "abcxyz" va ngay sinh 99/99/9999 -- ca ba luu nguyen, khong canh bao. */
ok(memberProblem({ name: "Nam" }) === null, "chi co ten la du");
ok(memberProblem({ name: "" }) !== null, "khong ten thi chan");
ok(memberProblem({ name: "   " }) !== null, "chi khoang trang cung la khong ten");
ok(memberProblem({ name: "Nam", num: "7" }) === null, "so ao binh thuong");
ok(memberProblem({ name: "Nam", num: "-5" }) !== null, "so ao am bi chan");
ok(memberProblem({ name: "Nam", num: "999" }) !== null, "so ao 999 bi chan");
ok(memberProblem({ name: "Nam", num: "" }) === null, "de trong so ao van duoc");
ok(memberProblem({ name: "Nam", phone: "0900000111" }) === null, "so dien thoai binh thuong");
ok(memberProblem({ name: "Nam", phone: "090 000 0111" }) === null, "co dau cach van doc duoc");
ok(memberProblem({ name: "Nam", phone: "+84900000111" }) === null, "dau +84 van doc duoc");
ok(memberProblem({ name: "Nam", phone: "abcxyz" }) !== null, "chu trong so dien thoai bi chan");
ok(String(memberProblem({ name: "Nam", phone: "abcxyz" })).indexOf("đăng nhập") >= 0, "cau bao loi noi ro hau qua: khong dang nhap duoc");
ok(memberProblem({ name: "Nam", dob: "12/03/1996" }) === null, "ngay sinh binh thuong");
ok(memberProblem({ name: "Nam", dob: "99/99/9999" }) !== null, "ngay sinh vo ly bi chan");
ok(memberProblem({ name: "Nam", dob: "31/02/2000" }) !== null, "thang 2 khong co ngay 31");
ok(memberProblem({ name: "Nam", dob: "12/03/1800" }) !== null, "nam sinh 1800 bi chan");
ok(memberProblem({ name: "Nam", dob: "" }) === null, "de trong ngay sinh van duoc");

/* Trung so dien thoai: so do CHINH LA tai khoan dang nhap, hai nguoi chung mot
   so la hai nguoi tranh nhau mot tai khoan. Trong tai vong 26 them duoc. */
const ROSTER = [{ id: 1, name: "Long", phone: "0900000118", num: "7" }, { id: 2, name: "Dung", phone: "0900000119", num: "9" }];
ok(memberProblem({ name: "Moi", phone: "0900000118" }, ROSTER) !== null, "trung so dien thoai bi chan");
ok(String(memberProblem({ name: "Moi", phone: "0900000118" }, ROSTER)).indexOf("Long") >= 0, "cau bao loi noi ro trung voi ai");
ok(memberProblem({ name: "Moi", phone: "090 000 0118" }, ROSTER) !== null, "co dau cach van nhan ra la trung");
ok(memberProblem({ name: "Moi", phone: "+84900000118" }, ROSTER) !== null, "dau +84 van nhan ra la trung");
ok(memberProblem({ name: "Long", phone: "0900000118" }, ROSTER, 1) === null, "sua chinh minh thi khong tinh la trung");
ok(memberProblem({ name: "Moi", phone: "0900000777" }, ROSTER) === null, "so khac thi cho qua");
/* So ao trung thi chi noi, khong chan -- doi phui hay co hai ao giong so that. */
ok(memberProblem({ name: "Moi", num: "7" }, ROSTER) === null, "trung so ao KHONG bi chan");
ok(memberWarning({ num: "7" }, ROSTER).indexOf("Long") >= 0, "nhung co canh bao noi ro ai dang mang so do");
eq(memberWarning({ num: "11" }, ROSTER), "", "so ao chua ai mang thi khong noi gi");
eq(memberWarning({ num: "7" }, ROSTER, 1), "", "sua chinh minh thi khong canh bao");

/* Link chi duoc di theo http(s). Trong tai vong 26 go `javascript:alert(1)` vao
   o link Drive va app dung ngay mot the <a> song. */
eq(safeUrl("https://drive.google.com/x"), "https://drive.google.com/x", "https di duoc");
eq(safeUrl("http://a.b"), "http://a.b", "http di duoc");
eq(safeUrl("javascript:alert(1)"), "", "javascript: bi chan");
eq(safeUrl("not-a-url-at-all"), "", "chuoi rac bi chan");
eq(safeUrl("data:text/html,x"), "", "data: bi chan");
eq(safeUrl(""), "", "rong tra rong");
eq(safeUrl(null), "", "null khong nem loi");

/* Bo MOT buoi cua lich hang tuan thi chi bo dung buoi do. Trong tai vong 27 bam
   bo buoi 9/9 va mat sach 16/9, 23/9, 30/9 lan ca dinh nghia lich. */
const W = { repeat: "weekly", date: "2026-09-02", skip: ["2026-09-09"] };
const dt = iso => new Date(iso + "T00:00:00");
const base = dt("2026-09-02");
ok(occHit(W, dt("2026-09-16"), base, "2026-09-16"), "buoi hang tuan khac van no ra");
ok(!occHit(W, dt("2026-09-09"), base, "2026-09-09"), "dung buoi bi bo thi khong no ra");
ok(occHit(W, dt("2026-09-23"), base, "2026-09-23"), "buoi sau nua van con");
ok(!occHit(W, dt("2026-08-26"), base, "2026-08-26"), "truoc ngay bat dau thi khong co");
ok(!occHit(W, dt("2026-09-10"), base, "2026-09-10"), "khac thu trong tuan thi khong co");
const ONE = { repeat: "none", date: "2026-09-05" };
ok(occHit(ONE, dt("2026-09-05"), dt("2026-09-05"), "2026-09-05"), "lich le dung ngay thi co");
ok(!occHit(ONE, dt("2026-09-06"), dt("2026-09-05"), "2026-09-06"), "lich le khac ngay thi khong");
ok(!occHit(null, dt("2026-09-05"), base, "2026-09-05"), "null khong nem loi");

/* Ten rut gon duoi o cau thu. Trong tai vong 28 sua ten thanh "Bui Nhat Nam
   (Sua QA)" va bien tren san chi con "QA)" o ba cho khac nhau. */
eq(shortName("Bùi Nhật Nam"), "Nam", "ten thuong lay chu cuoi");
eq(shortName("Bùi Nhật Nam (Sửa QA)"), "Nam", "bo phan trong ngoac truoc khi lay chu cuoi");
eq(shortName("Long [C]"), "Long", "ngoac vuong cung bo");
eq(shortName("Nam."), "Nam", "bo dau cau o duoi");
eq(shortName("Nam"), "Nam", "mot chu thi giu nguyen");
eq(shortName(""), "", "rong tra rong");
eq(shortName(null), "", "null khong nem loi");
eq(shortName("(QA)"), "QA", "ca ten nam trong ngoac thi van tra ra chu");
eq(MS.map(m => m.name).join(","), "Bao,An,Cuong", "mang goc khong bi doi");
eq(memSorted([{ name: "X" }, { name: "Y", goals: 3 }], { key: "goals", dir: 1 })[0].name, "Y", "thieu so tinh la 0");

/* Tom tat chuyen trong tran. Ten in ho cuoi (nguoi Viet goi nhau bang ten), nguoi
   ghi nhieu ban in x2, nguoi da roi doi in #id chu khong bi bo qua. */
const MEVNM = id => ({ 1: "Ngô Hoàng Long", 2: "Bùi Nhật Nam" })[id] || "";
const MEVS = [{ kind: "goal", who: 1 }, { kind: "goal", who: 1 }, { kind: "goal", who: 2 }, { kind: "assist", who: 2 }, { kind: "yellow", who: 9 }];
eq(matchEvSummary(MEVS, MEVNM), "⚽ Long x2, Nam · KT Nam · Vàng #9", "ban truoc, x2 cho nguoi ghi hai ban, nguoi la in #id");
eq(matchEvSummary([{ kind: "mvp", who: 2 }], MEVNM), "MVP Nam", "mot MVP");
eq(matchEvSummary([], MEVNM), "", "khong co chuyen thi chuoi rong, khong phai dau gach");
eq(matchEvSummary(null, MEVNM), "", "null khong nem loi");
eq(matchEvSummary([null, { kind: "goal", who: 1 }], MEVNM), "⚽ Long", "phan tu rong bi bo qua");
eq(matchEvSummary([{ kind: "red", who: 1 }, { kind: "og", who: 2 }], MEVNM), "Đỏ Long · PL Nam", "the do va phan luoi co nhan rieng");
eq(matchEvSummary([{ kind: "goal", who: 1 }], null), "⚽ #1", "khong co nameOf thi van in duoc");

/* Dong theo-tung-tran cua mot nguoi. Co mat = trong xi HOAC co su kien; tran khong
   lien quan thi bo qua chu khong bia dong "vang". */
const MMR = [
  { opp: "A", date: "1/1/2026", gf: 2, ga: 1, xi: [1, 2], events: [{ kind: "goal", who: 1 }, { kind: "goal", who: 1 }, { kind: "yellow", who: 2 }] },
  { opp: "B", date: "8/1/2026", gf: 0, ga: 0, xi: [2], events: [{ kind: "assist", who: 1 }] },
  { opp: "C", date: "15/1/2026", gf: 1, ga: 3, xi: [2], events: [] },
  null
];
eq(memberMatchRows(MMR, 1).length, 2, "nguoi 1: 2 tran co ten (tran C khong lien quan)");
eq(memberMatchRows(MMR, 1)[0].goals, 2, "ghi 2 ban o tran A");
eq(memberMatchRows(MMR, 1)[0].started, true, "co trong xi = da chinh");
eq(memberMatchRows(MMR, 1)[1].started, false, "chi co su kien = vao san");
eq(memberMatchRows(MMR, 1)[1].assists, 1, "kien tao o tran B");
eq(memberMatchRows(MMR, 1)[0].result, "T", "2-1 la thang");
eq(memberMatchRows(MMR, 2)[2].result, "B", "1-3 la bai");
eq(memberMatchRows(MMR, 2)[0].y, 1, "the vang dem dung nguoi");
eq(memberMatchRows(MMR, 9).length, 0, "nguoi khong co tran nao thi mang rong");
eq(memberMatchRows(null, 1).length, 0, "null khong nem loi");
eq(memberMatchRows([{ opp: "D", xi: ["1"] }], 1)[0].score, "", "thieu ti so thi chuoi rong, khong phai NaN");
eq(memberMatchRows([{ opp: "D", xi: ["1"] }], 1)[0].started, true, "id dang chuoi van khop");

/* Cau 74: doi so do thi chi dao ca nhan cua o nao con giu duoc.
   Chi dao gan theo SO O, ma o 3 cua 1-2-3-1 la tien ve con o 3 cua 1-3-2-1 la
   hau ve -- neu khong doi chieu thi vai tro cu doc bang nhom moi se ra rong va
   o lang le ve mac dinh. */
const KEEP7 = slotKeeps("7", "1-2-3-1", "7", "1-3-2-1");
eq(KEEP7.length, 7, "san 7 van la 7 o sau khi doi so do");
eq(KEEP7[0], true, "thu mon van la thu mon");
eq(KEEP7[2], false, "o 2: hau ve bien -> trung ve, phai bo chi dao");
eq(KEEP7[3], false, "o 3: tien ve -> hau ve, phai bo chi dao");
eq(KEEP7[4], true, "o 4: tien ve o ca hai so do, giu chi dao");
eq(KEEP7[6], true, "o 6: tien dao o ca hai so do, giu chi dao");
// Vai tro cu doc bang nhom moi ra rong -- day chinh la cho no am tham mat.
eq(splitLegacyRole("fb", "hold").role, "", "vai tro tien ve khong doc duoc o nhom hau ve");
// Doi sang chinh no thi khong duoc bo gi.
slotKeeps("7", "1-2-3-1", "7", "1-2-3-1").forEach((k, i) =>
  ok(k, "doi sang chinh so do dang dung ma bo o " + i));
// Khac khong so o: chi giu o nao con ton tai VA cung tuyen.
const KEEP57 = slotKeeps("5", "1-2-2", "7", "1-2-3-1");
eq(KEEP57.length, 7, "doi sang san 7 thi tra ve theo so o cua san 7");
eq(KEEP57[5], false, "o san 5 khong co thi khong the giu");
// So do la khong biet -> khong giu gi, chu khong nem loi.
eq(slotKeeps("7", "khong-co", "7", "1-2-3-1").filter(Boolean).length, 0,
  "so do nguon la khong biet thi bo het, fail-closed");
eq(slotKeeps("7", "1-2-3-1", "7", "khong-co").length, 0, "so do dich la khong biet thi mang rong");

/* Lich thang phai in duoc tran da da. Dong khong co doi thu la dong mau cu
   (doi thu nam nham o o ngay), va ngay khong doc duoc thi khong doan bua. */
const MBD = matchByDay([
  { date: "09/08/2026", opp: "Go Vap FC", gf: 5, ga: 0 },
  { date: "09/08/2026", opp: "Quan 7", gf: 1, ga: 1 },
  { date: "31/2/2026", opp: "Ngay bia", gf: 2, ga: 0 },
  { date: "16/08/2026", gf: 3, ga: 1 },
  null
]);
eq(Object.keys(MBD).length, 1, "chi ngay hop le co doi thu moi vao duoc lich");
eq(MBD[20260809].length, 2, "hai tran cung ngay thi giu ca hai");
eq(MBD[20260816], undefined, "dong khong co doi thu thi bo qua");
eq(MBD[20260231], undefined, "ngay khong co that thi bo qua");
eq(Object.keys(matchByDay(null)).length, 0, "dau vao null khong nem loi");

/* Bang xep hang o Tong quan mo bang cot nao. Doi chua da tran nao thi diem la
   thu duy nhat co, nhung da co tran thi phai mo bang chuyen da xay ra. */
eq(defaultRankBy([{ games: 0 }, { games: 0 }]), "rating", "chua tran nao thi mo bang diem");
eq(defaultRankBy([{ games: 0 }, { games: 3 }]), "games", "co tran roi thi mo bang chuyen can");
eq(defaultRankBy([]), "rating", "doi rong khong nem loi");
eq(defaultRankBy(null), "rating", "dau vao null khong nem loi");

/* Bang du bi la cua MOT BUOI. Khoa doi cu chi la duong rot de du lieu dang co
   khong mat; mang rong la mot cau tra loi, khong phai thieu du lieu. */
eq(benchOf({ "1@2026-09-09": [7, 9] }, "1@2026-09-09", "1").join(","), "7,9", "co khoa buoi thi lay khoa buoi");
eq(benchOf({ "1": [3, 4] }, "1@2026-09-09", "1").join(","), "3,4", "chua co khoa buoi thi rot ve bang doi cu");
eq(benchOf({ "1@2026-09-09": [], "1": [3, 4] }, "1@2026-09-09", "1").length, 0, "buoi da xoa het du bi thi giu rong, khong rot ve doi");
eq(benchOf({}, "1@2026-09-09", "1").length, 0, "khong co gi thi mang rong");
eq(benchOf(null, "a", "b").length, 0, "dau vao null khong nem loi");

/* Tha vao san thi hit vao o gan nhat. Truoc do lech vai chuc pixel la roi vao
   co: khong gan ai va khong bao gi. */
const CEN = [{ cx: 100, cy: 400 }, { cx: 60, cy: 300 }, { cx: 140, cy: 300 }, { cx: 100, cy: 120 }];
eq(nearestSlotIdx(CEN, 98, 395), 0, "tha sat thu mon thi vao o thu mon");
eq(nearestSlotIdx(CEN, 105, 130), 3, "tha o vong cam thi vao tien dao");
eq(nearestSlotIdx(CEN, 62, 305), 1, "hai o canh nhau thi lay o gan hon");
eq(nearestSlotIdx(CEN, 139, 305), 2, "nhich sang phai mot chut la doi o");
eq(nearestSlotIdx([], 10, 10), -1, "khong o nao thi -1, nguoi goi khong hit bua");
eq(nearestSlotIdx(null, 10, 10), -1, "dau vao null khong nem loi");
eq(nearestSlotIdx([null, { cx: 5, cy: 5 }], 6, 6), 1, "o chua do duoc kich thuoc thi bo qua");

/* Met thi bi tru diem khi xep doi hinh tu dong. App tu tinh ra "Da N buoi lien"
   roi tung lo chinh no. Muc phat vua phai: thua nguoi khoe ngang tai, khong thua
   nguoi kem han. */
/* Luc giac diem: ruot phai DOI theo diem. Bai nay ton tai vi truoc do no la
   hai path chet, nguoi 9 diem ve y het nguoi 19 diem. */
eq(hexBox(20).w > hexBox(10).w, true, "diem cao thi luc giac to hon");
eq(hexBox(10).w > hexBox(5).w, true, "diem thap hon thi nho hon");
eq(hexBox(20).w, Math.round(48.185 * (37.477 / 48.185) * 1000) / 1000, "20 diem = to nhat, bang path goc");
eq(hexBox(0).w, 0, "chua cham chi so nao thi khong ve gi");
eq(hexBox("—").w, 0, "rating la dau gach thi khong ve gi");
eq(hexBox(null).w, 0, "null khong nem loi");
eq(hexBox(1).w > 0, true, "1 diem van con hinh, khong bien mat");
eq(Math.abs(hexBox(14).x * 2 + hexBox(14).w - 48.185) < 0.01, true, "ruot luon nam giua khung theo chieu ngang");
eq(Math.abs(hexBox(14).y * 2 + hexBox(14).h - 50.813) < 0.01, true, "va giua theo chieu doc");
eq(hexBox(99).w, hexBox(20).w, "diem vuot thang thi kep lai, khong tran ra ngoai khung");

/* Bao "kiem tra mang" khi may van co mang la chi sai cho: du an Supabase goi
   free tu tam dung, ten mien bien mat, va nguoi dung di khoi dong lai router. */
ok(/không có mạng/.test(netWhy(false)), "mat mang thi noi la mat mang");
ok(!/tạm dừng/.test(netWhy(false)), "mat mang thi khong do cho may chu");
ok(/tạm dừng/.test(netWhy(true)), "co mang ma may chu im thi phai nhac chuyen tam dung");
ok(!/Kiểm tra mạng/.test(netWhy(true)), "co mang thi thoi bao di kiem tra mang");
ok(/khôi phục/.test(netWhy(true)), "phai noi viec can lam, khong chi noi hong");
eq(netWhy(undefined), netWhy(true), "khong biet online hay khong thi doan ve phia may chu");
ok(netWhy(false) !== netWhy(true), "hai truong hop phai ra hai cau khac nhau");

/* No bao nhieu BUOI, khong phai bao nhieu tien -- vi noi quy dem theo buoi. */
eq(debtSessions(190000, 95000), 2, "no 190k voi tien san 95k la 2 buoi");
eq(debtSessions(189999, 95000), 1, "thieu mot dong thi van con la 1 buoi, khong lam tron len");
eq(debtSessions(95000, 95000), 1, "dung mot buoi");
eq(debtSessions(0, 95000), 0, "khong no thi 0");
eq(debtSessions(-50000, 95000), 0, "so am khong thanh no");
eq(debtSessions(190000, 0), 0, "tien san 0 thi khong chia duoc -- khong chan ai");
eq(debtSessions(190000, -5), 0, "tien san am cung vay");
eq(debtSessions(null, 95000), 0, "null khong nem loi");
eq(debtSessions("190000", "95000"), 2, "chuoi so van doc duoc");
eq(debtSessions(1000000, 95000), 10, "no nhieu thi dem dung nhieu");

/* Ke hoach (buoc dung + mui ten) phai thuoc ve MOT buoi + MOT ben + MOT so o.
   Truoc day chung la mang phang toan cuc nen tran nao cung thay bo cu. */
const PL = [
  { ph:"on",  k:"e1@2026-09-23#7", t:"A" },
  { ph:"off", k:"e1@2026-09-23#7", t:"B" },
  { ph:"on",  k:"e1@2026-09-23#7#B", t:"C" },
  { ph:"on",  k:"e1@2026-09-30#7", t:"D" },
  { ph:"on",  k:"e1@2026-09-23#5", t:"E" },
  { ph:"on",  t:"F" }
];
eq(forPlan(PL, "on", "e1@2026-09-23#7").map(v => v.t).join(""), "A", "chi lay dung buoi, dung ben, dung pha");
eq(forPlan(PL, "off", "e1@2026-09-23#7").map(v => v.t).join(""), "B", "pha mat bong tach rieng");
eq(forPlan(PL, "on", "e1@2026-09-23#7#B").map(v => v.t).join(""), "C", "doi B khong an ke hoach cua doi A");
eq(forPlan(PL, "on", "e1@2026-09-30#7").map(v => v.t).join(""), "D", "buoi khac thi ke hoach khac");
eq(forPlan(PL, "on", "e1@2026-09-23#5").map(v => v.t).join(""), "E", "doi co san la doi bai toan -- so o nam trong khoa");
eq(forPlan(PL, "on", "").map(v => v.t).join(""), "F", "ban ghi cu chua gan buoi nao");
eq(forPlan(PL, "on", "khong-co-that").length, 0, "khoa la thi khong tra ve gi");
eq(forPlan(null, "on", "x").length, 0, "mang rong khong nem loi");
eq(planOf({}), "", "thieu k thi coi nhu chua gan");
eq(planOf({ k: "" }), "", "chuoi rong van la chua gan");

/* `planIndex` doi chi so trong danh sach DA LOC ra chi so trong mang day du --
   xoa nham mot bo buoc cua buoi khac la mat viec cua nguoi khac. */
eq(planIndex(PL, "on", "e1@2026-09-23#7", 0), 0, "phan tu dau cua ke hoach nay nam o 0");
eq(planIndex(PL, "on", "e1@2026-09-30#7", 0), 3, "cua buoi khac nam o 3, khong phai 1");
eq(planIndex(PL, "on", "e1@2026-09-23#7", 1), -1, "khong co phan tu thu hai thi tra -1");
eq(planIndex(PL, "off", "e1@2026-09-23#7", 0), 1, "pha mat bong dem rieng");

/* Di tru: ban ghi cu KHONG bi xoa, va da gan roi thi thoi dung vao. */
const OLD = [{ ph:"on" }, { ph:"off" }];
eq(stampPlans(OLD, "K").every(v => v.k === "K"), true, "ban ghi cu duoc gan vao ke hoach dang mo");
eq(stampPlans(OLD, "K").length, OLD.length, "khong mat ban ghi nao");
const DONE = [{ ph:"on", k:"K" }];
eq(stampPlans(DONE, "K2"), DONE, "da gan roi thi tra chinh mang cu -- noi goi biet khong can ghi xuong");
eq(stampPlans([{ ph:"on", k:"" }], "K")[0].k, "", "chuoi rong la mot lua chon co that, dung de len");

/* Bong chet dung lai may cua buoc dung: tinh huong nam trong KHOA ke hoach.
   Chay tran KHONG co duoi, nen moi ban ghi da luu tu truoc van thuoc ve no --
   day la dieu khien cho nay khong can di tru. */
eq(planKeyOf("1@2026-09-23#7", ""), "1@2026-09-23#7", "chay tran khong them duoi");
eq(planKeyOf("1@2026-09-23#7", "ca"), "1@2026-09-23#7|ca", "phat goc ta co duoi rieng");
ok(planKeyOf("B", "ca") !== planKeyOf("B", "cd"), "phat goc TA khac phat goc DOI");
ok(planKeyOf("B", "fa") !== planKeyOf("B", "ca"), "da phat khac phat goc");
eq(planKeyOf("B", "bia-dat"), "B", "tinh huong la thi roi ve chay tran, khong de ra khoa rac");
eq(sitOk("ca"), "ca", "tinh huong that thi giu");
eq(sitOk("khong-co"), "", "tinh huong la thi ve chay tran");
eq(sitOk(undefined), "", "thieu thi ve chay tran");
eq(sitLabel(""), SITUATIONS[0][1], "chay tran co nhan");
ok(sitLabel("cd").length > 0, "phat goc doi co nhan");
eq(SITUATIONS.length, 5, "chay tran + bon tinh huong bong chet");
eq(SITUATIONS.filter(x => x[0] === "").length, 1, "dung MOT tinh huong khong co duoi");
eq(new Set(SITUATIONS.map(x => x[0])).size, SITUATIONS.length, "khong tinh huong nao trung ma");
/* Ke hoach bong chet khong duoc lan sang chay tran cua cung buoi do. */
const SP = [{ ph:"on", k:"B" }, { ph:"on", k:"B|ca" }, { ph:"on", k:"B|cd" }];
eq(forPlan(SP, "on", planKeyOf("B", "")).length, 1, "chay tran chi thay ke hoach chay tran");
eq(forPlan(SP, "on", planKeyOf("B", "ca")).length, 1, "phat goc ta chi thay cua no");
eq(forPlan(SP, "on", planKeyOf("B", "fd")).length, 0, "tinh huong chua dung gi thi trong");

/* Them num chi dao chi co nghia neu CACH DA cung biet mac dinh cho no --
   thieu mot khoa la num do rong khong, va `insOf` tra undefined. */
INS_ROWS.forEach(r => {
  ["def", "bal", "att"].forEach(m => {
    ok(MENTALITY_INS[m][r.key] !== undefined, "cach da " + m + " co mac dinh cho num " + r.key);
    ok(r.opts.some(o => o[0] === MENTALITY_INS[m][r.key]),
       "mac dinh cua " + m + " cho " + r.key + " phai la mot lua chon co that");
  });
  ok(r.opts.length >= 2, "num " + r.key + " phai co it nhat hai lua chon");
  eq(new Set(r.opts.map(o => o[0])).size, r.opts.length, "num " + r.key + " khong co lua chon trung ma");
});
eq(new Set(INS_ROWS.map(r => r.key)).size, INS_ROWS.length, "khong num nao trung khoa");

/* Nam mau thuan moi: moi cai phai BAT khi dat nguoc, va KHONG bat o cach da
   mac dinh -- canh bao keu suot thi khong ai doc nua. */
const T = ins => ({ ins: Object.assign({}, MENTALITY_INS.bal, ins) });
const RK = [{ group: "cb", duty: "def" }, { group: "fb", duty: "att" }, { group: "fw", duty: "att" }];
const co = (ins, chu) => tacticConflicts(T(ins), RK).some(x => x.indexOf(chu) >= 0);
ok(co({ gkKick: "short", pass: "long" }, "phát bóng"), "thu mon phat ngan + doi phat dai = mau thuan");
ok(co({ trap: "on", line: "low" }, "việt vị"), "bay viet vi + hang thu thap = mau thuan");
ok(co({ trap: "on", mark: "man" }, "việt vị"), "bay viet vi + kem nguoi = mau thuan");
ok(co({ hold: "slow", onLoss: "counter" }, "câu giờ"), "cau gio + vay lai ngay = mau thuan");
ok(co({ side: "left", width: "narrow" }, "một góc"), "danh mot ben + choi hep = mau thuan");
eq(co({ gkKick: "long", pass: "long" }, "phát bóng"), false, "hai cai cung phat dai thi khong mau thuan");
eq(co({ trap: "off", line: "low" }, "việt vị"), false, "khong bay viet vi thi khong keu");
eq(co({ side: "both", width: "narrow" }, "một góc"), false, "danh deu hai ben thi choi hep khong sao");

eq(restPenalty({ tired: true, streak: 3 }), 7, "da 3 buoi lien thi bi tru 7");
eq(restPenalty({ tired: true, streak: 5 }), 9, "da nhieu hon thi tru nang hon");
eq(restPenalty({ tired: false, streak: 9 }), 0, "chua tinh la met thi khong tru");
eq(restPenalty({ tired: true }), 4, "thieu streak van tru muc san");
eq(restPenalty(null), 0, "dau vao null khong nem loi");
// Muc phat phai nho hon khoang cach diem giua nguoi gioi va nguoi kem han:
// rating*2 nen chenh 5 diem danh gia la 10, lon hon 9.
eq(restPenalty({ tired: true, streak: 5 }) < 10, true, "met khong duoc lan at chenh lech trinh do lon");

/* Canh trai / phai. `fitCost` chi biet bon tuyen nen coi LB voi RB la mot --
   may xep tung dua hau ve PHAI vao o TRAI roi bao "so truong". */
eq(sideCost({ main: "RB", alt: [] }, "LB"), 2, "hau ve phai xep sang o trai: sai canh");
eq(sideCost({ main: "LB", alt: [] }, "LB"), 0, "dung canh thi khong phat");
eq(sideCost({ main: "CB", alt: [] }, "LB"), 1, "nguoi da giua bi day ra bien: phat nhe");
eq(sideCost({ main: "CB", alt: ["LB"] }, "LB"), 0, "canh nam o vi tri phu van tinh la dung canh");
eq(sideCost({ main: "RB", alt: [] }, "CB"), 0, "o giua thi khong co canh de sai");
eq(sideCost({}, "LB"), 1, "khong ro vi tri thi coi nhu nguoi da giua");
// Sai canh phai NHE hon lech tuyen: doi phui doi canh la chuyen thuong,
// xep hau ve len hang tien dao moi la chuyen la.
eq(fitCostAt({ main: "RB", alt: [] }, "LB") < fitCostAt({ main: "RB", alt: [] }, "ST"), true,
  "sai canh re hon lech tuyen");
eq(fitCostAt({ main: "LB", alt: [] }, "LB"), 0, "dung o thi van bang 0");
eq(fitLabel(2, false, 2), "lệch cánh", "dung tuyen sai canh thi goi dung ten");
eq(fitLabel(0, false, 0), "sở trường", "khong sai canh thi giu nhan cu");
eq(fitLabel(7, false, 0), "lệch tuyến", "lech tuyen van la lech tuyen");
eq(SIDE_OF.LW, "T", "canh trai gom ca tien dao canh trai");

console.log(fails ? "\n" + fails + " failures out of " + n + " checks"
                  : "ok — " + n + " tactic checks pass");
process.exit(fails ? 1 : 0);
