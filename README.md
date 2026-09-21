# Đá Phủi App

**Mở app: https://mrfabulous2207.github.io/da-phui/**

Quản lý đội bóng phủi: điểm danh, đội hình, chiến thuật, quỹ đội. Không cài gì,
mở bằng trình duyệt trên điện thoại hay máy tính đều được.

## Cho đồng đội

1. Mở đường dẫn trên.
2. Bấm **"Vào đội bằng mã"**, nhập số điện thoại của bạn và đặt mật khẩu — mật
   khẩu là của riêng máy bạn, không ai khác biết.
3. Nhập **mã đội 5 ký tự** đội trưởng gửi.
4. Xong. Bấm "Tôi đi" / "Chưa chắc" / "Không đi" cho buổi tới; đội trưởng thấy
   ngay trên máy của họ.

Chưa có mã thì bấm **"Xem thử bằng đội mẫu"** — đó là một đội bịa (FC Mẫu, 14
người không có thật) để nghịch thử, xoá đi lúc nào cũng được.

## Cho đội trưởng

Bấm **"Tạo đội mới"**. App đưa lại hai mã: **mã 5 ký tự** để nhắn cho cả đội
(chỉ xem được), và một **chìa sửa 16 ký tự** chỉ nằm trên máy bạn — máy nào
không có chìa đó thì không sửa được đội hình hay quỹ. Mất máy là mất chìa, nên
đội hiện chỉ sửa được từ đúng máy đã tạo ra nó.

## Vài điều nói thẳng

- **Máy chủ dùng gói miễn phí và TỰ TẠM DỪNG** nếu cả đội không mở app một thời
  gian. Lúc đó app báo "máy chưa nối được tới máy chủ" và chỉ xem được bản lưu
  trên máy. Chủ dự án vào bảng điều khiển Supabase bấm khôi phục là chạy lại,
  dữ liệu còn nguyên.
- Dữ liệu của đội nằm trên máy chủ và trong bộ nhớ trình duyệt của từng người.
  Chưa có nút xuất toàn bộ ra một tệp.
- Hoá đơn, thông báo đẩy, nhắc nợ tự động: **chưa có**. Nút "Nhắc" chép sẵn câu
  nhắn để bạn dán vào Zalo.

---

Static app — no build, no server needed beyond a plain file server. Data lives in
`localStorage` under the key `dpfm-v3`.

```bash
python -m http.server 8912 --directory da-phui-fm
```

The app opens empty — it ships with no team's data in it.
Press **"Xem thử bằng đội mẫu"** to load FC Mẫu (14 invented players,
phone numbers `09000001xx`), or create a real team from the front door.
Each person sets their own password on their own device; there is no
shared demo password.

## Layout

| File | What it is |
|---|---|
| `index.html` | Page shell + the design's markup, **verbatim**, held in a `text/html` script tag |
| `app.js` | All logic: seed data, constants, the `Component` class, `renderVals()` |
| `dc-mini.js` | ~200-line runtime that renders the design's template language on plain DOM |
| `fmkit/`, `image-slot.js` | Vendored from the design project |
| `check.js` | `node check.js` — static check, see below |

The design markup is kept as-is rather than hand-translated into render calls: the
template is 1,600 lines and every one of its 771 distinct expressions is a plain
dotted path, so a small runtime is a smaller and far less error-prone surface than
a manual port. Re-importing a newer canvas export means replacing the markup block
in `index.html` and re-running `check.js`.

## Runtime

`dc-mini.js` supports exactly what the design uses: `{{ path }}` interpolation in
text and attributes, `<sc-if>`, `<sc-for … as>`, the six event attributes, controlled
`value` on inputs/selects/textareas, and `style-hover`. It re-renders the whole tree
on each state change and restores focus, selection, and scroll positions by node path.

## Checks

```bash
node check.js
```

Verifies the two things that fail silently: `sc-if`/`sc-for` tag balance (one stray
close tag re-parents every later block), and that every binding the template reads
exists in `renderVals()`. `dc-mini` also warns in the console about unresolved
bindings for whichever view is on screen.

## In-house sides

