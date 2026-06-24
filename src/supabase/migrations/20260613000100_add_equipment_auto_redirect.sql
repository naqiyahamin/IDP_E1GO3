-- Equipment auto-redirection support
-- Run this after your original create-table, RLS, and seed migrations.

alter table applications
add column if not exists original_equipment_code text,
add column if not exists final_equipment_code text,
add column if not exists auto_redirect_note text,
add column if not exists waiting_list_reason text,
add column if not exists equipment_type text,
add column if not exists overdue_email_sent boolean not null default false;

alter table equipment_rows
add column if not exists equipment_name text,
add column if not exists equipment_type text,
add column if not exists quantity_available integer not null default 1;

update equipment_rows
set
  equipment_type = coalesce(equipment_type, upper(substring(code from '^[A-Za-z]+'))),
  equipment_name = coalesce(
    equipment_name,
    case
      when code like 'AGT%' then 'Digital Oscilloscope'
      when code like 'ARD%' then 'Arduino Uno'
      when code like 'ESP%' then 'ESP32 Microcontroller'
      when code like 'MXW%' then 'Regulated DC Power Supply'
      when code like 'RFE%' then 'RF Spectrum Analyzer'
      else 'General Equipment'
    end
  ),
  quantity_available = case when status = 'AVAILABLE' then 1 else 0 end;

update applications
set
  original_equipment_code = coalesce(original_equipment_code, equipment_code),
  final_equipment_code = case
    when stage = 'ACTIVE_BORROW' then coalesce(final_equipment_code, equipment_code)
    else final_equipment_code
  end,
  equipment_type = coalesce(equipment_type, upper(substring(equipment_code from '^[A-Za-z]+')));

create index if not exists idx_applications_stage_equipment_code
on applications(stage, equipment_code);

create index if not exists idx_equipment_rows_type_status
on equipment_rows(equipment_type, status);

create or replace function approve_application_with_redirect(p_app_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app applications%rowtype;
  v_requested equipment_rows%rowtype;
  v_final equipment_rows%rowtype;
  v_has_requested boolean := false;
  v_old_code text;
  v_new_code text;
  v_equipment_type text;
  v_equipment_name text;
  v_note text;
begin
  select *
  into v_app
  from applications
  where id = p_app_id
  for update;

  if not found then
    raise exception 'Application not found';
  end if;

  if v_app.stage <> 'PENDING' then
    return jsonb_build_object(
      'status', 'ignored',
      'message', 'Application is no longer pending.'
    );
  end if;

  v_old_code := coalesce(v_app.original_equipment_code, v_app.equipment_code);

  select *
  into v_requested
  from equipment_rows
  where code = v_old_code
  for update;

  v_has_requested := found;

  v_equipment_type := coalesce(
    v_requested.equipment_type,
    v_app.equipment_type,
    upper(substring(v_old_code from '^[A-Za-z]+'))
  );

  v_equipment_name := coalesce(
    v_requested.equipment_name,
    v_app.equipment_name,
    case
      when v_old_code like 'AGT%' then 'Digital Oscilloscope'
      when v_old_code like 'ARD%' then 'Arduino Uno'
      when v_old_code like 'ESP%' then 'ESP32 Microcontroller'
      when v_old_code like 'MXW%' then 'Regulated DC Power Supply'
      when v_old_code like 'RFE%' then 'RF Spectrum Analyzer'
      else 'General Equipment'
    end
  );

  if v_has_requested and v_requested.status = 'AVAILABLE' then
    v_final := v_requested;
    v_new_code := v_old_code;
    v_note := null;
  else
    select *
    into v_final
    from equipment_rows
    where code <> v_old_code
      and status = 'AVAILABLE'
      and quantity_available > 0
      and coalesce(equipment_type, upper(substring(code from '^[A-Za-z]+'))) = v_equipment_type
      and coalesce(equipment_name, v_equipment_name) = v_equipment_name
    order by no asc
    limit 1
    for update skip locked;

    if not found then
      update applications
      set
        status = 'PENDING',
        stage = 'PENDING',
        original_equipment_code = v_old_code,
        final_equipment_code = null,
        auto_redirect_note = null,
        waiting_list_reason = 'No alternative equipment available. Application placed in waiting list.'
      where id = p_app_id;

      return jsonb_build_object(
        'status', 'waiting_list',
        'message', 'No alternative equipment available. Application placed in waiting list.',
        'originalEquipmentCode', v_old_code
      );
    end if;

    v_new_code := v_final.code;
    v_note := 'Auto-redirected from ' || v_old_code || ' to ' || v_new_code || ' because original equipment was unavailable.';
  end if;

  update equipment_rows
  set
    status = 'BORROWED',
    quantity_available = 0
  where code = v_new_code;

  update applications
  set
    equipment_code = v_new_code,
    equipment_name = coalesce(v_final.equipment_name, v_equipment_name),
    equipment_type = v_equipment_type,
    original_equipment_code = v_old_code,
    final_equipment_code = v_new_code,
    auto_redirect_note = v_note,
    waiting_list_reason = null,
    status = 'APPROVED',
    stage = 'ACTIVE_BORROW',
    is_approved = true,
    approved_at = now(),
    processed_at = now(),
    overdue_email_sent = false
  where id = p_app_id;

  update component_inventory
  set
    units_out = (
      select count(*)
      from equipment_rows
      where equipment_name = v_equipment_name
        and status in ('BORROWED', 'PENDING PICKUP', 'RETURN_PENDING')
    ),
    units_on_shelf = (
      select count(*)
      from equipment_rows
      where equipment_name = v_equipment_name
        and status = 'AVAILABLE'
    )
  where name = v_equipment_name;

  return jsonb_build_object(
    'status', 'approved',
    'message', coalesce(v_note, 'Application approved with requested equipment.'),
    'originalEquipmentCode', v_old_code,
    'finalEquipmentCode', v_new_code,
    'autoRedirectNote', v_note
  );
end;
$$;

grant execute on function approve_application_with_redirect(uuid) to anon;
grant execute on function approve_application_with_redirect(uuid) to authenticated;
