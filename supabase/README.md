# Máy chủ Đá Phủi App

Project Supabase: **Da Phui App** · `zubtfnsdsktzbcfwpbgd` · region Singapore
(`ap-southeast-1`) · gói free.

Tách hoàn toàn khỏi project Wonder Leaf. Đừng chạy gì lên project kia.

**Toàn bộ SQL nằm ở `schema.sql` cạnh tệp này.** Tệp README chỉ giải thích VÌ SAO;
`schema.sql` mới là thứ chạy được.

## ⚠ Gói free TỰ TẠM DỪNG — và pause trông y hệt đã xoá

Ngày 14/09 và 17/09/2026, `zubtfnsdsktzbcfwpbgd.supabase.co` trả **NXDOMAIN** qua
8.8.8.8 và `curl` trả **000**, trong khi `supabase.co` phân giải bình thường. Kết
luận ghi trong tài liệu lúc đó — "dự án đã bị xoá" — **là sai**. Dự án chỉ bị
Supabase **tạm dừng** vì gói free không ai đụng tới lâu ngày, và pause thì
Supabase **gỡ luôn tên miền**. Ngày 22/09 khôi phục: 7 đội, 7 cục dữ liệu, 23
dòng điểm danh còn nguyên, không mất gì.

Bài học, đừng lặp lại: **NXDOMAIN không phân biệt được "bị xoá" với "bị tạm
dừng"**. Trước khi kết luận mất dữ liệu, mở danh sách project ra xem `status` —
`INACTIVE` nghĩa là còn, bấm khôi phục là sống lại.

Hệ quả còn nguyên: **nó sẽ tạm dừng lần nữa** nếu cả đội không dùng một thời
gian. Đó không phải lỗi mã.

## Ba bảng, chẻ theo AI GHI

```
teams        id · code (chìa 12 ký tự) · short_code (5, cho người đọc) · name
team_state   team_id · data jsonb · rev          ← chỉ đội trưởng sửa
attendance   (team_id, occ_id, member_id) · value ← ai cũng ghi
```

Một đội đầy đủ chỉ 11 KB nên `team_state` để nguyên cục JSON là đủ. Điểm danh
tách ra vì đó là chỗ **nhiều người ghi cùng lúc** — xem phần đo bên dưới.

## Bảng không mở cho ai cả

Anon key nằm công khai trong file HTML — đó là thiết kế của Supabase, nên RLS là
bức tường duy nhất. `revoke all` trên cả ba bảng, **không policy nào**, và chỉ
mở bốn hàm `security definer` có kiểm mã đội bên trong:

`team_create(name)` · `team_pull(code)` · `team_push(code, data, rev, admin_key)` ·
`team_attend(code, occ, member, value)` · `team_join(code, member)`

**Năm hàm, không phải bốn.** `team_join` bị bỏ quên khỏi tài liệu này suốt một
thời gian dài trong khi client vẫn gọi nó (`app.js:3346`). Dựng lại máy chủ mà
thiếu hàm đó thì cửa "Vào đội bằng mã" hỏng ÂM THẦM: người mới vào được, nhưng
không tự ghi tên mình lên máy chủ, nên nhịp kéo kế tiếp đè bản máy chủ (không có
họ) lên máy họ và họ biến mất khỏi máy của chính mình.

**Hai chìa, đừng nhầm.** `teams.code` (12 ký tự) là chìa **ĐỌC** — ai có thì vào
xem được đội. `teams.admin_key` (16 ký tự) là chìa **SỬA**, chỉ máy tạo đội giữ.
`team_push` sai chìa thì ném `khong co quyen sua doi nay`. `team_attend` **cố ý
không cần** chìa admin — cầu thủ phải điểm danh được.

Máy không có chìa admin thì client **thôi hẳn việc đẩy**, chứ không đẩy rồi hiện
banner đỏ: người dùng sẽ tưởng app hỏng trong khi app đang làm đúng.

Ba cảnh báo `rls_enabled_no_policy` của advisor là **cố ý**: không policy nghĩa
là chặn sạch. Sáu cảnh báo `security_definer_function_executable` cũng cố ý —
anon gọi được bốn hàm đó chính là thiết kế.

## Đã thử phá, không phải chỉ đọc code

Dùng đúng anon key công khai:

| Thử | Kết quả |
|---|---|
| `GET /rest/v1/teams` (và `team_state`, `attendance`) | `42501 permission denied` |
| `POST /rest/v1/teams` chèn đội giả | `42501 permission denied` |
| Đội B `team_pull` bằng mã của mình | chỉ thấy dữ liệu B, `data:{}` — không thấy SĐT/quỹ của A |
| `team_pull` với mã bịa | `ma doi khong dung` |

## Phép đo quyết định cả thiết kế

Hai mươi request **song song**, cùng một buổi:

- qua `team_attend` (bảng riêng, mỗi người một dòng) → **20/20** người được ghi
- qua `team_push` (cả cục, kiểu Wonder Leaf) → **1/20**, mười chín câu bốc hơi

Đó là lý do duy nhất `attendance` không nằm trong `team_state`. Sau này thêm gì
mà nhiều người cùng ghi (chấm điểm sau trận, ai đã đóng tiền) thì theo đúng
nguyên tắc đó.

## rev để làm gì

`team_push` nhận kèm `rev` mà máy gọi đang cầm. Lệch thì trả `conflict:true` và
**không ghi** — để phía gọi tải lại rồi ghi đè có ý thức, thay vì lặng lẽ xoá
việc của người khác. Chính cơ chế này khiến phép đo trên ra 1/20 chứ không phải
một con số ngẫu nhiên.


## Máy chủ KHÔNG giữ mật khẩu

`pwh` (băm + muối) **cố ý không nằm trong** `cloudBlob`, và `cloudPull` xoá
`pwh`/`pw` khỏi mọi bản kéo về. Lý do không phải chỉ vì bảo mật:

Cục dữ liệu chung **chỉ đội trưởng được ghi**. Nếu để mật khẩu trong đó thì băm
của cầu thủ không bao giờ tồn tại nổi — mỗi lần kéo về, bản của đội trưởng
(không có họ) đè lên và **họ bị hỏi đặt lại mật khẩu**. Đã đo được đúng vậy: id
cầu thủ `...964375` nhưng `pwh` trên máy họ chỉ có khoá `...626890` của đội trưởng.

Mật khẩu là thứ của **từng người trên từng máy**. Đăng nhập trên máy mới =
đặt mật khẩu cho máy đó, đúng như lần đầu.

## `teamId` trên mỗi người là thừa

Một cục `team_state.data` thuộc đúng một đội, nên ai nằm trong đó là người của
đội đó. `adoptMembers` dán lại `teamId` lúc kéo về. Đừng thêm chỗ nào lọc theo
`teamId` bên trong cục ấy nữa — người lệch id sẽ **biến mất khỏi giao diện mà
không báo gì**, đã dính đúng một lần: bảng nói "2 thành viên" trong khi máy chủ
có 7.
