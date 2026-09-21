-- Máy chủ Đá Phủi App — lược đồ THẬT, lấy xuống từ dự án đang chạy 22/09/2026.
--
-- VÌ SAO CÓ TỆP NÀY
-- Ngày 22/09/2026 dự án Supabase `zubtfnsdsktzbcfwpbgd` bị Supabase tạm dừng
-- (gói free, không ai đụng tới lâu ngày). Pause thì Supabase GỠ LUÔN TÊN MIỀN,
-- nên `nslookup` trả NXDOMAIN và `curl` trả 000 — trông y hệt dự án đã bị xoá.
-- Suốt mấy phiên trước kết luận trong tài liệu là "dự án đã bị xoá"; điều đó
-- SAI. Khôi phục xong thì 7 đội, 7 cục dữ liệu và 23 dòng điểm danh còn nguyên.
--
-- Nhưng lần hoảng đó lộ ra một lỗ thật: lược đồ CHỈ tồn tại trong cơ sở dữ liệu
-- đang chạy. Kho chỉ có `README.md` mô tả thiết kế, không một dòng SQL. Nếu dự
-- án bị xoá thật thì không dựng lại được. Tệp này bịt lỗ đó.
--
-- CÁCH DÙNG
-- Đây là bản CHÉP LẠI của máy chủ đang chạy, để dựng lại trên một dự án trống.
-- KHÔNG chạy lên dự án đang sống để "đồng bộ": `create table if not exists` thì
-- vô hại, nhưng đổi kiểu tham số của một hàm sẽ đẻ ra NẠP CHỒNG (overload) và
-- PostgREST ghép hàm theo TÊN THAM SỐ — hai bản `team_push` khác kiểu `p_rev`
-- là đủ làm client hỏng. Sửa hàm thì sửa ở đây rồi `create or replace` đúng một
-- chữ ký, đừng thêm chữ ký thứ hai.
--
-- Chữ ký phải khớp đúng tên tham số client gửi (`sbRpc(...)` trong app.js:2495).
-- `teams.id` là uuid — đừng đổi sang bigint.

-- ---------------------------------------------------------------- ba bảng
--
-- Điểm danh tách khỏi `team_state` vì đây là chỗ NHIỀU NGƯỜI GHI CÙNG LÚC.
-- Đo thật: 20 request song song qua bảng riêng ghi được 20/20; nhét chung vào
-- cục JSON rồi đẩy bằng `team_push` chỉ còn 1/20 — mười chín câu bốc hơi.

create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,   -- chìa ĐỌC, 12 ký tự
  short_code  text not null,          -- mã 5 ký tự để nhắn cho nhau
  name        text not null,
  admin_key   text not null,          -- chìa SỬA, 16 ký tự, chỉ máy tạo đội giữ
  created_at  timestamptz not null default now()
);

