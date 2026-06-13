alter table applications
add column if not exists overdue_email_sent_at timestamptz,
add column if not exists overdue_email_last_error text;

create table if not exists overdue_email_logs (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references applications(id) on delete cascade,
  student_email text not null,
  equipment_code text not null,
  sent_at timestamptz not null default now(),
  status text not null default 'SENT',
  error_message text,
  created_at timestamptz not null default now()
);

alter table overdue_email_logs enable row level security;

create policy "select_overdue_email_logs"
on overdue_email_logs
for select
to anon
using (true);

create policy "insert_overdue_email_logs"
on overdue_email_logs
for insert
to anon
with check (true);