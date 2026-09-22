/* Ba muoi sau CON NGUOI CO THAT tung nam nguyen o day: ten that, so dien thoai
   that, ngay sinh that, ten in ao, size ao. Chung la du lieu cua mot doi bong cu
   the, khong phai ma nguon -- va de app o dau la de danh ba cua ca doi o do.
   Doi mau da chuyen sang nguoi bia tu truoc (`DEMO_MEMBERS`), app cung mo ra
   trong, nen mang nay chi con MOT viec duy nhat: tra loi "id nay co phai admin
   khong" cho nhung ban luu cu chua co truong `role`. Hai id. Giu dung hai id.

   Danh ba that van con: no nam trong localStorage cua may doi truong va trong
   `team_state` tren may chu, dung cho no thuoc ve. */
const SEED_ADMIN_IDS = [1, 12];

const POS_CODES = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"];

/* Nut "+" tren moi dong DANH SACH tu quyet: con o trong thi cho ra san, het o
   thi cho xuong du bi. Truoc day quyet dinh nam trong handler con cai nut thi
   khong noi gi, nen nguoi dung chi biet app da lam gi SAU KHI no lam xong.
   Mot ham cho ca nhan lan hanh vi, de hai cai khong the noi khac nhau. */
function addTarget(slots) { return (slots || []).indexOf(null) >= 0 ? "pitch" : "bench"; }
const LINE_OF = { GK:"TM", CB:"HV", LB:"HV", RB:"HV", CDM:"TV", CM:"TV", LM:"TV", RM:"TV", CAM:"TV", LW:"TĐ", RW:"TĐ", ST:"TĐ" };
const POS_ALIAS = { CF:"ST", SS:"CAM", AM:"CAM", DM:"CDM",
  RM:"RW", LM:"LW",
  FB:"RB", WB:"RB", IWB:"RB", RWB:"RB", LWB:"LB",
  SW:"CB", KITCHEN:"" };
const LINE_TONE = { "TM":"#F79009", "HV":"#6990FF", "TV":"#C1D439", "TĐ":"#D16BF4" };
/* Ao thu mon. Khong lay tu LINE_TONE de sau nay doi ao gon khong lam doi mau
   nhan tuyen o cho khac trong app. */
const GK_KIT = "#1E6F3C";

/* Rut gon tien cho nhan cot bieu do: 5.025.000 -> "5,0tr". Chi dung o cho hep;
   moi cho khac trong app van in du so bang `this.money`. */
function shortVnd(v) {
  const n = Math.abs(Math.round(+v || 0));
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace(".", ",") + "tỷ";
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(".", ",") + "tr";
  if (n >= 1e3) return Math.round(n / 1e3) + "k";
  return String(n);
}

/* How badly a player is played out of position, 0 = natural. Lifted out of
   autoFill so the slot picker ranks people the same way the auto-XI does --
   two different rankings for "who fits here" is how a lineup screen starts
   contradicting itself. Takes a parsed {main, alt}, not a member. */
function fitCost(p, role) {
  const pm = p.main, alt = p.alt || [];
  if (!pm) return 7;
  if (LINE_OF[pm] === role) return 0;
  if (alt.some(x => LINE_OF[x] === role)) return 3;
  if (role === "TM" || pm === "GK") return 16;
  const order = ["TM", "HV", "TV", "TĐ"];
  return 4 + Math.abs(order.indexOf(LINE_OF[pm]) - order.indexOf(role)) * 3;
}
/* O TRONG NAO HOP NHAT voi mot nguoi. Truoc day nut "Vao san" luon lay
   `slots.indexOf(null)` -- o trong DAU TIEN -- nen dua mot trung ve vao khi o
   trong dau tien la tien dao thi anh ta dung o tien dao, roi app moi bao "lech
   tuyen" sau khi da lam. Chon o re nhat theo `fitCost`; bang nhau thi lay o
   dau (o dinh, khong nhay lung tung giua hai lan bam giong nhau).
   Tra -1 khi khong con o trong. */
/* CANH nao: trai, phai, hay giua.

   `fitCost` chi biet bon TUYEN (TM/HV/TV/TĐ), nen no coi LB va RB la mot. Hau qua
   do duoc: nut "Vao san" xep hau ve PHAI vao o TRAI va nguoc lai, tra ve "so
   truong", khong bao gi. Day cung la cho FM24 hon han -- no co vai + nhiem vu
   rieng cho tung o.

   Khong bia ca mot he vai kieu FM (doi phui khong ai dat "Ball-Winning Midfielder
   on Defend"). Chi them mot chieu MA NGUOI CHOI PHUI THAT SU NOI: trai hay phai. */
const SIDE_OF = { LB: "T", LM: "T", LW: "T", RB: "P", RM: "P", RW: "P" };
/* Gia doi canh. 0 = dung canh hoac o giua (khong co canh). 1 = nguoi chi biet da
   giua bi day ra bien -- kho chiu nhung lam duoc. 2 = dang chan trai xep sang
   canh phai, dung cai chan khong thuan.

   Co y NHE hon mot bac lech tuyen (`fitCost` tra 4+). Doi phui doi canh la
   chuyen thuong; xep hau ve vao hang tien dao moi la chuyen la. */
function sideCost(p, label) {
  const want = SIDE_OF[label];
  if (!want) return 0;
  const mine = [(p && p.main) || ""].concat((p && p.alt) || []).map(x => SIDE_OF[x]).filter(Boolean);
  if (!mine.length) return 1;
  return mine.indexOf(want) >= 0 ? 0 : 2;
}
/* Gia cua MOT O CU THE, khac `fitCost` chi biet tuyen. Dung o moi cho biet nhan
   that cua o ("LB", "RW"), con `fitCost` giu nguyen de moi assertion cu van dung. */
function fitCostAt(p, label) {
  return fitCost(p || {}, LINE_OF[label] || label) + sideCost(p || {}, label);
}
function bestFreeSlot(slots, roles, pos, labels) {
  const list = Array.isArray(slots) ? slots : [];
  const rs = Array.isArray(roles) ? roles : [];
  const ls = Array.isArray(labels) ? labels : null;
  let best = -1, bestCost = Infinity;
  for (let i = 0; i < list.length; i++) {
    if (list[i]) continue;
    // Co nhan that cua o thi tinh ca canh; khong co thi ve dung cach cu.
    const c = ls ? fitCostAt(pos || {}, ls[i]) : fitCost(pos || {}, rs[i]);
    if (c < bestCost) { bestCost = c; best = i; }
  }
  return best;
}
// FM shows familiarity in words, not a number. Three bands is all this data
// supports honestly -- there is no training history to earn six.
/* "Chưa ai điền vị trí cho anh ta" và "anh ta đang đá lệch tuyến" là hai chuyện khác
   nhau, dẫn tới hai hành động ngược nhau: một cái bảo đổi chỗ, cái kia bảo điền hồ sơ.
   fitCost trả 7 cho cả hai, và 14 trong 36 người của đội mẫu chưa có vị trí, nên màn
   hình báo động đỏ về thứ nó không biết cho 39% đội.

   Chỉ đổi cách gọi và cách đếm, KHÔNG đổi điểm: fitCost vẫn trả 7, nên autoFill và
   shortlist giữ nguyên thứ tự — một người chưa biết đá đâu vẫn là lựa chọn tệ hơn một
   người đúng sở trường. */
const FIT_UNKNOWN = 7;
function fitUnknown(p) { return !p.main; }

/* Số điện thoại là tài khoản đăng nhập, nên nó phải so bằng SỐ, không phải bằng
   chuỗi. Admin gõ "090 000 0123" vào form thành viên -- cách người Việt vẫn
   viết -- rồi chính người đó gõ "0900000123" ở màn đăng nhập, và app trả
   "Số này chưa thuộc đội nào", tức là bảo họ chưa có trong đội trong khi họ có.
   Chấm, gạch, ngoặc, khoảng trắng đều bị bỏ; +84/84 quy về 0 vì cùng một số. */
function phoneKey(v) {
  let d = String(v == null ? "" : v).replace(/\D+/g, "");
  if (d.slice(0, 2) === "84" && d.length > 9) d = "0" + d.slice(2);
  return d;
}
/* Mật khẩu từng nằm dạng thô trong `pw`. Chấp nhận được khi dữ liệu chỉ ở một
   máy. Từ lúc `pw` đi theo cloudBlob lên máy chủ thì không: ai có mã đội gọi
   team_pull một cái là đọc được mật khẩu cả đội.

   SHA-256 + muối riêng từng người. Không phải bcrypt — trình duyệt không có sẵn —
   nhưng nó chặn đúng cái đang xảy ra: đọc thẳng ra mật khẩu. */
function pwSalt() {
  const b = new Uint8Array(16);
  if (globalThis.crypto && globalThis.crypto.getRandomValues) globalThis.crypto.getRandomValues(b);
  else for (let i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256);
  return Array.from(b).map(x => x.toString(16).padStart(2, "0")).join("");
}

async function pwHash(pass, salt) {
  const c = globalThis.crypto && globalThis.crypto.subtle;
  if (!c) return null;                        // trang mở qua http hoặc file://
  const d = await c.digest("SHA-256", new TextEncoder().encode("dpfm:" + salt + ":" + pass));
  return Array.from(new Uint8Array(d)).map(x => x.toString(16).padStart(2, "0")).join("");
}

async function pwVerify(pass, rec) {
  if (!rec || !rec.salt || !rec.hash) return false;
  const h = await pwHash(pass, rec.salt);
  return !!h && h === rec.hash;
}
/* Người ta đá cho hai đội. Danh sách đội khoá theo `code`, bản mới đè lên bản cũ
   nhưng KHÔNG xoá trường cũ — chìa admin và chìa điểm danh phải sống sót qua mọi
   lần cập nhật, mất là mất quyền. Giữ nguyên thứ tự để màn chọn đội không nhảy. */
function teamListMerge(list, entry) {
  const out = (list || []).slice();
  const i = out.findIndex(x => x.code === entry.code);
  if (i >= 0) out[i] = { ...out[i], ...entry }; else out.push(entry);
  return out;
}
/* Xung đột: bản cũ gọi cloudPull rồi cloudPush, tức là **đè bản máy chủ lên
   việc mình vừa làm rồi đẩy chính bản đó ngược lên**. Đo được: đội trưởng sửa
   chỉ số một cầu thủ, đúng lúc có người vào đội, sửa đổi biến mất khỏi cả máy
   mình lẫn máy chủ.

   Cuộc đua thật ở đây chỉ có MỘT dạng: máy khác vừa nối thêm một người qua
   team_join. Nên hợp nhất đúng danh sách người — của mình thắng ở người trùng,
   người máy chủ có mà mình chưa có thì nối vào — còn lại giữ bản của mình.
   Đây KHÔNG phải merge tổng quát, và cố ý không phải: nó khớp đúng một cuộc đua
   đang tồn tại thật. Thêm đường ghi đồng thời mới thì phải xem lại chỗ này. */
function mergeMembers(mine, theirs) {
  const out = (mine || []).slice();
  const seen = new Set(out.map(m => phoneKey(m.phone) || String(m.id)));
  (theirs || []).forEach(m => {
    const k = phoneKey(m.phone) || String(m.id);
    if (!seen.has(k)) { out.push(m); seen.add(k); }
  });
  return out;
}
/* `teamId` tren moi nguoi la THUA trong mo hinh dam may: moi cuc team_state.data
   thuoc dung mot doi, nen ai nam trong cuc do la nguoi cua doi do. Loc theo
   teamId ben trong chinh cuc ay la tan du tu thoi mot trinh duyet giu nhieu doi
   chung mot kho -- thu ma dpfm-teams da thay the.

   Hau qua that: nguoi lech teamId BIEN MAT khoi giao dien, khong bao gi ca.
   joinTeam con bia ra `1` khi data.teams rong (doi vua tao chua kip day lan
   dau), tao ra nguoi vinh vien vo hinh. Dan lai luc keo ve: cuc nao thi doi ay. */
function adoptMembers(list, teamId) {
  return (list || []).map(m => (teamId === undefined ? m : { ...m, teamId: teamId }));
}
/* Thay người là MỘT việc, không phải hai. App chỉ có "ra sân · về dự bị" rồi
   "đưa vào ô" -- hai thao tác rời, và không chỗ nào ghi lại ai vào thay ai.
   Trận xong thì không ai nhớ được đã thay những ai. */
function subLog(list, s) {
  if (!s || !s.outName || !s.inName) return (list || []).slice();
  return (list || []).concat([{ text: s.inName + " vào thay " + s.outName + " · " + (s.at || "") }]);
}
/* Doi mot toa do man hinh thanh phan tram cua mat san.

   dc-mini ve lai CA CAY moi lan doi state, va vong keo 8 giay cung ve lai. Nen
   mot cu bam co the roi vao the da bi thay: getBoundingClientRect tra rong 0,
   phep chia ra Infinity, va "Infinity%" duoc GHI VAO KHO roi song qua tai lai.
   Do duoc that, khong phai lo xa.

   Khong huu han thi tra null (noi goi bo qua cu bam), va ep ve trong 0-100 vi
   SVG de overflow:visible nen mui ten lech se ve han ra ngoai san. */
function pitchPct(v, origin, size) {
  const p = (v - origin) / size * 100;
  if (!isFinite(p)) return null;
  return Math.round(Math.max(0, Math.min(100, p)) * 10) / 10;
}
/* Animation nhiều bước, đúng cách bảng chiến thuật của HLV làm (TacticalPad và
   các phần mềm cùng loại): mỗi bước là một ẢNH CHỤP vị trí, phát lại thì nội
   suy giữa hai bước liên tiếp.

   Khác hẳn "Chạy thử" đang có: cái đó chỉ là hai trạng thái SUY RA từ chỉ đạo
   (có bóng / mất bóng), HLV không dựng được. Cái này HLV tự đặt từng bước. */
function tweenPos(a, b, t) {
  const A = a || [], B = b || [], n = Math.min(A.length, B.length);
  const out = [];
  for (let i = 0; i < n; i++) {
    const ax = parseFloat(A[i][0]), ay = parseFloat(A[i][1]);
    const bx = parseFloat(B[i][0]), by = parseFloat(B[i][1]);
    out.push([
      (Math.round((ax + (bx - ax) * t) * 10) / 10) + "%",
      (Math.round((ay + (by - ay) * t) * 10) / 10) + "%"
    ]);
  }
  return out;
}

/* Mốc thời gian -> (đang ở đoạn nào, đi được bao nhiêu của đoạn đó). Hết thì
   dừng ở cuối đoạn cuối, không quay vòng: HLV muốn xem lại thì bấm phát lại. */
function playHead(ms, count, per) {
  const segs = Math.max(0, (count || 0) - 1);
  if (segs <= 0) return { i: 0, t: 0 };
  const k = Math.floor(ms / per);
  if (k >= segs) return { i: segs - 1, t: 1 };
  return { i: k, t: (ms - k * per) / per };
}
/* Điểm đánh giá SUY RA từ chỉ số, và hạng suy ra từ điểm.

   Trước đây ngược: `grp` (hạng) gõ tay trong form, `rating` suy từ hạng qua
   GRADE_RATING, còn 12 chỉ số thì không nuôi gì cả -- sửa cả buổi cũng không
   đổi được hạng của ai. Ba nguồn sự thật cho cùng một câu hỏi "người này giỏi
   cỡ nào", và hai trong ba nói dối.

   Bắt gôn tách riêng: cầu thủ sân bắt gôn tệ là chuyện bình thường, không được
   kéo điểm họ xuống; còn thủ môn thì tính bằng đúng những chỉ số của thủ môn. */
const RATE_GK = ["gk", "position", "spirit", "strength", "pace"];
const RATE_OUT = ["finish", "dribble", "pass", "shot", "defend", "header",
                  "position", "stamina", "pace", "strength", "spirit"];

function ratingOf(m) {
  const at = (m && m.attrs) || null;
  // Ban ghi cu chua co chi so: giu nguyen diem cu, dung de ho tu nhien tut hang.
  if (!at) return (m && isFinite(m.rating)) ? m.rating : 10;
  /* Vi tri phai doc theo dung cach ca app doc no: ban ghi moi co `posMain`, ban
     ghi cu chi co chuoi `pos` ("GK", "CB, LB"). Cho nay truoc day chi nhin
     `posMain`, nen mot thu mon luu kieu cu roi thang nhanh RATE_OUT -- diem cua
     anh ta bi keo xuong boi Tan cong / Re dat / Sut xa, bon chi so thu mon khong
     bao gio dung, con Bat gon 16 (chi so cao nhat doi) thi gan nhu khong tinh.
     Do duoc: thu mon la nguoi DUY NHAT trong 14 nguoi co diem hien thi THAP hon
     trung binh chi so cua chinh minh. Va diem nay con dieu khien Hang, thu tu
     bang xep hang, lan xep doi hinh tu dong. */
  const main = m.posMain !== undefined ? (m.posMain || "") : ((parsePos(m.pos) || {}).main || "");
  const keys = main === "GK" ? RATE_GK : RATE_OUT;
  // Chi so chua dat thi lay diem cu lam uoc luong, dung bo qua: bo qua nghia la
  // cham nguoi ta chi bang nua ho so da dien, va diem tut moi khi vua dien them.
  const fallback = isFinite(m.rating) ? m.rating : 10;
  let sum = 0;
  keys.forEach(k => { const v = parseFloat(at[k]); sum += isFinite(v) ? v : fallback; });
  return Math.round(sum / keys.length);
}

function gradeOf(r) {
  return r >= 17 ? "S" : r >= 15 ? "A" : r >= 13 ? "B" : r >= 11 ? "C" : "D";
}









/* Đếm những gì đã xảy ra, không đoán.

   Nhóm các trận theo một khóa (sơ đồ, cách đá) rồi đếm thắng-hoà-bại. Chỉ đọc được
   trận có ghi đội hình; trận lưu trước khi app bắt đầu ghi thì không có gì để nói.
   Dưới ba trận thì mọi tỉ lệ đều là nhiễu, nên nói thẳng "chưa đủ trận" thay vì in ra
   một con số phần trăm trông như kết luận. */
const INSIGHT_MIN = 3;
function tallyBy(games, keyOf, labelOf) {
  const by = {};
  games.forEach(g => {
    const k = keyOf(g);
    if (!k) return;
    const t = by[k] || (by[k] = { w: 0, d: 0, l: 0, n: 0 });
    t.n++;
    if (g.gf > g.ga) t.w++; else if (g.gf === g.ga) t.d++; else t.l++;
  });
  return Object.keys(by).sort((a, b) => by[b].n - by[a].n).map(k => {
    const t = by[k], enough = t.n >= INSIGHT_MIN, share = t.w / t.n;
    return {
      label: labelOf(k), n: t.n + " tr\u1eadn",
      record: t.w + "T " + t.d + "H " + t.l + "B",
      rate: enough ? Math.round(share * 100) + "% th\u1eafng" : "ch\u01b0a \u0111\u1ee7 tr\u1eadn",
      tone: !enough ? "rgba(250,250,255,0.5)"
        : (share >= 0.5 ? "#75CE50" : (share >= 0.34 ? "#F79009" : "#FF6B57"))
    };
  });
}
function fitLabel(cost, unknown, side) {
  if (unknown) return "chưa rõ vị trí";
  // Dung tuyen nhung sai canh la mot chuyen KHAC "da duoc" chung chung: no noi
  // ro phai sua gi (doi cho voi nguoi ben kia), nen no duoc ten rieng.
  if (side > 0 && cost - side === 0) return side >= 2 ? "lệch cánh" : "không thuận cánh";
  return cost === 0 ? "sở trường" : cost <= 3 ? "đá được" : "lệch tuyến";
}
function parsePos(str) {
  const raw = String(str || "").toUpperCase().split(/[^A-Z]+/).filter(Boolean);
  const codes = [];
  raw.forEach(t => {
    const v = POS_ALIAS[t] !== undefined ? POS_ALIAS[t] : t;
    if (v && POS_CODES.indexOf(v) >= 0 && codes.indexOf(v) < 0) codes.push(v);
  });
  return { main: codes[0] || "", alt: codes.slice(1, 3) };
}
/* Mot o vi tri bam vong ba trang thai.

   Nguoi da phui hiem khi chi da mot vi tri -- hau ve canh phai hom nay, tien ve
   hom sau vi thieu nguoi. Luoi o man ho so truoc day chi dat duoc `posMain`,
   nen ho so ghi "CAM" trong khi thuc te anh ta da ca CAM lan CM, va sa ban thi
   bao "lech tuyen" oan. Form them/sua da co o phu tu lau; rieng cho nay bo quen.

   chua chon -> so truong -> da duoc -> bo. Mot o mot cu bam, khong can luoi thu
   hai. Doi so truong sang o khac thi so truong cu tu dong xuong lam da duoc --
   khong ai bam vao mot vi tri de LAM MAT vi tri khac.

   Khong chan cung so vi tri "da duoc": doi phui thieu nguoi thi mot nguoi da ba
   bon cho la chuyen thuong. `parsePos` cat con hai khi doc chuoi cu, nhung day
   la duong ghi moi va no giu du. */
function posCycle(cur, code) {
  const p = cur || {};
  const main = String(p.main || "");
  const alt = (Array.isArray(p.alt) ? p.alt : []).filter(Boolean);
  if (POS_CODES.indexOf(code) < 0) return { main: main, alt: alt.slice() };
  const at = alt.indexOf(code);
  if (main === code) return { main: "", alt: [code].concat(alt) };      // so truong -> da duoc
  if (at >= 0) {
    const rest = alt.slice(); rest.splice(at, 1);
    return { main: main, alt: rest };
  }
  // Chua chon o nay: vao so truong neu cho do trong, khong thi vao da duoc
  return main ? { main: main, alt: alt.concat([code]) } : { main: code, alt: alt.slice() };
}
/* Ban ghi cu luu vi tri thanh chuoi `pos`, va nhieu cho van doc chuoi do.
   Ghi lai bang dang `parsePos` doc nguoc lai duoc, de hai duong khong lech. */
function posToText(p) {
  const q = p || {};
  return [String(q.main || "")].concat(Array.isArray(q.alt) ? q.alt : [])
    .filter(Boolean).join(", ");
}
// Cau bao noi ra trang thai VUA doi thanh. Bao trang thai cu la bao sai.
function posCycleSay(name, code, nx) {
  const n = String(name || "");
  if (nx && nx.main === code) return n + " đá sở trường " + code + ".";
  if (nx && (nx.alt || []).indexOf(code) >= 0) return n + " đá được " + code + ".";
  return "Đã bỏ " + code + " khỏi vị trí của " + n + ".";
}
/* Anh ho so: o vuong nho, cat ngay luc luu.

   Truoc day o anh la <image-slot>, mot khung mau chep tu cong cu thiet ke. Tai
   lieu cua chinh no viet "ngoai moi truong omelette, o nay chi doc": no ghi vao
   mot tep .image-slots.state.json canh trang HTML qua mot cau noi khong ton tai
   trong app that. Nen anh KHONG BAO GIO luu duoc, va loi 404 cua tep do nam
   trong console suot ma ai cung tuong la vo hai.

   256px chu khong phai 1280 nhu anh nen: 36 nguoi x 250KB la 9MB, vuot han han
   muc ~5MB cua localStorage. 256px q0.72 roi vao 12-20KB, ca doi duoi 1MB. */
const PHOTO_PX = 256;

/* Cat vuong: tra ve o nguon tren anh goc.
   zoom 1 = canh ngan vua khit. ox/oy trong -1..1, 0 la giua.
   Khong bao gio tra ve o loi ra ngoai anh -- canvas ve o ngoai bien ra vien den. */
function cropBox(w, h, zoom, ox, oy) {
  const W = Math.max(0, Number(w) || 0), H = Math.max(0, Number(h) || 0);
  if (!W || !H) return { sx: 0, sy: 0, sw: 0, sh: 0 };
  let z = Number(zoom);
  if (!isFinite(z) || z < 1) z = 1;
  const side = Math.max(1, Math.min(W, H) / z);
  const freeX = W - side, freeY = H - side;
  const clamp = (v) => Math.max(-1, Math.min(1, isFinite(Number(v)) ? Number(v) : 0));
  return {
    sx: freeX / 2 * (1 + clamp(ox)),
    sy: freeY / 2 * (1 + clamp(oy)),
    sw: side, sh: side
  };
}
// Doc tep -> anh goc con nguyen trong bo nho, kem kich thuoc that. Giu anh goc
// de con keo qua keo lai; chi luc bam Luu moi nuong xuong o vuong nho.
function readImage(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error("read"));
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode"));
      img.onload = () => resolve({ url: fr.result, w: img.width, h: img.height });
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}
/* Nuong zoom va vi tri vao anh, tra ve o vuong PHOTO_PX. Khong luu kem thong so
   cat: moi cho hien anh chi viec ve, va kho chi chua o vuong nho thay vi anh goc. */
function cropFromUrl(url, zoom, ox, oy) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error("decode"));
    img.onload = () => {
      const b = cropBox(img.width, img.height, zoom, ox, oy);
      if (!b.sw) return reject(new Error("empty"));
      const c = document.createElement("canvas");
      c.width = c.height = PHOTO_PX;
      c.getContext("2d").drawImage(img, b.sx, b.sy, b.sw, b.sh, 0, 0, PHOTO_PX, PHOTO_PX);
      resolve(c.toDataURL("image/jpeg", 0.72));
    };
    img.src = url;
  });
}
/* Ghi tran bang SU KIEN, khong phai bang mot bo o thang co san.

   Ban cu co dung hai o "nguoi ghi ban", mot o kien tao, mot the vang, mot the
   do, mot MVP. Tran nao khac cai khuon do la khong ghi noi: ba nguoi ghi ban,
   hai the vang, hay mot nguoi vua ghi ban vua an the. Va khong cho nao ghi
   duoc PHUT -- "Anh Trung ghi phut 90" thi app chi nho duoc "Anh Trung ghi".

   Mot su kien = mot nguoi + mot loai + (phut, khong bat buoc). Doi phui hay
   quen phut; quen phut khong duoc mat ca ban thang. */
const EV_KINDS = [
  ["goal",   "Bàn thắng"],
  ["assist", "Kiến tạo"],
  ["yellow", "Thẻ vàng"],
  ["red",    "Thẻ đỏ"],
  ["og",     "Phản lưới"],
  ["mvp",    "Hay nhất trận"]
];
const EV_FIELD = { goal: "goals", assist: "assists", yellow: "y", red: "r", og: "og", mvp: "mvp" };
function evLabel(kind) {
  const r = EV_KINDS.find(k => k[0] === kind);
  return r ? r[1] : String(kind || "Sự kiện");
}
// Cong don theo tung nguoi. Khoa la id nguoi, gia tri la cac cot cong.
function evTally(events) {
  const out = {};
  (Array.isArray(events) ? events : []).forEach(e => {
    if (!e) return;
    const who = e.who, f = EV_FIELD[e.kind];
    if (who === undefined || who === null || who === "" || !f) return;
    if (!out[who]) out[who] = { goals: 0, assists: 0, y: 0, r: 0, og: 0, mvp: 0 };
    out[who][f] += 1;
  });
  return out;
}
/* Ngay cua tran, do nguoi go.

   Truoc day app tu dong dau ngay cua BUOI KE TIEP trong lich. Doi phui hay ghi
   ket qua vai hom sau khi da, nen ban ghi mang ngay MAI cho mot tran da hom
   qua -- va nhin vao khong co dau hieu gi la sai.

   Nhan "5/9", "05/09", "5/9/2026". Go bay hoac ngay khong co that thi lay hom
   nay: doan bua mot ngay khac la bia them mot sai lam thu hai. */
/* Ngay cua mot tran. Truoc day ham nay CAT NAM di va chi tra "5/9" -- co y, va
   day la cai gia: `clubTimeline` sap xep bang `dd/mm/yyyy`, nen moi tran ghi qua
   o nay deu ra `ord = -1` va roi xuong day dong thoi gian, con o "nam" thi trong.
   Ket qua la mot dong thoi gian treo nhan "moi nhat tren cung" nhung khong biet
   tran nao truoc tran nao. Giu lai nam: go co nam thi dung nam do, khong thi lay
   nam cua hom nay. Bo kiem thu cu khang dinh hanh vi cat nam -- do la khang dinh
   mot khiem khuyet, nen no doi theo. */
function matchDay(input, today) {
  const t = today instanceof Date ? today : new Date();
  const fallback = t.getDate() + "/" + (t.getMonth() + 1) + "/" + t.getFullYear();
  const m = /^(\d{1,2})\s*[\/\-.]\s*(\d{1,2})(?:\s*[\/\-.]\s*(\d{2,4}))?$/.exec(String(input || "").trim());
  if (!m) return fallback;
  const d = Number(m[1]), mo = Number(m[2]);
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return fallback;
  let y = m[3] ? Number(m[3]) : t.getFullYear();
  if (m[3] && String(m[3]).length === 2) y = 2000 + y;
  if (!isFinite(y) || y < 1900 || y > 2999) y = t.getFullYear();
  return d + "/" + mo + "/" + y;
}
/* Ai thuc su da da tran nay.

   App tung dem "tran da da" CHI theo diem danh. Nen mot tran ghi bang su kien
   ma khong ai bam "Di" cho ra ho so noi "ghi 2 ban trong 0 tran" -- app tu
   mau thuan voi chinh no ngay tren mot man hinh. Neu app biet Trung ghi ban
   thi no biet Trung co mat. */
function playedIds(goers, events, xi) {
  const out = [];
  const seen = {};
  const add = v => {
    const n = parseInt(v, 10);
    if (!isFinite(n) || seen[n]) return;
    seen[n] = 1; out.push(n);
  };
  (Array.isArray(goers) ? goers : []).forEach(add);
  (Array.isArray(events) ? events : []).forEach(e => { if (e) add(e.who); });
  /* Va doi hinh da chinh cua chinh tran do. Cung mot le voi su kien: mot tran
     luu kem doi hinh bay nguoi ma chi mot nguoi bam "Di" thi ho so sau nay noi
     sau nguoi kia "da chinh" trong mot tran ho khong duoc tinh co mat va khong
     phai dong tien san. Do la so sach lech, khong phai so sach chat che. */
  (Array.isArray(xi) ? xi : []).forEach(add);
  return out;
}
/* Xep theo phut de doc thanh dong thoi gian. Khong ghi phut thi xuong cuoi --
   chu khong phai coi nhu phut 0, vi phut 0 la mot khang dinh sai. */
function evSort(events) {
  return (Array.isArray(events) ? events : []).filter(Boolean).slice().sort((a2, b) => {
    const ma = Number(a2.min), mb = Number(b.min);
    const oka = isFinite(ma), okb = isFinite(mb);
    if (oka !== okb) return oka ? -1 : 1;
    return oka ? ma - mb : 0;
  });
}
// ISO date -> the d/m form the rest of the app uses (T4 2/9, 28/8).
function dmy(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  return m ? (Number(m[3]) + "/" + Number(m[2])) : String(iso || "");
}

// Fit a stored lineup to the current formation's slot count. Pads with empty
// slots, and drops anything past the end so those players return to the pool
// instead of sitting in a slot the pitch no longer draws.
function fitSlots(arr, n) {
  const out = (arr || []).slice(0, n);
  while (out.length < n) out.push(null);
  return out;
}
/* Positions are generated, not typed.

   FM's tactic pitch is a grid: every position is a (stratum, channel) pair --
   six depth bands from the keeper to the strikers, and a spread across the
   width. Eleven hand-typed coordinate lists is how you end up with a keeper
   standing outside his own penalty area in three formations, a back three at
   three different depths, and full-backs narrower than the box. All of that was
   real and `node pitch-check.js` had 38 failures.

   Depth is anchored to actual pitch geometry, measured from our goal line at
   100: the penalty area line sits at 84.3, halfway at 50, theirs at 15.7.
   So the keeper stands inside his box, the back line defends the edge of it,
   and strikers sit just outside the opposition area -- where FM draws them. */
const BAND = { GK: 92, DEF: 79, DM: 65, MID: 52, AM: 37, ATT: 22 };

// Half-width of a line, in % of the pitch. A line holding a flank player
// (LB/RB/LM/RM/LW/RW) reaches for the touchline; a line of central players
// stays inside the width of the penalty area.
const BAND_WIDE   = { GK: 0, DEF: 38, DM: 32, MID: 36, AM: 32, ATT: 32 };
const BAND_NARROW = { GK: 0, DEF: 20, DM: 14, MID: 22, AM: 16, ATT: 12 };
// Fewer players cover the same drawn pitch in 5s and 7s, so pull the flanks in
// rather than leaving two defenders stranded on opposite touchlines.
const SIZE_SPREAD = { "5": 0.78, "7": 0.9, "11": 1 };
const IS_FLANK = /^(LB|RB|LM|RM|LW|RW)$/;

// Formations as FM states them: a stack of lines, each a band and its players,
// front of the pitch last.
const FORMATION_SPEC = {
  "5": {
    "1-2-2":   [["GK", ["GK"]], ["DEF", ["LB", "RB"]], ["ATT", ["LW", "RW"]]],
    "1-1-2-1": [["GK", ["GK"]], ["DEF", ["CB"]], ["MID", ["CM", "CM"]], ["ATT", ["ST"]]],
    "1-3-1":   [["GK", ["GK"]], ["DEF", ["LB", "CB", "RB"]], ["ATT", ["ST"]]]
  },
  "7": {
    "1-2-3-1": [["GK", ["GK"]], ["DEF", ["LB", "RB"]], ["MID", ["CM", "CM", "CM"]], ["ATT", ["ST"]]],
    "1-3-2-1": [["GK", ["GK"]], ["DEF", ["LB", "CB", "RB"]], ["MID", ["CM", "CM"]], ["ATT", ["ST"]]],
    "1-2-2-2": [["GK", ["GK"]], ["DEF", ["LB", "RB"]], ["MID", ["CM", "CM"]], ["ATT", ["ST", "ST"]]],
    "1-3-1-2": [["GK", ["GK"]], ["DEF", ["LB", "CB", "RB"]], ["DM", ["CDM"]], ["ATT", ["ST", "ST"]]],
    "1-4-1-1": [["GK", ["GK"]], ["DEF", ["LB", "CB", "CB", "RB"]], ["MID", ["CM"]], ["ATT", ["ST"]]]
  },
  "11": {
    "4-4-2":   [["GK", ["GK"]], ["DEF", ["LB", "CB", "CB", "RB"]], ["MID", ["LM", "CM", "CM", "RM"]], ["ATT", ["ST", "ST"]]],
    "4-3-3":   [["GK", ["GK"]], ["DEF", ["LB", "CB", "CB", "RB"]], ["DM", ["CDM"]], ["MID", ["CM", "CM"]], ["ATT", ["LW", "ST", "RW"]]],
    "3-5-2":   [["GK", ["GK"]], ["DEF", ["CB", "CB", "CB"]], ["MID", ["LM", "CM", "CM", "CM", "RM"]], ["ATT", ["ST", "ST"]]],
    "4-2-3-1": [["GK", ["GK"]], ["DEF", ["LB", "CB", "CB", "RB"]], ["DM", ["CDM", "CDM"]], ["AM", ["LW", "CAM", "RW"]], ["ATT", ["ST"]]],
    // Ba hinh duoi day gan nhu chi dung o pha mat bong. Khai chung mot cho voi
    // cac so do khac vi chung LA so do -- buildFormation khong can biet khac biet.
    "4-1-4-1": [["GK", ["GK"]], ["DEF", ["LB", "CB", "CB", "RB"]], ["DM", ["CDM"]], ["MID", ["LM", "CM", "CM", "RM"]], ["ATT", ["ST"]]],
    "4-4-1-1": [["GK", ["GK"]], ["DEF", ["LB", "CB", "CB", "RB"]], ["MID", ["LM", "CM", "CM", "RM"]], ["AM", ["CAM"]], ["ATT", ["ST"]]],
    "5-3-2":   [["GK", ["GK"]], ["DEF", ["LB", "CB", "CB", "CB", "RB"]], ["MID", ["CM", "CM", "CM"]], ["ATT", ["ST", "ST"]]]
  }
};

function buildFormation(size, spec) {
  const labels = [], pos = [];
  spec.forEach(([band, line]) => {
    const hw = (line.some(l => IS_FLANK.test(l)) ? BAND_WIDE : BAND_NARROW)[band] * SIZE_SPREAD[size];
    line.forEach((l, i) => {
      labels.push(l);
      pos.push([(line.length === 1 ? 50 : 50 - hw + i * (2 * hw) / (line.length - 1)).toFixed(1) + "%",
                BAND[band] + "%"]);
    });
  });
  return { labels: labels, pos: pos };
}

const SIZE_FORMATIONS = Object.keys(FORMATION_SPEC).reduce((out, size) => {
  out[size] = Object.keys(FORMATION_SPEC[size]).reduce((f, name) => {
    f[name] = buildFormation(size, FORMATION_SPEC[size][name]);
    return f;
  }, {});
  return out;
}, {});
/* Hinh luc mat bong.

   FM26 khong bat nguoi dung ve hai so do roi tu noi o nay voi o kia. No cho CHON
   trong vai hinh goi y san, va ban do "ai sang o nao" nam san trong tung cap:
   "a team using a 4-3-3 with the ball might be guided towards a 4-1-4-1 off the
   ball". Nen day la DU LIEU, khong phai thuat toan anh xa tong quat -- dung cai
   thu hai la cach chac chan lam sai o truong hop thu vi nhat.

   `map[i]` = cho dung o hinh mat bong cua nguoi dang o o thu `i` cua hinh co bong.
   `map` de null nghia la giu nguyen hinh. Hai hinh BAT BUOC cung so nguoi. */
const OOP_SPEC = {
  "5": {
    // San 5 khong doi hinh khi mat bong -- ca doi lui ca khoi, het. Co y de trong.
  },
  "7": {
    "1-2-3-1": [["1-4-1-1", [0, 1, 4, 2, 5, 3, 6]]],
    "1-3-2-1": [["1-4-1-1", [0, 1, 2, 4, 3, 5, 6]]],
    "1-2-2-2": [["1-2-3-1", null]],
    "1-3-1-2": [["1-3-2-1", null]]
  },
  "11": {
    "4-3-3":   [["4-1-4-1", [0, 1, 2, 3, 4, 5, 7, 8, 6, 10, 9]]],
    "3-5-2":   [["5-3-2",   [0, 2, 3, 4, 1, 6, 7, 8, 5, 9, 10]]],
    "4-2-3-1": [["4-4-1-1", [0, 1, 2, 3, 4, 6, 7, 5, 9, 8, 10]]],
    "4-4-2":   [["4-4-1-1", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]]]
  }
};
// Nhung hinh mat bong duoc phep chon cho mot so do, ke ca "giu nguyen".
function oopChoices(size, formation) {
  return [["", "Giữ nguyên"]].concat(
    ((OOP_SPEC[size] || {})[formation] || []).map(o => [o[0], o[0]]));
}
// Hinh goc cua mot pha, DA sap lai theo thu tu o cua so do co bong -- nen moi
// thu khac trong app (slots, chi dao tung o, thay nguoi) khong phai biet gi ca.
function phaseBase(size, formation, formationOff, phase) {
  const ip = (SIZE_FORMATIONS[size] || {})[formation];
  if (!ip) return null;
  if (phase !== "off" || !formationOff) return ip.pos.slice();
  const pair = ((OOP_SPEC[size] || {})[formation] || []).find(o => o[0] === formationOff);
  const off = (SIZE_FORMATIONS[size] || {})[formationOff];
  // Cap khong khai, hinh khong ton tai, hoac lech so nguoi -> ve hinh co bong.
  // Fail-closed: ve sai hinh te hon nhieu so voi khong doi hinh.
  if (!pair || !off || off.pos.length !== ip.pos.length) return ip.pos.slice();
  const map = pair[1];
  if (!map) return off.pos.slice();
  return ip.pos.map((_, i) => off.pos[map[i]] || ip.pos[i]);
}

function defaultTactic() {
  return { id: 1, name: "Sân 7 · cân bằng", size: "7", formation: "1-2-3-1", mentality: "bal",
    ins: {}, slots: {}, isDefault: true };
}
const SIZE_RATIO = { "5": "1 / 1.6", "7": "3 / 4", "11": "1 / 1.55" };
const ROLE_GROUP = { GK:"gk", CB:"cb", LB:"fb", RB:"fb", CDM:"mid", CM:"mid", CAM:"mid", LW:"fw", RW:"fw", ST:"fw" };
/* O nao GIU duoc chi dao ca nhan khi doi so do -- cau 74 cua ban kiem.

   Chi dao ca nhan gan theo SO O, ma so o doi nghia khi doi so do: o 3 cua
   1-2-3-1 la tien ve, o 3 cua 1-3-2-1 la hau ve. Vai tro luu cho o do thuoc
   nhom cu, doc len bang nhom moi thi `splitLegacyRole` tra rong va o LANG LE
   ve mac dinh -- nguoi dat chi dao khong duoc bao gi, con ban ghi cu van nam
   lai va SONG DAY neu doi so do nguoc ve. Cac khoa vai tro khong trung nhau
   giua cac nhom nen no khong bao gio ap nham mot vai tro khac, chi mat.

   Tra ve mot mang boolean theo tung o cua so do MOI: true = cung tuyen o ca
   hai so do, giu duoc; false = da doi tuyen, phai bo va phai noi ra. */
function slotKeeps(sizeA, formA, sizeB, formB) {
  const grp = (s, f) => ((((SIZE_FORMATIONS[s] || {})[f]) || { labels: [] }).labels)
    .map(l => ROLE_GROUP[l] || "mid");
  const a = grp(sizeA, formA), b = grp(sizeB, formB);
  return b.map((g, i) => g === a[i]);
}
/* Role carries its own posture. FM26 dropped the separate Support/Attack/Defend
   duty because Role + Duty was two controls saying one thing, and this app had
   the same collision: a full-back could be "Dâng biên" and "Thủ" at once. The
   fourth field is what the role already implies, and it still paints the dot on
   the tactics pitch -- one control, same information. */
/* Vai tro tach lam hai bo, mot cho moi pha -- dung cach FM26 lam: moi cau thu
   co mot vai tro luc co bong va mot luc mat bong.

   Truoc day mot vai tro phai ganh ca hai pha, nen "Kem chat" va "Boc lot" --
   hai viec NGUOC nhau -- cung ra tu the `def` va ve ra dung mot cho dung. Do la
   cau 52 trong ban kiem: hai lua chon khac nhau, mot ket qua. FM26 goi hai cai
   nay la Stopper ("step out to hassle and engage opposition attackers") va Cover
   ("hold their line and wait to react") -- va chung dung o hai cho khac han.

   Moi vai tro: [khoa, nhan, giai thich, tu the, dx, dy]
     dx  duong = ra bien,  am = vao trong
     dy  duong = lui sau,  am = dang len
   Don vi la % mat san, cong thang vao vi tri goc cua o. */
const ROLES = {
  gk: [["keep","B\u1eaft b\u00f3ng","\u0110\u1ee9ng g\u1ea7n v\u1ea1ch, t\u1eadp trung c\u1ea3n ph\u00e1.","def", 0, 0],
       ["distrib","Ph\u00e1t \u0111\u1ed9ng","Gi\u1eef b\u00f3ng, m\u1edf cho h\u1eadu v\u1ec7 d\u00e2ng l\u00ean.","bal", 0, -3]],
  cb: [["build","C\u1ea7m b\u00f3ng l\u00ean","Chuy\u1ec1n ng\u1eafn, \u0111\u01b0a b\u00f3ng qua tuy\u1ebfn \u0111\u1ea7u.","bal", 0, -2],
       ["step","D\u00e2ng l\u00ean tham gia","C\u1ea7m b\u00f3ng qua v\u1ea1ch gi\u1eefa s\u00e2n.","att", 0, -9],
       ["stay","\u0110\u1ee9ng nh\u00e0","Kh\u00f4ng d\u00e2ng, ch\u1edd b\u00f3ng v\u1ec1.","def", 0, 2]],
  fb: [["safe","Th\u1ee7 ch\u1eafc","Kh\u00f4ng d\u00e2ng qu\u00e1 n\u1eeda s\u00e2n.","def", 1, 1],
       ["updown","L\u00ean xu\u1ed1ng","L\u00ean khi c\u00f3 b\u00f3ng, v\u1ec1 ngay khi m\u1ea5t.","bal", 3, -7],
       ["wide","D\u00e2ng bi\u00ean","B\u00e1m bi\u00ean cao, t\u1ea1t v\u00e0o trong.","att", 7, -15],
       ["invert","B\u00f3 v\u00e0o gi\u1eefa","V\u00e0o trong \u0111\u00e1 nh\u01b0 ti\u1ec1n v\u1ec7.","bal", -13, -8]],
  mid: [["box","Bao s\u00e2n","Ch\u1ea1y c\u1ea3 hai chi\u1ec1u.","bal", 0, -2],
        ["hold","Gi\u1eef nh\u1ecbp","\u0110\u1ee9ng tr\u01b0\u1edbc h\u1eadu v\u1ec7, lu\u00e2n chuy\u1ec3n ng\u1eafn.","def", 0, 5],
        ["push","D\u00e2ng cao","X\u00e2m nh\u1eadp v\u00f2ng c\u1ea5m, ch\u1edd b\u00f3ng hai.","att", 0, -12]],
  fw: [["target","C\u1eafm","\u0110\u1ee9ng cao nh\u1ea5t, t\u00ec \u0111\u00e8 gi\u1eef b\u00f3ng.","bal", 0, -3],
       ["drop","L\u00f9i nh\u1eadn b\u00f3ng","L\u00f9i ra gi\u1eefa s\u00e2n nh\u1eadn b\u00f3ng r\u1ed3i xoay ng\u01b0\u1eddi.","bal", 0, 10],
       ["run","Ch\u1ea1y ch\u1ed7","Ch\u1ea1y sau l\u01b0ng h\u1eadu v\u1ec7 \u0111\u1ed1i ph\u01b0\u01a1ng.","att", 0, -7],
       ["wideout","D\u1ea1t bi\u00ean","K\u00e9o h\u1eadu v\u1ec7 \u0111\u1ed1i ph\u01b0\u01a1ng ra bi\u00ean.","att", 12, 1]]
};
const ROLES_OOP = {
  gk: [["line","Gi\u1eef v\u1ea1ch","\u1ede trong v\u00f2ng c\u1ea5m, kh\u00f4ng ra.","bal", 0, 0],
       ["sweep","Qu\u00e9t b\u00f3ng","D\u00e1m ra d\u1ecdn b\u00f3ng d\u00e0i sau l\u01b0ng h\u1eadu v\u1ec7.","att", 0, -7]],
  cb: [["holdline","Gi\u1eef tuy\u1ebfn","\u0110\u1ee9ng \u0111\u00fang h\u00e0ng, kh\u00f4ng b\u01b0\u1edbc ra.","bal", 0, 0],
       ["tight","K\u00e8m ch\u1eb7t","B\u00e1m 1 k\u00e8m 1, theo ng\u01b0\u1eddi ra kh\u1ecfi v\u1ecb tr\u00ed.","att", 0, -8],
       ["cover","B\u1ecdc l\u00f3t","\u0110\u1ee9ng sau \u0111\u1ed3ng \u0111\u1ed9i, ch\u00e1m ch\u1ed7 khi b\u1ecb qua.","def", 0, 7]],
  fb: [["block","B\u1ecbt bi\u00ean","\u1ede l\u1ea1i bi\u00ean, kh\u00f4ng cho t\u1ea1t.","bal", 0, 0],
       ["tuck","Thu v\u00e0o trong","V\u00e0o gi\u1eefa th\u00e0nh h\u00e0ng b\u1ed1n, b\u1ecf bi\u00ean.","def", -10, 5],
       ["jump","D\u00e2ng \u0111\u00e8 bi\u00ean","Lao l\u00ean \u00e1p s\u00e1t ng\u01b0\u1eddi c\u1ea7m b\u00f3ng.","att", 4, -10]],
  mid: [["shape","Gi\u1eef kh\u1ed1i","\u0110\u1ee9ng \u0111\u00fang c\u1ef1 ly, kh\u00f4ng \u0111u\u1ed5i.","bal", 0, 0],
        ["press","V\u00e2y b\u00f3ng","Lao v\u00e0o ng\u01b0\u1eddi c\u1ea7m b\u00f3ng.","att", 0, -11],
        ["screen","Ch\u1eafn tr\u01b0\u1edbc h\u1eadu v\u1ec7","B\u1ecbt \u0111\u01b0\u1eddng chuy\u1ec1n v\u00e0o gi\u1eefa.","def", 0, 7]],
  fw: [["cut","Ch\u1eb7n m\u1ed9t h\u01b0\u1edbng","\u0110\u1ee9ng che, \u00e9p h\u1ecd \u0111\u00e1 v\u1ec1 m\u1ed9t b\u00ean.","bal", 0, 0],
       ["chase","\u0110u\u1ed5i t\u1eeb tr\u00ean","\u00c1p s\u00e1t h\u1eadu v\u1ec7 \u0111\u1ed1i ph\u01b0\u01a1ng.","att", 0, -6],
       ["fallback","L\u00f9i v\u1ec1 kh\u1ed1i","V\u1ec1 \u0111\u1ee9ng c\u00f9ng tuy\u1ebfn gi\u1eefa.","def", 0, 15]]
};
// Bo vai tro cua mot pha. Mot cho tra loi, nen khong noi nao trong app phai
// nho pha nao dung bang nao.
function rolesFor(phase) { return phase === "off" ? ROLES_OOP : ROLES; }
// Ban ghi cu chi co MOT vai tro cho ca hai pha. Khoa nao thuoc ve pha nao thi
// tra ve dung pha do; khong doan, khong di tru du lieu.
function splitLegacyRole(group, key) {
  const ip = (ROLES[group] || []).some(r => r[0] === key);
  const oop = (ROLES_OOP[group] || []).some(r => r[0] === key);
  return { role: ip ? key : "", roleOff: (!ip && oop) ? key : "" };
}
// Do lech cua mot vai tro, tinh bang % mat san. Vai tro la khong biet -> 0,
// chu khong phai nem loi: du lieu cu co the mang khoa da bi doi ten.
function roleShift(group, phase, key) {
  const r = (rolesFor(phase)[group] || []).find(x => x[0] === key);
  return r ? [r[4] || 0, r[5] || 0] : [0, 0];
}
/* Mau cua NHIEM VU (thu / can bang / cong). Truoc day no la do #EC2E1A va cam
   #F79009 -- dung hai mau ma chu thich duoi san Doi hinh khai la "do = lech
   tuyen, cam = da duoc". Cung mot bang mau, hai nghia trai nguoc, va bang Chien
   thuat khong he co chu thich: mot trung ve dung dung tuyen van hien cham DO o
   day, doc thanh "nguoi nay dang da sai cho" trong khi thanh tren ghi LECH
   TUYEN 0. Doi sang xanh duong (thu) / hong (cong) -- hai mau app chua dung cho
   canh bao nao. */
const DUTIES = [["def","Thủ","#6990FF"],["bal","Cân bằng","rgba(250,250,255,0.6)"],["att","Công","#D16BF4"]];
// Posture of a role, for the dot on the tactics pitch.
function roleDuty(group, key, phase) {
  const set = phase ? rolesFor(phase) : ROLES;
  const r = (set[group] || []).find(x => x[0] === key)
    || (!phase && (ROLES_OOP[group] || []).find(x => x[0] === key));
  return (r && r[3]) || "bal";
}
const EXTRAS = [["wide","Dâng biên"],["free","Đá tự do"],["man","Kèm người"]];

/* Team instructions, grouped the way FM26 groups them: what you do with the
   ball, what you do the second it changes hands, what you do without it. The
   transition row is new -- in a kích about it decides more games than anything
   else on this screen, and the app had no way to say it. */
const INS_PHASES = [
  { key: "on", label: "CÓ BÓNG", rows: [
    { key: "tempo", label: "Nhịp độ", opts: [["slow","Chậm","Giữ bóng, chờ khoảng trống mở ra."],["mid","Vừa","Luân chuyển bình thường."],["fast","Nhanh","Đẩy bóng lên sớm, ít chạm."]] },
    { key: "width", label: "Chơi rộng", opts: [["narrow","Hẹp","Dồn vào trong, đá phối hợp ngắn."],["mid","Vừa","Giữ cự ly bình thường."],["wide","Rộng","Kéo ra hai biên, kéo giãn đối phương."]] }
  ] },
  { key: "trans", label: "CHUYỂN TRẠNG THÁI", rows: [
    { key: "onLoss", label: "Vừa mất bóng", opts: [["counter","Vây lại ngay","Đoạt lại trong 5 giây đầu, rủi ro nếu hết hơi."],["drop","Lùi về đội hình","Bỏ bóng, về đứng đúng vị trí trước."]] },
    { key: "onWin", label: "Vừa cướp được", opts: [["direct","Đánh nhanh","Chuyền thắng lên trước khi họ về kịp."],["keep","Giữ bóng","Hạ nhịp, kéo đội hình lên cùng."]] }
  ] },
  { key: "off", label: "MẤT BÓNG", rows: [
    { key: "line", label: "Dâng cao", opts: [["low","Thấp","Lùi sâu, khó bị bóng dài qua đầu."],["mid","Vừa","Giữ quanh giữa sân."],["high","Cao","Bắt việt vị, nhưng hở lưng."]] },
    { key: "press", label: "Áp sát", opts: [["low","Ít","Đứng khối, đỡ tốn sức."],["mid","Vừa","Áp sát từ giữa sân."],["high","Nhiều","Đuổi từ sân đối phương, rất tốn sức."]] },
    { key: "mark", label: "Cách kèm", opts: [["zone","Khu vực","Mỗi người giữ một vùng."],["man","Kèm người","Mỗi người bám một người, theo tậy sân."]] }
  ] }
];
const INS_ROWS = INS_PHASES.reduce((a, p) => a.concat(p.rows), []);

/* Cách đá is supposed to move everything else. It did not: it changed a word and
   nothing more. Now it sets the default for every instruction, and an
   instruction the captain touched keeps its own value and says so -- the same
   inherited-vs-overridden state FM shows. */
const MENTALITY_INS = {
  def: { tempo: "slow", width: "narrow", onLoss: "drop",    onWin: "keep",   line: "low",  press: "low",  mark: "zone" },
  bal: { tempo: "mid",  width: "mid",    onLoss: "drop",    onWin: "direct", line: "mid",  press: "mid",  mark: "zone" },
  att: { tempo: "fast", width: "wide",   onLoss: "counter", onWin: "direct", line: "high", press: "high", mark: "zone" }
};
// What a tactic actually plays at: the captain's own choice, else Cách đá.
function insOf(tactic, key) {
  const own = ((tactic && tactic.ins) || {})[key];
  if (own) return own;
  return (MENTALITY_INS[(tactic && tactic.mentality) || "bal"] || MENTALITY_INS.bal)[key];
}
/* Where the shape actually ends up once the instructions are applied, per phase.

   FM26 shows the tactic as a shape you can look at rather than a list you have
   to imagine, and NN/g files live preview of a configuration under error
   PREVENTION -- seeing the block slide up when you raise the line beats being
   told afterwards that it was a bad idea. Pure, so the movement is testable
   without a browser.

   `phase` is "on" (with the ball) or "off" (without it). Percentages are of the
   pitch, y measured from the opposition goal, so a bigger y is deeper. */
function shapeFor(tactic, pos, roles, phase) {
  const g = k => insOf(tactic, k);
  // Full-backs already stand on the touchline, so "wide" cannot push them
  // further out -- what widens is the shape between them. Scale, then pull the
  // whole row back inside the widest player the formation already had.
  const halfMax = pos.reduce((mx, pt) => Math.max(mx, Math.abs(parseFloat(pt[0]) - 50)), 0);
  const LINE = { low: 7, mid: 0, high: -7 };
  const PRESS = { low: 2, mid: 0, high: -4 };
  const WIDTH = { narrow: -0.3, mid: 0, wide: 0.17 };
  return pos.map((pt, i) => {
    let x = parseFloat(pt[0]), y = parseFloat(pt[1]);
    /* `roles[i]` nhan hai dang. `{g, r}` la vai tro that cua o do trong pha nay,
       va no keo o di theo do lech khai trong ROLES/ROLES_OOP. Mot chuoi la cach
       goi cu (chi co tu the), giu nguyen hanh vi cu -- ban ghi va bai kiem cu
       khong phai sua dong nao. */
    const d = roles && roles[i] && typeof roles[i] === "object" ? roles[i] : null;
    const posture = d ? roleDuty(d.g, d.r, phase) : ((roles || [])[i] || "bal");
    const sh = d ? roleShift(d.g, phase, d.r) : null;
    const isGk = d ? d.g === "gk" : posture === "gk";
    // Dau cua dx: duong la RA BIEN, nen nguoi dung ben trai di sang trai. O giua
    // thi khong co bien nao de ra, bo qua.
    const side = x < 49.9 ? -1 : (x > 50.1 ? 1 : 0);
    if (phase === "off") {
      // Everyone drops or steps together, and the block squeezes narrow --
      // that is what a defensive shape is. Thu mon khong di theo khoi.
      if (!isGk) {
        y += LINE[g("line")] + PRESS[g("press")];
        x = 50 + (x - 50) * 0.82;
      }
    } else {
      // With the ball the width instruction stretches or pinches the shape.
      const spread = 1 + WIDTH[g("width")];
      x = 50 + (x - 50) * spread;
      if (Math.abs(x - 50) > halfMax) x = 50 + Math.sign(x - 50) * halfMax;
    }
    if (sh) {
      x += side * sh[0];
      y += sh[1];
    } else if (phase !== "off") {
      // Duong cu: chua co vai tro thi tu the tu nhich mot chut.
      if (posture === "att") y -= 6;
      if (posture === "def") y += 2;
    }
    return [Math.max(8, Math.min(92, x)).toFixed(1) + "%",
            Math.max(6, Math.min(94, y)).toFixed(1) + "%"];
  });
}

/* What a tactic screen is for. Knobs are easy; telling the captain his choices
   fight each other is the part that changes a Sunday game. Pure, so it can be
   tested without a browser -- see tactic-check.js. */
function tacticConflicts(tactic, roleKeys) {
  const g = k => insOf(tactic, k);
  const out = [];
  const posture = (roleKeys || []).map(r => r.duty);
  const backs = posture.filter((d, i) => (roleKeys[i].group === "cb" || roleKeys[i].group === "fb"));
  if (g("line") === "high" && backs.length && backs.every(d => d === "def"))
    out.push("D\u00e2ng cao nh\u01b0ng c\u1ea3 h\u00e0ng th\u1ee7 \u0111\u1ec1u \u0111\u01b0\u1ee3c giao gi\u1eef ch\u1ed7 \u2014 kh\u00f4ng ai d\u00e2ng theo, s\u1ebd h\u1edf gi\u1eefa.");
  if (g("press") === "high" && g("line") === "low")
    out.push("\u00c1p s\u00e1t nhi\u1ec1u nh\u01b0ng h\u00e0ng th\u1ee7 \u0111\u1ee9ng th\u1ea5p \u2014 \u0111\u1ed9i h\u00ecnh b\u1ecb k\u00e9o l\u00e0m \u0111\u00f4i, gi\u1eefa s\u00e2n tr\u1ed1ng.");
  if (g("onLoss") === "counter" && g("press") === "low")
    out.push("\u0110\u00f2i v\u00e2y l\u1ea1i ngay khi m\u1ea5t b\u00f3ng nh\u01b0ng \u00e1p s\u00e1t \u0111\u1eb7t \u1edf m\u1ee9c \u00cdt \u2014 hai l\u1ec7nh ng\u01b0\u1ee3c nhau.");
  if (g("onWin") === "direct" && g("tempo") === "slow")
    out.push("C\u01b0\u1edbp xong \u0111\u00e1nh nhanh nh\u01b0ng nh\u1ecbp \u0111\u1ed9 chung l\u00e0 Ch\u1eadm \u2014 qu\u1ea3 ph\u1ea3n c\u00f4ng s\u1ebd ch\u1ebft ngay nh\u1ecbp hai.");
  if (g("width") === "wide" && !(roleKeys || []).some(r => r.duty === "att" && (r.group === "fb" || r.group === "fw")))
    out.push("Ch\u01a1i r\u1ed9ng nh\u01b0ng kh\u00f4ng ai \u0111\u01b0\u1ee3c giao b\u00e1m bi\u00ean \u2014 k\u00e9o gi\u00e3n b\u1eb1ng g\u00ec.");
  if (g("mark") === "man" && g("press") === "high")
    out.push("K\u00e8m ng\u01b0\u1eddi c\u1ed9ng \u00e1p s\u00e1t nhi\u1ec1u l\u00e0 r\u1ea5t n\u1eb7ng ch\u00e2n \u2014 phe ph\u1ee7i th\u01b0\u1eddng h\u1ebft h\u01a1i tr\u01b0\u1edbc hi\u1ec7p hai.");
  if (g("line") === "high" && g("onLoss") === "drop")
    out.push("D\u00e2ng cao nh\u01b0ng m\u1ea5t b\u00f3ng l\u1ea1i l\u00f9i v\u1ec1 \u2014 c\u1ea3 h\u00e0ng th\u1ee7 ph\u1ea3i ch\u1ea1y ng\u01b0\u1ee3c 30m, \u0111\u00fang l\u00fac h\u1ecd \u0111\u00e1 d\u00e0i.");
  if (g("tempo") === "fast" && g("width") === "narrow")
    out.push("\u0110\u00e1 nhanh nh\u01b0ng b\u00f3 h\u1eb9p \u2014 kh\u00f4ng c\u00f3 kho\u1ea3ng tr\u1ed1ng n\u00e0o \u0111\u1ec3 \u0111\u1ea9y b\u00f3ng v\u00e0o.");
  if (g("press") === "high" && g("onWin") === "keep")
    out.push("\u0110\u00f2i b\u00f3ng t\u1eadn s\u00e2n h\u1ecd r\u1ed3i h\u1ea1 nh\u1ecbp \u2014 b\u1ecf ph\u00ed \u0111\u00fang gi\u00e2y h\u1ecd \u0111ang h\u1edf ng\u01b0\u1eddi.");
  const atts = posture.filter(d => d === "att").length;
  if (g("line") === "low" && atts >= Math.max(2, Math.ceil(posture.length / 3)))
    out.push("\u0110\u1ee9ng th\u1ea5p nh\u01b0ng " + atts + " ng\u01b0\u1eddi \u0111\u01b0\u1ee3c giao d\u00e2ng cao \u2014 kho\u1ea3ng c\u00e1ch gi\u1eefa hai tuy\u1ebfn s\u1ebd r\u1ea5t xa.");
  return out;
}

/* Mui ten ve tren san, va tung buoc cua hoat hinh, thuoc ve MOT pha.

   Truoc day ca hai la mot mang chung: ve duong chay luc co bong thi no hien
   luon o san mat bong, va nguoc lai -- cau 33 va 34 cua ban kiem. Gio moi ban
   ghi mang `ph`. Ban ghi cu khong co truong do, va luc chung duoc ve thi app
   moi chi co MOT san, chinh la pha co bong. */
function phaseOf(v) { return (v && v.ph) === "off" ? "off" : "on"; }
function forPhase(list, phase) {
  return (list || []).filter(v => phaseOf(v) === (phase === "off" ? "off" : "on"));
}
// Chi so trong mang day du, tinh tu chi so thu `i` trong danh sach da loc.
function phaseIndex(list, phase, i) {
  let k = -1;
  for (let n = 0; n < (list || []).length; n++) {
    if (phaseOf(list[n]) === (phase === "off" ? "off" : "on")) { k++; if (k === i) return n; }
  }
  return -1;
}

/* Chia hai doi.

   Truoc day boc ran thuan theo diem, nen hai doi can diem nhung mot ben co the
   om ca bon thu mon va ben kia khong co ai -- cau 91. Gio boc theo TUNG TUYEN:
   thu mon truoc, roi hau ve, tien ve, tien dao, cuoi cung la nguoi chua khai vi
   tri. Trong moi tuyen van boc nguoi diem cao truoc, va ben nao dang it nguoi
   hon thi duoc lay; hoa quan so thi ben dang it diem hon lay.

   Thuan, nen kiem duoc ma khong can trinh duyet: `rate` va `line` truyen vao. */
const SPLIT_LINES = ["TM", "HV", "TV", "T\u0110", ""];
function splitSides(pool, rate, line) {
  const A = [], B = [];
  let sa = 0, sb = 0;
  SPLIT_LINES.forEach(ln => {
    (pool || []).filter(m => (line(m) || "") === ln)
      .sort((x, y) => rate(y) - rate(x))
      .forEach(m => {
        const toA = A.length !== B.length ? A.length < B.length : sa <= sb;
        if (toA) { A.push(m); sa += rate(m); } else { B.push(m); sb += rate(m); }
      });
  });
  return { a: A.map(m => m.id), b: B.map(m => m.id), ptA: sa, ptB: sb };
}

/* Dia diem that, hay chi la mot cho giu cho ai do go tam.

   Thuan, nen kiem duoc: chuoi rong, "-", "(dien sau)", "San - (dien sau)",
   "chua co" deu la CHUA CO, va tra ve chuoi rong de noi goi quyet dinh hien
   gi. Ten san that co dau ngoac ("San Tao Dan (co 7)") thi van la ten that. */
const VENUE_BLANK = /^$|^[-\u2013\u2014.\s]+$|^\(.*\)$|^ch\u01b0a\s|^\?+$/i;
function venueOf(place) {
  const t = String(place == null ? "" : place).trim();
  if (VENUE_BLANK.test(t)) return "";
  // "San - (dien sau)": co ten o dau nhung phan con lai la cho giu cho.
  const tail = t.replace(/^.*?[-\u2013\u2014]\s*/, "");
  if (tail !== t && /^\(.*\)$/.test(tail.trim())) return "";
  return t;
}

/* Tên của một trận là ĐỐI THỦ, không phải loại buổi.

   "Buổi đá" đúng với cả 52 buổi trong năm, nên nó không nói được buổi nào là
   buổi nào. Phần lớn buổi đã lưu chưa có đối thủ (trường này mới), nên khi
   trống thì rơi về đúng nhãn cũ — không có dòng nào đọc thành rỗng. */
function fixtureTitle(opp, fallback) {
  const o = String(opp == null ? "" : opp).trim();
  return o ? "vs " + o : String(fallback == null ? "" : fallback);
}

/* Màu áo người ta gõ vào mỗi kiểu một khác: "Đen", "áo đen", "Áo Đen". Dán
   thêm chữ "Áo" khi chưa có, để dòng thông tin của trận đọc như nhau ở mọi
   buổi. Không có màu thì trả chuỗi rỗng, nơi gọi tự bỏ dấu chấm giữa. */
function kitLabelOf(v) {
  const t = String(v == null ? "" : v).trim().replace(/\s+/g, " ");
  if (!t) return "";
  return /^áo(\s|$)/i.test(t) ? t : "Áo " + t;
}

/* Bốn trạng thái điểm danh, đọc ra từ một ô dữ liệu đã có sẵn ba cách viết.

   Ô `att[id]` xưa nay mang "yes", "no", "yes-paid" (đã đóng tiền sân buổi đó),
   "yes-billed" (buổi đã chốt kết quả), hoặc rỗng. Hơn ba mươi chỗ trong app tự
   đọc lấy bằng `v && v !== "no"`, nên thêm một giá trị thứ năm là ngầm biến nó
   thành ĐI ở cả ba mươi chỗ. Một hàm đọc, mọi nơi gọi.

   Giá trị đã lưu KHÔNG đổi nghĩa: "yes"/"yes-paid"/"yes-billed" vẫn là ĐI,
   "no" vẫn là VẮNG, ô rỗng vẫn là CHƯA TRẢ LỜI. Chuỗi lạ cũng vẫn đọc thành
   ĐI — đúng nhánh mặc định cũ; đổi nó thành "không rõ" là làm bốc hơi câu trả
   lời của người ta khi bản cũ và bản mới cùng ghi vào một bảng. "maybe" là
   giá trị mới duy nhất, và nó phải được khai riêng ở đây mới tồn tại. */
function attState(v) {
  const s = String(v == null ? "" : v);
  if (!s) return "none";
  if (s === "no") return "no";
  if (s === "maybe") return "maybe";
  return "yes";
}
// "Chưa chắc" KHÔNG phải là đi. Đội hình, chia đội, tiền sân đều hỏi qua đây.
function attGoing(v) { return attState(v) === "yes"; }
const ATT_ORDER = ["yes", "no", "maybe", "none"];
/* Thu hang de SAP cot DIEM DANH. Khac ATT_ORDER (thu tu HIEN o cac cho dem
   dau). Chua tra loi = 0 de bam lan thu hai (nho truoc) dua dung nhung nguoi
   can nhac len dau bang -- do la ly do nguoi ta sap cot nay. */
const ATT_RANK = { yes: 3, maybe: 2, no: 1, none: 0 };
const ATT_LABEL = { yes: "Đi", no: "Vắng", maybe: "Chưa chắc", none: "Chưa trả lời" };
/* #EC2E1A do duoc 4,14:1 tren nen the (#161925) va 3,70:1 tren #1F2332 -- duoi
   nguong AA 4,5:1, ma mau nay la chu "khong di" / "0/7" / "Rat yeu", tuc dung cho
   thu can doc nhanh nhat. #FF6B57 cho 6,24:1 va 5,57:1. Doi o MOI cho no lam MAU
   CHU; mau ao doi khach (`away()`) giu nguyen do that vi no la mau ao, khong phai
   chu. */
const ATT_COLOR = { yes: "#75CE50", no: "#FF6B57", maybe: "#F79009", none: "rgba(250,250,255,0.5)" };
const ATT_BG = { yes: "rgba(117,206,80,0.16)", no: "rgba(236,46,26,0.16)",
                 maybe: "rgba(247,144,9,0.16)", none: "transparent" };
/* "Đóng tiền chưa" là một trong bốn thứ người ta mở màn Thành viên để xem, và
   nó từng chỉ là một dấu "—" xám ở cột cuối cùng của bảng — thứ mà trên điện
   thoại không hiện ra chút nào. Trả về CHỮ cho cả hai trạng thái: không nợ vẫn
   phải nói ra là không nợ, chứ để trống thì người đọc không biết là "đủ" hay
   "chưa ai ghi". `money` truyền vào để hàm này thuần và test được. */
function debtChip(owed, money) {
  const n = Number(owed);
  return (isFinite(n) && n > 0)
    ? { text: "Nợ " + money(n), fg: "#F79009", bg: "rgba(247,144,9,0.16)" }
    : { text: "Đủ quỹ", fg: "#75CE50", bg: "rgba(117,206,80,0.14)" };
}
/* Đếm bốn trạng thái trên ĐÚNG danh sách người đang tính, không phải trên các
   khoá còn sót trong bảng điểm danh. Người đã rời đội vẫn để lại khoá của mình
   ở đó, và cột "chưa trả lời" suy ra bằng phép trừ — một khoá rác là cả cột âm. */
function attCounts(att, ids) {
  const out = { yes: 0, no: 0, maybe: 0, none: 0, total: (ids || []).length };
  (ids || []).forEach(id => { out[attState((att || {})[id])]++; });
  return out;
}

/* Ba đường ghi lịch (thêm nhanh từ ô ngày, sửa buổi, tách riêng một buổi khỏi
   chuỗi lặp) dựng cùng một bản ghi, nhưng mỗi đường tự liệt kê lấy trường của
   nó. Nên nhánh "chỉ buổi này" đã bỏ quên `fee`: buổi tách ra tụt về tiền sân
   mặc định mà không ai báo. Một chỗ dựng, ba đường gọi. */
function eventFields(v, defFee) {
  const fee = String(v.fee == null ? "" : v.fee).trim();
  return {
    kind: v.kind, time: v.time || "19:30", place: v.place || "", note: v.note || "",
    opp: String(v.opp == null ? "" : v.opp).trim(),
    kit: String(v.kit == null ? "" : v.kit).trim(),
    repeat: v.repeat,
    fee: fee === "" ? (v.kind === "match" ? defFee : 0)
                    : (parseInt(fee.replace(/\D/g, ""), 10) || 0)
  };
}

/* Vi tri so truong cua mot nguoi nam o dau trong so do dang dung.

   Bang "VI TRI TRONG DOI HINH" truoc day chi sang len khi nguoi do CO TEN
   trong doi hinh toi nay. Ai chua duoc xep -- tuc phan lon nguoi mo ho so --
   thay mot so do vo danh khong dinh dang gi den minh: ho so ghi CAM ma tren
   san khong cho nao co chu CAM.

   `exact`  o dung y vi tri do
   `line`   o cung tuyen (CAM khong co thi CM la gan nhat)
   Khong co ca hai nghia la so do nay khong co cho cho anh ta -- do la thong tin
   that su huu ich, khong phai loi. */
function slotsForPos(labels, main) {
  const out = { exact: [], line: [] };
  if (!main || !labels) return out;
  const ln = LINE_OF[main] || "";
  labels.forEach((l, i) => {
    if (l === main) out.exact.push(i);
    else if (ln && LINE_OF[l] === ln) out.line.push(i);
  });
  return out;
}

/* Diem 1-20 doc thanh sao, dung cach Football Manager lam.

   Trong FM ban KHONG BAO GIO thay con so. Ban thay sao. Con so 1-20 la cong cu
   cua HLV; sao la thu ca doi doc duoc ma khong phai hoc thang diem nao. The cau
   thu noi voi CAU THU, nen the deo sao.

   Nua sao mot buoc, va nguoi da duoc cham thi thap nhat cung con nua sao -- 0
   sao doc thanh "khong co gi", khac han "yeu". FM cung khong bao gio cho 0 sao.
   Tra ve dung 5 o: "full" | "half" | "empty". */
/* Thanh tich mua, tinh MOT lan.

   W/H/B, hieu so va phong do 5 tran truoc do nam rai rac trong renderVals --
   moi cho tu dem lay. Hai cho cung dem mot thu la cach mot man hinh bat dau
   tu mau thuan voi chinh no. Gio phong truyen thong doc chung ham nay voi
   trang Tong quan.

   `matches` xep MOI NHAT TRUOC (saveResult prepend), nen 5 tran gan nhat la
   5 phan tu dau. Dong cu do seed mang ten doi thu trong truong `date` va
   khong co ngay -- khong sap xep lai theo ngay duoc, va thu tu mang la thu
   duy nhat dang tin. */
function seasonRecord(matches) {
  const score = v => (v === null || v === undefined || v === "" || !isFinite(Number(v)))
    ? null : Number(v);
  const g = (Array.isArray(matches) ? matches : []).filter(
    m => m && score(m.gf) !== null && score(m.ga) !== null);
  const res = m => Number(m.gf) > Number(m.ga) ? "w" : (Number(m.gf) === Number(m.ga) ? "d" : "l");
  const cnt = k => g.filter(m => res(m) === k).length;
  const gf = g.reduce((a2, m) => a2 + Number(m.gf), 0);
  const ga = g.reduce((a2, m) => a2 + Number(m.ga), 0);
  const margin = m => Number(m.gf) - Number(m.ga);
  const pick = (arr, cmp) => arr.length ? arr.slice().sort(cmp)[0] : null;
  const home = g.filter(m => (m.venue || "") !== "KHÁCH");
  const away = g.filter(m => (m.venue || "") === "KHÁCH");
  const tally = arr => ({ w: arr.filter(m => res(m) === "w").length,
                          d: arr.filter(m => res(m) === "d").length,
                          l: arr.filter(m => res(m) === "l").length });
  const form = g.slice(0, 5).map(res);
  return {
    p: g.length, w: cnt("w"), d: cnt("d"), l: cnt("l"),
    gf: gf, ga: ga, gd: gf - ga,
    form: form,                       // moi nhat truoc
    formW: form.filter(k => k === "w").length,
    best:  pick(g.filter(m => margin(m) > 0), (x, y) => margin(y) - margin(x)),
    worst: pick(g.filter(m => margin(m) < 0), (x, y) => margin(x) - margin(y)),
    home: tally(home), away: tally(away)
  };
}
/* Ten doi thu cua mot tran. Dong seed cu cat ten vao truong `date`; dong that
   do saveResult ghi co ca hai. Doc chiu duoc ca hai hinh dang. */
function oppOf(m) { return (m && (m.opp || m.date)) || "-"; }

/* Dong thoi gian cua doi, kieu manager timeline trong Football Manager.

   Tu danh hieu va lich su tran truoc day la hai bang roi nhau: mot cai xep theo
   nam, mot cai xep theo tran. Nguoi moi vao doi doc hai bang do khong ra duoc
   CHUYEN cua doi -- cup nam 2025 nam o dau so voi tran thua dam thang 9?

   Gom lai mot dong, moi nhat len dau. Tran dau tien duoc goi ten rieng, vi do
   la thu duy nhat trong lich su doi khong lap lai lan hai. */
function clubTimeline(matches, trophies) {
  const out = [];
  const ms = (Array.isArray(matches) ? matches : []).filter(Boolean);
  // Tran khong ghi ngay van phai co mat: bo im lang la lam mat mot phan lich su.
  const yr = d => { const m = /(\d{4})/.exec(String(d || "")); return m ? Number(m[1]) : null; };
  const ord = d => {
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(d || "").trim());
    return m ? (Number(m[3]) * 10000 + Number(m[2]) * 100 + Number(m[1])) : -1;
  };
  const dateOf = g => (g.opp ? (g.date || "") : "");
  ms.forEach(g => out.push({
    kind: "match", date: dateOf(g), year: yr(dateOf(g)), ord: ord(dateOf(g)),
    opp: oppOf(g), gf: Number(g.gf), ga: Number(g.ga)
  }));
  (Array.isArray(trophies) ? trophies : []).filter(Boolean).forEach(t => {
    const y = parseInt(t.year, 10);
    out.push({ kind: "trophy", date: "", year: isFinite(y) ? y : null,
      ord: isFinite(y) ? (y * 10000 + 9999) : -1,
      title: t.title || "", place: trophyPlace(t.place).label, note: t.note || "" });
  });
  // Tran dau tien: cot moc, khong lap lai lan hai.
  /* Chi goi ten "tran dau tien" khi BIET CHAC. Dong seed cu khong co ngay, nen
     khi tran som nhat khong co ngay thi khong ai biet tran nao truoc -- va nhan
     do tung roi vao dung cai tran MOI NHAT, lam mot dong vua dung dau danh sach
     vua mang nhan "dau tien". Khong biet thi khong noi. */
  const first = ms.slice().sort((a2, b) => ord(dateOf(a2)) - ord(dateOf(b)))[0];
  if (first && ord(dateOf(first)) > 0) out.push({ kind: "first", date: dateOf(first),
    year: yr(dateOf(first)), ord: ord(dateOf(first)) - 1, opp: oppOf(first) });
  return out.sort((a2, b) => b.ord - a2.ord);
}
/* Chen moc nam vao dong thoi gian.

   Football Manager dat vien nam ngay TREN duong thoi gian: 2023 · 2024 · Now.
   Do la thu bien mot danh sach dai thanh mot cau chuyen doc duoc -- khong co
   no thi 40 su kien chi la 40 dong. Su kien chua ro nam duoc gom rieng o cuoi,
   khong nhet bua vao mot nam nao. */
function withYearMarks(list) {
  const out = [];
  let cur = "chua-dat";
  (Array.isArray(list) ? list : []).forEach(e => {
    if (!e) return;
    const y = (e.year === undefined) ? null : e.year;
    if (y !== cur) { out.push({ kind: "year", year: y }); cur = y; }
    out.push(e);
  });
  return out;
}
/* Dem danh hieu, kieu thanh "2 Trophies · 0 Major Awards" duoi day man FM.
   Tach cup vo dich khoi "co huy chuong": a quan cung dang ke, nhung gop chung
   vao mot con so "danh hieu" thi con so do khong con nghia gi. */
function trophyTally(list) {
  const t = { cups: 0, podium: 0, total: 0 };
  (Array.isArray(list) ? list : []).filter(Boolean).forEach(x => {
    t.total += 1;
    if (x.place === "champion") { t.cups += 1; t.podium += 1; }
    else if (x.place === "runnerup" || x.place === "third") t.podium += 1;
  });
  return t;
}
/* Tu danh hieu. Nam moi len truoc; cung nam thi thu hang cao len truoc, vi
   trong mot nam doi da mot giai la thu dang khoe nhat. Ban ghi thieu nam van
   giu lai, xep cuoi -- mat mot cai cup vi khong ai nho nam la te hon. */
const TROPHY_PLACES = [
  ["champion", "Vô địch", 0],
  ["runnerup", "Á quân", 1],
  ["third",    "Hạng ba", 2],
  ["played",   "Tham dự", 3]
];
function trophyPlace(key) {
  const r = TROPHY_PLACES.find(x => x[0] === key);
  return r ? { label: r[1], order: r[2] } : { label: "Tham dự", order: 3 };
}
function trophySort(list) {
  return (Array.isArray(list) ? list : []).filter(Boolean).slice().sort((a2, b) => {
    const ya = parseInt(a2.year, 10), yb = parseInt(b.year, 10);
    const oka = isFinite(ya), okb = isFinite(yb);
    if (oka !== okb) return oka ? -1 : 1;          // khong co nam thi xep cuoi
    if (oka && ya !== yb) return yb - ya;
    return trophyPlace(a2.place).order - trophyPlace(b.place).order;
  });
}

function starsOf(rating) {
  const r = Number(rating);
  if (!isFinite(r) || r <= 0) return ["empty", "empty", "empty", "empty", "empty"];
  const halves = Math.min(10, Math.max(1, Math.round(r / 20 * 10)));
  return [0, 1, 2, 3, 4].map(i => {
    const need = (i + 1) * 2;
    return halves >= need ? "full" : (halves === need - 1 ? "half" : "empty");
  });
}

/* Sao la don vi DUY NHAT nguoi doc nhin thay.

   Trong FM ban khong bao gio thay con so 1-20; ban thay sao. Con so la cong cu
   cua doi truong -- no chi co nghia khi ban biet thang diem. Sao thi ai cung
   doc duoc, va no tu noi ra rang day la mot uoc luong tho chu khong phai mot
   phep do chinh xac toi 0,1 diem.

   Buoc nua sao, va nguoi DA duoc cham thi thap nhat cung nua sao -- 0 sao doc
   thanh "khong co gi", khac han "yeu". Khop dung voi `starsOf` ve ra hinh. */
function starCount(rating) {
  const r = Number(rating);
  if (!isFinite(r) || r <= 0) return 0;
  return Math.min(10, Math.max(1, Math.round(r / 20 * 10))) / 2;
}
function starText(n) {
  const v = Number(n);
  if (!isFinite(v) || v <= 0) return "chưa có sao";
  return String(v).replace(".", ",") + " sao";
}
/* Chenh lech noi bang sao, khong bang diem. "tren trung binh doi 1,4 diem" bat
   nguoi doc phai biet thang 20 moi hieu 1,4 la nhieu hay it. */
/* Man ho so noi bang THANG 1-20 tu tren xuong duoi: diem 14, TB doi 12.6, tung
   chi so 1-20. Cau so sanh o do truoc day muon `starGapText` nen no ket thuc
   bang "tren trung binh doi nua sao" -- mot don vi khong ton tai o dau tren man
   do. (Sao co that, nhung o man "Chia doi", noi co ve ngoi sao that.) Cung mot
   phep so sanh, noi bang diem. */
function ptGapText(mine, avg) {
  // Number(null) === 0, nen thieu du lieu ma chi kiem isFinite thi no doc thanh
  // "tren trung binh doi 12 diem" -- mot ket luan rut ra tu cai khong co.
  if (mine == null || avg == null || mine === "" || avg === "") return "";
  const a2 = Number(mine), b = Number(avg);
  if (!isFinite(a2) || !isFinite(b)) return "";
  const d = Math.round((a2 - b) * 10) / 10;
  if (d === 0) return "ngang trung bình đội";
  const mag = String(Math.abs(d)).replace(".", ",");
  return (d > 0 ? "trên" : "dưới") + " trung bình đội " + mag + " điểm";
}

function starGapText(mine, avg) {
  if (mine == null || avg == null || mine === "" || avg === "") return "";
  const a2 = Number(mine), b = Number(avg);
  if (!isFinite(a2) || !isFinite(b)) return "";
  const d = Math.round((a2 - b) * 2) / 2;
  if (d === 0) return "ngang trung bình đội";
  const mag = Math.abs(d) === 0.5 ? "nửa sao"
    : String(Math.abs(d)).replace(".", ",") + " sao";
  return (d > 0 ? "trên" : "dưới") + " trung bình đội " + mag;
}

/* Mo ta cau thu, dung cach Football Manager dung mo ta cua no:
   [vi tri] + [tuoi] + [net noi bat].  "Young explosive winger", "tenacious
   midfielder", "commanding centre-back".

   VI TRI LAY TU THU DOI TRUONG DA KHAI, khong suy tu chi so. Toc do 18 khong
   bien ai thanh cau thu chay canh -- no chi noi nguoi do nhanh. Suy vi tri tu
   chi so la bia ra mot su that ve nguoi khac, va app nay da co du chuyen do.
   Chua khai vi tri thi khong co mo ta; man hinh da co san mot cau bao di khai.

   Chi so chi cho TINH TU, va chi khi no noi bat so voi CHINH NGUOI DO. Noi
   "nhanh" ve nguoi ma moi chi so deu 17 la khong noi gi -- do la noi lai diem
   tong bang mot chu khac. Nen moc la lech so voi trung binh cua chinh ho. */
const DESC_POS = {
  GK: "Th\u1ee7 m\u00f4n", CB: "Trung v\u1ec7", LB: "H\u1eadu v\u1ec7 tr\u00e1i", RB: "H\u1eadu v\u1ec7 ph\u1ea3i",
  CDM: "Ti\u1ec1n v\u1ec7 tr\u1ee5", CM: "Ti\u1ec1n v\u1ec7 trung t\u00e2m", CAM: "Ti\u1ec1n v\u1ec7 c\u00f4ng",
  LW: "Tiền vệ cánh trái", RW: "Tiền vệ cánh phải", ST: "Tiền đạo"
};
// Mot chi so noi bat noi ra bang mot cum tieng Viet nguoi di da hay dung.
const DESC_ADJ = {
  pace: "ch\u1ea1y nhanh", stamina: "b\u1ec1n s\u1ee9c", strength: "c\u00e0n l\u01b0\u1edbt",
  finish: "d\u1ee9t \u0111i\u1ec3m t\u1ed1t", dribble: "kh\u00e9o", pass: "chuy\u1ec1n t\u1ed1t",
  shot: "sút xa tốt", defend: "chắc chắn", header: "mạnh không chiến",
  position: "ch\u1ecdn v\u1ecb tr\u00ed t\u1ed1t", gk: "ph\u1ea3n x\u1ea1 t\u1ed1t", spirit: "m\u00e1u l\u1eeda"
};
// Tuoi tinh tu ngay sinh dang "DD/MM/YYYY". `today` truyen vao de kiem duoc.
function ageFrom(dob, today) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(dob || "").trim());
  if (!m) return null;
  const d = Number(m[1]), mo = Number(m[2]), y = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const t = today instanceof Date ? today : new Date();
  let age = t.getFullYear() - y;
  const before = (t.getMonth() + 1) < mo || ((t.getMonth() + 1) === mo && t.getDate() < d);
  if (before) age--;
  return (age >= 12 && age <= 70) ? age : null;
}
/* Phui la nguoi lon di da cho vui, khong phai lo dao tao -- nen chi hai dau
   tuoi dang noi ra, con lai la binh thuong va khong can nhan. */
function ageWord(age) {
  if (age == null) return "";
  if (age <= 22) return "tr\u1ebb";
  if (age >= 33) return "k\u1ef3 c\u1ef1u";
  return "";
}
// Chi so vuot han trung binh cua chinh nguoi do. Duoi sau chi so da cham thi
// chua du hinh de noi ai manh cai gi.
function standoutKeys(attrs, minGap) {
  const a = attrs || {};
  const rows = Object.keys(DESC_ADJ)
    .map(k => [k, Number(a[k])])
    .filter(r => isFinite(r[1]));
  if (rows.length < 6) return [];
  const mean = rows.reduce((s2, r) => s2 + r[1], 0) / rows.length;
  const gap = isFinite(minGap) ? minGap : 2.5;
  return rows.filter(r => r[1] - mean >= gap)
    .sort((x, y) => y[1] - x[1]).slice(0, 2).map(r => r[0]);
}
function playerDesc(m, today) {
  const pos = m && (m.posMain !== undefined ? m.posMain : (parsePos(m.pos) || {}).main);
  const noun = DESC_POS[pos];
  if (!noun) return "";
  const w = ageWord(ageFrom(m.dob, today));
  const adj = standoutKeys(m.attrs).map(k => DESC_ADJ[k]).filter(Boolean);
  return noun + (w ? " " + w : "") + (adj.length ? ", " + adj.join(", ") : "");
}

function insLabel(key, val) {
  const row = INS_ROWS.find(r => r.key === key);
  const o = row && row.opts.find(x => x[0] === val);
  return o ? o[1] : val;
}

/* ---------- Chấm chỉ số: thang 1-20, năm mức kiểu FM ----------

   Trước đây mỗi chỉ số có một cặp nút −/+ (24 nút không chữ trên một màn) và
   màu chỉ chia ba nấc rải rác trong hai chỗ khác nhau. Một hàm, một bảng: màu,
   độ đậm và CHỮ của mức đi ra cùng chỗ, nên "màu vàng nghĩa là gì" luôn có câu
   trả lời in ngay cạnh nó.

   Mức thấp trước đây còn được làm MỜ đi (alpha 0.3 cho "Rất yếu"), ý là "thấp
   thì nhạt". Đo trên nền thật thì phần đã tô chỉ hơn nền rãnh 1.32:1 — nhìn
   không ra thanh đó đã đầy tới đâu, mà đó là điều duy nhất thanh này nói. Và
   chip chữ đặt lên trên nó thì cũng lẫn nốt. Nay mọi mức tô đặc; "thấp" đã
   được nói bằng CHỮ, bằng MÀU và bằng ĐỘ DÀI rồi, không cần nói thêm bằng
   cách làm khó nhìn. */
const ATTR_LEVELS = [
  { min: 17, key: "elite", label: "Xuất sắc",   color: "#C1D439" },
  { min: 14, key: "good",  label: "Khá",        color: "#75CE50" },
  { min: 11, key: "avg",   label: "Trung bình", color: "#6990FF" },
  { min: 8,  key: "weak",  label: "Yếu",        color: "#F79009" },
  { min: -Infinity, key: "poor", label: "Rất yếu", color: "#FF6B57" }
];
/* 0.35 cho ra 3.1:1 trên nền chip — dưới ngưỡng 4.5:1 của chữ thường. */
const ATTR_NONE = { key: "none", label: "chưa chấm", color: "rgba(250,250,255,0.6)" };
function attrLevel(v) {
  const n = (v === null || v === undefined || v === "") ? NaN : parseFloat(v);
  if (!isFinite(n)) return ATTR_NONE;
  return ATTR_LEVELS.find(l => n >= l.min) || ATTR_LEVELS[ATTR_LEVELS.length - 1];
}

/* Bấm vào đâu trên thanh thì ra điểm đó. Đây là thứ THAY cho 24 nút −/+: một
   thao tác đặt được bất kỳ nấc nào, thay vì bấm + bảy lần. `ceil` để mép trái
   ra 1 chứ không ra 0, và mép phải ra đúng 20. */
function barValueAt(x, w, max) {
  const m = max > 0 ? max : 20;
  if (!(w > 0)) return 1;
  const v = Math.ceil(Math.min(Math.max(x, 0), w) / w * m);
  return Math.min(Math.max(v, 1), m);
}

/* Mạng nhện dựng từ số, không viết tay đường SVG: cùng một hàm vẽ cả lưới nền
   (mảng toàn `max`) lẫn hình của cầu thủ, nên lưới và hình không thể lệch trục. */
/* Mot o so trong bang: 0 va du lieu hong deu ra "—". Cot toan so 0 doc nhu
   bang bi hong, con "—" thi doc dung nghia "chua co". */
/* Sap xep bang Thanh vien. Trong tai vong 1 do duoc: tieu de cot mang
   `cursor:auto`, bam vao "DIEM" khong doi mot ky tu nao, va ca trang khong co mot
   o chon nao de sap xep -- mot bang 12 cot ma khong sap duoc thi cot so chi de
   nhin. Giu o muc module de no song qua moi lan ve lai. */
let MEM_SORT = { key: "", dir: 1 };
const MEM_SORT_KEYS = {
  num:     m => { const v = parseFloat(m.num); return isFinite(v) ? v : -1; },
  name:    m => String(m.name || "").toLowerCase(),
  games:   m => { const v = parseFloat(m.games);   return isFinite(v) ? v : 0; },
  goals:   m => { const v = parseFloat(m.goals);   return isFinite(v) ? v : 0; },
  assists: m => { const v = parseFloat(m.assists); return isFinite(v) ? v : 0; },
  mvp:     m => { const v = parseFloat(m.mvp);     return isFinite(v) ? v : 0; },
  /* Cot quan trong nhat bang lai la cot DUY NHAT khong bam sap duoc: tieu de cua
     no khai `key:""` nen trong giong het cac cot kia (cung co chu, cung mau) ma
     bam vao khong xay ra gi. Nguoi chua cham diem xuong duoi cung, dung quy uoc
     voi bang Thong ke. */
  /* Doc dung con so ma COT DO dang in ra (`ratingView`), khong doc `m.rating`.
     Hai thu nay khac nhau: `m.rating` la diem cu suy tu hang go tay, con cot
     ĐIỂM in diem tinh tu 12 chi so. Sap theo cai nay ma nhin cai kia thi bang
     trong nhu chua sap gi -- dung loi trong tai vong 22 bao. Chua cham thi -1
     de xuong duoi cung o ca hai chieu. */
  rating:  m => { const rv = ratingView(m); return rv.rated ? rv.rating : -1; },
  atk:     m => attrSortVal(m, 0),
  def:     m => attrSortVal(m, 1),
  fit:     m => attrSortVal(m, 2)
};
/* Ba cot CONG/THU/THE cung bam sap duoc. O chua cham du tra -1 de xuong duoi
   cung o ca hai chieu -- xen chung vao giua bang so 0 la noi "nguoi nay yeu",
   trong khi that ra la "chua ai cham". */
function attrSortVal(m, i) {
  const v = posAvg((m || {}).attrs, ATTR_BLOCKS[i].list, isKeeper(m));
  return v == null ? -1 : v;
}
/* Thuan: nhan mang vao, tra mang MOI da sap. `dir` 1 = lon truoc (bam lan dau vao
   mot cot so thi nguoi ta muon thay ai nhieu nhat), -1 = nho truoc. Cot chu thi
   nguoc lai cho tu nhien: 1 = A->Z. Khoa la thi tra nguyen mang, khong nem loi. */
function memSorted(list, sort, extra) {
  const st = sort || MEM_SORT;
  /* Khoa dang "a:finish" la sap theo MOT chi so trong ho so. Doc thang tu
     `m.attrs` chu khong tra ve `MEM_SORT_KEYS`, vi 12 chi so duoc khai trong
     `ATTRS` nam SAU bang khoa nay trong tep -- khai san 12 dong o tren la lap
     mot danh sach da co, va hai ban se lech nhau ngay lan them chi so thu 13.
     O chua cham tra -1 de xuong duoi cung o ca hai chieu. */
  const key = st && st.key;
  const f = (typeof key === "string" && key.slice(0, 2) === "a:")
    ? (m => { const v = parseFloat(((m || {}).attrs || {})[key.slice(2)]); return isFinite(v) && v > 0 ? v : -1; })
    : ((extra && extra[key]) || MEM_SORT_KEYS[key]);
  if (!f) return (list || []).slice();
  const dir = st.dir === -1 ? -1 : 1;
  return (list || []).slice().sort((a, b) => {
    const x = f(a), y = f(b);
    if (typeof x === "string" || typeof y === "string")
      return dir * String(x).localeCompare(String(y), "vi");
    return dir * (y - x);
  });
}

/* Thu tu THAT cua cac tran, moi nhat truoc. Truoc do moi cho doc "N tran gan
   nhat" deu cat thang tu dau mang, va comment cu con khang dinh mang luon xep
   moi-nhat-truoc vi `saveResult` chen len dau. Sai: tam tran co san cua doi
   xep CU TRUOC (14/06 -> 30/08), nen "phong do 5 tran gan nhat" o Tong quan va
   o Phong truyen thong deu doc 5 tran CU NHAT -- va ngay duoi no, dong thoi
   gian sap dung theo ngay lai ra thu tu nguoc lai. Mot man hinh tu noi nguoc
   voi chinh no.

   Tra ve {m, i}: `i` la vi tri THAT trong mang goc, vi duong sua tran ghi lai
   theo vi tri -- sap xep de hien thi ma tra ve vi tri moi thi bam sua tran nay
   se ghi de len tran khac. Dong khong doc duoc ngay thi xuong cuoi, giu nguyen
   thu tu cu voi nhau. */
/* Mot ngay DMY thanh mot so sap duoc. Tach ra khoi `matchOrder` vi bang
   "theo tung tran" trong ho so cung phai sap bang no -- truoc do bang do khong
   sap gi ca, no giu nguyen thu tu mang: tam tran cua doi mau nam theo thu tu
   tang dan, con tran moi luu duoc chen len DAU, nen tran vua ghi nhay len dong
   dau mot bang doc tu cu toi moi. Va so sanh chuoi thi "5/9/2026" < "14/06/2026"
   vi "5" > "1" theo ky tu -- ngay nguoi go khong duoc dem 0 o dau. */
/* Bang xep hang o Tong quan mo bang cot NAO.

   Truoc do luon la "Diem danh gia" -- diem suy tu 12 chi so cham tay. Hai cho
   hong: (1) chi so cham tay khong phai chuyen da xay ra mua nay, va chinh app
   thua nhan "chi so chua cham thi tam lay diem cu"; (2) diem tron thu mon voi
   cau thu, nen mot thu mon 0 ban 0 kien tao 0 MVP van ngoi hang 4 tren nguoi
   ghi 5 ban. FM24 mo home bang Top Goalscorer / Most Assists -- nhung gi DA
   XAY RA.

   Doi da co tran thi mo bang CHUYEN CAN: dem duoc, khong bia, moi vi tri deu
   len dau duoc, va do la thu bong da phui quan tam nhat. Chua co tran nao thi
   quay ve diem. Nguoi dung van doi cot bat ky bang day chip ngay tren bang. */
function defaultRankBy(members) {
  return (members || []).some(m => (+(m || {}).games || 0) > 0) ? "games" : "rating";
}
/* Phat diem cho nguoi da da lien tiep nhieu buoi.

   App TU TINH ra "Da 4 buoi lien -- can nhac cho nghi" (xem `readyTag`) roi
   chinh may xep doi hinh va danh sach "Thay bang..." lo no di: ham cham diem cu
   la `rating*2 + core - fitCost*4`, khong co bien met. App noi mot dang, lam mot
   dang. Chan thuong thi da loc (`!hurtOf`), met thi khong.

   Muc phat co y VUA PHAI: met thi thua nguoi khoe ngang tai, nhung khong thua
   nguoi kem hon han -- doi phui khong co tuyen du day de cho nghi bang moi gia.
   4 + streak: da 3 buoi lien = -7, tuong duong ~3,5 diem danh gia. */
function restPenalty(r) {
  if (!r || !r.tired) return 0;
  return 4 + Math.max(0, +r.streak || 0);
}
/* O gan nhat khi tha vao san.

   Truoc do tha chi an khi elementFromPoint tra ve dung `[data-slot]`. O cau thu
   la mot vong tron ~44px tren mat san rong 480px, nen lech vai chuc pixel la roi
   vao co: khong gan ai, khong bao gi, khong mot dau hieu nao noi vi sao. Nguoi
   dung ket luan keo tha hong.

   Trong san thi o gan nhat LUON la y dinh -- khong can ban kinh chan. Thuan de
   kiem duoc: nhan tam cac o, tra chi so; -1 khi khong co o nao. */
function nearestSlotIdx(cents, x, y) {
  let best = -1, bd = Infinity;
  (cents || []).forEach((c, i) => {
    if (!c) return;
    const dx = x - c.cx, dy = y - c.cy, d = dx * dx + dy * dy;
    if (d < bd) { bd = d; best = i; }
  });
  return best;
}
/* Bang du bi cua MOT buoi.

   Truoc do du bi khoa bang `teamId` trong khi doi hinh san khoa bang buoi. Hai
   nhip khac nhau tren cung mot man: sua doi hinh buoi 16/9 cho mot nguoi vao
   san thi anh ta bien mat khoi bang du bi cua buoi 9/9 -- mot buoi khong he mo
   ra. Trong tai do duoc: benchByTeam {"1":[9,10,4,5]} -> {"1":[9,10,4,2]}.

   Nay khoa bang buoi. Kho van ten cu vi doi ten la bat moi nguoi di tru du
   lieu; doc thi ro ve khoa doi cu de bang du bi dang co khong mat -- lan sua
   dau tien cua moi buoi bat dau tu chinh no. Mang RONG la mot cau tra loi
   ("buoi nay khong ai du bi"), nen phai kiem isArray chu khong dung `||`. */
function benchOf(map, occKey, teamKey) {
  const m = map || {};
  if (Array.isArray(m[occKey])) return m[occKey];
  if (Array.isArray(m[teamKey])) return m[teamKey];
  return [];
}
/* Tran DA DA, xep theo ngay, de lich thang in duoc ket qua len o ngay do.

   Truoc do lich thang va so tran la HAI bo du lieu khong biet nhau: lich chi ve
   lai mau lap hang tuan (thu Tu 19:30), con tam tran that su da da nam o
   "Doi > Lich su tran" voi ngay khac han (Chu nhat). Lat lai thang 8 thi lich
   noi doi da bon buoi vao 5/12/19/26 trong khi doi da da 9/16/23/30 -- mot man
   tu noi nguoc voi chinh minh. Day la cho FM24 lam tot hon that: dong lich cua
   no in thang ty so vao hang do.

   Dong khong co doi thu, hoac ngay khong doc duoc, thi bo qua -- khong doan.
   Hai tran cung ngay thi giu ca hai. */
/* Luc giac diem o ho so: vien ngoai la KHUNG (co dinh, dung), con ruot
   ben trong phai to nho theo diem. Truoc day ca hai deu la path chet cung mot
   kich thuoc, nen nguoi 9 diem va nguoi 19 diem ve ra y het nhau -- chi con so
   o giua la that, phan hinh la vo.

   Khung 48.185 x 50.813; ruot to nhat bang 37.477/48.185 cua khung (giu lai
   vanh hong nhin thay duoc). San 0.28 de mot nguoi 3 diem van con hinh chu
   khong bien mat. Chua cham chi so nao (rating khong phai so) thi tra 0 --
   template khong ve gi, dung hon la ve mot cham gia. */
const HEX_W = 48.185, HEX_H = 50.813, HEX_FILL = 37.477 / 48.185;
function hexBox(rating) {
  const r = parseFloat(rating);
  const frac = isFinite(r) && r > 0 ? Math.max(0.28, Math.min(1, r / 20)) : 0;
  const w = HEX_W * HEX_FILL * frac, h = HEX_H * HEX_FILL * frac;
  const r3 = v => Math.round(v * 1000) / 1000;
  return { w: r3(w), h: r3(h), x: r3((HEX_W - w) / 2), y: r3((HEX_H - h) / 2) };
}

/* "Kiem tra mang roi thu lai" la loi khuyen SAI trong dung truong hop hay gap
   nhat. Du an Supabase goi free TU TAM DUNG khi lau ngay khong ai dung, va luc
   do ten mien bien mat han (NXDOMAIN) -- may van co mang, van vao duoc moi thu
   khac, chi rieng may chu la khong. Bao "kiem tra mang" thi nguoi ta di khoi
   dong lai router, trong khi viec can lam la vao Supabase bam khoi phuc.
   Da mat vai tuan vi chinh cau nay.

   `navigator.onLine` phan biet duoc hai truong hop. No khong hoan hao -- true
   chi co nghia la may co duong mang -- nhung false thi CHAC CHAN la mat mang,
   nen cau tra ve khong bao gio noi sai. */
function netWhy(online) {
  return online === false
    ? "Máy đang không có mạng — bật mạng rồi thử lại."
    : "Máy chủ không trả lời — có thể đang tạm dừng. Nhờ người dựng app khôi phục giúp.";
}
const netNow = () => netWhy(typeof navigator !== "undefined" ? navigator.onLine : true);

function matchByDay(matches) {
  const out = {};
  (matches || []).forEach(g => {
    if (!g || !g.opp) return;
    // dmyKey chi kiem khoang (d<=31), nen 31/2 van qua duoc. Lich thang ve theo
    // ngay THAT, nen doi ngay co that tren lich.
    if (!calOkDmy(g.date)) return;
    const k = dmyKey(g.date);
    if (k == null) return;
    (out[k] || (out[k] = [])).push(g);
  });
  return out;
}
function dmyKey(v) {
  const m = /^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})$/.exec(String(v == null ? "" : v).trim());
  if (!m) return null;
  const d = +m[1], mo = +m[2], y = +m[3];
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return null;
  return y * 10000 + mo * 100 + d;
}
/* Ai dang chan thuong. Truoc do app khong he co khai niem nay -- chuoi "chan
   thuong" khong ton tai o dau trong ca app -- nen mot nguoi gay tay van duoc
   Tu dong xep vao doi hinh, va ho so cua anh ta noi anh ta manh co nao chu
   khong noi anh ta co da duoc khong.

   Ghi chu la bat buoc, ngay het la tuy: doi phui it khi biet truoc bao lau.
   Co ngay va ngay do da qua thi coi nhu lanh -- khong bat ai phai nho vao xoa,
   vi cai khong ai don thi sau vai thang se sai het. */
/* Ngay co that trong lich hay khong -- `dmyKey` co y KHONG kiem viec nay (no
   chi bien mot ngay thanh mot so sap duoc), nen cho nao dua vao ngay de quyet
   dinh thi phai hoi rieng o day. */
/* Hien ngay cho THONG NHAT. App tu ghi "1/9/2026" con du lieu co san ghi
   "23/08/2026", hai kieu nam chung mot cot doc ra nhu hai nguon khac nhau.
   Chi doi CACH HIEN, khong doi thu da luu -- `dmyKey` van doc duoc ca hai. */
function dmyShow(v) {
  const s = String(v == null ? "" : v).trim();
  const m = /^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})$/.exec(s);
  if (!m) return s;
  const p2 = n => (n < 10 ? "0" : "") + n;
  return p2(+m[1]) + "/" + p2(+m[2]) + "/" + m[3];
}
function calOkDmy(v) {
  const m = /^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})$/.exec(String(v == null ? "" : v).trim());
  if (!m) return false;
  const d = +m[1], mo = +m[2], y = +m[3];
  if (mo < 1 || mo > 12 || d < 1) return false;
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const dim = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1];
  return d <= dim;
}
/* CHI DAO CA NHAN: da nam trong vai, hay choi voi vai?

   Modal Player Instructions cua Football Manager to bon trang thai bang mau:
   Selected · Part Of Role · Conflicting · Unavailable -- nen doi truong biet
   ngay chi do nao la THUA (vai da lam roi) va chi dao nao DA NHAU voi vai. App
   nay ve ba o tick giong het nhau: bat "Dang bien" cho mot hau ve dang duoc
   giao "Thu chac -- khong dang qua nua san" thi khong gi bao, va hai lenh nguoc
   nhau cung ton tai am tham cho toi khi ra san moi lo.

   App CO `tacticConflicts`, nhung do la xung khac cap DOI (chi dao doi choi
   nhau). Cai thieu la cap CA NHAN: chi dao nay choi voi VAI cua chinh nguoi do.

   Bang khai tuong minh chu khong suy tu toa do `dx`: doc duoc, sua duoc, va
   khong bien mot con so canh chinh giao dien thanh mot luat an. */
const EXTRA_RULE = {
  wide: { part: ["fb:wide", "fw:wideout"],
          conflict: ["fb:invert", "fb:safe", "cb:stay", "mid:hold"] },
  free: { part: ["mid:box", "fw:drop"],
          conflict: ["cb:stay", "mid:hold", "fb:safe", "gk:keep"] },
  man:  { part: [], conflict: [] }
};
function extraState(key, grp, roleKey, tactic) {
  const r = EXTRA_RULE[key];
  if (!r) return "";
  const id = String(grp || "") + ":" + String(roleKey || "");
  if (r.conflict.indexOf(id) >= 0) return "conflict";
  if (r.part.indexOf(id) >= 0) return "part";
  /* "Kem nguoi" rieng cho mot nguoi la thua khi ca doi da kem nguoi -- do la
     luat theo chi dao DOI chu khong theo vai, nen no nam ngoai bang tren. */
  if (key === "man" && insOf(tactic, "mark") === "man") return "part";
  return "";
}
/* PHAN TICH TRAN GAN DAY -- ket luan, khong phai bang dem.

   Football Manager de mot khoi "Recent Matches Analysis" ngay duoi san o man
   Tactics, chia san hai cot TICH CUC / TIEU CUC ("Goals Conceded Location -
   Penalty Area Centre"). App nay CO san so lieu (tallyBy theo so do, theo cach
   da) nhung chi DEM, va o mot man khac -- doi truong phai tu nhin bang roi tu
   rut ra ket luan, tuc lam ho app phan viec kho nhat.

   Cai FM co ma ta khong co la toa do tren san. Cai TA co ma FM khong co la doi
   phui that: san nha/san khach, so do, cach da, va PHUT ghi ban (co trong
   `events[].min`). Ket luan tu nhung thu do la ket luan that.

   Hai luat cung, vi day la cho de bia nhat trong ca app:
     - Mot nhom phai co it nhat `minN` tran moi duoc noi. Hai tran thang lien
       khong phai la mot xu huong.
     - Moi cau deu mang co mau ("4 tran"), de nguoi doc tu biet no nang bao nhieu. */
function matchInsights(matches, opts) {
  const o = opts || {};
  const take = o.take || 10, minN = o.minN || 3;
  const list = matchOrder(matches).map(x => x.m).slice(0, take)
    .filter(g => g && isFinite(parseFloat(g.gf)) && isFinite(parseFloat(g.ga)));
  const pos = [], neg = [];
  const n = list.length;
  if (n < minN) return { pos: pos, neg: neg, sample: n, thin: true };
  const pts = g => (+g.gf > +g.ga ? 3 : (+g.gf === +g.ga ? 1 : 0));
  const avg = arr => arr.reduce((s, v) => s + v, 0) / arr.length;
  /* Ghi va thung: con so de nhat, va la cau dau tien moi doi truong hoi. */
  const gf = avg(list.map(g => +g.gf || 0)), ga = avg(list.map(g => +g.ga || 0));
  const r1 = (x) => Math.round(x * 10) / 10;
  if (gf - ga >= 0.5) pos.push({ text: "Ghi nhiều hơn thủng", detail: r1(gf) + " bàn mỗi trận, thủng " + r1(ga) + " · " + n + " trận" });
  if (ga - gf >= 0.5) neg.push({ text: "Thủng nhiều hơn ghi", detail: "thủng " + r1(ga) + " mỗi trận, ghi " + r1(gf) + " · " + n + " trận" });
  /* Nhom theo mot khoa, chi noi khi ca hai nhom du co mau va lech ro. */
  const cmp = (key, label, nice) => {
    const by = {};
    list.forEach(g => { const k = key(g); if (!k) return; (by[k] = by[k] || []).push(g); });
    const ks = Object.keys(by).filter(k => by[k].length >= minN);
    if (ks.length < 2) return;
    const sc = ks.map(k => ({ k: k, n: by[k].length, p: avg(by[k].map(pts)) })).sort((x, y) => y.p - x.p);
    const best = sc[0], worst = sc[sc.length - 1];
    if (best.p - worst.p < 0.8) return;
    pos.push({ text: label + ": " + nice(best.k) + " ăn hơn", detail: r1(best.p) + " điểm/trận qua " + best.n + " trận" });
    neg.push({ text: label + ": " + nice(worst.k) + " không ăn", detail: r1(worst.p) + " điểm/trận qua " + worst.n + " trận" });
  };
  cmp(g => g.venue, "Sân", k => String(k));
  cmp(g => g.formation, "Sơ đồ", k => String(k));
  cmp(g => g.mentality, "Cách đá", k => ({ def: "phòng ngự", bal: "cân bằng", att: "tấn công" }[k] || String(k)));
  /* Phut ghi ban -- thu duy nhat o day co do phan giai theo thoi gian. */
  const mins = [];
  list.forEach(g => (g.events || []).forEach(e => {
    if (e && e.kind === "goal" && isFinite(parseFloat(e.min))) mins.push(+e.min);
  }));
  if (mins.length >= minN) {
    const late = mins.filter(m => m >= 60).length, early = mins.filter(m => m < 30).length;
    if (late / mins.length >= 0.5) pos.push({ text: "Lên chân cuối trận", detail: late + "/" + mins.length + " bàn ghi từ phút 60" });
    if (early / mins.length >= 0.5) pos.push({ text: "Vào trận nhanh", detail: early + "/" + mins.length + " bàn ghi trước phút 30" });
  }
  return { pos: pos, neg: neg, sample: n, thin: false };
}
/* SAO THEO VAI -- "nguoi nay hop o NAY den dau", thang 0-5 nhu Football Manager.

   FM cham moi nguoi 0-5 sao CHO DUNG VAI DANG CHON, nen doi truong quet mat mot
   nhip la biet ai hop o nay nhat. App nay truoc do chi co BA muc, va chung nam
   trong mau vien o (trang = so truong, cam = da duoc, do = lech tuyen) -- doc
   duoc, nhung khong xep hang duoc: hai nguoi cung "so truong" thi vien giong het
   nhau du mot nguoi hon han nguoi kia.

   Sao dung hai thu app biet that, khong bia:
     - hop vi tri, lay tu `fitCost` da co (0 so truong / 3 da duoc / >=4 lech)
     - chi so cua dung tuyen do, trung binh tren nhung chi so lien quan

   Chua cham DU chi so cua tuyen do thi tra `rated:false` va KHONG in sao -- y
   het ky luat cua the cau thu: mot nguoi moi cham 1/12 chi so khong duoc hien ra
   nhu da duoc danh gia. Do la ly do ham tra ca `rated` chu khong chi tra so. */
const ROLE_ATTRS = {
  "TM": ["gk", "position", "spirit", "strength", "pace"],
  "HV": ["defend", "header", "position", "strength", "pace"],
  "TV": ["pass", "position", "stamina", "dribble", "spirit"],
  "TĐ": ["finish", "shot", "dribble", "pace", "strength"]
};
function roleStars(m, role) {
  const keys = ROLE_ATTRS[role];
  const at = (m && m.attrs) || {};
  if (!keys) return { rated: false, stars: 0, value: null, fit: null };
  /* `posOf` la bien CUC BO trong renderVals, khong dung duoc o ham thuan -- suy
     lai bang dung logic do tu `parsePos` (toan cuc). */
  const p = (m && m.posMain !== undefined)
    ? { main: m.posMain || "", alt: (m && m.posAlt) || [] }
    : parsePos((m && m.pos) || "");
  /* Chua ro vi tri thi app KHONG BIET anh ta hop o nao -- khac han voi "hop it".
     Tra rated:false de khong ai doc mot con so ra tu cho trong. */
  if (fitUnknown(p)) return { rated: false, stars: 0, value: null, fit: null };
  const vals = keys.map(k => parseFloat(at[k]));
  if (vals.some(v => !isFinite(v))) return { rated: false, stars: 0, value: null, fit: fitCost(p, role) };
  const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
  const cost = fitCost(p, role);
  /* Phat theo muc hop vi tri. Mot tien dao gioi dung o hau ve van la mot tien
     dao dung sai cho, va cai the phai noi ra dieu do chu khong chi noi anh ta
     gioi. Nua sao cho "da duoc", mot sao ruoi cho "lech tuyen". */
  const pen = cost === 0 ? 0 : (cost <= 3 ? 0.5 : 1.5);
  /* `starCount` da la cach app doi diem 1-20 ra sao o moi cho khac -- dung lai
     no de mot nguoi 14 diem ra cung so sao du doc o the cau thu hay o day. */
  const raw = Math.max(0, starCount(avg) - pen);
  return { rated: true, stars: Math.round(raw * 2) / 2, value: Math.round(avg), fit: cost };
}
/* Ve thanh chuoi doc duoc, khong phu thuoc phong chu co icon.
   Ten `starGlyphs` chu KHONG phai `starText`: `starText` da ton tai va tra mot
   thu khac han ("3,5 sao"). Trung ten thi dinh nghia sau de dinh nghia truoc va
   pha moi cho dang goi -- da suyt dinh dung vay. */
function starGlyphs(n) {
  const s = Math.max(0, Math.min(5, +n || 0));
  const full = Math.floor(s), half = (s - full) >= 0.5;
  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(5 - full - (half ? 1 : 0));
}
/* TOI NAY NGUOI NAY RA SAN DUOC KHONG -- suy tu tran da da, khong bia chi so.

   Football Manager tra loi cau nay bang BON cot trong bang chon nguoi: INF (tin
   tuc: chan thuong, treo gio), CON (the luc), SHP (do nhay ben), MO (tinh than).
   App nay truoc do co KHONG cot nao -- doi truong nhin bang chi thay diem va vi
   tri, tuc "anh ta gioi co nao", khong thay "toi nay anh ta the nao".

   Nhung ba trong bon cot kia la chi so cua mot tro mo phong: khong ai do the luc
   hay tinh than cua mot doi phui, va in mot con so nhu the ra la bia. Cai app NAY
   biet that, tu so tran da luu, la HAI dieu:

     - da lien may buoi roi (da nhieu buoi lien tiep = chan, nen cho nghi)
     - bao lau chua ra san (lau qua = nguoi ta se hoi vi sao khong duoc goi)

   Mot cot noi dung hai dieu do thi tot hon bon cot trong do ba cot bia.

   Dem tren danh sach tran SAP THEO NGAY THAT (moi nhat truoc), va "co da" dung
   chung dinh nghia voi moi cho khac trong app: `playedIds` = diem danh, su kien,
   hoac co ten trong doi hinh. `rest` = so tran gan day LIEN TIEP ma nguoi do
   khong co ten; `streak` = so tran gan day lien tiep co ten. Chua tran nao thi
   ca hai la 0 va `never` bat -- khac han voi "vua nghi mot tran". */
function readiness(memberId, matches, opts) {
  const o = opts || {};
  const restMax = o.restMax || 4;
  const streakMax = o.streakMax || 3;
  const list = matchOrder(matches).map(x => x.m);
  const idIn = g => playedIds(null, g && g.events, g && g.xi).indexOf(+memberId) >= 0;
  let rest = 0, streak = 0, lastDate = "", seen = false;
  for (let i = 0; i < list.length; i++) {
    if (idIn(list[i])) { seen = true; lastDate = String(list[i].date || ""); break; }
    rest++;
  }
  if (seen) {
    for (let i = rest; i < list.length; i++) { if (!idIn(list[i])) break; streak++; }
  }
  return { played: seen, never: !seen, rest: seen ? rest : list.length,
           streak: streak, lastDate: lastDate,
           tired: streak >= streakMax, cold: seen && rest >= restMax };
}
/* Mot nhan duy nhat cho cot do. Thu tu uu tien la thu tu doi truong can biet:
   khong da duoc > can cho nghi > lau chua duoc goi > san sang. */
function readyTag(m, matches, todayDmy, opts) {
  const hu = hurtInfo(m, todayDmy);
  if (hu) return { key: "hurt", label: hu.label, tip: hu.note, color: "#FF6B57" };
  const r = readiness(m && m.id, matches, opts);
  if (r.never) return { key: "never", label: "Chưa ra sân", tip: "Chưa có tên trong trận nào đã ghi.", color: "rgba(250,250,255,0.55)" };
  if (r.tired) return { key: "tired", label: "Đá " + r.streak + " buổi liền", tip: "Đá " + r.streak + " buổi gần nhất liên tiếp — cân nhắc cho nghỉ.", color: "#F79009" };
  if (r.cold) return { key: "cold", label: "Nghỉ " + r.rest + " buổi", tip: "Không có tên trong " + r.rest + " trận gần nhất. Lần cuối: " + r.lastDate + ".", color: "#6990FF" };
  return { key: "ready", label: "Sẵn sàng", tip: "Vừa ra sân gần đây, không chấn thương.", color: "#75CE50" };
}
function hurtInfo(m, todayDmy) {
  const note = String((m && m.hurt) || "").trim();
  if (!note) return null;
  /* Ngay khong co that thi coi nhu CHUA RO, khong phai da lanh. `dmyKey` chi
     kiem khoang 1-31 nen "31/2/2026" van ra mot so -- va so do nho hon hom nay,
     nen chip chan thuong bien mat trong khi ghi chu van con nam do. Mot ngay
     nguoi ta go nham khong duoc phep tu chua lanh cho ai. */
  const to = calOkDmy(m && m.hurtTo) ? dmyKey(m && m.hurtTo) : null;
  const now = dmyKey(todayDmy);
  if (to != null && now != null && to < now) return null;
  return { note: note, until: to == null ? "" : String(m.hurtTo).trim(),
           label: to == null ? "Chấn thương" : "Chấn thương · đến " + String(m.hurtTo).trim() };
}
function matchOrder(matches) {
  const key = dmyKey;
  return (Array.isArray(matches) ? matches : [])
    .map((m, i) => ({ m: m, i: i, k: key(m && m.date) }))
    .sort((a, b) => {
      if (a.k == null && b.k == null) return a.i - b.i;
      if (a.k == null) return 1;
      if (b.k == null) return -1;
      return b.k - a.k || a.i - b.i;
    });
}

/* So tien mot dong so quy. Trong tai vong 24 go "-999999999999": app bo dau
   tru bang `replace(/\D/g,"")`, lay dau tu o Thu/Chi, roi ghi thang -- so du
   doi thanh -999.994.974.999d va truc bieu do thang nhay len "1000,0ty", de
   bep moi cot that thanh vo nghia. Cung app do, o ti so tran DA chan so am va
   noi ro; hai o canh nhau ma mot cai chan mot cai nuot. */
function moneyProblem(raw) {
  const t = String(raw == null ? "" : raw).trim();
  if (t === "") return "Điền số tiền đã.";
  if (!/^[\d.,\s]+$/.test(t)) return "Số tiền phải là số — “" + t.slice(0, 20) + "” thì app không đọc được.";
  const n = parseInt(t.replace(/\D/g, ""), 10);
  if (!isFinite(n) || n <= 0) return "Số tiền phải lớn hơn 0.";
  if (n > 1000000000) return "Một dòng quỹ tới " + Math.round(n / 1e9) + " tỷ thì chắc gõ nhầm.";
  return null;
}

/* Ngay da tran. `matchDay` CO Y tra ve hom nay khi khong doc duoc, va do la
   hanh vi dung cho o DE TRONG. Nhung go "45/13" thi khong phai de trong -- app
   nhan, vut di, ghi ngay hom nay, va khong noi mot chu. Ham nay tach hai
   truong hop do ra. */
function dayProblem(raw) {
  const t = String(raw == null ? "" : raw).trim();
  if (t === "") return null;
  const m = /^(\d{1,2})\s*[\/\-.]\s*(\d{1,2})(?:\s*[\/\-.]\s*(\d{2,4}))?$/.exec(t);
  if (!m) return "Ngày phải viết dạng ngày/tháng, ví dụ 28/8 — “" + t.slice(0, 20) + "” thì app không đọc được.";
  const d = +m[1], mo = +m[2];
  if (mo < 1 || mo > 12) return "Không có tháng " + mo + ".";
  if (d < 1 || d > 31) return "Không có ngày " + d + ".";
  const dim = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1];
  if (d > dim) return "Tháng " + mo + " không có ngày " + d + ".";
  return null;
}

/* Canh bao mem: khong chan, chi noi ra. Tra chuoi rong khi khong co gi de noi. */
function memberWarning(f, roster, selfId) {
  if (!Array.isArray(roster)) return "";
  const num = String((f && f.num) != null ? f.num : "").trim();
  if (!num) return "";
  const dup = roster.find(m => m && m.id !== selfId && !m.hidden && String(m.num || "").trim() === num);
  return dup ? " Lưu ý: " + (dup.name || "một người khác") + " cũng mang áo số " + num + "." : "";
}

/* Mot buoi cua mot lich co no ra vao ngay nay khong. `skip` la danh sach ngay
   da bo rieng le -- co no thi "Bo buoi" cua mot buoi trong lich hang tuan moi bo
   duoc dung buoi do. Truoc day no xoa ca dinh nghia lich: trong tai vong 27 bam
   bo buoi 9/9 va mat sach 16/9, 23/9, 30/9 lan ca lich co dinh. Cuu duoc nho
   Hoan tac, nhung Hoan tac chi song khoang mot giay. */
function occHit(e, d, base, iso) {
  if (!e) return false;
  if ((e.skip || []).indexOf(iso) >= 0) return false;
  return e.repeat === "weekly" ? (d >= base && d.getDay() === base.getDay()) : (iso === e.date);
}

/* Chu cuoi cua ten, sau khi bo phan trong ngoac va dau cau o duoi. */
function shortName(v) {
  const t = String(v == null ? "" : v).replace(/[\(\[\{][^\)\]\}]*[\)\]\}]?/g, " ").trim();
  const w = (t || String(v || "")).trim().split(/\s+/).filter(Boolean);
  const last = w.length ? w[w.length - 1] : "";
  return last.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "") || last;
}

/* Chi cho di theo http(s). Trong tai vong 26 go `javascript:alert(1)` vao o
   link Drive: app dung ngay mot the <a href="javascript:..."> song, luu thang
   vao may, khong canh bao gi. App nay phat cho ca doi 36 nguoi -- mot cai nut
   "Mo Drive" chay ma nguoi bam khong the doan duoc la vector that.

   Cung app do, link Maps cua buoi da DA kiem `^https?://` tu truoc. Lai dung
   kieu mot cho kiem, cho kia khong.

   Tra chuoi rong khi khong an toan, de noi goi tu quyet dinh: cho hien la link
   hay khong. Khong tu sua chuoi cua nguoi ta. */
function safeUrl(v) {
  const t = String(v == null ? "" : v).trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : "";
}

/* Ho so mot nguoi. Trong tai vong 25 them duoc mot thanh vien voi so ao -5,
   so dien thoai "abcxyz" va ngay sinh 99/99/9999 -- ca ba luu nguyen va hien
   nguyen o Danh sach lan Ho so, khong mot cau canh bao. Rieng so dien thoai la
   nang nhat: chinh app ghi "so dien thoai la tai khoan dang nhap cua ho", nen
   mot so sai dinh dang nghia la nguoi do khong bao gio dang nhap duoc, ma khong
   ai biet cho toi luc ho thu.

   Tra null khi hop le, tra CAU noi sai o dau khi khong. O de trong deu cho qua:
   doi phui khong phai ai cung co so ao hay chiu khai ngay sinh. */
function memberProblem(f, roster, selfId) {
  const t = k => String((f && f[k]) != null ? f[k] : "").trim();
  if (!t("name")) return "Nhập tên đã.";

  const num = t("num");
  if (num) {
    if (!/^\d{1,3}$/.test(num)) return "Số áo phải là số từ 0 đến 99 — “" + num.slice(0, 12) + "” thì app không đọc được.";
    if (+num > 99) return "Số áo tới " + num + " thì chắc gõ nhầm.";
  }

  /* So VN: 9 den 11 chu so, cho phep dau cach va dau cham nguoi ta hay go, cho
     phep ca +84. Khong ep dau so vi doi co the luu so ban be tinh khac. */
  const phone = t("phone").replace(/[\s.\-()]/g, "");
  if (phone) {
    if (!/^(\+?84|0)?\d{8,11}$/.test(phone)) return "Số điện thoại chỉ gồm chữ số — “" + t("phone").slice(0, 16) + "” thì không đăng nhập được.";
  }

  const dob = t("dob");
  if (dob) {
    const m = /^(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{4})$/.exec(dob);
    if (!m) return "Ngày sinh viết dạng ngày/tháng/năm, ví dụ 12/03/1996.";
    const d = +m[1], mo = +m[2], y = +m[3];
    if (mo < 1 || mo > 12) return "Không có tháng " + mo + ".";
    const dim = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1];
    if (d < 1 || d > dim) return "Tháng " + mo + " không có ngày " + d + ".";
    const now = new Date().getFullYear();
    if (y < 1900 || y > now) return "Năm sinh " + y + " thì chắc gõ nhầm.";
  }

  /* Ngay nghi den phai co that. Chan o day chu khong chi bo qua luc doc: mot
     ngay khong co that ma van luu duoc thi lan sau nguoi khac mo ra se thay
     "nghi den 31/2" va khong biet nen tin cai gi. */
  const hto = t("hurtTo");
  if (hto && !calOkDmy(hto.replace(/[\-.]/g, "/"))) {
    const mm = /^(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{4})$/.exec(hto);
    return mm ? ("Tháng " + (+mm[2]) + " không có ngày " + (+mm[1]) + ".")
              : "Ngày nghỉ đến viết dạng ngày/tháng/năm, ví dụ 30/9/2026.";
  }
  if (hto && !t("hurt")) return "Đã ghi ngày nghỉ đến thì ghi luôn chấn thương gì.";
  /* Trung so dien thoai la nang nhat trong ba cai duoi day: chinh app ghi "so
     dien thoai la tai khoan dang nhap cua ho", nen hai nguoi chung mot so la hai
     nguoi tranh nhau mot tai khoan. Chan han.

     Trung so ao thi chi CANH BAO chu khong chan -- doi phui hay co hai ao giong
     so that, va nguoi nhap la doi truong, ho biet doi ho hon app. */
  if (Array.isArray(roster)) {
    const norm = v => String(v == null ? "" : v).replace(/[\s.\-()]/g, "").replace(/^\+?84/, "0");
    const others = roster.filter(m => m && m.id !== selfId && !m.hidden);
    if (phone) {
      const dup = others.find(m => norm(m.phone) && norm(m.phone) === norm(phone));
      if (dup) return "Số này đã là tài khoản của " + (dup.name || "một người khác") + ". Hai người chung một số thì không ai đăng nhập yên được.";
    }
  }
  return null;
}

/* Ti so nguoi ta go vao co doc ra mot tran that duoc khong. Truoc do "-5" va
   "-3" bi `Math.max(0, ...)` lang le keo ve 0, roi app luu MOT TRAN THAT ti so
   0-0 va bao "Da luu tran 0-0" -- go rac vao thi app tu don rac thanh du lieu
   trong khi nguoi go khong he biet minh vua tao ra cai gi. Cung mot man do da
   chan dung khi bo trong ten doi thu; hai o canh nhau ma mot cai noi mot cai
   nuot la khong nhat quan.

   Tra null khi hop le, tra CAU noi sai o dau khi khong. Chuoi rong = 0 ban, do
   la cach nguoi ta ghi mot tran thua trang. */
function scoreProblem(gfRaw, gaRaw) {
  const one = (raw, who) => {
    const t = String(raw == null ? "" : raw).trim();
    if (t === "") return null;
    if (!/^\d+$/.test(t)) return "Tỉ số " + who + " phải là số không âm — “" + t + "” thì app không đọc được.";
    if (parseInt(t, 10) > 99) return "Tỉ số " + who + " tới " + t + " thì chắc gõ nhầm.";
    return null;
  };
  return one(gfRaw, "đội mình") || one(gaRaw, "đối thủ");
}

/* Phut cua mot su kien. Ngoai khoang thi NOI RA chu khong lang le bo di: go 999
   roi thay dong su kien hien "chua ro phut" doc ra nhu app khong nhan duoc phut,
   trong khi that ra no nhan roi va vut di. */
function minuteProblem(raw) {
  const t = String(raw == null ? "" : raw).trim();
  if (t === "") return null;
  if (!/^\d+$/.test(t)) return "Phút phải là số — “" + t + "” thì app không đọc được.";
  const n = parseInt(t, 10);
  return n > 200 ? "Phút " + n + " thì dài hơn cả trận đấu." : null;
}

/* Mot dong tom tat chuyen da xay ra trong MOT tran, de doc canh ti so.
   Trong tai vong 11: bang lich su tran chi in ngay · san · doi thu · ti so, con
   ban/kien tao/the/MVP cua chinh tran do thi app luu (`match.events`) ma khong
   hien o dau. `nameOf(id)` do noi goi dua vao -- ham nay khong biet gi ve
   danh sach thanh vien, nen test duoc khong can app. Thu tu: ban -> kien tao ->
   MVP -> the do -> the vang -> phan luoi; nguoi ghi nhieu ban in "x2". Ai khong
   con trong doi (nameOf tra rong) thi in "#id" chu khong bo qua -- bo qua la
   lam tran mat ban. */
function matchEvSummary(events, nameOf) {
  const list = Array.isArray(events) ? events.filter(e => e && e.kind) : [];
  if (!list.length) return "";
  const nm = id => { const n = nameOf ? nameOf(id) : ""; return n ? String(n).trim().split(/\s+/).pop() : "#" + id; };
  const count = kind => {
    const by = {};
    list.filter(e => e.kind === kind).forEach(e => { const k = String(e.who); by[k] = (by[k] || 0) + 1; });
    return Object.keys(by).map(k => nm(isNaN(+k) ? k : +k) + (by[k] > 1 ? " x" + by[k] : ""));
  };
  const parts = [];
  const g = count("goal");   if (g.length) parts.push("⚽ " + g.join(", "));
  const a = count("assist"); if (a.length) parts.push("KT " + a.join(", "));
  const m = count("mvp");    if (m.length) parts.push("MVP " + m.join(", "));
  const r = count("red");    if (r.length) parts.push("Đỏ " + r.join(", "));
  const y = count("yellow"); if (y.length) parts.push("Vàng " + y.join(", "));
  const o = count("og");     if (o.length) parts.push("PL " + o.join(", "));
  return parts.join(" · ");
}

/* Dong theo-tung-tran cua MOT nguoi, doc tu cac tran doi da ghi.
   Trong tai vong 12: ho so chi co mot dai 5 con so cong don, 0 hang "tran nao ·
   da khong · ban · the" -- trong khi app da giu tung tran kem `xi` (ai ra san)
   va `events` (ai ghi gi). Mot nguoi TINH LA co da khi ten nam trong `xi` HOAC
   co it nhat mot su kien mang ten minh (ghi ban ma khong trong xi = vao tu du
   bi). Tran khong co ca hai thi khong lien quan toi nguoi nay -> bo qua, khong
   bia dong "vang". Ket qua moi nhat len tren. */
function memberMatchRows(matches, id) {
  const want = String(id);
  const out = [];
  (Array.isArray(matches) ? matches : []).forEach(g => {
    if (!g) return;
    const inXi = Array.isArray(g.xi) && g.xi.some(x => String(x) === want);
    const evs = (Array.isArray(g.events) ? g.events : []).filter(e => e && String(e.who) === want);
    if (!inXi && !evs.length) return;
    const n = k => evs.filter(e => e.kind === k).length;
    const gf = parseFloat(g.gf), ga = parseFloat(g.ga);
    const has = isFinite(gf) && isFinite(ga);
    out.push({
      _k: dmyKey(g.date),
      opp: String(g.opp || g.date || "-"), date: g.opp ? dmyShow(g.date) : "",
      score: has ? gf + "-" + ga : "",
      result: !has ? "" : gf > ga ? "T" : gf === ga ? "H" : "B",
      started: inXi,
      goals: n("goal"), assists: n("assist"), mvp: n("mvp") > 0,
      y: n("yellow"), r: n("red"), og: n("og")
    });
  });
  /* Cu toi moi, tran khong co ngay doc duoc thi xuong cuoi theo dung thu tu no
     da nam -- chu khong bi coi nhu ngay 0 va nhay len dau. */
  return out
    .map((r, i) => ({ r: r, i: i }))
    .sort((a, b) => {
      if (a.r._k == null && b.r._k == null) return a.i - b.i;
      if (a.r._k == null) return 1;
      if (b.r._k == null) return -1;
      return a.r._k - b.r._k || a.i - b.i;
    })
    .map(x => x.r);
}

/* Phong do gan day cua MOT nguoi, suy tu du lieu da co -- khong them o nhap
   nao. FM mo dau ho so bang "tuan nay anh ta the nao"; app truoc do mo dau bang
   12 chi so ky thuat, tuc la noi anh ta gioi co nao chu khong noi anh ta dang
   the nao. Lay N tran gan nhat NGUOI DO co ten, dem thang-hoa-bai va dong gop.

   Co y KHONG bia ra mot con so "diem tran" kieu Av Rat cua FM: khong ai cham
   diem tung tran o giai phui, va bia mot con so nhu the la khang dinh thu app
   khong biet. Dem viec da xay ra thi that. */
function formSummary(rows, n) {
  const list = (Array.isArray(rows) ? rows : []).slice(-(n > 0 ? n : 5));
  if (!list.length) return null;
  const out = { games: list.length, w: 0, d: 0, l: 0, goals: 0, assists: 0, mvp: 0, cards: 0 };
  list.forEach(r => {
    if (r.result === "T") out.w++; else if (r.result === "H") out.d++; else if (r.result === "B") out.l++;
    out.goals += (+r.goals || 0);
    out.assists += (+r.assists || 0);
    out.mvp += r.mvp ? 1 : 0;
    out.cards += (+r.y || 0) + (+r.r || 0);
  });
  const bits = [];
  if (out.w || out.d || out.l) bits.push(out.w + "T " + out.d + "H " + out.l + "B");
  if (out.goals) bits.push(out.goals + " bàn");
  if (out.assists) bits.push(out.assists + " kiến tạo");
  if (out.mvp) bits.push(out.mvp + " lần hay nhất");
  if (out.cards) bits.push(out.cards + " thẻ");
  out.line = list.length + " trận gần nhất: " + (bits.length ? bits.join(" · ") : "chưa ghi gì thêm");
  return out;
}
function statCell(v) {
  const n = parseFloat(v);
  return isFinite(n) && n > 0 ? String(Math.round(n)) : "—";
}

function radarPoints(vals, max, cx, cy, r) {
  const list = vals || [], n = list.length, m = max > 0 ? max : 20;
  if (!n) return "";
  const rd = v => Math.round(v * 10) / 10;
  return list.map((v, i) => {
    const a = -Math.PI / 2 + i * 2 * Math.PI / n;
    const num = parseFloat(v);
    const k = Math.min(Math.max(isFinite(num) ? num : 0, 0), m) / m;
    return rd(cx + Math.cos(a) * r * k) + "," + rd(cy + Math.sin(a) * r * k);
  }).join(" ");
}

/* ---------- Chi doc nhung chi so DA DUOC CHAM ----------

   The cau thu tung in "Tan cong 15 · Re dat 15 · Duong truyen 15" cho mot nguoi
   ma ngay duoi do ghi "1/12 chi so da cham": ca hai phep tinh deu muon `m.rating`
   (diem cu nhap tay) dien vao o trong, roi in ket qua ra nhu mot ket luan ve
   nguoi do. `ratingOf` muon la co y -- no can mot con so duy nhat de xep hang --
   nhung THE thi dang liet ke tung chi so mot, va o trong khong co gi de liet ke.

   ratedTop: n chi so cao nhat trong so nhung o co so that. Duoi hai o, hoac moi
   o deu bang nhau, thi khong co "manh nhat" nao ca -- tra mang rong.
   ratedAvg: trung binh mot nhom, va CHI khi ca nhom da cham du. Nua nhom la so
   that nua nhom la diem cu thi thanh bar ve ra khong noi ve ai. */
function ratedTop(attrs, list, n) {
  const at = attrs || {};
  const rows = (list || []).map(a => [a.label, parseFloat(at[a.key])])
    .filter(r => isFinite(r[1]));
  if (rows.length < 2) return [];
  const vals = rows.map(r => r[1]);
  if (Math.max.apply(null, vals) === Math.min.apply(null, vals)) return [];
  return rows.sort((x, y) => y[1] - x[1]).slice(0, n > 0 ? n : 3);
}
/* Vi tri cua mot nguoi, doc duoc ca ban ghi cu (chuoi `pos`) lan moi (`posMain`).
   Mot cho duy nhat, de khong noi nao doan kieu khac. */
/* Bang vinh danh. Doi phui khong co bang xep hang chinh thuc nao, nhung app da
   luu du: moi nguoi co so tran, ban thang, kien tao, so lan hay nhat tran. Truoc
   day khong mot man nao doc nhung con so do len thanh TEN NGUOI -- "Phong truyen
   thong" chi co tu danh hieu cua DOI (dang trong) va danh sach ket qua tran.

   Bon nguyen tac, deu la chuyen "khong noi cai minh khong biet":
   - Hang muc nao ca doi deu 0 thi KHONG trao -- bo han hang muc do, khong trao
     ngoi vua pha luoi cho mot nguoi ghi 0 ban.
   - Bang diem thi CA HAI cung dung dau, khong boc bua mot nguoi.
   - Nguoi bam duoi lay hai muc diem KE TIEP (khong phai hai nguoi ke tiep), nen
     ba nguoi cung 3 ban khong day nhau ra khoi bang.
   - `per` chi tinh khi da da >= 3 tran; duoi do "1 ban / 1 tran" khong noi len gi. */
const HONOURS = [
  { key: "goals",   title: "VUA PHÁ LƯỚI",   unit: "bàn",       per: true },
  { key: "assists", title: "VUA KIẾN TẠO",   unit: "kiến tạo",  per: true },
  { key: "mvp",     title: "HAY NHẤT TRẬN",  unit: "lần",       per: false },
  { key: "games",   title: "CHUYÊN CẦN",     unit: "trận",      per: false }
];
const HONOUR_MIN_GAMES = 3;

function honourBoard(members) {
  /* Khong dung `num`/`str` o day: bo kiem thu chi nap doan nguon giua POS_CODES va
     FORMATIONS, hai ham guard do nam ngoai doan ay. Ep kieu tai cho, vai dong. */
  const n0 = v => { const x = parseFloat(v); return isFinite(x) && x > 0 ? x : 0; };
  const list = (members || []).filter(m => m && !m.hidden);
  return HONOURS.map(h => {
    const vals = list.map(m => ({ m: m, v: n0(m[h.key]) })).filter(x => x.v > 0);
    if (!vals.length) return null;
    /* Hoa diem thi phai co cach pha hoa, va phai la CUNG mot cach voi bang xep
       hang o man Thong ke. Truoc do o day chi so sanh `b.v - a.v` nen thu tu con
       lai do vi tri trong mang quyet dinh, con Thong ke lai pha hoa bang diem
       danh gia -- trong tai vong 26 doc ra hai thu tu khac nhau cho cung mot bo
       so: Phong truyen thong xep Hoang Tien Dung truoc Ly Thanh Trung, Thong ke
       xep nguoc lai. Ten dung lam nac cuoi de thu tu la toan phan, khong con phu
       thuoc vao mang vao truoc hay sau. */
    const sorted = vals.slice().sort((a, b) =>
      b.v - a.v
      || (parseFloat(b.m.rating) || 0) - (parseFloat(a.m.rating) || 0)
      || String(a.m.name || "").localeCompare(String(b.m.name || ""), "vi"));
    const best = sorted[0].v;
    const top = sorted.filter(x => x.v === best);
    const tiers = [];
    sorted.forEach(x => { if (x.v !== best && tiers.indexOf(x.v) < 0 && tiers.length < 2) tiers.push(x.v); });
    const rest = sorted.filter(x => tiers.indexOf(x.v) >= 0);
    const games = n0(top[0].m.games);
    return {
      key: h.key, title: h.title, unit: h.unit,
      value: best,
      names: top.map(x => x.m.name),
      nums: top.map(x => String(x.m.num == null ? "" : x.m.num)),
      per: (h.per && games >= HONOUR_MIN_GAMES && top.length === 1)
        ? (Math.round(best / games * 10) / 10) : null,
      games: games,
      photo: (top.length === 1 ? (top[0].m.photo || "") : ""),
      rest: rest.map(x => ({ name: x.m.name, value: x.v }))
    };
  }).filter(Boolean);
}

function isKeeper(m) {
  if (!m) return false;
  const main = m.posMain !== undefined ? (m.posMain || "") : ((parsePos(m.pos) || {}).main || "");
  return main === "GK";
}

/* Trung binh CUA NHOM, tinh theo vi tri. Nhom "PHONG NGU" chua ca `gk` (Bat gon),
   nen mot trung ve co Phong ngu 17 / Khong chien 16 / Chon vi tri 15 / Bat gon 3
   ra "PHONG NGU 13" -- ngay ben duoi chinh no in "Phong ngu 17". Mot con so mang
   ten "phong ngu" ma doc ra 13 cho nguoi phong ngu 17 thi khong phai thu do.
   Bat gon chi tinh cho thu mon; hang chi so van in day du ca 12 dong nhu cu, day
   chi la con so TOM TAT. */
function posAvg(attrs, list, keeper) {
  return ratedAvg(attrs, (list || []).filter(a => a.key !== "gk" || keeper));
}
function ratedAvg(attrs, list) {
  const at = attrs || {};
  const vals = (list || []).map(a => parseFloat(at[a.key]));
  if (!vals.length || vals.some(v => !isFinite(v))) return null;
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
}

const ATTRS = [
  { key:"finish", label:"Tấn công" },
  { key:"dribble", label:"Rê dắt" },
  { key:"pass", label:"Đường truyền" },
  { key:"shot", label:"Sút xa" },
  { key:"defend", label:"Phòng ngự" },
  { key:"header", label:"Không chiến" },
  { key:"position", label:"Chọn vị trí" },
  { key:"gk", label:"Bắt gôn" },
  { key:"stamina", label:"Thể lực" },
  { key:"pace", label:"Tốc độ" },
  { key:"strength", label:"Tì đè" },
  { key:"spirit", label:"Tinh thần" }
];
/* Ma ngan 12 chi so, dung cho tieu de cot bang Thanh vien o man >=1600px. Bang
   doi hinh cua FM xep tung chi so thanh cot rieng; app truoc do chi co ba o trung
   binh nhom, nen 435px moi hang la khoang trong trong o ten. Tieu de day du van
   con o thuoc tinh title. */
const attrTone = v => v >= 16 ? "#C1D439" : (v >= 12 ? "#6990FF" : (v >= 9 ? "rgba(250,250,255,0.8)" : "#F79009"));
const ATTR_SHORT = {
  finish: "CÔNG", dribble: "RÊ", pass: "TRUYỀN", shot: "SÚT", defend: "THỦ",
  header: "ĐẦU", position: "V.TRÍ", gk: "GÔN", stamina: "BỀN", pace: "TỐC",
  strength: "TÌ", spirit: "GAN"
};
/* Bao nhieu chi so da that su duoc cham. `ratingOf` co y lay diem cu lam uoc
   luong cho o trong, nen chi rieng no khong phan biet duoc "cham 12/12 ra 10
   diem" voi "chua ai cham". Man ho so can phan biet -- no la ca noi dung. */
function ratedCount(m) {
  const at = (m && m.attrs) || {};
  return ATTRS.filter(a => isFinite(parseFloat(at[a.key]))).length;
}

/* ---------- MOT CUA DUY NHAT cho moi cho IN diem/hang ra man hinh ----------

   Vong lap khep kin: `m.grp` (hang go tay tu lau) -> `m.rating` suy ra tu chinh
   hang do qua GRADE_RATING -> `ratingOf` muon `m.rating` dien vao 12 o chi so
   trong -> man hinh in lai dung cai hang go tay ban dau. App tu xac nhan chinh
   no, roi trinh bay ket qua nhu mot ket luan. Trong doi that 35/36 nguoi co
   DUNG 0 chi so duoc cham, ma man nao cung in cho ho mot diem va mot hang.

   Loi nay da bi va bon lan o bon cho khac nhau -- moi lan mot nhanh `if` rieng
   canh mot cho in rieng -- nen khong co cua nao chan, va cho thu nam lai lot.

   Hai loai noi goi `ratingOf` KHONG giong nhau:
   - noi TINH TOAN (xep doi hinh tu dong, sap thu tu, chia hai doi can suc) can
     mot con so duy nhat de so, va khong ai DOC con so do -> muon diem cu la
     chap nhan duoc, `ratingOf` giu nguyen hanh vi.
   - noi HIEN THI in ra cho nguoi doc -> muon diem cu la noi doi, vi nguoi doc
     tin do la diem da cham.
   Moi noi hien thi di qua day. `rated` tra loi "co cham hay chua", `score`/
   `text`/`gradeText` la chu de in; cham do thi chu noi thang la con do dang. */
function ratingView(m) {
  const n = ratedCount(m);
  if (!n) return { rated: false, n: 0, rating: null, grade: "",
                   score: "—", text: "chưa chấm chỉ số", gradeText: "chưa chấm chỉ số" };
  const r = ratingOf(m), g = gradeOf(r);
  const half = n < ATTRS.length ? " · mới " + n + "/" + ATTRS.length + " chỉ số" : "";
  return { rated: true, n: n, rating: r, grade: g,
           score: String(r), text: r + "/20" + half, gradeText: "hạng " + g + half };
}
/* Trung binh cua MOT NHOM, chi tinh tren nguoi da duoc cham; null = chua ai.
   Nua nhom la so that nua nhom la diem cu thi con so trung binh do khong noi ve
   nhom nay. Bon cho dung chung: nhom hang o Danh sach, nhom tuyen o The cau
   thu, o TB cua doi hinh, va moc so sanh o ho so. */
function ratedSquadAvg(list) {
  const r = (list || []).filter(m => ratingView(m).rated);
  if (!r.length) return null;
  return Math.round(r.reduce((s, m) => s + ratingOf(m), 0) / r.length * 10) / 10;
}

const FORMATIONS = {
  "1-2-3-1": {
    roles: ["TM", "HV", "HV", "TV", "TV", "TV", "TĐ"],
    names: ["Thủ môn", "Hậu vệ", "Hậu vệ", "Tiền vệ", "Tiền vệ", "Tiền vệ", "Tiền đạo"],
    pos: [["50%","80%"], ["27%","69%"], ["73%","69%"], ["18%","45%"], ["50%","45%"], ["82%","45%"], ["50%","18%"]]
  },
  "1-3-2-1": {
    roles: ["TM", "HV", "HV", "HV", "TV", "TV", "TĐ"],
    names: ["Thủ môn", "Hậu vệ", "Trung vệ", "Hậu vệ", "Tiền vệ", "Tiền vệ", "Tiền đạo"],
    pos: [["50%","80%"], ["20%","66%"], ["50%","64%"], ["80%","66%"], ["33%","45%"], ["67%","45%"], ["50%","18%"]]
  },
  "1-2-2-2": {
    roles: ["TM", "HV", "HV", "TV", "TV", "TĐ", "TĐ"],
    names: ["Thủ môn", "Hậu vệ", "Hậu vệ", "Tiền vệ", "Tiền vệ", "Tiền đạo", "Tiền đạo"],
    pos: [["50%","80%"], ["30%","64%"], ["64%","64%"], ["30%","46%"], ["64%","46%"], ["33%","20%"], ["67%","20%"]]
  },
  "1-3-1-2": {
    roles: ["TM", "HV", "HV", "HV", "TV", "TĐ", "TĐ"],
    names: ["Thủ môn", "Hậu vệ", "Trung vệ", "Hậu vệ", "Tiền vệ trụ", "Tiền đạo", "Tiền đạo"],
    pos: [["50%","80%"], ["20%","66%"], ["50%","64%"], ["80%","66%"], ["50%","46%"], ["33%","20%"], ["67%","20%"]]
  }
};
const ATTR_GROUPS = [
  { title:"TẤN CÔNG", short:"TẤN CÔNG", keys:["finish"] },
  { title:"PHÒNG NGỰ", short:"PHÒNG NGỰ", keys:["defend"] },
  { title:"THỂ LỰC & TINH THẦN", short:"THỂ LỰC", keys:["stamina"] }
];
/* ATTRS is ordered in the same blocks ATTR_GROUPS names; each group runs from
   its anchor key up to the next group's anchor. Resolved once, here, because
   two surfaces read it now -- the profile's editable list and the squad card's
   three summary bars -- and two copies of the slicing is how they drift apart. */
const ATTR_BLOCKS = (() => {
  const idx = ATTR_GROUPS.map(g => ATTRS.findIndex(a => a.key === g.keys[0]));
  return ATTR_GROUPS.map((g, gi) => {
    const from = idx[gi] < 0 ? 0 : idx[gi];
    const to = gi + 1 < idx.length && idx[gi + 1] > from ? idx[gi + 1] : ATTRS.length;
    return { title: g.title, short: g.short, list: ATTRS.slice(from, to) };
  });
})();
/* SAU MAT cua mot cau thu, kieu the FUT -- gop tu dung 12 chi so da co, khong
   them o nhap nao va khong bia con so nao.

   Vi sao sau chu khong ba: ba nhom (Tan cong / Phong ngu / The luc) la cach mot
   bang tinh nghi, con sau mat la cach nguoi choi bong nghi -- "thang nay nhanh
   nhung khong dut diem duoc" la mot cau ai cung noi duoc, "trung binh nhom tan
   cong 13" thi khong. Moi mat lay tu chinh nhung chi so doi truong da cham, nen
   khong co thong tin moi nao duoc phat minh o day; chi la cach doc khac.

   Thu mon doi mat THU thanh BAT: `gk` chi duoc tinh cho thu mon (posAvg da lo),
   nen voi nguoi khac o do la defend+header, voi thu mon la chinh chi so bat gon.
   Mat nao chua cham DU thi tra null va the in dau gach -- y het ky luat cua ba
   thanh nhom cu: nua that nua doan thi con so do khong noi ve ai ca. */
const FACE6 = [
  { short: "TỐC", full: "Tốc độ", keys: ["pace"] },
  { short: "DỨT", full: "Dứt điểm", keys: ["finish", "shot"] },
  { short: "CHUYỀN", full: "Chuyền và chọn chỗ", keys: ["pass", "position"] },
  { short: "RÊ", full: "Rê dắt và tinh thần", keys: ["dribble", "spirit"] },
  { short: "THỦ", full: "Phòng ngự", keys: ["defend", "header"], gkShort: "BẮT", gkFull: "Bắt gôn", gkKeys: ["gk"] },
  { short: "THỂ", full: "Thể lực và tì đè", keys: ["strength", "stamina"] }
];
function faceStats(m) {
  const keeper = isKeeper(m);
  const at = (m && m.attrs) || {};
  return FACE6.map(f => {
    const keys = (keeper && f.gkKeys) ? f.gkKeys : f.keys;
    const vals = keys.map(k => parseFloat(at[k]));
    const ok = vals.length && vals.every(v => isFinite(v));
    return {
      short: (keeper && f.gkShort) ? f.gkShort : f.short,
      full: (keeper && f.gkFull) ? f.gkFull : f.full,
      value: ok ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null
    };
  });
}
/* Hang the, dat theo dung thang hang da co (S/A/B/C/D) chu khong dat them thang
   moi. Mau muon tu the bong: vang / bac / dong. Mot cai the nhin phat biet
   nguoi do o dau -- do la toan bo viec cua no. */
const CARD_TIER = {
  S: { name: "Vàng đặc biệt", bg: "linear-gradient(150deg,#3A2E05 0%,#6B5410 42%,#2A2206 100%)", edge: "rgba(232,243,0,0.55)", ink: "#F4E58A", glow: "rgba(232,243,0,0.16)" },
  A: { name: "Vàng", bg: "linear-gradient(150deg,#33290A 0%,#57450F 45%,#241C05 100%)", edge: "rgba(224,182,58,0.42)", ink: "#E8C766", glow: "rgba(224,182,58,0.12)" },
  B: { name: "Bạc", bg: "linear-gradient(150deg,#23262F 0%,#3B4050 45%,#1A1D25 100%)", edge: "rgba(214,222,238,0.34)", ink: "#D6DEEE", glow: "rgba(214,222,238,0.10)" },
  C: { name: "Đồng", bg: "linear-gradient(150deg,#2A1D14 0%,#48301F 45%,#1E1510 100%)", edge: "rgba(198,124,60,0.38)", ink: "#D89A63", glow: "rgba(198,124,60,0.10)" },
  D: { name: "Đồng", bg: "linear-gradient(150deg,#22201E 0%,#35312C 45%,#1A1917 100%)", edge: "rgba(190,180,168,0.26)", ink: "#BCB3A6", glow: "rgba(190,180,168,0.08)" }
};
function cardTier(grade) {
  return CARD_TIER[grade] || { name: "Chưa chấm", bg: "linear-gradient(150deg,#151826 0%,#1E2233 45%,#121523 100%)", edge: "rgba(255,255,255,0.12)", ink: "rgba(250,250,255,0.7)", glow: "rgba(255,255,255,0.04)" };
}
const GRADE_RANGE = { S: "17–20", A: "15–16", B: "13–14", C: "11–12", D: "dưới 11" };

/* Bảng xếp hạng ở Tổng quan nói "điểm do admin đặt", màn Thành viên và hồ sơ
   nói "app tự tính" — hai nghĩa ngược nhau về cùng một con số. `ratingOf` mới là
   câu trả lời đúng: nó trung bình các chỉ số và chỉ mượn điểm cũ cho ô chưa chấm. Một
   chuỗi, ba màn đọc chung — hai bản chép là cách chúng bắt đầu nói khác nhau. */
const RATING_NOTE = "Điểm 1–20 do app tự tính từ 12 chỉ số trong hồ sơ; chỉ số chưa chấm thì tạm lấy điểm cũ.";
/* Cách dùng thanh chấm điểm. Màn chấm nhanh có câu này từ đầu, hồ sơ thì không —
   ai vào hồ sơ trước thì 12 thanh đó trông như biểu đồ để đọc. */
const RATE_HINT = "Bấm vào thanh ở vị trí muốn chấm — trái là 1, phải là 20.";

const KINDS = {
  match: { label:"Buổi đá", short:"Đá", color:"#C1D439", soft:"rgba(193,212,57,0.18)" },
  training: { label:"Buổi tập", short:"Tập", color:"#6990FF", soft:"rgba(105,144,255,0.18)" },
  league: { label:"Giải đấu", short:"Giải", color:"#D16BF4", soft:"rgba(209,107,244,0.18)" },
  meet: { label:"Họp đội", short:"Họp", color:"#F79009", soft:"rgba(247,144,9,0.18)" }
};
const SEED_EVENTS = [
  { teamId:1, id:1, kind:"match", date:"2026-08-05", time:"19:30", place:"Sân - (điền sau)", repeat:"weekly" }
];
const METRICS = [
  { id:"rating", label:"Điểm đánh giá", unit:"ĐIỂM", get:ratingOf, note:RATING_NOTE },
  { id:"goals", label:"Ghi bàn", unit:"BÀN", get:m => m.goals, note:"Cộng khi admin ghi kết quả trận." },
  { id:"games", label:"Chuyên cần", unit:"TRẬN", get:m => m.games, note:"Số buổi có mặt - ai đi đều nhất đứng đầu." },
  { id:"mvp", label:"Hay nhất trận", unit:"MVP", get:m => m.mvp, note:"Số lần được chọn hay nhất trận." }
];
const MEDALS = [["rgba(232,243,0,0.9)", "#090F1D"], ["rgba(220,225,235,0.85)", "#090F1D"], ["rgba(198,124,60,0.9)", "#090F1D"]];
const GRADE_RATING = { S: 17, A: 15, B: 13, C: 11, D: 9, "": 10 };
const GRADE_TONE = {
  S: ["rgba(209,107,244,0.18)", "#D16BF4"],
  A: ["rgba(193,212,57,0.18)", "#C1D439"],
  // #6990FF tren nen xanh mo cua chinh no chi ra ~3,2:1 o chu 19px "Hang B". #A6C0FF sang hon, cung tong.
  B: ["rgba(105,144,255,0.18)", "#A6C0FF"],
  C: ["rgba(255,255,255,0.08)", "rgba(250,250,255,0.75)"],
  D: ["rgba(247,144,9,0.18)", "#F79009"],
  "": ["rgba(255,255,255,0.06)", "rgba(250,250,255,0.64)"]
};
/* Ten va ma nay CHET: `demoData()` de len thanh "FC Mau" / "DEMO0000" ngay khi
   dung. De ten mot doi bong co that o day chi lam nguoi doc tuong app mac dinh
   thuoc ve doi do. */
const SEED_TEAMS = [{ id:1, name:"FC Mẫu", code:"DEMO0000", opening:6890000 }];
const MAX_ADMINS = 3;

/* Bank codes for VietQR. Every Vietnamese banking app scans the same EMVCo QR,
   so a team fund only needs the bank's BIN plus the account number -- the payer
   never types either. The list is the banks a five-a-side team actually uses;
   add a BIN here if someone's bank is missing. */
const VN_BANKS = [
  ["970436", "Vietcombank"], ["970415", "VietinBank"], ["970418", "BIDV"],
  ["970405", "Agribank"],    ["970407", "Techcombank"],["970422", "MB Bank"],
  ["970416", "ACB"],         ["970432", "VPBank"],     ["970423", "TPBank"],
  ["970403", "Sacombank"],   ["970441", "VIB"],        ["970443", "SHB"],
  ["970437", "HDBank"],      ["970426", "MSB"],        ["970448", "OCB"],
  ["970440", "SeABank"],     ["970431", "Eximbank"],   ["970449", "LPBank"]
];
/* Photos off a phone are 3-6 MB. localStorage holds about 5 MB for everything
   this app owns, so a picture goes through here first: longest edge capped and
   re-encoded as JPEG. A 1280px background lands around 200-300 KB, which a
   full-screen backdrop still looks fine at. */
function shrinkImage(file, maxEdge, quality) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error("read"));
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode"));
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", quality));
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

const BANK_NAME = bin => (VN_BANKS.find(b => b[0] === bin) || [])[1] || "";

/* The five house rules. Titles are fixed because they are what a đá phủi team
   argues about; the wording is the team's own and is edited in settings.
   04 and 05 shipped as "- bổ sung sau -" placeholders with nothing behind them. */
const RULE_TITLES = ["TIỀN SÂN", "ĐIỂM DANH", "ĐIỂM ĐÁNH GIÁ & CHIA ĐỘI", "VẮNG MUỘN", "KỶ LUẬT"];
const RULE_DEFAULTS = [
  "95.000₫ mỗi trận, tính cho người có mặt. Đóng cho thủ quỹ hoặc chuyển khoản theo thông tin ở tab Quỹ.",
  "Chốt trước 20:00 thứ 3. Ai bấm \"Tôi đi\" thì tự sinh nợ 95.000₫ cho trận đó.",
  "Mỗi người có điểm 1-20 do admin đặt. Chia đội tự động dùng điểm này để hai bên cân sức.",
  "Báo vắng trước giờ chốt thì không mất tiền. Báo sau giờ chốt hoặc không đến vẫn tính đủ tiền sân.",
  "Đi trễ quá 15 phút thì vào sân ở lượt sau. Nợ quá 2 buổi thì tạm dừng đăng ký cho tới khi đóng đủ."
];
const KEY = "dpfm-v3";

/* ---------- Máy chủ ----------

   Bốn hàm RPC là POST thường, nên `fetch` là đủ: không nhúng supabase-js, không
   có gì cho CDN chặn. Kho này đã hai lần dính "CDN bị chặn -> app hỏng âm thầm".

   Bảng bên Supabase KHÔNG mở cho ai; anon key nằm công khai trong tệp này nên
   RLS là bức tường duy nhất, và đường vào duy nhất là bốn hàm có kiểm mã đội.

   Điểm danh KHÔNG đi cùng cục state. Đo thật: 20 người bấm cùng lúc, qua bảng
   riêng được 20/20, qua cả-cục còn 1/20. Nên `attendByOcc` bị gỡ khỏi thứ đẩy
   lên, và đi đường `team_attend`, mỗi người một dòng. */
const SB_URL = "https://zubtfnsdsktzbcfwpbgd.supabase.co";
const SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1YnRmbnNkc2t0emJjZndwYmdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwNjM0MDMsImV4cCI6MjEwMzYzOTQwM30.ydJBL1Gl5BBWhsvvUgrDhIU3h5hFADQ3cNhz5xwu_b4";
const CLOUD_KEY = "dpfm-cloud";      // { code, rev } của đội đang mở, tách khỏi dữ liệu đội

async function sbRpc(fn, args) {
  const r = await fetch(SB_URL + "/rest/v1/rpc/" + fn, {
    method: "POST",
    headers: { apikey: SB_ANON, Authorization: "Bearer " + SB_ANON, "Content-Type": "application/json" },
    body: JSON.stringify(args || {})
  });
  const t = await r.text();
  let j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {}
  if (!r.ok) throw new Error((j && j.message) || ("HTTP " + r.status));
  return j;
}

// Máy chủ trả phẳng { "buổi|người": "yes" }, app dùng lồng { buổi: { người: "yes" } }.
function attToNested(flat) {
  const out = {};
  Object.keys(flat || {}).forEach(k => {
    const i = k.indexOf("|"); if (i < 0) return;
    const occ = k.slice(0, i), mem = k.slice(i + 1);
    (out[occ] = out[occ] || {})[mem] = flat[k];
  });
  return out;
}

const SEED_LEDGER = [
  { teamId:1, id:1, label:"Thu quỹ trận 03/07", date:"2026-07-03", v: 1140000 },
  { teamId:1, id:2, label:"Thuê sân tháng 7", date:"2026-07-30", v: -2800000 },
  { teamId:1, id:3, label:"Thu quỹ trận 07/08", date:"2026-08-07", v: 1235000 },
  { teamId:1, id:4, label:"Tài trợ áo đấu", date:"2026-08-20", v: 2000000 },
  { teamId:1, id:5, label:"Thuê sân tháng 8 (4 buổi)", date:"2026-08-28", v: -3200000 },
  { teamId:1, id:6, label:"Nước + đá", date:"2026-08-28", v: -240000 }
];

/* Tam tran mau. Truoc day chung dung truong `date` de chua TEN DOI BAN (dang
   ban ghi cu ma `oppOf` van doc duoc), nen ca tam tran deu khong co ngay --
   va "Dong thoi gian" ben canh lai treo nhan "moi nhat tren cung". App noi
   thu tu thoi gian tren nhung ban ghi ma chinh no ghi la "chua ro khi nao".
   Tach ra: `opp` la ten doi, `date` la ngay that. */
const MATCHES = [
  { teamId:1, opp:"Sài Gòn Vets",       date:"14/06/2026", gf:3, ga:1, venue:"S.NHÀ" },
  { teamId:1, opp:"FC Bình Thạnh",      date:"28/06/2026", gf:2, ga:2, venue:"KHÁCH" },
  { teamId:1, opp:"Thủ Đức United",     date:"12/07/2026", gf:1, ga:4, venue:"KHÁCH" },
  { teamId:1, opp:"Gò Vấp FC",          date:"26/07/2026", gf:5, ga:0, venue:"S.NHÀ" },
  { teamId:1, opp:"Phú Nhuận Old Boys", date:"09/08/2026", gf:2, ga:3, venue:"KHÁCH" },
  { teamId:1, opp:"FC Tân Bình",        date:"16/08/2026", gf:4, ga:2, venue:"S.NHÀ" },
  { teamId:1, opp:"Quận 7 Rangers",     date:"23/08/2026", gf:1, ga:1, venue:"S.NHÀ" },
  { teamId:1, opp:"FC Bảy Hiền",        date:"30/08/2026", gf:3, ga:2, venue:"KHÁCH" }
];


/* Đội mẫu, không phải trạng thái khởi động.

   Bốn khối trên là một đội có thật với ba mươi sáu số điện thoại và ba mươi ba ngày
   sinh. Khi chúng còn là state ban đầu thì bất kỳ ai mở app cũng rơi vào đội của người
   khác, và đưa app cho đội khác là đưa luôn chỗ dữ liệu đó. Giờ app mở ra trống; ai
   muốn xem thử thì nạp đội mẫu, và xoá đi được. */
/* Doi mau la doi BIA. Truoc day demoData() tra thang SEED ra, ma SEED la ba muoi
   sau con nguoi CO THAT: ten that, so dien thoai that, ngay sinh that. Nut "Xem
   thu bang doi mau" khong hoi han gi ca -- ai mo app cung bam duoc -- nen bat ky
   nguoi la nao cung cam duoc ca quyen danh ba cua doi. Doi mau khong duoc dung
   nguoi that, du chi de xem thu.
   Muoi bon nguoi, so dien thoai 09000001xx la so khong co that.
   `k` = [tran, ban, kien tao, hay nhat, the vang, the do]. Tong ban thang cua ca
   doi la 21, dung bang tong cua tam tran trong MATCHES -- bia mot con so khac thi
   man Thong ke tu mau thuan voi chinh no. */
function dmChiSo(a) {
  const k = ["finish","dribble","pass","shot","defend","header","position","gk","stamina","pace","strength","spirit"];
  const o = {};
  k.forEach((x, i) => { o[x] = a[i]; });
  return o;
}
/* Rai so lieu cua doi mau thanh SU KIEN TUNG TRAN, roi tinh nguoc so lieu cau
   thu tu chinh cac su kien do.

   Truoc day doi mau dat thang so vao ho so (`k:[tran, ban, kien tao, MVP, the
   vang, the do]`) con tam tran thi khong co `events` nao. Hai nguon khong the
   khop nhau, va trong tai vong 27 do ra hau qua that: bang xep hang treo ten
   nguoi ghi ban cong khai, nhung mo BAT KY tran nao cung thay "chua ghi chuyen
   trong tran" -- admin khong tra lai duoc "ai ghi ban hom do". Te hon nua, ban
   than tinh nang "theo tung tran" khong duoc demo the hien lan nao.

   Rai bang ham chu khong go tay 58 dong su kien: go tay thi tong de lech, va
   lech o day nghia la app tu mau thuan ngay tren du lieu no tu dung ra de gioi
   thieu chinh no. Ham nay rai xong thi tong DUNG BANG tong cu -- vi so lieu cau
   thu duoc tinh tu ket qua rai, khong con la mot ban chep thu hai. */
/* `field` la khoa so lieu tren ho so (goals/assists/mvp/y/r), `kind` la ten
   loai su kien cua app (goal/assist/mvp/yellow/red). Hai ten khac nhau -- rai
   nham thi `evTally` khong doc ra gi va ca doi mau ve 0 ban. */
function demoEvents(matches, rows, field, kind) {
  const per = matches.map(() => []);
  const pool = [];
  rows.forEach(m => { for (let i = 0; i < (m[field] || 0); i++) pool.push(m.id); });
  /* Ban thang va kien tao khong duoc vuot qua so ban cua tran do. Cac loai khac
     thi rai deu, khong co tran nao "khong the co the vang". */
  const cap = i => (field === "goals" || field === "assists") ? matches[i].gf : 99;
  let mi = 0;
  pool.forEach(id => {
    let guard = 0;
    while (guard++ <= matches.length && per[mi].filter(e => e.kind === kind).length >= cap(mi)) mi = (mi + 1) % matches.length;
    per[mi].push({ who: id, kind: kind });
    if (field !== "goals") mi = (mi + 1) % matches.length;
  });
  return per;
}

const DEMO_MEMBERS = [
  { id:1,  num:"1",  name:"Trần Gia Bảo",   grp:"B", pos:"GK",      dob:"12/03/1996", a:[4,5,9,4,11,12,14,16,12,9,14,15] , k:[8, 0, 0, 0, 0, 0] },
  { id:2,  num:"4",  name:"Nguyễn Hữu Đạt", grp:"A", pos:"CB, LB",  dob:"05/07/1994", a:[6,8,12,7,17,16,15,3,14,11,16,15] , k:[8, 1, 1, 0, 3, 0] },
  { id:3,  num:"5",  name:"Lê Quang Huy",   grp:"B", pos:"CB",      dob:"22/11/1997", a:[5,7,11,6,15,15,14,2,13,10,15,13] , k:[7, 0, 0, 0, 2, 0] },
  { id:4,  num:"2",  name:"Phạm Minh Khôi", grp:"B", pos:"RB, RW",  dob:"18/01/1999", a:[9,12,12,9,12,9,12,2,16,16,11,13] , k:[6, 2, 2, 1, 1, 0] },
  { id:5,  num:"3",  name:"Đỗ Thanh Tùng",  grp:"C", pos:"LB",      dob:"30/09/1998", a:[7,10,11,8,13,10,12,2,14,13,12,12] , k:[5, 0, 1, 0, 1, 0] },
  { id:6,  num:"6",  name:"Vũ Đức Anh",     grp:"A", pos:"CDM, CM", dob:"14/05/1995", a:[10,12,17,12,15,11,16,2,16,11,14,17] , k:[8, 2, 3, 1, 2, 0] },
  { id:7,  num:"8",  name:"Bùi Nhật Nam",   grp:"S", pos:"CM, CAM", dob:"02/02/2000", a:[14,17,18,14,10,8,15,2,15,15,10,16] , k:[8, 4, 4, 2, 1, 0] },
  { id:8,  num:"10", name:"Ngô Hoàng Long", grp:"A", pos:"CAM",     dob:"27/06/1998", a:[15,16,15,16,8,9,14,2,13,14,11,14] , k:[7, 5, 2, 2, 0, 0] },
  { id:9,  num:"7",  name:"Hoàng Tiến Dũng",grp:"B", pos:"LW",      dob:"09/10/2001", a:[13,16,11,12,7,7,11,2,15,18,9,12] , k:[6, 3, 1, 0, 1, 0] },
  { id:10, num:"11", name:"Đặng Quốc Việt", grp:"C", pos:"RW",      dob:"16/04/2002", a:[12,14,10,11,7,8,10,2,14,17,9,11] , k:[4, 1, 0, 0, 0, 0] },
  { id:11, num:"9",  name:"Lý Thành Trung", grp:"S", pos:"ST",      dob:"25/08/1996", a:[18,13,11,15,6,15,14,2,14,15,15,16] , k:[8, 3, 0, 2, 2, 1] },
  { id:12, num:"19", name:"Trịnh Bá Phong", grp:"C", pos:"ST, RW",  dob:"11/12/2000", a:[13,11,9,12,6,11,10,2,13,14,12,11] , k:[3, 0, 0, 0, 0, 0] },
  { id:13, num:"14", name:"Mai Văn Sơn",    grp:"D", pos:"CM",      dob:"07/07/1993", a:[8,8,10,8,11,9,11,2,10,8,12,13] , k:[2, 0, 0, 0, 1, 0] },
  { id:14, num:"21", name:"Cao Bảo Lâm",    grp:"D", pos:"CB, CDM", dob:"03/02/1992", a:[5,6,9,5,12,12,11,2,10,7,14,12] , k:[2, 0, 0, 0, 0, 0] }
];
/* Doi mau phai trong nhu mot doi DANG DUNG, khong phai mot cai form rong. Truoc
   day no khong co chi so nao, khong co doi hinh nao, nen ca hai man chinh -- san
   va ho so -- deu mo ra rong tenh kem may doan chu huong dan. Doi hinh 1-2-3-1:
   thu mon, hai hau ve, ba tien ve, mot tien dao. */
const DEMO_SLOTS = { "1": [1, 2, 3, 6, 7, 8, 11] };
/* Va co ca bang du bi. Man Doi hinh khong chi tra loi "ai dang o dau tren san",
   no con phai tra loi "ai dang ngoi ngoai" -- bang du bi rong 0 nguoi thi nua cau
   hoi sau khong co cau tra loi nao. Bon nguoi: hai canh, hai hau ve. */
const DEMO_BENCH = { "1": [9, 10, 4, 5] };
function demoData() {
  /* Rai su kien cho tam tran TRUOC, roi so lieu cau thu tinh nguoc tu chung. */
  const demoRows = DEMO_MEMBERS.map(m => ({ id: m.id, goals: m.k[1], assists: m.k[2], mvp: m.k[3], y: m.k[4], r: m.k[5] }));
  const demoParts = [["goals", "goal"], ["assists", "assist"], ["mvp", "mvp"], ["y", "yellow"], ["r", "red"]]
    .map(p2 => demoEvents(MATCHES, demoRows, p2[0], p2[1]));
  const DEMO_MATCHES = MATCHES.map((g, i) => {
    const evs = [];
    demoParts.forEach(p2 => p2[i].forEach(e => evs.push(e)));
    return { ...g, events: evs.map((e, j) => ({ who: e.who, kind: e.kind, min: 8 + (j * 11) % 82 })) };
  });
  /* Dung CHINH `evTally` cua app de cong, khong viet mot vong cong thu hai --
     doi mau phai duoc cong bang dung cai may ma tran that di qua. */
  const DEMO_TALLY = evTally([].concat.apply([], DEMO_MATCHES.map(g => g.events || [])));
  return {
    members: DEMO_MEMBERS.map(m => ({
      teamId:1, id:m.id, num:m.num, name:m.name, type:"Đá cứng", grp:m.grp,
      shirt:m.name.split(" ").slice(-1)[0].toUpperCase(), size:"L",
      phone:"09000001" + String(m.id + 10), dob:m.dob, pos:m.pos,
      role: m.id === 1 ? "admin" : "", hidden:false,
      /* So tran van lay tu `k[0]` (diem danh, khong suy tu su kien duoc), con
         ban/kien tao/MVP/the thi TINH TU su kien da rai o tren. Neu ai sua bang
         `k` mai sau ma quen sua cho khac, hai con so van khong the lech nhau. */
      games:m.k[0],
      goals: DEMO_TALLY[m.id] ? DEMO_TALLY[m.id].goals : 0,
      assists: DEMO_TALLY[m.id] ? DEMO_TALLY[m.id].assists : 0,
      mvp: DEMO_TALLY[m.id] ? DEMO_TALLY[m.id].mvp : 0,
      y: DEMO_TALLY[m.id] ? DEMO_TALLY[m.id].y : 0,
      r: DEMO_TALLY[m.id] ? DEMO_TALLY[m.id].r : 0,
      og:0, owed:0,
      attrs: dmChiSo(m.a), rating: GRADE_RATING[m.grp]
    })),
    slotsByTeam: { ...DEMO_SLOTS },
    benchByTeam: { ...DEMO_BENCH },
    // Doi mau khong muon ten cua doi that, va ma moi cung khong duoc trung.
    teams: SEED_TEAMS.map(t => ({ ...t, name: "FC Mẫu", code: "DEMO0000" })),
    ledger: SEED_LEDGER.slice(),
    matches: DEMO_MATCHES,
    events: SEED_EVENTS.slice()
  };
}

const OPENING = 6890000;
const DAY_FULL = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const DAY_VN = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const TABS = [
  { id:"overview", label:"Tổng quan", short:"Tổng quan", icon:"IconTeam" },
  { id:"lineup", label:"Đội hình", short:"Đội hình", icon:"IconGlobe" },
  { id:"members", label:"Thành viên", short:"Thành viên", icon:"IconSquad" },
  { id:"fund", label:"Đội", short:"Đội", icon:"IconContract" },
];
const EXTRA_STATS = { id:"stats", label:"Thống kê" };
const EXTRA_TAB = { id:"team", label:"Đội" };

class Component extends DCLogic {
  state = {
    auth: null, tab: "overview", phone: "", pass: "", loginErr: "",
    members: [],
    ledger: [],
    slotsByTeam: {}, picked: null, kitByTeam: {},
    attendByOcc: {}, paidByOcc: {}, teamNameDraft: null, occ: "", menu: null, wide3: true, wide6: false, lineupView: "squad", teamView: "fund", matchKindByOcc: {}, slotOvr: {}, teamTab: "A", paneTab: "pitch", shapeTab: "shape", narrow: false, wide4: false, pickedSlot: null, demoOn: false, demoPhase: 0, drawMode: false, drawFrom: null, poolOpen: { yes: true, none: false, no: false }, tacticLib: {}, tacticSel: {}, tacticSlot: null, sizeAsk: null, ctx: null, tacticsByTeam: {}, closedOcc: {}, undo: null, memberView: "list", splitOpen: false, charges: [], splitByOcc: {}, benchByTeam: {}, slotsByOcc: {}, hiddenCols: {}, formation: "1-2-3-1", formOpen: false, settledAt: {}, settledTick: 0, waivedByOcc: {}, barOpen: false, nameMode: "both", tacPhase: "on", autoWhy: [], authMode: "login", pass2: "", notesOff: {}, door: "", netErr: "", dobInput: "", invite: "", pw: {}, pwh: {}, arrows: [], subs: [], foesOn: false, steps: [], stepI: 0, stepMode: false, playMs: null, akShow: false,
    teams: [], pending: null, joinCode: "", newTeam: "", nameInput: "", promoteId: "", evEditId: null, copied: "", lineupMsg: "", filter: "", q: "", sel: null, split: null, quickKey: "",
    // rankBy rong = chua ai chon cot; luc do `defaultRankBy` quyet dinh theo
    // du lieu that. De san "rating" o day thi ham do khong bao gio chay.
    matches: [], rankBy: "", ranks: {},
    events: [], monthOffset: 0,
    ev: { kind: "match", date: "", time: "19:30", place: "", repeat: "none", note: "", fee: "", opp: "", kit: "" },
    res: { opp: "", gf: "", ga: "", venue: "S.NHÀ", day: "", events: [], evWho: "", evKind: "goal", evMin: "", editId: null, editIx: null, editSig: "" },
    trophies: [], troph: { title: "", year: "", place: "champion", note: "" },
    photoEdit: null, pfNudge: false,
    form: { name: "", num: "", type: "Đá cứng", grp: "A", phone: "", shirt: "", size: "", dob: "", born: "", nat: "", posMain: "", posAlt: [], hurt: "", hurtTo: "" }, editId: null,
    tx: { label: "", amount: "", type: "out" }
  };

  /* Ap tu the cua mo phong THANG len bay o tren san, khong qua state.

     Truoc do moi nhip goi `setState` va khung dung lai toan bo DOM -- do tren
     app that: 9,5 den 50,4ms mot lan, tuc co nhip mat ba khung hinh dung luc
     chuyen dong bat dau. Va no chay bang `transition: left, top`, hai thuoc
     tinh keo ca luong bo cuc moi khung. Nay chi ghi `transform` cua bay phan
     tu -- viec cua luong ghep anh, khong dung toi bo cuc.

     Lech nhip theo tuyen: thu mon truoc, roi hau ve, tien ve, tien dao. Ca
     khoi dich chuyen nhu mot doi bong chu khong phai mot tam luoi cung. */
  demoApply(phase) {
    if (typeof document === "undefined") return;
    const pane = document.querySelector(".fmpitch");
    if (!pane) return;
    const r = pane.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const offs = this._demoOffs || [];
    const LAG = { TM: 0, HV: 60, TV: 120, "TĐ": 180 };
    for (let i = 0; i < offs.length; i++) {
      const el = pane.querySelector('.fmslot[data-slot="' + i + '"]');
      if (!el) continue;
      const o = offs[i] && offs[i].off && offs[i].off[phase ? 1 : 0];
      if (!o) continue;
      el.style.transitionDelay = (LAG[offs[i].line] || 0) + "ms";
      el.style.transform = "translate(-50%,-50%) translate3d("
        + (o[0] / 100 * r.width).toFixed(1) + "px,"
        + (o[1] / 100 * r.height).toFixed(1) + "px,0)";
    }
  }
  demoClear() {
    if (typeof document === "undefined") return;
    const pane = document.querySelector(".fmpitch");
    if (!pane) return;
    pane.querySelectorAll(".fmslot").forEach(el => {
      el.style.transform = "translate(-50%,-50%)";
      el.style.transitionDelay = "";
      el.style.willChange = "";
    });
  }
  toggleDemo() {
    const reduce = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.setState(s => {
      const on = !s.demoOn;
      if (this._demoTimer) { clearInterval(this._demoTimer); this._demoTimer = null; }
      if (!on) { setTimeout(() => this.demoClear(), 0); return { demoOn: false, demoPhase: 0 }; }
      let ph = 1;
      setTimeout(() => {
        const pane = document.querySelector(".fmpitch");
        if (pane) pane.querySelectorAll(".fmslot").forEach(el => { el.style.willChange = "transform"; });
        this.demoApply(ph);
      }, 0);
      if (!reduce) this._demoTimer = setInterval(() => { ph = ph ? 0 : 1; this.demoApply(ph); }, 2200);
      return { demoOn: true, demoPhase: 1 };
    });
  }

  /* Toast la mot thanh co dinh o day man, nam de len chinh bang ghe DU BI va
     dong huong dan ma no vua noi toi. Nguoi thu app mat ba lan bam chi de dep
     no di. Gio no tu tat sau 4 giay -- TRU khi con nut HOAN TAC, vi bo qua mot
     cua so 5 giay tren dien thoai giua san bong la mat luon duong lui.
     Cho vao setState vi hai muoi cho trong app deu dat `copied`/`lineupMsg`
     truc tiep; gac o day thi khong cho nao quen duoc. */
  setState(patch) {
    /* Ban chup hoan tac chi dung chung nao thu no dinh tra lai chua bi doi tiep.

       Truoc do khong co gi go no xuong. Xoa het doi hinh xong, thanh "Hoan tac"
       nam do voi cau "Da xoa het doi hinh."; bam Tu dong xep lai bay nguoi thi
       thanh do VAN NAM DO va van cam ban chup cu. Bam vao la doi hinh vua xep
       bien mat, thay bang doi hinh truoc khi xoa -- ke ca nguoi da bao vang.
       Mot giam khao that da bam dung vao do roi bao rang "Tu dong xep ca nguoi
       bao vang"; do khong phai loi cua Tu dong, do la mot cai nut cu con song.

       Cach go: ban chup biet no chup nhung khoa nao. Lan sau co ai ghi vao dung
       mot trong nhung khoa do (khong phai chinh luot hoan tac) thi ban chup het
       dung, bo di. Lam o day vi day la cua duy nhat moi thay doi phai di qua. */
    const next = typeof patch === "function" ? patch(this.state) : patch;
    if (!next) return;
    const u = this.state && this.state.undo;
    if (u && u.state && !("undo" in next)) {
      for (const k in next) {
        if (k in u.state && next[k] !== this.state[k]) { next.undo = null; break; }
      }
    }
    /* Doi man thi dong menu dang mo. Menu la mot lop phu toan man (z-index 36);
       de no song sang man khac la nguoi dung bam gi cung trung cai lop do. */
    if (next.tab && this.state.tab && next.tab !== this.state.tab) {
      if (this.state.ctx) next.ctx = null;
      if (this.state.menu) next.menu = null;
    }
    super.setState(next);
    clearTimeout(this._toastT);
    const st = this.state;
    if ((st.copied || st.lineupMsg) && !st.undo)
      this._toastT = setTimeout(() => {
        if (this.state.undo) return;
        this.setState({ copied: "", lineupMsg: "" });
      }, 4000);
  }

  componentWillUnmount() {
    clearTimeout(this._toastT);
    clearTimeout(this._settleT);
    if (this._demoTimer) clearInterval(this._demoTimer);
    if (this._playRaf) cancelAnimationFrame(this._playRaf);
    clearTimeout(this._playT);
    if (this._resize && typeof window !== "undefined") window.removeEventListener("resize", this._resize);
    if (this._esc && typeof window !== "undefined") window.removeEventListener("keydown", this._esc);
    if (this._keyAct && typeof window !== "undefined") window.removeEventListener("keydown", this._keyAct);
    if (this._pop && typeof window !== "undefined") window.removeEventListener("popstate", this._pop);
  }

  componentDidMount() {
    this._resize = () => {
      const w = typeof window !== "undefined" ? window.innerWidth : 1200;
      const n = w < 900, w3 = w >= 1080, w4 = w >= 1500, w6 = w >= 1600;
      if (n !== this.state.narrow || w3 !== this.state.wide3 || w4 !== this.state.wide4 || w6 !== this.state.wide6) this.setState({ narrow: n, wide3: w3, wide4: w4, wide6: w6 });
    };
    if (typeof window !== "undefined") { this._resize(); window.addEventListener("resize", this._resize); }
    /* Escape phai dong CA bang chi dao ca nhan. Bang do khong cuon trang duoc
       (trang cao dung 1080), khong bam ra ngoai duoc, nen neu Escape khong dong
       thi chi con moi cai dau X be ti o goc -- do duoc: bam Escape hai lan, chu
       "CHI DAO CA NHAN" van con. */
    this._esc = e => { if (e.key === "Escape") this.setState({ menu: null, ctx: null, picked: null, pickedSlot: null }); };
    if (typeof window !== "undefined") window.addEventListener("keydown", this._esc);
    /* Enter va Space phai bam duoc nut, giong nhu the <button> that.

       Moi nut trong app la `div role="button" tabindex="0"` -- Tab toi duoc, co
       vien tieu diem vang ro rang, nhung KHONG co gi xay ra khi bam Enter. Trong
       tai vong 29 di het app bang ban phim: toi duoc moi noi, thao tac duoc con
       so khong. Mot cai div khong tu biet nghe ban phim nhu <button>; phai noi
       tay, va noi mot lan o day thay vi gan tay cam cho tung nut trong 174 cho.

       Space phai chan cuon trang, Enter thi khong. O nhap lieu va the <a> giu
       nguyen hanh vi cua chinh no. */
    this._keyAct = e => {
      if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
      const el = e.target;
      if (!el || !el.closest) return;
      const tag = (el.tagName || "").toUpperCase();
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || tag === "A") return;
      if (el.isContentEditable) return;
      const btn = el.closest('[role="button"]');
      if (!btn) return;
      e.preventDefault();
      btn.click();
    };
    if (typeof window !== "undefined") window.addEventListener("keydown", this._keyAct);
    /* Nut Back cua trinh duyet (va vuot lui tren trackpad hay dien thoai) truoc
       day van thang ra khoi app: app khong day mot muc lich su nao nen Back di
       thang ve trang truoc do. Dang la doi truong giua buoi lam viec, vuot nham
       mot cai la mat phien.

       Day mot muc "chot" vao lich su khi vao app. Back se roi vao muc do va
       `popstate` bat duoc: neu dang o man con thi lui ve Tong quan roi day chot
       lai; neu dang o Tong quan roi thi tha cho di that. Khong dung mot muc cho
       moi man -- lam vay thi Back tro thanh "lui tung buoc" va nguoi ta phai bam
       muoi lan moi thoat duoc. */
    this._pop = () => {
      const s = this.state;
      const deep = !!s.auth && (s.tab !== "home" || s.sel || s.formOpen || s.menu);
      if (!deep) return;
      this.setState({ tab: "home", sel: null, formOpen: false, menu: null, ctx: null,
        copied: "Đã lùi về Tổng quan. Bấm lùi lần nữa để thoát app." });
      if (typeof history !== "undefined" && history.pushState) history.pushState({ dp: 1 }, "");
    };
    if (typeof window !== "undefined" && typeof history !== "undefined" && history.pushState) {
      history.pushState({ dp: 1 }, "");
      window.addEventListener("popstate", this._pop);
    }
    // Máy này đã gắn với một đội trên máy chủ thì kéo bản mới nhất về ngay, rồi
    // kéo tiếp mỗi 8 giây. Không có thì im lặng chạy offline như trước.
    if (this.cloudMeta()) { this.cloudPull(); this.cloudStart(); }
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        this.setState(s => ({
          members: (d.members || s.members).map(m => { return (!m.role && SEED_ADMIN_IDS.indexOf(m.id) >= 0) ? { ...m, role: "admin" } : m; }), ledger: d.ledger || s.ledger, matches: d.matches || s.matches, ranks: d.ranks || s.ranks, events: d.events || s.events, trophies: d.trophies || s.trophies,
          /* Giu phien dang nhap qua F5 -- NHUNG chi khi tai khoan do khong co mat
             khau. Che do xem thu khong tao mat khau nao, nen truoc day tai lai
             trang la day ve man dang nhap khong co gi de nhap: bam "Xem thu" lai
             thi bi tu choi vi "may nay da co doi roi", va loi ra duy nhat la xoa
             localStorage. Ai thu app roi lo F5 la ket.
             Nguoi co mat khau van phai dang nhap lai: mot phien khong duoc phep
             duoc bao ve it hon chinh tai khoan cua no. */
          auth: (() => {
            const id = d.auth, list = d.members || s.members || [];
            if (!id || !list.some(m => m.id === id)) return null;
            const hasPw = !!((d.pwh || {})[id]) || !!((d.pw || {})[id]);
            return hasPw ? null : id;
          })(),
          slotsByTeam: d.slotsByTeam || s.slotsByTeam, kitByTeam: d.kitByTeam || s.kitByTeam, attendByOcc: d.attendByOcc || s.attendByOcc, pw: d.pw || s.pw, benchByTeam: d.benchByTeam || s.benchByTeam, closedOcc: d.closedOcc || s.closedOcc, tacticsByTeam: d.tacticsByTeam || s.tacticsByTeam, tacticLib: d.tacticLib || s.tacticLib, tacticSel: d.tacticSel || s.tacticSel, charges: d.charges || s.charges, splitByOcc: d.splitByOcc || s.splitByOcc, slotsByOcc: d.slotsByOcc || s.slotsByOcc, matchKindByOcc: d.matchKindByOcc || s.matchKindByOcc, slotOvr: d.slotOvr || s.slotOvr, paidByOcc: d.paidByOcc || s.paidByOcc, sawCtx: !!d.sawCtx, notesOff: d.notesOff || s.notesOff, pwh: d.pwh || s.pwh, arrows: d.arrows || s.arrows, subs: d.subs || s.subs, steps: d.steps || s.steps, nameMode: d.nameMode || s.nameMode, captainByTeam: d.captainByTeam || s.captainByTeam, mentalityByTeam: d.mentalityByTeam || s.mentalityByTeam, teams: (d.teams || s.teams).map(t => {
            const seedT = SEED_TEAMS.find(x => x.id === t.id) || {};
            return { ...seedT, ...t, opening: t.opening != null ? t.opening : (seedT.opening || 0) };
          })
        }));
      }
    } catch (e) {
      /* A corrupt or unreadable save used to be swallowed here, so the app came
         up with the demo squad and said nothing -- the captain would think it had
         eaten his season. It still recovers rather than white-screening, but it
         says so, and it keeps the unreadable blob under a second key so the data
         is not overwritten by the first thing that saves after. */
      try {
        const bad = localStorage.getItem(KEY);
        if (bad) localStorage.setItem(KEY + "-loi", bad);
      } catch (e2) {}
      this.setState({ copied: "Không đọc được dữ liệu đã lưu trên máy này. Bản hỏng được giữ lại, đội đang hiện là dữ liệu mẫu." });
    }
  }

  // Ghi xuong may nay thoi, khong danh thuc dong bo -- dung trong luc dang giai
  // xung dot, vi luc do cloudPush dang chay va se tu day sau khi hop nhat xong.
  persistLocalOnly(extra) {
    const keep = this._applyingRemote; this._applyingRemote = true;
    const r = this.persist(extra); this._applyingRemote = keep; return r;
  }

  persist(extra) {
    const s = { ...this.state, ...(extra || {}) };
    // Dang ap du lieu vua keo ve thi dung day nguoc len: pull -> push -> pull la
    // vong lap vo tan, va hai may se nem qua nem lai mai.
    if (!this._applyingRemote) this.cloudPush();
    try {
      localStorage.setItem(KEY, JSON.stringify({
        members: s.members, ledger: s.ledger, slotsByTeam: s.slotsByTeam, kitByTeam: s.kitByTeam, attendByOcc: s.attendByOcc, benchByTeam: s.benchByTeam, slotsByOcc: s.slotsByOcc, matchKindByOcc: s.matchKindByOcc, paidByOcc: s.paidByOcc, waivedByOcc: s.waivedByOcc, slotOvr: s.slotOvr, closedOcc: s.closedOcc, tacticsByTeam: s.tacticsByTeam, tacticLib: s.tacticLib, tacticSel: s.tacticSel, charges: s.charges, splitByOcc: s.splitByOcc, pw: s.pw, captainByTeam: s.captainByTeam, mentalityByTeam: s.mentalityByTeam, teams: s.teams, matches: s.matches, trophies: s.trophies, ranks: s.ranks, events: s.events, sawCtx: s.sawCtx, notesOff: s.notesOff, pwh: s.pwh, arrows: s.arrows, subs: s.subs, steps: s.steps, nameMode: s.nameMode, auth: s.auth
      }));
      return true;
    } catch (e) {
      // Quota, usually: a picture too big for what is left. A caller that can
      // undo the write needs to know, rather than losing every later save.
      return false;
    }
  }

  // Team-level settings (bank details, shared links, house rules) all live on the
  // team record, which already persists and restores. One writer for all of them.
  patchTeam(teamId, fields) {
    this.setState(s => {
      const teams = s.teams.map(t => t.id === teamId ? { ...t, ...fields } : t);
      this.persist({ teams });
      return { teams };
    });
  }

  /* Tien san mot buoi: doi tu dat trong Cai dat doi, chua dat thi lay so mac
     dinh cua app. Truoc day 95.000d chon cung trong ma -- doi nao thue san khac
     gia phai sua tung buoi mot, hoac song voi con so sai. */
  fee(team) {
    const v = parseInt((team || {}).matchFee, 10);
    return isFinite(v) && v >= 0 ? v : (this.props.matchFee ?? 95000);
  }
  money(n) { return n.toLocaleString("vi-VN") + "₫"; }
  home() { return this.props.homeKitColor ?? "#1549E0"; }
  away() { return this.props.awayKitColor ?? "#EC2E1A"; }

  // Every route onto the pitch goes through here — bench sub button, click with a
  // player picked, drag onto a slot — so the swap and the log live here rather
  // than in each caller.
  assign(i, id) {
    /* Khong co id thi KHONG lam gi. Truoc day mot cho goi nham truong (`b.id`
       tren mot mang chi de hien thi) dua vao undefined, va ham nay ngoan ngoan
       ghi undefined vao o -- o bi xoa trong, khong ai vao san, khong mot loi nao.
       Chan ngay tai cua, khong phai tai tung noi goi. */
    if (!id) return;
    const t = this._team, k = this._slotKey, sk = this._sideKey, n = this._slotCount || 7;
    this.setState(s => {
      const useOcc = k && k !== "none";
      const base = fitSlots((useOcc ? ((s.slotsByOcc || {})[k] || (s.slotsByTeam || {})[t]) : (s.slotsByTeam || {})[t]), n);
      const cur = base.slice();
      const at = cur.indexOf(id);
      const off = cur[i];
      // Two players already on the pitch trade places. Only someone arriving from
      // the bench or the pool pushes the occupant off.
      const swap = at >= 0 && off && off !== id;
      if (at >= 0) cur[at] = swap ? off : null;
      cur[i] = id;
      const out = useOcc ? { slotsByOcc: { ...s.slotsByOcc, [k]: cur } } : { slotsByTeam: { ...s.slotsByTeam, [t]: cur } };
      // Whoever was displaced off the pitch goes to the bench rather than silently
      // back to the pool; whoever came on leaves it, so the stored bench never
      // lists someone who is on the pitch.
      const bench0 = benchOf(s.benchByTeam, k, sk);
      const pushOff = !swap && off && off !== id;
      if (pushOff || bench0.indexOf(id) >= 0) {
        const bench = bench0.filter(x => x !== id);
        if (pushOff && bench.indexOf(off) < 0) bench.push(off);
        out.benchByTeam = { ...s.benchByTeam, [k]: bench };
      }
      // Taking someone for this side takes him off the other one. Done here
      // rather than by hiding him from the pickers, because drag-drop and the
      // pick-then-tap route reach assign() too.
      let stolen = false;
      const ok2 = this._otherSlotKey, ok3 = this._otherSideKey;
      if (ok2) {
        const oth = (s.slotsByOcc || {})[ok2];
        if (oth && oth.indexOf(id) >= 0) {
          out.slotsByOcc = { ...(out.slotsByOcc || s.slotsByOcc), [ok2]: oth.map(x => x === id ? null : x) };
          stolen = true;
        }
        const ob = benchOf(s.benchByTeam, ok2, ok3);
        if (ob.indexOf(id) >= 0) {
          out.benchByTeam = { ...(out.benchByTeam || s.benchByTeam), [ok2]: ob.filter(x => x !== id) };
          stolen = true;
        }
      }
      this.persist(out);
      const who = (s.members.find(x => x.id === id) || {}).name;
      const ans = (this._att || {})[id];
      const ansState = attState(ans);
      const note = ansState === "no" ? (who || "Cầu thủ") + " đã báo VẮNG buổi này."
        : (ansState === "maybe" ? (who || "Cầu thủ") + " mới báo CHƯA CHẮC buổi này."
        : (ansState === "none" && k && k !== "none" ? (who || "Cầu thủ") + " chưa trả lời điểm danh." : ""));
      /* Day mot nguoi KHOI SAN thi phai noi ten anh ta, va phai hoan tac duoc.

         Truoc do nhanh `pushOff` khong sinh mot cau nao: keo tha vao o da co
         nguoi (hoac tha vao co, vi tu dot truoc no hit vao o gan nhat) thi nguoi
         dang da bi day xuong bang ghe trong im lang, va khong co duong lui.
         Trong tai do duoc dung canh nay: tha giua hai o hau ve thi THU MON bi
         hat ra, khong mot dong bao.

         `undo` dung dung khuon cua "Xoa het": chup lai ba kho bi dong toi. */
      const offName = pushOff ? (s.members.find(x => x.id === off) || {}).name : "";
      const pushMsg = offName ? ("Đã đưa " + offName + " ra dự bị để xếp " + (who || "cầu thủ") + " vào ô này.") : "";
      return { ...out, picked: null,
        ...(pushOff ? { undo: { state: { slotsByOcc: s.slotsByOcc, slotsByTeam: s.slotsByTeam, benchByTeam: s.benchByTeam } } } : {}),
        lineupMsg: stolen ? ("Đã lấy " + (who || "cầu thủ") + " khỏi " + this._otherSideName + ".")
          : (pushMsg ? (pushMsg + (note ? " " + note : "")) : (note || undefined)) };
    });
  }

  // Take the player in slot i off the pitch and onto the bench.
  /* Thay nguoi trong MOT thao tac, va ghi lai. `assign` da biet cach day nguoi
     dang o o do xuong bang du bi, nen chi con viec ghi so. */
  /* ---------- bước & phát lại ---------- */

  // Ảnh chụp vị trí hiện tại thành một bước. HLV bày xong thì bấm lưu.
  stepSave(pos) {
    const ph = this._phase === "off" ? "off" : "on";
    this.setState(s => {
      const steps = (s.steps || []).concat([{ pos: pos.map(p => [p[0], p[1]]), ph }]);
      const mine = forPhase(steps, ph);
      this.persist({ steps });
      return { steps, stepI: mine.length - 1, copied: "Đã lưu bước " + mine.length + "." };
    });
  }
  stepDrop(i) {
    const ph = this._phase === "off" ? "off" : "on";
    this.setState(s => {
      const gi = phaseIndex(s.steps, ph, i);
      if (gi < 0) return {};
      const steps = (s.steps || []).filter((_, n) => n !== gi);
      this.persist({ steps });
      return { steps, stepI: Math.max(0, Math.min(s.stepI, forPhase(steps, ph).length - 1)) };
    });
  }
  // Kéo một người sang chỗ khác TRONG bước đang mở -- không đổi chỗ hai cầu thủ.
  stepMove(idx, x, y) {
    const ph = this._phase === "off" ? "off" : "on";
    this.setState(s => {
      const gi = phaseIndex(s.steps, ph, s.stepI);
      const steps = (s.steps || []).map((st2, n) => {
        if (n !== gi) return st2;
        const pos = st2.pos.map(p => [p[0], p[1]]);
        if (pos[idx]) pos[idx] = [x + "%", y + "%"];
        return { ...st2, pos: pos };
      });
      this.persist({ steps });
      return { steps };
    });
  }
  /* Ap MOT khung cua doan phat len bay o tren san, khong qua state.

     Cung mot le voi `demoApply`, va cung mot cai gia da tra o do: ban cu goi
     `setState({playMs})` moi 60ms, tuc dung lai TOAN BO DOM (do duoc 10-30ms
     moi lan tren man Doi hinh) muoi bay lan mot giay, chi de doi vi tri bay
     cai vong tron. Mot hoat anh chay bang cach dung lai ca trang.

     Vi tri nen (`pitchShape`) va cac buoc da luu deu tinh bang phan tram san,
     nen do lech giua chung cung la phan tram -- doi ra px theo kich thuoc san
     tai luc chay roi ghi vao `transform`, viec cua luong ghep anh. `left`/`top`
     giu nguyen gia tri nen, khong ai dung toi. */
  playApply(ms) {
    if (typeof document === "undefined") return;
    const S = this._stepPlay;
    if (!S || !S.list || S.list.length < 2) return;
    const pane = document.querySelector(".fmpitch");
    if (!pane) return;
    const r = pane.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const h = playHead(ms, S.list.length, S.per);
    const pos = tweenPos(S.list[h.i], S.list[h.i + 1], h.t);
    for (let i = 0; i < S.base.length; i++) {
      const el = pane.querySelector('.fmslot[data-slot="' + i + '"]');
      if (!el) continue;
      const p = pos[i];
      if (!p) continue;
      const dx = parseFloat(p[0]) - parseFloat(S.base[i][0]);
      const dy = parseFloat(p[1]) - parseFloat(S.base[i][1]);
      /* Khong co `transition` khi dang phat: chinh vong lap da cho ra tung
         khung roi, de trinh duyet noi suy them lan nua thi hinh bi tre lai
         sau con so. */
      el.style.transition = "none";
      el.style.transform = "translate(-50%,-50%) translate3d("
        + (dx / 100 * r.width).toFixed(1) + "px,"
        + (dy / 100 * r.height).toFixed(1) + "px,0)";
      el.style.willChange = "transform";
    }
  }
  playClear() {
    if (typeof document === "undefined") return;
    const pane = document.querySelector(".fmpitch");
    if (!pane) return;
    pane.querySelectorAll(".fmslot").forEach(el => {
      el.style.transform = "translate(-50%,-50%)";
      el.style.transition = "";
      el.style.willChange = "";
    });
  }
  stepPlay() {
    const list = forPhase(this.state.steps, this._phase);
    if (list.length < 2) { this.setState({ copied: "Cần ít nhất 2 bước mới phát được." }); return; }
    this.stepStop();
    const per = 1200, total = (list.length - 1) * per;
    /* Chi HAI lan setState cho ca doan phat: mot luc bat (de nut doi thanh
       "Dung", va de `livePos` khoa vi tri nen theo buoc dau), mot luc xong. */
    this._stepPlay = { list: list.map(s => s.pos), base: this._pitchBase || [], per: per };
    this.setState({ playMs: 0 });
    const t0 = Date.now();
    const tick = () => {
      const ms = Date.now() - t0;
      this.playApply(Math.min(ms, total));
      if (ms >= total) { this._playRaf = null; this.stepStop(); return; }
      this._playRaf = requestAnimationFrame(tick);
    };
    /* Cho mot khung de khung vua setState kip ve xong roi moi bat dau ghi
       transform -- ghi vao cai DOM sap bi thay the thi mat trang. */
    if (typeof requestAnimationFrame === "function")
      this._playRaf = requestAnimationFrame(() => { this._playRaf = requestAnimationFrame(tick); });
    /* Hen gio bao hiem. rAF khong chay khi tab nam duoi hoac cua so bi che, nen
       neu chi dua vao no thi bam Phat roi chuyen tab la `playMs` ket lai o 0:
       quay ve thay nut van ghi "Dung" va khong gi nhuc nhich. Hoat anh khong
       chay khi khong ai nhin thi dung, nhung TRANG THAI thi phai tu don. */
    this._playT = setTimeout(() => { this._playT = null; this.stepStop(); }, total + 400);
  }
  stepStop() {
    if (this._playRaf) { cancelAnimationFrame(this._playRaf); this._playRaf = null; }
    clearTimeout(this._playT); this._playT = null;
    this._stepPlay = null;
    this.playClear();
    if (this.state.playMs != null) this.setState({ playMs: null });
  }

  subFor(i, inId) {
    const s = this.state;
    const outId = ((s.slotsByOcc || {})[this._slotKey] || (s.slotsByTeam || {})[this._team] || [])[i];
    const nameOf = id => (s.members.find(m => m.id === id) || {}).name || "";
    const now = new Date();
    const at = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
    this.assign(i, inId);
    const subs = subLog(s.subs, { outName: nameOf(outId), inName: nameOf(inId), at: at });
    this.persist({ subs });
    this.setState({ subs, copied: nameOf(inId) + " vào thay " + nameOf(outId) + "." });
  }

  benchOut(i) {
    const t = this._team, k = this._slotKey, sk = this._sideKey, n = this._slotCount || 7;
    this.setState(s => {
      const useOcc = k && k !== "none";
      const cur = fitSlots((useOcc ? ((s.slotsByOcc || {})[k] || (s.slotsByTeam || {})[t]) : (s.slotsByTeam || {})[t]), n).slice();
      const off = cur[i];
      if (!off) return {};
      cur[i] = null;
      const bench = benchOf(s.benchByTeam, k, sk).slice();
      if (bench.indexOf(off) < 0) bench.push(off);
      const out = useOcc ? { slotsByOcc: { ...s.slotsByOcc, [k]: cur } } : { slotsByTeam: { ...s.slotsByTeam, [t]: cur } };
      out.benchByTeam = { ...s.benchByTeam, [k]: bench };
      this.persist(out);
      const m = s.members.find(x => x.id === off);
      return { ...out, picked: null, pickedSlot: null, lineupMsg: "Đã đưa " + (m ? m.name : "cầu thủ") + " ra dự bị." };
    });
  }

  _now() { return Date.now(); }

  /* Everything about a session is filed under "<eventId>@<date>", so deleting the
     event left its attendance, both lineups, its in-house split, its match kind
     and its closed flag behind forever. A new event gets a new id so none of it
     was ever read again -- it just sat in localStorage, which the app has about
     5 MB of and now shares with an uploaded login backdrop. Returns the pruned
     collections plus the originals, so the caller can offer an undo that puts
     the whole session back, not just the calendar row. */
  pruneOcc(s, eventId) {
    const mine = k => String(k).split("@")[0] === String(eventId);
    const out = {}, before = {};
    ["attendByOcc", "paidByOcc", "slotsByOcc", "splitByOcc", "matchKindByOcc", "closedOcc", "slotOvr"].forEach(name => {
      const src = s[name] || {};
      const keys = Object.keys(src);
      // slotOvr is keyed "<occ>#<slot>" and slotsByOcc can carry a "#B" side
      // suffix, so match on the event id at the head rather than the whole key.
      const hit = keys.filter(mine);
      if (!hit.length) return;
      const next = {};
      keys.forEach(k => { if (!mine(k)) next[k] = src[k]; });
      out[name] = next;
      before[name] = src;
    });
    return { out: out, before: before };
  }

  setAtt(memberId, value) {
    const key = this._occ;
    if (!key || key === "none") { this.setState({ copied: "Chưa có buổi nào trong lịch - thêm lịch trước đã." }); return; }
    this.setState(s => {
      const cur = { ...((s.attendByOcc || {})[key] || {}) };
      cur[memberId] = value;
      const attendByOcc = { ...s.attendByOcc, [key]: cur };
      this.persist({ attendByOcc });
      // Một dòng một người, nên hai mươi người bấm cùng lúc không ai xoá ai.
      const m = this.cloudMeta();
      if (m && m.code) sbRpc("team_attend", { p_code: m.code, p_occ: String(key), p_member: String(memberId), p_value: value || "" })
        .then(() => this.setState({ netErr: "" }))
        .catch(() => this.setState({ netErr: "Điểm danh chưa lên được máy chủ. " + netNow() }));
      return { attendByOcc };
    });
  }

  /* Dat THANG mot nac, khong cong tru tung buoc. Bam vao thanh o dau la ra
     diem do -- day la ham duy nhat con lai sau khi go 24 nut -/+. */
  setAttrVal(id, key, v) {
    const val = Math.min(Math.max(Math.round(v), 1), 20);
    this.setState(s => {
      const members = s.members.map(m => {
        if (m.id !== id) return m;
        return { ...m, attrs: { ...(m.attrs || {}), [key]: val } };
      });
      this.persist({ members });
      return { members };
    });
  }

  async doLoginNow() {
    const st = this.state;
    const p = st.phone.trim();
    const pk = phoneKey(p);
    const m = pk ? st.members.find(x => phoneKey(x.phone) === pk) : null;

    if (st.authMode === "signup") {
      if (!p) { this.setState({ loginErr: "Nhập số điện thoại." }); return; }
      if (st.pass.length < 6) { this.setState({ loginErr: "Mật khẩu cần ít nhất 6 ký tự." }); return; }
      if (st.pass !== st.pass2) { this.setState({ loginErr: "Hai lần nhập mật khẩu chưa giống nhau." }); return; }
      if (m) {
        const salt = pwSalt(), hash = await pwHash(st.pass, salt);
        this.setState(s => {
          const pwh = { ...(s.pwh || {}), [m.id]: hash ? { salt, hash } : null };
          this.persist({ pwh });
          return { pwh, auth: m.id, pass: "", pass2: "", loginErr: "", copied: "Số của bạn đã có trong " + (s.teams.find(t => t.id === m.teamId) || {}).name + " - vào đội luôn." };
        });
        return;
      }
      if (!st.nameInput.trim()) { this.setState({ loginErr: "Nhập tên của bạn để đội biết bạn là ai." }); return; }
      this.setState({ pending: { phone: p, name: st.nameInput.trim(), pass: st.pass }, pass: "", pass2: "", loginErr: "" });
      return;
    }

    if (st.authMode === "forgot") {
      if (!m) { this.setState({ loginErr: "Số này chưa có trong đội nào." }); return; }
      if (!m.dob) { this.setState({ loginErr: "Hồ sơ chưa có ngày sinh - nhờ admin đặt lại mật khẩu." }); return; }
      if (st.dobInput.trim() !== m.dob) { this.setState({ loginErr: "Ngày sinh không khớp hồ sơ đội." }); return; }
      if (st.pass.length < 6) { this.setState({ loginErr: "Mật khẩu mới cần ít nhất 6 ký tự." }); return; }
      if (st.pass !== st.pass2) { this.setState({ loginErr: "Hai lần nhập mật khẩu chưa giống nhau." }); return; }
      const salt2 = pwSalt(), hash2 = await pwHash(st.pass, salt2);
      this.setState(s => {
        const pwh = { ...(s.pwh || {}), [m.id]: hash2 ? { salt: salt2, hash: hash2 } : null };
        this.persist({ pwh });
        return { pwh, auth: m.id, pass: "", pass2: "", dobInput: "", loginErr: "", copied: "Đã đặt lại mật khẩu." };
      });
      return;
    }

    if (!m) {
      /* Khong tim thay so KHONG chac la "so nay chua thuoc doi nao". Neu app
         chua tai duoc danh sach doi (mat mang, may chu khong tra loi) thi
         `members` rong, va cau cu do loi cho nguoi dung: mot tai khoan that bi
         bao la khong ton tai, kem loi khuyen tao tai khoan moi -- tao xong lai
         thanh nguoi thu hai trung so. Phan biet hai truong hop. */
      this.setState({ loginErr: st.members.length
        ? "Số này chưa thuộc đội nào. Bấm Tạo tài khoản."
        : "Chưa tải được danh sách đội — có thể đang mất mạng. Kiểm tra kết nối rồi thử lại; đừng tạo tài khoản mới, số của bạn có thể đã có trong đội." });
      return;
    }
    /* Không còn mật khẩu dùng chung. Trước đây ai chưa đặt mật khẩu thì mặc định là
       "123456", và số điện thoại thì hiện ngay trong màn Thành viên — nên biết số là
       vào được tài khoản bất kỳ, kể cả admin, và admin thì xem được quỹ với nợ. Lần
       đăng nhập đầu của mỗi người giờ là lần ĐẶT mật khẩu, không phải lần nhập. */
    if (!((st.pwh && st.pwh[m.id]) || (st.pw && st.pw[m.id]))) {
      this.setState({
        // loginErr là kênh duy nhất màn đăng nhập hiện ra; `copied` không render ở
        // đây, nên đổi form mà báo bằng copied thì người dùng bị chuyển màn không
        // hiểu vì sao.
        authMode: "signup", nameInput: m.name, pass: "", pass2: "",
        loginErr: "Lần đầu vào app: đặt mật khẩu riêng cho số này."
      });
      return;
    }
    // Bản ghi cũ còn mật khẩu thô thì nâng cấp ngay lần đăng nhập đúng đầu tiên
    // rồi xoá bản thô đi — không bắt ai đặt lại mật khẩu.
    const rec = (st.pwh || {})[m.id], old = (st.pw || {})[m.id];
    const okPass = rec ? await pwVerify(st.pass, rec) : (old != null && st.pass === old);
    if (!okPass) { this.setState({ loginErr: "Mật khẩu chưa đúng. Bấm Quên mật khẩu nếu cần." }); return; }
    if (!rec) {
      const salt3 = pwSalt(), hash3 = await pwHash(st.pass, salt3);
      if (hash3) this.setState(s => {
        const pwh = { ...(s.pwh || {}), [m.id]: { salt: salt3, hash: hash3 } };
        const pw = { ...(s.pw || {}) }; delete pw[m.id];
        this.persist({ pwh, pw }); this.cloudPush();
        return { pwh, pw };
      });
    }
    this.setState({ auth: m.id, pass: "", loginErr: "" });
  }

  /* Hàm này trước đây tra `s.teams` -- dữ liệu MÁY NÀY -- nên trên máy của đồng
     đội mảng đó rỗng và mọi mã đều trượt, kèm câu "Hỏi admin của đội" đổ lỗi cho
     người không làm gì sai. Giờ nó hỏi máy chủ, nên mã mời mới thật sự là mã mời.

     Nhận cả mã ngắn 5 ký tự (thứ người ta nhắn cho nhau) lẫn mã dài 12. */
  async joinTeam() {
    const code = (this.state.joinCode || "").trim();
    if (!code) { this.setState({ loginErr: "Nhập mã đội." }); return; }
    this.setState({ loginErr: "Đang tìm đội…" });
    let row;
    try {
      const r = await sbRpc("team_pull", { p_code: code });
      row = r && r[0];
      if (!row) throw new Error("không tìm thấy");
    } catch (e) {
      /* Cung mot luat voi `createTeam`: KHONG do `e.message` ra man hinh. No la
         chu ky thuat cua thu vien mang ("Failed to fetch", "NetworkError...") va
         nguoi dung phui khong doc duoc gi tu do. Cho nay truoc day do that, nen
         may chu tam dung thi cau thu doc duoc dung chu "Failed to fetch".
         May chu gia free TU TAM DUNG khi lau ngay khong ai dung, va luc do
         khong con ten mien -- tinh huong nay se quay lai, khong phai hiem. */
      this.setState({ loginErr: /ma doi khong dung|không tìm thấy/.test(e.message)
        ? "Mã đội không đúng. Kiểm tra lại mã đội trưởng gửi."
        : ("Chưa vào được đội. " + netNow()) });
      return;
    }
    const data = row.data || {};
    const jsalt = pwSalt(), jhash = await pwHash((this.state.pending || {}).pass, jsalt);
    /* Tu them MINH vao doi tren may chu. Khong lam buoc nay thi: khong co chia
       admin -> khong day len duoc -> nhip keo ke tiep de ban may chu (khong co
       minh) len va minh bien mat khoi may cua chinh minh. */
    const pnd = this.state.pending || {};
    let joined = null;
    try {
      const jr = await sbRpc("team_join", { p_code: row.code, p_member: {
        id: Date.now(), teamId: (data.teams && data.teams[0] ? data.teams[0].id : null),
        num: "", name: pnd.name, type: "Wildcard", grp: "", shirt: "", size: "",
        phone: pnd.phone, rating: 10, load: 0, owed: 0 } });
      joined = jr && jr[0];
    } catch (e) {
      this.setState({ loginErr: "Vào được đội nhưng chưa ghi được tên bạn lên máy chủ. " + netNow() });
      return;
    }
    this.setState(s => {
      const p = s.pending || {};
      const teams = (data.teams && data.teams.length) ? data.teams
        : [{ id: 1, name: row.name, code: row.short_code, cloudCode: row.code, opening: 0 }];
      const tid = teams[0].id;
      // Admin đã thêm số này rồi thì ghép vào đúng hồ sơ, đừng đẻ ra người trùng tên.
      // May chu vua tra ve ban ghi that su cua minh (hoac ban ghi admin da them
      // san). Dung no, dung tu dung ban rieng roi lech id voi ca doi.
      const mine = (joined && joined.member) || {};
      const pk = phoneKey(p.phone);
      const list = (data.members || []).slice();
      if (!list.some(m => phoneKey(m.phone) === pk)) list.push(mine);
      const pwh = { ...(data.pwh || {}), [mine.id]: jhash ? { salt: jsalt, hash: jhash } : null };
      const patch = { ...data, teams, members: list, pwh,
        attendByOcc: attToNested(row.att), auth: mine.id, pending: null, joinCode: "", door: "",
        loginErr: "", netErr: "",
        copied: "Đã vào " + row.name + (mine.role === "admin" ? " với quyền admin." : " với vai cầu thủ.") };
      this.persist(patch);
      this.cloudSet({ code: row.code, rev: (joined && joined.rev) || row.rev });
      this.teamListPut({ code: row.code, short: row.short_code, name: row.name });
      setTimeout(() => this.cloudPush(), 0);
      this.cloudStart();
      return patch;
    });
  }

  // Nạp đội mẫu để xem thử. Chỉ cho nạp khi máy còn trống, để không đè lên đội thật
  // của ai đó bằng một cú bấm nhầm.
  loadDemo() {
    this.setState(s => {
      if ((s.members || []).length) return { loginErr: "Máy này đã có dữ liệu đội. Xoá sạch trước nếu muốn xem đội mẫu." };
      const d = demoData();
      // Bấm "xem thử" thì phải được xem. Không đăng nhập luôn thì người lạ kẹt ở màn
      // đăng nhập, vì muốn vào phải gõ một trong ba mươi sáu số điện thoại mà màn
      // đăng nhập không hiện số nào — và cũng không nên hiện.
      const admin = d.members.find(m => m.role === "admin") || d.members[0];
      // Ghi ca `auth` xuong, khong chi `d`. `persist` tron voi state HIEN TAI,
      // ma luc nay auth van con null -- nen ban luu ra la mot doi khong co ai
      // dang dang nhap, va F5 mot cai la ket o man dang nhap khong co mat khau.
      this.persist({ ...d, auth: admin ? admin.id : null });
      return { ...d, loginErr: "", auth: admin ? admin.id : null,
        copied: "Đang xem đội mẫu. Xoá sạch được ở Đội > Cài đặt đội." };
    });
  }

  // Xoá hẳn mọi thứ app giữ trên máy này. Không hoàn tác được, nên hỏi trước.
  /* "Xoa sach" truoc day chi xoa `dpfm-v3`. `dpfm-cloud` (mang CHIA SUA) va
     `dpfm-teams` (danh sach doi, moi doi kem chia) o lai nguyen ven -- da do:
     sau khi bam Xoa sach, chia sua van con tren may. Hai hau qua nguoc nhau va
     deu xau: dua may cho nguoi khac thi ho van sua duoc doi cua minh; va nhip
     keo 8 giay van keo doi ve, nen nut nay trong nhu khong an gi.
     Nay xoa ca ba. Va vi chia sua may chu KHONG dua lai lan thu hai, cau hoi
     phai noi ro dieu do truoc khi nguoi ta bam. */
  wipeAll() {
    const NL = String.fromCharCode(10);
    const hasKey = !!(this.cloudMeta() || {}).adminKey;
    if (typeof confirm === "function" && !confirm(
      "Xoá sạch mọi dữ liệu của app trên máy này?" + NL + NL +
      "Mất thành viên, quỹ, lịch, đội hình, mật khẩu và danh sách đội của máy này." + NL +
      (hasKey
        ? ("MẤT LUÔN CHÌA SỬA ĐỘI đang giữ trên máy. Máy chủ KHÔNG đưa lại chìa lần thứ hai, nên không còn máy nào sửa được đội nữa." + NL +
           "Tải bản dự phòng trước đi — trong Cài đặt đội." + NL)
        : "") +
      NL + "Không hoàn tác được.")) return;
    try {
      localStorage.removeItem(KEY);
      localStorage.removeItem(KEY + "-loi");
      localStorage.removeItem(CLOUD_KEY);
      localStorage.removeItem("dpfm-teams");
    } catch (e) {}
    if (typeof location !== "undefined") location.reload();
  }

  /* Tạo đội trên MÁY CHỦ trước, rồi mới dựng ở máy này -- ngược lại thì máy chủ
     hỏng là đội tồn tại ở một máy duy nhất mà không ai biết. Mã thật do máy chủ
     sinh (12 ký tự, không đoán được); mã ngắn 5 ký tự chỉ để đọc cho nhau nghe. */
  async createTeam() {
    const name = (this.state.newTeam || "").trim();
    if (!name) { this.setState({ loginErr: "Nhập tên đội." }); return; }
    this.setState({ loginErr: "Đang tạo đội trên máy chủ…" });
    let row;
    try {
      const r = await sbRpc("team_create", { p_name: name });
      row = r && r[0];
      if (!row) throw new Error("máy chủ không trả về đội");
    } catch (e) {
      /* KHONG do `e.message` ra man hinh: no la chu ky thuat cua thu vien mang
         ("Failed to fetch", "b", "NetworkError...") va nguoi dung phui khong doc
         duoc gi tu do. Noi cai ho lam duoc. */
      this.setState({ loginErr: "Chưa tạo được đội. " + netNow() });
      return;
    }
    const salt = pwSalt(), hash = await pwHash(this.state.pending.pass, salt);
    this.setState(s => {
      const tid = Date.now();
      const teams = s.teams.concat([{ id: tid, name: name, code: row.short_code, cloudCode: row.code, opening: 0 }]);
      const id = tid + 1;
      const member = { id: id, teamId: tid, num: "", name: s.pending.name, type: "Đá cứng", grp: "", shirt: "", size: "", phone: s.pending.phone, role: "admin", rating: 10, load: 0 };
      const members = s.members.concat([member]);
      const pwh = { ...(s.pwh || {}), [id]: hash ? { salt, hash } : null };
      this.persist({ members, pwh, teams });
      this.cloudSet({ code: row.code, rev: 0, adminKey: row.admin_key });
      this.teamListPut({ code: row.code, short: row.short_code, name: name, adminKey: row.admin_key });
      setTimeout(() => this.cloudPush(), 0);
      this.cloudStart();
      return { teams, members, pwh, auth: id, pending: null, newTeam: "", door: "", loginErr: "",
        copied: "Đã tạo " + name + " — mã mời " + row.short_code + ". Bạn là admin đội." };
    });
  }

  renderVals() {
    const st = this.state;
    const showNum = this.props.showJerseyNumbers ?? true;
    const byId = id => st.members.find(m => m.id === id);
    // Tong sao mot ben. Lam tron nua sao de nhan khong ra 12,4999999.
    const sideStars = ids => Math.round(
      (ids || []).reduce((n, id) => n + starCount(ratingOf(byId(id) || {})), 0) * 2) / 2;
    const me = st.auth ? byId(st.auth) : null;
    const isAdmin = !!(me && me.role === "admin");
    const teamId = me ? me.teamId : (st.teams[0] || {}).id;
    const team = st.teams.find(t => t.id === teamId) || st.teams[0] || { name: "Đội", code: "" };
    const fee = this.fee(team);
    const teamMembers = st.members.filter(m => m.teamId === teamId);
    const active = teamMembers.filter(m => !m.hidden);
    const todayDmy = (() => { const d = new Date(); return d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear(); })();
    const hurtOf = m => hurtInfo(m, todayDmy);
    /* MOT thu tu xep hang duy nhat, dung chung cho bang Thong ke va bieu do cot
       ngay tren no. Truoc do bieu do tu sap lai theo `met.get` con bang sap theo
       "da cham truoc, roi diem, roi diem cu" -- ket qua la nguoi deo huy chuong
       vang tren bieu do dung hang TU trong bang cach do 40px. Hai khoi canh nhau
       noi nguoc nhau la cach mot bang so bat dau mat tin. */
    const rankByNow = st.rankBy || defaultRankBy(active);
    const rankMet = METRICS.find(x => x.id === rankByNow) || METRICS[0];
    const rankSorted = active.slice().sort((a, b) =>
      (rankMet.id === "rating" ? (ratingView(b).rated ? 1 : 0) - (ratingView(a).rated ? 1 : 0) : 0)
      || (rankMet.get(b) || 0) - (rankMet.get(a) || 0)
      || (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0)
      /* Nac cuoi la ten, giong het `honourBoard` -- hai man phai tra loi cung mot
         cau hoi "ai hang ba" bang cung mot cach. */
      || String(a.name || "").localeCompare(String(b.name || ""), "vi"));
    const admins = teamMembers.filter(m => m.role === "admin");
    const inTeam = r => (r.teamId == null ? 1 : r.teamId) === teamId;
    this._team = teamId;
    const teamLedger = st.ledger.filter(inTeam);
    const teamMatchIx = st.matches.map((m, i) => ({ m: m, i: i })).filter(x => inTeam(x.m));
    const teamMatches = teamMatchIx.map(x => x.m);
    /* Khoi "may tran gan day" duoi san o man chien thuat -- tinh MOT lan o day
       vi `matchInsights` duyet lai ca danh sach tran, va sau binding ben duoi
       deu doc no. Khai tuong minh tung khoa chu khong spread: `check.js` soi
       TINH, no khong hieu `...(() => ({...}))()` va se bao thieu binding. */
    const insight = matchInsights(teamMatches);
    const insightCount = insight.pos.length + insight.neg.length;
    /* Cung mot danh sach, sap theo NGAY that, moi nhat truoc -- va mang theo vi
       tri goc trong `st.matches` de duong sua tran ghi dung dong. */
    const teamMatchesRecent = matchOrder(teamMatches).map(o => ({ m: o.m, ix: teamMatchIx[o.i].i }));
    /* Ban ghi cu de ten doi ban trong truong `date` (dang ma `oppOf` van doc
       duoc), nen "co ngay" = co CA `opp` lan `date`. Dung dieu kien nay o moi
       nhan noi ve thu tu thoi gian, de app khong bao gio hua mot thu tu no
       khong biet. */
    const datedAll = teamMatches.length > 0 && teamMatches.every(g => g && g.opp && g.date);
    const teamEvents = st.events.filter(inTeam);
    const stripe = i => i % 2 ? "#121526" : "transparent";
    const grade = m => gradeOf(ratingOf(m));
    const posOf = m => (m.posMain !== undefined ? { main: m.posMain || "", alt: m.posAlt || [] } : parsePos(m.pos));
    const posLabelOf = m => { const p = posOf(m); return p.main ? (p.main + (p.alt.length ? " · " + p.alt.join(" ") : "")) : "-"; };
    const lineOf = m => LINE_OF[posOf(m).main] || "";
    /* Mau cua chip hang cung la mot cach IN ra hang, nen no di qua cua chung:
       chua ai cham thi `ratingView().grade` la chuoi rong -> GRADE_TONE[""] =
       to xam trung tinh, thay vi to mau cam cua hang D. */
    const tone = m => GRADE_TONE[ratingView(m).grade];

    const nowT = new Date();
    const isoT = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    /* Quet NGUOC 14 ngay chu khong chi 28 ngay toi.

       Truoc do vong lap bat dau tu i=0, nen qua nua dem la buoi hom qua bien mat
       khoi danh sach: khong xem lai diem danh, khong thu duoc tien san, khong sua
       duoc doi hinh cua chinh buoi vua da. Ma tien san thi luon thu vao sang hom
       sau. Buoi da qua van la buoi -- chi khac o cho no khong con cho ai tra loi. */
    const OCC = [];
    for (let i = -14; i < 28; i++) {
      const d = new Date(nowT.getFullYear(), nowT.getMonth(), nowT.getDate() + i);
      teamEvents.forEach(e => {
        const base = new Date(e.date + "T00:00:00");
        const hit = occHit(e, d, base, isoT(d));
        if (hit) OCC.push({ e: e, d: d, key: e.id + "@" + isoT(d), past: i < 0 });
      });
    }
    /* Mac dinh la buoi SAP TOI gan nhat, khong phai OCC[0] -- tu khi danh sach co
       ca qua khu thi OCC[0] la buoi cu nhat, chon no lam mac dinh thi mo app ra
       thay buoi hai tuan truoc. Khong con buoi nao phia truoc thi lay buoi vua da. */
    const occNext = OCC.find(o => !o.past) || OCC[OCC.length - 1] || null;
    const curOcc = (st.occ && OCC.some(o => o.key === st.occ)) ? st.occ
      : (occNext ? occNext.key : "none");
    this._occ = curOcc;
    const curOccObj = OCC.find(o => o.key === curOcc) || null;
    const hasOcc = OCC.length > 0;
    const att = hasOcc ? ((st.attendByOcc || {})[curOcc] || {}) : {};
    this._att = att;
    const mKind = (st.matchKindByOcc || {})[curOcc] || (curOccObj && curOccObj.e.kind === "match" ? "vs" : "free");
    const inhouse = mKind === "inhouse";
    const side = inhouse ? (st.teamTab || "A") : "A";
    const slotKey = curOcc + (inhouse && side === "B" ? "#B" : "");
    this._slotKey = slotKey;
    // Side B of an in-house session gets its own tactic, bench, captain and kit
    // under a "#B"-suffixed key — the same convention slotKey already uses. Side A
    // and every vs/free session keep reading the plain team key, so nothing that
    // was saved before this existed has to migrate.
    const sideKey = teamId + (inhouse && side === "B" ? "#B" : "");
    this._sideKey = sideKey;
    // In an in-house game the two sides are two real teams on one pitch, so a
    // player belongs to exactly one of them. assign() only ever looked at the
    // side being edited, which let the same person be named in both XIs at once.
    this._otherSlotKey = inhouse ? curOcc + (side === "B" ? "" : "#B") : null;
    this._otherSideKey = inhouse ? teamId + (side === "B" ? "" : "#B") : null;
    this._otherSideName = side === "B" ? "Đội A" : "Đội B";
    const kitSide = ((st.kitByTeam || {})[sideKey]) || "home";
    const kit = kitSide === "home" ? this.home() : this.away();

    // The tactic library stays per team; only the selection is per side.
    const libAll = ((st.tacticLib || {})[teamId] || []).length ? st.tacticLib[teamId] : [defaultTactic()];
    const actTactic = libAll.find(t => t.id === ((st.tacticSel || {})[sideKey])) || libAll.find(t => t.isDefault) || libAll[0];
    const tacPhase = st.tacPhase === "off" ? "off" : "on";
    this._phase = tacPhase;
    const LINE_VN = { TM: "Thủ môn", HV: "Hậu vệ", TV: "Tiền vệ", "TĐ": "Tiền đạo" };
    const szKey = (actTactic && SIZE_FORMATIONS[actTactic.size]) ? actTactic.size : "7";
    const effFormation = (actTactic && SIZE_FORMATIONS[szKey][actTactic.formation]) ? actTactic.formation : Object.keys(SIZE_FORMATIONS[szKey])[0];
    const SF_ = SIZE_FORMATIONS[szKey][effFormation];
    const FM_ = { labels: SF_.labels, roles: SF_.labels.map(l => LINE_OF[l] || "TV"), names: SF_.labels.map(l => LINE_VN[LINE_OF[l]] || "Cầu thủ"), pos: SF_.pos };
    const SLOT_ROLES = FM_.roles;
    const SLOT_NAMES = FM_.names;
    // Slot count follows the formation (5 / 7 / 11). Every stored lineup is fitted
    // to it on read, so a squad saved at one pitch size never leaves players
    // occupying invisible slots at another.
    this._slotCount = SLOT_ROLES.length;
    const tplSlots = fitSlots((st.slotsByTeam || {})[teamId], SLOT_ROLES.length);
    // Phai dat SAU `tplSlots`: khoi nay chay ngay va doc no.
    /* Da noi bo: mot nguoi chi dung duoc o MOT ben. App von da biet ben kia
       (`_otherSlotKey`/`_otherSideKey`, `assign` dung no de "keo" nguoi sang), nhung
       cac cho CHON nguoi thi khong nhin sang do -- xep tu dong cho Doi A xong,
       xep tiep Doi B thi bon trong nam nguoi cua B dang dong thoi da chinh ben A.
       Tap nay la nhung ai ben kia dang dung. */
    const otherUsed = (() => {
      if (!inhouse) return {};
      const out = {};
      /* Ben A doc doi hinh theo dung cach `slots` doc no: `slotsByOcc[key]` neu co,
         khong thi ve MAU CUA DOI (`tplSlots`). Chi doc slotsByOcc thi ben B thay
         ben A rong tron va lai xep trung y nguyen bay nguoi -- da do dung nhu vay. */
      const otherIsA = side === "B";
      const oth = ((st.slotsByOcc || {})[this._otherSlotKey]) || (otherIsA ? tplSlots : null) || [];
      oth.forEach(id => { if (id) out[id] = "sân"; });
      benchOf(st.benchByTeam, this._otherSlotKey, this._otherSideKey).forEach(id => { if (id && !out[id]) out[id] = "dự bị"; });
      return out;
    })();
    const otherSideName = inhouse ? ("Đội " + (side === "A" ? "B" : "A")) : "";
    /* A slot holding an id nobody answers to is an EMPTY slot, not an occupied
       one. Without this, deleting a member left the slot looking empty and
       counting as empty while `slots[i]` stayed truthy -- so clicking it took
       the "pick this player up" branch and the shortlist never opened. The slot
       was unfillable and there was no way to tell why. Normalised here rather
       than at each of the dozen `slots[i]` reads, so any future path that leaves
       a stale id behind cannot recreate the dead slot. */
    const slots = fitSlots(
      ((st.slotsByOcc || {})[slotKey]) || (inhouse && side === "B" ? null : tplSlots),
      SLOT_ROLES.length).map(id => (id && byId(id)) ? id : null);
    // Menus for the pitch. Built here because slotVals is assembled before the
    // generic `guard` helper exists further down; isAdmin is already in scope.
    const slotCtxTitle = (i, m) => m
      ? (m.name + " · " + SLOT_NAMES[i])
      : ("Ô " + SLOT_NAMES[i] + " còn trống");
    const slotCtxItems = (i, m) => {
      const role = SLOT_ROLES[i];
      // Nhan THAT cua o ("LB"/"RW"), de tinh duoc ca canh chu khong chi tuyen.
      const label = FM_.labels[i];
      if (!m) {
        if (!isAdmin) return [];
        const picked = st.picked ? byId(st.picked) : null;
        // Everyone not already on the pitch, ranked the way FM ranks a position:
        // natural fit first, then rating, with people who said they are not
        // coming pushed to the bottom rather than hidden (a kickabout squad is
        // small enough that "he said no but I need him" is a real case).
        const shortlist = active
          .filter(p => slots.indexOf(p.id) < 0)
          .filter(p => !otherUsed[p.id])
          .map(p => ({ p, cost: fitCostAt(posOf(p), label), side: sideCost(posOf(p), label), out: att[p.id] === "no" }))
          /* Xep theo SAO truoc: sao da gop ca hop-vi-tri lan chi so, nen no la
             thu tu dung hon "fit roi den diem tho". Nguoi chua cham du chi so
             roi ve cach xep cu va xuong duoi nguoi da cham -- khong de mot nguoi
             khong ai biet gi dung dau danh sach. */
          .map(x => { const rs = roleStars(x.p, role); return { p: x.p, cost: x.cost, out: x.out, st: rs.rated ? rs.stars : -1 }; })
          .sort((a, b) => (a.out - b.out) || (b.st - a.st) || (a.cost - b.cost) || (b.p.rating - a.p.rating))
          .slice(0, 6);
        return [
          picked && { label: "Đưa " + picked.name + " vào ô này", tone: "act", click: () => this.assign(i, picked.id) }
        ].concat(shortlist.map((x, n) => ({
          label: x.p.name,
          /* `x.p.rating` la truong tho trong ban ghi; moi cho khac tren app doc
             `ratingView().score` (co cua chan: chua cham thi ra "—", khong bia
             mot con so). Hai nguon cho cung mot y nghia = hai con so khac nhau
             canh nhau tren cung mot man: hang du bi ghi 14, menu nay ghi 17.
             Va con so tran khong noi no la gi -- ghi "diem". */
          /* Sao theo vai di TRUOC chu, dung cach Football Manager xep hang mot
             o: mat doc sao de so nhanh giua sau nguoi, roi moi doc chu de biet
             vi sao. Chua cham du chi so cua tuyen do thi KHONG in sao -- dong
             nay van con "so truong · diem —" nhu truoc. */
          hint: (() => {
            const rs = roleStars(x.p, role);
            return (rs.rated ? starGlyphs(rs.stars) + " · " : "")
              + (x.out ? "vắng · " : "")
              + fitLabel(x.cost, fitUnknown(posOf(x.p)), x.side)
              + " · điểm " + ratingView(x.p).score;
          })(),
          tone: n === 0 && !picked ? "act" : "",
          click: () => this.assign(i, x.p.id)
        })), [
          // Taught where it is used, not in a tour up front, and only until they
          // have done it once.
          !st.sawCtx && { label: "Mẹo: chuột phải để mở nhanh menu này", hint: "giữ lâu trên điện thoại",
            click: () => this.setState({ ctx: null }) }
        ]);
      }
      const isCap = (st.captainByTeam || {})[sideKey] === m.id;
      return [
        isAdmin && { label: "Chỉ đạo cá nhân", hint: role, click: () => this.setState({
          // Bang chi dao nay nam ngay duoi bang du bi, tuc cung mot pane voi san.
          // Khong phai doi pane nua: bam mot o tren san thi bang hien ra ngay ben
          // duoi, khong nhay man. (Truoc day no o pane khac nen cho nay phai doi
          // paneTab -- doi pane roi lai phai tim duong quay ve san.)
          pickedSlot: i, picked: null }) },
        isAdmin && { label: isCap ? "Bỏ băng đội trưởng" : "Đặt làm đội trưởng", click: () => this.setState(s => {
          const captainByTeam = { ...s.captainByTeam, [sideKey]: isCap ? null : m.id };
          this.persist({ captainByTeam });
          return { captainByTeam };
        }) },
        { label: "Xem hồ sơ", click: () => this.setState({ tab: "members", memberView: "list", sel: m.id, picked: null }) },
        isAdmin && { label: "Ra sân · về dự bị", tone: "danger", click: () => this.benchOut(i) }
      ].concat(isAdmin ? (() => {
        /* Thay nguoi la MOT viec. Truoc day phai bam "ra san" roi tu di tim o
           trong ma dua nguoi khac vao -- hai thao tac roi, va khong cho nao ghi
           lai da thay nhung ai, nen tran xong khong ai nho.

           LOI DA SUA: danh sach nay tung doc `bench`, la mang DE HIEN THI o
           bang ghe du bi -- no chi co {num, name, pos, mark, bg, border, click},
           KHONG co `id`. Nen `subFor(i, b.id)` nhan undefined: o bi xoa trong,
           nguoi duoc chon khong vao san, va khong co loi nao. Bam "Thay bang X"
           bon lan lien tiep chi lam doi hinh vong di bon nguoi.
           Nay dung chinh cach xep hang cua o trong: nguoi hop tuyen truoc, roi
           diem, ai bao vang xuong duoi -- kem ca ly do o dong `hint`. */
        const list = active
          .filter(p => slots.indexOf(p.id) < 0)
          .filter(p => !otherUsed[p.id])
          .map(p => ({ p, cost: fitCostAt(posOf(p), label), side: sideCost(posOf(p), label), out: attState(att[p.id]) === "no",
                       rest: readiness(p.id, teamMatches) }))
          // Met thi xuong duoi nguoi khoe cung muc hop tuyen -- cung mot quy tac
          // voi may xep tu dong, khong duoc mot cho noi met mot cho lo di.
          .sort((a, b) => (a.out - b.out) || (a.cost - b.cost)
            || (restPenalty(a.rest) - restPenalty(b.rest)) || (ratingOf(b.p) - ratingOf(a.p)))
          .slice(0, 6);
        return list.map(x => ({
          label: "Thay bằng " + x.p.name,
          hint: (x.out ? "vắng · " : "") + fitLabel(x.cost, fitUnknown(posOf(x.p)), x.side) + " · điểm đánh giá " + ratingView(x.p).score
            + (x.rest && x.rest.tired ? " · đá " + x.rest.streak + " buổi liền" : ""),
          click: () => this.subFor(i, x.p.id)
        }));
      })() : []);
    };

    // One previewed shape for the whole pitch, shared by every slot.
    const slotGroup = n => ROLE_GROUP[FM_.labels[n]] || "mid";
    /* Vai tro cua mot o trong mot pha.

       Ban ghi cu chi co MOT `role` cho ca hai pha, va khoa cua no co the thuoc
       ve pha nay hoac pha kia -- `splitLegacyRole` xep no vao dung cho thay vi
       doan. Chua chon gi thi lay vai tro dau tien cua nhom, dung nhu truoc. */
    /* Bang chi dao ca nhan ghi vao `slotOvr` (sua rieng cho buoi nay), con hinh
       tren san doc tu `actTactic.slots` (mau cua doi). Hai noi khac nhau, nen
       doi vai tro trong bang chi doi mau nut chu san dung yen -- cung ho voi
       cau 52. Doc theo dung thu tu uu tien: sua rieng thang mau. */
    const slotRoleKey = (n, ph) => {
      const g = slotGroup(n);
      const ovr = (st.slotOvr || {})[slotKey + "#" + n]
        || ((actTactic && actTactic.slots) || {})[n] || {};
      const legacy = splitLegacyRole(g, ovr.role || "");
      if (ph === "off") return ovr.roleOff || legacy.roleOff || (ROLES_OOP[g][0] || [])[0];
      return legacy.role || (ROLES[g][0] || [])[0];
    };
    const slotRolesOf = ph => SLOT_ROLES.map((r, n) => ({ g: slotGroup(n), r: slotRoleKey(n, ph) }));
    // Giu lai de `tacticConflicts` van doc duoc tu the tung o.
    const slotPostures = SLOT_ROLES.map((r, n) => {
      const g = slotGroup(n);
      if (g === "gk") return "gk";
      return roleDuty(g, slotRoleKey(n, tacPhase), tacPhase);
    });
    const formOff = (actTactic && actTactic.formationOff) || "";
    // Hinh goc cua mot pha: so do co bong, hoac so do mat bong da sap lai theo
    // dung thu tu o cua so do co bong.
    const baseOf = ph => phaseBase(szKey, effFormation, formOff, ph) || FM_.pos;
    const otherPhase = tacPhase === "on" ? "off" : "on";
    /* Hai sân cạnh nhau: cùng đội hình, pha còn lại. Dưới 1500px không đủ chỗ
       cho hai, giữ nguyên một sân + nút chuyển pha. */
    /* Hai san canh nhau la de SO hai pha -- dung viec cua tab "Chien thuat". O tab
       "Doi hinh" thi khong: trong tai do duoc 7/7 quan cung vi tri, lech trung binh
       4,4% (~17px), o cua san thu hai chi mang 2 truong so voi 5 cua san chinh --
       ma no an dung 396px, 20,6% chieu ngang man hinh. Bo no o tab Doi hinh thi san
       chinh cao them va bang ca doi rong them, ca hai deu la thu dang lam o tab do. */
    const dualPitch = !st.narrow && !!st.wide4 && (st.shapeTab || "shape") === "instr";
    const pitchShape = shapeFor(actTactic, baseOf(tacPhase), slotRolesOf(tacPhase), tacPhase);
    const pitchShape2 = shapeFor(actTactic, baseOf(otherPhase), slotRolesOf(otherPhase), otherPhase);
    /* Vị trí đang hiện trên sân, khi HLV đã dựng bước:
       - đang phát  -> nội suy giữa hai bước liên tiếp
       - đang sửa   -> đúng ảnh chụp của bước đang mở
       - còn lại    -> hình suy từ chỉ đạo, y như trước. */
    const stepList = forPhase(st.steps, tacPhase);
    /* Hinh NEN de bo dem phat doan ap `transform` len -- xem `playApply`. */
    this._pitchBase = pitchShape;
    /* Dang PHAT thi `left`/`top` giu nguyen hinh nen: chuyen dong di bang
       `transform` do `playApply` ghi thang, khong qua state. Truoc do o day noi
       suy theo `st.playMs`, ma `playMs` duoc setState moi 60ms -- tuc dung lai
       ca trang muoi bay lan mot giay de doi vi tri bay cai vong tron.
       Dang SUA tung buoc thi van dat dung anh chup cua buoc do: do la mot vi
       tri tinh, dat mot lan, khong phai hoat anh. */
    const livePos = (st.stepMode && stepList[st.stepI]) ? stepList[st.stepI].pos : null;

    const slotVals = {};
    SLOT_ROLES.forEach((role, i) => {
      // Nhan THAT cua o ("LB"/"RW"). `role` chi la TUYEN nen no coi LB voi RB
      // la mot; muon biet sai canh hay khong thi phai co nhan.
      const label = FM_.labels[i];
      const m = slots[i] ? byId(slots[i]) : null;
      slotVals["s" + i] = {
        num: m ? (showNum ? m.num : role) : role,
        name: m ? m.name : SLOT_NAMES[i],
        /* Thu mon mac ao khac ca doi -- ngoai doi that va trong FM deu the. Truoc
           do bay nut tren san dung dung mot mau, nhin vao khong biet ai bat gon. */
        bg: m ? (role === "TM" ? GK_KIT : kit) : "rgba(9,15,29,0.55)",
        // Ô trống phải TRÔNG trống. Trước đây ô chưa có ai vẫn là một vòng tròn
        // đặc, viền liền, kèm tấm biển tên y hệt ô đã có người -- nhìn vào sân là
        // thấy một đội đã xếp xong, trong khi thanh trên đầu ghi "XẾP 0/7". Đây
        // đúng loại lỗi app nói điều nó không biết. Viền đứt + không nền + không
        // biển tên là quy ước ai cũng đọc được, không phải học màu.
        empty: m ? "" : "1",
        // Where this slot actually sits: the formation, moved by the instructions
        // for the phase on show. Changing "Dâng cao" slides the block on the pitch
        // you are looking at -- NN/g files that under preventing the error, not
        // reporting it. The demo animation layers on top of the previewed shape.
        /* Vi tri NEN, khong con cong do lech cua mo phong vao day. Truoc do moi
           nhip mo phong (2,2 giay) doi `demoPhase` trong state, khung dung lai
           TOAN BO DOM, va chuyen dong chay bang `transition: left, top` -- hai
           thuoc tinh keo ca luong bo cuc. Do duoc tren app that: mot lan lat ton
           9,5 den 50,4ms, tuc co nhip mat toi ba khung hinh dung luc chuyen dong
           bat dau. Nay do lech di vao `transform` va do bo dem cua mo phong ap
           thang len bay o tren san, khong qua state, khong dung lai DOM. */
        left: (() => {
          if (livePos) return livePos[i] ? livePos[i][0] : pitchShape[i][0];
          return parseFloat(pitchShape[i][0]) + "%";
        })(),
        top: (() => {
          if (livePos) return livePos[i] ? livePos[i][1] : pitchShape[i][1];
          return parseFloat(pitchShape[i][1]) + "%";
        })(),
        /* Do lech cua tung tu the so voi vi tri nen, tinh bang phan tram be
           ngang/chieu cao san. Thuan: chi la so, khong dung DOM. Bo dem doc no
           roi doi ra px theo kich thuoc san tai luc chay. */
        demoOff: (() => {
          const bx = parseFloat(pitchShape[i][0]), by = parseFloat(pitchShape[i][1]);
          const lineUp = { low: 7, mid: 12, high: 19 }[insOf(actTactic, "line")];
          const pressUp = { low: -5, mid: 0, high: 6 }[insOf(actTactic, "press")];
          const xAt = ph => {
            const spread = ph ? 4 : -2;
            return Math.max(8, Math.min(92, bx + (bx < 50 ? -spread : bx > 50 ? spread : 0))) - bx;
          };
          const yAt = ph => {
            if (role === "TM") return Math.max(76, by - (ph ? 4 : 0)) - by;
            const y = ph ? by - lineUp : by + 4 - pressUp;
            return Math.max(12, Math.min(92, y)) - by;
          };
          return [[xAt(0), yAt(0)], [xAt(1), yAt(1)]];
        })(),
        moveMs: ({ slow: 1500, mid: 1000, fast: 650 }[((actTactic && actTactic.ins) || {}).tempo || "mid"]) + "ms",
        warn: (() => {
          if (!m) return "";
          const p = posOf(m);
          if (!p.main) return "";
          if (LINE_OF[p.main] === role) return "";
          if (p.alt.some(x => LINE_OF[x] === role)) return "·";
          return "!";
        })(),
        /* Bien duoi so ao la MA CUA O trong so do, khong phai vi tri so truong
           cua nguoi. Truoc day nguoc lai: dua mot trung ve len da tien dao thi o
           tien dao ghi "CB", va chu "ST" bien mat khoi ca san -- san thoi noi
           duoc ai da tien dao. Tab "Chien thuat" von da lam dung; day la man
           quan trong hon nen phai lam dung truoc. Vi tri so truong khong mat:
           no di theo ten trong bien duoi ("Lam·CB"), dung mot quy uoc voi
           tab kia. */
        posTag: m ? (FM_.labels[i] || role) : "",
        // Vi tri so truong, chi ghi khi KHAC ma o -- trung nhau thi khong them muc.
        natTag: (m && posOf(m).main && posOf(m).main !== FM_.labels[i]) ? posOf(m).main : "",
        /* Diem danh phai co mat NGAY TREN SAN. App biet tung nguoi da tra loi
           chua (man tong quan ghi 0/14), nhung man xep doi hinh giau di, nen no
           van moi bam "Luu doi hinh 7/7" cho mot doi hinh chua ai nhan da. Cham
           goc trai: xanh = di, cam = chua chac, do = vang, xam = chua tra loi.
           Chi ve khi co buoi sap toi -- khong buoi thi khong co gi de tra loi. */
        attDot: (m && hasOcc) ? (attState(att[m.id]) === "none" ? "rgba(250,250,255,0.85)" : ATT_COLOR[attState(att[m.id])]) : "",
        /* Chua tra loi = vong TRON RONG. Ban dau no la mot cham xam dac 10px o
           50% do duc tren nen toi -- trong tai vong 9 ngoi doc ca man hinh ma
           khong thay no, va bao rang san "khong mang trang thai diem danh".
           Cham ma khong ai thay thi bang khong co cham. Rong ruot cung la nghia
           dung: app CHUA biet nguoi nay co di hay khong. */
        attFill: (m && hasOcc) ? (attState(att[m.id]) === "none" ? "#090F1D" : ATT_COLOR[attState(att[m.id])]) : "",
        attWhy: (m && hasOcc) ? (m.name + " · " + ATT_LABEL[attState(att[m.id])]) : "",
        // Diem 1-20 ngay tren o: so sanh nguoi tren san voi nguoi du bi ma khong
        // phai roi man. Chua cham thi khong ve gi -- khong bia mot con so.
        ratingTag: (m && ratingView(m).rated) ? String(ratingOf(m)) : "",
        /* Diem hop VAI TRO, khong phai diem chung. FM ghi canh moi o mot con so
           "kha nang theo vai tro"; o day suy tu dung ba nhom chi so da cham trong
           ho so: hang thu doc nhom Phong ngu, hang tien doc nhom Tan cong, tien ve
           doc trung binh hai nhom. Chua cham du thi de trong, khong lay diem chung
           dap vao -- hai con so khac nghia ma trong giong nhau la cach bang bat dau
           noi doi. */
        roleTag: (() => {
          if (!m) return "";
          const line = LINE_OF[role] || role;
          const atk = posAvg(m.attrs, ATTR_BLOCKS[0].list, isKeeper(m));
          const def = posAvg(m.attrs, ATTR_BLOCKS[1].list, isKeeper(m));
          const v = line === "TĐ" ? atk
            : (line === "TV" ? (atk == null || def == null ? null : Math.round((atk + def) / 2)) : def);
          return v == null ? "" : String(v);
        })(),
        roleTagColor: LINE_TONE[LINE_OF[role] || role] || "rgba(250,250,255,0.72)",
        /* Chip khong chi mang mau tuyen ma con DAY den dau: nen la mot thanh do
           theo diem/20, nen "16" va "9" trong khac nhau ngay ca khi chua doc so.
           FM ghi kha nang theo vai tro bang sao; day la thanh, cung mot y. */
        roleTagBg: (() => {
          const tone = LINE_TONE[LINE_OF[role] || role] || "#FAFAFF";
          if (!m) return tone + "24";
          const line = LINE_OF[role] || role;
          const atk = posAvg(m.attrs, ATTR_BLOCKS[0].list, isKeeper(m));
          const def = posAvg(m.attrs, ATTR_BLOCKS[1].list, isKeeper(m));
          const v = line === "TĐ" ? atk
            : (line === "TV" ? (atk == null || def == null ? null : (atk + def) / 2) : def);
          if (v == null) return tone + "24";
          const pct = Math.max(0, Math.min(100, Math.round(v / 20 * 100)));
          return "linear-gradient(90deg, " + tone + "66 " + pct + "%, " + tone + "14 " + pct + "%)";
        })(),
        roleTagWhy: (() => {
          const line = LINE_OF[role] || role;
          return "Điểm hợp vai trò " + role + " · "
            + (line === "TĐ" ? "trung bình nhóm Tấn công"
              : line === "TV" ? "trung bình nhóm Tấn công và Phòng ngự"
              : "trung bình nhóm Phòng ngự");
        })(),
        /* Ten rut gon cho bien duoi o cau thu. Lay chu cuoi la dung voi ten
           Viet ("Bui Nhat Nam" -> "Nam"), nhung neu ai them hau to trong ngoac
           thi chu cuoi la manh ngoac: trong tai vong 28 sua ten thanh "Bui Nhat
           Nam (Sua QA)" va bien tren san chi con "QA)" -- o ba cho khac nhau.
           Cat phan trong ngoac ra truoc, roi moi lay chu cuoi. */
        nameShort: m ? shortName(m.name) : (SLOT_NAMES[i] || role),
        // What the label under a token carries is a per-device preference, set in
        // team settings. An empty slot always shows its position -- there is no
        // name to show, and the position is the whole point of an empty slot.
        showName: !m || (st.nameMode || "both") !== "pos",
        nameFull: m ? (m.name + " · " + (posOf(m).main || role)) : ("Ô " + role + " còn trống"),
        cap: (m && (st.captainByTeam || {})[sideKey] === m.id) ? "C" : "",
        capBg: (m && (st.captainByTeam || {})[sideKey] === m.id) ? "#C1D439" : "transparent",
        /* Da CHON mot nguoi thi ca san phai tra loi "dat dau duoc".

           Truoc do bam "Vao san" xong, app bao "bam vi tri tren san" o y=217 trong
           khi san trai tu y=284 den y=818 -- loi nhac nam NGOAI vung no dang noi
           toi -- va khong mot o nao doi hinh dang. Do duoc: outline, box-shadow va
           opacity cua ca bay o deu y nguyen. Nguoi dung khong biet minh dang o
           trong mot trang thai, cung khong biet o nao hop.

           Nay vong o doi sang mau DO HOP VAI cua nguoi vua chon -- trang = so
           truong, cam = da duoc, do = lech tuyen -- tuc san tu chi ra cho nen dat.
           Dung dung bo mau fitCost da co, khong bia them ngon ngu moi. */
        ring: (() => {
          // `picked` cua khoi tren nam trong mot closure khac -- tra lai tu `st`.
          // Lan dau viet la `picked` tran, app trang xoa, gates van xanh het.
          const pk = st.picked ? byId(st.picked) : null;
          const who = pk || m;
          if (!who) return "rgba(255,255,255,0.55)";
          const p = posOf(who);
          if (!p.main || LINE_OF[p.main] === role) return pk ? "#C1D439" : "rgba(255,255,255,0.9)";
          return p.alt.some(x => LINE_OF[x] === role) ? "rgba(247,144,9,0.95)" : "#FF6B57";
        })(),
        warnColor: (() => {
          if (!m) return "transparent";
          const p = posOf(m);
          if (!p.main || LINE_OF[p.main] === role) return "transparent";
          return p.alt.some(x => LINE_OF[x] === role) ? "rgba(250,250,255,0.66)" : "#FF6B57";
        })(),
        // FM states familiarity in words next to the player, not as a colour you
        // have to have learnt. The ring already says it; this says it out loud,
        // and only when there is something to say.
        fitTag: (() => {
          if (!m) return "";
          /* Chan thuong noi truoc moi thu khac o dong nay. Man Doi hinh la man
             CHON NGUOI, ma truoc do no la man duy nhat khong nhin thay co chan
             thuong ma chinh app dang giu -- ho so hien chip do, con o tren san
             thi khong mot chu nao. Lech tuyen la chuyen chien thuat; gay chan
             la chuyen co da duoc hay khong. */
          if (hurtOf(m)) return "CHẤN THƯƠNG";
          const p = posOf(m);
          if (fitUnknown(p)) return fitLabel(FIT_UNKNOWN, true);
          const c = fitCostAt(p, label), sd = sideCost(p, label);
          return c === 0 ? "" : fitLabel(c, false, sd);
        })(),
        fitColor: (() => {
          if (!m) return "rgba(250,250,255,0.6)";
          if (hurtOf(m)) return "#FF6B57";
          const p = posOf(m);
          // Chưa rõ thì xám trung tính, không phải đỏ: app không biết, chứ không phải
          // người này đang đá sai chỗ.
          if (fitUnknown(p)) return "rgba(250,250,255,0.6)";
          const c = fitCostAt(p, label);
          /* #EC2E1A tren nen bien ten (#090F1D) do duoc 4,53:1 -- vua du AA nhung la
             muc thap nhat man hinh, dung cho canh bao quan trong nhat tren san. Sang
             hon mot bac thanh 6,83:1. */
          /* Dung vi tri thi vien bang mau TUYEN thay vi xam tron: o do khong con
             canh bao nao de noi, nen no doc len tuyen -- san cu the tu doc ra hang
             thu, hang tien, thay vi bay nut giong het nhau. Mau canh bao van thang. */
          return c === 0 ? (LINE_TONE[role] || "rgba(250,250,255,0.6)") : c <= 3 ? "#F79009" : "#FF6B57";
        })(),
        hurtTip: (m && hurtOf(m)) ? (hurtOf(m).label + " — " + hurtOf(m).note) : "",
        // Left-click is now the fast act only: pick a player up, or put the picked
        // player down. Instructions moved to right-click, the way FM does it.
        click: e => {
          if (this.lpAte()) return;
          if (st.picked) { this.assign(i, st.picked); return; }
          if (slots[i]) { this.setState(s => ({ picked: s.picked === slots[i] ? null : slots[i] })); return; }
          // Empty slot used to be a dead end: nothing happened unless you had
          // already picked someone somewhere else. FM answers a click on an
          // empty position with a ranked list of who fits it, so do that.
          if (isAdmin) this.openCtx(e, slotCtxTitle(i, null), slotCtxItems(i, null));
        },
        // Chip "chưa rõ vị trí" bấm được: biến một báo động giả thành việc sửa hai
        // giây, đúng thứ 39% đội đang cần.
        fitClick: e => {
          if (e && e.stopPropagation) e.stopPropagation();
          if (!m || !isAdmin || !fitUnknown(posOf(m))) return;
          this.openCtx(e, m.name + " · đá vị trí gì?", POS_CODES.map(c => ({
            label: c + " · " + (LINE_VN[LINE_OF[c]] || c),
            click: () => this.setState(s2 => {
              const members = s2.members.map(x => x.id === m.id ? { ...x, posMain: c, pos: c } : x);
              this.persist({ members });
              return { members, copied: "Đã đặt " + m.name + " là " + c + "." };
            })
          })));
        },
        menu: e => this.openCtx(e, slotCtxTitle(i, m), slotCtxItems(i, m)),
        idx: i,
        pressStart: e => { this.lpStart(e, slotCtxTitle(i, m), slotCtxItems(i, m)); this.pdStart(e, slots[i]); },
        pressEnd: () => this.lpEnd(),
      };
    });

    const bench = active.filter(m => slots.indexOf(m.id) < 0).map(m => ({
      num: m.num, name: m.name, pos: grade(m),
      mark: attGoing(att[m.id]) ? "✓" : (attState(att[m.id]) === "maybe" ? "?" : ""),
      bg: st.picked === m.id ? "rgba(104,33,220,0.35)" : "#121526",
      border: st.picked === m.id ? "rgba(177,129,255,0.6)" : "rgba(255,255,255,0.1)",

      click: () => this.setState(s => ({ picked: s.picked === m.id ? null : m.id }))
    }));

    const feeOf = e => (e && e.fee != null) ? e.fee : (e && e.kind === "match" ? fee : 0);
    const occFee = curOccObj ? feeOf(curOccObj.e) : fee;
    this._occFee = occFee;
    /* Ba cụm nút "Gọn / Đủ / Áo đấu" đã bị gỡ. Chúng bật tắt cột của BẢNG, ngồi
       ngay cạnh cụm "Danh sách / Thẻ cầu thủ / Thống kê" đổi cả màn, không có
       chữ nào nói cụm nào chi phối cụm nào — và trên điện thoại (dưới 900px,
       nơi bảng không được vẽ) chúng không làm gì cả mà vẫn hiện. Bảng nay có
       một hình dạng cố định: số, tên, loại, vị trí, điểm, điểm danh, nợ quỹ —
       đúng bốn thứ người ta mở màn này để xem. Tên in áo và size chuyển sang
       thẻ HỒ SƠ của từng người (dữ liệu của một người, không phải cột để so
       hàng loạt); cần cả danh sách để đặt áo thì nút xuất CSV đã có sẵn. */
    const teamCharges = (st.charges || []).filter(c => c.teamId === teamId);
    const curSplit = (st.splitByOcc || {})[curOcc] || null;
    const owe = m => teamCharges.filter(c => c.memberId === m.id && !c.paid).reduce((a, c) => a + c.amount, 0);
    /* Whether someone has paid for this session is its own fact. It used to be
       encoded in the attendance value ("yes-paid"), so any later edit to
       attendance erased the evidence and charged them again while their money
       sat in the ledger. Recorded separately now; attendance edits cannot undo
       a payment. "yes-paid" is still honoured so sessions settled before this
       change keep reading as paid. */
    const paidOcc = (st.paidByOcc || {})[curOcc] || {};
    const hasPaidOcc = m => !!paidOcc[m.id] || att[m.id] === "yes-paid";
    /* "Mien" khac "da dong". Mot nguoi bi tinh tien oan, hoac khach moi da tra
       bang cach khac, thi khoan cua anh ta phai bien mat MA KHONG co dong tien
       nao vao quy. Truoc do khong co khai niem nay: duong ra duy nhat la bam
       "Da dong", va cai do la mot but ghi THU -- so du tang len bang mot so tien
       khong ai dua. Rieng cho buoi dang mo (tien san chua thanh dong `charges`);
       khoan da thanh dong thi `waive` go thang dong do. */
    const waivedOcc = (st.waivedByOcc || {})[curOcc] || {};
    const isWaived = m => !!waivedOcc[m.id];
    const debt = m => (+m.owed || 0) * fee + owe(m) + (hasOcc && att[m.id] === "yes" && !hasPaidOcc(m) && !isWaived(m) ? occFee : 0);
    /* Tien san cua mot buoi chi thanh no khi buoi do duoc CHOT (ghi ket qua).
       Truoc do khong cho nao noi ra: sang hom sau mo app, app vao buoi sap toi,
       the "Ai con no" ghi "Chua ai no quy" -- dung luc doi truong can di doi tien
       cua tran toi qua. Tien khong bien mat, no chi chua vao so.

       Chi dem buoi KHAC buoi dang mo: tien cua buoi dang mo da nam trong `debt()`
       roi, dem lai la noi hai lan. Tru nguoi da dong, duoc mien, va nguoi da co
       dong `charges` mang dung `occ` do. */
    const pend = OCC.filter(o => o.key !== curOcc).map(o => {
      const a2 = (st.attendByOcc || {})[o.key] || {};
      const paid2 = (st.paidByOcc || {})[o.key] || {};
      const waived2 = (st.waivedByOcc || {})[o.key] || {};
      const ids = active.filter(m => attGoing(a2[m.id]) && !paid2[m.id]
        && a2[m.id] !== "yes-paid" && !waived2[m.id]
        && !teamCharges.some(c => c.occ === o.key && c.memberId === m.id));
      return { o: o, n: ids.length, sum: ids.length * feeOf(o.e) };
    }).filter(x => x.n > 0);
    const attendLabel = id => ATT_LABEL[attState(att[id])];
    /* "Chưa trả lời" là trạng thái cả đội đều ở, mọi buổi, cho tới khi ai đó bấm.
       Sơn nó màu cam cảnh báo 36 lần thì màu cam thôi là cảnh báo — đo được 70 pill
       giống nhau trên một màn. Chỉ câu trả lời THẬT mới đeo pill; chưa trả lời là
       chữ xám, đủ đọc và không giành mắt. Vắng cũng vậy: nó là câu trả lời dứt
       khoát, không phải sự cố, nên nó xám chứ không đỏ trong bảng tên. */
    const attendColor = id => attState(att[id]) === "no" ? "rgba(250,250,255,0.6)" : ATT_COLOR[attState(att[id])];
    const attendBg = id => attState(att[id]) === "no" ? "rgba(255,255,255,0.06)" : ATT_BG[attState(att[id])];
    const attendPad = id => att[id] ? "3px 10px" : "3px 0";
    const attendWeight = id => att[id] ? "600" : "500";

    const open = m => () => this.setState({ sel: m.id, tab: "members" });
    const guard = fn => isAdmin ? fn : (() => this.setState({ copied: "Chỉ admin làm được việc này." }));

    /* ---------- một hàng chỉ số = MỘT thanh bấm được ----------

       Bản cũ: mỗi chỉ số một cặp nút −/+ (24 nút không chữ trên màn hồ sơ, và
       là 24 nút không chữ cuối cùng còn sót trong app) cộng một mũi tên ◄ màu
       vàng không ai đọc được. Đặt một chỉ số từ 10 lên 17 là bấm bảy lần.
       Nay bấm vào thanh ở đâu ra điểm đó — một thao tác cho bất kỳ nấc nào —
       mũi tên trái phải nhích một nấc cho ai dùng bàn phím, và mức được viết
       BẰNG CHỮ ngay trong thanh nên màu không còn là câu đố.

       `attrs[key]` chưa có thì hàng nói "chưa chấm" chứ KHÔNG mượn điểm cũ làm
       số hiển thị — mượn số là cách một bảng rỗng trông như một bảng đã chấm.

       Dùng chung cho hồ sơ một người và cho màn chấm nhanh cả đội: hai bản sao
       của cùng một thanh là cách chúng bắt đầu nói khác nhau. */
    const attrRow = (m, a) => {
      const raw = m && m.attrs ? m.attrs[a.key] : null;
      const n = (raw === null || raw === undefined || raw === "") ? NaN : parseFloat(raw);
      const v = isFinite(n) ? n : null;
      const lv = attrLevel(v);
      return {
        akey: a.key, label: a.label,
        num: v == null ? "—" : v,
        /* aria-valuenow phai la mot so, nhung o chua cham thi "1" la mot loi noi
           doi voi trinh doc man hinh -- valuetext noi dung su that de len no. */
        value: v == null ? 1 : v,
        vtext: v == null ? "chưa chấm" : (v + " trên 20 · " + lv.label),
        word: lv.label, color: lv.color,
        w: (v == null ? 0 : Math.round(v / 20 * 100)) + "%",
        cursor: isAdmin ? "pointer" : "default",
        role: isAdmin ? "slider" : "meter",
        tab: isAdmin ? "0" : "-1",
        title: a.label + " — " + (v == null ? "chưa chấm" : v + "/20 · " + lv.label)
          + (isAdmin ? " · bấm vào thanh để đặt điểm 1–20" : ""),
        set: isAdmin ? (e => {
          const r = e.currentTarget.getBoundingClientRect();
          this.setAttrVal(m.id, a.key, barValueAt(e.clientX - r.left, r.width, 20));
        }) : null,
        /* 355px chia 20 nấc = 17px một nấc: ngón tay không nhắm được vào đó, và
           bấm trượt thì phải nhắm lại vào đúng cửa 17px ấy. Bàn phím đã có ← →
           từ trước; điện thoại thì không có bàn phím. Hai nút này CHỈ hiện ở khổ
           hẹp — trên máy tính thanh dài gấp đôi và đã có phím mũi tên, thêm 24 nút
           vào đó là dựng lại đúng cái mới dọn đi. */
        nudge: isAdmin && !!st.narrow && !!st.pfNudge,
        dec: isAdmin ? (e => { e.stopPropagation(); this.setAttrVal(m.id, a.key, (v == null ? 10 : v) - 1); }) : null,
        inc: isAdmin ? (e => { e.stopPropagation(); this.setAttrVal(m.id, a.key, (v == null ? 10 : v) + 1); }) : null,
        decT: a.label + " — bớt 1 điểm",
        incT: a.label + " — thêm 1 điểm",
        kdown: isAdmin ? (e => {
          const d = (e.key === "ArrowRight" || e.key === "ArrowUp") ? 1
            : (e.key === "ArrowLeft" || e.key === "ArrowDown") ? -1 : 0;
          if (!d) return;
          e.preventDefault();
          this.setAttrVal(m.id, a.key, (v == null ? 10 : v) + d);
        }) : null
      };
    };

    /* Chấm cả đội theo CHIỀU KIA: một chỉ số, tất cả mọi người, một màn.
       Ba mươi sáu người × mười hai chỉ số là bốn trăm ba mươi hai ô; đi theo
       chiều "mở một người, chấm mười hai, đóng, mở người kế" là ba mươi sáu
       lượt mở-đóng và không ai làm hết — đó là lý do 33/36 người đang trắng
       bảng. Đội trưởng chấm bằng cách SO người này với người kia, nên chiều
       đúng là mười hai lượt, mỗi lượt một cột. */
    const quickRank = ["TM", "HV", "TV", "TĐ", ""];
    const quickPeople = active.slice().sort((x, y) =>
      quickRank.indexOf(LINE_OF[posOf(x).main] || "") - quickRank.indexOf(LINE_OF[posOf(y).main] || "")
      || String(x.name).localeCompare(String(y.name)));
    const quickCount = k => active.filter(m => m.attrs && isFinite(parseFloat(m.attrs[k]))).length;
    /* Cau goi y phai ta dung cai dang co tren man. Truoc day no luon hua co hai
       nut − / + tren dien thoai, ke ca khi hai nut do khong duoc ve ra. */
    const rateNudgeHint = st.narrow
      ? (st.pfNudge ? " Bấm − / + để chỉnh từng nấc." : "")
      : " Hoặc bấm vào thanh rồi dùng phím ← →.";
    /* Đường vào việc chấm chỉ số trước đây nằm TRONG hồ sơ của một người cụ thể,
       nên muốn chấm cả đội phải đoán ra rằng mình cần mở một người trước đã. */
    const ratedPeople = active.filter(m => ratedCount(m) > 0).length;
    const quickIdx = ATTRS.findIndex(a => a.key === st.quickKey);
    const quickA = quickIdx >= 0 ? ATTRS[quickIdx] : null;

    // Right-click menus for the three list surfaces. Same verbs as the inline
    // buttons, reachable without hunting for a 44px target.
    const attendItems = m => hasOcc && (isAdmin || (me && me.id === m.id)) ? [
      attState(att[m.id]) !== "yes" && { label: "Điểm danh: Đi", tone: "act", click: () => this.setAtt(m.id, "yes") },
      attState(att[m.id]) !== "maybe" && { label: "Điểm danh: Chưa chắc", click: () => this.setAtt(m.id, "maybe") },
      attState(att[m.id]) !== "no" && { label: "Điểm danh: Vắng", click: () => this.setAtt(m.id, "no") }
    ] : [];
    const benchCtx = m => [
      isAdmin && { label: "Vào sân", tone: "act", click: () => {
        const free = slots.indexOf(null);
        if (free < 0) { this.setState({ picked: m.id, copied: "Sân đã đủ người - bấm một ô để thay." }); return; }
        this.assign(free, m.id);
      } },
      { label: "Xem hồ sơ", click: () => this.setState({ tab: "members", memberView: "list", sel: m.id }) },
      isAdmin && { label: "Bỏ khỏi dự bị", tone: "danger", click: () => this.setState(s => {
        const cur = benchOf(s.benchByTeam, slotKey, sideKey).filter(x => x !== m.id);
        const benchByTeam = { ...s.benchByTeam, [slotKey]: cur };
        this.persist({ benchByTeam });
        return { benchByTeam, copied: "Đã bỏ " + m.name + " khỏi dự bị." };
      }) }
    ].concat(attendItems(m));
    const poolCtx = m => [
      isAdmin && { label: "Vào sân ngay", tone: "act", click: () => {
        const free = slots.indexOf(null);
        if (free < 0) { this.setState({ picked: m.id, copied: "Sân đã đủ người - bấm một ô để thay." }); return; }
        this.assign(free, m.id);
      } },
      isAdmin && { label: "Thêm vào dự bị", click: () => this.setState(s => {
        const list = benchOf(s.benchByTeam, slotKey, sideKey).concat([m.id]);
        const benchByTeam = { ...s.benchByTeam, [slotKey]: list };
        this.persist({ benchByTeam });
        return { benchByTeam, picked: null };
      }) },
      { label: "Xem hồ sơ", click: () => this.setState({ tab: "members", memberView: "list", sel: m.id }) }
    ].concat(attendItems(m));
    // Verbs that used to be four buttons plus a rename field in the tactic rail.
    // `t` omitted means the currently selected tactic (the ⋯ button).
    const tacticCtx = t => {
      const tt = t || actTactic;
      if (!tt || !isAdmin) return [];
      const lib = ((st.tacticLib || {})[teamId] || []);
      return [
        { label: "Nhân bản", click: () => this.setState(s => {
          const cur = (((s.tacticLib || {})[teamId] || []).length ? s.tacticLib[teamId] : [defaultTactic()]).slice();
          const copy = { ...tt, id: this._now(), name: tt.name + " (bản sao)", isDefault: false };
          const tacticLib = { ...s.tacticLib, [teamId]: cur.concat([copy]) };
          const tacticSel = { ...s.tacticSel, [sideKey]: copy.id };
          this.persist({ tacticLib, tacticSel });
          return { tacticLib, tacticSel, copied: "Đã nhân bản." };
        }) },
        { label: "Đổi tên", click: () => {
          const name = typeof prompt === "function" ? prompt("Tên chiến thuật", tt.name) : null;
          if (name == null || !name.trim()) return;
          this.setState(s => {
            const cur = (((s.tacticLib || {})[teamId] || []).length ? s.tacticLib[teamId] : [defaultTactic()])
              .map(x => x.id === tt.id ? { ...x, name: name.trim() } : x);
            const tacticLib = { ...s.tacticLib, [teamId]: cur };
            this.persist({ tacticLib });
            return { tacticLib };
          });
        } },
        !tt.isDefault && { label: "Đặt làm mặc định", click: () => this.setState(s => {
          const cur = (((s.tacticLib || {})[teamId] || []).length ? s.tacticLib[teamId] : [defaultTactic()])
            .map(x => ({ ...x, isDefault: x.id === tt.id }));
          const tacticLib = { ...s.tacticLib, [teamId]: cur };
          this.persist({ tacticLib });
          return { tacticLib, copied: "Đã đặt " + tt.name + " làm mặc định." };
        }) },
        lib.length > 1 && { label: "Xoá chiến thuật", tone: "danger", click: () => this.setState(s => {
          const left = ((s.tacticLib || {})[teamId] || []).filter(x => x.id !== tt.id);
          if (!left.length) return { copied: "Đội cần ít nhất một chiến thuật." };
          const tacticLib = { ...s.tacticLib, [teamId]: left };
          const tacticSel = { ...s.tacticSel, [sideKey]: left[0].id };
          this.persist({ tacticLib, tacticSel });
          return { tacticLib, tacticSel, tacticSlot: null, undo: { state: { tacticLib: s.tacticLib } }, copied: "Đã xoá chiến thuật." };
        }) }
      ];
    };

    const rowCtx = m => [
      { label: "Xem hồ sơ", click: open(m) }
    ].concat(attendItems(m)).concat([
      isAdmin && { label: "Sửa hồ sơ", click: () => this.setState({ formOpen: true, editId: m.id, form: {
        name: m.name, num: String(m.num), type: m.type, grp: m.grp, phone: m.phone,
        shirt: m.shirt || "", size: m.size || "", dob: m.dob || "",
        born: m.born || "", nat: m.nat || "",
        hurt: m.hurt || "", hurtTo: m.hurtTo || "",
        posMain: posOf(m).main, posAlt: posOf(m).alt.slice() } }) },
      isAdmin && { label: m.hidden ? "Hiện lại" : "Ẩn khỏi danh sách", click: () => this.setState(s => {
        const members = s.members.map(x => x.id === m.id ? { ...x, hidden: !x.hidden } : x);
        this.persist({ members });
        return { members };
      }) },
      isAdmin && { label: "Xoá khỏi đội", tone: "danger", click: () => this.setState(s => {
        const members = s.members.filter(x => x.id !== m.id);
        this.persist({ members });
        return { members, undo: { state: { members: s.members } }, copied: "Đã xoá " + m.name + "." };
      }) }
    ]);

    const isRated = m => ratingView(m).rated;
    const rowOf = (m, i) => { const rv = ratingView(m); return {
      num: m.num, name: m.name, posLabel: m.type, phone: m.phone, rowBg: stripe(i),
      /* Hai o CHI cua bang Danh sach. `posLabel`/`attendLabel` van nguyen ven vi
         hang nay chay o ca man Diem danh, noi nhan la noi dung chinh. Rieng trong
         BANG thi "Da cung" in 14/14 hang va "Chua tra loi" in 14/14 hang -- hai
         cot khong phan biet duoc ai voi ai. Mac dinh im, ngoai le len tieng:
         chi Wildcard va cau tra loi that moi lay muc. */
      typeCell: m.type === "Đá cứng" ? "" : (m.type || ""),
      attendCell: attState(att[m.id]) === "none" ? "" : attendLabel(m.id),
      shirt: m.shirt || "-", size: m.size || "-", dob: m.dob || "-", pos: posLabelOf(m), posColor: LINE_TONE[lineOf(m)] || "rgba(250,250,255,0.64)",
      hideLabel: m.hidden ? "Hiện lại" : "Ẩn",
      toggleHide: () => this.setState(s => { const members = s.members.map(x => x.id === m.id ? { ...x, hidden: !x.hidden } : x); this.persist({ members }); return { members }; }),
      /* Một hàng này chạy ở HAI màn: bảng Danh sách (Thành viên) và bảng Điểm
         danh (Tổng quan). Trước đây mỗi màn có nhánh riêng, nên bản vá cho
         Danh sách không chạm tới Điểm danh và màn kia vẫn in "9/20 · hạng D"
         cho người chưa ai chấm. Giờ cả hai đọc cùng một `ratingView`. */
      grade: rv.grade || "—", gradeBg: tone(m)[0], gradeFg: tone(m)[1],
      gradeText: rv.gradeText,
      rating: rv.score, ratingLabel: rv.rated ? rv.rating + "/20" : "—",
      attendLabel: attendLabel(m.id), attendColor: attendColor(m.id), attendBg: attendBg(m.id),
      /* Thanh tich mua nay, cho bang o man rong. Bang thanh vien tren 1920 chi co
         7 cot va KHONG cot nao la thanh tich -- so tran, ban thang, kien tao khong
         xuat hien o dau trong danh sach doi. "0" hien thanh dau gach: chua lam duoc
         gi thi de trong cho de doc, khong rai so 0 khap bang. */
      pGames: (+m.games || 0) || "—", pGoals: (+m.goals || 0) || "—",
      pAssists: (+m.assists || 0) || "—", pMvp: (+m.mvp || 0) || "—",
      /* Ba nhom chi so, cho bang o man rong. Do duoc: hang bang rong 1888px ma bo
         trong 1374px (72,8%) giua ten va con so dau tien, trong khi 12 chi so DA
         CHAM cua tung nguoi khong hien o dau trong bang (the cau thu hien 3/12,
         bang hien 0/12). Dung chung `ATTR_BLOCKS` + `posAvg` voi the cau thu, va
         giu dung quy uoc do: nhom nao CHUA cham du thi de dau gach, khong lay diem
         cu ra dap vao -- nua that nua bia thi con so doc nhu that. */
      /* 12 chi so tung nguoi, chi tren man >=1600px (bang doi hinh kieu FM). O
         khac hon, ba o trung binh nhom o tren bi an di -- hai cach doc cung mot
         con so nam canh nhau thi bang rong ma khong noi them gi. O chua cham de
         dau gach, dung quy uoc voi ca app. */
      attrCells: st.wide6 ? ATTRS.map(a => {
        const v = parseFloat((m.attrs || {})[a.key]);
        return isFinite(v) && v > 0
          ? { v: String(Math.round(v)), color: attrTone(v), title: a.label }
          : { v: "—", color: "rgba(250,250,255,0.28)", title: a.label + " — chưa chấm" };
      }) : [],
      attrNarrow: !st.wide6,
      aAtk: (() => { const v = posAvg(m.attrs, ATTR_BLOCKS[0].list, isKeeper(m)); return v == null ? "—" : String(v); })(),
      aDef: (() => { const v = posAvg(m.attrs, ATTR_BLOCKS[1].list, isKeeper(m)); return v == null ? "—" : String(v); })(),
      aFit: (() => { const v = posAvg(m.attrs, ATTR_BLOCKS[2].list, isKeeper(m)); return v == null ? "—" : String(v); })(),
      cardY: (+m.y || 0) || "", cardR: (+m.r || 0) || "",
      hasCardY: (+m.y || 0) > 0, hasCardR: (+m.r || 0) > 0,
      attendPad: attendPad(m.id), attendWeight: attendWeight(m.id),
      debtLabel: debt(m) > 0 ? this.money(debt(m)) : "—",
      debtColor: debt(m) > 0 ? "#F79009" : "rgba(250,250,255,0.32)",
      /* Hàng trên điện thoại phải đọc được ngay bốn thứ: vị trí, đi hay không,
         đóng tiền chưa, điểm. Ba thứ đầu trước đây hoặc bị nhét chung một dòng
         chữ nhỏ có ba chấm, hoặc (nợ quỹ) không hiện ra ở khổ hẹp. */
      debtChip: debtChip(debt(m), v => this.money(v)).text,
      debtChipFg: debtChip(debt(m), v => this.money(v)).fg,
      debtChipBg: debtChip(debt(m), v => this.money(v)).bg,
      posChip: posLabelOf(m) === "-" ? "chưa chọn vị trí" : posLabelOf(m),
      ratingChip: rv.text,
      open: () => { if (this.lpAte()) return; open(m)(); },
      menu: e => this.openCtx(e, m.name, rowCtx(m)),
      pressStart: e => this.lpStart(e, m.name, rowCtx(m)),
      pressEnd: () => this.lpEnd(),
      canSet: hasOcc && (isAdmin || !!(me && me.id === m.id)),
      setYes: e => { e.stopPropagation(); this.setAtt(m.id, "yes"); },
      setMaybe: e => { e.stopPropagation(); this.setAtt(m.id, "maybe"); },
      setNo: e => { e.stopPropagation(); this.setAtt(m.id, "no"); },
      yesChipBg: attGoing(att[m.id]) ? "#C1D439" : "rgba(255,255,255,0.07)",
      yesChipFg: attGoing(att[m.id]) ? "#090F1D" : "rgba(250,250,255,0.6)",
      mbChipBg: attState(att[m.id]) === "maybe" ? "rgba(247,144,9,0.24)" : "rgba(255,255,255,0.07)",
      mbChipFg: attState(att[m.id]) === "maybe" ? "#F79009" : "rgba(250,250,255,0.6)",
      noChipBg: attState(att[m.id]) === "no" ? "rgba(236,46,26,0.22)" : "rgba(255,255,255,0.07)",
      noChipFg: attState(att[m.id]) === "no" ? "#FF6B57" : "rgba(250,250,255,0.6)",
      edit: () => this.setState({ formOpen: true, editId: m.id, form: { name: m.name, num: String(m.num), type: m.type, grp: m.grp, phone: m.phone, shirt: m.shirt || "", size: m.size || "", dob: m.dob || "", born: m.born || "", nat: m.nat || "", hurt: m.hurt || "", hurtTo: m.hurtTo || "", posMain: posOf(m).main, posAlt: posOf(m).alt.slice() } }),
      /* Deleting a squad member was one click, no question asked, and nothing in
         the UI ever rendered the `undo` state this wrote -- so a misclick took a
         teammate's number, shirt size, phone, birthday and debt with it, for
         good. It also left his id behind in every lineup, bench, captain slot
         and attendance sheet that referenced him.

         Now: refuse while he is the last admin (dropping admin rights already
         had that guard, deleting the admin outright did not, and there is no way
         back once nobody can administer), ask once naming him, then take every
         reference with him. */
      remove: () => {
        const admins = (st.members || []).filter(x => x.teamId === teamId && x.role === "admin");
        if (m.role === "admin" && admins.length <= 1) {
          this.setState({ copied: "Không xoá được admin cuối cùng. Cho người khác quyền admin trước." });
          return;
        }
        const owed = debt(m);
        const NL = String.fromCharCode(10);
        const warn = "Xoá " + m.name + " khỏi đội?" + NL + NL
          + "Mất luôn số áo, size, SĐT, ngày sinh và lịch sử của người này."
          + (owed > 0 ? NL + "Người này còn nợ " + this.money(owed) + " - nợ sẽ biến mất khỏi sổ." : "")
          + NL + NL + "Không hoàn tác được.";
        if (typeof confirm === "function" && !confirm(warn)) return;
        this.setState(s => {
          const members = s.members.filter(x => x.id !== m.id);
          const drop = arr => (arr || []).map(x => x === m.id ? null : x);
          const dropList = arr => (arr || []).filter(x => x !== m.id);
          const slotsByOcc = {}; Object.keys(s.slotsByOcc || {}).forEach(k => { slotsByOcc[k] = drop(s.slotsByOcc[k]); });
          const slotsByTeam = {}; Object.keys(s.slotsByTeam || {}).forEach(k => { slotsByTeam[k] = drop(s.slotsByTeam[k]); });
          const benchByTeam = {}; Object.keys(s.benchByTeam || {}).forEach(k => { benchByTeam[k] = dropList(s.benchByTeam[k]); });
          const captainByTeam = {}; Object.keys(s.captainByTeam || {}).forEach(k => { captainByTeam[k] = s.captainByTeam[k] === m.id ? null : s.captainByTeam[k]; });
          const attendByOcc = {}; Object.keys(s.attendByOcc || {}).forEach(k => {
            const cur = { ...(s.attendByOcc[k] || {}) }; delete cur[m.id]; attendByOcc[k] = cur;
          });
          const paidByOcc = {}; Object.keys(s.paidByOcc || {}).forEach(k => {
            const cur = { ...(s.paidByOcc[k] || {}) }; delete cur[m.id]; paidByOcc[k] = cur;
          });
          const splitByOcc = {}; Object.keys(s.splitByOcc || {}).forEach(k => {
            const sp = s.splitByOcc[k];
            splitByOcc[k] = sp && sp.A && sp.B ? { ...sp, A: dropList(sp.A), B: dropList(sp.B) } : sp;
          });
          const charges = (s.charges || []).filter(c => c.memberId !== m.id);
          const out = { members, slotsByOcc, slotsByTeam, benchByTeam, captainByTeam, attendByOcc, paidByOcc, splitByOcc, charges };
          const before = {};
          Object.keys(out).forEach(k => { before[k] = s[k]; });
          this.persist(out);
          return { ...out, undo: { state: before }, copied: "Đã xoá " + m.name + " và mọi chỗ có tên." };
        });
      }
    }; };

    const q = st.q.trim().toLowerCase();
    const searched = (q ? teamMembers.filter(m => m.name.toLowerCase().indexOf(q) >= 0) : teamMembers);
    const searchedActive = searched.filter(m => !m.hidden);

    /* Hạng chỉ dành cho người ĐÃ có chỉ số được chấm.

       Trước đây cả đội vào một hạng S→D dù 35/36 người chưa ai chấm một chỉ số
       nào: `m.grp` là hạng gõ tay từ lâu, `m.rating` (điểm cũ) lại suy ra từ
       chính hạng đó qua GRADE_RATING, rồi `ratingOf` mượn điểm cũ điền vào ô
       trống -- nên chip "17 điểm" chỉ là cái hạng gõ tay nói vòng lại một lần
       nữa, và tiêu đề "Hạng S · 10 người" đứng trên nó biến vòng lặp đó thành
       một kết luận của app. Chưa chấm thì về một nhóm riêng, gọi đúng tên.

       Người đã chấm thì xếp theo `grade(m)` = hạng suy từ điểm thật, không theo
       `m.grp` nữa: dòng ghi chú ngay trên bảng nói "Hạng S → D là mức của điểm
       đó", mà hạng gõ tay không nhất thiết khớp -- người 15 điểm (hạng A ở hồ
       sơ của chính anh ta) vẫn nằm dưới tiêu đề "Hạng S". Hết "Chưa phân hạng":
       có điểm là có hạng, chưa chấm thì đã có nhóm riêng ở trên. */
    /* Hai cot nay ton tai VI day la bong da phui -- ai di, ai no -- va chung la
       hai cot duy nhat khong bam sap duoc (`key:""`). Chung khong nam trong
       MEM_SORT_KEYS duoc vi ca hai doc du lieu cua BUOI DANG MO (`att`, `debt`),
       chi ton tai trong luot dung nay. */
    const memSortExtra = {
      att:  m => ATT_RANK[attState(att[m.id])],
      owed: m => debt(m)
    };
    const memberGroups = ["S", "A", "B", "C", "D", "unrated", "hidden"].map(g => {
      const list = g === "hidden" ? searched.filter(m => m.hidden)
        : g === "unrated" ? searched.filter(m => !m.hidden && !isRated(m))
        : searched.filter(m => !m.hidden && isRated(m) && grade(m) === g);
      // Trung bình chỉ tính trên người có điểm thật; nhóm "đã ẩn" trộn cả hai
      // loại nên nói luôn bao nhiêu người trong đó đã được chấm.
      const scored = list.filter(isRated);
      const avg = ratedSquadAvg(list);
      const gTone = g === "unrated" ? GRADE_TONE[""] : GRADE_TONE[g];
      return {
        tag: g === "hidden" ? "×" : g === "unrated" ? "—" : g,
        label: g === "hidden" ? "Đã ẩn (không tính vào điểm danh, quỹ, xếp hạng)"
          : g === "unrated" ? "Chưa ai chấm chỉ số"
          : "Hạng " + g,
        tagBg: g === "hidden" ? "rgba(236,46,26,0.16)" : gTone[0],
        tagFg: g === "hidden" ? "#FF7F6B" : gTone[1],
        count: list.length + " người",
        avgLabel: g === "unrated" ? "bấm vào tên để chấm"
          : !scored.length ? "chưa ai chấm chỉ số"
          : "điểm TB " + avg + (scored.length < list.length ? " · " + scored.length + "/" + list.length + " người đã chấm" : ""),
        list: memSorted(list, null, memSortExtra).map(rowOf)
      };
    }).filter(g => g.list.length > 0);

    /* Thẻ cầu thủ -- cùng một danh sách, khác ống kính.

       Bảng xếp theo hạng vì bảng là sổ sách: nó tồn tại để đối chiếu số áo, size,
       nợ quỹ. Thẻ xếp theo TUYẾN vì đó là cách người ta nhìn một đội hình, và vì
       một thẻ là thứ chụp màn hình gửi vào nhóm Zalo được -- một hàng bảng thì
       không. Hai cách xếp khác nhau là lý do có hai chế độ; xếp giống nhau thì
       cái thứ hai chỉ là cái thứ nhất mặc áo khác.

       Số điện thoại, ngày sinh, size áo và nợ quỹ CỐ Ý không lên thẻ. Thẻ ra khỏi
       app; bảng thì không. Nợ quỹ là chuyện giữa thủ quỹ và một người, không phải
       thứ dán lên nhóm bốn mươi người. */
    const cardOf = m => {
      const p = posOf(m);
      const rv = ratingView(m);
      const rated = rv.n;
      const faces = faceStats(m);
      const tier = cardTier(rv.grade);
      return {
        num: m.num ? "#" + m.num : "—", name: m.name,
        pos: p.main || "—",
        posColor: LINE_TONE[LINE_OF[p.main]] || "rgba(250,250,255,0.5)",
        line: p.main ? (LINE_VN[LINE_OF[p.main]] || "Cầu thủ") : "chưa chọn vị trí",
        alt: (p.alt || []).join(" · "),
        hasAlt: !!(p.alt && p.alt.length),
        /* Chua cham chi so nao thi khong co diem de in.

           `ratingOf` roi ve diem cu va `gradeOf` bo no vao mot ro, nen the tung
           dong dau "9/20 \u00b7 H\u1ea0NG D" len mot nguoi chua ai danh gia. Nguoi doc
           hieu thanh "thang nay kem", chu khong phai "chua ai cham". Khong in gi
           het thi the con lai danh tinh -- va danh tinh moi la thu mang di khoe. */
        showRating: rv.rated,
        /* Chua mat nao du chi so thi noi ra con thieu bao nhieu, thay vi de sau
           dau gach cau lang -- dong nay la chi dan lam gi tiep, khong phai mot
           ket luan ve nguoi do. */
        noBlocks: faces.every(f => f.value == null),
        noBlocksNote: rated === 0
          ? "Chưa ai chấm chỉ số — bấm để chấm"
          : ("Mới chấm " + rated + "/" + ATTRS.length + " chỉ số — chưa nhóm nào đủ để tính"),
        /* Sau mat thay ba thanh nhom. Mat chua cham du in dau gach chu khong an
           di: mot the thieu hai o doc ra "con phai cham", mot the tu bo bot o
           doc ra "thang nay chi co bay nhieu". */
        faces: faces.map(f => ({
          short: f.short, tip: f.full,
          value: f.value == null ? "—" : String(f.value),
          color: f.value == null ? "rgba(250,250,255,0.34)" : attrTone(f.value),
          w: f.value == null ? "0%" : Math.round(f.value / 20 * 100) + "%"
        })),
        tierBg: tier.bg, tierEdge: tier.edge, tierInk: tier.ink, tierGlow: tier.glow,
        tierName: rv.rated ? tier.name : "Chưa chấm chỉ số",
        ratingBig: rv.rated ? String(rv.rating) : "—",
        gradeMark: rv.rated ? rv.grade : "",
        initial: (m.name || "?").trim().charAt(0).toUpperCase(),
        /* Anh da upload va cat duoc tu lau (`m.photo`), nhung the cau thu van ve
           chu cai dau -- cong cat anh dan toi mot cho khong ai nhin. */
        photo: m.photo || "",
        hasPhoto: !!m.photo,
        noPhoto: !m.photo,
        attendLabel: attendLabel(m.id), attendColor: attendColor(m.id), attendBg: attendBg(m.id),
        games: m.games || 0, goals: m.goals || 0, assists: m.assists || 0, mvp: m.mvp || 0,
        open: () => { if (this.lpAte()) return; open(m)(); },
        menu: e => this.openCtx(e, m.name, rowCtx(m)),
        pressStart: e => this.lpStart(e, m.name, rowCtx(m)),
        pressEnd: () => this.lpEnd()
      };
    };
    const cardGroups = [["TM", "Thủ môn"], ["HV", "Hậu vệ"], ["TV", "Tiền vệ"],
                        ["TĐ", "Tiền đạo"], ["", "Chưa rõ vị trí"]].map(g => {
      const list = searchedActive.filter(m => (LINE_OF[posOf(m).main] || "") === g[0])
        // Xếp thứ tự là TÍNH TOÁN, không ai đọc con số dùng để so -- `ratingOf`
        // mượn điểm cũ ở đây là chấp nhận được, y như lúc chia đội.
        .sort((a, b) => ratingOf(b) - ratingOf(a) || String(a.name).localeCompare(String(b.name)));
      /* Tiêu đề nhóm tuyến từng in "điểm TB 15" cho một nhóm KHÔNG AI được
         chấm: nó chia trung bình trên cả nhóm, mà mọi ô trống đều đang mang
         điểm cũ suy từ hạng gõ tay. Nay chỉ tính trên người đã chấm, và nói ra
         bao nhiêu người trong nhóm đã chấm -- giống hệt nhóm hạng ở Danh sách. */
      const scored = list.filter(isRated);
      const avg = ratedSquadAvg(list);
      return {
        label: g[1], count: list.length + " người",
        tone: LINE_TONE[g[0]] || "rgba(250,250,255,0.4)",
        avgLabel: avg == null ? "chưa ai chấm chỉ số"
          : "điểm TB " + avg + (scored.length < list.length ? " · " + scored.length + "/" + list.length + " người đã chấm" : ""),
        list: list.map(cardOf)
      };
    }).filter(g => g.list.length > 0);

    /* Đếm trên danh sách người đang hoạt động, không trên các khoá còn trong
       bảng điểm danh: người đã rời đội để lại khoá của mình, và bản cũ đếm cả
       những khoá đó nên "đã nhận" có thể lớn hơn quân số. */
    const counts = attCounts(att, active.map(m => m.id));
    const yesTotal = counts.yes;
    const myAtt = me ? attState(att[me.id]) : "none";
    const passFilter = m => !st.filter || attState(att[m.id]) === st.filter;

    /* Nguoi vua duoc ghi "Da dong" O LAI DUNG CHO trong 6 giay.

       Truoc do ho bien mat khoi danh sach ngay lap tuc, nen ca danh sach dich
       len mot dong ngay duoi ngon tay. Giam khao vong 34 bam Nguyen Huu Dat,
       doi 400ms, bam lai dung cho do -- va ghi nham cho Le Quang Huy, mot nguoi
       chua he duoc bam. Khong phai loi tinh tien; la loi danh sach truot di.
       Giu cho, doi nut thanh mot dau tick khong bam duoc, roi moi bo hang. */
    const settledAt = st.settledAt || {};
    const HOLD_MS = 6000;
    const nowMs = Date.now();
    const justDone = m => (nowMs - (settledAt[m.id] || 0)) < HOLD_MS;
    if (Object.keys(settledAt).some(k => (nowMs - settledAt[k]) < HOLD_MS)) {
      clearTimeout(this._settleT);
      this._settleT = setTimeout(() => this.setState({ settledTick: Date.now() }), HOLD_MS + 60);
    }
    const debtors = active.filter(m => debt(m) > 0 || justDone(m)).map((m, di) => ({
      done: debt(m) <= 0 && justDone(m),
      open: !(debt(m) <= 0 && justDone(m)),
      name: m.name, rowBg: stripe(di),
      /* Mot dong no phai noi no den TU DAU. Truoc do dong nay chi noi "N tran
         chua dong + tran toi" -- khong ngay nao, khong buoi nao. Danh dau mot
         nguoi la Vang thi so tien cua anh ta van dung y nguyen o day va khong
         co gi giai thich, nen no doc ra nhu app tinh tien nguoi khong di.
         Thuc ra do la tien san cua buoi anh ta DA da va da bi chot, nhung phai
         noi ra moi biet. Cac dong tien san co san nhan "Tien san <ngay>". */
      detail: (() => {
        if (debt(m) <= 0 && justDone(m)) return "vừa ghi vào quỹ";
        /* Noi ro khi mot nguoi vua BAO VANG ma van con no: no khong tu nhien
           moc ra: anh ta co ten trong doi hinh hoac su kien cua buoi do truoc
           khi bao vang. Khong noi thi doc ra nhu app tinh tien nguoi khong di. */
        const vangRoi = attState(att[m.id]) === "no";
        const rows = teamCharges.filter(c => c.memberId === m.id && !c.paid);
        const days = rows.map(c => String(c.label || "").replace(/^Tiền sân\s*/, "")).filter(Boolean);
        const seen = {};
        const uniq = days.filter(d => seen[d] ? false : (seen[d] = 1));
        const part = [];
        if (uniq.length) part.push("buổi " + uniq.slice(0, 3).join(", ") + (uniq.length > 3 ? " +" + (uniq.length - 3) : ""));
        else if (rows.length) part.push(rows.length + " buổi chưa đóng");
        if (m.owed > 0) part.push(m.owed + " trận chưa đóng");
        // "tran toi" cho mot buoi da da xong la noi sai. Buoi nao thi goi ten buoi do.
        if (att[m.id] === "yes") part.push(curOccObj && curOccObj.past
          ? ("buổi " + curOccObj.d.getDate() + "/" + (curOccObj.d.getMonth() + 1))
          : "trận tới");
        if (vangRoi && part.length) part.push("đã báo vắng — ghi nhầm thì bấm Xoá khoản");
        return part.join(" + ");
      })(),
      amount: (debt(m) <= 0 && justDone(m)) ? "" : this.money(debt(m)),
      remind: () => {
        // {doi} là tên đội đang mở, không phải tên một câu lạc bộ cụ thể.
        const tpl = this.props.reminderTemplate ?? "{doi}: {ten} ơi, tiền sân còn {tien} nha. Chuyển vào quỹ đội giúp mình.";
        const msg = tpl.replace("{doi}", team.name).replace("{ten}", m.name).replace("{tien}", this.money(debt(m)));
        this.copyText(msg);
        this.setState({ copied: "Đã copy tin nhắn nhắc " + m.name + " - dán vào Zalo." });
      },
      /* Xoa mot khoan ghi nham, KHONG phai rua no thanh tien thu.

         Truoc do dong no chi co hai nut: Nhac va Da dong. Mot nguoi bi tinh tien
         oan -- vi co ten trong doi hinh mot tran roi sau do bao vang -- chi co
         hai duong ra: xoa ca tran (mat ket qua va so lieu ca doi), hoac bam
         "Da dong", ma cai do do duoc la mot but ghi THU: so du 5.025.000 →
         5.120.000. Duong thoat duy nhat khoi mot khoan sai lai lam hong chinh
         cai so sach app dang giu rat can than. Nay go thang dong tien san chua
         thu, khong dong nao vao quy, va noi ra la da go bao nhieu cua ai. */
      waive: () => this.setState(s => {
        const rows = (s.charges || []).filter(c => c && c.teamId === teamId && c.memberId === m.id && !c.paid);
        const liveFee = hasOcc && att[m.id] === "yes" && !hasPaidOcc(m) && !isWaived(m);
        if (!rows.length && !(+m.owed || 0) && !liveFee) return { copied: m.name + " không có khoản nào chưa thu để xoá." };
        if (!rows.length && !(+m.owed || 0) && liveFee) {
          const wv = { ...(s.waivedByOcc || {}), [this._occ]: { ...((s.waivedByOcc || {})[this._occ] || {}), [m.id]: true } };
          this.persist({ waivedByOcc: wv });
          return { waivedByOcc: wv,
            undo: { state: { waivedByOcc: s.waivedByOcc } },
            copied: "Đã miễn tiền sân buổi này cho " + m.name + " — không ghi đồng nào vào quỹ." };
        }
        const sum = rows.reduce((x, c) => x + (+c.amount || 0), 0);
        const drop = {};
        rows.forEach(c => { drop[c.id] = 1; });
        const charges = (s.charges || []).filter(c => !drop[c.id]);
        const members = s.members.map(x => x.id === m.id ? { ...x, owed: 0 } : x);
        const cur = { ...((s.attendByOcc || {})[this._occ] || {}) };
        if (cur[m.id] === "yes-billed") delete cur[m.id];
        const attendByOcc = { ...s.attendByOcc, [this._occ]: cur };
        const out = { members, charges, attendByOcc };
        this.persist(out);
        return { ...out,
          undo: { state: { members: s.members, charges: s.charges, attendByOcc: s.attendByOcc } },
          copied: "Đã xoá khoản " + this.money(sum) + " của " + m.name + " — không ghi đồng nào vào quỹ." };
      }),
      settle: () => this.setState(s => {
        /* Bam hai lan trong mot nhip thi ghi HAI dong thu cho mot buoi.

           Giam khao vong 33 bam cach nhau 120ms: danh sach no tru mot lan, so du
           cong hai lan, va sua bang cach xoa mot dong lai dua nguoi do ve lai
           danh sach no trong khi dong con lai van nam trong so du. Do duoc: quy
           +570.000d trong khi that su thu 285.000d. Nut nay chay tu closure nen
           `debt(m)` la so cua lan ve truoc; phai hoi lai `s` moi ngay truoc khi
           ghi. Da co dong thu cho dung nguoi + dung buoi thi thoi. */
        const dup = (s.ledger || []).some(x => x && x.teamId === teamId && x.src
          && x.src.kind === "dues" && x.src.memberId === m.id && x.src.occ === this._occ);
        if (dup) return { copied: "Buổi này đã ghi tiền của " + m.name + " rồi." };
        const paid = debt(m);
        if (paid <= 0) return { copied: m.name + " không còn nợ buổi này." };
        const members = s.members.map(x => x.id === m.id ? { ...x, owed: 0 } : x);
        /* Dong thu nay MANG THEO no da danh dau nhung gi.

           "Da dong" viet vao NAM cho: so du quy, `owed` cua nguoi do, co `paid`
           tren cac dong tien san, o diem danh, va `paidByOcc`. Xoa dong thu o
           So quy truoc day chi go MOT cho -- tien bien mat con nguoi van duoc
           danh dau la da dong, nen anh ta khong con trong "Ai con no" va cung
           khong con trong quy. Do duoc: so du 5.120.000d trong khi so sach dung
           phai la 5.215.000d, khong mot dong nao noi ra. Ghi kem `src` de duong
           xoa go lai dung nhung gi duong ghi da dat. */
        const flipIds = (s.charges || [])
          .filter(c => c.teamId === teamId && c.memberId === m.id && !c.paid)
          .map(c => c.id);
        const attBefore = ((s.attendByOcc || {})[this._occ] || {})[m.id];
        /* Ngay cua dong thu la ngay BUOI DA, khong phai ngay bam nut. Truoc do
           tien san cua buoi 9/9 vao so ngay 7/9 chi vi thu quy bam som -- bieu do
           thu-chi theo thang va ban CSV deu xep tien theo luc bam, khong theo
           luc da. Khoa buoi co dang "id@YYYY-MM-DD", lay phan sau. */
        const occIso = String(this._occ || "").split("@")[1] || "";
        const dNow = new Date();
        const isoNow = dNow.getFullYear() + "-" + String(dNow.getMonth() + 1).padStart(2, "0") + "-" + String(dNow.getDate()).padStart(2, "0");
        const ledger = [{ teamId: teamId, id: Date.now(), label: "Thu quỹ - " + m.name, date: /^\d{4}-\d{2}-\d{2}$/.test(occIso) ? occIso : isoNow, v: paid,
          src: { kind: "dues", memberId: m.id, occ: this._occ, chargeIds: flipIds,
                 owedBefore: (+m.owed || 0), attBefore: attBefore == null ? "" : attBefore } }, ...s.ledger];
        const charges = (s.charges || []).map(c => (c.teamId === teamId && c.memberId === m.id && !c.paid) ? { ...c, paid: true } : c);
        const cur = { ...((s.attendByOcc || {})[this._occ] || {}) };
        if (cur[m.id] === "yes") cur[m.id] = "yes-paid";
        const attendByOcc = { ...s.attendByOcc, [this._occ]: cur };
        const paidByOcc = { ...s.paidByOcc, [this._occ]: { ...((s.paidByOcc || {})[this._occ] || {}), [m.id]: true } };
        const out = { members, ledger, attendByOcc, charges, paidByOcc };
        this.persist(out);
        return { ...out, settledAt: { ...(s.settledAt || {}), [m.id]: Date.now() },
          undo: { state: { members: s.members, ledger: s.ledger, attendByOcc: s.attendByOcc, charges: s.charges, paidByOcc: s.paidByOcc } },
          copied: "Đã ghi " + this.money(paid) + " của " + m.name + " vào quỹ." };
      })
    }));

    const balance = (team.opening || 0) + teamLedger.reduce((a, t) => a + t.v, 0);

    const months = {};
    teamLedger.forEach(t => {
      const k = t.date.slice(0, 7);
      if (!months[k]) months[k] = { k, in: 0, out: 0 };
      if (t.v > 0) months[k].in += t.v; else months[k].out += -t.v;
    });
    /* Sau thang lien nhau tinh nguoc tu thang nay, ke ca thang khong co dong nao.
       Truoc do bieu do chi ve nhung thang CO giao dich: doi moi ghi hai thang thi
       hai cot nam giua the rong 605px, va hai cot canh nhau doc ra "lien ke" trong
       khi that ra cach nhau may thang. Thang rong la su that, khong phai cho trong. */
    const mKey = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    const mNow = new Date();
    const mArr = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(mNow.getFullYear(), mNow.getMonth() - (5 - i), 1);
      const k = mKey(d);
      return months[k] || { k, in: 0, out: 0 };
    });
    const peak = Math.max(1, ...mArr.map(m => Math.max(m.in, m.out)));

    const now = new Date();
    const nextWed = new Date(now);
    nextWed.setDate(now.getDate() + ((3 - now.getDay() + 7) % 7 || 7));
    const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    const view = new Date(now.getFullYear(), now.getMonth() + st.monthOffset, 1);
    const lead = (view.getDay() + 6) % 7;
    const dim = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    const evOn = d => teamEvents.filter(e => {
      const base = new Date(e.date + "T00:00:00");
      if (e.repeat === "weekly") return d >= base && d.getDay() === base.getDay() && (e.skip || []).indexOf(isoT(d)) < 0;
      return iso(d) === e.date;
    });
    const playedByDay = matchByDay(teamMatches);
    const calendar = [];
    const cells = Math.ceil((lead + dim) / 7) * 7;
    for (let i = 0; i < cells; i++) {
      const dnum = i - lead + 1;
      const inMonth = dnum >= 1 && dnum <= dim;
      const d = inMonth ? new Date(view.getFullYear(), view.getMonth(), dnum) : null;
      const evs = d ? evOn(d) : [];
      const played = inMonth ? (playedByDay[view.getFullYear() * 10000 + (view.getMonth() + 1) * 100 + dnum] || []) : [];
      const isToday = !!d && iso(d) === iso(now);
      calendar.push({
        day: inMonth ? String(dnum) : "",
        bg: played.length ? "rgba(193,212,57,0.14)" : evs.length ? "rgba(104,33,220,0.22)" : (inMonth ? "#121526" : "transparent"),
        ring: isToday ? "#C1D439" : "rgba(255,255,255,0.06)",
        fg: inMonth ? (isToday ? "#C1D439" : "#FAFAFF") : "transparent",
        // Tran da da di TRUOC lich sap toi trong cung mot o: chuyen da xay ra
        // thang hon mot buoi du kien.
        events: played.map(g => {
          const w = g.gf > g.ga, dr = g.gf === g.ga;
          return {
            chip: (w ? "T" : dr ? "H" : "B") + " " + g.gf + "-" + g.ga + " " + g.opp,
            color: w ? "#C1D439" : dr ? "rgba(250,250,255,0.75)" : "#FF7F6B",
            soft: w ? "rgba(193,212,57,0.16)" : dr ? "rgba(255,255,255,0.07)" : "rgba(236,46,26,0.16)"
          };
        }).concat(evs.map(e => ({ chip: e.time + " " + KINDS[e.kind].short, color: KINDS[e.kind].color, soft: KINDS[e.kind].soft }))),
        cursor: (inMonth && isAdmin) ? "pointer" : "default",
        hint: (inMonth && isAdmin) ? "Bấm để thêm lịch ngày " + dnum + "/" + (view.getMonth() + 1) : "",
        plusFg: (inMonth && isAdmin) ? "#C1D439" : "transparent",
        menu: (inMonth && isAdmin) ? (ev2 => {
          if (ev2 && ev2.preventDefault) ev2.preventDefault();
          const W = typeof window !== "undefined" ? window.innerWidth : 900;
          const H = typeof window !== "undefined" ? window.innerHeight : 700;
          const sheet = W < 640;
          const x = Math.max(8, Math.min(((ev2 && ev2.clientX) || 40), W - 304));
          const y = Math.max(8, Math.min(((ev2 && ev2.clientY) || 40), Math.max(8, H - 496)));
          this.setState({ menu: { date: iso(d), label: DAY_FULL[d.getDay()] + ", " + dnum + " tháng " + (view.getMonth() + 1), x: x, y: y, sheet: sheet, editId: null } });
        }) : (ev2 => { if (ev2 && ev2.preventDefault) ev2.preventDefault(); }),
        pick: (inMonth && isAdmin) ? (ev2 => {
          if (ev2 && ev2.preventDefault) ev2.preventDefault();
          this.setState(s => ({ evEditId: null, ev: { ...s.ev, date: iso(d) }, copied: "Đã chọn ngày " + dnum + "/" + (view.getMonth() + 1) + " - chuột phải để thêm nhanh, hoặc điền giờ, sân rồi bấm Thêm lịch." }));
        }) : (ev2 => { if (ev2 && ev2.preventDefault) ev2.preventDefault(); })
      });
    }
    const nextDays = [];
    for (let i = 0; i < 28; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      evOn(d).forEach(e => nextDays.push({ e: e, d: d }));
    }
    const pastOcc = [];
    for (let i = 1; i <= 28; i++) {
      const d = new Date(nowT.getFullYear(), nowT.getMonth(), nowT.getDate() - i);
      teamEvents.forEach(e => {
        const base = new Date(e.date + "T00:00:00");
        const hit = occHit(e, d, base, isoT(d));
        if (hit) pastOcc.push({ e: e, d: d, key: e.id + "@" + isoT(d) });
      });
    }
    pastOcc.sort((a, b) => b.d - a.d);
    const window3 = (pastOcc.length ? [pastOcc[0]] : []).concat(nextDays.slice(0, pastOcc.length ? 2 : 3));
    const upcoming = window3.map((x, i) => {
      const isPast = pastOcc.length > 0 && i === 0;
      const isNext = (pastOcc.length > 0 && i === 1) || (pastOcc.length === 0 && i === 0);
      const a = (st.attendByOcc || {})[x.key || (x.e.id + "@" + isoT(x.d))] || {};
      const yes = attCounts(a, active.map(p2 => p2.id)).yes;
      return {
        title: fixtureTitle(x.e.opp, KINDS[x.e.kind].label) + " · " + x.e.time,
        meta: DAY_VN[x.d.getDay()] + " " + x.d.getDate() + "/" + (x.d.getMonth() + 1) + " · " + (/^https?:\/\//i.test(String(x.e.place || "")) ? "có link Maps" : (venueOf(x.e.place) || "chưa có sân")) + (kitLabelOf(x.e.kit) ? " · " + kitLabelOf(x.e.kit) : "") + (x.e.note ? " · " + x.e.note : "") + (x.e.repeat === "weekly" ? " · lịch cố định" : ""),
        color: KINDS[x.e.kind].color,
        barW: isNext ? "6px" : "4px",
        // Buoi da qua nay co nut "Ghi ket qua"; mo 0.45 thi cai nut do cung mo theo.
        opacity: isPast ? "0.72" : "1",
        ring: isNext ? "rgba(177,129,255,0.5)" : "rgba(255,255,255,0.05)",
        tag: isPast ? "Đã qua" : (isNext ? "Kế tiếp" : "Sau đó"),
        tagBg: isPast ? "rgba(255,255,255,0.07)" : (isNext ? "rgba(193,212,57,0.18)" : "rgba(255,255,255,0.07)"),
        tagFg: isPast ? "rgba(250,250,255,0.68)" : (isNext ? "#C1D439" : "rgba(250,250,255,0.6)"),
        joined: yes + " nhận",
        canEdit: isAdmin && !isPast,
        /* Buoi da qua truoc day la mot the CHET: khong mot nut nao. App biet buoi
           2/9 da dien ra, biet ai bam "Di", ma khong co duong nao bien no thanh
           mot ket qua -- nen moi tran trong Lich su tran deu khong co ngay, va
           "Dong thoi gian" ben canh phai treo nhan "chua ro khi nao".
           Mot nut, mot lan dien san: ngay cua buoi do + doi ban neu da khai. */
        canLog: isAdmin && isPast,
        /* Keo luon BUOI do ve lam buoi dang mo, khong chi dien san ngay.

           Truoc do nut nay chi dien ngay, nen `sameDay` trong `saveResult` van
           false: luu xong thi khong tinh tien san, khong chot diem danh, va "so
           tran" chi cong cho ai duoc gan ban hay the. Ma ghi ket qua vao hom sau
           la chuyen thuong nhat cua doi truong. App co noi ra ("khong phai buoi
           dang mo") nhung noi xong roi de day -- nguoi dung phai tu doi buoi,
           ma truoc dot truoc thi khong co cach nao doi.

           Chi doi khi buoi do THAT SU nam trong danh sach (OCC quet -14..+28).
           Buoi cu hon thi giu nguyen buoi dang mo va de cau canh bao cua
           `saveResult` lam viec cua no -- doi sang mot khoa khong ton tai chi
           lam `curOcc` roi ve mac dinh, tuc doi thầm sang mot buoi khac. */
        logResult: () => this.setState(s => {
          const k = x.key || (x.e.id + "@" + isoT(x.d));
          const inList = OCC.some(o => o.key === k);
          return {
            tab: "fund", teamView: "log", sel: null,
            ...(inList ? { occ: k } : {}),
            res: { ...s.res, day: x.d.getDate() + "/" + (x.d.getMonth() + 1) + "/" + x.d.getFullYear(),
                   opp: s.res.opp || x.e.opp || "",
                   venue: x.e.kind === "away" ? "KHÁCH" : s.res.venue },
            copied: "Điền kết quả buổi " + x.d.getDate() + "/" + (x.d.getMonth() + 1)
              + (inList ? " — đã mở buổi đó nên lưu xong sẽ tính tiền sân."
                        : " — buổi này quá cũ, lưu xong sẽ KHÔNG tính tiền sân.")
          };
        }),
        edit: () => this.setState(s => ({
          menu: { date: isoT(x.d), label: DAY_FULL[x.d.getDay()] + ", " + x.d.getDate() + " tháng " + (x.d.getMonth() + 1), x: 120, y: 120, sheet: (typeof window !== "undefined" ? window.innerWidth : 900) < 640, editId: x.e.id, recurring: x.e.repeat === "weekly", scope: "all" },
          ev: { ...s.ev, kind: x.e.kind, date: isoT(x.d), time: x.e.time, place: x.e.place || "", note: x.e.note || "", repeat: x.e.repeat, fee: x.e.fee != null ? String(x.e.fee) : "", opp: x.e.opp || "", kit: x.e.kit || "" }
        })),
        /* Bo MOT buoi cua lich hang tuan thi chi bo dung buoi do. Truoc day no
           xoa ca dinh nghia lich, nen bo buoi 9/9 vi mua la mat luon 16/9, 23/9,
           30/9 va ca lich co dinh -- chi cuu duoc neu kip bam Hoan tac trong
           khoang mot giay. Lich le (khong lap) thi van xoa han nhu cu. */
        remove: () => this.setState(s => {
          const iso = isoT(x.d);
          if (x.e.repeat === "weekly") {
            const events = s.events.map(y => y.id !== x.e.id ? y
              : { ...y, skip: (y.skip || []).concat([iso]) });
            const out = { events };
            this.persist(out);
            return { ...out, menu: null, undo: { state: { events: s.events } },
              copied: "Đã bỏ buổi " + x.d.getDate() + "/" + (x.d.getMonth() + 1) + ". Lịch cố định vẫn giữ." };
          }
          const events = s.events.filter(y => y.id !== x.e.id);
          const p = this.pruneOcc(s, x.e.id);
          const out = { events, ...p.out };
          this.persist(out);
          return { ...out, menu: null, undo: { state: { events: s.events, ...p.before } }, copied: "Đã xoá lịch." };
        })
      };
    });

    const wins = teamMatches.filter(g => g.gf > g.ga).length;
    const draws = teamMatches.filter(g => g.gf === g.ga).length;
    const last5 = teamMatchesRecent.slice(0, 5).map(o => o.m).map(g => {
      const w = g.gf > g.ga, d = g.gf === g.ga;
      return {
        letter: w ? "T" : (d ? "H" : "B"),
        score: g.gf + "-" + g.ga,
        title: oppOf(g) + " · " + g.gf + "-" + g.ga + (g.opp && g.date ? " · " + dmyShow(g.date) : ""),
        color: w ? "#75CE50" : (d ? "rgba(250,250,255,0.7)" : "#FF7F6B"),
        soft: w ? "rgba(117,206,80,0.16)" : (d ? "rgba(255,255,255,0.06)" : "rgba(236,46,26,0.16)"),
        line: w ? "rgba(117,206,80,0.35)" : (d ? "rgba(255,255,255,0.12)" : "rgba(236,46,26,0.35)")
      };
    });
    const last5w = teamMatchesRecent.slice(0, 5).map(o => o.m).filter(g => g.gf > g.ga).length;

    const selM = st.sel ? byId(st.sel) : null;

    const showFab = false;
    return {
      ...slotVals,
      // Mất kết nối thì PHẢI NÓI RA. App này có tiền lệ hỏng âm thầm rồi hiện ra
      // như thể mất sạch dữ liệu.
      netErr: st.netErr || "",
      noCrypto: !(globalThis.crypto && globalThis.crypto.subtle),
      hasNetErr: !!st.netErr,
      isDoors: !st.auth && !st.pending && (st.door === "pick" || (!st.door && !(st.teams || []).length)),
      notFirstRun: !!(st.teams || []).length,
      doorBackToTeam: () => this.setState({ door: "", authMode: "login", loginErr: "", pass: "", pass2: "" }),
      demoBlocked: !!(st.members || []).length,
      demoOpacity: (st.members || []).length ? "0.55" : "1",
      isLogin: !st.auth && !st.pending && st.door !== "pick" && (!!(st.teams || []).length || !!st.door),
      isApp: !!st.auth, isNoTeam: !st.auth && !!st.pending,
      doorNew: () => this.setState({ door: "new", authMode: "signup", loginErr: "" }),
      doorJoin: () => this.setState({ door: "join", authMode: "signup", loginErr: "" }),
      doorDemo: () => this.loadDemo(),
      doorBack: () => this.setState({ door: "", authMode: "login", loginErr: "", pass: "", pass2: "" }),
      showDoorBack: !!st.door,
      doorHint: st.door === "join"
        ? "Đặt tài khoản của bạn trước, xong app sẽ hỏi mã đội."
        : (st.door === "new" ? "Đặt tài khoản của bạn trước, xong app sẽ hỏi tên đội." : ""),
      hasDoorHint: !!st.door && st.door !== "pick",
      // Mot nguoi da cho hai doi. Danh sach nay la nguon su that ve "toi o dau",
      // khong phai `teams` ben trong cuc du lieu cua MOT doi.
      teamList: this.teamListGet().map(t => ({
        label: (t.name || "Đội") + " · " + (t.short || ""),
        cur: (this.cloudMeta() || {}).code === t.code,
        bg: (this.cloudMeta() || {}).code === t.code ? "rgba(104,33,220,0.35)" : "#1F2332",
        line: (this.cloudMeta() || {}).code === t.code ? "rgba(177,129,255,0.6)" : "rgba(255,255,255,0.12)",
        click: () => {
          const keep = this.teamListGet().find(x => x.code === t.code) || {};
          this.cloudSet({ code: t.code, rev: keep.rev || 0, adminKey: keep.adminKey, memberKey: keep.memberKey });
          this.setState({ auth: null, sel: null, door: "", tab: "overview" }, () => this.cloudPull());
        }
      })),
      hasTeamList: this.teamListGet().length > 0,
      // Duong quay ve ba cua: tao doi khac, hoac vao doi bang ma moi.
      goDoors: () => this.setState({ auth: null, sel: null, door: "pick", pending: null, loginErr: "" }),
      isAdmin, isPlayer: !!st.auth && !isAdmin,
      teamName: team.name, teamNameUpper: team.name.toUpperCase(), teamCode: team.code,
      teamLogo: team.logo || "",
      hasLogo: !!team.logo,
      noLogo: !team.logo,
      logoBtn: team.logo ? "Đổi logo" : "Chọn logo",
      pickLogo: e => {
        const f = e.target.files && e.target.files[0];
        e.target.value = "";
        if (!f) return;
        readImage(f).then(im => this.setState({
          photoEdit: { kind: "team", id: team.id, url: im.url, w: im.w, h: im.h, zoom: 1, ox: 0, oy: 0 }
        })).catch(() => this.setState({ copied: "Không đọc được ảnh này." }));
      },
      /* Doi ten doi. Truoc do KHONG co cho nao doi duoc sau khi tao: trong tai
         vong 25 ra soat het man Cai dat doi, cuon toi day, khong thay o nao. Doi
         phui doi ten la chuyen thuong -- them tai tro, tach doi, hoac go sai tu
         dau. Dat ngay canh MA DOI vi ca hai deu la danh tinh cua doi. */
      teamNameDraft: st.teamNameDraft == null ? team.name : st.teamNameDraft,
      setTeamName: e => this.setState({ teamNameDraft: e.target.value }),
      canRename: isAdmin,
      saveTeamName: guard(() => this.setState(st2 => {
        const v = String(st2.teamNameDraft == null ? team.name : st2.teamNameDraft).trim();
        if (!v) return { copied: "Đội phải có tên." };
        if (v.length > 40) return { copied: "Tên đội dài quá 40 chữ thì bảng nào cũng vỡ." };
        if (v === team.name) return { copied: "Tên vẫn như cũ." };
        const teams = st2.teams.map(t => t.id === team.id ? { ...t, name: v } : t);
        this.persist({ teams });
        return { teams, teamNameDraft: null, copied: "Đội nay tên là " + v + "." };
      })),
      clearLogo: () => this.setState(st2 => {
        const teams = st2.teams.map(t => t.id === team.id ? { ...t, logo: "" } : t);
        this.persist({ teams });
        return { teams, copied: "Đã xoá logo." };
      }),
      pendingName: st.pending ? st.pending.name : "", pendingPhone: st.pending ? st.pending.phone : "",
      joinCode: st.joinCode, setJoinCode: e => this.setState({ joinCode: e.target.value, loginErr: "" }),
      newTeam: st.newTeam, setNewTeam: e => this.setState({ newTeam: e.target.value, loginErr: "" }),
      doJoin: () => this.joinTeam(),
      doCreateTeam: () => this.createTeam(),
      backToLogin: () => this.setState({ pending: null, loginErr: "", authMode: "login" }),
      nameInput: st.nameInput, setNameInput: e => this.setState({ nameInput: e.target.value, loginErr: "" }),
      adminCount: admins.length + "/" + MAX_ADMINS,
      adminList: admins.map(m => ({
        name: m.name,
        canDrop: admins.length > 1 && isAdmin,
        drop: () => this.setState(s => { const members = s.members.map(x => x.id === m.id ? { ...x, role: undefined } : x); this.persist({ members }); return { members, copied: "Đã bỏ quyền admin của " + m.name + "." }; })
      })),
      canAddAdmin: isAdmin && admins.length < MAX_ADMINS,
      playerPromoteOptions: active.filter(m => m.role !== "admin").map(m => ({ value: String(m.id), label: (m.num ? "#" + m.num + " " : "") + m.name })),
      promoteId: st.promoteId || "",
      setPromoteId: e => this.setState({ promoteId: e.target.value }),
      promote: () => this.setState(s => {
        const pid = parseInt(s.promoteId, 10);
        if (!pid) return { copied: "Chọn người trước đã." };
        if (admins.length >= MAX_ADMINS) return { copied: "Mỗi đội tối đa " + MAX_ADMINS + " admin." };
        const members = s.members.map(x => x.id === pid ? { ...x, role: "admin" } : x);
        this.persist({ members });
        return { members, promoteId: "", copied: "Đã thêm admin." };
      }),
      copyCode: () => {
        this.copyText(team.code);
        this.setState({ copied: "Đã copy mã đội " + team.code + " - gửi cho người mới." });
      },
      phone: st.phone, pass: st.pass, loginErr: st.loginErr,
      /* Doi so thi doi luon ten goi y. Truoc do `nameInput` chi duoc dat mot lan
         luc bam Vao doi, nen nguoi THU HAI lap tai khoan ngay sau nguoi thu nhat
         tren cung mot may se thay ten cua nguoi truoc nam san trong o -- trong tai
         vong 28 go ba so khac nhau ma ten van la "Tran Gia Bao". Chi ghi de khi o
         ten dang trong hoac dang giu ten cua so cu, de khong nuot cai nguoi ta
         vua tu go. */
      setPhone: e => this.setState(s => {
        const v = e.target.value;
        const nameOf = ph => {
          const k = phoneKey(ph);
          if (!k) return "";
          const hit = (s.members || []).find(m => phoneKey(m.phone) === k);
          return hit ? hit.name : "";
        };
        const old = nameOf(s.phone);
        const next = nameOf(v);
        const keep = String(s.nameInput || "").trim();
        const overwrite = s.authMode === "signup" && (!keep || keep === old);
        return overwrite ? { phone: v, loginErr: "", nameInput: next } : { phone: v, loginErr: "" };
      }),
      setPass: e => this.setState({ pass: e.target.value, loginErr: "" }),
      onLoginKey: e => { if (e.key === "Enter") this.doLoginNow(); },
      doLogin: () => this.doLoginNow(),
      authSubmit: () => this.doLoginNow(),
      authModes: [
        { id: "login", label: "Đăng nhập" },
        { id: "signup", label: "Tạo tài khoản" }
      ].map(x => ({
        label: x.label,
        bg: st.authMode === x.id ? "#6821DC" : "#090F1D",
        fg: st.authMode === x.id ? "#FAFAFF" : "rgba(250,250,255,0.6)",
        click: () => this.setState({ authMode: x.id, loginErr: "", pass: "", pass2: "", dobInput: "", invite: "" })
      })),
      isSignup: st.authMode === "signup",
      isForgot: st.authMode === "forgot",
      needsConfirm: st.authMode !== "login",
      passLabel: st.authMode === "login" ? "MẬT KHẨU" : "MẬT KHẨU MỚI",
      authCta: st.authMode === "signup" ? "Tạo tài khoản" : (st.authMode === "forgot" ? "Đặt lại mật khẩu" : "Vào đội"),
      authMsg: st.loginErr,
      forgotLabel: st.authMode === "forgot" ? "← Về đăng nhập" : "Quên mật khẩu?",
      toggleForgot: () => this.setState(s => ({ authMode: s.authMode === "forgot" ? "login" : "forgot", loginErr: "", pass: "", pass2: "", dobInput: "", invite: "" })),
      // Máy trống thì màn đăng nhập là màn đầu tiên người lạ nhìn thấy, nên nó phải
      // nói ra hai đường đi thay vì bắt đoán.
      isFirstRun: !(st.members || []).length,
      // Chữ trên phù hiệu là chữ đầu tên đội, không phải chữ J của một đội cụ thể.
      teamInitial: (team.name || "?").trim().charAt(0).toUpperCase(),
      loadDemo: () => this.loadDemo(),
      /* Xoa sach moi du lieu cua app tren may, khong hoan tac. Cau thu thuong
         bam duoc thi mot nguoi trong doi co the xoa het cua ca doi truong. */
      wipeAll: guard(() => this.wipeAll()),
      authHint: st.authMode === "signup" ? "Số của bạn phải có trong danh sách đội. Chưa có thì nhờ admin thêm vào." : (st.authMode === "forgot" ? "Khớp ngày sinh trong hồ sơ đội là đặt lại được mật khẩu." : "Lần đầu dùng? Bấm Tạo tài khoản."),
      authMsgColor: "#FF6B57",
      pass2: st.pass2, setPass2: e => this.setState({ pass2: e.target.value, loginErr: "" }),
      dobInput: st.dobInput, setDob: e => this.setState({ dobInput: e.target.value, loginErr: "" }),
      invite: st.invite, setInvite: e => this.setState({ invite: e.target.value, loginErr: "" }),
      logout: () => this.setState({ auth: null, phone: "", pass: "", tab: "overview", sel: null, door: "pick" }),
      meName: me ? me.name : "",
      roleLabel: isAdmin ? "ADMIN" : "CẦU THỦ",
      roleBg: isAdmin ? "rgba(209,107,244,0.2)" : "rgba(255,255,255,0.08)",
      roleFg: isAdmin ? "#E4A6FF" : "rgba(250,250,255,0.72)",

      navs: TABS.map(t => ({
        label: t.short, icon: t.icon,
        fg: st.tab === t.id ? "#FAFAFF" : "rgba(250,250,255,0.6)",
        bar: st.tab === t.id ? "#C1D439" : "transparent",
        navBg: st.tab === t.id ? "rgba(104,33,220,0.35)" : "transparent",
        /* Roi han man thi dong luon o them thanh vien va xoa ban nhap. Truoc do
           go do dang mot nguoi, chuyen sang Tong quan roi quay lai thi form van
           con nguyen chu cu, khong mot dau hieu nao -- dinh them nguoi khac, bam
           "Them vao doi" la tao nham nguoi vua go do dang. */
        click: () => this.setState(Object.assign(
          { tab: t.id, sel: null, formOpen: false, editId: null,
            form: { name: "", num: "", type: "Đá cứng", grp: "A", phone: "", shirt: "", size: "", dob: "", hurt: "", hurtTo: "", posMain: "", posAlt: [] } },
          t.id === "lineup" ? { lineupView: "squad" } : (t.id === "fund" ? { teamView: "fund" } : {})))
      })),
      tabTitle: (st.tab === "members" && (st.memberView || "list") === "stats") ? "Thống kê"
        : ((st.tab === "lineup" && (st.lineupView || "squad") === "tactics") ? "Chiến thuật"
        : ((TABS.concat([EXTRA_TAB, EXTRA_STATS]).find(x => x.id === st.tab) || TABS[0]).label)),
      teamBg: st.tab === "team" ? "rgba(104,33,220,0.35)" : "transparent",
      teamFg: st.tab === "team" ? "#FAFAFF" : "rgba(250,250,255,0.6)",
      openTeam: () => this.setState({ tab: "team", teamView: "settings", sel: null }),
      needsRsvp: showFab,
      hasToast: !!(st.copied || st.lineupMsg),
      /* Toast xuong DUOI o man rong. Truoc day no o `top:150px` voi ly do ghi
         lai la "duoi hang dieu khien tren dinh (y 86-130)" va "duoi cung khong
         co cho vi nut Luu doi hinh nam do" -- ca hai con so do nay da cu: do
         lai o 1920x1080, hang "Chay thu / Cong cu" nam y 188-232 nen toast
         150-226 DE LEN dung no, con nut "Luu doi hinh" nam y 658-704 chu khong
         o day duoi, va dai y 900-1080 trong hoan toan. Do cung la cho thanh
         hoan tac cu tung dung (bottom:22px) suot may thang khong ai keu.
         Man hep giu nguyen: trang cuon that va nut Luu duoc ghim o 92px. */
      toastTop: "auto",
      toastBottom: st.narrow ? (showFab ? "218px" : "150px") : "22px",
      toast: st.copied || st.lineupMsg,
      clearToast: () => this.setState({ copied: "", lineupMsg: "" }),
      /* MOT cho hoan tac, khong hai. Truoc do co ca thanh rieng o day duoi
         (bottom:22px) lan nut HOAN TAC trong chinh cai toast nay: cung mot cau,
         hai hop, do duoc hai khoi `position:fixed` cach nhau 138px, va cai o
         tren de len o "DU BI / + Them du bi" cua man doi hinh. Thanh rieng bi
         go; toast giu vi no la cho duy nhat hien MOI thong bao (ke ca cau bao
         loi khong hoan tac duoc). Toast khong tu tat khi con hoan tac -- xem
         bo dem o `setState`. */
      hasUndo: !!(st.undo && st.undo.state),
      doUndo: e => { if (e && e.stopPropagation) e.stopPropagation(); this.setState(s => {
        if (!s.undo) return {};
        const out = { ...s.undo.state, undo: null, copied: "Đã hoàn tác." };
        this.persist(s.undo.state);
        return out;
      }); },
      isOverview: st.tab === "overview",
      showCalHint: !st.sawCtx,
      isLineup: st.tab === "lineup",
      isLineupNav: false,
      showRail: false,
      /* FM26 tách "hình dạng đội" khỏi "chỉ đạo" thành hai màn (Team Shape /
         Team Instructions). Ở đây cả hai từng nằm chung một cột: đo được 1010px
         nội dung nhét vào hộp 544px, và 57% chỗ đó là các thẻ chỉ đạo. Tách ra thì
         cột trái còn 437px — hết cuộn, không phải "cuộn ít hơn".

         Màn hẹp đã chia tab sẵn (`paneTab`); đây là kéo desktop về khớp với nó,
         không phải dựng thêm một lối điều hướng thứ hai. */
      showRailPane: st.narrow ? (st.paneTab || "pitch") === "tactic" : true,
      showInstrPane: st.narrow ? (st.paneTab || "pitch") === "tactic" : (st.shapeTab || "shape") === "instr",
      shapeTabs: [["shape", "Đội hình"], ["instr", "Chiến thuật"]].map(t => ({
        label: t[1],
        bg: (st.shapeTab || "shape") === t[0] ? "#6821DC" : "#121526",
        fg: (st.shapeTab || "shape") === t[0] ? "#FAFAFF" : "rgba(250,250,255,0.7)",
        line: (st.shapeTab || "shape") === t[0] ? "#6821DC" : "rgba(255,255,255,0.07)",
        // Doi tab thi dong bang chi dao ca nhan: no thuoc ve tab Doi hinh, de mo
        // sang tab Chien thuat thi hai bang chi dao (ca nhan o cot giua, doi o cot
        // phai) mo chong cung luc ma khong cai nao noi cho cai kia biet.
        click: () => this.setState({ shapeTab: t[0], pickedSlot: null })
      })),
      // The XI stats describe the pitch, so they sit on the pitch toolbar row rather
      // than buried in the right rail under four buttons. Narrow keeps the rail copy.
      showStatStrip: true,
      // The middle track was `auto`, which sizes to the max-content of everything
      // in it. Putting the stat strip on the pitch toolbar row therefore widened
      // the column and squeezed the right rail from 418px to 287px, wrapping its
      // buttons onto a third row. The pitch is capped at 430px, so cap the track.
      // The pitch is the reason the screen exists, so it takes the free track and
      // the two side columns are capped. Sizes/formations/mentality moved to the
      // top bar, so the left column now holds one card and does not need 290px.
      /* Mot san thi khung san chi can ~880px, du 300px cho bang ca doi -- doi cho
         thang cho cot phai chu khong de no thanh le trang. */
      lineupCols: st.narrow ? "1fr"
        /* Cot bang ca doi chi duoc phinh toi 710px khi man that su rong. Do o
           1280x800: 220 (thanh ben) + 710 (bang) an het, cot san con 294px va o
           cau thu chong nhau. Duoi 1600 chan bang o 460px de san con cho tho. */
        : (st.wide3 ? ("minmax(190px,220px) minmax(0,1fr) minmax(320px," + ((dualPitch || !st.wide6) ? "460px" : "710px") + ")")
                    : "minmax(180px,200px) minmax(0,1fr) minmax(280px,340px)"),
      lineupViews: [].map(v => ({
        label: v[1],
        bg: (st.lineupView || "squad") === v[0] ? "#6821DC" : "#121526",
        fg: (st.lineupView || "squad") === v[0] ? "#FAFAFF" : "rgba(250,250,255,0.7)",
        line: (st.lineupView || "squad") === v[0] ? "#6821DC" : "rgba(255,255,255,0.07)",
        click: () => this.setState({ lineupView: v[0], sel: null, tacticSlot: null })
      })),
      isMembers: st.tab === "members" && (st.memberView || "list") !== "stats",
      isStats: st.tab === "members" && (st.memberView || "list") === "stats",
      isTactics: st.tab === "lineup" && st.narrow && (st.lineupView === "tactics"),
      isFund: (st.tab === "fund" && (st.teamView || "fund") === "fund"),
      isMatchLog: (st.tab === "fund" && st.teamView === "log"),
      isHall: (st.tab === "fund" && st.teamView === "hall"),
      isTeamNav: st.tab === "fund" || st.tab === "team",
      teamViews: (teamViewNow => [["settings", "Cài đặt đội"], ["hall", "Phòng truyền thống"], ["log", "Lịch sử trận"], ["fund", "Quỹ"]].map(v => ({
        label: v[1],
        bg: (teamViewNow === v[0]) ? "#6821DC" : "#121526",
        fg: (teamViewNow === v[0]) ? "#FAFAFF" : "rgba(250,250,255,0.7)",
        line: (teamViewNow === v[0]) ? "#6821DC" : "rgba(255,255,255,0.07)",
        click: () => this.setState(v[0] === "settings"
          ? { tab: "team", teamView: "settings", sel: null }
          : { tab: "fund", teamView: v[0], sel: null })
      })))(st.tab === "team" ? "settings" : (st.teamView || "fund")),

      /* ---------- team fund: bank details, VietQR, shared links, rules ----------
         All of this was painted-on: the transfer card said "- điền sau -" three
         times over a QR slot that cannot persist, the three link cards were
         <a href="#">, and rules 04 and 05 said "- bổ sung sau -". */
      bankOptions: [{ v: "", label: "— chọn ngân hàng —", sel: !team.bankBin }]
        .concat(VN_BANKS.map(b => ({ v: b[0], label: b[1], sel: team.bankBin === b[0] }))),
      bankBin: team.bankBin || "",
      bankAcc: team.bankAcc || "",
      bankHolder: team.bankHolder || "",
      bankLabel: BANK_NAME(team.bankBin) || "chưa đặt",
      bankAccLabel: team.bankAcc || "chưa đặt",
      bankHolderLabel: team.bankHolder || "chưa đặt",
      setBankBin: e => this.patchTeam(teamId, { bankBin: e.target.value }),
      /* Loc chu ra khoi so tai khoan la dung, nhung im lang thi khong: go
         "xyz-not-numeric" roi thay o tu trang ra doc nhu app nuot mat cai vua go.
         Van loc, nhung noi mot cau khi co ky tu bi bo. */
      setBankAcc: e => {
        const raw = String(e.target.value);
        const clean = raw.replace(/[^0-9]/g, "");
        this.patchTeam(teamId, { bankAcc: clean });
        if (clean !== raw) this.setState({ copied: "Số tài khoản chỉ gồm chữ số — đã bỏ ký tự khác." });
      },
      setBankHolder: e => this.patchTeam(teamId, { bankHolder: e.target.value.toUpperCase() }),
      bankReady: !!(team.bankBin && team.bankAcc),
      noBank: !(team.bankBin && team.bankAcc),
      // Pre-fill the amount with what this viewer actually owes and the memo with
      // their name, so scanning the code is the whole transaction. That is the
      // point of VietQR over a photo of a QR someone uploaded once.
      qrSrc: (team.bankBin && team.bankAcc)
        ? "https://img.vietqr.io/image/" + team.bankBin + "-" + team.bankAcc + "-compact2.png"
          + "?accountName=" + encodeURIComponent(team.bankHolder || team.name)
          + (me && debt(me) > 0 ? "&amount=" + debt(me) : "")
          + "&addInfo=" + encodeURIComponent(((me && me.name) || "") + " gop quy " + team.name)
        : "",
      qrNote: me && debt(me) > 0
        ? ("Quét là điền sẵn " + this.money(debt(me)) + " và tên bạn.")
        : "Quét bằng app ngân hàng, tự điền số tài khoản.",
      copyBank: () => {
        this.copyText([team.name, BANK_NAME(team.bankBin), team.bankAcc, team.bankHolder]
          .filter(Boolean).join("\n"));
        this.setState({ copied: "Đã copy thông tin chuyển khoản." });
      },
      copyBankAcc: () => {
        this.copyText(team.bankAcc || "");
        this.setState({ copied: "Đã copy số tài khoản." });
      },

      // Shared links. An empty one is not a card you can click and get nothing
      // from -- it says it is empty, and only an admin sees the field to fill it.
      linkDrive: team.linkDrive || "",
      linkAlbum: team.linkAlbum || "",
      /* Chi coi la CO link khi no di duoc: mot chuoi rac van la "da dat gi do",
         nhung ve no thanh nut bam thi noi doi. Ba trang thai chu khong phai hai:
         chua dat, da dat ma khong dung dang, va dat dung. */
      hasDrive: !!safeUrl(team.linkDrive),
      hasAlbum: !!safeUrl(team.linkAlbum),
      noDrive: !team.linkDrive,
      noAlbum: !team.linkAlbum,
      badDrive: !!team.linkDrive && !safeUrl(team.linkDrive),
      badAlbum: !!team.linkAlbum && !safeUrl(team.linkAlbum),
      badLinkNote: "Link phải bắt đầu bằng http:// hoặc https:// thì mới mở được.",
      driveHref: safeUrl(team.linkDrive) || "#",
      albumHref: safeUrl(team.linkAlbum) || "#",
      matchFeeVal: team.matchFee != null && team.matchFee !== "" ? String(team.matchFee) : "",
      matchFeeLabel: this.money(fee),
      matchFeeDefault: team.matchFee == null || team.matchFee === "",
      /* De trong = quay ve so mac dinh, khong phai 0d. Go chu vao thi loc ra
         chu so -- va NOI mot cau, nuot im lang la kieu app an mat cai vua go. */
      setMatchFee: e => {
        const raw = String(e.target.value);
        const clean = raw.replace(/[^0-9]/g, "");
        if (!clean) { this.patchTeam(teamId, { matchFee: null }); return; }
        this.patchTeam(teamId, { matchFee: parseInt(clean, 10) });
        if (clean !== raw.trim()) this.setState({ copied: "Tiền sân chỉ gồm chữ số — đã bỏ ký tự khác." });
      },
      setLinkDrive: e => this.patchTeam(teamId, { linkDrive: e.target.value.trim() }),
      setLinkAlbum: e => this.patchTeam(teamId, { linkAlbum: e.target.value.trim() }),

      // The fund file was a dead link to a spreadsheet nobody maintains. The app
      // already holds every transaction, so it exports them, same as the roster.
      exportLedger: () => {
        const rows = st.ledger.filter(l => l.teamId === teamId)
          .slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
        const cell = v => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
        let bal = team.opening || 0;
        const body = rows.map(l => {
          bal += l.v;
          return [l.date, l.label, l.v > 0 ? l.v : "", l.v < 0 ? -l.v : "", bal].map(cell).join(",");
        });
        const csv = "\ufeff" + [["Ngay", "Noi dung", "Thu", "Chi", "So du"].map(cell).join(",")]
          .concat([["", "So du dau ky", "", "", team.opening || 0].map(cell).join(",")])
          .concat(body).join("\r\n");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = team.name.replace(/\s+/g, "-").toLowerCase() + "-so-quy.csv";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        this.setState({ copied: "Đã tải sổ quỹ " + rows.length + " dòng." });
      },
      ledgerCount: st.ledger.filter(l => l.teamId === teamId).length + " dòng",

      /* ---------- login backdrop ----------
         The markup pointed at assets/jfc-night.jpg, which never shipped, so the
         login screen has been showing an empty gradient. A team can now use its
         own photo. It is a data URI in localStorage, which means it lives on
         this device only -- there is no server to share it through. */
      loginBg: team.loginBg || "",
      hasLoginBg: !!team.loginBg,
      noLoginBg: !team.loginBg,
      // The stock sheen buries a photo, so it eases off once there is a real one
      // behind it. Still dark enough to read the login card against.
      loginSheen: team.loginBg ? "0.4" : "0.62",
      setLoginBg: e => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        if (!/^image\//.test(f.type)) { this.setState({ copied: "Chọn một file ảnh." }); return; }
        shrinkImage(f, 1280, 0.72).then(uri => {
          const prev = team.loginBg;
          this.setState(st2 => {
            const teams = st2.teams.map(t => t.id === teamId ? { ...t, loginBg: uri } : t);
            // Write it before keeping it: a picture that does not fit would
            // otherwise take every later save down with it.
            if (!this.persist({ teams })) {
              const back = st2.teams.map(t => t.id === teamId ? { ...t, loginBg: prev } : t);
              this.persist({ teams: back });
              return { teams: back, copied: "Ảnh quá nặng, máy không lưu nổi. Thử ảnh nhỏ hơn." };
            }
            return { teams, copied: "Đã đổi ảnh nền đăng nhập." };
          });
        }).catch(() => this.setState({ copied: "Không đọc được ảnh này." }));
        e.target.value = "";
      },
      clearLoginBg: () => {
        this.patchTeam(teamId, { loginBg: "" });
        this.setState({ copied: "Đã bỏ ảnh nền, quay lại nền mặc định." });
      },

      rules: RULE_TITLES.map((title, i) => ({
        no: title,
        text: ((team.rules || [])[i] != null && String((team.rules || [])[i]).trim())
          ? team.rules[i] : RULE_DEFAULTS[i],
        set: e => {
          const cur = (team.rules || []).slice();
          while (cur.length < RULE_TITLES.length) cur.push("");
          cur[i] = e.target.value;
          this.patchTeam(teamId, { rules: cur });
        }
      })),

      /* Nam muc tren la nhung thu MOI doi phui deu cai nhau, nen tieu de co dinh.
         Nhung moi doi con luat rieng: ai giu ao, ai dat san, phat di tre bao
         nhieu, cam gi. Truoc day khong co cho nao ghi -- nen luat rieng nam
         trong nhom chat roi troi mat. */
      rulesX: ((team.rulesExtra || [])).map((r, i) => ({
        title: (r && r.title) || "",
        text: (r && r.text) || "",
        setTitle: e => {
          const cur = (team.rulesExtra || []).slice();
          cur[i] = { ...(cur[i] || {}), title: e.target.value };
          this.patchTeam(teamId, { rulesExtra: cur });
        },
        setText: e => {
          const cur = (team.rulesExtra || []).slice();
          cur[i] = { ...(cur[i] || {}), text: e.target.value };
          this.patchTeam(teamId, { rulesExtra: cur });
        },
        del: () => {
          const cur = (team.rulesExtra || []).slice();
          cur.splice(i, 1);
          this.patchTeam(teamId, { rulesExtra: cur });
        }
      })),
      noRuleX: !((team.rulesExtra || []).length),
      addRuleX: () => this.patchTeam(teamId, {
        rulesExtra: (team.rulesExtra || []).concat([{ title: "", text: "" }])
      }),

      nameModes: [["name", "Tên"], ["both", "Tên và vị trí"], ["pos", "Vị trí"]].map(v => {
        const on = (st.nameMode || "both") === v[0];
        return {
          label: v[1],
          bg: on ? "#6821DC" : "#1F2332",
          fg: on ? "#FAFAFF" : "rgba(250,250,255,0.7)",
          line: on ? "#6821DC" : "rgba(255,255,255,0.08)",
          click: () => { this.persist({ nameMode: v[0] }); this.setState({ nameMode: v[0] }); }
        };
      }),
      isTeam: st.tab === "team",

      q: st.q, setQ: e => this.setState({ q: e.target.value }),
      /* O tim giu nguyen chu khi doi man, va truoc do khong co cach nao xoa
         ngoai viec boi den tay. Mot bang bong khong ai vao doc ra "khong co du
         lieu" chu khong doc ra "dang loc". */
      hasQ: !!String(st.q || "").trim(),
      clearQ: () => this.setState({ q: "" }),
      todayLabel: now.getDate() + "/" + (now.getMonth() + 1),
      nextDayLabel: nextDays.length ? DAY_VN[nextDays[0].d.getDay()] : "-",
      monthLabel: "tháng " + (view.getMonth() + 1) + (view.getFullYear() !== now.getFullYear() ? "/" + view.getFullYear() : ""),
      prevMonth: () => this.setState(s => ({ monthOffset: s.monthOffset - 1 })),
      nextMonth: () => this.setState(s => ({ monthOffset: s.monthOffset + 1 })),
      thisMonth: () => this.setState({ monthOffset: 0 }),
      kindLegend: Object.keys(KINDS).map(k => ({ label: KINDS[k].label, color: KINDS[k].color })),
      upcoming, noUpcoming: upcoming.length === 0,
      /* Chi hien khi co tu hai buoi tro len: mot buoi thi day chip chi la mot o
         bam vao chinh no. Cua so quanh HOM NAY -- ba buoi da da gan nhat va nam
         buoi sap toi -- chu khong phai sau buoi dau danh sach. */
      manyOcc: OCC.length > 1,
      occLabel: (curOccObj && curOccObj.past) ? "BUỔI ĐÃ ĐÁ" : "BUỔI TỚI",
      occChips: OCC.filter(o => o.past).slice(-3).concat(OCC.filter(o => !o.past).slice(0, 5)).map(o => {
        const a = (st.attendByOcc || {})[o.key] || {};
        const yes = attCounts(a, active.map(p2 => p2.id)).yes;
        const on = o.key === curOcc;
        return {
          title: KINDS[o.e.kind].short + " " + DAY_VN[o.d.getDay()] + " " + o.d.getDate() + "/" + (o.d.getMonth() + 1),
          meta: o.e.time + " · " + yes + " nhận",
          color: KINDS[o.e.kind].color,
          bg: on ? "rgba(104,33,220,0.32)" : "#121526",
          line: on ? "rgba(177,129,255,0.6)" : "rgba(255,255,255,0.08)",
          fg: on ? "#FAFAFF" : (o.past ? "rgba(250,250,255,0.5)" : "rgba(250,250,255,0.75)"),
          // Buoi da da mo hon, va noi ro no da da -- neu khong thi "T4 10/9" va
          // "T4 17/9" trong giong het nhau, bam nham la diem danh nham buoi.
          dim: o.past && !on ? "0.72" : "1",
          when: o.past ? "đã đá" : "sắp tới",
          click: () => this.setState({ occ: o.key })
        };
      }),
      /* Tien san cua mot buoi chi thanh no khi buoi do duoc CHOT (ghi ket qua).
         Truoc do khong cho nao noi ra: sang hom sau mo app, app vao buoi sap toi,
         the "Ai con no" ghi "Chua ai no quy" -- dung luc doi truong can di doi
         tien cua tran toi qua. Tien khong bien mat, no chi chua vao so.

         Chi dem buoi KHAC buoi dang mo: tien cua buoi dang mo da nam trong
         `debt()` roi, dem lai la noi hai lan. Va chi dem nguoi thuc su con no --
         tru nguoi da dong, duoc mien, va nguoi da co dong `charges` mang dung
         `occ` do. */
      pendingShow: pend.length > 0,
      // "Chua ai no quy" va "Chua vao so: 285.000d" dung canh nhau la hai cau
      // da nhau. Co tien chua vao so thi chinh no la cau tra loi, khong phai
      // dong rong.

      pendingTotal: this.money(pend.reduce((a, x) => a + x.sum, 0)),
      pendingRows: pend.map(x => ({
        label: "Buổi " + x.o.d.getDate() + "/" + (x.o.d.getMonth() + 1) + " · " + x.n + " người",
        amount: this.money(x.sum),
        click: () => this.setState({ occ: x.o.key, tab: "overview" })
      })),
      noOcc: !hasOcc, hasOcc: hasOcc,
      /* Buoi da da thi khong con gi de tra loi.

         Truoc do the buoi van hien "Toi di / Chua chac / Khong di" va moi bam
         "Nhac 14 nguoi chua tra loi" cho mot tran da da xong -- di giuc ca doi
         tra loi mot cau hoi khong con nghia. Con diem danh TUNG NGUOI o bang duoi
         thi PHAI giu: do la cho doi truong ghi lai ai da toi, va tien san tinh
         theo do. Hai thu khac nhau, truoc day trong giong nhau. */
      occPast: hasOcc && !!(curOccObj && curOccObj.past),
      occUpcoming: hasOcc && !(curOccObj && curOccObj.past),
      occPastNote: "Buổi này đã đá. Điểm danh bên dưới là ghi lại ai đã tới — tiền sân tính theo đó.",
      eventCount: teamEvents.length,
      eventList: teamEvents.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)).map(e => {
        const occs = OCC.filter(o => o.e.id === e.id);
        const nx = occs[0];
        const a = nx ? ((st.attendByOcc || {})[nx.key] || {}) : {};
        const yes = attCounts(a, active.map(p2 => p2.id)).yes;
        return {
          title: fixtureTitle(e.opp, KINDS[e.kind].label) + " · " + e.time + (e.repeat === "weekly" ? " · hàng tuần" : ""),
          meta: (nx ? (DAY_VN[nx.d.getDay()] + " " + nx.d.getDate() + "/" + (nx.d.getMonth() + 1)) : e.date) + " · " + (venueOf(e.place) || "chưa có sân") + (kitLabelOf(e.kit) ? " · " + kitLabelOf(e.kit) : ""),
          color: KINDS[e.kind].color,
          line: st.evEditId === e.id ? "rgba(177,129,255,0.6)" : "rgba(255,255,255,0.08)",
          joined: nx ? (yes + " nhận") : "đã qua",
          edit: () => this.setState({ evEditId: e.id, ev: { kind: e.kind, date: e.date, time: e.time, place: e.place || "", note: e.note || "", repeat: e.repeat, fee: e.fee != null ? String(e.fee) : "", opp: e.opp || "", kit: e.kit || "" } }),
          remove: () => this.setState(s => {
            const events = s.events.filter(x => x.id !== e.id);
            const p = this.pruneOcc(s, e.id);
            const out = { events, ...p.out };
            this.persist(out);
            return { ...out, evEditId: null, undo: { state: { events: s.events, ...p.before } }, copied: "Đã xoá lịch." };
          })
        };
      }),
      hasMenu: !!st.menu,
      menuPos: st.menu && st.menu.sheet ? "fixed" : "absolute",
      menuX: st.menu ? (st.menu.sheet ? "0px" : st.menu.x + "px") : "0px",
      menuY: st.menu ? (st.menu.sheet ? "auto" : st.menu.y + "px") : "0px",
      menuRight: st.menu && st.menu.sheet ? "0px" : "auto",
      menuBottom: st.menu && st.menu.sheet ? "0px" : "auto",
      menuW: st.menu && st.menu.sheet ? "100%" : "296px",
      menuRadius: st.menu && st.menu.sheet ? "16px 16px 0 0" : "12px",
      menuScrim: st.menu && st.menu.sheet ? "rgba(9,15,29,0.6)" : "transparent",
      menuDate: st.menu ? st.menu.label : "",
      menuMode: st.menu && st.menu.editId ? "SỬA LỊCH" : "THÊM LỊCH NGÀY",
      menuCta: st.menu && st.menu.editId ? "Lưu lịch" : "Thêm lịch",
      menuScopeShown: !!(st.menu && st.menu.editId && st.menu.recurring),
      scopeChips: [{ id: "one", label: "Chỉ buổi này" }, { id: "all", label: "Toàn bộ chuỗi" }].map(x => {
        const cur = (st.menu && st.menu.scope) || "all";
        return {
          label: x.label,
          bg: cur === x.id ? "rgba(104,33,220,0.35)" : "#121526",
          fg: cur === x.id ? "#FAFAFF" : "rgba(250,250,255,0.6)",
          line: cur === x.id ? "rgba(177,129,255,0.6)" : "rgba(255,255,255,0.08)",
          click: () => this.setState(s => ({ menu: { ...s.menu, scope: x.id } }))
        };
      }),
      stopClick: e => { if (e && e.stopPropagation) e.stopPropagation(); },
      closeMenu: () => this.setState({ menu: null }),
      menuSubmit: () => this.setState(s => {
        const mn = s.menu, v = s.ev;
        if (!mn) return {};
        const F = eventFields(v, fee);
        if (mn.editId) {
          if (mn.recurring && mn.scope === "one") {
            const events = s.events.map(x => x.id === mn.editId ? { ...x } : x)
              .concat([{ teamId: this._team, id: Date.now(), ...F, date: mn.date, repeat: "none" }]);
            this.persist({ events });
            return { events, menu: null, copied: "Đã tách riêng buổi " + mn.label + "." };
          }
          const events = s.events.map(x => x.id === mn.editId ? { ...x, ...F, date: mn.recurring ? x.date : mn.date } : x);
          this.persist({ events });
          return { events, menu: null, copied: "Đã lưu lịch " + KINDS[v.kind].label.toLowerCase() + "." };
        }
        const events = s.events.concat([{ teamId: this._team, id: Date.now(), ...F, date: mn.date }]);
        this.persist({ events });
        return { events, menu: null, flashKey: mn.date, copied: "Đã thêm " + KINDS[v.kind].label.toLowerCase() + " " + mn.label + "." };
      }),
      kindChips: Object.keys(KINDS).map(k => ({
        label: KINDS[k].label,
        dot: KINDS[k].color,
        bg: st.ev.kind === k ? KINDS[k].soft : "#121526",
        fg: st.ev.kind === k ? KINDS[k].color : "rgba(250,250,255,0.6)",
        line: st.ev.kind === k ? KINDS[k].color : "rgba(255,255,255,0.08)",
        click: () => this.setState(s => ({ ev: { ...s.ev, kind: k } }))
      })),
      toggleRepeat: () => this.setState(s => ({ ev: { ...s.ev, repeat: s.ev.repeat === "weekly" ? "none" : "weekly" } })),
      repeatBg: st.ev.repeat === "weekly" ? "rgba(104,33,220,0.3)" : "#121526",
      repeatFg: st.ev.repeat === "weekly" ? "#FAFAFF" : "rgba(250,250,255,0.6)",
      repeatLine: st.ev.repeat === "weekly" ? "rgba(177,129,255,0.6)" : "rgba(255,255,255,0.08)",
      repeatTrack: st.ev.repeat === "weekly" ? "#6821DC" : "rgba(255,255,255,0.14)",
      repeatKnob: st.ev.repeat === "weekly" ? "16px" : "2px",
      evFormTitle: st.evEditId ? "SỬA LỊCH" : (st.ev.date ? "THÊM LỊCH · NGÀY ĐÃ CHỌN" : "THÊM LỊCH (chuột phải vào ô ngày để thêm nhanh)"),
      evFormCta: st.evEditId ? "Lưu lịch" : "Thêm lịch",
      ev: st.ev,
      setEvKind: e => this.setState(s => ({ ev: { ...s.ev, kind: e.target.value } })),
      setEvDate: e => this.setState(s => ({ ev: { ...s.ev, date: e.target.value } })),
      setEvTime: e => this.setState(s => ({ ev: { ...s.ev, time: e.target.value } })),
      setEvPlace: e => this.setState(s => ({ ev: { ...s.ev, place: e.target.value } })),
      setEvNote: e => this.setState(s => ({ ev: { ...s.ev, note: e.target.value } })),
      setEvFee: e => this.setState(s => ({ ev: { ...s.ev, fee: e.target.value } })),
      setEvOpp: e => this.setState(s => ({ ev: { ...s.ev, opp: e.target.value } })),
      setEvKit: e => this.setState(s => ({ ev: { ...s.ev, kit: e.target.value } })),
      kitHint: kitLabelOf(st.ev.kit) || "để trống nếu buổi này không quy định áo",
      feeHint: st.ev.kind === "match" ? String(fee) : "0",
      mapHint: /^https?:\/\//i.test(String(st.ev.place || "").trim()) ? "Đã nhận link - cả đội bấm vào tên sân là mở Maps." : "Dán link Maps để mọi người bấm là dẫn đường luôn.",
      mapHintColor: /^https?:\/\//i.test(String(st.ev.place || "").trim()) ? "#75CE50" : "rgba(250,250,255,0.62)",
      setEvRepeat: e => this.setState(s => ({ ev: { ...s.ev, repeat: e.target.value } })),
      addEvent: () => this.setState(s => {
        const v = s.ev;
        if (!v.date) return { copied: "Chọn ngày trước đã." };
        const F2 = eventFields(v, fee);
        const events = s.evEditId
          ? s.events.map(x => x.id === s.evEditId ? { ...x, ...F2, date: v.date } : x)
          : s.events.concat([{ teamId: teamId, id: Date.now(), ...F2, date: v.date }]);
        this.persist({ events });
        return { events, evEditId: null, ev: { ...v, date: "", repeat: "none" }, copied: (s.evEditId ? "Đã sửa " : "Đã thêm ") + KINDS[v.kind].label.toLowerCase() + " ngày " + v.date + (v.repeat === "weekly" ? " (lặp hàng tuần)" : "") + "." };
      }),
      dayNames: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(l => ({ label: l })),
      calendar,

      // `filters` (dải chip lọc) không có trong bản thiết kế nào của màn này và
      // không chỗ nào vẽ nó — nó là ràng buộc chết từ trước. Bỏ cùng lúc với
      // việc `st.filter` đổi sang giữ đúng một trạng thái điểm danh.
      attendRows: searchedActive.filter(passFilter).map(rowOf),
      noAttendRows: searchedActive.filter(passFilter).length === 0,
      emptyAttendNote: q ? ("Không có ai khớp \"" + st.q + "\" trong nhóm này.")
        : (st.filter ? ("Chưa ai ở nhóm " + ATT_LABEL[st.filter].toLowerCase() + ".")
                     : "Chưa có ai trong danh sách."),
      noMemberRows: searched.length === 0,
      // MOT nguon duy nhat cho bang du bi: `benchOf`. Truoc do dem doc thang
      // `benchByTeam[sideKey]` con danh sach doc `benchOf(...)` va nguoi ghi lai
      // ghi vao `slotKey` -- ba khoa, khong ai khop ai: trong tai do duoc "0 nguoi"
      // dung tren mot hang co nguoi, va "4 nguoi" tren mot hang.
      noBench: (benchOf(st.benchByTeam, slotKey, sideKey).filter(id => active.some(m => m.id === id) && slots.indexOf(id) < 0).length) === 0,

      slotList: (() => {
        /* Bo dem cua mo phong doc bang nay chu khong doc state -- no ap transform
           thang len phan tu, nen phai co du do lech va tuyen cua tung o. */
        this._demoOffs = SLOT_ROLES.map((r, i) => ({ off: slotVals["s" + i].demoOff, line: r }));
        return SLOT_ROLES.map((r, i) => slotVals["s" + i]);
      })(),
      slotList2: SLOT_ROLES.map((r, i) => ({ ...slotVals["s" + i], left: pitchShape2[i][0], top: pitchShape2[i][1] })),
      /* San thu hai ve duoc gi ma san thu nhat khong? Do duoc: nguoi doi cho nhieu
         nhat chi lech 3 diem % doc va 7,2 diem % ngang, thu mon lech dung 0,0 --
         nho hon mot cai chip. Dat hai san canh nhau roi bat mat nhay qua nhay lai
         la bat nguoi doc DO mot thu ho khong do noi. Ve thang duong di len san thu
         hai: vong tron mo o cho cu, net dut noi toi cho moi. Ai khong nhuc nhich
         thi khong ve gi ca -- nguong 1,2 diem % de khong ve nhieu net vo nghia. */
      moveMarks2: SLOT_ROLES.map((r, i) => {
        const a = pitchShape[i], b = pitchShape2[i];
        if (!a || !b) return null;
        const ax = parseFloat(a[0]), ay = parseFloat(a[1]);
        const bx = parseFloat(b[0]), by = parseFloat(b[1]);
        if (![ax, ay, bx, by].every(v => isFinite(v))) return null;
        if (Math.abs(ax - bx) < 1.2 && Math.abs(ay - by) < 1.2) return null;
        return { x1: ax + "%", y1: ay + "%", x2: bx + "%", y2: by + "%" };
      }).filter(Boolean),
      // Ky hieu la moi thi phai co mot dong noi no la gi, ngay canh no.
      hasMoves2: SLOT_ROLES.some((r, i) => {
        const a = pitchShape[i], b = pitchShape2[i];
        if (!a || !b) return false;
        const ax = parseFloat(a[0]), ay = parseFloat(a[1]);
        const bx = parseFloat(b[0]), by = parseFloat(b[1]);
        if (![ax, ay, bx, by].every(v => isFinite(v))) return false;
        return Math.abs(ax - bx) >= 1.2 || Math.abs(ay - by) >= 1.2;
      }),
      // Ve hai ky hieu thi phai goi ten CA HAI. Ban truoc chi noi ve vong tron, con
      // net dut thi ve ra ma khong giai thich -- chuoi "net dut" xuat hien 0 lan.
      moveNote2: "vòng mờ = chỗ lúc " + (tacPhase === "on" ? "có bóng" : "mất bóng") + " · nét đứt = đường di chuyển",
      showPitch2: dualPitch,
      // CSS phai biet dang mot hay hai san de dat tran chieu cao cho san.
      dualFlag: dualPitch ? "1" : "0",
      pitchRowW: dualPitch ? "812px" : "430px",
      // Width / height as a plain number, so CSS can turn a height cap into a
      // width cap (calc can multiply by a number, it cannot divide by a length).
      pitchAr: (() => { const [w, h] = SIZE_RATIO[szKey].split("/").map(Number); return String(Math.round(w / h * 1000) / 1000); })(),
      pitchLabel1: tacPhase === "on" ? "CÓ BÓNG" : "MẤT BÓNG",
      pitchLabel2: tacPhase === "on" ? "MẤT BÓNG" : "CÓ BÓNG",
      pitchPairDir: dualPitch ? "row" : "column",
      denseGrid: SLOT_ROLES.length >= 9,
      bench,
      benchCount: (benchOf(st.benchByTeam, slotKey, sideKey).filter(id => active.some(m => m.id === id) && slots.indexOf(id) < 0).length) + " người",
      noPool: active.filter(m => slots.indexOf(m.id) < 0 && benchOf(st.benchByTeam, slotKey, sideKey).indexOf(m.id) < 0).length === 0,
      benchIds: benchOf(st.benchByTeam, slotKey, sideKey),
      benchRing: st.picked ? "rgba(177,129,255,0.5)" : "rgba(255,255,255,0.07)",
      dropToBench: id => {
        if (!isAdmin) { this.setState({ copied: "Chỉ admin xếp dự bị." }); return; }
        if (!id) return;
        // Dragged off the pitch: benchOut clears the slot, benches the player and
        // logs the sub. Dragged from the pool: it is just a bench listing.
        const at = slots.indexOf(id);
        if (at >= 0) { this.benchOut(at); return; }
        this.setState(s => {
          const cur = benchOf(s.benchByTeam, slotKey, sideKey).slice();
          if (cur.indexOf(id) < 0) cur.push(id);
          const benchByTeam = { ...s.benchByTeam, [slotKey]: cur };
          this.persist({ benchByTeam });
          const m2 = s.members.find(x => x.id === id);
          return { benchByTeam, picked: null, copied: "Đã thêm " + (m2 ? m2.name : "") + " vào dự bị." };
        });
      },
      benchList: benchOf(st.benchByTeam, slotKey, sideKey)
        .map(id => active.find(m => m.id === id))
        .filter(m => m && slots.indexOf(m.id) < 0)
        .map((m, i) => ({
          num: m.num || "-", name: m.name,
          rowBg: st.picked === m.id ? "rgba(104,33,220,0.3)" : (i % 2 ? "rgba(255,255,255,0.02)" : "transparent"),
          rowRing: st.picked === m.id ? "rgba(177,129,255,0.6)" : "transparent",
          pos: posOf(m).main || "-", posColor: LINE_TONE[lineOf(m)] || "rgba(250,250,255,0.62)",
          /* Hang du bi truoc day chi co ten, vi tri va hai cai nut chu -- khong mot
             so lieu nao ve chinh cau thu do. Muon biet nen tung ai vao san thi phai
             roi man nay di cho khac tra. Diem so di qua dung cua chung `ratingView`,
             nen nguoi chua cham hien "—" chu khong hien mot con so bia. */
          rating: ratingView(m).score,
          ratingColor: ratingView(m).rated ? attrLevel(ratingOf(m)).color : "rgba(250,250,255,0.42)",
          /* "none" truoc day ve chuoi rong: hang du bi cua nguoi CHUA tra loi
             trong y het hang cua nguoi DA nhan di. Doi truong doc mot bang im
             lang roi tuong ca bang deu on. Chua tra loi la mot trang thai, phai
             ghi ra -- xam, khong pill, de no khong gianh mat voi cau tra loi that. */
          attDot: hasOcc ? (attState(att[m.id]) === "none" ? "rgba(250,250,255,0.85)" : ATT_COLOR[attState(att[m.id])]) : "",
          attFill: hasOcc ? (attState(att[m.id]) === "none" ? "#090F1D" : ATT_COLOR[attState(att[m.id])]) : "",
          attWhy: hasOcc ? (m.name + " · " + ATT_LABEL[attState(att[m.id])]) : "",

          pick: () => { if (this.lpAte()) return; this.setState(s => ({ picked: s.picked === m.id ? null : m.id })); },
          menu: e => this.openCtx(e, m.name + " · dự bị", benchCtx(m)),
          pressStart: e => { this.lpStart(e, m.name + " · dự bị", benchCtx(m)); this.pdStart(e, m.id); },
          pressEnd: () => this.lpEnd(),
          out: guard(e => { if (e && e.stopPropagation) e.stopPropagation(); return this.setState(s => {
            const cur = benchOf(s.benchByTeam, slotKey, sideKey).filter(x => x !== m.id);
            const benchByTeam = { ...s.benchByTeam, [slotKey]: cur };
            this.persist({ benchByTeam });
            return { benchByTeam, copied: "Đã bỏ " + m.name + " khỏi dự bị." };
          }); }),
          sub: guard(e => {
            if (e && e.stopPropagation) e.stopPropagation();
            const free = bestFreeSlot(slots, SLOT_ROLES, posOf(m), FM_.labels);
            // Pitch full: hold the player instead of refusing, so the next slot
            // tapped becomes a straight swap.
            if (free < 0) {
              this.setState({ picked: m.id, copied: "Sân đủ " + SLOT_ROLES.length + " người - bấm một ô trên sân để thay." });
              return;
            }
            this.assign(free, m.id);
            this.setState({ copied: "Đã đưa " + m.name + " vào ô " + SLOT_NAMES[free] + "." });
          })
        })),
      poolRows: (() => {
        const rest = active.filter(m => slots.indexOf(m.id) < 0 && benchOf(st.benchByTeam, slotKey, sideKey).indexOf(m.id) < 0);
        const ORDER = { GK: 0, CB: 1, LB: 2, RB: 3, CDM: 4, CM: 5, CAM: 6, LW: 7, RW: 8, ST: 9, "": 10 };
        const sortFn = (a, b) => (ORDER[posOf(a).main || ""] - ORDER[posOf(b).main || ""]) || (ratingOf(b) - ratingOf(a));
        const mk = m => ({
          id: m.id,
          // Con số cạnh tên trong danh sách chờ là để ĐỌC, nên nó đi qua cửa
          // chung; thứ tự sắp ở `sortFn` mới là chỗ được phép mượn điểm cũ.
          num: m.num || "-", name: m.name, rating: ratingView(m).score,
          posTag: posOf(m).main || "-",
          posColor: LINE_TONE[lineOf(m)] || "rgba(250,250,255,0.62)",
          rowBg: st.picked === m.id ? "rgba(104,33,220,0.3)" : "transparent",
          rowRing: st.picked === m.id ? "rgba(177,129,255,0.6)" : "transparent",

          pick: () => { if (this.lpAte()) return; this.setState(s => ({ picked: s.picked === m.id ? null : m.id })); },
          menu: e => this.openCtx(e, m.name, poolCtx(m)),
          pressStart: e => { this.lpStart(e, m.name, poolCtx(m)); this.pdStart(e, m.id); },
          pressEnd: () => this.lpEnd(),
          // The one visible button on a squad row used to mean "add to bench",
          // so getting someone onto the pitch took two hops through a card the
          // captain did not ask for. Put them on if there is room -- that is what
          // the button looks like it does -- and fall back to the bench only when
          // the XI is full. The bench route stays on right-click.
          toBench: guard(e => {
            if (e && e.stopPropagation) e.stopPropagation();
            if (addTarget(slots) === "pitch") { this.assign(bestFreeSlot(slots, SLOT_ROLES, posOf(m), FM_.labels), m.id); return; }
            this.setState(s => {
              const list = benchOf(s.benchByTeam, slotKey, sideKey).concat([m.id]);
              const benchByTeam = { ...s.benchByTeam, [slotKey]: list };
              this.persist({ benchByTeam });
              return { benchByTeam, picked: null, copied: "Sân đủ người - " + m.name + " vào dự bị." };
            });
          }),
          // Nhan doc duoc thay cho dau "+" cam: nut noi truoc no se lam gi.
          addLabel: addTarget(slots) === "pitch" ? "Vào sân" : "Vào dự bị",
          addHint: addTarget(slots) === "pitch" ? "Cho ra sân" : "Sân đủ người - thêm vào dự bị"
        });
        /* Ba nhóm gập được thành một bảng phẳng, giống bảng cầu thủ của FM26.

           Nhóm gập giấu người: đo được 34 người nằm sau một mũi tên đang đóng,
           và để tìm một người phải đoán xem họ ở nhóm nào trước. Trạng thái
           điểm danh giờ là một cột chấm màu trong cùng một bảng, sắp đi-đá lên trước. */
        // Ai chắc chắn đi lên trước, rồi chưa chắc, rồi chưa trả lời, cuối cùng
        // là người đã báo vắng — thứ tự đúng bằng thứ tự đội trưởng gọi tên.
        const POOL_ORDER = ["yes", "maybe", "none", "no"];
        const RANK = m => POOL_ORDER.indexOf(attState(att[m.id]));
        return rest.slice().sort((a, b) => (RANK(a) - RANK(b)) || sortFn(a, b)).map(m => {
          const k2 = attState(att[m.id]);
          // Cot diem danh cua bang chon nguoi noi luon "Chan thuong" -- day la
          // cho doi truong quet mat de goi ten, no phai thay truoc khi keo.
          const hu = hurtOf(m);
          return { ...mk(m),
            attDot: hu ? "#FF6B57" : (k2 === "none" ? "rgba(250,250,255,0.28)" : ATT_COLOR[k2]),
            attLabel: hu ? "Chấn thương" : ATT_LABEL[k2],
            attColor: hu ? "#FF6B57" : (k2 === "none" ? "rgba(250,250,255,0.62)" : ATT_COLOR[k2]) };
        });
      })(),
      /* Bang CA DOI, giong cot danh sach cua FM26 ben canh san: da chinh (kem ma
         o dang giu) -> du bi -> con lai. Truoc day the "DANH SACH" chi liet ke
         NGUOI CON LAI, nen muon doi mot nguoi phai nho xem ai dang o dau roi
         nhay qua lai giua ba tab. Mot bang, mot cai nhin, mot nut cho moi hang. */
      squadRows: (() => {
        const benchIds = benchOf(st.benchByTeam, slotKey, sideKey);
        /* Nho lai: `readyTag` duyet ca danh sach tran cho MOI nguoi, goi bon lan
           mot hang tren mot doi ba muoi sau nguoi la bon lan duyet thua. */
        const rdyMemo = {};
        const rdy = m => (rdyMemo[m.id] || (rdyMemo[m.id] = readyTag(m, teamMatches, todayDmy)));
        const row = (m, zone, slotIdx) => {
          const k2 = attState(att[m.id]);
          const inPitch = zone === "xi";
          return {
            id: m.id,
            num: m.num || "-", name: m.name, rating: ratingView(m).score,
            /* MOT cot cho "dang o dau", khong phai hai. Tren dien thoai hai cot
               (o dang giu + vi tri so truong) an het cho cua ten -- do duoc
               "Hoang Tien Dung" bi cat con 86px trong khi can 108px. Gop lai:
               da chinh ghi ma o va them "·CB" khi so truong khac ma o; du bi
               ghi "DB · LW"; con lai chi ghi vi tri so truong. */
            whereTag: (() => {
              const nat = posOf(m).main || "";
              if (inPitch) {
                const slot = FM_.labels[slotIdx] || "";
                return slot + (nat && nat !== slot ? "·" + nat : "");
              }
              if (otherUsed[m.id]) return otherSideName;   // dang o ben kia
              return (zone === "bench" ? "DB" + (nat ? " · " + nat : "") : nat);
            })(),
            whereColor: inPitch ? "#C1D439" : (otherUsed[m.id] ? "#F79009" : (zone === "bench" ? "rgba(250,250,255,0.72)" : (LINE_TONE[lineOf(m)] || "rgba(250,250,255,0.6)"))),
            rowBg: st.picked === m.id ? "rgba(104,33,220,0.3)" : "transparent",
            rowRing: st.picked === m.id ? "rgba(177,129,255,0.6)" : "transparent",
            attDot: hurtOf(m) ? "#FF6B57" : (k2 === "none" ? "rgba(250,250,255,0.28)" : ATT_COLOR[k2]),
            attLabel: hurtOf(m) ? "Chấn thương" : ATT_LABEL[k2],
            /* Chon ai da ma khong thay ai ghi may ban thi dang chon bang cam
               tinh. So co san trong ho so tu lau, chi la chua cho nao doc len.
               0 hien "—": mot cot toan so 0 doc nhu du lieu hong. */
            pGames: statCell(m.games),
            pGoals: statCell(m.goals),
            pAssists: statCell(m.assists),
            /* MVP va the: hai truong nay da nam trong ho so tu lau va KHONG rong --
               5/14 nguoi co mvp, 8/14 co the vang, mot nguoi co the do. Bang chua he
               doc len: quet ca man, chu "MVP"/"the" xuat hien 0 lan. The do la thu
               anh huong thang toi viec xep ai da chinh, ma no dang bi giau. */
            pMvp: statCell(m.mvp),
            cardY: (() => { const v = parseFloat(m.y); return isFinite(v) && v > 0 ? String(Math.round(v)) : ""; })(),
            cardR: (() => { const v = parseFloat(m.r); return isFinite(v) && v > 0 ? String(Math.round(v)) : ""; })(),
            hasCardY: (() => { const v = parseFloat(m.y); return isFinite(v) && v > 0; })(),
            hasCardR: (() => { const v = parseFloat(m.r); return isFinite(v) && v > 0; })(),
            attColor: hurtOf(m) ? "#FF6B57" : (k2 === "none" ? "rgba(250,250,255,0.62)" : ATT_COLOR[k2]),
            /* O TRONG khi chua ai tra loi. Truoc do bang in "Chua tra loi" 14 lan
               tren 14 hang -- cung mot cau, khong hang nao khac hang nao, tuc no
               khong phan biet duoc ai voi ai. Cham mau o dau hang da noi dieu do
               (rong = chua tra loi) va no mang `title`, nen chu chi lap lai cham.
               Chi cau tra loi THAT moi duoc lay muc: Di / Vang / Chua chac /
               Chan thuong. Cot van con, tieu de van con. */
            attCell: (hurtOf(m) || k2 !== "none") ? (hurtOf(m) ? "Chấn thương" : ATT_LABEL[k2]) : "",
            /* Y het nhu tren: "San sang" la trang thai binh thuong, in no 8/14 lan
               thi ba canh bao that ("Da 4 buoi lien") chim giua tam dong xam giong
               het nhau. Binh thuong thi im; chi cai bat thuong moi len tieng. */
            readyCell: rdy(m).key === "ready" ? "" : rdy(m).label,
            /* Cot SAN SANG -- dung cho Football Manager dat bon cot INF/CON/SHP/MO.
               Mot cot THAT con hon bon cot trong do ba cot bia; xem `readyTag`. */
            readyLabel: rdy(m).label, readyColor: rdy(m).color, readyTip: rdy(m).tip,
            readyDim: rdy(m).key === "ready" ? "0.55" : "1",
            pick: () => { if (this.lpAte()) return; this.setState(s2 => ({ picked: s2.picked === m.id ? null : m.id })); },
            menu: e => this.openCtx(e, m.name, poolCtx(m)),
            pressStart: e => { this.lpStart(e, m.name, poolCtx(m)); this.pdStart(e, m.id); },
            pressEnd: () => this.lpEnd(),
            /* "Ra sân" trong tiếng Việt nghĩa là RA SÂN ĐÁ. Nút này lại gỡ người
               khỏi đội hình, và chính lời báo của app ghi đúng: "Đã đưa X ra dự
               bị". Nhãn nói ngược với việc nó làm. */
            actLabel: inPitch ? "Về dự bị" : "Vào sân",
            actTone: inPitch ? "rgba(236,46,26,0.14)" : "rgba(193,212,57,0.14)",
            /* Do duoc: #EC2E1A tren nen o do (rgb 60,37,47) chi ra 3,32:1 o co 13px,
               duoi nguong AA 4,5:1 -- ma chu nay nam tren 7/14 hang. Sang hon mot bac
               thanh 5,00:1. Chi doi rieng nut nay, khong doi ma mau canh bao chung. */
            actFg: inPitch ? "#FF6B57" : "#C1D439",
            act: guard(e => {
              if (e && e.stopPropagation) e.stopPropagation();
              if (inPitch) { this.benchOut(slotIdx); return; }
              const free = bestFreeSlot(slots, SLOT_ROLES, posOf(m), FM_.labels);
              if (free < 0) { this.setState({ picked: m.id, copied: "Sân đủ " + SLOT_ROLES.length + " người - bấm một ô trên sân để thay." }); return; }
              this.assign(free, m.id);
            })
          };
        };
        const xi = slots.map((id, i) => (id ? [byId(id), i] : null)).filter(x => x && x[0])
          .map(x => row(x[0], "xi", x[1]));
        const bench = benchIds.map(id => byId(id)).filter(m => m && slots.indexOf(m.id) < 0)
          .map(m => row(m, "bench", -1));
        const restIds = {};
        xi.concat(bench).forEach(r => { restIds[r.id] = 1; });
        const POOL_ORDER2 = ["yes", "maybe", "none", "no"];
        const rest = active.filter(m => !restIds[m.id])
          .slice().sort((a, b) => (POOL_ORDER2.indexOf(attState(att[a.id])) - POOL_ORDER2.indexOf(attState(att[b.id])))
            || (ratingOf(b) - ratingOf(a)))
          .map(m => row(m, "pool", -1));
        return xi.concat(bench, rest);
      })(),
      squadCount: (() => {
        const onN = slots.filter(Boolean).length;
        const bN = benchOf(st.benchByTeam, slotKey, sideKey).filter(id => slots.indexOf(id) < 0).length;
        return onN + " đá chính · " + bN + " dự bị · " + Math.max(0, active.length - onN - bN) + " còn lại";
      })(),
      /* Cau "bam mot dong roi bam vi tri - keo nguoi tu DANH SACH vao day" nam
         ngay canh chu DU BI va trong het nhu mot cai nut; nguoi thu app bam thang
         vao no. Gio no chi hien khi da chon nguoi (luc do no la mot chi dan that),
         con them nguoi vao du bi co nut rieng ngay tren bang ghe. */
      hasPick: !!st.picked,
      hintText: st.picked ? ("Đã chọn " + byId(st.picked).name + " - bấm vị trí trên sân") : "",
      // Mot che do chiem quyen ca man hinh ma khong co duong ra la cai bay.
      // Ba loi thoat: nut nay, phim Esc (componentDidMount), va bam lai dong do.
      clearPick: () => this.setState({ picked: null }),
      benchAdd: guard(e => {
        const rows = this.renderVals().poolRows;
        if (!rows.length) { this.setState({ copied: "Cả đội đã ra sân hoặc vào dự bị." }); return; }
        this.openCtx(e, "Thêm vào dự bị", rows.map(r => ({
          label: r.name, hint: r.posTag + " · " + r.attLabel,
          click: () => this.renderVals().dropToBench(r.id)
        })));
      }),
      instructions: [
        { key: "line", label: "Dâng cao", opts: [["low", "Thấp"], ["mid", "Vừa"], ["high", "Cao"]], def: "mid" },
        { key: "tempo", label: "Nhịp độ", opts: [["slow", "Chậm"], ["mid", "Vừa"], ["fast", "Nhanh"]], def: "mid" },
        { key: "press", label: "Áp sát", opts: [["low", "Ít"], ["mid", "Vừa"], ["high", "Nhiều"]], def: "mid" },
        { key: "mark", label: "Phòng ngự", opts: [["zone", "Khu vực"], ["man", "Kèm người"]], def: "zone" }
      ].map(row => {
        const cur = ((actTactic && actTactic.ins) || {})[row.key] || row.def;
        return {
          label: row.label,
          opts: row.opts.map(o => ({
            label: o[1],
            cursor: "default",
            bg: cur === o[0] ? "rgba(104,33,220,0.35)" : "rgba(255,255,255,0.04)",
            fg: cur === o[0] ? "#FAFAFF" : "rgba(250,250,255,0.68)",
            line: cur === o[0] ? "rgba(177,129,255,0.55)" : "rgba(255,255,255,0.06)",
            click: () => {}
          }))
        };
      }),
      gotoStats: () => this.setState({ tab: "members", memberView: "stats", sel: null }),
      gotoFund: () => this.setState({ tab: "fund", teamView: "fund", sel: null }),
      formationLabel: effFormation,
      activeTacticName: actTactic ? actTactic.name : "Sân 7 · cân bằng (mặc định)",
      activeTacticMeta: actTactic
        ? ("Sân " + actTactic.size + " · " + actTactic.formation + " · " + ({ def: "phòng ngự", bal: "cân bằng", att: "tấn công" }[actTactic.mentality || "bal"]) + " · dâng " + ({ low: "thấp", mid: "vừa", high: "cao" }[(actTactic.ins || {}).line || "mid"]) + " · áp sát " + ({ low: "ít", mid: "vừa", high: "nhiều" }[(actTactic.ins || {}).press || "mid"]))
        : "chưa tạo chiến thuật - bấm Đổi để tạo",

      captainOptions: slots.filter(Boolean).map(id => byId(id)).filter(Boolean).map(m => ({ value: String(m.id), label: (m.num ? "#" + m.num + " " : "") + m.name })),
      captainId: String((slots.indexOf((st.captainByTeam || {})[sideKey]) >= 0 ? (st.captainByTeam || {})[sideKey] : "") || ""),
      setCaptain: guard(e => { const v = e.target.value; this.setState(s => { const captainByTeam = { ...s.captainByTeam, [sideKey]: v ? parseInt(v, 10) : null }; this.persist({ captainByTeam }); return { captainByTeam }; }); }),
      /* Dai so lieu tren dau san. Moi o mang san mot lop: CSS man hep bo bot o
         theo Y NGHIA (`lstat-slim` = diem so, doc duoc o tab Danh sach), khong
         theo VI TRI. Rule cu la `nth-child(2), nth-child(3)` -- them mot o vao
         dau danh sach la no giau nham o khac, va da giau nham that: o "DA NHAN"
         vua them bien mat con o "TB" vua bo lai hien ra. */
      lineupStats: (() => {
        const on = slots.filter(Boolean).map(id => byId(id)).filter(Boolean);
        /* TỔNG và TB là hai con số ĐỂ ĐỌC. Cộng cả người chưa ai chấm vào là
           cộng điểm cũ suy từ hạng gõ tay, nên một đội hình toàn người chưa
           chấm vẫn ra "TỔNG 70 · TB 10" trông như một phép đo. Chỉ cộng người
           đã chấm, và nói ra còn bao nhiêu người chưa — cùng kiểu với ô CHƯA RÕ
           ngay bên cạnh, chỗ đội hình đã quen nói ra cái nó không biết. */
        const onRated = on.filter(m => ratingView(m).rated);
        const total = onRated.reduce((a, m) => a + ratingOf(m), 0);
        const onAvg = ratedSquadAvg(on);
        const off = on.filter((m, i) => {
          const idx = slots.indexOf(m.id);
          const role = SLOT_ROLES[idx];
          const p = posOf(m);
          return p.main && LINE_OF[p.main] !== role && !p.alt.some(x => LINE_OF[x] === role);
        }).length;
        /* LỆCH vốn đã đúng: nó guard `p.main &&` nên chưa bao giờ đếm người chưa có
           vị trí. Cái thiếu là nói ra có bao nhiêu người app không biết gì — việc phải
           làm ở đó là điền hồ sơ, không phải đổi chỗ. Chỉ hiện khi có, để đội hình sạch
           không phải mang thêm một số 0. */
        const unk = on.filter(m => fitUnknown(posOf(m))).length;
        return [
          { cls: "lstat", label: "XẾP", value: on.length + "/" + SLOT_ROLES.length, color: on.length === SLOT_ROLES.length ? "#75CE50" : "#F79009" }
        ].concat(hasOcc ? [(() => {
          /* Con so quyet dinh tran co da duoc hay khong la SO NGUOI DA NHAN, va no
             nam o mot tab khac. "XEP 7/7" mau xanh doc nhu da xong viec, trong khi
             ca bay nguoi co the chua ai tra loi. Dat ngay sau XEP: doc truoc moi
             thu con lai. */
          const yes = on.filter(m => attState(att[m.id]) === "yes").length;
          return { cls: "lstat", label: "ĐÃ NHẬN", value: yes + "/" + on.length,
                   color: yes === on.length && on.length ? "#75CE50" : (yes ? "#F79009" : "#FF6B57") };
        })()] : []).concat(hasOcc && on.some(m => attState(att[m.id]) === "no") ? [(() => {
          /* Nguoi da bam "Khong di" ma van dung trong doi hinh la loi CHAC CHAN,
             khac han LECH TUYEN (mot chuyen chien thuat, co the co y). Truoc day
             no chi duoc bao bang mot cham do 6px tren o. Chi hien khi that su co
             nguoi nhu vay -- doi hinh sach khong phai mang them mot so 0. */
          const no = on.filter(m => attState(att[m.id]) === "no").length;
          return { cls: "lstat", label: "BÁO VẮNG", value: String(no), color: "#FF6B57" };
        })()] : []).concat([
          { cls: "lstat lstat-slim", label: "TỔNG", value: onRated.length ? String(total) : "—", color: "#C1D439" },
          { cls: "lstat lstat-slim", label: "TB", value: onAvg == null ? "—" : String(onAvg), color: "#FAFAFF" },
          /* AN Y -- doc lai chinh cai app da ve tren san, thanh mot con so.

             Vien quanh moi o da noi ba muc tu lau: trang = so truong, cam = da
             duoc, do = lech tuyen. Nhung ba muc do chi doc duoc bang cach nhin
             tung o mot; khong co cho nao noi "ca doi hinh nay khop den dau".
             LECH TUYEN dem duoc nguoi hong nhung khong phan biet "da duoc" voi
             "dung cho", nen mot doi hinh toan nguoi da-duoc va mot doi hinh toan
             nguoi so-truong deu ra "LECH TUYEN 0".

             Thang 10 vi do la thang nguoi choi bong quen doc. Nguoi chua ro vi
             tri KHONG duoc tinh (khong phai cho 0 diem -- app khong biet, chu
             khong phai ho khong hop), va so nguoi bi bo ra da nam san o o CHUA RO
             ngay ben canh. */
          (() => {
            const scored = on.map(m => {
              const idx = slots.indexOf(m.id);
              const role = SLOT_ROLES[idx];
              const p = posOf(m);
              if (!p.main) return null;
              if (LINE_OF[p.main] === role) return 10;
              if (p.alt.some(x => LINE_OF[x] === role)) return 7;
              return 3;
            }).filter(v => v != null);
            if (!scored.length) return { cls: "lstat lstat-slim", label: "ĂN Ý", value: "—", color: "rgba(250,250,255,0.68)" };
            const avg = scored.reduce((x, v) => x + v, 0) / scored.length;
            const one = Math.round(avg * 10) / 10;
            return { cls: "lstat lstat-slim", label: "ĂN Ý",
                     value: String(one).replace(".", ",") + "/10",
                     color: one >= 9 ? "#75CE50" : (one >= 7 ? "#C1D439" : (one >= 5 ? "#F79009" : "#FF6B57")) };
          })(),
          { cls: "lstat", label: "LỆCH TUYẾN", value: String(off), color: off ? "#FF6B57" : "rgba(250,250,255,0.68)" }
        ].concat(unk ? [{ cls: "lstat lstat-slim", label: "CHƯA RÕ", value: String(unk), color: "rgba(250,250,255,0.68)" }] : [])
         .concat(on.length > onRated.length
           ? [{ cls: "lstat lstat-slim", label: "CHƯA CHẤM", value: String(on.length - onRated.length), color: "rgba(250,250,255,0.68)" }] : []));
      })(),
      copyLineup: () => {
        const men = { def: "Phòng ngự", bal: "Cân bằng", att: "Tấn công" }[(actTactic && actTactic.mentality) || "bal"];
        /* `bench` la "moi nguoi khong o tren san" -- ke ca nguoi chua duoc goi.
           Dem no ra "Du bi: 7 nguoi" trong khi bang ghe tren man ghi 4. Dem dung
           bang ghe. */
        const noAns = hasOcc ? slots.filter(Boolean).concat(benchOf(st.benchByTeam, slotKey, sideKey)).filter(id => attState(att[id]) === "none").length : 0;
        const benchReal = benchOf(st.benchByTeam, slotKey, sideKey)
          .map(id => byId(id)).filter(m2 => m2 && slots.indexOf(m2.id) < 0);
        const cap = byId((st.captainByTeam || {})[sideKey]);
        /* Tin nhan nay la thu DUY NHAT 13 nguoi con lai nhin thay. Truoc day no
           bo qua diem danh: mot nguoi da bam "Khong di" van duoc doc len nhu dang
           da chinh, khong mot chu nao. Man hinh canh bao dung ("BAO VANG 1") roi
           gui di mot ban khac han. Ghi ngay canh ten. */
        const attNote = m2 => {
          const k = attState(att[m2.id]);
          // "Chua tra loi" lap tren 11 dong lien tiep thi thanh nhieu; no di
          // xuong mot dong tong o cuoi tin nhan.
          return k === "no" ? " (BÁO VẮNG)" : (k === "maybe" ? " (chưa chắc)" : "");
        };
        const lines = SLOT_ROLES.map((role, i) => {
          const m = slots[i] ? byId(slots[i]) : null;
          return role + ": " + (m ? ((m.num ? "#" + m.num + " " : "") + m.name + (cap && cap.id === m.id ? " (C)" : "") + attNote(m)) : "-");
        });
        const nx = curOccObj ? (DAY_VN[curOccObj.d.getDay()] + " " + curOccObj.d.getDate() + "/" + (curOccObj.d.getMonth() + 1) + " " + curOccObj.e.time + " · " + (curOccObj.e.place || "chưa có sân")) : "chưa có lịch";
        const t0 = (actTactic && actTactic.ins) || {};
        const insTxt = "Chỉ đạo: dâng " + ({low:"thấp",mid:"vừa",high:"cao"}[t0.line || "mid"]) + " · nhịp " + ({slow:"chậm",mid:"vừa",fast:"nhanh"}[t0.tempo || "mid"]) + " · áp sát " + ({low:"ít",mid:"vừa",high:"nhiều"}[t0.press || "mid"]) + " · " + (t0.mark === "man" ? "kèm người" : "khu vực");
        const txt = [team.name + " · sơ đồ " + effFormation + " · " + men, nx, insTxt, ""]
          .concat(lines)
          .concat(["", "Dự bị: " + benchReal.length + " người"
            + (benchReal.length ? " — " + benchReal.map(m2 => m2.name + attNote(m2)).join(", ") : "")]
            .concat(noAns ? ["Chưa trả lời: " + noAns + " người"] : []))
          .join(String.fromCharCode(10));
        /* Tren dien thoai, navigator.share mo thang bang chia se cua he dieu hanh
           -- cham mot cai la vao Zalo hoac Messenger. Copy vao bo nho tam thi con
           phai tu mo app, tu tim nhom, tu dan. Doi phui chot doi hinh trong nhom
           chat chu khong phai trong app, nen day moi la duong di that.
           Khong co navigator.share (may tinh, hoac trinh duyet cu) thi quay ve
           copy nhu cu -- khong mat gi. */
        if (typeof navigator !== "undefined" && navigator.share) {
          Promise.resolve(navigator.share({ text: txt })).catch(() => {});
          this.setState({ copied: "Đang mở bảng chia sẻ…" });
          return;
        }
        this.copyText(txt);
        this.setState({ copied: "Đã copy đội hình - dán vào group Zalo." });
      },
      formations: Object.keys(FORMATIONS).map(k => ({
        label: k,
        bg: st.formation === k ? "#6821DC" : "#121526",
        fg: st.formation === k ? "#FAFAFF" : "rgba(250,250,255,0.6)",
        line: st.formation === k ? "#6821DC" : "rgba(255,255,255,0.08)",
        click: guard(() => this.setState({ formation: k, lineupMsg: "Đã đổi sơ đồ " + k + "." }))
      })),
      kitColor: kit,
      kitLabel: kitSide === "home" ? "Áo sân nhà" : "Áo sân khách",
      homeColor: this.home(), awayColor: this.away(),
      toggleKit: guard(() => this.setState(s => { const kitv = kitSide === "home" ? "away" : "home"; const kitByTeam = { ...s.kitByTeam, [sideKey]: kitv }; this.persist({ kitByTeam }); return { kitByTeam }; })),
      autoFill: guard(e => {
        const N = SLOT_ROLES.length;
        /* Ba chỗ hỏng của nút này, sửa cùng lúc.

           Một: nó bốc từ `att[id] !== "no"`, mà người chưa trả lời có `att[id]` là
           undefined nên lọt vào — chín người nhận đi, hai bảy người im lặng, nó xếp
           từ cả ba sáu. Hàm chia đội ngay dưới nó lọc đúng.

           Hai: nó xóa sạch những ai đội trưởng đã cố tình xếp. Giờ ô đã có người là
           khóa, nó chỉ lấp chỗ trống.

           Ba: nó tính điểm cho từng người ở từng ô rồi vứt điểm đi, nên không nói được
           vì sao chọn ai. Đề xuất giải thích được thì mới có người tin. */
        /* Bon: no dem O DA CO NGUOI, khong dem NGUOI CON DUNG. Nen dung cai dem
           duy nhat no sinh ra de ton tai -- ba nguoi bao vang chieu thu Ba -- no tu
           choi ("San du nguoi roi"), va duong duy nhat con lai la xoa sach ca bon
           o van con dung. O nao dang giu mot nguoi DA BAO VANG thi coi nhu o trong;
           nguoi do ve bang ghe chu khong bien mat. */
        /* O dang giu mot nguoi DA BAO VANG hoac DANG CHAN THUONG thi coi nhu o
           trong -- nguoi do ve bang ghe chu khong bien mat. Truoc do chi kiem
           bao vang, nen mot nguoi chan thuong da nam san tu truoc van dung do
           sau khi bam Tu dong: co bao ai ra dau, ma app thi biet ro. */
        /* Nguoi CHUA TRA LOI dang dung san cung phai nhuong cho nguoi DA NHAN DI.

           Do la ca cong viec cua nut nay, va no khong lam. Chay thu mot tuan
           that: bay nguoi bam "Toi di", san van la doi hinh mau cu -- hai nguoi
           tren san chua tra loi (Long, Trung) trong khi hai nguoi da nhan di
           ngoi ngoai (Khoi, Tung). Bam "Tu dong" ra: "San du nguoi roi, khong ai
           bao vang." Dung tung chu (chi co nguoi BAO VANG moi bi day ra) va vo
           dung voi viec doi truong dang lam. Anh ta phai tu doan rang minh phai
           bam "Xoa het" truoc.

           Nguoi bao vang / chan thuong thi LUON bi day ra, ke ca khong ai thay
           -- de yen la noi doi ve doi hinh. Nguoi chua tra loi / chua chac chi
           bi day ra khi CO nguoi da nhan di de thay: dem dung so suat, uu tien
           day nguoi chua tra loi truoc nguoi chua chac. Khong bao gio de lai mot
           o trong chi de duoi mot nguoi im lang. */
        const outVang = slots.map((id, i2) => (id && (attState(att[id]) === "no" || hurtOf(byId(id)))) ? i2 : -1).filter(i2 => i2 >= 0);
        const readyOut = active.filter(m => attGoing(att[m.id]) && slots.indexOf(m.id) < 0 && !otherUsed[m.id] && !hurtOf(m)).length;
        const emptyNow = slots.filter(x => !x).length;
        let budget = Math.max(0, readyOut - emptyNow - outVang.length);
        const softIdx = [];
        ["none", "maybe"].forEach(k2 => slots.forEach((id, i2) => {
          if (budget > 0 && id && outVang.indexOf(i2) < 0 && attState(att[id]) === k2) { softIdx.push(i2); budget--; }
        }));
        const outIdx = outVang.concat(softIdx);
        const placed = slots.filter((id, i2) => id && outIdx.indexOf(i2) < 0);
        // Da noi bo: khong bao gio TU DONG lay nguoi ben kia dang dung.
        // Nguoi dang chan thuong khong bao gio duoc TU DONG xep -- doi truong
        // van keo tay duoc neu anh ta biet ro hon app.
        const pool = active.filter(m => attGoing(att[m.id]) && placed.indexOf(m.id) < 0 && !otherUsed[m.id] && !hurtOf(m));
        const empties = slots.map((id, i2) => (!id || outIdx.indexOf(i2) >= 0) ? i2 : -1).filter(i2 => i2 >= 0);
        // Loi bao tung chi toi mot nut ten "Xep lai tu dau" -- khong ton tai o dau
        // trong app. Nut that la "Xoa het" (va "Xep giup toi" khi san da trong).
        /* Cau cu khang dinh "khong ai bao vang" trong khi dai ngay tren dau man
           ghi "BAO VANG 1" -- no dinh noi "khong ai bao vang DANG DUNG TREN SAN",
           nhung viet ra thanh mot cau ve ca doi. Noi dung pham vi. */
        if (!empties.length) {
          const chuaTraLoi = slots.filter(id => id && attState(att[id]) === "none").length;
          const doiNgoai = active.filter(m => attGoing(att[m.id]) && slots.indexOf(m.id) < 0 && !otherUsed[m.id] && !hurtOf(m)).length;
          if (chuaTraLoi && !doiNgoai) {
            this.setState({ lineupMsg: "Sân đủ người, nhưng " + chuaTraLoi + " người trên sân chưa trả lời và không còn ai đã nhận đi để thay. Nhắc họ điểm danh." });
            return;
          }
          const outAll = active.filter(m => attState(att[m.id]) === "no").length;
          this.setState({ lineupMsg: outAll
            ? ("Sân đủ người rồi — " + outAll + " người báo vắng không ai đang ở trên sân. Bấm \"Xoá hết\" nếu muốn xếp lại.")
            : "Sân đủ người rồi, không ai báo vắng — bấm \"Xoá hết\" nếu muốn xếp lại." });
          return;
        }
        /* Khong con ai de xep KHONG co nghia la de nguyen nguoi bao vang hay
           nguoi chan thuong dung tren san. Truoc do ham thoat som o day, nen
           mot nguoi chan thuong da nam san van dung nguyen do sau khi bam Tu
           dong -- va no la cai duy nhat doi truong bam. Don o truoc, roi moi
           noi la khong co ai thay. */
        if (!pool.length && outIdx.length) {
          const cleared = slots.map((id, i2) => outIdx.indexOf(i2) >= 0 ? null : id);
          const gone = outIdx.map(i2 => slots[i2]);
          this.setState(s => {
            const useOcc = curOcc !== "none";
            const out = useOcc ? { slotsByOcc: { ...s.slotsByOcc, [slotKey]: cleared } } : { slotsByTeam: { ...s.slotsByTeam, [teamId]: cleared } };
            const b = benchOf(s.benchByTeam, slotKey, sideKey).slice();
            gone.forEach(id => { if (id && b.indexOf(id) < 0) b.push(id); });
            out.benchByTeam = { ...s.benchByTeam, [slotKey]: b };
            this.persist(out);
            return { ...out, picked: null,
              lineupMsg: "Đã đưa " + gone.length + " người báo vắng hoặc đang chấn thương về băng ghế. Không còn ai đã nhận đi để thay vào." };
          });
          return;
        }
        if (!pool.length) {
          /* Da noi bo: het nguoi de xep KHONG dong nghia voi chua ai nhan di.
             Bay nguoi nhan di ma ca bay dang o Doi A thi Doi B khong con ai --
             cau cu bao "Chua ai nhan di buoi nay. Nhac ca doi diem danh truoc
             da." trong khi ngay tren dau man bang chu to la "7 nhan · san 7 ·
             vua du". Doi truong doc hai cau do canh nhau khong biet tin cau nao.
             Dem rieng nguoi bi ben kia giu de noi dung ly do. */
          const heldByOther = active.filter(m => attGoing(att[m.id]) && otherUsed[m.id]).length;
          this.setState({ lineupMsg: placed.length
            ? "Không còn ai đã nhận đi để xếp thêm."
            : heldByOther
              ? (heldByOther + " người đã nhận đi đều đang ở " + (this._otherSideName || "đội bên kia")
                 + ". Bỏ bớt bên đó rồi xếp lại, hoặc kéo thẳng người sang đây.")
              : "" });
          /* Ngo cut: day la nut TO NHAT cua man, va tren chinh doi mau cua app no
             luon tra ve "Chua ai nhan di buoi nay" -- vi doi mau co attendByOcc
             rong. Duong thoat (chuot phai tung dong -> "Diem danh: Di", 2 bam x
             14 nguoi = 28) khong co dau hieu nao chi ra.
             Nay dua thang loi thoat ra: mot bam danh dau ca doi di. Spond khong
             lam duoc chuyen nay -- default response status cua ho chi dat duoc
             luc TAO event, khong sua sau. */
          if (!placed.length && !heldByOther) {
            this.openCtx(e, "Chưa ai nhận đi buổi này", [
              { label: "Đánh dấu cả đội đi (" + active.length + " người)", tone: "act",
                click: () => this.setState(s2 => {
                  const cur = { ...((s2.attendByOcc || {})[curOcc] || {}) };
                  active.forEach(m2 => { if (!cur[m2.id]) cur[m2.id] = "yes"; });
                  const attendByOcc = { ...s2.attendByOcc, [curOcc]: cur };
                  this.persist({ attendByOcc });
                  return { attendByOcc, copied: "Đã đánh dấu " + active.length + " người đi. Bấm lại Xếp giúp tôi." };
                }) },
              { label: "Để tôi tự điểm danh", click: () => this.setState({ tab: "overview" }) }
            ]);
          }
          return;
        }
        const tiredMemo = {};
        const restOf = id => (tiredMemo[id] || (tiredMemo[id] = readiness(id, teamMatches)));
        const score = (p, i2) => {
          const role = SLOT_ROLES[i2];
          const label2 = FM_.labels[i2];
          const core = p.type === "Đá cứng" ? 2 : 0;
          return p.rating * 2 + core - fitCostAt(posOf(p), label2) * 4 - restPenalty(restOf(p.id));
        };
        const pairs = [];
        pool.forEach(p => empties.forEach(i2 => pairs.push({ id: p.id, i: i2, s: score(p, i2) })));
        pairs.sort((a, b) => b.s - a.s);
        const slots2 = slots.map((id, i2) => outIdx.indexOf(i2) >= 0 ? null : id);
        const taken = {};
        pairs.forEach(pr => { if (slots2[pr.i] == null && !taken[pr.id]) { slots2[pr.i] = pr.id; taken[pr.id] = 1; } });
        const byIdLocal = id => pool.find(p => p.id === id);
        // Đổi chỗ hai người nếu tổng điểm tốt lên — chỉ giữa các ô vừa lấp, không đụng ô khóa.
        for (let pass = 0; pass < 3; pass++) {
          for (let a = 0; a < empties.length; a++) for (let b = a + 1; b < empties.length; b++) {
            const ia = empties[a], ib = empties[b];
            const pa = slots2[ia] && byIdLocal(slots2[ia]), pb = slots2[ib] && byIdLocal(slots2[ib]);
            if (!pa || !pb) continue;
            if (score(pa, ib) + score(pb, ia) > score(pa, ia) + score(pb, ib)) {
              const t = slots2[ia]; slots2[ia] = slots2[ib]; slots2[ib] = t;
            }
          }
        }
        // Lý do cho từng ô nó vừa xếp. `posOf` là bắt buộc: fitCost nhận {main, alt} đã
        // parse, truyền thẳng member vào thì `.main` là undefined nên mọi người đều bị
        // đếm là trái tuyến — dòng tổng kết cũ luôn nói sai vì thiếu đúng chỗ này.
        const why = [];
        let off = 0;
        empties.forEach(i2 => {
          const id = slots2[i2]; if (!id) return;
          const p = byIdLocal(id); if (!p) return;
          const pp = posOf(p);
          const unk = fitUnknown(pp);
          const c = fitCostAt(pp, FM_.labels[i2]), sd2 = sideCost(pp, FM_.labels[i2]);
          if (c > 3 && !unk) off++;
          // Van xep nguoi met thi phai NOI RA o dong ly do, khong im lang.
          const rr = restOf(p.id);
          /* `p.rating` la TRUONG CU go tay, khong phai diem app tinh tu 12 chi so.
             Bang CA DOI in `ratingView().score`, dong nay in `p.rating` -- cung mot
             nguoi ra hai con so, cung deo mot chu "diem". Doc canh nhau thi mot
             trong hai la sai, va khong cach nao biet cai nao.
             Them ca chu "danh gia" de phan biet voi DIEM HOP VAI TRO in tren o
             cau thu -- do la dai luong thu ba, cung bi goi la "diem". */
          why.push(SLOT_NAMES[i2] + " — " + p.name + ": " + fitLabel(c, unk, sd2)
            + ", điểm đánh giá " + ratingView(p).score
            + (rr && rr.tired ? " · đá " + rr.streak + " buổi liền" : ""));
        });
        const filled = slots2.filter(Boolean).length;
        const short = filled < N ? " · thiếu " + (N - filled) + " người đã nhận đi" : "";
        const swapped = outIdx.length
          ? (" · thay " + outIdx.length + " người"
             + (outVang.length && softIdx.length ? " (báo vắng/chấn thương và chưa trả lời)"
                : softIdx.length ? " chưa trả lời bằng người đã nhận đi"
                : " báo vắng hoặc chấn thương"))
          : "";
        const msg = "Đã xếp " + filled + "/" + N + swapped + " · "
          + (off ? (off + " người trái tuyến") : "đúng tuyến cả đội") + short;
        this.setState(s => {
          const useOcc = curOcc !== "none";
          const out = useOcc ? { slotsByOcc: { ...s.slotsByOcc, [slotKey]: slots2 } } : { slotsByTeam: { ...s.slotsByTeam, [teamId]: slots2 } };
          if (outIdx.length) {
            const b = benchOf(s.benchByTeam, slotKey, sideKey).slice();
            outIdx.forEach(i2 => { const id = slots[i2]; if (id && b.indexOf(id) < 0 && slots2.indexOf(id) < 0) b.push(id); });
            out.benchByTeam = { ...s.benchByTeam, [slotKey]: b };
          }
          this.persist(out);
          return { ...out, picked: null, lineupMsg: msg, autoWhy: why };
        });
      }),
      /* Xoa ca doi hinh la thao tac pha hoai va truoc day no xoa NGAY khi bam.
         Nguoi thu app khong dam bam thu bat cu nut nao tren thanh cong cu vi so
         mat doi hinh -- do la cai gia cua mot nut xoa khong hoi lai. Gio no hoi
         mot lan (menu san co, khong them giao dien moi) va van de lai HOAN TAC. */
      clearAll: guard(e => {
        const filled = slots.filter(Boolean).length;
        if (!filled) { this.setState({ copied: "Sân đang trống, chưa có gì để xoá." }); return; }
        this.openCtx(e, "Xoá hết đội hình?", [{
          label: "Xoá " + filled + " người khỏi sân", hint: "hoàn tác được", tone: "danger",
          click: () => this.setState(s => {
            const useOcc = curOcc !== "none";
            const before = useOcc ? { slotsByOcc: s.slotsByOcc } : { slotsByTeam: s.slotsByTeam };
            const empty = fitSlots(null, SLOT_ROLES.length);
            const out = useOcc ? { slotsByOcc: { ...s.slotsByOcc, [slotKey]: empty } }
                               : { slotsByTeam: { ...s.slotsByTeam, [teamId]: empty } };
            this.persist(out);
            // `autoWhy` giai thich doi hinh VUA BI XOA -- bo luon, khong de no
            // dung mot minh giai thich mot thu khong con tren san.
            return { ...out, picked: null, lineupMsg: "", autoWhy: [], undo: { state: before }, copied: "Đã xoá hết đội hình." };
          })
        }]);
      }),
      splitOpen: !!st.splitOpen,
      splitCaret: st.splitOpen ? "▾" : "▸",
      toggleSplitCard: () => this.setState(s => ({ splitOpen: !s.splitOpen })),
      matchKindChips: [["vs", "Gặp đội khác"], ["inhouse", "Đá nội bộ"], ["free", "Tự do"]].map(k => ({
        label: k[1],
        bg: mKind === k[0] ? "rgba(104,33,220,0.35)" : "#121526",
        fg: mKind === k[0] ? "#FAFAFF" : "rgba(250,250,255,0.7)",
        line: mKind === k[0] ? "rgba(177,129,255,0.55)" : "rgba(255,255,255,0.07)",
        click: guard(() => this.setState(s => {
          const matchKindByOcc = { ...s.matchKindByOcc, [curOcc]: k[0] };
          this.persist({ matchKindByOcc });
          return { matchKindByOcc, teamTab: "A", picked: null };
        }))
      })),
      /* Trên điện thoại, dải này ngốn 142px trong 515px chrome nằm trên mặt sân --
         và mọi thứ trong nó là thứ đặt MỘT LẦN mỗi buổi (sơ đồ, loại trận, áo,
         đội trưởng), trong khi mặt sân là thứ động vào liên tục. Gấp lại thành
         một dòng tóm tắt bấm mở. Màn rộng thì đủ chỗ, để nguyên. */
      barSummary: [effFormation, ({ vs: "Gặp đội khác", inhouse: "Đá nội bộ", free: "Tự do" })[mKind] || "",
        kitSide === "home" ? "Áo sân nhà" : "Áo sân khách",
        (() => { const c = (st.captainByTeam || {})[sideKey]; const m = c && byId(c);
                 return m && slots.indexOf(c) >= 0 ? "C " + m.name : ""; })()
      ].filter(Boolean).join(" · "),
      barOpen: !!st.barOpen,
      barCollapsed: !!st.narrow && !st.barOpen,
      // Chi hien nut thu gon o dung noi dai nay GAP duoc (man hep). Man rong
      // dai luon mo, khong co gi de dong.
      barCanClose: !!st.narrow && !!st.barOpen,
      barExpanded: !st.narrow || !!st.barOpen,
      barToggle: () => this.setState(s => ({ barOpen: !s.barOpen })),
      isInhouse: inhouse,
      sideTabs: inhouse ? [["A", "Đội A"], ["B", "Đội B"]].map(t => ({
        label: t[1],
        bg: side === t[0] ? "#6821DC" : "#121526",
        fg: side === t[0] ? "#FAFAFF" : "rgba(250,250,255,0.7)",
        line: side === t[0] ? "#6821DC" : "rgba(255,255,255,0.07)",
        click: () => this.setState({ teamTab: t[0], picked: null })
      })) : [],
      isNarrow: !!st.narrow,
      /* Thanh điều hướng dưới đáy là mẫu điện thoại; trên màn rộng nó ăn 88px
         chiều cao mà sân đang thiếu. Chỉ đổi lên thanh trên khi đủ chỗ cho
         bốn nhãn cạnh ô tìm kiếm — khoảng 900–1080px không đủ, giữ đáy. */
      navBottom: !st.wide3,
      navTop: !!st.wide3,
      hasApp: true,
      paneTabs: [["pitch", "Đội hình"], ["tactic", "Chiến thuật"], ["list", "Danh sách"]].map(t => ({
        label: t[1],
        bg: (st.paneTab || "pitch") === t[0] ? "#6821DC" : "#121526",
        fg: ((st.lineupView === "tactics" ? "tactic" : (st.paneTab || "pitch")) === t[0]) ? "#FAFAFF" : "rgba(250,250,255,0.7)",
        line: ((st.lineupView === "tactics" ? "tactic" : (st.paneTab || "pitch")) === t[0]) ? "#6821DC" : "rgba(255,255,255,0.07)",
        click: t[0] === "tactic" ? (() => this.setState({ lineupView: "tactics", paneTab: "tactic" })) : (() => this.setState({ paneTab: t[0], lineupView: "squad" }))
      })),
      showPitchPane: !st.narrow || (st.paneTab || "pitch") === "pitch",
      showTacticPane: !st.narrow || (st.paneTab || "pitch") === "tactic",
      showListPane: st.narrow ? (st.paneTab || "pitch") === "list" : (st.shapeTab || "shape") === "shape",
      lineupScope: curOcc === "none" ? "ĐỘI HÌNH MẪU CỦA ĐỘI" : ((inhouse ? ("ĐỘI " + side + " · BUỔI ") : "ĐỘI HÌNH BUỔI ") + (curOccObj ? (DAY_VN[curOccObj.d.getDay()] + " " + curOccObj.d.getDate() + "/" + (curOccObj.d.getMonth() + 1)) : "")),
      /* Một dòng nói ra thứ đang chặn, hoặc khoảng cách giữa người nhận đi và số ô.

         Tổng quan nói "9/36 ĐÃ NHẬN", màn này nói "XẾP 2/7", và trước đây không chỗ
         nào trừ hai con số cho nhau. Đội mới thì còn tệ hơn: một người, không buổi
         nào, mà màn vẫn vẽ bảy ô trống và không nói vì sao không xếp được. */
      lineupGap: this.noteOf((() => {
        const need = SLOT_ROLES.length;
        if (slots.filter(Boolean).length >= need) return "";
        const squad = active.length;
        const yes = active.filter(m => attGoing(att[m.id])).length;
        if (!hasOcc && squad < need)
          return "Đội mới: thêm người ở Thành viên và thêm buổi ở Tổng quan, rồi quay lại xếp.";
        if (squad < need)
          return "Đội có " + squad + " người, sân cần " + need + ". Thêm người ở Thành viên.";
        if (!hasOcc)
          return "Chưa có buổi nào. Thêm buổi ở Tổng quan để cả đội điểm danh.";
        if (!yes) return "Chưa ai nhận đi buổi này. Nhắc cả đội điểm danh trước đã.";
        if (yes < need) return yes + " nhận · sân " + need + " · thiếu " + (need - yes);
        if (yes === need) return yes + " nhận · sân " + need + " · vừa đủ";
        return yes + " nhận · sân " + need + " · dư " + (yes - need);
      })()),
      /* Doan nay tung dai 46 chu va giai thich ba thu. Hai trong ba da nam san
         tren chinh o cau thu: mep duoi moi o IN THANG chu "so truong / da duoc /
         lech tuyen", va cham goc diem danh co `title` noi ro trang thai. Doc mot
         lan xong thi 36 chu con lai la nhieu vinh vien. Giu lai dung phan khong
         tu lo ra duoc: cu cham. */
      pitchLegend: this.noteOf("Chạm giữ (hoặc chuột phải) vào một ô để mở hồ sơ · chỉ đạo · đổi người."),
      /* Thanh hanh dong dinh o day vung cuon: o 375px ca hang nam duoi mep man
         nen nguoi moi khong thay nut Luu -- dung chinh cho dung hinh cu.
         Man hep con thanh nav co dinh cao 88px o duoi, phai ne no. */
      actBarBottom: st.narrow ? "92px" : "0px",
      lineupScopeNote: curOcc === "none" ? "Chưa có buổi nào - đang xếp đội hình mẫu, buổi mới sẽ lấy mẫu này làm gốc." : "Sửa ở đây chỉ đổi đội hình buổi này, không đổi mẫu của đội.",
      isOccLineup: curOcc !== "none",
      copyFromTpl: guard(() => this.setState(s => {
        const out = { slotsByOcc: { ...s.slotsByOcc, [slotKey]: fitSlots((s.slotsByTeam || {})[teamId], SLOT_ROLES.length) } };
        this.persist(out);
        return { ...out, lineupMsg: "Đã chép đội hình mẫu vào buổi này." };
      })),
      saveAsTpl: guard(() => this.setState(s => {
        const out = { slotsByTeam: { ...s.slotsByTeam, [teamId]: slots.slice() } };
        this.persist(out);
        return { ...out, lineupMsg: "Đã lưu đội hình này thành mẫu của đội." };
      })),
      saveLineup: guard(() => { this.persist(); this.setState({ lineupMsg: "Đã lưu đội hình cho buổi này." }); }),
      hasLineupMsg: !!st.lineupMsg,
      autoWhy: (st.autoWhy || []).map(t => ({ text: t })),
      hasAutoWhy: !!(st.autoWhy || []).length,
      clearAutoWhy: () => this.setState({ autoWhy: [] }),

      /* ---------- lineup toolbar: one primary, one pair, one overflow ----------
         Seven buttons used to share a row at the same weight while doing four
         unrelated jobs -- simulate, annotate, fill, template. Nobody can tell
         them apart without reading every label. */
      // Filled slots out of the eleven (or five, or seven) the formation draws.
      lineupFilled: slots.filter(Boolean).length,
      lineupNeeded: SLOT_ROLES.length,
      pitchEmpty: !slots.filter(Boolean).length,
      // Auto-fill is the fastest way out of an empty pitch, so it leads while
      // the pitch is empty and steps back to secondary once there is work to
      // protect. Editing a lineup beats creating one from nothing.
      autoLabel: !slots.filter(Boolean).length ? "Xếp giúp tôi" : "Tự động",
      autoBg: !slots.filter(Boolean).length ? "#C1D439" : "#6821DC",
      autoFg: !slots.filter(Boolean).length ? "#090F1D" : "#FAFAFF",
      // The primary says how far along you are, and goes quiet until the XI is
      // complete -- still clickable, since a half-filled lineup is worth saving.
      /* "7/7" chi dem O DA CO NGUOI. No khong phai so nguoi se den. Ghi kem so
         nguoi da bam "Di" de nut khong hua thay cho nhung nguoi chua tra loi. */
      saveLabel: (() => {
        const on = slots.filter(Boolean);
        const base = "Lưu đội hình · " + on.length + "/" + SLOT_ROLES.length;
        if (!hasOcc) return base;
        const yes = on.filter(id => attState(att[id]) === "yes").length;
        const no = on.filter(id => attState(att[id]) === "no").length;
        /* "0 báo đi · 1 báo vắng" day nhan len 269px trong khi nut chi rong 259px
           khi no dung chung hang voi "Chia sẻ" -- chu bi cat cut ("...1 báo vắn").
           Rut con "0 đi · 1 vắng": van du nghia vi dai so lieu ngay tren dau da
           ghi ro "ĐÃ NHẬN" va "BÁO VẮNG". */
        return base + " · " + yes + " đi" + (no ? " · " + no + " vắng" : "");
      })(),
      saveBg: slots.filter(Boolean).length === SLOT_ROLES.length ? "#C1D439" : "rgba(193,212,57,0.30)",
      saveFg: slots.filter(Boolean).length === SLOT_ROLES.length ? "#090F1D" : "rgba(250,250,255,0.9)",
      // Copy / template verbs are rare and self-describing once opened, so they
      // live behind the same kebab pattern the rest of the app already uses.
      // ponytail: re-deriving the bindings to reach the sibling handlers costs one
      // renderVals per menu click, which is rarer than a render. Hoist the three
      // handlers out of the object literal if that ever shows up in a profile.
      lineupMore: guard(e => this.openCtx(e, "Đội hình", [
        { label: "Copy đội hình", hint: "dán vào chat đội", click: () => this.renderVals().copyLineup() },
        curOcc !== "none" && { label: "Chép từ mẫu của đội", click: () => this.renderVals().copyFromTpl() },
        curOcc !== "none" && { label: "Lưu thành mẫu của đội", click: () => this.renderVals().saveAsTpl() }
      ])),
      // Shown once, on an empty pitch, next to the thing it is talking about.
      // Clicking a slot is the first move and it now answers, so say so rather
      // than opening a four-step tour nobody reads.
      showEmptyHint: !slots.filter(Boolean).length && isAdmin,
      // A drag gives no hover state to style against, so the pitch carries the
      // fact for its duration and CSS does the rest. One setState per drag, not
      // per pixel -- a dragover handler would re-render the tree continuously.

      lineupMsg: st.lineupMsg,

      /* ---------- overview: top strip + next session ---------- */
      memberCount: active.length,
      balance: this.money(balance),
      /* So du dau ky chi ton tai trong ban xuat CSV, khong o dau tren man hinh.
         Nen bang thu-chi cong lai ra mot so KHAC voi con so lon in o tren, va
         khong cach nao doi chieu duoc. Ghi ro phep tinh ngay duoi con so do. */
      balanceMake: (() => {
        const op = team.opening || 0;
        const mv = teamLedger.reduce((a, t) => a + t.v, 0);
        if (!op && !teamLedger.length) return "";
        return "đầu kỳ " + this.money(op) + (mv < 0 ? " − " : " + ") + this.money(Math.abs(mv))
          + " (" + teamLedger.length + " giao dịch)";
      })(),
      totalDebt: this.money(active.reduce((a, m) => a + debt(m), 0)),
      /* Doi chieu hai nua cua so quy -- nhung soi CAU TRUC chu khong so TIEN.

         Ban dau ham nay so "tong Thu quy" voi "tong tien san da danh dau dong",
         va no bao dong gia ngay lap tuc: tien cua buoi SAP TOI thu truoc thi
         chua co dong tien san nao de danh dau, nen mot lan bam "Da dong" hoan
         toan dung cung lam no keu. Mot canh bao keu khi moi thu dang dung la
         canh bao se bi bo qua, tuc la te hon khong co.

         Cai that su hong la LECH CAP: mot dong thu ma nguoi do khong con duoc
         danh dau da dong, hoac mot dau da-dong ma khong co dong thu nao. Dong cu
         khong mang `src` thi khong soi duoc -- bo qua, khong dem, khong doan. */
      hasDuesGap: (() => {
        const paidMap = st.paidByOcc || {};
        const rows = teamLedger.filter(t => t.src && t.src.kind === "dues");
        const seen = {};
        let bad = 0;
        rows.forEach(t => {
          seen[t.src.occ + "|" + t.src.memberId] = 1;
          if (!((paidMap[t.src.occ] || {})[t.src.memberId])) bad++;
        });
        Object.keys(paidMap).forEach(occ2 => {
          Object.keys(paidMap[occ2] || {}).forEach(mid => {
            if (paidMap[occ2][mid] && !seen[occ2 + "|" + mid]) bad++;
          });
        });
        return bad > 0;
      })(),
      duesGap: (() => {
        const paidMap = st.paidByOcc || {};
        const rows = teamLedger.filter(t => t.src && t.src.kind === "dues");
        const seen = {};
        const credit = [];
        rows.forEach(t => {
          seen[t.src.occ + "|" + t.src.memberId] = 1;
          if (!((paidMap[t.src.occ] || {})[t.src.memberId])) credit.push(t.label || "dòng thu");
        });
        let marks = 0;
        Object.keys(paidMap).forEach(occ2 => {
          Object.keys(paidMap[occ2] || {}).forEach(mid => {
            if (paidMap[occ2][mid] && !seen[occ2 + "|" + mid]) marks++;
          });
        });
        const bits = [];
        if (credit.length) bits.push(credit.length + " dòng thu không còn ai được đánh dấu đã đóng (" + credit.slice(0, 2).join(", ") + (credit.length > 2 ? "…" : "") + ")");
        if (marks) bits.push(marks + " người được đánh dấu đã đóng mà quỹ không có dòng thu nào");
        return bits.length ? ("⚠ Sổ quỹ lệch: " + bits.join(" · ") + ".") : "";
      })(),
      debtCount: debtors.length,
      copiedMsg: st.copied,
      deadlineLeft: (() => {
        if (!curOccObj) return "chưa có buổi";
        const t = curOccObj.e.time || "19:30";
        const dl = new Date(curOccObj.d.getFullYear(), curOccObj.d.getMonth(), curOccObj.d.getDate(),
          parseInt(t.slice(0, 2), 10) || 19, parseInt(t.slice(3, 5), 10) || 30);
        const ms = dl - now;
        if (ms <= 0) return "đã tới giờ";
        const h = Math.floor(ms / 3600000);
        return h >= 24 ? ("còn " + Math.floor(h / 24) + " ngày") : ("còn " + h + " giờ");
      })(),
      /* Tiêu đề là ĐỐI THỦ, còn ngày-giờ-sân-áo gộp thành MỘT dòng thông tin.
         Trước đây ngày giờ chiếm cỡ chữ 44px — thứ lịch bên dưới đã nói — còn
         đối thủ thì không có chỗ nào để hiện, và màu áo thì app không hề biết. */
      nextTitle: curOccObj
        ? fixtureTitle(curOccObj.e.opp, KINDS[curOccObj.e.kind].label)
        : "Chưa có buổi",
      nextWhen: curOccObj
        ? (DAY_FULL[curOccObj.d.getDay()] + " "
           + String(curOccObj.d.getDate()).padStart(2, "0") + "/"
           + String(curOccObj.d.getMonth() + 1).padStart(2, "0") + " · " + curOccObj.e.time)
        : "chưa có buổi nào trong lịch",
      // Dấu chấm giữa đi kèm giá trị, nên buổi không khai màu áo không để lại
      // một dấu chấm cụt ở cuối dòng.
      nextKitTail: (curOccObj && kitLabelOf(curOccObj.e.kit))
        ? " · " + kitLabelOf(curOccObj.e.kit) : "",
      nextPlace: curOccObj
        ? (/^https?:\/\//i.test(String(curOccObj.e.place || "")) ? "M\u1edf Google Maps" : (venueOf(curOccObj.e.place) || "ch\u01b0a \u0111i\u1ec1n s\u00e2n"))
        : "ch\u01b0a \u0111i\u1ec1n s\u00e2n",
      nextPlaceHref: curOccObj ? String(curOccObj.e.place || "") : "",
      hasMapLink: !!(curOccObj && /^https?:\/\//i.test(String(curOccObj.e.place || ""))),
      noMapLink: !(curOccObj && /^https?:\/\//i.test(String(curOccObj.e.place || ""))),
      nextNote: curOccObj
        ? [curOccObj.e.note || "", curOccObj.e.repeat === "weekly" ? "lịch cố định hàng tuần" : ""].filter(Boolean).join(" · ")
        : "Thêm buổi ở lịch phía dưới.",
      occFeeLabel: this.money(occFee),
      ringDeg: (active.length ? Math.round(yesTotal / active.length * 360) : 0) + "deg",
      ringLabel: yesTotal + "/" + active.length,
      /* Con so quyet dinh ca tuan la "0/14 DA NHAN", va truoc day the do khong co
         viec gi de lam voi no: doi truong phai roi app, tu go lai loi moi trong
         Zalo, roi quay ve tick tay tung dong. Ca hai manh ghep deu da co san
         trong app -- "Copy doi hinh" o man San va nut "Nhac" tung nguoi no quy --
         chi cho quan trong nhat la thieu.
         Chi hien khi that su con nguoi chua tra loi. */
      nudgeCount: (() => {
        if (!hasOcc) return 0;
        return active.filter(m => attState(att[m.id]) === "none").length;
      })(),
      nudgeLabel: (() => {
        if (!hasOcc) return "";
        const n = active.filter(m => attState(att[m.id]) === "none").length;
        return n ? ("Nhắc " + n + " người chưa trả lời") : "";
      })(),
      nudgeCopy: () => {
        const who = active.filter(m => attState(att[m.id]) === "none");
        if (!who.length) { this.setState({ copied: "Cả đội trả lời hết rồi." }); return; }
        const nx = curOccObj
          ? (DAY_VN[curOccObj.d.getDay()] + " " + curOccObj.d.getDate() + "/" + (curOccObj.d.getMonth() + 1)
             + " " + curOccObj.e.time + " · " + (curOccObj.e.place || "chưa có sân"))
          : "chưa có lịch";
        const NL = String.fromCharCode(10);
        const txt = [team.name + " — điểm danh buổi tới", nx,
          (occFee ? "Tiền sân: " + this.money(occFee) + "/người" : ""),
          "", "Chưa trả lời (" + who.length + "): " + who.map(m => m.name).join(", "),
          "", "Vào app" + (team.code ? " (mã đội " + team.code + ")" : "") + " bấm Tôi đi / Chưa chắc / Không đi giúp mình nhé."]
          .filter(Boolean).join(NL);
        if (typeof navigator !== "undefined" && navigator.share) {
          Promise.resolve(navigator.share({ text: txt })).catch(() => {});
          this.setState({ copied: "Đang mở bảng chia sẻ…" });
          return;
        }
        this.copyText(txt);
        this.setState({ copied: "Đã copy lời nhắc - dán vào group Zalo." });
      },
      sayYes: () => { if (me) this.setAtt(me.id, "yes"); },
      sayMaybe: () => { if (me) this.setAtt(me.id, "maybe"); },
      sayNo: () => { if (me) this.setAtt(me.id, "no"); },
      // "Tôi đi" is the one action this screen exists for, so it stays solid
      // regardless of state; only declining demotes it to an outline. Previously
      // both buttons were ghosts 6% apart in alpha, which is why the card needed
      // a line of text telling people to press one of them.
      yesBg: myAtt === "yes" || myAtt === "none" ? "#C1D439" : "rgba(193,212,57,0.16)",
      yesFg: myAtt === "yes" || myAtt === "none" ? "#090F1D" : "#C1D439",
      mbBg: myAtt === "maybe" ? "rgba(247,144,9,0.28)" : "rgba(255,255,255,0.10)",
      mbFg: myAtt === "maybe" ? "#F79009" : "rgba(250,250,255,0.75)",
      noBg: myAtt === "no" ? "rgba(236,46,26,0.28)" : "rgba(255,255,255,0.10)",
      noFg: myAtt === "no" ? "#FF6B57" : "rgba(250,250,255,0.75)",
      myTaskTitle: !hasOcc ? "Chưa có buổi nào"
        : ({ none: "Bạn chưa trả lời", no: "Bạn báo vắng",
             maybe: "Bạn báo chưa chắc", yes: "Bạn đã nhận" }[myAtt]),
      myTaskNote: !hasOcc ? "thêm lịch để cả đội điểm danh"
        // Was "bấm Tôi đi hoặc Không đi" — an instruction compensating for two
        // buttons that did not read as a choice. The buttons carry that now, so
        // this line states the consequence instead.
        // "Chưa chắc" nói thẳng hai hệ quả của nó: chưa mất tiền, và chưa được
        // xếp vào đội hình. Người đọc phải biết mình vẫn còn nợ một câu trả lời.
        : ({ none: "nhận là tính " + this.money(occFee) + " tiền sân",
             no: "đổi ý thì bấm Tôi đi",
             maybe: "chưa tính tiền sân, và chưa được xếp vào đội hình",
             yes: "tiền sân " + this.money(occFee) + " vào nợ quỹ" }[myAtt]),

      /* ---------- overview: form card ---------- */
      form5: last5,
      formRecord: wins + "T " + draws + "H " + Math.max(0, teamMatches.length - wins - draws) + "B",
      formLabel: last5w >= 4 ? "Rất tốt" : (last5w >= 3 ? "Tốt" : (last5w >= 2 ? "Ổn" : "Cần cải thiện")),
      formTagBg: last5w >= 3 ? "rgba(117,206,80,0.16)" : (last5w >= 2 ? "rgba(247,144,9,0.16)" : "rgba(236,46,26,0.16)"),
      formTagFg: last5w >= 3 ? "#75CE50" : (last5w >= 2 ? "#F79009" : "#FF7F6B"),
      goalDiff: (() => {
        const d = teamMatches.reduce((a, g) => a + (g.gf - g.ga), 0);
        return (d > 0 ? "+" : "") + d;
      })(),
      // 300x56 sparkline of the last 8 results, oldest first (3 = win, 1 = draw, 0 = loss).
      formLine: (() => {
        const pts = teamMatches.slice(0, 8).reverse()
          .map(g => (g.gf > g.ga ? 3 : (g.gf === g.ga ? 1 : 0)));
        if (!pts.length) return "0,56 300,56";
        const step = pts.length > 1 ? 300 / (pts.length - 1) : 300;
        return pts.map((v, i) => Math.round(i * step) + "," + Math.round(52 - v / 3 * 44)).join(" ");
      })(),
      formArea: (() => {
        const pts = teamMatches.slice(0, 8).reverse()
          .map(g => (g.gf > g.ga ? 3 : (g.gf === g.ga ? 1 : 0)));
        if (!pts.length) return "0,56 300,56";
        const step = pts.length > 1 ? 300 / (pts.length - 1) : 300;
        const line = pts.map((v, i) => Math.round(i * step) + "," + Math.round(52 - v / 3 * 44)).join(" ");
        return "0,56 " + line + " 300,56";
      })(),

      /* ---------- overview: internal ranking (top 5) ---------- */
      rankUnit: (METRICS.find(x => x.id === rankByNow) || METRICS[0]).unit,
      /* Bảng theo ĐIỂM chỉ nhận người đã được chấm, nên khi chưa ai chấm nó
         trống — dòng này là chỗ duy nhất nói ra vì sao, đừng bỏ. */
      rankNote: (() => {
        const met = METRICS.find(x => x.id === rankByNow) || METRICS[0];
        return (met.id === "rating" && !active.some(m => ratingView(m).rated))
          ? "Chưa ai được chấm chỉ số nên bảng này còn trống. Vào Thành viên, bấm một người rồi chấm 12 chỉ số — hoặc dùng Chấm nhanh cả đội."
          : met.note;
      })(),
      rankMetrics: METRICS.map(x => ({
        label: x.label,
        bg: rankByNow === x.id ? "#6821DC" : "#121526",
        fg: rankByNow === x.id ? "#FAFAFF" : "rgba(250,250,255,0.7)",
        click: () => this.setState({ rankBy: x.id })
      })),
      ranking: (() => {
        const met = METRICS.find(x => x.id === rankByNow) || METRICS[0];
        const prev = (st.ranks || {})[met.id] || {};
        /* Xếp hạng theo ĐIỂM chỉ xếp người đã được chấm. Trước đây cả 36 người
           vào bảng, `met.get` rơi về điểm cũ suy từ hạng gõ tay, nên top 5 là
           năm người mà không ai từng chấm một chỉ số nào — thứ tự đó tự nó là
           một kết luận. Không ai được chấm thì bảng trống và dòng ghi chú ngay
           dưới nói vì sao; các chỉ tiêu khác (trận, bàn, MVP) không đổi. */
        const pool = met.id === "rating" ? active.filter(m => ratingView(m).rated) : active;
        return pool.slice()
          .sort((a, b) => (met.get(b) || 0) - (met.get(a) || 0) || b.rating - a.rating)
          .slice(0, 5)
          .map((m, i) => {
            const was = prev[m.id];
            const delta = was == null ? 0 : was - (i + 1);
            return {
              rank: i + 1,
              rowBg: stripe(i),
              medalBg: i < 3 ? MEDALS[i][0] : "rgba(255,255,255,0.06)",
              medalFg: i < 3 ? MEDALS[i][1] : "rgba(250,250,255,0.7)",
              name: m.name,
              badge: posLabelOf(m) === "-" ? m.type : posLabelOf(m),
              badgeFg: LINE_TONE[lineOf(m)] || "rgba(250,250,255,0.6)",
              grade: ratingView(m).grade || "—",
              gradeBg: tone(m)[0], gradeFg: tone(m)[1],
              value: met.id === "rating" ? ratingView(m).score : (met.get(m) || 0),
              deltaIcon: delta > 0 ? "IconIncrease" : (delta < 0 ? "IconDecrease" : "IconMinus"),
              deltaFg: delta > 0 ? "#75CE50" : (delta < 0 ? "#FF6B57" : "rgba(250,250,255,0.5)"),
              deltaLabel: delta === 0 ? "-" : (delta > 0 ? "+" + delta : String(delta)),
              open: open(m)
            };
          });
      })(),

      /* ---------- members: list chrome ---------- */
      memberGroups,
      /* Tieu de cot bam duoc. Mui ten chi hien tren cot dang sap, va no la MOT chuoi
         chu khong phai mot mau -- mau khong noi duoc dang lon-truoc hay nho-truoc. */
      memHeads: [
        { key: "num",     label: "SỐ",        cls: "",      align: "left"  },
        { key: "name",    label: "TÊN",       cls: "",      align: "left"  },
        { key: "",        label: "LOẠI",      cls: "",      align: "left"  },
        { key: "",        label: "VỊ TRÍ",    cls: "",      align: "left"  },
        { key: "rating",  label: "ĐIỂM",      cls: "",      align: "left"  },
        // Ba nhom chi so tu cham tay. Chung KHONG phai loai "chi dong duoc neu bia"
        // -- doi tu cham va 14/14 nguoi da co diem, chi la bang chua bao gio doc len.
      ].concat(st.wide6
        ? ATTRS.map(a => ({ key: "a:" + a.key, label: ATTR_SHORT[a.key] || a.label, cls: "mperf", align: "right", full: a.label }))
        : [
          { key: "atk", label: "CÔNG", cls: "mperf", align: "right" },
          { key: "def", label: "THỦ",  cls: "mperf", align: "right" },
          { key: "fit", label: "THỂ",  cls: "mperf", align: "right" }
        ]).concat([
        { key: "games",   label: "TRẬN",      cls: "mperf", align: "right" },
        { key: "goals",   label: "BÀN",       cls: "mperf", align: "right" },
        { key: "assists", label: "K.TẠO",     cls: "mperf", align: "right" },
        { key: "mvp",     label: "HAY",       cls: "mperf", align: "right" },
        { key: "",        label: "THẺ",       cls: "mperf", align: "right" },
        { key: "att",     label: "ĐIỂM DANH", cls: "",      align: "left"  },
        // Cot nay chua chip "Du quy" / "No 95.000d", nen tieu de "NO QUY" doc nguoc
        // nghia voi chinh gia tri ben duoi no.
        { key: "owed",    label: "QUỸ",       cls: "",      align: "left"  },
        { key: "",        label: "",          cls: "",      align: "left"  }
      ]).map(h => ({
        /* Mui ten cho cot so; cot chu thi mot mui ten khong noi duoc gi -- "TEN ↓"
           doc ra la "giam dan" trong khi no dang xep A->Z. */
        label: h.label + (MEM_SORT.key && MEM_SORT.key === h.key
          ? (h.key === "name" ? (MEM_SORT.dir === 1 ? " A→Z" : " Z→A")
                              : (MEM_SORT.dir === 1 ? " ↓" : " ↑"))
          : ""),
        cls: h.cls,
        align: h.align,
        cursor: h.key ? "pointer" : "auto",
        color: MEM_SORT.key && MEM_SORT.key === h.key ? "#C1D439" : "rgba(250,250,255,0.62)",
        title: h.key ? ("Sắp xếp theo " + h.label) : (h.full || ""),
        click: h.key ? (() => this.setState(() => {
          // Bam lai chinh cot dang sap thi dao chieu; sang cot khac thi bat dau bang
          // chieu doc de nhat cho loai du lieu do -- so thi lon truoc, ten thi A->Z.
          MEM_SORT = MEM_SORT.key === h.key
            ? { key: h.key, dir: MEM_SORT.dir === 1 ? -1 : 1 }
            : { key: h.key, dir: h.key === "name" ? 1 : 1 };
          return {};
        })) : (() => {})
      })),
      cardGroups,
      isWide: !st.narrow,
      // Vung tha cua the du bi: chi tren man rong (dien thoai the nay cao 264px,
      // them mot o 56px la an mat mot nguoi) va chi cho nguoi duoc sua doi hinh.
      // ...va an di khi bang chi dao ca nhan dang mo: luc do khong ai keo tha, con
      // 86px do thi bang chi dao dang can de bot phai cuon.
      benchDropZone: !st.narrow && isAdmin && st.pickedSlot == null,
      // Trong tab Thành viên chỉ còn hai hình dạng: bảng (danh sách) và thẻ.
      // "stats" đã bị isMembers loại từ trước, nên không cần kiểm lại ở đây.
      isRoster: (st.memberView || "list") !== "cards",
      isCards: (st.memberView || "list") === "cards",
      memberViews: [["list", "Danh sách"], ["cards", "Thẻ cầu thủ"], ["stats", "Thống kê"]].map(v => ({
        label: v[1],
        bg: (st.memberView || "list") === v[0] ? "#6821DC" : "#121526",
        fg: (st.memberView || "list") === v[0] ? "#FAFAFF" : "rgba(250,250,255,0.7)",
        line: (st.memberView || "list") === v[0] ? "#6821DC" : "rgba(255,255,255,0.07)",
        click: () => this.setState({ memberView: v[0], sel: null })
      })),
      /* 636px — vừa trong cột nội dung ở mọi khổ từ 900px trở lên, tức là bảng
         không bao giờ phải cuộn ngang. Dưới 900px màn hình dùng nhánh thẻ dọc. */
      /* 12 cot cho man rong: bon cot thanh tich (tran/ban/kien tao/hay nhat) chen
         ngay sau DIEM. Man hep cat bon cot do di bang CSS + tra lai mau 8 cot cu. */
      /* Cot TEN tung la `1.6fr`, tuc no nuot het cho thua: do duoc o 1920 no rong
         1044px (54% man hinh) de chua mot cai ten dai nhat 69px, con TRAN/BAN/K.TAO
         thi bop con 44px moi cot. Mat phai di 1000px tu ten sang cot ke tiep. Nay
         chan tran cot ten va cho cot cuoi (nut mo ho so) an phan du -- cho trong
         nam o mep phai thi doc ra "bang het roi", nam giua bang thi doc ra hong. */
      /* Cot cuoi tung la minmax(44px,1fr) de nuot cho thua -- trong tai vong 13 dem:
         336px cho mot nut 36px, x14 hang. Chan lai 56px; bang ket thuc som thi
         phan con lai la le cua the, khong phai mot cot. */
      /* Vong 15: bang dung o x=1598/1894, 296px trong phai; vong 11: 1fr nuot het
         thanh cot 336px. Khong chan cung nua -- ten 1fr nhung so giu co dinh, va
         cac cot so nới lên de bang cham mep. */
      /* Man >=1600px doi sang bang doi hinh kieu FM: 12 cot chi so thay ba o
         trung binh. Do duoc trong app that: o TEN truoc do an 595px trong 1877px
         hang, tuc 435px trong moi hang -- gio con 325px va cho do dung de doc chi
         so. Khe hep lai 10->6px vi 24 cot thi khe an mat 230px. */
      colsTpl: st.wide6
        ? "40px minmax(150px,1fr) 96px 92px 56px 50px 50px 50px 50px 50px 50px 50px 50px 50px 50px 50px 50px 54px 50px 60px 50px 62px 120px 104px 46px"
        : "44px minmax(160px,1fr) 100px 104px 64px 60px 60px 60px 64px 64px 64px 64px 60px 124px 112px 56px",
      colsGap: st.wide6 ? "6px" : "10px",
      colsMin: "636px",
      /* Bốn chữ trong màn này người mới không đoán được: "Hạng", "Đá cứng",
         "Wildcard", và mấy chấm màu theo tuyến. Giải thích ngay tại chỗ, bằng
         một dòng, chứ không giấu sau tooltip — điện thoại không có hover. */
      /* Dong nay CO Y khong dung RATING_NOTE: o day no nam trong mot dong
         `white-space:nowrap` rong 1113px tren man 1440, ma ban dai can 1447px --
         tuc 23% cuoi cau bi cat, dung ngay cho giai nghia "Wildcard". Cat chu
         cho vua mot dong thay vi giau phan con lai trong tooltip.
         Them "cot LOAI trong = da cung" vi tu khi cot do chi in ngoai le,
         o trong la mot cau tra loi ma truoc day khong dong nao noi ra. */
      termNote: "Điểm 1–20 app tự tính từ 12 chỉ số; chưa chấm thì lấy điểm cũ. "
        // "Mau la tuyen:" da bo: ngay sau no la bon cham mau kem chu "thu mon /
        // hau ve / tien ve / tien dao". Cau do chi doc to len cai dang nhin thay.
        + "Hạng S→D là mức của điểm. Cột LOẠI trống = đá cứng, ghi Wildcard = quân bổ sung.",
      posLegend: [["TM", "thủ môn"], ["HV", "hậu vệ"], ["TV", "tiền vệ"], ["TĐ", "tiền đạo"]]
        .map(x => ({ label: x[1], tone: LINE_TONE[x[0]] })),

      /* ---------- members: add / edit form ---------- */
      // The add form is 900px tall and used to sit above the roster, so an admin
      // opening "Thành viên" saw a form and no players. It is behind a trigger now
      // and opens automatically when editing an existing member.
      formOpen: !!(st.formOpen || st.editId),
      formClosed: !(st.formOpen || st.editId),
      openForm: () => this.setState({ formOpen: true }),
      form: st.form,
      formTitle: st.editId ? "Sửa hồ sơ" : "Thêm thành viên",
      formCta: st.editId ? "Lưu hồ sơ" : "Thêm vào đội",
      formHint: st.editId ? "đang sửa hồ sơ có sẵn" : "số điện thoại là tài khoản đăng nhập của họ",
      setFName: e => this.formSet("name", e.target.value),
      setFNum: e => this.formSet("num", e.target.value),
      setFPhone: e => this.formSet("phone", e.target.value),
      setFDob: e => this.formSet("dob", e.target.value),
      setFHurt: e => this.formSet("hurt", e.target.value),
      setFHurtTo: e => this.formSet("hurtTo", e.target.value),
      setFBorn: e => this.formSet("born", e.target.value),
      setFNat: e => this.formSet("nat", e.target.value),
      setFShirt: e => this.formSet("shirt", e.target.value),
      setFSize: e => this.formSet("size", e.target.value),
      posMainChips: POS_CODES.map(c => ({
        label: c,
        bg: st.form.posMain === c ? "rgba(104,33,220,0.35)" : "#1F2332",
        fg: st.form.posMain === c ? "#FAFAFF" : "rgba(250,250,255,0.7)",
        line: st.form.posMain === c ? "rgba(177,129,255,0.6)" : "rgba(255,255,255,0.08)",
        click: () => this.formSet("posMain", st.form.posMain === c ? "" : c)
      })),
      posAltChips: POS_CODES.map(c => {
        const on = (st.form.posAlt || []).indexOf(c) >= 0;
        return {
          label: c,
          bg: on ? "rgba(193,212,57,0.18)" : "#1F2332",
          fg: on ? "#C1D439" : "rgba(250,250,255,0.6)",
          line: on ? "rgba(193,212,57,0.5)" : "rgba(255,255,255,0.08)",
          click: () => {
            const cur = (st.form.posAlt || []).slice();
            const at = cur.indexOf(c);
            if (at >= 0) cur.splice(at, 1);
            else if (cur.length < 2) cur.push(c);
            else { this.setState({ copied: "Tối đa 2 vị trí phụ." }); return; }
            this.formSet("posAlt", cur);
          }
        };
      }),
      typeChips: ["Đá cứng", "Wildcard"].map(t => ({
        label: t,
        bg: st.form.type === t ? "rgba(104,33,220,0.35)" : "#1F2332",
        fg: st.form.type === t ? "#FAFAFF" : "rgba(250,250,255,0.7)",
        line: st.form.type === t ? "rgba(177,129,255,0.6)" : "rgba(255,255,255,0.08)",
        click: () => this.formSet("type", t)
      })),
      gradeChips: ["S", "A", "B", "C", "D", ""].map(g => ({
        label: g || "?",
        bg: st.form.grp === g ? GRADE_TONE[g][0] : "#1F2332",
        fg: st.form.grp === g ? GRADE_TONE[g][1] : "rgba(250,250,255,0.6)",
        line: st.form.grp === g ? GRADE_TONE[g][1] : "rgba(255,255,255,0.08)",
        click: () => this.formSet("grp", g)
      })),
      resetForm: () => this.setState({
        formOpen: false, editId: null,
        form: { name: "", num: "", type: "Đá cứng", grp: "A", phone: "", shirt: "", size: "", dob: "", posMain: "", posAlt: [] }
      }),
      submitMember: guard(() => this.setState(s => {
        const f = s.form;
        const badMember = memberProblem(f, s.members.filter(m => m.teamId === teamId), s.editId);
        if (badMember) return { copied: badMember };
        const warnMember = memberWarning(f, s.members.filter(m => m.teamId === teamId), s.editId);
        const patch = {
          name: f.name.trim(), num: String(f.num).trim(), type: f.type, grp: f.grp,
          phone: String(f.phone).trim(), shirt: f.shirt, size: f.size, dob: f.dob,
          born: String(f.born || "").trim(), nat: String(f.nat || "").trim(),
          hurt: String(f.hurt || "").trim(), hurtTo: String(f.hurtTo || "").trim(),
          posMain: f.posMain, posAlt: (f.posAlt || []).slice()
        };
        let members;
        if (s.editId) {
          members = s.members.map(m => m.id === s.editId ? { ...m, ...patch } : m);
        } else {
          members = s.members.concat([{
            id: Date.now(), teamId: teamId, hidden: false,
            games: 0, goals: 0, assists: 0, y: 0, r: 0, mvp: 0, og: 0, owed: 0,
            rating: 10,
            ...patch
          }]);
        }
        this.persist({ members });
        return {
          members, formOpen: false, editId: null,
          form: { name: "", num: "", type: "Đá cứng", grp: "A", phone: "", shirt: "", size: "", dob: "", posMain: "", posAlt: [] },
          copied: (s.editId ? "Đã lưu hồ sơ " : "Đã thêm ") + patch.name + "." + warnMember
        };
      })),

      /* ---------- members: player detail ---------- */
      /* ---------- chấm nhanh cả đội: một chỉ số, tất cả mọi người ---------- */
      quickOpen: !!quickA,
      /* Mở thẳng vào chỉ số ÍT người chấm nhất — việc còn nhiều nhất nằm ở đó,
         và mở vào một cột đã xong thì màn hình trông như không có gì để làm. */
      openQuick: guard(() => this.setState({
        quickKey: ATTRS.slice().sort((a, b) => quickCount(a.key) - quickCount(b.key))[0].key
      })),
      quickClose: () => this.setState({ quickKey: "" }),
      showQuickCta: isAdmin && !st.quickKey && !selM && active.length > 0,
      quickCtaNote: ratedPeople + "/" + active.length + " người đã có điểm",
      quickTitle: quickA ? quickA.label : "",
      quickSub: quickA
        ? (quickCount(quickA.key) + "/" + quickPeople.length + " người đã có điểm ở chỉ số này")
        : "",
      /* Hai nut − / + an 96px trong mot hang chi so rong 303px, ep cai thanh con
         77px -- ma chinh cai thanh moi la cho bam de cham diem. Dua chung ra sau
         mot cong tac (mac dinh TAT) thi thanh duoc 173px: vua ngan hon, vua de
         bam trung hon. Chinh tung nac van con, chi la phai bat len. */
      pfNudgeOn: !!st.pfNudge,
      /* Man hep co HAI kieu hang chi so. Doc: mot dong 30px, thanh chinh la nen
         cua hang chu khong phai mot widget beo rieng, xep hai cot -- 12 chi so
         gon trong ~315px thay vi 826px. Sua: hang cu, thanh bam duoc va nut -/+.
         Man rong khong doi gi, luon la hang sua.
         Kieu doc CO Y khong noi `set` vao hang: o kieu do cai nhan nam DE LEN
         thanh, cham trung chu "Re dat" o 30% be ngang ma bi dat thanh 6 diem thi
         khong ai ngo. Muon cham thi bat "Sua chi so" -- dung cong tac da co. */
      atRead: !!st.narrow && !(isAdmin && st.pfNudge),
      atEdit: !(!!st.narrow && !(isAdmin && st.pfNudge)),
      atMode: (!!st.narrow && !(isAdmin && st.pfNudge)) ? "read" : "edit",
      pfNudgeLabel: st.pfNudge ? "Xong" : "Sửa chỉ số",
      pfNudgeBg: st.pfNudge ? "rgba(193,212,57,0.18)" : "transparent",
      pfNudgeFg: st.pfNudge ? "#C1D439" : "rgba(250,250,255,0.7)",
      pfNudgeToggle: () => this.setState(s => ({ pfNudge: !s.pfNudge })),
      quickHint: RATE_HINT + rateNudgeHint + " So người này với người kia rồi đi tiếp chỉ số sau.",
      quickChips: ATTRS.map(a => ({
        label: a.label,
        count: quickCount(a.key) + "/" + quickPeople.length,
        bg: st.quickKey === a.key ? "rgba(104,33,220,0.35)" : "#1F2332",
        fg: st.quickKey === a.key ? "#FAFAFF" : "rgba(250,250,255,0.68)",
        line: st.quickKey === a.key ? "rgba(177,129,255,0.6)" : "rgba(255,255,255,0.08)",
        click: () => this.setState({ quickKey: a.key })
      })),
      quickList: quickA ? quickPeople.map(m => ({
        name: m.name, num: m.num ? "#" + m.num : "—",
        pos: posLabelOf(m), posColor: LINE_TONE[lineOf(m)] || "rgba(250,250,255,0.5)",
        bar: attrRow(m, quickA)
      })) : [],
      quickNextLabel: quickA
        ? ("Chỉ số tiếp theo: " + ATTRS[(quickIdx + 1) % ATTRS.length].label)
        : "",
      quickNext: () => this.setState({ quickKey: ATTRS[(quickIdx + 1) % ATTRS.length].key }),

      /* Một hàng = nhãn + một thanh bấm được. Thanh CHỨA chữ mức và con số, nên
         nó không còn là một ô vuông không lời như hai cái nút nó thay thế. */
      hasSel: !!selM && !st.quickKey,
      noSel: !selM && !st.quickKey,
      closeSel: () => this.setState({ sel: null }),
      /* Sang nguoi ke tiep ma khong phai quay ve danh sach roi tim lai. FM co
         cap mui ten nay ngay canh ten, va no la ly do doc duoc ho so ca doi:
         so sanh hai nguoi = mot cham, khong phai bon cham. Thu tu theo DUNG
         danh sach nguoi dung vua nhin (da loc, da tim), khong phai thu tu id. */
      selPager: (() => {
        if (!selM) return { has: false, prevName: "", nextName: "" };
        const list = searchedActive.filter(passFilter);
        const i = list.findIndex(m => m.id === selM.id);
        if (i < 0 || list.length < 2) return { has: false, prevName: "", nextName: "" };
        const prev = list[(i - 1 + list.length) % list.length];
        const next = list[(i + 1) % list.length];
        return {
          has: true,
          pos: (i + 1) + "/" + list.length,
          prevName: prev.name, nextName: next.name,
          goPrev: () => this.setState({ sel: prev.id }),
          goNext: () => this.setState({ sel: next.id })
        };
      })(),

      sel: selM ? (() => {
        const p = posOf(selM);
        const slotIdx = slots.indexOf(selM.id);
        const ratedPool = active.filter(m => ratingView(m).rated);
        const avg = ratedPool.length >= 3 ? ratedSquadAvg(ratedPool) : null;
        const attrOf = k => (selM.attrs && selM.attrs[k] != null) ? selM.attrs[k] : selM.rating;
        const best = ATTRS.slice().sort((a, b) => attrOf(b.key) - attrOf(a.key)).slice(0, 2);
        const selRated = ratedCount(selM);
        return {
          name: selM.name, num: selM.num || "-", phone: selM.phone || "-",
          hasPhoto: !!selM.photo,
          noPhoto: !selM.photo,
          photo: selM.photo || "",
          initial: (selM.name || "?").trim().charAt(0).toUpperCase(),
          photoBtn: selM.photo ? "Đổi ảnh" : "Thêm ảnh",
          pickPhoto: guard(e => {
            const f = e.target.files && e.target.files[0];
            e.target.value = "";
            if (!f) return;
            readImage(f).then(im => this.setState({
              photoEdit: { kind: "member", id: selM.id, url: im.url, w: im.w, h: im.h, zoom: 1, ox: 0, oy: 0 }
            })).catch(() => this.setState({ copied: "Không đọc được ảnh này." }));
          }),
          clearPhoto: guard(() => this.setState(st2 => {
            const members = st2.members.map(m => m.id === selM.id ? { ...m, photo: "" } : m);
            this.persist({ members });
            return { members, copied: "Đã xoá ảnh." };
          })),
          hurt: !!hurtOf(selM),
          noHurt: !hurtOf(selM),
          hurtLabel: (hurtOf(selM) || {}).label || "",
          hurtNote: (hurtOf(selM) || {}).note || "",
          slotId: "fm-player-" + selM.id,
          posLine: (playerDesc(selM) || "Chưa chọn vị trí")
            + (p.alt && p.alt.length ? " · đá được " + p.alt.join(" ") : "")
            + " · " + selM.type,
          /* "17 · S" không tự giải thích được: 17 trên bao nhiêu, S là hạng gì.
             Nay tiêu đề mang luôn thang điểm, và dòng dưới nói KHOẢNG của hạng
             cộng với việc điểm này lấy ở đâu ra. Chưa ai chấm chỉ số nào thì
             KHÔNG in hạng — `ratingOf` khi đó rơi về điểm cũ nhập tay, in "Hạng
             D" lên một người chưa ai đánh giá là vu cho người ta. */
          grade: selRated ? ("Hạng " + grade(selM)) : "Chưa xếp hạng",
          gradeFg: selRated ? tone(selM)[1] : "rgba(250,250,255,0.72)",
          gradeNote: selRated
            ? ("Hạng " + grade(selM) + " = " + GRADE_RANGE[grade(selM)] + " điểm · "
               + (selRated < ATTRS.length
                  ? ("mới chấm " + selRated + "/" + ATTRS.length + " chỉ số, phần còn lại tạm lấy điểm cũ")
                  : ("app tự tính từ " + ATTRS.length + " chỉ số bên dưới")))
            : "Chưa ai chấm chỉ số nào — chấm 12 chỉ số bên dưới thì mới có điểm",
          rating: selRated ? ratingOf(selM) : "—",
          ...(() => { const hb = hexBox(selRated ? ratingOf(selM) : 0); return {
            hexW: hb.w, hexH: hb.h, hexX: hb.x, hexY: hb.y, hexOn: hb.w > 0 }; })(),
          ratedNote: selRated
            ? (selRated + "/" + ATTRS.length + " chỉ số đã chấm")
            : "0/" + ATTRS.length + " chỉ số — chưa ai chấm người này",
          /* Tên in áo và size rời khỏi bảng danh sách về đây — chúng là hồ sơ
             của một người, không phải cột để so cả đội theo hàng. */
          shirt: selM.shirt || "chưa có",
          size: selM.size || "chưa có",
          /* Nhãn là "NỢ QUỸ" nên giá trị phải là một số tiền nợ, không phải "Đủ quỹ". */
          debt: debt(selM) > 0 ? this.money(debt(selM)) : "0₫",
          slotLabel: slotIdx >= 0
            ? (SLOT_NAMES[slotIdx] + " \u00b7 \u00f4 " + SLOT_ROLES[slotIdx])
            : (p.main ? ("S\u1edf tr\u01b0\u1eddng " + p.main) : "Ch\u01b0a ch\u1ecdn v\u1ecb tr\u00ed"),
          /* Chua vao doi hinh thi cau hoi that su la "so do nay co cho cho toi
             khong", chu khong phai "keo vao san di" -- cai do doi truong lam,
             khong phai cau thu dang xem ho so cua chinh minh. */
          slotNote: (() => {
            if (slotIdx >= 0) {
              return LINE_OF[p.main] === SLOT_ROLES[slotIdx]
                ? "\u0110ang \u0111\u00e1 \u0111\u00fang tuy\u1ebfn s\u1edf tr\u01b0\u1eddng."
                : "\u0110ang \u0111\u00e1 l\u1ec7ch tuy\u1ebfn s\u1edf tr\u01b0\u1eddng.";
            }
            if (!p.main) return "Ch\u1ecdn v\u1ecb tr\u00ed \u1edf th\u1ebb H\u1ed2 S\u01a0 \u0111\u1ec3 s\u00e2n bi\u1ebft v\u1ebd anh \u1edf \u0111\u00e2u.";
            const f = slotsForPos(FM_.labels, p.main);
            if (f.exact.length) {
              const free = f.exact.filter(k => !slots[k]).length;
              return "Sơ đồ " + effFormation + " có " + f.exact.length + " ô " + p.main + " — "
                + (free === 0 ? (f.exact.length > 1 ? "đều đã có người." : "đã có người giữ.")
                : (free === f.exact.length ? "chưa ai giữ." : ("còn " + free + " ô trống.")));
            }
            if (f.line.length) return "S\u01a1 \u0111\u1ed3 " + effFormation + " kh\u00f4ng c\u00f3 \u00f4 " + p.main
              + ", g\u1ea7n nh\u1ea5t l\u00e0 " + [...new Set(f.line.map(k => FM_.labels[k]))].join(" ") + ".";
            return "S\u01a1 \u0111\u1ed3 " + effFormation + " kh\u00f4ng c\u00f3 tuy\u1ebfn n\u00e0y.";
          })(),
          dobLine: (() => {
            const d = String(selM.dob || "").trim();
            if (!d) return "";
            const age = ageFrom(d);
            return d + (age == null ? "" : " · " + age + " tuổi");
          })(),
          hasDob: !!String(selM.dob || "").trim(),
          born: String(selM.born || "").trim(),
          hasBorn: !!String(selM.born || "").trim(),
          nat: String(selM.nat || "").trim(),
          hasNat: !!String(selM.nat || "").trim(),
          type: selM.type,
          typeNote: selM.type === "Đá cứng"
            ? "quân chính — được cộng điểm ưu tiên khi xếp đội hình tự động"
            : "quân bổ sung — chỉ vào đội hình tự động khi thiếu người",
          posLabel: posLabelOf(selM), posColor: LINE_TONE[lineOf(selM)] || "rgba(250,250,255,0.64)",
          attendLabel: attendLabel(selM.id), attendColor: attendColor(selM.id), attendBg: attendBg(selM.id),
          /* Chưa chấm thì mọi kết luận rút ra từ bảng chỉ số đều là kết luận về
             điểm cũ nhập tay, không phải về người này. Nói thẳng là chưa biết. */
          compare: !selRated ? "chưa chấm chỉ số nên chưa so được"
            : (avg == null ? "chưa đủ người được chấm để so"
            : ptGapText(ratingOf(selM), avg)),
          strengths: selRated ? best.map(b => b.label).join(", ") : "chưa chấm chỉ số",
          games: selM.games || 0, goals: selM.goals || 0, assists: selM.assists || 0,
          mvp: selM.mvp || 0, cards: (selM.y || 0) + "V / " + (selM.r || 0) + "Đ",
          /* The "MUA NAY" tren ho so. Trong tai vong 15: o cot 4 cua luoi (312x422)
             chi co mot dong chu + hai nut, ~360px trong, trong khi phan luoi, the,
             no quy, diem danh deu co du lieu ma khong hien o ho so. Cung mot quy uoc
             voi bang: 0 ra dau gach. */
          sOg: statCell(selM.og), sY: statCell(selM.y), sR: statCell(selM.r),
          /* Cung mot ho so, cach nhau mot cuon chuot: the KPI ghi "NO QUY
             95.000d" con dong nay ghi "—". Cung loi voi cot NO QUY o Thong ke:
             `owed` la SO BUOI chua dong chu khong phai so tien, va no bo qua
             dong tien san lan tien buoi dang mo. Dung chung `debt` voi moi cho
             khac. (Va cach in cu "Math.round(owed/1000) + '.000d'" bien 2 buoi
             thanh "0.000d" -- vua sai don vi vua sai so.) */
          sDebt: debt(selM) > 0 ? this.money(debt(selM)) : "—",
          sDebtColor: debt(selM) > 0 ? "#FF6B57" : "rgba(250,250,255,0.62)",
          sAttend: attendLabel(selM.id), sAttendColor: attendColor(selM.id)
        };
      })() : {},
      selPitch: (() => {
        const pp = selM ? posOf(selM) : { main: "", alt: [] };
        const fit = slotsForPos(FM_.labels, pp.main);
        const altFit = (pp.alt || []).reduce((a2, c) => a2.concat(slotsForPos(FM_.labels, c).exact), []);
        return SLOT_ROLES.map((role, i2) => {
          const inXI = !!selM && slots[i2] === selM.id;
          const exact = fit.exact.indexOf(i2) >= 0;
          const alt = altFit.indexOf(i2) >= 0;
          const near = fit.line.indexOf(i2) >= 0;
          return {
            left: FM_.pos[i2][0], top: FM_.pos[i2][1],
            /* O nay ve MOT SO DO va to mau nhung o hop voi nguoi dang xem. Nhan
               thi giong het nhau o moi ho so (day la cac o cua so do, khong phai
               cua nguoi), nen trong tai vong 10 doc xong ket luan "hardcoded, ve
               y het nhau cho moi cau thu". Dat SO AO vao o anh ta dang dung: no
               khac nhau giua hai ho so ngay tu cai nhin dau. */
            label: (inXI && selM && selM.num) ? String(selM.num) : FM_.labels[i2],
            title: FM_.labels[i2] + (inXI ? " · " + (selM ? selM.name : "") + " đang đá ở đây"
                   : (exact ? " · sở trường" : (alt ? " · đá được" : (near ? " · cùng tuyến" : "")))),
            // Dang da o do > o dung so truong > o vi tri phu > cung tuyen > con lai
            bg: inXI ? kit
              : (exact ? "#C1D439"
              : (alt ? "rgba(193,212,57,0.45)"
              : (near ? "rgba(255,255,255,0.18)" : "rgba(9,15,29,0.5)"))),
            fg: (exact && !inXI) ? "#090F1D" : "#fff",
            ring: (inXI || exact) ? "2px" : "1px"
          };
        });
      })(),
      selAttrGroups: (() => {
        if (!selM) return [];
        return ATTR_BLOCKS.map((g, i) => ({
          title: g.title,
          /* Hinh ba mat cau thu ton 319px chi de noi ba con so: trung binh ba nhom.
             Ba con so do KHONG co trong bang chi so (bang chi hien 12 gia tri le)
             nen no khong thua -- nhung doc chung ngay tren dau nhom dang doc thi
             dung cho hon va ton 0px. ratedAvg tra null khi nhom chua cham du, nen
             khong bao gio bia ra mot con so trung binh nua voi. */
          avg: (() => { const v = posAvg(selM && selM.attrs, g.list, isKeeper(selM)); return v == null ? "" : "TB " + v; })(),
          /* Màn chấm nhanh nói ra cách dùng thanh; hồ sơ thì không, nên 12 thanh
             ở đây trông như biểu đồ để đọc. Một lần, ở nhóm đầu tiên. */
          /* Kieu doc khong co thanh nao bam duoc, nen cau "Bam vao thanh o vi tri
             muon cham" o do la mot loi noi doi. Chi hien khi dang o kieu sua. */
          hasHint: i === 0 && isAdmin && !(!!st.narrow && !st.pfNudge),
          hint: RATE_HINT + rateNudgeHint,
          list: g.list.map(a => attrRow(selM, a))
        }));
      })(),

      /* ---------- mạng nhện ba nhóm ----------
         Chỉ vẽ khi cả ba nhóm có đủ số THẬT. Người chưa ai chấm mà vẽ ra một
         hình đều tăm tắp thì hình đó trông y như một kết luận — đúng cái bẫy
         thẻ cầu thủ đã gỡ. Chưa đủ thì nói còn thiếu bao nhiêu và chỉ đường. */
      selRadar: (() => {
        if (!selM) return {};
        const at = selM.attrs || {};
        const done = ATTR_BLOCKS.map(b => b.list.filter(a => isFinite(parseFloat(at[a.key]))).length);
        const need = ATTR_BLOCKS.map(b => b.list.length);
        const ready = done.every((d, i) => d === need[i]);
        // Mang nhen cung phai bo Bat gon ra khoi nhom phong ngu cua cau thu san,
        // khong thi hinh ve mot dinh thut vao vi mot chi so ho khong dung.
        const vals = ATTR_BLOCKS.map(b => posAvg(at, b.list, isKeeper(selM)) || 0);
        const CX = 105, CY = 100, R = 66;
        return {
          ready: ready, notReady: !ready,
          shape: ready ? radarPoints(vals, 20, CX, CY, R) : "",
          rings: [5, 10, 15, 20].map(v => ({
            pts: radarPoints([v, v, v], 20, CX, CY, R),
            line: v === 20 ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.1)"
          })),
          spokes: radarPoints([20, 20, 20], 20, CX, CY, R).split(" ").map(pt => ({
            x: pt.split(",")[0], y: pt.split(",")[1], cx: CX, cy: CY
          })),
          axes: ATTR_BLOCKS.map((b, i) => {
            const pt = radarPoints([0, 0, 0].map((_, j) => j === i ? 20 : 0), 20, CX, CY, R)
              .split(" ")[i].split(",");
            const x = parseFloat(pt[0]), y = parseFloat(pt[1]);
            return {
              label: b.short, value: ready ? vals[i] : "—",
              color: ready ? attrLevel(vals[i]).color : "rgba(250,250,255,0.4)",
              x: Math.round(CX + (x - CX) * 1.15),
              y: Math.round(CY + (y - CY) * 1.15) + (y < CY ? -8 : 16)
            };
          }),
          missing: (() => {
            const left = need.reduce((n, v, i) => n + (v - done[i]), 0);
            return left === ATTRS.length
              ? "Chưa ai chấm chỉ số nào cho người này."
              : ("Còn " + left + "/" + ATTRS.length + " chỉ số chưa chấm.");
          })(),
          why: "Chưa đủ số thì không vẽ — một hình đều tăm tắp trông như đã đánh giá xong."
        };
      })(),

      /* Nhan dai ("TRAN DA DA", "HAY NHAT TRAN") xuong hai-ba dong trong o rong
         104px, keo ca luoi nam o len ~370px. Nhan ngan lai; y nghia day du van
         con o `note` (tooltip + dong phu tren man rong). */
      /* Bang theo-tung-tran duoi dai KPI. Tran cu (seed) khong ghi xi/events nen
         doi mau ra rong -- khi do noi "chua co tran nao ghi ten", KHONG bia. */
      selMatches: selM ? memberMatchRows(teamMatches, selM.id).map(r => ({
        opp: r.opp, date: r.date, score: r.score, result: r.result,
        resultColor: r.result === "T" ? "#75CE50" : r.result === "B" ? "#FF6B57" : "rgba(250,250,255,0.6)",
        role: r.started ? "đá chính" : "vào sân",
        goals: r.goals ? String(r.goals) : "—", assists: r.assists ? String(r.assists) : "—",
        mvp: r.mvp ? "MVP" : "",
        cards: (r.y ? r.y + "V" : "") + (r.y && r.r ? " " : "") + (r.r ? r.r + "Đ" : ""),
        og: r.og ? String(r.og) : ""
      })) : [],
      selMatchesNone: !!selM && memberMatchRows(teamMatches, selM.id).length === 0,
      selMatchesCount: selM ? memberMatchRows(teamMatches, selM.id).length + " trận có ghi tên" : "",
      hasForm: !!(selM && formSummary(memberMatchRows(teamMatches, selM.id), 5)),
      formLine: selM ? ((formSummary(memberMatchRows(teamMatches, selM.id), 5) || {}).line || "") : "",
      selKpis: selM ? [
        { icon: "IconSquad", label: "TRẬN", value: String(selM.games || 0), note: "số buổi có mặt", color: "#6990FF" },
        { icon: "IconIncrease", label: "BÀN", value: String(selM.goals || 0), note: "ghi trong các buổi đã chốt", color: "#C1D439" },
        { icon: "IconCompare", label: "KIẾN TẠO", value: String(selM.assists || 0), note: "đường chuyền thành bàn", color: "#75CE50" },
        { icon: "IconThumbsUp", label: "HAY NHẤT", value: String(selM.mvp || 0), note: "số lần được chọn MVP", color: "#D16BF4" },
        { icon: "IconWarn", label: "THẺ", value: (selM.y || 0) + "V/" + (selM.r || 0) + "Đ", note: "vàng / đỏ mùa này", color: "#F79009" }
        /* "NO QUY" tung o day nua: cung mot nhan, cung mot con so voi o trong the
           dau ho so -- in hai lan tren cung mot trang. Bo ban duoi, giu ban tren vi
           no noi bat hon va tien no la thu can thay ngay. Bo di con lam luoi nay
           thuan nhat: nam o con lai deu la thanh tich tran, khong con mot o tien
           lac loai giua. */
      ] : [],
      selPosChips: selM ? (() => {
        const p = posOf(selM), main = p.main, alt = p.alt || [];
        return POS_CODES.map(c => {
          const isMain = main === c, isAlt = alt.indexOf(c) >= 0;
          return {
            label: c,
            bg: isMain ? "rgba(104,33,220,0.35)" : (isAlt ? "rgba(193,212,57,0.16)" : "#1F2332"),
            fg: isMain ? "#FAFAFF" : (isAlt ? "#C1D439" : "rgba(250,250,255,0.7)"),
            line: isMain ? "rgba(177,129,255,0.6)" : (isAlt ? "rgba(193,212,57,0.45)" : "rgba(255,255,255,0.08)"),
            click: guard(() => this.setState(s => {
              const nx = posCycle(posOf(selM), c);
              const members = s.members.map(m => m.id === selM.id
                ? { ...m, posMain: nx.main, posAlt: nx.alt, pos: posToText(nx) } : m);
              this.persist({ members });
              return { members, copied: posCycleSay(selM.name, c, nx) };
            }))
          };
        });
      })() : [],

      /* ---------- cat anh ho so ---------- */
      /* Keo tha khong lam duoc: dc-mini khong gan `pointermove`, va no ve lai
         ca cay sau moi setState nen phan tu dang keo bi huy giua chung. Ba
         thanh truot chay bang su kien `input` -- thu runtime nay co that. */
      photoEditOn: !!st.photoEdit,
      photoEd: (() => {
        const p = st.photoEdit;
        if (!p) return { url: "", w: 0, h: 0, zoom: 1, ox: 0, oy: 0, imgStyle: "", canPan: false, name: "" };
        const BOX = 132, b = cropBox(p.w, p.h, p.zoom, p.ox, p.oy);
        // Cung cropBox voi luc luu, nen o xem truoc khong the noi doi ve o cat.
        const k = b.sw ? BOX / b.sw : 1;
        const who = p.kind === "team"
          ? ((st.teams.find(t => t.id === p.id) || {}).name || "đội")
          : ((st.members.find(m => m.id === p.id) || {}).name || "");
        return {
          url: p.url, zoom: p.zoom, ox: p.ox, oy: p.oy, name: who,
          canPan: Math.abs(p.w - p.h) > 1 || p.zoom > 1,
          imgStyle: "position:absolute; left:0; top:0; width:" + Math.round(p.w * k)
            + "px; height:" + Math.round(p.h * k) + "px; max-width:none; transform:translate("
            + (-b.sx * k).toFixed(1) + "px," + (-b.sy * k).toFixed(1) + "px)"
        };
      })(),
      setPhotoZoom: e => this.photoSet("zoom", parseFloat(e.target.value)),
      setPhotoOx: e => this.photoSet("ox", parseFloat(e.target.value)),
      setPhotoOy: e => this.photoSet("oy", parseFloat(e.target.value)),
      photoCancel: () => this.setState({ photoEdit: null }),
      photoSave: () => {
        const p = this.state.photoEdit;
        if (!p) return;
        cropFromUrl(p.url, p.zoom, p.ox, p.oy).then(uri => this.setState(st2 => {
          const patch = p.kind === "team"
            ? { teams: st2.teams.map(t => t.id === p.id ? { ...t, logo: uri } : t) }
            : { members: st2.members.map(m => m.id === p.id ? { ...m, photo: uri } : m) };
          const ok = this.persist(patch);
          // persist tra ve false khi kho day. Noi ra, dung im lang nuot anh.
          if (ok === false) return { photoEdit: null, copied: "Máy không còn chỗ lưu ảnh." };
          return Object.assign({ photoEdit: null, copied: "Đã lưu ảnh." }, patch);
        })).catch(() => this.setState({ photoEdit: null, copied: "Không cắt được ảnh này." }));
      },

      /* ---------- fund ---------- */
      debtors,
      noDebt: debtors.length === 0,
      noDebtClean: debtors.length === 0 && pend.length === 0,
      chart: mArr.map(m => ({
        // "08/26" read as a day/month date now that ledger rows say "28/8".
        // "T8" cannot be misread; the year is only shown when it is not this one.
        label: "T" + Number(m.k.slice(5)) + (m.k.slice(0, 4) === String(now.getFullYear()) ? "" : "/" + m.k.slice(2, 4)),
        inH: Math.max(2, Math.round(m.in / peak * 140)) + "px",
        outH: Math.max(2, Math.round(m.out / peak * 140)) + "px",
        // Cot rong van phai co vach 2px: khong ve gi doc ra "thang nay khong ton
        // tai", vach sat day doc ra "thang nay khong co dong nao".
        inLabel: m.in ? shortVnd(m.in) : "",
        outLabel: m.out ? shortVnd(m.out) : "",
        labelColor: (m.in || m.out) ? "rgba(250,250,255,0.72)" : "rgba(250,250,255,0.34)"
      })),
      ledger: teamLedger.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).map((t, i) => ({
        label: t.label, date: dmy(t.date), rowBg: stripe(i),
        amount: (t.v > 0 ? "+" : "") + this.money(t.v),
        color: t.v > 0 ? "#C1D439" : "#D16BF4",
        canDel: isAdmin,
        del: guard(() => this.setState(s => {
          const ledger = s.ledger.filter(x => x.id !== t.id);
          /* Xoa mot dong thu tien san phai go lai CA NAM cho ma "Da dong" da dat,
             khong chi so du. Khong thi nguoi do bien mat khoi ca quy lan danh
             sach no, va so sach lech dung so tien do ma khong gi noi ra. */
          const src = t.src;
          if (src && src.kind === "dues") {
            const members = s.members.map(x => x.id === src.memberId ? { ...x, owed: src.owedBefore || 0 } : x);
            const ids = {};
            (src.chargeIds || []).forEach(i2 => { ids[i2] = 1; });
            const charges = (s.charges || []).map(c => ids[c.id] ? { ...c, paid: false } : c);
            const cur = { ...((s.attendByOcc || {})[src.occ] || {}) };
            if (src.attBefore) cur[src.memberId] = src.attBefore; else delete cur[src.memberId];
            const attendByOcc = { ...s.attendByOcc, [src.occ]: cur };
            const po = { ...((s.paidByOcc || {})[src.occ] || {}) };
            delete po[src.memberId];
            const paidByOcc = { ...s.paidByOcc, [src.occ]: po };
            const out = { ledger, members, charges, attendByOcc, paidByOcc };
            this.persist(out);
            return { ...out,
              undo: { state: { ledger: s.ledger, members: s.members, charges: s.charges, attendByOcc: s.attendByOcc, paidByOcc: s.paidByOcc } },
              copied: "Đã xoá dòng thu — người này quay lại danh sách còn nợ." };
          }
          this.persist({ ledger });
          return { ledger, undo: { state: { ledger: s.ledger } }, copied: "Đã xoá giao dịch." };
        }))
      })),
      noLedger: teamLedger.length === 0,
      tx: st.tx,
      setTLabel: e => this.txSet("label", e.target.value),
      setTAmount: e => this.txSet("amount", e.target.value),
      setTType: e => this.txSet("type", e.target.value),
      addTx: guard(() => this.setState(s => {
        const v = s.tx;
        if (!String(v.label).trim()) return { copied: "Điền nội dung đã." };
        const badMoney = moneyProblem(v.amount);
        if (badMoney) return { copied: badMoney };
        const amount = parseInt(String(v.amount).replace(/\D/g, ""), 10) || 0;
        const d0 = new Date();
        const ledger = [{
          teamId: teamId, id: Date.now(), label: v.label.trim(),
          date: d0.getFullYear() + "-" + String(d0.getMonth() + 1).padStart(2, "0") + "-" + String(d0.getDate()).padStart(2, "0"),
          v: v.type === "in" ? amount : -amount
        }].concat(s.ledger);
        this.persist({ ledger });
        return { ledger, tx: { label: "", amount: "", type: v.type }, copied: "Đã ghi vào sổ quỹ." };
      })),

      /* ---------- stats: match log + result form ---------- */
      insightGames: teamMatches.filter(g => g.formation).length,
      hasInsight: !insight.thin && insightCount > 0,
      insightThin: insight.thin || insightCount === 0,
      insightThinNote: insight.thin
        ? ("Mới " + insight.sample + " trận có tỉ số — cần ít nhất 3 trận mới rút ra được gì.")
        : ("Đã xem " + insight.sample + " trận gần nhất, chưa thấy khác biệt nào đủ rõ để nói."),
      insightSample: insight.sample + " trận gần nhất",
      insightPos: insight.pos,
      insightNeg: insight.neg,
      insightsNone: !teamMatches.filter(g => g.formation).length,
      insightsCount: teamMatches.filter(g => g.formation).length + " tr\u1eadn c\u00f3 ghi \u0111\u1ed9i h\u00ecnh",
      insightsFormation: tallyBy(teamMatches.filter(g => g.formation), g => g.formation, k => k),
      insightsMentality: tallyBy(teamMatches.filter(g => g.formation), g => g.mentality,
        k => ({ def: "Ph\u00f2ng ng\u1ef1", bal: "C\u00e2n b\u1eb1ng", att: "T\u1ea5n c\u00f4ng" }[k] || k)),
      /* Bon tran gan nhat, cho o trong 1508x252px o day cot trai Tong quan. Doc
         cung `teamMatches` voi man Lich su tran, chi lay bon dong dau va rut gon --
         khong bang so lieu nao moi, khong con so nao khong co san. */
      recentMatches: teamMatchesRecent.slice(0, 4).map(o => o.m).map(g => {
        const w = g.gf > g.ga, d = g.gf === g.ga;
        return {
          opp: g.opp || g.date || "-",
          date: g.opp ? dmyShow(g.date) : "",
          score: g.gf + "-" + g.ga,
          tag: w ? "T" : (d ? "H" : "B"),
          tagBg: w ? "rgba(117,206,80,0.16)" : (d ? "rgba(255,255,255,0.06)" : "rgba(236,46,26,0.16)"),
          tagFg: w ? "#75CE50" : (d ? "rgba(250,250,255,0.7)" : "#FF7F6B")
        };
      }),
      recentNone: teamMatches.length === 0,
      matches: teamMatchesRecent.map((o, i) => { const g = o.m;
        // The seeded rows carry the opponent in `date`; real rows written by
        // saveResult carry both. Read defensively so neither shape renders blank.
        const opp = g.opp || g.date || "-";
        const dt = g.opp ? dmyShow(g.date) : "";
        const w = g.gf > g.ga, d = g.gf === g.ga;
        return {
          rowBg: stripe(i), date: dt, venue: g.venue || "", opp: opp,
          /* Mo lai tran nay trong o ghi ket qua phia tren. Khong tu cuon len --
             dc-mini ve lai ca DOM moi lan doi state nen phan tu cu bien mat truoc
             khi cuon xong; dong chu tren nut Luu doi thanh "Dang sua tran ..." de
             nguoi dung biet o tren dang giu gi. */
          openEdit: () => this.setState({ res: {
            opp: opp === "-" ? "" : opp,
            gf: String(g.gf == null ? "" : g.gf),
            ga: String(g.ga == null ? "" : g.ga),
            venue: g.venue || "S.NHÀ",
            day: dt || "",
            events: (g.events || []).slice(),
            evWho: "", evKind: "goal", evMin: "",
            editId: g.id == null ? null : g.id,
            editIx: o.ix,
            editSig: [g.date || "", opp, g.gf, g.ga].join("|")
          }, copied: "Đang sửa trận " + (opp === "-" ? "này" : opp) + " — ô ghi kết quả ở đầu trang." }),
          score: g.gf + "-" + g.ga,
          result: w ? "THẮNG" : (d ? "HÒA" : "THUA"),
          tagBg: w ? "rgba(117,206,80,0.16)" : (d ? "rgba(255,255,255,0.06)" : "rgba(236,46,26,0.16)"),
          tagFg: w ? "#75CE50" : (d ? "rgba(250,250,255,0.7)" : "#FF7F6B"),
          /* O doi thu tung rong 1607px de chua ~90px chu, 8 hang. Phan con lai cua
             hang nay doc len thu app da luu cho tran do: chuyen trong tran va so do
             da da. Tran cu (seed) khong co ca hai -> de trong, khong bia. */
          /* O trong thi khong duoc de trong trang, cung khong duoc dat dau gach:
             trang doc ra "hong", dau gach doc ra "khong co gi xay ra". Su that la
             "chua ghi" -- noi dung chu do, mo di, va no cung la loi moi ghi. */
          summary: matchEvSummary(g.events, id => { const m = byId(id); return m ? m.name : ""; }) || "chưa ghi chuyện trong trận",
          hasSummary: !!matchEvSummary(g.events, () => "x"),
          // .32 la 2,7:1 -- chu giu cho van la chu, van phai qua 4,5:1. .55 = 5,5:1.
          summaryColor: matchEvSummary(g.events, () => "x") ? "rgba(250,250,255,0.72)" : "rgba(250,250,255,0.55)",
          shape: g.formation ? (g.formation + (Array.isArray(g.xi) && g.xi.length ? " · " + g.xi.length + " người" : "")) : "",
          hasShape: !!g.formation
        };
      }),
      noMatches: teamMatches.length === 0,
      /* ---------- phòng truyền thống ---------- */
      /* Ba thu, khong phai mot bang thanh tich game: cai doi da an, mua nay
         da di den dau, va ai dang dan dau. Diem XP thi khong co -- day la
         bao tang cua doi, khong phai bang xep hang cua mot tro choi. */
      /* Dong thoi gian: cup va tran nam chung mot dong, moi nhat tren cung.
         Doc mot mach ra duoc chuyen cua doi, thay vi hai bang roi nhau. */
      /* Dong thoi gian, hoc tu Manager Timeline cua Football Manager.
         Ba thu FM lam ma day thieu: moc NAM tren duong, the phan HANG (danh
         hieu khac su kien thuong), va thanh dem danh hieu. FM xep ngang va so
         le hai ben duong -- o day giu doc, vi doi doc bang dien thoai va cuon
         ngang tren dien thoai la mot hinh phat. */
      timeline: withYearMarks(clubTimeline(teamMatches, st.trophies.filter(inTeam))).map((e, i) => {
        const win = e.kind === "match" && e.gf > e.ga;
        const draw = e.kind === "match" && e.gf === e.ga;
        const cup = e.kind === "trophy" && e.place === "Vô địch";
        return {
          isYear: e.kind === "year",
          yearLabel: e.kind === "year" ? (e.year == null ? "chưa rõ năm" : String(e.year)) : "",
          isEvent: e.kind !== "year",
          // The danh hieu mang sac vang kim rieng, dung cach FM tach "rare
          // event" khoi su kien thuong -- mot cai liec la biet cho nao la cup.
          /* Tran cung mang mau ket qua chu khong dung chung mot nen phang: truoc do
             chin the tran deu la #161925, chi cham ben trai doi mau. Doc mot dong
             thoi gian ma phai soi tung cham 9px moi biet thang hay thua. */
          cardBg: cup ? "rgba(232,243,0,0.10)" : (e.kind === "trophy" ? "rgba(220,225,235,0.07)"
            : (e.kind === "first" ? "rgba(209,107,244,0.09)"
            : (win ? "rgba(117,206,80,0.09)" : (draw ? "#161925" : "rgba(255,127,107,0.08)")))),
          cardLine: cup ? "rgba(232,243,0,0.45)" : (e.kind === "trophy" ? "rgba(220,225,235,0.28)"
            : (e.kind === "first" ? "rgba(209,107,244,0.34)"
            : (win ? "rgba(117,206,80,0.32)" : (draw ? "rgba(255,255,255,0.09)" : "rgba(255,127,107,0.30)")))),
          cardEdge: cup ? "#E8F300" : (e.kind === "trophy" ? "#DCE1EB"
            : (e.kind === "first" ? "#D16BF4" : (win ? "#75CE50" : (draw ? "rgba(250,250,255,0.34)" : "#FF7F6B")))),
          isMatch: e.kind === "match",
          isTrophy: e.kind === "trophy",
          isFirst: e.kind === "first",
          // Nhan nho tren dau the: danh hieu thi ghi HANG + NAM, tran thi ghi ngay.
          eyebrow: e.kind === "trophy"
            ? (e.place + (e.year != null ? " · " + e.year : "")).toUpperCase()
            : (e.date || (e.year != null ? String(e.year) : "chưa rõ khi nào")),
          eyebrowFg: cup ? "#E8F300" : (e.kind === "trophy" ? "#DCE1EB" : "rgba(250,250,255,0.6)"),
          dotColor: cup ? "#E8F300" : (e.kind === "trophy" ? "#DCE1EB"
            : (e.kind === "first" ? "#D16BF4" : (win ? "#75CE50" : (draw ? "rgba(250,250,255,0.5)" : "#FF7F6B")))),
          headline: e.kind === "trophy" ? e.title
            : (e.kind === "first" ? ("Trận đầu tiên của đội · gặp " + e.opp)
            : (e.opp + " " + e.gf + "-" + e.ga)),
          tag: e.kind === "match" ? (win ? "THẮNG" : (draw ? "HÒA" : "THUA")) : "",
          hasTag: e.kind === "match",
          tagBg: win ? "rgba(117,206,80,0.16)" : (draw ? "rgba(255,255,255,0.06)" : "rgba(236,46,26,0.16)"),
          tagFg: win ? "#75CE50" : (draw ? "rgba(250,250,255,0.7)" : "#FF7F6B"),
          note: e.note || "",
          hasNote: !!e.note
        };
      }),
      noTimeline: !clubTimeline(teamMatches, st.trophies.filter(inTeam)).length,
      hasTimeline: !!clubTimeline(teamMatches, st.trophies.filter(inTeam)).length,
      /* Thanh dem duoi day, kieu "2 Trophies · 0 Major Awards" cua FM. Tach cup
         vo dich khoi "co huy chuong": gop chung thi con so khong con nghia. */
      tlCups: (() => { const t = trophyTally(st.trophies.filter(inTeam));
        return t.cups + (t.cups === 1 ? " cúp vô địch" : " cúp vô địch"); })(),
      tlPodium: (() => { const t = trophyTally(st.trophies.filter(inTeam));
        return t.podium + " lần có huy chương"; })(),
      tlMatches: teamMatches.length + " trận đã ghi",

      hall: (() => {
        const R = seasonRecord(teamMatchesRecent.map(o => o.m));
        const FORM_TONE = { w: ["#75CE50", "T"], d: ["rgba(250,250,255,0.68)", "H"], l: ["#FF7F6B", "B"] };
        const line = g => g ? (oppOf(g) + " " + g.gf + "-" + g.ga) : "";
        return {
          hasMatch: R.p > 0,
          noMatch: R.p === 0,
          played: R.p, w: R.w, d: R.d, l: R.l,
          gf: R.gf, ga: R.ga,
          gd: (R.gd > 0 ? "+" : "") + R.gd,
          gdColor: R.gd > 0 ? "#75CE50" : (R.gd < 0 ? "#FF6B57" : "rgba(250,250,255,0.7)"),
          winPct: R.p ? Math.round(R.w / R.p * 100) + "%" : "—",
          form: R.form.map(k => ({ ch: FORM_TONE[k][1], fg: FORM_TONE[k][0],
            bg: k === "w" ? "rgba(117,206,80,0.16)" : (k === "l" ? "rgba(236,46,26,0.16)" : "rgba(255,255,255,0.06)") })),
        /* "5 tran gan nhat" chi dung khi app BIET tran nao gan nhat. Ban ghi khong
           co ngay thi thu tu tren man la thu tu NHAP, khong phai thu tu thoi gian --
           dan nhan "gan nhat" len do la noi mot dieu khong biet. */
        formNote: R.form.length + (datedAll ? " trận gần nhất · " : " trận đã nhập gần đây · ") + R.formW + " thắng",
          hasBest: !!R.best, best: line(R.best),
          hasWorst: !!R.worst, worst: line(R.worst),
          homeLine: R.home.w + "T " + R.home.d + "H " + R.home.l + "B",
          awayLine: R.away.w + "T " + R.away.d + "H " + R.away.l + "B"
        };
      })(),
      /* Ba bang vang. Ba cot so khong thi khong ai chup gui vao nhom Zalo --
         va con sai nua: no doc thanh "ca doi khong ai ghi ban", chu khong
         phai "chua tran nao dong so trong app". Chua co so lieu thi noi
         thang la chua co, kem cai viec phai lam. */
      boards: METRICS.filter(x => x.id !== "rating").map(met => {
        /* Pha hoa GIONG HET bang xep hang o man Thong ke va giong `honourBoard`.
           Truoc do o day chi so sanh gia tri, nen hai nguoi cung 3 ban thi thu tu
           do vi tri trong mang quyet dinh -- trong tai vong 26 doc ra "Bang vang"
           xep Hoang Tien Dung hang 3 con Thong ke xep Ly Thanh Trung hang 3, cung
           mot bo so, hai cau tra loi. */
        const top = active.slice()
          .filter(m => (met.get(m) || 0) > 0)
          .sort((a2, b) => (met.get(b) || 0) - (met.get(a2) || 0)
            || (parseFloat(b.rating) || 0) - (parseFloat(a2.rating) || 0)
            || String(a2.name || "").localeCompare(String(b.name || ""), "vi"))
          .slice(0, 3);
        return {
          label: met.label, unit: met.unit,
          empty: top.length === 0,
          rows: top.map((m, i) => ({
            rank: i + 1,
            medalBg: MEDALS[i][0], medalFg: MEDALS[i][1],
            name: m.name,
            value: met.id === "games" ? ((met.get(m) || 0) + "/" + teamMatches.length)
                                      : (met.get(m) || 0)
          }))
        };
      }),
      boardsEmpty: METRICS.filter(x => x.id !== "rating")
        .every(met => !active.some(m => (met.get(m) || 0) > 0)),
      closedCount: teamMatches.length + " trận đã ghi",
      gotoLog: () => this.setState({ tab: "fund", teamView: "log", sel: null }),
      trophies: trophySort(st.trophies.filter(inTeam)).map((t, i) => ({
        rowBg: stripe(i),
        title: t.title || "—",
        year: t.year ? String(t.year) : "chưa rõ năm",
        place: trophyPlace(t.place).label,
        placeBg: t.place === "champion" ? "rgba(232,243,0,0.14)"
          : (t.place === "runnerup" ? "rgba(220,225,235,0.12)"
          : (t.place === "third" ? "rgba(198,124,60,0.14)" : "rgba(255,255,255,0.06)")),
        placeFg: t.place === "champion" ? "#E8F300"
          : (t.place === "runnerup" ? "#DCE1EB"
          : (t.place === "third" ? "#C67C3C" : "rgba(250,250,255,0.7)")),
        note: t.note || "",
        hasNote: !!t.note,
        del: guard(() => this.delTrophy(t.id))
      })),
      /* Bang vinh danh nguoi that. "Phong truyen thong" truoc day chi co tu danh
         hieu cua DOI (dang trong) va danh sach ket qua tran -- khong mot ten cau
         thu nao, trong khi app da luu du ban thang / kien tao / hay nhat tran /
         so tran cua tung nguoi. Chu doi noi thang: nguoi ta phai thay minh trong
         do. `honourBoard` la ham thuan, da co bo kiem thu rieng. */
      honourCards: (() => {
        const TONE = { goals: "#C1D439", assists: "#75CE50", mvp: "#D16BF4", games: "#6990FF" };
        return honourBoard(active).map(h => ({
          title: h.title,
          value: String(h.value),
          unit: h.unit,
          tone: TONE[h.key] || "#C1D439",
          // Vien mang mau giai o muc rat mo: du de bon the khac nhau tu xa, khong
          // du de doc thanh mot canh bao.
          ring: (TONE[h.key] || "#C1D439") + "3d",
          /* Bon nguoi cung 8 tran thi noi het bon ten ra la mot dong chu chay dai
             va cai the thoi con la mot loi vinh danh. Hai ten roi "+N nguoi". */
          name: h.names.slice(0, 2).join(" · ") + (h.names.length > 2 ? " +" + (h.names.length - 2) : ""),
          /* Anh that neu co. App da cho tai anh o ho so ("Them anh") nhung bang
             vinh danh lai ve mot chu cai -- dung chinh khuon mat nguoi ta khi co. */
          photo: (h.photo || ""), hasPhoto: !!h.photo, noPhoto: !h.photo,
          /* Mot CAU, khong chi mot con so. Trong tai: "B co con so va khong co cau
             van. Voi doi cuoi tuan thi cau van moi la tat ca." */
          line: (() => {
            const who = h.names.length > 1 ? (h.names.length + " người") : h.names[0];
            if (h.key === "goals") return who + " ghi " + h.value + " bàn" + (h.games ? " trong " + h.games + " trận" : "") + " — nhiều nhất đội.";
            if (h.key === "assists") return who + " kiến tạo " + h.value + " bàn cho đồng đội — nhiều nhất đội.";
            if (h.key === "mvp") return who + " được cả đội chọn hay nhất trận " + h.value + " lần.";
            return who + " có mặt " + h.value + " buổi — không ai đi nhiều hơn.";
          })(),
          initial: (h.names[0] || "?").trim().split(/\s+/).slice(-1)[0].charAt(0).toUpperCase(),
          num: (h.names.length === 1 && h.nums[0]) ? ("#" + h.nums[0]) : "",
          shared: h.names.length > 1 ? (h.names.length + " người đồng hạng") : "",
          // "0,7 ban moi tran" chi noi khi da du 3 tran va khong dong hang.
          perLine: h.per != null ? (String(h.per).replace(".", ",") + " " + h.unit + " mỗi trận · " + h.games + " trận") : "",
          rest: h.rest.map(r => ({ name: r.name, value: String(r.value) })),
          hasRest: !!h.rest.length
        }));
      })(),
      noHonour: !honourBoard(active).length,
      // Nhan thu tu cua dong thoi gian: chi noi "moi nhat tren cung" khi biet that.
      timelineOrder: datedAll ? "mới nhất trên cùng"
        : "trận có ghi ngày xếp trước · trận chưa ghi ngày xếp cuối",
      noTrophy: !st.trophies.filter(inTeam).length,
      troph: st.troph,
      setTrophTitle: e => this.trophSet("title", e.target.value),
      setTrophYear: e => this.trophSet("year", e.target.value),
      setTrophPlace: e => this.trophSet("place", e.target.value),
      setTrophNote: e => this.trophSet("note", e.target.value),
      trophPlaces: TROPHY_PLACES.map(x => ({ value: x[0], label: x[1] })),
      addTrophy: guard(() => this.addTrophy()),

      scorers: (() => {
        const met = rankMet;
        /* Bảng đầy đủ giữ nguyên CẢ ĐỘI (lọc bớt là giấu 35 người khỏi cột trận
           / bàn / MVP), nhưng khi sắp theo ĐIỂM thì người chưa ai chấm xuống
           dưới cùng: xen họ vào giữa bằng điểm cũ là để thứ tự tự nói ra một
           xếp hạng không có thật. Cột ĐIỂM của họ để trống. */
        const isRatedM = m => ratingView(m).rated;
        /* Bang xep hang khong co lay mot hinh ve nao -- 0 svg, 0 canvas tren ca man,
           trong khi FM ve thanh cho dung con so dang duoc sap. Ke thanh NGAY TRONG o
           bang linear-gradient: doc duoc khoang cach giua nguoi dau va nguoi thu ba
           ma khong them mot cot nao, khong doi be rong bang. */
        const metPeak = Math.max(1, ...active.map(m => Number(met.get(m)) || 0));
        const bar = (m, key) => met.id !== key ? "" : (() => {
          const pct = Math.round((Number(met.get(m)) || 0) / metPeak * 100);
          return pct <= 0 ? "" : "linear-gradient(90deg, rgba(193,212,57,0.22) " + pct + "%, transparent " + pct + "%)";
        })();
        /* O tim cau thu loc ca Danh sach lan The cau thu, nhung Thong ke thi
           khong -- cung mot chu trong o do, hai tab ra mot nguoi con tab thu ba
           ra ca doi. Loc o day nua, NHUNG giu nguyen so hang: hang tinh tren ca
           doi roi moi loc de hien, khong thi ai cung thanh hang 1 khi go ten
           minh vao. */
        return rankSorted
          .map((m, i) => ({ m: m, i: i }))
          .filter(x => !q || String(x.m.name || "").toLowerCase().indexOf(q) >= 0)
          .map(({ m, i }) => {
            /* Truoc day hang nhat va hang nam duoc ve GIONG HET nhau -- do duoc:
               cung 13px, cung weight 400, cung mau chu, cung nen trong suot. Nam
               ban cua vua pha luoi lanh dung so pixel nhu hai ban cua nguoi thu
               nam. Bang xep hang ma khong xep hang thi chi la mot bang.
               Nay: ba nguoi dau to hon va deo mau huy chuong, va CHINH cot dang
               duoc sap xep moi doi mau -- doi cot sap thi vinh du di theo. */
            const medal = i < 3 ? MEDALS[i][0] : "";
            const hi = k => (medal && met.id === k) ? medal : "";
            return {
            rank: i + 1, rowBg: i === 0 ? "rgba(232,243,0,0.06)" : stripe(i),
            rankColor: medal || "rgba(250,250,255,0.7)",
            name: m.name,
            nameWeight: i < 3 ? "700" : "400",
            nameSize: i === 0 ? "15px" : "13px",
            nameColor: medal || "rgba(250,250,255,0.92)",
            rating: ratingView(m).score, ratingColor: hi("rating") || tone(m)[1],
            games: m.games || 0, goals: m.goals || 0, assists: m.assists || 0, mvp: m.mvp || 0,
            gamesColor: hi("games") || "rgba(250,250,255,0.85)",
            goalsColor: hi("goals") || "rgba(250,250,255,0.85)",
            assistsColor: hi("assists") || "rgba(250,250,255,0.85)",
            mvpColor: hi("mvp") || "rgba(250,250,255,0.85)",
            cards: (m.y || 0) + "V/" + (m.r || 0) + "Đ",
            /* Bang Thong ke bo trong 1360/1468px cot TEN (72%) trong khi bon thu nay
               deu DA CO trong ho so ma khong cot nao doc len: phan luoi, no quy, va
               ba nhom chi so tu cham. Cung quy uoc voi bang Danh sach: nhom chua cham
               du thi de dau gach. */
            /* Bon cot nua, deu suy tu du lieu da co: vi tri, hang (chip mau dung
               `tone` voi ca app), ban moi tran va tong gop cong. Cot TEN truoc do
               an 602px trong 1888px hang -- rong ma khong noi them gi. */
            pos: posLabelOf(m) === "-" ? "—" : posLabelOf(m),
            grade: ratingView(m).grade || "—",
            gradeBg: tone(m)[0], gradeFg: tone(m)[1],
            gpg: (+m.games || 0) > 0 && (+m.goals || 0) > 0
              ? ((+m.goals || 0) / (+m.games || 0)).toFixed(2).replace(".", ",")
              : "—",
            ga: ((+m.goals || 0) + (+m.assists || 0)) || "—",
            ratingBar: bar(m, "rating"), goalsBar: bar(m, "goals"),
            gamesBar: bar(m, "games"), mvpBar: bar(m, "mvp"),
            og: statCell(m.og),
            /* Cot NO QUY o Thong ke doc SAI o hai tang cung mot luc: `m.owed`
               la SO BUOI chua dong chu khong phai so tien (moi cho khac nhan
               no roi `* fee`), va no bo qua ca dong tien san da ghi (`owe`)
               lan tien cua buoi dang mo. Ket qua: cung mot nguoi, cung mot
               luc, o day la "—" con o Danh sach la "No 95.000d" va o Quy la
               "95.000d". Dung chung ham `debt` voi moi man con lai. */
            debt: debt(m) > 0 ? Math.round(debt(m) / 1000) + "k" : "—",
            // .4 do duoc 3,71:1 tren 14 dau gach -- dau gach cung la chu. .55 = 5,5:1.
            debtColor: debt(m) > 0 ? "#FF6B57" : "rgba(250,250,255,0.55)",
            aAtk: (() => { const v = posAvg(m.attrs, ATTR_BLOCKS[0].list, isKeeper(m)); return v == null ? "—" : String(v); })(),
            aDef: (() => { const v = posAvg(m.attrs, ATTR_BLOCKS[1].list, isKeeper(m)); return v == null ? "—" : String(v); })(),
            aFit: (() => { const v = posAvg(m.attrs, ATTR_BLOCKS[2].list, isKeeper(m)); return v == null ? "—" : String(v); })(),
            // Bang xep hang ma khong bam sang duoc nguoi no vua xep la mot ngo cut.
            open: () => this.setState({ tab: "members", memberView: "list", sel: m.id })
          };});
      })(),
      /* Mot bieu do that cho cot dang sap: 14 cot, cao theo ti le, ba nguoi dau
         deo huy chuong. Bang chu doc duoc THU TU nhung khong doc duoc KHOANG CACH
         -- ai hon ai bao nhieu. Dung dung `met` voi bang ben duoi nen hai thu
         khong the noi khac nhau. */
      rankChart: (() => {
        const met = rankMet;
        /* Chi ve cot cho nguoi CO con so that. Cot DIEM trong bang de dau gach
           cho nguoi chua ai cham, nhung bieu do van ve cho ho mot cot cao ngang
           nguoi 9-12 diem -- vi `ratingOf` co y muon diem cu lam uoc luong cho o
           trong, va o day no bi ve ra nhu mot con so da cham. Hai khoi canh nhau,
           mot cai noi "chua biet", mot cai ve ra "biet roi". Cac chi tieu khac
           thi bo nguoi bang 0: mot cot cao 0px khong noi them gi. */
        const rows = rankSorted.filter(m => met.id === "rating"
          ? ratingView(m).rated
          : (Number(met.get(m)) || 0) > 0);
        const peak = Math.max(1, ...rows.map(m => Number(met.get(m)) || 0));
        const n = Math.max(1, rows.length);
        const gap = 6, W = 1000, H = 120;
        const bw = Math.max(6, (W - gap * (n - 1)) / n);
        return rows.map((m, i) => {
          const v = Number(met.get(m)) || 0;
          const h = Math.max(2, Math.round(v / peak * H));
          return {
            x: Math.round(i * (bw + gap)), y: H - h, w: Math.round(bw), h,
            fill: i === 0 ? "#E8F300" : (i === 1 ? "#DCE1EB" : (i === 2 ? "#C67C3C" : "rgba(193,212,57,0.5)")),
            label: (m.name || "").split(" ").slice(-1)[0],
            lx: Math.round(i * (bw + gap) + bw / 2),
            why: m.name + " · " + v + " " + met.unit.toLowerCase()
          };
        });
      })(),
      /* Bieu do chi ve nguoi CO con so that, con bang liet ke ca doi va de dau
         gach cho nguoi chua co. Hai so luong khac nhau la dung, nhung phai noi
         ra -- khong thi chu thich "cung thu tu voi bang" doc thanh mot loi hua
         sai. */
      rankChartUnit: (() => {
        const shown = rankSorted.filter(m => rankMet.id === "rating"
          ? ratingView(m).rated
          : (Number(rankMet.get(m)) || 0) > 0).length;
        const all = rankSorted.length;
        return rankMet.label + " — cùng thứ tự với bảng ngay bên dưới"
          + (shown < all ? (", vẽ " + shown + "/" + all + " người đã có số") : "");
      })(),
      /* Hai con so cung noi ve ban thang nhung khong bang nhau: cong 9 tran o
         Lich su tran ra 23 ban cua doi, cong cot BAN cua 14 nguoi ra 21. Khong
         phai loi tinh -- la 2 ban chua ai gan ten vao. Nhung app truoc do de hai
         so do nam hai man khac nhau va khong noi gi, nen nguoi doc chi thay
         chung mau thuan. Noi thang ra, va chi noi khi that su co chenh. */
      goalGap: (() => {
        const team = teamMatches.reduce((n, g) => n + (parseInt(g.gf, 10) || 0), 0);
        const named = active.reduce((n, m) => n + (parseInt(m.goals, 10) || 0), 0);
        const d = team - named;
        if (!team || d <= 0) return "";
        return "Đội ghi " + team + " bàn, đã gán tên " + named + " — còn " + d
          + " bàn chưa ghi ai ghi. Mở một trận ở Đội → Lịch sử trận để bổ sung.";
      })(),
      noStats: active.length === 0,
      /* "o phia tren" tro toi mot cai o khong nam tren man nay: nut Luu tran o
         Doi -> Lich su tran, cach day hai buoc di. Chi duong that. */
      ogNote: "cộng khi admin ghi kết quả ở Đội → Lịch sử trận. Phản lưới không trừ điểm cá nhân.",
      res: st.res,
      resEditing: st.res.editIx != null,
      resSaveLabel: st.res.editIx != null ? "Lưu sửa" : "Lưu trận",
      resEditNote: st.res.editIx != null
        ? "Đang sửa một trận đã ghi — số bàn, kiến tạo, thẻ của từng người sẽ cộng trừ theo phần thay đổi. Số buổi có mặt không đổi."
        : "",
      resCancelEdit: () => this.setState({ res: { opp: "", gf: "", ga: "", venue: "S.NHÀ", day: "", events: [], evWho: "", evKind: "goal", evMin: "", editId: null } }),
      /* Mot tran da ghi truoc day khong co duong nao xoa. Buoi thi co "Bo buoi",
         tran thi khong: go nham ten doi thu hay nham ngay MOT lan la no nam vinh
         vien trong lich su, trong thang-hoa-bai, va trong ho so tung nguoi.

         Xoa thi tra lai dung nhung gi tran do da cong: ban/kien tao/the/phan
         luoi/MVP theo `evTally`, va so tran theo `playedIds`. CO Y KHONG dung
         vao tien: tien san la tien that da thu, xoa mot ban ghi tran khong lam
         ai duoc tra lai tien -- neu can thi thu quy sua o So quy. Toast noi ro
         dieu do thay vi lang le. */
      resDelete: guard(() => this.setState(s => {
        const v = s.res;
        const old2 = v.editId != null
          ? (s.matches || []).find(x => x.id === v.editId)
          : (s.matches || [])[v.editIx];
        if (!old2) return { copied: "Không tìm thấy trận này nữa." };
        if (v.editId == null) {
          const sig = [old2.date || "", old2.opp || old2.date || "-", old2.gf, old2.ga].join("|");
          if (sig !== v.editSig) return { copied: "Danh sách trận đã đổi từ lúc mở. Mở lại trận cần xoá." };
        }
        const t0 = evTally(old2.events || []);
        const played = {}; playedIds(null, old2.events, old2.xi).forEach(i2 => { played[i2] = 1; });
        const sub = (cur, n) => Math.max(0, (+cur || 0) - (n || 0));
        const members2 = s.members.map(m => {
          if (m.teamId !== teamId) return m;
          const t = t0[m.id];
          if (!t && !played[m.id]) return m;
          return { ...m,
            games: sub(m.games, played[m.id] ? 1 : 0),
            goals: sub(m.goals, t && t.goals), assists: sub(m.assists, t && t.assists),
            y: sub(m.y, t && t.y), r: sub(m.r, t && t.r),
            og: sub(m.og, t && t.og), mvp: sub(m.mvp, t && t.mvp) };
        });
        const matches2 = (s.matches || []).filter(x => x !== old2);
        /* Tien san do CHINH tran nay sinh ra phai di theo no.

           Giam khao vong 34: Hoang Tien Dung duoc danh dau Vang cho buoi 9/9,
           moi rang buoc cua anh ta voi buoi do la mot su kien ghi ban trong mot
           tran; xoa tran di thi so lieu tra lai dung (tran 7 → 6, ban 4 → 3)
           nhung dong tien san 95.000d o lai. App gui hoa don cho mot nguoi ve
           mot tran chinh no dong y la anh ta khong da.

           Chi go dong CHUA THU. Da thu roi la tien that da vao quy -- khong tu
           tra lai cho ai, chi noi ra. Va chi go nguoi khong con rang buoc nao
           khac voi buoi do: khong diem danh la di, khong co ten trong tran nao
           con lai cung ngay. */
        const delOcc = String(old2.date || "");
        const stillIn = {};
        matches2.forEach(g => {
          if (!g || String(g.date || "") !== delOcc) return;
          playedIds(null, g.events, g.xi).forEach(i2 => { stillIn[i2] = 1; });
        });
        const attNow = (s.attendByOcc || {})[this._occ] || {};
        const dropIds = {};
        let keptPaid = 0;
        const charges2 = (s.charges || []).filter(c => {
          if (!c || c.teamId !== teamId) return true;
          if (c.label !== "Tiền sân " + delOcc) return true;
          if (!played[c.memberId]) return true;
          /* "yes-billed" KHONG phai la mot rang buoc doc lap -- chinh app dat
             no khi chot tran, nen dung no de giu lai dong tien la lay ket qua
             cua tran lam ly do giu tien cua tran. Chi cau tra loi that cua
             nguoi ta ("Di" / da dong tien) moi tinh. */
          const ansv = attNow[c.memberId];
          const saidYes = ansv === "yes" || ansv === "yes-paid";
          if (stillIn[c.memberId] || saidYes) return true;
          if (c.paid) { keptPaid++; return true; }
          dropIds[c.memberId] = 1;
          return false;
        });
        const attendByOcc2 = (() => {
          if (!Object.keys(dropIds).length) return s.attendByOcc;
          const cur2 = { ...attNow };
          Object.keys(dropIds).forEach(k => { if (cur2[k] === "yes-billed") delete cur2[k]; });
          return { ...s.attendByOcc, [this._occ]: cur2 };
        })();
        const dropped = Object.keys(dropIds).length;
        const out = { matches: matches2, members: members2, charges: charges2, attendByOcc: attendByOcc2 };
        this.persist(out);
        return { ...out,
          res: { opp: "", gf: "", ga: "", venue: "S.NHÀ", day: "", events: [], evWho: "", evKind: "goal", evMin: "", editId: null, editIx: null, editSig: "" },
          undo: { state: { matches: s.matches, members: s.members, charges: s.charges, attendByOcc: s.attendByOcc } },
          copied: "Đã xoá trận " + (old2.opp || old2.date || "") + " · số liệu từng người đã trừ lại."
            + (dropped ? (" Gỡ " + dropped + " dòng tiền sân chưa thu của người không còn dính tới buổi đó.") : "")
            + (keptPaid ? (" " + keptPaid + " người đã đóng rồi thì giữ nguyên trong quỹ — sửa ở Sổ quỹ nếu cần trả lại.") : "") };
      })),
      setResOpp: e => this.resSet("opp", e.target.value),
      setResGf: e => this.resSet("gf", e.target.value),
      setResGa: e => this.resSet("ga", e.target.value),
      setResVenue: e => this.resSet("venue", e.target.value),
      setResDay: e => this.resSet("day", e.target.value),
      dayHint: now.getDate() + "/" + (now.getMonth() + 1),
      setEvWho: e => this.resSet("evWho", e.target.value),
      setEvKind: e => this.resSet("evKind", e.target.value),
      setEvMin: e => this.resSet("evMin", e.target.value),
      evKindOptions: EV_KINDS.map(k => ({ value: k[0], label: k[1] })),
      evRows: evSort(st.res.events).map((e, i) => {
        const m = active.find(x => String(x.id) === String(e.who));
        return {
          rowBg: i % 2 ? "#121526" : "transparent",
          min: isFinite(Number(e.min)) ? ("phút " + Number(e.min)) : "chưa rõ phút",
          minColor: isFinite(Number(e.min)) ? "#FAFAFF" : "rgba(250,250,255,0.55)",
          who: m ? ((m.num ? "#" + m.num + " " : "") + m.name) : "?",
          kind: evLabel(e.kind),
          del: () => this.setState(st2 => ({
            res: { ...st2.res, events: st2.res.events.filter(x => x !== e) }
          }))
        };
      }),
      noEv: !(st.res.events || []).length,
      /* Bao khi so ban da gan nguoi khong khop ti so. Khong CHAN -- doi phui hay
         co ban "ai do sut vao khong nho ai" -- nhung noi ra, vi bang xep hang ghi
         ban sau nay dua tren cai nay. */
      evWarn: (() => {
        const gf = parseInt(st.res.gf, 10);
        if (!isFinite(gf)) return "";
        const n = (st.res.events || []).filter(e => e && e.kind === "goal").length;
        if (n === gf) return "";
        return n < gf ? ("Đội ghi " + gf + " bàn nhưng mới gán " + n + " người ghi bàn.")
                      : ("Đã gán " + n + " bàn nhưng tỉ số ghi " + gf + ".");
      })(),
      hasEvWarn: (() => {
        const gf = parseInt(st.res.gf, 10);
        if (!isFinite(gf)) return false;
        return (st.res.events || []).filter(e => e && e.kind === "goal").length !== gf;
      })(),
      addEv: () => this.setState(st2 => {
        const r = st2.res;
        if (!r.evWho) return { copied: "Chọn người đã." };
        const mnBad = minuteProblem(r.evMin);
        if (mnBad) return { copied: mnBad };
        const mn = parseInt(r.evMin, 10);
        const ev = { who: parseInt(r.evWho, 10), kind: r.evKind || "goal" };
        if (isFinite(mn) && mn >= 0 && mn <= 200) ev.min = mn;
        return { res: { ...r, events: (r.events || []).concat([ev]), evWho: "", evMin: "" } };
      }),
      playerOptions: active.map(m => ({ value: String(m.id), label: (m.num ? "#" + m.num + " " : "") + m.name })),
      occClosed: !!(st.closedOcc || {})[curOcc],
      reopenOcc: guard(() => this.setState(s => {
        const closedOcc = { ...s.closedOcc, [curOcc]: false };
        this.persist({ closedOcc });
        return { closedOcc, copied: "Đã mở lại buổi này - ghi kết quả lần nữa sẽ tính tiền sân lần nữa." };
      })),
      saveResult: guard(() => this.setState(s => {
        /* Ghi tran va chot so tien san la HAI chuyen. Truoc day chung bi gop:
           luu tran dau xong thi buoi bi danh dau "da chot", va tran THU HAI bi
           tu choi bang mot cau noi ve BUOI chu khong noi ve TRAN -- trong khi
           doi truong nhap bu hai ba tran cua tuan truoc la chuyen thuong nhat.
           Nay tran nao cung ghi duoc; rieng tien san chi tinh mot lan cho moi
           buoi, vi mot buoi da may tran thi cung chi thue san mot lan. */
        const daChot = !!(s.closedOcc || {})[curOcc];
        const v = s.res;
        if (!String(v.opp).trim()) return { copied: "Nhập tên đối thủ trước đã." };
        /* SUA mot tran DA GHI la mot duong khac han duong ghi tran moi.
           Trong tai vong 22 bam thu: tam tran co san cua doi khong co cach nao mo
           lai de ghi ai da ghi ban, nen bang "Theo tung tran" trong ho so se mai
           mai thieu 8/9 tran da da -- tinh nang moi bi co lap khoi lich su da co.

           O day CO Y khong dung lai `games` va khong tao dong tien san: so buoi
           co mat duoc dem tu diem danh luc chot buoi, app khong con giu danh sach
           do cho tran cu, nen cong tru no la doan. Chi ban/kien tao/the/phan
           luoi/MVP duoc chinh, va chinh theo HIEU so cu-moi chu khong cong don. */
        if (v.editIx != null) {
          /* Tran cu (do seed sinh ra) KHONG co `id` -- tim theo id thi khong bao gio
             thay, va co sua se im lang khong bat. Nen tim theo id truoc, khong co
             thi lay theo VI TRI, va truoc khi ghi phai doi chieu chu ky
             ngay|doi thu|ti so: neu danh sach da xe dich (co tran moi chen len
             dau) thi tu choi han chu khong ghi de len tran khac. */
          const old = v.editId != null
            ? (s.matches || []).find(x => x.id === v.editId)
            : (s.matches || [])[v.editIx];
          if (!old) return { copied: "Không tìm thấy trận này nữa." };
          if (v.editId == null) {
            const sig = [old.date || "", old.opp || old.date || "-", old.gf, old.ga].join("|");
            if (sig !== v.editSig) return { copied: "Danh sách trận đã đổi từ lúc mở. Mở lại trận cần sửa." };
          }
          const badEdit = scoreProblem(v.gf, v.ga) || dayProblem(v.day);
          if (badEdit) return { copied: badEdit };
          const gf2 = Math.max(0, parseInt(v.gf, 10) || 0), ga2 = Math.max(0, parseInt(v.ga, 10) || 0);
          const before = evTally(old.events || []);
          const after = evTally(v.events || []);
          const ids = {};
          Object.keys(before).forEach(k => { ids[k] = 1; });
          Object.keys(after).forEach(k => { ids[k] = 1; });
          const d = (t, k) => (t && t[k]) || 0;
          /* SO TRAN cung phai cong tru, khong chi ban/kien tao/the.

             Ghi chu cu o tren noi "cong tru `games` la doan" -- dung o thoi diem
             tran khong luu ai da da. Nay tran co `xi` va `events`, nen ai da da
             la mot phep tinh chinh xac: `playedIds` cua tran TRUOC va SAU khi sua.
             Khong sua thi ra mot mau thuan tren cung mot bang: them mot ban cho
             Mai Van Son thi anh ta co BAN 1 ma TRAN van la 1 tran cu, va cot
             "banh/tran" chia cho mot mau so anh ta chua bao gio duoc cong. */
          const wasIn = {}; playedIds(null, old.events, old.xi).forEach(i2 => { wasIn[i2] = 1; });
          const nowIn = {}; playedIds(null, v.events, old.xi).forEach(i2 => { nowIn[i2] = 1; });
          Object.keys(nowIn).forEach(k => { ids[k] = 1; });
          const members2 = s.members.map(m => {
            if (m.teamId !== teamId || !ids[m.id]) return m;
            const b0 = before[m.id], a0 = after[m.id];
            const add = (cur, key) => Math.max(0, (cur || 0) + d(a0, key) - d(b0, key));
            const dg = (nowIn[m.id] ? 1 : 0) - (wasIn[m.id] ? 1 : 0);
            return { ...m,
              games: Math.max(0, (+m.games || 0) + dg),
              goals: add(m.goals, "goals"), assists: add(m.assists, "assists"),
              y: add(m.y, "y"), r: add(m.r, "r"),
              og: add(m.og, "og"), mvp: add(m.mvp, "mvp") };
          });
          /* Tien san: chi thu khi tran nay dung la buoi dang mo, y het duong ghi
             tran moi. Tran cu thi noi ra chu khong lang le bo qua. */
          const editOccIso = String(curOcc || "").split("@")[1] || "";
          const editOccDstr = curOccObj
            ? (curOccObj.d.getDate() + "/" + (curOccObj.d.getMonth() + 1) + "/" + curOccObj.d.getFullYear())
            : "";
          const newDate = matchDay(v.day, now) || old.date;
          const editSame = !!editOccDstr && editOccDstr === newDate;
          const newcomers = Object.keys(nowIn).filter(k => !wasIn[k]).map(k => parseInt(k, 10));
          let charges2 = s.charges || [];
          let billed2 = 0;
          if (editSame && newcomers.length) {
            const already = {};
            (s.charges || []).forEach(c => { if (c && c.teamId === teamId && (c.occ === curOcc || c.label === "Tiền sân " + newDate)) already[c.memberId] = 1; });
            const add2 = newcomers.filter(mid => !already[mid]);
            billed2 = add2.length;
            charges2 = charges2.concat(add2.map((mid, i3) => ({
              teamId: teamId, id: Date.now() + 1 + i3, memberId: mid, amount: occFee, occ: curOcc,
              label: "Tiền sân " + newDate, paid: false
            })));
          }
          const matches2 = s.matches.map(x => x !== old ? x : {
            ...x, opp: v.opp.trim(), gf: gf2, ga: ga2,
            venue: v.venue || x.venue || "S.NHÀ",
            date: matchDay(v.day, now) || x.date,
            events: evSort(v.events)
          });
          this.persist({ matches: matches2, members: members2, charges: charges2 });
          return {
            matches: matches2, members: members2, charges: charges2,
            res: { opp: "", gf: "", ga: "", venue: "S.NHÀ", day: "", events: [], evWho: "", evKind: "goal", evMin: "", editId: null, editIx: null, editSig: "" },
            copied: "Đã sửa trận " + gf2 + "-" + ga2
              + (newcomers.length
                  ? (editSame
                      ? (billed2 ? (" · thêm " + billed2 + " người vào sổ tiền sân.") : " · những người mới thêm đã có trong sổ tiền sân.")
                      : (" · " + newcomers.length + " người được cộng thêm 1 trận, nhưng trận này không phải buổi đang mở nên không tính tiền sân."))
                  : "")
          };
        }
        // parseInt("-3") is -3 and truthy, so `|| 0` let a negative score through
        // and it reached the form table, the win/draw/loss tag and goal difference.
        const bad = scoreProblem(v.gf, v.ga) || dayProblem(v.day);
        if (bad) return { copied: bad };
        const gf = Math.max(0, parseInt(v.gf, 10) || 0), ga = Math.max(0, parseInt(v.ga, 10) || 0);
        const dstr = matchDay(v.day, now);
        const id0 = Date.now();
        /* Ghi lại đội hình đã đá, không chỉ tỉ số.

           Trước đây trận chỉ mang đối thủ, ngày, tỉ số và sân — sơ đồ, chiến thuật và
           bảy người đã ra sân bị vứt đi, dù app đang cầm sẵn cả ba ngay lúc bấm Lưu.
           Nên không bao giờ trả lời được "sơ đồ nào ăn". Trận cũ thiếu các trường này
           vẫn đọc bình thường; nơi đọc phải chịu được thiếu. */
        /* Tien san chi duoc tinh khi TRAN NAY dung la BUOI dang mo.

           Truoc do khong kiem: go ngay da la 5/9 trong khi buoi sap toi la 9/9
           thi app van lay danh sach diem danh cua 9/9, thu tien san cua 9/9, roi
           danh dau 9/9 la da chot -- Tong quan sau do khang dinh "Ban da nhan"
           cho mot buoi chua ai tra loi. Nhap bu tran tuan truoc la chuyen thuong
           nhat cua doi truong, va no khong duoc phep dong tien cua buoi chua da.
           Nhan dong tien san von da ghi "Tien san <ngay tran>" trong khi khoa lai
           la buoi khac -- hai thu do gio phai la mot. */
        const occDstr = curOccObj
          ? (curOccObj.d.getDate() + "/" + (curOccObj.d.getMonth() + 1) + "/" + curOccObj.d.getFullYear())
          : "";
        const sameDay = !!occDstr && occDstr === dstr;
        const matches = [{
          teamId: teamId, id: id0, opp: v.opp.trim(), date: dstr, gf: gf, ga: ga,
          venue: v.venue || "S.NHÀ",
          size: szKey, formation: (sameDay && slots.filter(Boolean).length) ? effFormation : "",
          mentality: (actTactic && actTactic.mentality) || "bal",
          tacticId: (actTactic && actTactic.id) || null,
          /* Doi hinh chi duoc gan khi tran nay dung la buoi dang mo. Truoc do
             tran nhap bu ngay cu van duoc dan nguyen doi hinh dang dung tren
             man -- do la doi hinh cua buoi SAP TOI, va no vao ho so tung nguoi
             thanh "da chinh" o mot tran ho co the khong he da. */
          xi: sameDay ? slots.filter(Boolean) : [], events: evSort(v.events)
        }].concat(s.matches);
        const rsvp = sameDay ? Object.keys(att).filter(k => attGoing(att[k])).map(x => parseInt(x, 10)) : [];
        const goers = playedIds(rsvp, v.events, sameDay ? slots.filter(Boolean) : []);
        const tally = evTally(v.events);
        const members = s.members.map(m => {
          if (m.teamId !== teamId) return m;
          let n = m;
          if (goers.indexOf(m.id) >= 0) n = { ...n, games: (n.games || 0) + 1 };
          const t = tally[m.id];
          if (t) n = { ...n, goals: (n.goals || 0) + t.goals, assists: (n.assists || 0) + t.assists,
                       y: (n.y || 0) + t.y, r: (n.r || 0) + t.r,
                       og: (n.og || 0) + t.og, mvp: (n.mvp || 0) + t.mvp };
          return n;
        });
        // One charge row per attendee, and the RSVP is marked billed so debt()
        // stops adding the live per-session fee on top of the charge.
        /* Somebody who paid at the pitch before the score was typed in still
           attended, so he still gets a row -- but it is already settled. Billing
           him again was the same double-charge as the attendance one, reached
           from the other end: settle wrote "yes-paid", saveResult read every
           non-"no" RSVP as a payer, and owe() counted the unpaid row. */
        /* "Mot buoi chi thue san mot lan" la dung, nhung truoc do no bi hieu thanh
           "buoi da chot roi thi khong ai bi tinh tien nua" -- va dong duoi van doi
           MOI o "yes" thanh "yes-billed". Hau qua: ai diem danh SAU lan chot dau
           bi danh dau la da tinh tien trong khi khong he co dong thu nao. No song
           cua ho bien mat, so quy khong tang, khong ai biet. Trong tai vong 27 do
           duoc 570.000d cua mot tran that mat dau hoan toan.

           Dung cach: khong tinh lai NGUOI DA TINH, chu khong phai khong tinh ai.
           Mot buoi da may tran thi tien san van chia cho tat ca ai da da, ke ca
           nguoi den o tran thu hai. Dong cu khong co `occ` nen doi chieu bang
           nhan -- ca hai deu chua chuoi ngay cua buoi. */
        const chargedIds = {};
        (s.charges || []).forEach(c => {
          if (c && c.teamId === teamId && (c.occ === curOcc || c.label === "Tiền sân " + dstr)) chargedIds[c.memberId] = 1;
        });
        const toBill = sameDay ? goers.filter(mid => !chargedIds[mid]) : [];
        const charges = (s.charges || []).concat(toBill.map((mid, i) => ({
          teamId: teamId, id: id0 + 1 + i, memberId: mid, amount: occFee, occ: curOcc,
          label: "Tiền sân " + dstr, paid: hasPaidOcc({ id: mid })
        })));
        const billedNow = {};
        toBill.forEach(mid => { billedNow[mid] = 1; });
        const credited = (v.events || []).filter(e => e && e.kind === "goal").length;
        const cur = {};
        /* Chi danh dau "da tinh tien" cho nguoi THUC SU co dong tien san -- cu moi
           ghi lan nay, hoac da co tu lan chot truoc. */
        Object.keys(att).forEach(k => {
          const mid = parseInt(k, 10);
          cur[k] = (att[k] === "yes" && (billedNow[mid] || chargedIds[mid])) ? "yes-billed" : att[k];
        });
        /* Nguoi vao so vi co ten trong doi hinh hoac vi ghi ban, chu chua bam
           diem danh, phai duoc ghi la CO MAT luon. Khong thi so quy noi ho da
           dong tien san con bang diem danh cua dung buoi do van de trong -- hai
           man hinh cua cung mot buoi noi hai chuyen khac nhau. */
        goers.forEach(mid => {
          if (cur[mid] == null && (billedNow[mid] || chargedIds[mid])) cur[mid] = "yes-billed";
        });
        const addedByXi = goers.filter(mid => !attGoing(att[mid]) && cur[mid] === "yes-billed").length;
        const attendByOcc = sameDay ? { ...s.attendByOcc, [curOcc]: cur } : s.attendByOcc;
        const closedOcc = sameDay ? { ...s.closedOcc, [curOcc]: true } : s.closedOcc;
        const ranks = { ...s.ranks };
        METRICS.forEach(met => {
          const m2 = {};
          active.slice().sort((a, b) => (met.get(b) || 0) - (met.get(a) || 0)).forEach((m, i) => { m2[m.id] = i + 1; });
          ranks[met.id] = m2;
        });
        this.persist({ matches, members, charges, attendByOcc, closedOcc, ranks });
        return {
          matches, members, charges, attendByOcc, closedOcc, ranks,
          res: { opp: "", gf: "", ga: "", venue: "S.NHÀ", day: "", events: [], evWho: "", evKind: "goal", evMin: "", editId: null, editIx: null, editSig: "" },
          // Goals credited to individuals were never checked against the team's
          // own score, so 5 goals could sit under a 2-0 win and the top-scorer
          // table would quietly disagree with the results table. Said out loud
          // rather than clamped -- the captain knows who scored, the app does not.
          copied: "Đã lưu trận " + gf + "-" + ga
            + (!sameDay
                ? (" · trận ngày " + dstr + " không phải buổi đang mở"
                   + (occDstr ? " (" + occDstr + ")" : "")
                   + " nên không tính tiền sân và không đụng vào điểm danh buổi đó.")
                /* Cau cu noi "khong tinh lai" ngay ca khi vua tinh them nguoi
                   moi. Buoi da chot roi van phai thu tien nguoi den o tran thu
                   hai (sua vong 27) -- nen cau nay phai bao dung viec vua lam,
                   khong thi doi truong doc xong tuong quy khong doi trong khi
                   no vua doi. */
                : daChot ? (toBill.length
                              ? (" · buổi này đã chốt trước đó, tính thêm tiền sân cho " + toBill.length + " người mới.")
                              : " · buổi này đã tính tiền sân rồi, không tính lại.")
                         : " · tính tiền sân cho " + goers.length + " người.")
            + (addedByXi && !daChot && sameDay ? " " + addedByXi + " người có tên trong đội hình hoặc có sự kiện nhưng chưa bấm điểm danh — vẫn tính là có mặt." : "")
            /* Dai canh bao truoc khi luu chi hien khi dang go; sau khi bam Luu
               thi man tro ve trang va dai do bien mat cung form. Nen cau nay
               phai noi CA HAI phia lech, khong chi phia thua. Truoc do thieu
               ban chua gan ten thi luu xong khong con gi nhac -- va Phong truyen
               thong lai lay dung cot do lam Vua pha luoi. */
            + (credited > gf ? " ⚠ Đã ghi " + credited + " bàn cho cầu thủ nhưng tỉ số là " + gf + "."
               : credited < gf ? " ⚠ Còn " + (gf - credited) + " bàn chưa gán ai ghi — mở lại trận này để bổ sung." : "")
        };
      })),

      /* ---------- team settings: export ---------- */
      exportCount: active.length,
      // Tat vinh vien ma khong co duong bat lai la bay: nguoi ta tat luc dang voi,
      // sau do khong con cach nao biet minh da tat mat cai gi.
      notesHint: (() => {
        const n = Object.keys(this.state.notesOff || {}).length;
        return n ? ("Đang ẩn " + n + " lời nhắc. Bấm để hiện lại hết.")
                 : "Chưa ẩn lời nhắc nào. Bấm × trên một lời nhắc để ẩn nó đi.";
      })(),
      notesReset: () => { this.persist({ notesOff: {} }); this.setState({ notesOff: {}, copied: "Đã hiện lại mọi lời nhắc." }); },
      /* CSV nay chua SO DIEN THOAI va NGAY SINH cua ca doi. Trong tai vong 28
         dang nhap bang mot cau thu thuong va tai duoc no -- moi thao tac GHI da
         bi chan dung, nhung hai cai nay khong phai ghi nen lot. Doc du lieu ca
         nhan cua nguoi khac cung la mot quyen. */
      /* Truoc day khong co duong nao dua toan bo du lieu ra khoi may. Chi co
         CSV danh sach nguoi -- khong quy, khong lich, khong doi hinh, va nhat
         la KHONG co chia sua. Tat ca nam trong localStorage cua dung mot trinh
         duyet cong mot dong tren Supabase goi free (thu tu tam dung khi lau
         ngay khong ai dung). Hai cho do hong cung luc la mat sach. */
      /* Chia sua 16 ky tu CHUA TUNG hien ra o dau ca -- no chi nam trong
         localStorage. Nguoi dung khong biet la co no, nen khong the chep lai,
         nen mat may la mat doi. May chu cung khong dua lai: `team_create` tra
         no dung mot lan, va `team_pull` co y KHONG tra (ai co ma doc cung goi
         duoc ham do).

         Cho hien ra CHU KHONG them cua khoi phuc nao tren may chu: mot ham
         "lay lai chia bang ma doi" se bien ma doc thanh ma sua, tuc pha bo hai
         chia lam mot. */
      hasAdminKey: !!(this.cloudMeta() || {}).adminKey,
      noAdminKey: !(this.cloudMeta() || {}).adminKey,
      akShown: !!st.akShow,
      adminKeyText: (() => {
        const k = (this.cloudMeta() || {}).adminKey || "";
        return st.akShow ? k : k.replace(/./g, "•");
      })(),
      akToggleLabel: st.akShow ? "Ẩn" : "Hiện",
      toggleAdminKey: guard(() => this.setState(s2 => ({ akShow: !s2.akShow }))),
      copyAdminKey: guard(() => {
        const k = (this.cloudMeta() || {}).adminKey || "";
        if (!k) { this.setState({ copied: "Máy này không giữ chìa sửa của đội nào." }); return; }
        this.copyText(k);
      }),
      exportAll: guard(() => {
        const b = this.backupBlob();
        if (!b.data) { this.setState({ copied: "Máy này chưa có dữ liệu gì để lưu." }); return; }
        const d = new Date(), p2 = n => String(n).padStart(2, "0");
        const stamp = d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
        const url = URL.createObjectURL(new Blob([JSON.stringify(b, null, 1)], { type: "application/json" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = String(team.name || "doi").replace(/\s+/g, "-").toLowerCase() + "-du-phong-" + stamp + ".json";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        const nT = (b.teams || []).length, nM = ((b.data || {}).members || []).length;
        this.setState({ copied: "Đã tải bản dự phòng · " + nM + " người · " + nT + " đội · có kèm chìa sửa. Giữ tệp này kín." });
      }),
      /* Nap lai = THAY THE ca ba khoa roi tai lai trang. Noi that no cuu duoc gi:
         may moi / may vua bi xoa sach / may chu chet han. KHONG phai "hoan tac
         mot sua doi" -- may chu con song thi nhip keo 8 giay se de ban cua no
         len trong vong tam giay, va do la dung. */
      pickBackup: guard(e => {
        const f = e.target.files && e.target.files[0];
        e.target.value = "";
        if (!f) return;
        const rd = new FileReader();
        rd.onerror = () => this.setState({ copied: "Không đọc được tệp này." });
        rd.onload = () => {
          let b = null;
          try { b = JSON.parse(String(rd.result)); } catch (x) {}
          if (!b || b.app !== "da-phui" || !b.data) {
            this.setState({ copied: "Tệp này không phải bản dự phòng của Đá Phủi App." });
            return;
          }
          const nM = ((b.data || {}).members || []).length;
          const when = String(b.at || "").slice(0, 10) || "không rõ ngày";
          const NL = String.fromCharCode(10);
          if (typeof confirm === "function" && !confirm(
              "Nạp bản dự phòng ngày " + when + " (" + nM + " người)?" + NL + NL +
              "Mọi dữ liệu đang có trên máy này sẽ bị thay thế. Không hoàn tác được." + NL +
              "Nếu đội vẫn còn trên máy chủ thì bản trên máy chủ mới là bản cuối cùng.")) return;
          try {
            localStorage.setItem(KEY, JSON.stringify(b.data));
            if (b.cloud) localStorage.setItem(CLOUD_KEY, JSON.stringify(b.cloud));
            else localStorage.removeItem(CLOUD_KEY);
            if (b.teams) localStorage.setItem("dpfm-teams", JSON.stringify(b.teams));
          } catch (x) {
            this.setState({ copied: "Máy không cho ghi — bộ nhớ trình duyệt đầy?" });
            return;
          }
          if (typeof location !== "undefined") location.reload();
        };
        rd.readAsText(f);
      }),
      exportCsv: guard(() => {
        const head = ["So ao", "Ten", "Ten in ao", "Size", "Vi tri", "Ngay sinh", "SDT", "Loai", "Hang"];
        const cell = v => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
        const rows = active.map(m => [m.num, m.name, m.shirt, m.size, posLabelOf(m), m.dob, m.phone, m.type, grade(m)].map(cell).join(","));
        const csv = "﻿" + [head.map(cell).join(",")].concat(rows).join("\r\n");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = team.name.replace(/\s+/g, "-").toLowerCase() + "-danh-sach.csv";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        this.setState({ copied: "Đã tải CSV " + active.length + " người." });
      }),
      copyRoster: () => {
        const txt = [team.name + " · danh sách " + active.length + " người"].concat(
          active.map(m => (m.num ? "#" + m.num + " " : "") + m.name + " · " + (m.shirt || "-") + " · " + (m.size || "-") + " · " + posLabelOf(m))
        ).join("\n");
        this.copyText(txt);
        this.setState({ copied: "Đã copy danh sách - dán vào Zalo." });
      },

      /* ---------- tactics ---------- */
      tacticRatio: SIZE_RATIO[szKey],
      // Cap the pitch by HEIGHT, not width. With `height:100%; width:auto`, a
      // max-width clamp narrows the box without shortening it, so aspect-ratio
      // silently loses and the pitch is drawn stretched -- measured 0.674 on a
      // 7-a-side pitch that declares 3/4. Capping the height keeps the shape.
      pitchMaxH: (() => { const [w, h] = SIZE_RATIO[szKey].split("/").map(Number); return Math.round((dualPitch ? 400 : 430) * h / w) + "px"; })(),
      // Managing tactics is rare; steering one is constant. The four management
      // buttons and the rename field used to sit in the rail right under the list,
      // ahead of everything you actually touch. They are a menu now.
      tacticMore: guard(e => this.openCtx(e, actTactic ? actTactic.name : "Chiến thuật", tacticCtx())),
      tacticList: libAll.map(t => ({
        name: t.name + (t.isDefault ? " · mặc định" : ""),
        meta: "Sân " + t.size + " · " + t.formation,
        bg: actTactic && t.id === actTactic.id ? "rgba(104,33,220,0.32)" : "#1F2332",
        line: actTactic && t.id === actTactic.id ? "rgba(177,129,255,0.6)" : "rgba(255,255,255,0.07)",
        click: () => { if (this.lpAte()) return; this.setState(s => {
          const tacticSel = { ...s.tacticSel, [sideKey]: t.id };
          this.persist({ tacticSel });
          return { tacticSel, tacticSlot: null };
        }); },
        menu: e => this.openCtx(e, t.name, tacticCtx(t)),
        pressStart: e => this.lpStart(e, t.name, tacticCtx(t)),
        pressEnd: () => this.lpEnd()
      })),
      newTactic: guard(() => this.setState(s => {
        const lib = (((s.tacticLib || {})[teamId] || []).length ? s.tacticLib[teamId] : [defaultTactic()]).slice();
        const t = { ...defaultTactic(), id: Date.now(), name: "Chiến thuật " + (lib.length + 1), isDefault: false };
        const tacticLib = { ...s.tacticLib, [teamId]: lib.concat([t]) };
        const tacticSel = { ...s.tacticSel, [sideKey]: t.id };
        this.persist({ tacticLib, tacticSel });
        return { tacticLib, tacticSel, copied: "Đã tạo " + t.name + "." };
      })),
      /* Ba cài đặt này là 10 nút chip xếp dọc trong cột trái, ăn ~280px chiều
         cao. FM26 để chúng làm ba dropdown trên một hàng ở thanh trên: 0px dọc.
         Luồng hỏi lại khi đổi khổ sân (`sizeAsk`) giữ nguyên — nó xoá đội hình
         đang xếp, không được im lặng làm. */
      sizeSel: szKey,
      sizeOptions: ["5", "7", "11"].map(sz => ({ value: sz, label: "Sân " + sz })),
      /* Hoi lai bang MENU, khong bang mot khoi nam trong cot trai.

         Truoc do khoi xac nhan la mot `sc-if` dat trong `.fmrail` -- cot chi ton
         tai o man rong. Hai hau qua do duoc: o 375px doi kho san KHONG LAM DUOC,
         vi state duoc set ma khong co gi render ra (0 lan chuoi "xoa doi hinh"
         trong body), select bung ve cho cu; o 1440x900 thi hop thoai render o
         y=814 trong khi cai select bam o y=204 -- cach 610px -- va nut "Van doi"
         nam o y=918, tuc DUOI mep man. Nguoi dung thay select bung ve va khong
         thay gi khac, ket luan duy nhat hop ly la "nut nay hong".

         `openCtx` da render dung o ca hai be rong (375px ra bottom-sheet vua man)
         va da neo vao dung cho bam. Dung lai no thay vi dung mot khoi rieng. */
      setSizeSel: guard(e => {
        const sz = e.target.value;
        if (sz === szKey) return;
        const n = slots.filter(Boolean).length;
        if (!n) { this.applySize(sz, slotKey, curOcc, teamId, SLOT_ROLES.length); return; }
        this.openCtx(e, "Đổi sang sân " + sz + "?", [
          { label: "Vẫn đổi — xoá đội hình " + n + " người", tone: "danger",
            click: () => this.applySize(sz, slotKey, curOcc, teamId, SLOT_ROLES.length) },
          { label: "Thôi, giữ sân " + szKey, click: () => {} }
        ]);
      }),
      formSel: effFormation,
      formOptions: Object.keys(SIZE_FORMATIONS[szKey]).map(f => ({ value: f, label: f })),
      setFormSel: guard(e => this.setFormation(e.target.value, slotKey)),
      /* Hinh luc mat bong. FM26 khong bat ve so do thu hai roi tu noi o nay voi
         o kia -- no cho chon trong vai hinh goi y san, va ban do "ai sang o nao"
         nam san trong tung cap (OOP_SPEC). San 5 co y de trong: doi 5 nguoi lui
         ca khoi chu khong doi hinh. */
      offSel: formOff,
      offOptions: oopChoices(szKey, effFormation).map(o => ({ value: o[0], label: o[1] })),
      setOffSel: guard(e => this.tacticPatch({ formationOff: e.target.value })),
      hasOffChoice: oopChoices(szKey, effFormation).length > 1,
      /* Noi thang chenh lech giua hai san bang so. Hai hinh gan giong nhau thi
         mat khong doc ra duoc, va cau 47 cua ban kiem la ve dung chuyen do. */
      phaseDelta: (() => {
        const on = shapeFor(actTactic, baseOf("on"), slotRolesOf("on"), "on");
        const off = shapeFor(actTactic, baseOf("off"), slotRolesOf("off"), "off");
        const dy = on.reduce((a2, p, k) => a2 + (parseFloat(off[k][1]) - parseFloat(p[1])), 0) / (on.length || 1);
        const wOf = a2 => Math.max.apply(null, a2.map(p => parseFloat(p[0]))) - Math.min.apply(null, a2.map(p => parseFloat(p[0])));
        const dw = wOf(on) - wOf(off);
        const bits = [];
        bits.push(dy >= 0.5 ? ("lùi " + Math.round(dy) + "%")
          : (dy <= -0.5 ? ("dâng " + Math.round(-dy) + "%") : "đứng nguyên"));
        if (dw >= 1) bits.push("hẹp " + Math.round(dw) + "%");
        else if (dw <= -1) bits.push("rộng " + Math.round(-dw) + "%");
        /* Mot PHAN QUYET, khong chi hai con so. Trong tai: "Chay thu chay xong
           khong noi gi -- cho FM se dua ra mot ket luan." Nguong doc thang tu
           chinh con so phan tram vua do, khong phai cam giac. */
        const move = Math.max(Math.abs(dy), Math.abs(dw));
        const verdict = move < 3 ? "gần như không đổi khối"
          : (move < 10 ? "đổi khối nhẹ" : "đổi khối rõ");
        return "mất bóng: " + bits.join(" · ") + " — " + verdict;
      })(),
      mentSel: (actTactic && actTactic.mentality) || "bal",
      mentOptions: [["def", "Phòng ngự"], ["bal", "Cân bằng"], ["att", "Tấn công"]].map(m => ({ value: m[0], label: m[1] })),
      setMentSel: guard(e => this.tacticPatch({ mentality: e.target.value })),
      // Every slot's posture, so a conflict check can see the shape not just the sliders.
      // Which phase the tactics pitch is drawing, and the only rows that matter
      // while you are looking at it. FM26 filters its instruction panel to the
      // phase in focus rather than stacking every row behind one Advanced
      // toggle; this is the same idea with two phases instead of nine zones.
      /* Dai chon pha chi con can khi tren man CHI CO MOT san. Co hai san canh
         nhau thi nhan cua chinh chung la nut chon -- xem `pitch2Edit`. Hai cho
         dieu khien cung mot thu, ma cai o cot phai lai khong dinh gi toi cai no
         dieu khien: bam vao no thi mot trong hai san doi vai, nguoi bam phai tu
         doi mat sang cho khac de biet vua xay ra gi. */
      showPhaseSeg: !dualPitch,
      pitch2Edit: () => this.setState({ tacPhase: tacPhase === "on" ? "off" : "on", picked: null, playMs: null }),
      tacPhaseSeg: [["on", "Có bóng"], ["off", "Mất bóng"]].map(v => ({
        label: v[1],
        bg: tacPhase === v[0] ? "#6821DC" : "#1F2332",
        fg: tacPhase === v[0] ? "#FAFAFF" : "rgba(250,250,255,0.7)",
        line: tacPhase === v[0] ? "#6821DC" : "rgba(255,255,255,0.08)",
        click: () => this.setState({ tacPhase: v[0] })
      })),
      tacPhaseNote: tacPhase === "on"
        ? "Đang xem đội hình lúc có bóng. Đổi chỉ đạo bên dưới, sân dịch theo ngay."
        : "Đang xem lúc mất bóng. Dâng cao và áp sát kéo cả khối lên xuống.",
      /* Loc theo pha la de danh cho dien thoai: cot chi du cho bon dong. Tren man
         rong cot cao 922px ma chi co 608px chu -- 350px trong, trong khi ba chi
         dao khi mat bong (Dang cao · Ap sat · Cach kem) bi giau sau mot cu bam.
         Man rong hien ca ba pha, dung nhu FM bay ca ba khoi cung luc. */
      tacticPhases: INS_PHASES.filter(ph => !st.narrow || ph.key === "trans" || ph.key === tacPhase).map(ph => ({
        label: ph.label,
        rows: ph.rows.map(row => {
          const cur = insOf(actTactic, row.key);
          const own = !!((actTactic && actTactic.ins) || {})[row.key];
          const o = row.opts.find(x => x[0] === cur);
          return {
            label: row.label,
            /* FM phan biet chi dao HLV tu dat voi chi dao do Cach da giao.
               O day cung vay, nhung bang MAU VIEN cua o dang chon (dam = tu dat,
               nhat = theo Cach da) chu khong phai bang chu: chu "theo Cach da"
               lap dung bay lan tren mot cot da chat kin, va no noi lai dung cai
               ma mau vua noi. Cau giai thich mau nam MOT lan o dau cot. */
            note: (o && o[2]) || "",
            canReset: own,
            reset: guard(() => {
              const ins = { ...((actTactic && actTactic.ins) || {}) };
              delete ins[row.key];
              this.tacticPatch({ ins });
            }),
            opts: row.opts.map(o2 => ({
              label: o2[1],
              bg: cur === o2[0] ? (own ? "rgba(104,33,220,0.35)" : "rgba(104,33,220,0.16)") : "rgba(255,255,255,0.04)",
              fg: cur === o2[0] ? "#FAFAFF" : "rgba(250,250,255,0.68)",
              line: cur === o2[0] ? (own ? "rgba(177,129,255,0.55)" : "rgba(177,129,255,0.22)") : "rgba(255,255,255,0.06)",
              click: guard(() => this.tacticPatch({ ins: { ...((actTactic && actTactic.ins) || {}), [row.key]: o2[0] } }))
            }))
          };
        })
      })),
      tacticWarns: (() => {
        const keys = SLOT_ROLES.map((r, n) => {
          const group = ROLE_GROUP[FM_.labels[n]] || "mid";
          const ovr = ((actTactic && actTactic.slots) || {})[n] || {};
          return { group: group, duty: roleDuty(group, ovr.role || (ROLES[group][0] || [])[0]) };
        });
        // The copy on the pitch is clickable: a warning you cannot act on from where
        // you are reading it is just noise.
        const ws = tacticConflicts(actTactic, keys);
        // Man hep chi hien chip dau (CSS), nen chip do phai mang so con lai --
        // giau bot ma khong noi con bao nhieu la giau thong tin.
        return ws.map((w, n) => this.noteOf(w, {
          badge: (n === 0 && ws.length > 1) ? String(ws.length) : "",
          click: () => this.setState({ paneTab: "tactic", lineupView: "tactics" })
        })).filter(x => x.show);
      })(),
      tacticSlots: (() => {
        const postures = SLOT_ROLES.map((r, n) => {
          const grp = ROLE_GROUP[FM_.labels[n]] || "mid";
          if (grp === "gk") return "gk";
          const ovr = ((actTactic && actTactic.slots) || {})[n] || {};
          return roleDuty(grp, ovr.role || (ROLES[grp][0] || [])[0]);
        });
        const shape = shapeFor(actTactic, FM_.pos, postures, tacPhase);
        return SLOT_ROLES.map((role, i) => {
        const ovr = ((actTactic && actTactic.slots) || {})[i] || {};
        const grp = ROLE_GROUP[FM_.labels[i]] || "mid";
        const duty = DUTIES.find(d => d[0] === roleDuty(grp, ovr.role || (ROLES[grp][0] || [])[0])) || DUTIES[1];
        const m = slots[i] ? byId(slots[i]) : null;
        return {
          left: shape[i][0], top: shape[i][1],
          moveMs: ({ slow: 1500, mid: 1000, fast: 650 }[((actTactic && actTactic.ins) || {}).tempo || "mid"]) + "ms",
          label: FM_.labels[i],
          bg: st.tacticSlot === i ? "#6821DC" : (m ? kit : "rgba(9,15,29,0.55)"),
          fg: "#FAFAFF",
          dutyTone: duty[2],
          /* Bien so cua o (RB) va vi tri sat cua nguoi (CB) truoc day duoc ve
             giong het nhau tren hai man: tab "Doi hinh" ghi vi tri cua NGUOI
             duoi tung o, tab "Chien thuat" ghi ma cua O trong cung mot cho.
             Doc lien nhau thi hai man mau thuan nhau ve cung mot cau thu, ma
             khong cho nao noi cai nao la cai gi. Nen o day: khi nguoi dang giu
             o co vi tri sat KHAC ma cua o, ghi kem vi tri sat trong ngoac. Bang
             nhau thi khong ghi -- them muc khong noi them gi la them nhieu. */
          role: (() => {
            if (!m) return SLOT_NAMES[i];
            const ho = m.name.trim().split(/\s+/).slice(-1)[0];
            const mine = posOf(m).main;
            return mine && mine !== FM_.labels[i] ? ho + "·" + mine : ho;
          })(),
          click: () => this.setState(s => ({ tacticSlot: s.tacticSlot === i ? null : i }))
        };
        });
      })(),
      slotOpen: st.tacticSlot != null,
      slotLabel: st.tacticSlot != null ? (SLOT_NAMES[st.tacticSlot] + " · " + FM_.labels[st.tacticSlot]) : "",
      slotRoles: st.tacticSlot != null ? (() => {
        const i = st.tacticSlot;
        const grp = ROLE_GROUP[FM_.labels[i]] || "mid";
        const ovr = ((actTactic && actTactic.slots) || {})[i] || {};
        return ROLES[grp].map(r => ({
          label: r[1], note: r[2],
          bg: ovr.role === r[0] ? "rgba(104,33,220,0.32)" : "#1F2332",
          fg: ovr.role === r[0] ? "#FAFAFF" : "rgba(250,250,255,0.85)",
          line: ovr.role === r[0] ? "rgba(177,129,255,0.6)" : "rgba(255,255,255,0.07)",
          click: guard(() => this.tacticSlotPatch(i, { role: r[0] }))
        }));
      })() : [],
      slotExtras: st.tacticSlot != null ? (() => {
        const i = st.tacticSlot;
        const ovr = ((actTactic && actTactic.slots) || {})[i] || {};
        const on = k => (ovr.extras || []).indexOf(k) >= 0;
        return EXTRAS.map(x => ({
          label: x[1],
          mark: on(x[0]) ? "✓" : "",
          box: on(x[0]) ? "#C1D439" : "rgba(255,255,255,0.12)",
          fg: on(x[0]) ? "#FAFAFF" : "rgba(250,250,255,0.7)",
          click: guard(() => {
            const cur = ((((actTactic && actTactic.slots) || {})[i] || {}).extras || []).slice();
            const at = cur.indexOf(x[0]);
            if (at >= 0) cur.splice(at, 1); else cur.push(x[0]);
            this.tacticSlotPatch(i, { extras: cur });
          })
        }));
      })() : [],

      /* ---------- pitch: demo motion + drawing ---------- */
      toggleDemo: () => this.toggleDemo(),
      /* Nam o vuong 44px chi co bieu tuong (⟳ ▯ 🛡 ✏ −) dung canh nhau tren mat
         san. Nguoi thu app doan sai ca nam va khong dam bam thu cai nao. Gio:
         mot nut chinh co chu (Chay thu) + mot nhom phu doc duoc trong menu san co. */
      pitchTools: e => this.openCtx(e, "Công cụ sân", [
        { label: st.stepMode ? "Tắt dựng nhiều bước" : "Dựng nhiều bước", hint: "quay chuyển động", click: () => this.renderVals().toggleStep() },
        { label: st.foesOn ? "Ẩn đội đối thủ" : "Hiện đội đối thủ (minh hoạ)", click: () => this.renderVals().toggleFoes() },
        isAdmin && { label: st.drawMode ? "Dừng vẽ mũi tên" : "Vẽ mũi tên", click: () => this.renderVals().toggleDraw() },
        isAdmin && forPhase(st.arrows, tacPhase).length > 0
          && { label: "Xoá mũi tên đã vẽ", tone: "danger", click: () => this.renderVals().clearDraw() }
      ]),
      /* "Cong cu san" (119px) cong "Chay thu" (105) cong dai XEP/LECH (121) cong khe
         = 361px, nhet vao 327px long -- dai thong ke rot xuong dong hai va hang cao
         79px thay vi 44px. Bo chu "san": hang du cho ca ba. */
      toolsLabel: st.drawMode ? "Đang vẽ" : (st.stepMode ? "Dựng bước" : (st.foesOn ? "Đang hiện đối thủ" : "Công cụ")),
      toolsBg: (st.drawMode || st.stepMode || st.foesOn) ? "rgba(104,33,220,0.35)" : "#1F2332",
      toolsFg: (st.drawMode || st.stepMode || st.foesOn) ? "#FAFAFF" : "rgba(250,250,255,0.7)",
      demoLabel: st.demoOn ? "Dừng mô phỏng" : "Chạy thử",
      demoBg: st.demoOn ? "rgba(193,212,57,0.18)" : "#1F2332",
      demoFg: st.demoOn ? "#C1D439" : "rgba(250,250,255,0.7)",
      demoPhaseNote: this.noteOf(!st.demoOn
        ? "Bấm Chạy thử để xem khối đội hình dâng lên / lùi về theo chỉ đạo đang đặt."
        : (st.demoPhase ? "Pha có bóng: cả khối dâng theo mức Dâng cao." : "Pha mất bóng: lùi về, áp sát theo mức đã đặt.")),
      toggleDraw: guard(() => this.setState(s => ({ drawMode: !s.drawMode, drawFrom: null }))),
      drawLabel: st.drawMode ? "Đang vẽ" : "Vẽ mũi tên",
      drawBg: st.drawMode ? "rgba(104,33,220,0.35)" : "#1F2332",
      drawFg: st.drawMode ? "#FAFAFF" : "rgba(250,250,255,0.7)",
      // Xoa ve chi xoa pha dang xem -- mui ten cua pha kia khong lien quan.
      clearDraw: guard(() => this.setState(s2 => {
        const arrows = (s2.arrows || []).filter(v => phaseOf(v) !== tacPhase);
        this.persist({ arrows });
        return { arrows, drawFrom: null };
      })),
      // Ban ghi cu co the con "Infinity%" tu truoc khi pitchPct co mat.
      arrows: forPhase(st.arrows, tacPhase).filter(v =>
        ["x1", "y1", "x2", "y2"].every(k => isFinite(parseFloat(v[k])))),
      hasArrows: forPhase(st.arrows, tacPhase).length > 0,
      // San thu hai cung phai ve mui ten cua PHA CUA NO, khong thi doi pha xong
      // ban ke hoach bien mat ca hai ben.
      arrows2: forPhase(st.arrows, otherPhase).filter(v =>
        ["x1", "y1", "x2", "y2"].every(k => isFinite(parseFloat(v[k])))),
      // Opponents are the same size as our players now, so a straight mirror put
      // their forward on top of our keeper. Mirror the shape, then stagger it
      // sideways by half a slot so the two teams interleave the way they do on a
      // real pitch instead of stacking concentric circles.
      // Truoc day doi thu CHI hien khi dang chay thu, nen muon nhin doi hinh doi
      // ban thi buoc phai bat animation. Tach ra: nut rieng, dung duoc luc dung yen.
      // Bảng bước: HLV bày người, lưu bước, bày tiếp, lưu bước nữa, rồi bấm phát.
      stepMode: !!st.stepMode,
      toggleStep: () => this.setState(s => ({ stepMode: !s.stepMode, playMs: null })),
      hasSteps: !!stepList.length,
      stepCount: stepList.length,
      stepLabel: "Bước " + Math.min(st.stepI + 1, Math.max(1, stepList.length)) + "/" + Math.max(1, stepList.length) + " · " + (tacPhase === "off" ? "mất bóng" : "có bóng"),
      // Buoc moi luon chup tu vi tri DANG HIEN tren san, khong phai tu hinh goc.
      stepSaveNow: () => this.stepSave(livePos || pitchShape),
      stepPrev: () => this.setState(s => ({ stepI: Math.max(0, s.stepI - 1), playMs: null })),
      /* Kep theo so buoc CUA PHA DANG XEM, khong theo tong ca hai pha.
         `stepI` la chi so trong danh sach da loc pha (`forPhase`), nhung tran
         cu kep bang `steps.length - 1` -- tong ca pha co bong lan mat bong. Dung
         mot pha ba buoc con pha kia bon, bam "Sau" qua bon lan thi `livePos` rong
         va san lang le nhay ve hinh nen, khong mot dau hieu nao. */
      stepNext: () => this.setState(s => ({
        stepI: Math.min(Math.max(0, forPhase(s.steps, this._phase === "off" ? "off" : "on").length - 1), s.stepI + 1),
        playMs: null })),
      stepDel: () => this.stepDrop(st.stepI),
      stepPlayNow: () => this.stepPlay(),
      stepStopNow: () => this.stepStop(),
      isPlaying: st.playMs != null,
      /* Nhung vong tron trang kia KHONG phai doi bong nao that. App khong co
         mot dong du lieu nao ve doi ban: hinh nay la so do cua CHINH MINH o pha
         nguoc lai, lat guong roi day ra cho khoi chong. Ve ra ma khong noi thi
         nguoi dung tuong app biet doi thu da the nao. */
      foesNote: this.noteOf((st.demoOn || st.foesOn)
        ? "Đội trắng là hình minh hoạ: app không có dữ liệu đội bạn, đây là sơ đồ của chính mình lật gương để ước lượng khoảng trống."
        : ""),
      foesOn: !!st.foesOn,
      subList: (st.subs || []).slice(-6).reverse().map(x => ({ text: x.text })),
      hasSubs: !!(st.subs || []).length,
      toggleFoes: () => this.setState(s => ({ foesOn: !s.foesOn })),
      foes: (st.demoOn || st.foesOn) ? (() => {
        // A plain 180° mirror lands the opposition on top of us, because every
        // formation here is left-right symmetric: 100-x maps our left back onto
        // our right back's column, and 100-y maps one of our rows onto another.
        // So mirror, then push apart until nobody is inside anyone else. Works for
        // 5, 7 and 11 without a per-formation table.
        /* Guong hinh cua PHA NGUOC LAI, khong phai so do goc.

           Minh dang co bong thi ho dang phong ngu, nen ho phai dung o hinh mat
           bong; minh mat bong thi ho dang len, dung hinh co bong. `pitchShape2`
           chinh la pha con lai -- cau 35. Truoc day day la FM_.pos, mot hinh
           dung yen bat ke pha nao. */
        const mine = pitchShape2.map(p => [parseFloat(p[0]), parseFloat(p[1])]);
        const drift = st.demoPhase ? 5 : -3;
        const foe = mine.map(([x, y]) => [100 - x, Math.max(9, Math.min(91, 100 - y + drift))]);
        // One token is 9% of the pitch WIDTH, so compare everything in width
        // units. A gap of dy% of the HEIGHT is dy * H/W = dy / (W/H) of a width:
        // divide by the aspect ratio, never multiply. On a tall pitch the same
        // percentage covers more ground vertically than horizontally.
        const [rw, rh] = SIZE_RATIO[szKey].split("/").map(Number);
        const AR = rw / rh, need = 7.5;
        for (let pass = 0; pass < 12; pass++) {
          foe.forEach((f, i) => {
            mine.concat(foe.filter((_, j) => j !== i)).forEach(o => {
              const dx = f[0] - o[0], dy = (f[1] - o[1]) / AR;
              const d = Math.hypot(dx, dy);
              if (d >= need) return;
              // Dead centre: nudge along x, alternating so a pair doesn't chase
              // each other in the same direction forever.
              const ux = d < 0.01 ? (i % 2 ? 1 : -1) : dx / d;
              const uy = d < 0.01 ? 0 : dy / d;
              const push = (need - d) * 0.6;
              f[0] = Math.max(9, Math.min(91, f[0] + ux * push));
              f[1] = Math.max(8, Math.min(92, f[1] + uy * push * AR));
            });
          });
        }
        return foe.map(f => ({
          left: f[0] + "%",
          top: f[1] + "%",
          moveMs: ({ slow: 1500, mid: 1000, fast: 650 }[((actTactic && actTactic.ins) || {}).tempo || "mid"]) + "ms"
        }));
      })() : [],
      pitchClick: e => {
        if (!st.drawMode) return;
        const r = e.currentTarget.getBoundingClientRect();
        const x = pitchPct(e.clientX, r.left, r.width);
        const y = pitchPct(e.clientY, r.top, r.height);
        // The da bi thay giua hai cu bam thi rect rong 0 -> bo qua, dung ghi rac.
        if (x === null || y === null) { this.setState({ drawFrom: null }); return; }
        this.setState(s => {
          if (!s.drawFrom) return { drawFrom: { x: x, y: y } };
          const arrows = (s.arrows || []).concat([{
            x1: s.drawFrom.x + "%", y1: s.drawFrom.y + "%", x2: x + "%", y2: y + "%",
            ph: tacPhase
          }]);
          // Ve xong ma khong luu thi ke hoach bien mat ngay lan tai lai dau tien,
          // va ca doi khong ai thay -- ve cho ai xem.
          this.persist({ arrows: arrows });
          return { arrows: arrows, drawFrom: null };
        });
      },

      /* ---------- lineup: per-session slot instructions ---------- */
      slotPanelOpen: st.pickedSlot != null,
      // Individual instructions take over the right rail instead of opening a
      // full-width panel under the stage, which was wider than the pitch itself.
      // Chi dao ca nhan da chuyen han sang COT TRAI (.fmrail), nen danh sach ca
      // doi khong con phai nhuong cho no nua -- luon hien. Truoc day hai cai loai
      // tru nhau o cot phai: mo chi dao thi 5/14 nguoi troi khoi tam nhin, dung
      // luc dang can nhin ca doi de chon nguoi thay.
      slotPanelClosed: true,
      slotPanelPos: st.pickedSlot != null ? FM_.labels[st.pickedSlot] : "",
      slotPanelName: st.pickedSlot != null
        ? ((slots[st.pickedSlot] && byId(slots[st.pickedSlot]) ? byId(slots[st.pickedSlot]).name : "Ô còn trống") + " · " + SLOT_NAMES[st.pickedSlot])
        : "",
      slotDirty: st.pickedSlot != null && !!(st.slotOvr || {})[slotKey + "#" + st.pickedSlot],
      closeSlotPanel: () => this.setState({ pickedSlot: null }),

      /* ---------- context menu chrome ---------- */
      ctxOpen: !!st.ctx,
      ctxTitle: st.ctx ? st.ctx.title : "",
      ctxPos: st.ctx && st.ctx.sheet ? "fixed" : "absolute",
      ctxX: st.ctx ? (st.ctx.sheet ? "0px" : st.ctx.x + "px") : "0px",
      ctxY: st.ctx ? (st.ctx.sheet ? "auto" : st.ctx.y + "px") : "0px",
      ctxRight: st.ctx && st.ctx.sheet ? "0px" : "auto",
      ctxBottom: st.ctx && st.ctx.sheet ? "0px" : "auto",
      ctxW: st.ctx && st.ctx.sheet ? "100%" : "240px",
      ctxRadius: st.ctx && st.ctx.sheet ? "16px 16px 0 0" : "10px",
      ctxScrim: st.ctx && st.ctx.sheet ? "rgba(9,15,29,0.6)" : "transparent",
      closeCtx: () => this.closeCtx(),
      ctxItems: st.ctx ? st.ctx.items.map(it => ({
        label: it.label,
        hint: it.hint || "",
        // A rule above the destructive verb so it is not one slip away from the rest.
        sep: it.tone === "danger",
        fg: it.tone === "danger" ? "#FF6B57" : (it.tone === "act" ? "#C1D439" : "rgba(250,250,255,0.88)"),
        click: this.ctxRun(it.click)
      })) : [],
      // Clicking an occupied slot opens this panel; without this there is no way
      // to take a player back off the pitch.
      slotPanelCanOut: st.pickedSlot != null && !!slots[st.pickedSlot] && isAdmin,
      slotPanelOut: guard(() => { if (st.pickedSlot != null) this.benchOut(st.pickedSlot); }),
      resetSlotOvr: guard(() => this.setState(s => {
        const slotOvr = { ...s.slotOvr };
        delete slotOvr[slotKey + "#" + s.pickedSlot];
        this.persist({ slotOvr });
        return { slotOvr, lineupMsg: "Đã trả ô này về chỉ đạo mẫu." };
      })),
      /* Mot o, hai vai tro. Truoc day mot vai tro phai ganh ca hai pha nen
         "Kem chat" va "Boc lot" cung ra tu the `def` va ve ra dung mot cho --
         cau 52. Gio moi pha co bo rieng, va do lech cua vai tro keo o di that. */
      slotPanelRoles: st.pickedSlot != null ? (() => {
        const i = st.pickedSlot;
        const grp = ROLE_GROUP[FM_.labels[i]] || "mid";
        const base = ((actTactic && actTactic.slots) || {})[i] || {};
        const ovr = (st.slotOvr || {})[slotKey + "#" + i] || base;
        const cur = splitLegacyRole(grp, ovr.role || "").role;
        return ROLES[grp].map(r => ({
          label: r[1], note: r[2],
          cursor: isAdmin ? "pointer" : "default",
          bg: cur === r[0] ? "rgba(104,33,220,0.32)" : "#161925",
          fg: cur === r[0] ? "#FAFAFF" : "rgba(250,250,255,0.85)",
          line: cur === r[0] ? "rgba(177,129,255,0.6)" : "rgba(255,255,255,0.07)",
          click: guard(() => this.slotOvrPatch(slotKey, i, { role: r[0] }))
        }));
      })() : [],
      slotPanelRolesOff: st.pickedSlot != null ? (() => {
        const i = st.pickedSlot;
        const grp = ROLE_GROUP[FM_.labels[i]] || "mid";
        const base = ((actTactic && actTactic.slots) || {})[i] || {};
        const ovr = (st.slotOvr || {})[slotKey + "#" + i] || base;
        const cur = ovr.roleOff || splitLegacyRole(grp, ovr.role || "").roleOff;
        return (ROLES_OOP[grp] || []).map(r => ({
          label: r[1], note: r[2],
          cursor: isAdmin ? "pointer" : "default",
          bg: cur === r[0] ? "rgba(104,33,220,0.32)" : "#161925",
          fg: cur === r[0] ? "#FAFAFF" : "rgba(250,250,255,0.85)",
          line: cur === r[0] ? "rgba(177,129,255,0.6)" : "rgba(255,255,255,0.07)",
          click: guard(() => this.slotOvrPatch(slotKey, i, { roleOff: r[0] }))
        }));
      })() : [],
      slotPanelExtras: st.pickedSlot != null ? (() => {
        const i = st.pickedSlot;
        const base = ((actTactic && actTactic.slots) || {})[i] || {};
        const ovr = (st.slotOvr || {})[slotKey + "#" + i] || base;
        const on = k => (ovr.extras || []).indexOf(k) >= 0;
        /* Trang thai cua tung chi dao so voi VAI dang chon -- cho Football
           Manager to "Part Of Role" va "Conflicting". Xem `extraState`. */
        const grp2 = ROLE_GROUP[FM_.labels[i]] || "mid";
        const curRole = splitLegacyRole(grp2, ovr.role || "").role;
        return EXTRAS.map(x => {
          const stx = extraState(x[0], grp2, curRole, actTactic);
          const isOn = on(x[0]);
          return {
          label: x[1],
          /* Noi ra bang CHU, khong chi bang mau: dang bat mot chi dao da nam san
             trong vai la thua, va bat mot chi dao da nhau voi vai la hai lenh
             nguoc nhau -- ca hai deu phai doc duoc chu khong phai doan tu mau. */
          note: stx === "conflict" ? "đá nhau với vai" : (stx === "part" ? "vai đã có" : ""),
          noteFg: stx === "conflict" ? "#FF6B57" : "rgba(250,250,255,0.5)",
          cursor: isAdmin ? "pointer" : "default",
          mark: isOn ? "✓" : "",
          box: stx === "conflict" && isOn ? "#FF6B57" : (isOn ? "#C1D439" : "rgba(255,255,255,0.12)"),
          fg: stx === "conflict" && isOn ? "#FF6B57" : (isOn ? "#FAFAFF" : (stx ? "rgba(250,250,255,0.45)" : "rgba(250,250,255,0.7)")),
          click: guard(() => {
            const cur = (ovr.extras || []).slice();
            const at = cur.indexOf(x[0]);
            if (at >= 0) cur.splice(at, 1); else cur.push(x[0]);
            this.slotOvrPatch(slotKey, i, { extras: cur });
          })
        };});
      })() : [],

      /* ---------- in-house: split into two sides ---------- */
      splitTeams: guard(() => this.setState(s => {
        // Chia doi cung khong lay nguoi dang chan thuong -- cung mot le voi Tu dong.
        const hurtSkip = active.filter(m => attGoing(att[m.id]) && hurtOf(m)).length;
        const pool = active.filter(m => attGoing(att[m.id]) && !hurtOf(m));
        if (pool.length < 2) return { copied: hurtSkip
          ? "Cần ít nhất 2 người nhận buổi này mà không chấn thương."
          : "Cần ít nhất 2 người nhận buổi này." };
        // `m.rating` la diem CU gõ tay; diem that suy tu 12 chi so nam o ratingOf.
        const sp = splitSides(pool, ratingOf, lineOf);
        const splitByOcc = { ...s.splitByOcc, [curOcc]: { a: sp.a, b: sp.b } };
        this.persist({ splitByOcc });
        return { splitByOcc, splitOpen: true,
          copied: "\u0110\u00e3 chia " + pool.length + " ng\u01b0\u1eddi \u00b7 \u0111i\u1ec3m " + sp.ptA + " \u2013 " + sp.ptB + "." };
      })),
      hasSplit: !!(curSplit && curSplit.a && curSplit.b),
      /* Chia doi xong thi hai danh sach nam do NHIN thoi: muon co doi hinh that
         phai doc man hinh roi keo tay lai tung nguoi. Nut nay day thang hai ben
         vao `slotsByOcc` (A o khoa buoi, B o khoa "#B" -- dung quy uoc slotKey
         da co), nguoi thua xuong bang ghe cua chinh ben do.

         Xep bang `bestFreeSlot` chu khong goi `autoFill`: autoFill lam viec cua
         MOT ben dang mo va boc nguoi tu diem danh ca doi, dung no hai lan se
         cho hai ben gianh cung mot nguoi. Thu mon di truoc vi o thu mon chi co
         mot -- de sau thi nguoi khac chiem mat va thu mon ra bang ghe. */
      splitToLineup: guard(() => this.setState(s => {
        const sp = (s.splitByOcc || {})[curOcc];
        if (!sp || !sp.a || !sp.b) return { copied: "Chưa chia đội — bấm Chia đội trước đã." };
        if (curOcc === "none" || !hasOcc) return { copied: "Chưa chọn buổi nào để xếp." };
        const N = SLOT_ROLES.length;
        const place = ids => {
          const out = new Array(N).fill(null), bench = [];
          (ids || []).map(id => byId(id)).filter(Boolean)
            .sort((p1, p2) => (isKeeper(p1) ? 0 : 1) - (isKeeper(p2) ? 0 : 1))
            .forEach(m => {
              const i = bestFreeSlot(out, SLOT_ROLES, posOf(m), FM_.labels);
              if (i < 0) bench.push(m.id); else out[i] = m.id;
            });
          return { out, bench };
        };
        const A = place(sp.a), B = place(sp.b);
        const before = { slotsByOcc: s.slotsByOcc, benchByTeam: s.benchByTeam };
        const out = {
          slotsByOcc: { ...s.slotsByOcc, [curOcc]: A.out, [curOcc + "#B"]: B.out },
          benchByTeam: { ...s.benchByTeam, [curOcc]: A.bench, [curOcc + "#B"]: B.bench }
        };
        this.persist(out);
        const say = (x, n) => x.out.filter(Boolean).length + "/" + n + (x.bench.length ? (" + " + x.bench.length + " dự bị") : "");
        return { ...out, picked: null, autoWhy: [], teamTab: "A", undo: { state: before },
          copied: "Đã xếp A " + say(A, N) + " · B " + say(B, N) + ". Bấm HOÀN TÁC nếu không ưng." };
      })),
      /* Copy de dan vao nhom chat -- cho ma ca doi thuc su doc. */
      copySplit: guard(() => {
        const sp = curSplit;
        if (!sp || !sp.a || !sp.b) { this.setState({ copied: "Chưa chia đội — bấm Chia đội trước đã." }); return; }
        const line = ids => (ids || []).map(id => byId(id)).filter(Boolean)
          .map(m => (m.num ? (m.num + ". ") : "") + m.name).join("\n");
        this.copyText("ĐỘI A (" + starText(sideStars(sp.a)) + ")\n" + line(sp.a)
          + "\n\nĐỘI B (" + starText(sideStars(sp.b)) + ")\n" + line(sp.b));
      }),
      clearSplit: guard(() => this.setState(s => {
        const splitByOcc = { ...s.splitByOcc };
        delete splitByOcc[curOcc];
        this.persist({ splitByOcc });
        return { splitByOcc, copied: "Đã xoá kết quả chia đội." };
      })),
      /* Cong SAO chu khong cong diem. Nguoi doc man chia doi la ca doi, khong
         phai doi truong -- "A 87 diem" khong noi gi neu khong biet thang 20. */
      splitNote: curSplit
        ? ("chênh lệch " + starText(Math.abs(sideStars(curSplit.a) - sideStars(curSplit.b))))
        : "chưa chia - bấm Chia đội",
      splitALabel: curSplit ? ("A · " + starText(sideStars(curSplit.a))) : "A",
      splitBLabel: curSplit ? ("B · " + starText(sideStars(curSplit.b))) : "B",
      teamA: ((curSplit && curSplit.a) || []).map(id => byId(id)).filter(Boolean)
        .map(m => ({ num: m.num || "-", name: m.name, rating: starText(starCount(ratingOf(m))) })),
      teamB: ((curSplit && curSplit.b) || []).map(id => byId(id)).filter(Boolean)
        .map(m => ({ num: m.num || "-", name: m.name, rating: starText(starCount(ratingOf(m))) }))
    };
  }

  /* ---------- small state writers shared by the bindings above ---------- */
  // Clipboard writes reject when the page is not focused or not on a secure
  // origin. Every copy button routes through here so a blocked copy tells the
  // user instead of surfacing an unhandled rejection.
  copyText(txt) {
    if (!navigator.clipboard) { this.setState({ copied: "Trình duyệt này không copy được - chọn và copy tay nhé." }); return; }
    navigator.clipboard.writeText(txt).catch(() => this.setState({ copied: "Không copy được - bấm lại khi cửa sổ đang mở." }));
  }

  /* ---------- context menus ----------
     Right-click is a first-class input here, the way it is in Football Manager:
     left-click is the fast, frequent act (pick a player up, put him down), and
     right-click is the deliberate one (instructions, role, captain, remove).
     The calendar already used onContextMenu, so this generalises that idiom
     instead of inventing a second one. */
  openCtx(e, title, items) {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    // Once someone has actually right-clicked, stop offering to teach them.
    if (e && e.type === "contextmenu" && !this.state.sawCtx) {
      this.state.sawCtx = true;
      this.persist({ sawCtx: true });
    }
    const live = (items || []).filter(Boolean);
    if (!live.length) return;
    const W = typeof window !== "undefined" ? window.innerWidth : 900;
    const H = typeof window !== "undefined" ? window.innerHeight : 700;
    const sheet = W < 640;                       // phones get a bottom sheet, not a floating menu
    const h = 52 + live.length * 42;
    /* Bam bang chuot thi co clientX/clientY. Bam bang BAN PHIM thi khong:
       Enter tren mot `div role="button"` sinh ra su kien co clientX = 0, va
       `|| 40` cu day cai menu len goc tren ben trai -- cach xa cai nut vua bam,
       de len dung dai tab o dau man. Neo vao o chu nhat cua chinh phan tu vua
       bam thay vi mot con so 40 bia ra. Van con `|| 40` lam duong cuoi cho
       truong hop khong co ca su kien lan phan tu. */
    const el = e && (e.currentTarget || e.target);
    const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    const ax = (e && e.clientX) || (r && r.left) || 40;
    const ay = (e && e.clientY) || (r && r.bottom + 4) || 40;
    const x = Math.max(8, Math.min(ax, W - 248));
    const y = Math.max(8, Math.min(ay, Math.max(8, H - h - 8)));
    this.setState({ ctx: { title: title, items: live, x: x, y: y, sheet: sheet } });
  }

  /* Doi kho san: xoa doi hinh dang xep va chi dao rieng cua tung o. Tach ra
     khoi renderVals de ca duong "khong co ai tren san" lan duong "hoi lai roi
     van doi" chay CUNG MOT doan -- truoc do la hai ban sao, va ban o duong hoi
     lai tung quen `dropSlotOvr`. */
  applySize(sz, slotKey, curOcc, teamId, roleCount) {
    this.setState(s => {
      const empty = new Array(SIZE_FORMATIONS[sz][Object.keys(SIZE_FORMATIONS[sz])[0]].labels.length).fill(null);
      const out = curOcc !== "none"
        ? { slotsByOcc: { ...s.slotsByOcc, [slotKey]: empty } }
        : { slotsByTeam: { ...s.slotsByTeam, [teamId]: empty } };
      this.persist(out);
      // Doi kho san la xoa sach doi hinh, nen ly do xep cu het dung.
      return { ...out, autoWhy: [] };
    });
    // `SLOT_ROLES` la bien CUC BO trong renderVals -- phuong thuc ngoai khong
    // thay. Truyen so o vao, dung doan.
    this.dropSlotOvr(slotKey, roleCount);
    this.tacticPatch({ size: sz, formation: Object.keys(SIZE_FORMATIONS[sz])[0], slots: {} });
  }

  closeCtx() { if (this.state.ctx) this.setState({ ctx: null }); }

  // Wrap a menu item's action so the menu always closes, even if the action throws.
  ctxRun(fn) {
    return () => { try { fn(); } finally { this.setState({ ctx: null }); } };
  }

  // Touch has no right-click. A 480ms press on the same spot opens the same menu.
  lpStart(e, title, items) {
    if (e.pointerType === "mouse") return;
    const x = e.clientX, y = e.clientY;
    clearTimeout(this._lpT);
    this._lpT = setTimeout(() => {
      this._lpFired = true;
      this.openCtx({ clientX: x, clientY: y, preventDefault() {}, stopPropagation() {} }, title, items);
    }, 480);
  }
  lpEnd() { clearTimeout(this._lpT); }

  /* Kéo thả bằng pointer, một đường cho cả chuột lẫn ngón tay.

     Trước đây là HTML5 drag-and-drop (`draggable="true"` + dragstart/drop), thứ
     **không tồn tại trên cảm ứng** -- không một sự kiện nào bắn ra. Cả đội dùng
     điện thoại, nên tính năng kéo thả coi như chưa từng có ở đúng chỗ nó cần.

     Runtime này vẽ lại toàn bộ cây mỗi lần setState, nên không được setState
     trong lúc kéo. Bóng ma là một bản sao gắn thẳng vào body và dịch bằng
     transform; đích đến tra bằng elementFromPoint. Chỉ lúc thả mới đụng state. */
  /* Chi hit khi con tro dang o TRONG mat san. Ngoai san (bang ca doi, thanh
     cong cu, mep man) tra null -- tha ra do van la khong lam gi. */
  slotNear(x, y) {
    const pit = document.querySelector(".fmpitch");
    if (!pit) return null;
    const r = pit.getBoundingClientRect();
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) return null;
    const els = [...pit.querySelectorAll("[data-slot]")];
    const cents = els.map(el => {
      const b = el.getBoundingClientRect();
      return b.width ? { cx: b.left + b.width / 2, cy: b.top + b.height / 2 } : null;
    });
    const i = nearestSlotIdx(cents, x, y);
    return i < 0 ? null : els[i];
  }

  pdStart(e, id) {
    if (e.button > 0) return;
    if (!id && !this.state.stepMode) return;
    const sx = e.clientX, sy = e.clientY, src = e.currentTarget;
    let ghost = null, over = null;
    const mark = el => {
      if (over === el) return;
      if (over) over.style.outline = "";
      over = el;
      if (over) over.style.outline = "2px solid #C1D439";
    };
    const move = ev => {
      if (!ghost) {
        if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 8) return;
        this.lpEnd();                       // kéo thì không phải nhấn giữ
        ghost = src.cloneNode(true);
        ghost.className = "dragghost";
        document.body.appendChild(ghost);
      }
      ghost.style.left = ev.clientX + "px";
      ghost.style.top = ev.clientY + "px";
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      // Trung o hoac trung bang du bi thi lay thang. Khong trung nhung dang o
      // TRONG san thi hit vao o gan nhat -- xem `nearestSlotIdx`.
      mark((el && el.closest("[data-slot],[data-bench]")) || this.slotNear(ev.clientX, ev.clientY));
    };
    const up = ev => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("pointercancel", up);
      if (!ghost) return;                   // chạm ngắn: để click chạy như thường
      ghost.remove();
      const target = over; mark(null);
      // Nuốt cái click sinh ra sau khi thả, nếu không thì thả xong lại chọn luôn.
      document.addEventListener("click", k => { k.stopPropagation(); k.preventDefault(); },
        { capture: true, once: true });
      // Dang sua buoc thi keo la DOI CHO TREN SAN, khong phai doi cho hai cau thu.
      if (this.state.stepMode) {
        const pit = document.querySelector(".fmpitch");
        const pr = pit && pit.getBoundingClientRect();
        const px = pr && pitchPct(ev.clientX, pr.left, pr.width);
        const py = pr && pitchPct(ev.clientY, pr.top, pr.height);
        if (px !== null && py !== null && src && src.getAttribute) {
          const si = parseInt(src.getAttribute("data-slot"), 10);
          if (!isNaN(si)) this.stepMove(si, px, py);
        }
        return;
      }
      if (!target) return;
      const slot = target.getAttribute("data-slot");
      if (slot != null) this.assign(parseInt(slot, 10), id);
      else this.renderVals().dropToBench(id);
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
    document.addEventListener("pointercancel", up);
  }
  // True for the click that follows a long press, so the press does not also select.
  lpAte() { if (this._lpFired) { this._lpFired = false; return true; } return false; }

  /* Lời khuyên khác trạng thái.

     "1 nhận · sân 7 · thiếu 6" là TRẠNG THÁI -- nó đổi theo dữ liệu và phải ở
     lại. "Dâng cao nhưng cả hàng thủ đều giữ chỗ" là LỜI KHUYÊN -- đọc xong thì
     hoặc sửa, hoặc chấp nhận, và một khi đã chấp nhận thì nó không có quyền
     chiếm chỗ của mặt sân mãi mãi.

     Khoá theo ĐÚNG CÂU CHỮ, không theo id: tắt "Chưa ai nhận đi buổi này" xong
     mà tình hình đổi thành "5 nhận · sân 7 · thiếu 2" thì đó là câu khác, nên nó
     hiện lại. Tình huống mới luôn nói được, tình huống cũ thì im. Không cần hạn
     dùng, không cần dọn dẹp, và không bao giờ im lặng sai. */
  noteOf(text, extra) {
    const off = (this.state.notesOff || {})[text];
    return Object.assign({
      text: text || "", show: !!text && !off,
      hide: e => { if (e && e.stopPropagation) { e.stopPropagation(); e.preventDefault(); } return this.setState(s => {
        const notesOff = { ...(s.notesOff || {}), [text]: 1 };
        this.persist({ notesOff });
        return { notesOff };
      }); }
    }, extra || {});
  }

  /* ---------- đồng bộ ---------- */

  /* Ba khoa localStorage moi la "toan bo du lieu", khong phai mot:
       dpfm-v3     du lieu doi (nguoi, quy, lich, doi hinh)
       dpfm-cloud  { code, rev, adminKey } cua doi dang mo
       dpfm-teams  danh sach doi may nay biet, MOI DOI KEM CHIA SUA
     Thieu hai khoa sau thi ban du phong khong cuu duoc gi: chia sua 16 ky tu
     chi may tao doi giu, may chu KHONG dua lai lan thu hai. Mat no la doi do
     khong con ai sua duoc nua, vinh vien. */
  backupBlob() {
    const pick = k => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } };
    return { app: "da-phui", v: 1, at: new Date().toISOString(),
             data: pick(KEY), cloud: pick(CLOUD_KEY), teams: pick("dpfm-teams") };
  }

  cloudMeta() { try { return JSON.parse(localStorage.getItem(CLOUD_KEY) || "null"); } catch (e) { return null; } }
  cloudSet(m) { try { m ? localStorage.setItem(CLOUD_KEY, JSON.stringify(m)) : localStorage.removeItem(CLOUD_KEY); } catch (e) {} }
  teamListGet() { try { return JSON.parse(localStorage.getItem("dpfm-teams") || "[]"); } catch (e) { return []; } }
  teamListPut(e) {
    try { localStorage.setItem("dpfm-teams", JSON.stringify(teamListMerge(this.teamListGet(), e))); } catch (x) {}
  }

  // Cục đẩy lên KHÔNG mang điểm danh: nó có đường riêng, và trộn chung lại
  // chính là cách mười chín câu trả lời biến mất.
  cloudBlob() {
    const s = this.state, o = {};
    ["members", "ledger", "teams", "matches", "trophies", "events", "ranks", "slotsByTeam", "slotsByOcc",
     "kitByTeam", "benchByTeam", "matchKindByOcc", "paidByOcc", "waivedByOcc", "splitByOcc", "slotOvr",
     "closedOcc", "tacticsByTeam", "tacticLib", "tacticSel", "charges", "captainByTeam",
     "mentalityByTeam", "nameMode", "arrows", "subs", "steps"].forEach(k => { o[k] = s[k]; });
    return o;
  }

  cloudPush() {
    const m = this.cloudMeta(); if (!m || !m.code || !m.adminKey) return;
    clearTimeout(this._pushT);
    this._pushT = setTimeout(async () => {
      try {
        const r = await sbRpc("team_push", { p_code: m.code, p_data: this.cloudBlob(), p_rev: m.rev, p_admin_key: m.adminKey });
        const row = r && r[0];
        if (!row) return;
        if (row.conflict) {
          // Lay ban may chu de biet ho vua them ai, roi day lai BAN CUA MINH da
          // hop nhat -- khong phai day lai chinh ban vua keo ve.
          const fresh = await sbRpc("team_pull", { p_code: m.code });
          const srv = fresh && fresh[0];
          if (!srv) return;
          this.setState(s => {
            const members = mergeMembers(s.members, (srv.data || {}).members);
            this.persistLocalOnly({ members });
            return { members };
          });
          this.cloudSet({ ...m, rev: srv.rev });
          return this.cloudPush();
        }
        this.cloudSet({ ...m, rev: row.rev }); this.teamListPut({ code: m.code, rev: row.rev, name: row.name, short: row.short_code }); this.teamListPut({ code: m.code, rev: row.rev });
        this.setState({ netErr: "" });
      } catch (e) { this.setState({ netErr: "Đang lưu tạm trên máy này. " + netNow() }); }
    }, 600);
  }

  async cloudPull() {
    const m = this.cloudMeta(); if (!m || !m.code) return;
    try {
      const r = await sbRpc("team_pull", { p_code: m.code });
      const row = r && r[0]; if (!row) return;
      this.cloudSet({ ...m, rev: row.rev }); this.teamListPut({ code: m.code, rev: row.rev, name: row.name, short: row.short_code });
      const d0 = row.data || {};
      const tid = (d0.teams && d0.teams[0]) ? d0.teams[0].id : undefined;
      const patch = { ...d0, members: adoptMembers(d0.members, tid),
        attendByOcc: attToNested(row.att), netErr: "" };
      // Ban cu tren may chu con mang pwh thi cung khong duoc de len ban cua may nay.
      delete patch.pwh; delete patch.pw;
      this._applyingRemote = true;
      this.setState(patch);
      // Ghi xuống localStorage để mở lại lúc mất mạng vẫn còn bản gần nhất.
      this.persist(patch);
      this._applyingRemote = false;
    } catch (e) {
      this._applyingRemote = false;
      this.setState({ netErr: "Đang xem bản lưu trên máy này. " + netNow() });
    }
  }

  // Kéo định kỳ thay vì realtime: bảng đã khoá với anon nên realtime không đẩy
  // được, và 8 giây là quá đủ nhanh cho một buổi đá bóng.
  cloudStart() {
    if (this._pollT) return;
    this._pollT = setInterval(() => { if (this.cloudMeta()) this.cloudPull(); }, 8000);
  }

  formSet(k, v) { this.setState(s => ({ form: { ...s.form, [k]: v } })); }
  photoSet(k, v) { this.setState(s => ({ photoEdit: s.photoEdit ? { ...s.photoEdit, [k]: v } : null })); }
  trophSet(k, v) { this.setState(s => ({ troph: { ...s.troph, [k]: v } })); }
  /* Mot cai cup khong co ten thi khong phai cai cup -- nam thi cho de trong
     duoc, doi cu nho "hoi 2023 gi do" that. */
  addTrophy() {
    const t = this.state.troph;
    /* Tu danh hieu la thu ca doi khoe, nen no la cho de lot rac nhat: trong tai
       vong 26 cat duoc mot "giai" ten dai 280 ky tu va nam 9999999, va no hien
       thang trong Dong thoi gian chinh thuc cua doi. Cung app do, o Ten doi da
       chan cung o 40 ky tu. */
    if (!t.title.trim()) { this.setState({ copied: "Nhập tên giải để cất vào tủ." }); return; }
    if (t.title.trim().length > 60) { this.setState({ copied: "Tên giải dài quá 60 chữ thì tủ danh hiệu vỡ hàng." }); return; }
    if (String(t.year).trim()) {
      const yy = parseInt(t.year, 10);
      const nowY = new Date().getFullYear();
      if (!/^\d{4}$/.test(String(t.year).trim()) || !isFinite(yy) || yy < 1900 || yy > nowY + 1) {
        this.setState({ copied: "Năm phải là bốn chữ số trong khoảng 1900–" + (nowY + 1) + "." });
        return;
      }
    }
    this.setState(s => {
      const y = parseInt(t.year, 10);
      const trophies = [{
        teamId: this._team, id: Date.now(), title: t.title.trim(),
        year: isFinite(y) ? y : "", place: t.place || "champion", note: t.note.trim()
      }].concat(s.trophies);
      this.persist({ trophies });
      return { trophies, troph: { title: "", year: "", place: "champion", note: "" } };
    });
  }
  delTrophy(id) {
    this.setState(s => {
      const trophies = s.trophies.filter(t => t.id !== id);
      this.persist({ trophies });
      return { trophies };
    });
  }
  resSet(k, v) { this.setState(s => ({ res: { ...s.res, [k]: v } })); }
  txSet(k, v) { this.setState(s => ({ tx: { ...s.tx, [k]: v } })); }

  // Resolve the tactic the given side is currently on. Library is per team,
  // selection is per side.
  _activeTactic(s) {
    const lib = (((s.tacticLib || {})[this._team] || []).length)
      ? s.tacticLib[this._team] : [defaultTactic()];
    return lib.find(x => x.id === ((s.tacticSel || {})[this._sideKey]))
      || lib.find(x => x.isDefault) || lib[0];
  }

  // Merge into the side's selected tactic, materialising the built-in default
  // into the library on first edit. In an in-house session, editing side B while
  // it is still sharing side A's tactic forks a copy first, so the two sides can
  // hold different formations without one overwriting the other.
  tacticPatch(patch) {
    const t = this._team, sk = this._sideKey, isB = sk !== String(t);
    this.setState(s => {
      let lib = ((s.tacticLib || {})[t] || []).slice();
      if (!lib.length) lib = [defaultTactic()];
      const selId = (s.tacticSel || {})[sk];
      let idx = lib.findIndex(x => x.id === selId);
      if (idx < 0) idx = Math.max(0, lib.findIndex(x => x.isDefault));

      let forked = "";
      if (isB && selId === undefined) {
        const copy = { ...lib[idx], id: this._now(), name: lib[idx].name + " · Đội B", isDefault: false };
        lib = lib.concat([copy]);
        idx = lib.length - 1;
        forked = "Đã tách chiến thuật riêng cho Đội B: " + copy.name + ".";
      }

      lib[idx] = { ...lib[idx], ...patch };
      const tacticLib = { ...s.tacticLib, [t]: lib };
      const tacticSel = { ...s.tacticSel, [sk]: lib[idx].id };
      this.persist({ tacticLib, tacticSel });
      return forked ? { tacticLib, tacticSel, copied: forked } : { tacticLib, tacticSel };
    });
  }

  tacticSlotPatch(i, patch) {
    const cur = (this._activeTactic(this.state) || {}).slots || {};
    this.tacticPatch({ slots: { ...cur, [i]: { ...(cur[i] || {}), ...patch } } });
  }

  /* Bo chi dao rieng cua buoi cho cac o 0..n-1 cua MOT ben.
     Xoa theo tung so o chu khong theo tien to: khoa cua doi B la
     "<buoi>#B#<o>", ma no cung bat dau bang "<buoi>#" -- quet tien to la don
     ben A keo theo ca ben B. */
  dropSlotOvr(key, n) {
    this.setState(s => {
      const slotOvr = { ...(s.slotOvr || {}) };
      let hit = 0;
      for (let i = 0; i < n; i++) {
        if (slotOvr[key + "#" + i]) { delete slotOvr[key + "#" + i]; hit++; }
      }
      if (!hit) return null;
      this.persist({ slotOvr });
      return { slotOvr };
    });
  }

  /* Doi so do: GIU chi dao cua o nao con cung tuyen, BO o nao da doi tuyen, va
     noi ra da bo may o. Truoc day chi `tacticPatch({formation})` -- o doi tuyen
     thi chi dao lang le ve mac dinh va ban ghi cu nam lai, doi so do nguoc ve la
     no song day. Cau 74. */
  setFormation(form, key) {
    const st = this.state, t = this._activeTactic(st) || {};
    const size = SIZE_FORMATIONS[t.size] ? t.size : "7";
    if (!form || !SIZE_FORMATIONS[size][form] || form === t.formation) return;
    const keep = slotKeeps(size, t.formation, size, form);
    const old = t.slots || {}, slots = {};
    let dropped = 0;
    Object.keys(old).forEach(i => { if (keep[i]) slots[i] = old[i]; else dropped++; });
    const slotOvr = { ...(st.slotOvr || {}) };
    keep.forEach((k, i) => {
      if (!k && slotOvr[key + "#" + i]) { delete slotOvr[key + "#" + i]; dropped++; }
    });
    // Doi so do thi cac o doi nghia -- ly do xep cu ("Hau ve - X: so truong")
    // khong con noi ve doi hinh dang tren san nua.
    this.setState({ slotOvr, autoWhy: [] });
    this.persist({ slotOvr });
    this.tacticPatch({ formation: form, formationOff: "", slots: slots });
    this.setState({ lineupMsg: "Đã đổi sơ đồ " + form + "."
      + (dropped ? (" Bỏ chỉ đạo cá nhân của " + dropped + " ô đã đổi tuyến.")
                 : " Chỉ đạo cá nhân giữ nguyên.") });
  }

  // Per-session override of one pitch slot's instructions (does not touch the tactic).
  slotOvrPatch(key, i, patch) {
    this.setState(s => {
      const k = key + "#" + i;
      const slotOvr = { ...s.slotOvr, [k]: { ...((s.slotOvr || {})[k] || {}), ...patch } };
      this.persist({ slotOvr });
      return { slotOvr, lineupMsg: "Đã đổi chỉ đạo cho ô này (chỉ buổi này)." };
    });
  }
}

/* ---------- boot ---------- */
DC.mount({
  host: document.getElementById('app'),
  template: document.getElementById('dc-template').textContent,
  Component: Component,
  props: {
    matchFee: 95000,
    reminderTemplate: "{doi}: {ten} ơi, tiền sân còn {tien} nha. Chuyển vào quỹ đội giúp mình.",
    showJerseyNumbers: true,
    homeKitColor: "#1549E0",
    awayKitColor: "#FF6B57"
  }
});