create table if not exists public.team_state (
  team_id    uuid primary key references public.teams(id) on delete cascade,
  data       jsonb  not null default '{}'::jsonb,
  rev        bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.attendance (
  team_id    uuid not null references public.teams(id) on delete cascade,
  occ_id     text not null,
  member_id  text not null,
  value      text not null,
  updated_at timestamptz not null default now(),
  primary key (team_id, occ_id, member_id)
);

-- ------------------------------------------------- khoá sạch, không policy nào
--
-- Anon key nằm công khai trong tệp HTML — đó là thiết kế của Supabase, nên RLS
-- là bức tường duy nhất. Bật RLS mà KHÔNG khai policy nào = chặn hết, và không
-- cấp quyền bảng cho `anon` / `authenticated`. Ba cảnh báo
-- `rls_enabled_no_policy` của advisor là CỐ Ý.

alter table public.teams      enable row level security;
alter table public.team_state enable row level security;
alter table public.attendance enable row level security;

revoke all on public.teams      from anon, authenticated;
revoke all on public.team_state from anon, authenticated;
revoke all on public.attendance from anon, authenticated;

-- ------------------------------------------------------------ hai hàm phụ
--
-- Không cấp cho anon: chúng là ruột, không phải cửa.

-- Bỏ I, O, 0, 1 khỏi bảng chữ: mã này người ta đọc cho nhau qua điện thoại.
create or replace function public.dp_gen_code(n integer)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare al text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; out text := ''; i int;
begin
  for i in 1..n loop
    out := out || substr(al, 1 + floor(random() * length(al))::int, 1);
  end loop;
  return out;
end $function$;

-- Mã dài 12 là chìa đọc; mã ngắn 5 là thứ người ta nhắn cho nhau. Cửa "Vào đội"
-- nhận cả hai, nên mọi hàm đều tra qua đây.
--
-- BIẾT TRƯỚC, CHƯA SỬA: `short_code` KHÔNG có ràng buộc unique. 31^5 ≈ 28,6
-- triệu tổ hợp nên với vài chục đội thì chưa đụng, nhưng nếu trùng thì hàm này
-- trả về một đội TUỲ Ý trong số trùng — người vào nhầm đội mà không báo gì.
-- Muốn bịt: thêm unique rồi cho `team_create` bốc lại khi đụng, đúng kiểu nó
-- đang làm với `code`.
create or replace function public.dp_team(p_code text)
 returns teams
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select * from teams
   where code = p_code or upper(short_code) = upper(coalesce(p_code,''))
   limit 1
$function$;

-- ---------------------------------------------------------------- năm cửa

-- Tạo đội. Trả về CẢ chìa sửa — đây là lần duy nhất máy chủ đưa nó ra.
create or replace function public.team_create(p_name text)
 returns table(team_id uuid, code text, short_code text, admin_key text)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare c text; s text; k text;
begin
  if coalesce(trim(p_name),'') = '' then raise exception 'ten doi trong'; end if;
  loop
    c := dp_gen_code(12);
    exit when not exists (select 1 from teams t where t.code = c);
  end loop;
  s := dp_gen_code(5); k := dp_gen_code(16);
  insert into teams (code, short_code, name, admin_key) values (c, s, trim(p_name), k)
    returning teams.id into team_id;
  insert into team_state (team_id, data) values (team_id, '{}'::jsonb);
  code := c; short_code := s; admin_key := k;
  return next;
end $function$;

-- Đọc đội. KHÔNG trả `admin_key` — ai có mã đọc cũng gọi được hàm này.
-- `att` trả phẳng { "buổi|người": "yes" }; client bung thành lồng (attToNested).
create or replace function public.team_pull(p_code text)
 returns table(team_id uuid, code text, name text, short_code text, data jsonb, rev bigint, att jsonb)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare t teams;
begin
  t := dp_team(p_code);
  if t.id is null then raise exception 'ma doi khong dung'; end if;
  team_id := t.id; code := t.code; name := t.name; short_code := t.short_code;
  select s.data, s.rev into data, rev from team_state s where s.team_id = t.id;
  select coalesce(jsonb_object_agg(a.occ_id || '|' || a.member_id, a.value), '{}'::jsonb)
    into att from attendance a where a.team_id = t.id;
  return next;
end $function$;

-- Ghi cả cục. Cần chìa SỬA. `rev` lệch thì KHÔNG ghi và trả conflict:true — để
-- phía gọi tải lại rồi ghi đè có ý thức, thay vì lặng lẽ xoá việc của người
-- khác. Chính cơ chế này khiến phép đo 20-request-song-song ra 1/20.
create or replace function public.team_push(p_code text, p_data jsonb, p_rev bigint, p_admin_key text)
 returns table(rev bigint, conflict boolean)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare t teams; cur bigint;
begin
  t := dp_team(p_code);
  if t.id is null then raise exception 'ma doi khong dung'; end if;
  if t.admin_key is distinct from p_admin_key then raise exception 'khong co quyen sua doi nay'; end if;
  select s.rev into cur from team_state s where s.team_id = t.id for update;
  if cur is distinct from p_rev then rev := cur; conflict := true; return next; return; end if;
  update team_state s set data = p_data, rev = s.rev + 1, updated_at = now()
    where s.team_id = t.id returning s.rev into rev;
  conflict := false;
  return next;
end $function$;

-- Điểm danh. CỐ Ý không cần chìa admin — cầu thủ phải tự điểm danh được.
-- Một dòng một người, nên hai mươi người bấm cùng lúc không ai xoá ai.
create or replace function public.team_attend(p_code text, p_occ text, p_member text, p_value text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare t teams;
begin
  t := dp_team(p_code);
  if t.id is null then raise exception 'ma doi khong dung'; end if;
  if p_value is null or p_value = '' then
    delete from attendance a where a.team_id = t.id and a.occ_id = p_occ and a.member_id = p_member;
  else
    insert into attendance (team_id, occ_id, member_id, value)
      values (t.id, p_occ, p_member, p_value)
      on conflict (team_id, occ_id, member_id)
      do update set value = excluded.value, updated_at = now();
  end if;
end $function$;

-- Người mới tự ghi TÊN MÌNH vào đội. Cũng không cần chìa admin: người vừa được
-- rủ vào thì chưa có chìa nào. Thiếu cửa này thì họ không đẩy lên được, và nhịp
-- kéo kế tiếp đè bản máy chủ (không có họ) lên máy họ — họ biến mất khỏi máy
-- của chính mình.
create or replace function public.team_join(p_code text, p_member jsonb)
 returns table(rev bigint, member jsonb)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare t teams; cur jsonb; list jsonb; found jsonb; ph text;
begin
  t := dp_team(p_code);
  if t.id is null then raise exception 'ma doi khong dung'; end if;
  ph := regexp_replace(coalesce(p_member->>'phone',''), '\D', '', 'g');
  if ph = '' then raise exception 'thieu so dien thoai'; end if;

  select s.data into cur from team_state s where s.team_id = t.id for update;
  cur := coalesce(cur, '{}'::jsonb);
  list := coalesce(cur->'members', '[]'::jsonb);

  -- Admin da them so nay roi thi ghep vao dung ho so, dung de ra nguoi trung ten.
  select m into found from jsonb_array_elements(list) m
   where regexp_replace(coalesce(m->>'phone',''), '\D', '', 'g') = ph limit 1;

  if found is null then
    found := p_member;
    list := list || jsonb_build_array(found);
    update team_state s set data = jsonb_set(cur, '{members}', list),
                            rev = s.rev + 1, updated_at = now()
      where s.team_id = t.id;
  end if;

  select s.rev into rev from team_state s where s.team_id = t.id;
  member := found;
  return next;
end $function$;

-- --------------------------------------------- chỉ mở đúng năm cửa cho anon
--
-- Sáu cảnh báo `security_definer_function_executable` của advisor là CỐ Ý:
-- anon gọi được đúng năm hàm này chính là thiết kế. Bảng vẫn chặn sạch.

revoke all on function public.dp_gen_code(integer) from public, anon, authenticated;
revoke all on function public.dp_team(text)        from public, anon, authenticated;

grant execute on function public.team_create(text)                     to anon, authenticated;
grant execute on function public.team_pull(text)                       to anon, authenticated;
grant execute on function public.team_push(text, jsonb, bigint, text)  to anon, authenticated;
grant execute on function public.team_attend(text, text, text, text)   to anon, authenticated;
grant execute on function public.team_join(text, jsonb)                to anon, authenticated;