An in-house (đá nội bộ) session is two independent teams. Side B reads its tactic,
bench, captain and kit colour from a `#B`-suffixed key — the same convention
`slotKey` already used for player slots — so side A and every vs/free session keep
reading the plain team key and nothing saved before this existed has to migrate.

The tactic *library* stays per team; only the *selection* is per side. Editing side B's
formation while it is still sharing side A's tactic forks a copy named
"… · Đội B" first, so the two sides can diverge without one overwriting the other.
Picking an existing tactic for side B explicitly does not fork — if both sides then sit
on the same tactic, editing it changes both, which is the point of sharing one.

Slot count follows the formation (5 / 7 / 11) and every stored lineup is fitted to it on
read, so a squad saved at one pitch size never leaves players occupying slots the pitch
no longer draws.

## Substitutions

Every route onto the pitch goes through `assign()`, so the swap lives there rather than
in each caller. Two players already on the pitch trade places; only someone arriving
from the bench or the pool pushes the occupant off, and that player lands on the bench
rather than back in the pool. Taking a player off is `benchOut()` — reachable from the
pitch slot's right-click menu, or by dragging a player from the pitch onto the bench
card.

There is no substitution log. One existed (a THAY NGƯỜI card backed by
`subsByOcc[slotKey]`) and was removed: for a kickabout where the captain is standing on
the touchline, an audit trail of who came on when is bookkeeping nobody reads.

## The lineup screen

Positions are generated, never typed. Every player is a (band, channel) pair the
way FM's tactic pitch works -- six depth bands anchored to real pitch geometry
(keeper inside his box, back line on the edge of it, strikers just outside the
opposition area) and a spread across the width that reaches the touchline only
when the line holds a flank player. `node pitch-check.js` measures the result
against markings it reads out of `index.html`, so the two cannot drift apart.

The toolbar is one primary, one pair, one overflow. `Lưu đội hình` is pinned to
the bottom and counts what is filled (`· 6/7`), fading until the XI is complete.
`Tự động` leads as **Xếp giúp tôi** while the pitch is empty and steps back to
secondary once there is work worth protecting -- editing a lineup is easier than
building one from nothing. Simulate, draw and erase are icon toggles on the
pitch; copy and template verbs sit behind the kebab.

What the label under a token carries -- name, name and position, or position
only -- is a per-device choice in **Đội > Cài đặt đội > Hiển thị trên sân**,
stored with the rest of the local state. An empty slot always shows its position
regardless: there is no name to show, and the position is the point of an empty
slot.

Nothing is taught up front. An empty pitch says "Bấm vào ô để chọn người" where
the pitch is, that click answers with a ranked shortlist, and the shortlist ends
with a one-line right-click tip that stops appearing the moment someone
right-clicks anything.

## Getting a player onto the pitch

Three routes, all one hop, matching what FM does:

- **Click an empty position** -> a shortlist of the six best available players for
  that position, ranked natural-fit first then rating, each labelled *sở trường /
  đá được / lệch tuyến*. People who said they are not coming sink to the bottom
  rather than disappearing; a kickabout squad is small enough that "he said no but
  I need him" is real.
- **`+` on a squad row** -> straight onto the pitch, falling back to the bench only
  when the XI is full (the tooltip says which it will do).
- **Drag** a row onto a slot, or drag a slot onto the bench card.

Right-click anything for the rest: bench a player, add to bench without playing,
set captain, open the profile, personal instructions.

The ranking is one function, `fitCost`, shared by the shortlist and the auto-XI.
They used to rank differently, which is how a lineup screen starts contradicting
itself.

## Tactics

The screen looked like FM and did almost nothing. **Cách đá** changed a word and
no behaviour. **Nhiệm vụ** (Thủ / Cân bằng / Công) painted one dot and contradicted
the role sitting above it -- a full-back could be *Dâng biên* and *Thủ* at once.
Only `tempo` did anything at all, and only to the demo's animation speed.

Three changes, following what FM26 actually does:

- **Cách đá sets every instruction.** Pick Tấn công and tempo, width, transition,
  line and pressing all move. An instruction the captain sets keeps its own value
  and is marked; the rest say "theo Cách đá" and can be released back with one tap.
  That is FM's inherited-vs-overridden state, in words instead of a glow.
- **Duty is gone; the role carries it.** FM26 dropped duties because Role + Duty
  was two controls saying one thing. Each role declares its own posture, which
  still paints the dot on the tactics pitch. One control, same information.
- **Instructions are grouped by phase** -- Có bóng / Chuyển trạng thái / Mất bóng --
  and the transition phase is new. In a kích about it decides more games than
  anything else on the screen and the app had no way to say it. Every option
  carries one line of consequence, the way the roles already did.

The pitch previews the instructions. Pick Có bóng or Mất bóng and the shape on
the pitch is the one those instructions produce: the block slides up when the
line goes high, squeezes when you go narrow, and whoever was told to get forward
stands further forward. FM26 does this with a Visualiser; NN/g files live preview
of a configuration under preventing the error rather than reporting it. The phase
picker also filters the instruction rows to that phase, so the panel shows what
you are looking at instead of every row at once. Widening is capped at the
formation's own widest player -- a full-back already stands on the touchline, so
what "wide" widens is the shape between the flanks, not the flanks.

`tacticConflicts` reads the instructions against the shape actually on the pitch
and says when they fight: high line behind a defence told to hold, counter-press
with pressing set to low, break fast on a slow tempo. That check is the reason to
open a tactics screen at all; knobs are the easy part. It is pure, and
`node tactic-check.js` covers it along with the mentality defaults.

## Team fund and settings

Three blocks on these screens were painted on and did nothing. They work now.

**Chuyển tiền vào quỹ** said "- điền sau -" three times over an `image-slot`
that cannot persist outside the design canvas. An admin now picks the bank and
types the account, and everyone gets a **VietQR** code -- the EMVCo QR every
Vietnamese banking app scans -- with the amount pre-filled to what *that viewer*
owes and the memo pre-filled with their name. Scanning is the whole transaction.
The code is drawn by `img.vietqr.io`, so it needs a connection; the text details
sit beside it with copy buttons and work offline.

**Source / Ảnh & video / File quỹ** were `<a href="#">`. The first two are now
team-owned URLs an admin fills in, opening in a new tab, and saying "chưa đặt
link" when empty instead of looking clickable. The third pointed at a
spreadsheet nobody maintains -- the app already holds every transaction, so it
exports them as CSV with a running balance, the same way the roster exports.

**Ảnh nền đăng nhập** is new. The login markup pointed at
`assets/jfc-night.jpg`, which never shipped, so that screen has always been an
empty gradient. A team can upload its own photo in settings; it is capped at
1280px and re-encoded as JPEG on the way in (a 3000x2000 source lands around
50 KB) because localStorage holds roughly 5 MB for everything here. The write is
checked, not assumed -- `persist` reports failure now, and an image that does not
fit is rolled back rather than quietly taking every later save down with it.
Being a data URI in localStorage, the picture lives on that device only; there
is no server to share it through.

The stock sheen over the backdrop was set by `@keyframes`, which overrides any
opacity on the element, so the wash could not be eased off for a real photo. The
level comes from a `--sheen` custom property the keyframes read instead.

**Nội quy 04 and 05** read "- bổ sung sau -". All five rules are now team text an
admin edits in place, with sensible defaults for the two that were empty.

Team-level settings live on the team record, which already persisted and
restored; `patchTeam` is the single writer.

## Known gaps

- **The tail of `renderVals()` was reconstructed.** The design file is ~330 KB and the
  design API returns at most 256 KB, so the export arrived truncated mid-expression.
  The markup came through complete, and about 200 of the ~360 bindings; the remaining
  161 were rebuilt from their usage in the template and the recovered state shape.
  Behaviour matches what the markup implies, but it is not byte-identical to the
  original. Re-fetch that file if it ever drops under the cap.
- `assets/jfc-night.jpg` (login background) exceeded the same cap and is not included;
  the login screen falls through to its gradient. Drop the real photo at that path to
  restore it.
- `image-slot` persistence needs the design canvas's host runtime. Standalone, the
  crest/QR/player-photo slots render as placeholders. Each re-render recreates those
  elements and every one of them re-fetches the missing `.image-slots.state.json`, so
  the console carries a steady trickle of 404s. Harmless, but noisy.
- Taking a player off the pitch is not undoable beyond moving them back manually.
