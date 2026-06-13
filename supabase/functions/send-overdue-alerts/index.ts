import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const emailjsServiceId = Deno.env.get('EMAILJS_SERVICE_ID')!;
const emailjsTemplateId = Deno.env.get('EMAILJS_TEMPLATE_ID')!;
const emailjsPublicKey = Deno.env.get('EMAILJS_PUBLIC_KEY')!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

Deno.serve(async () => {
  const nowMalaysia = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' })
  );

  const { data: applications, error } = await supabase
    .from('applications')
    .select('*')
    .eq('stage', 'ACTIVE_BORROW')
    .eq('is_returned', false)
    .is('overdue_email_sent_at', null);

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  const results = [];

  for (const app of applications || []) {
    const borrowDate = String(app.borrow_date || '').trim();
    const returnTarget = String(app.return_target || '').trim();

    if (!borrowDate || !returnTarget) {
      results.push({
        applicationId: app.id,
        skipped: true,
        reason: 'Missing borrow_date or return_target',
      });
      continue;
    }

    const dueAt = new Date(`${borrowDate}T${returnTarget}:00`);

    if (Number.isNaN(dueAt.getTime()) || nowMalaysia <= dueAt) {
      results.push({
        applicationId: app.id,
        skipped: true,
        reason: 'Not overdue yet',
      });
      continue;
    }

    const emailPayload = {
      service_id: emailjsServiceId,
      template_id: emailjsTemplateId,
      user_id: emailjsPublicKey,
      template_params: {
        email: app.student_email,
        studentName: app.student_name,
        equipmentCode: app.final_equipment_code || app.equipment_code,
      },
    };

    try {
      const emailResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload),
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        throw new Error(errorText || `EmailJS failed with status ${emailResponse.status}`);
      }

      await supabase
        .from('applications')
        .update({
          overdue_email_sent_at: new Date().toISOString(),
          overdue_email_last_error: null,
        })
        .eq('id', app.id);

      await supabase.from('overdue_email_logs').insert({
        application_id: app.id,
        student_email: app.student_email,
        equipment_code: app.final_equipment_code || app.equipment_code,
        status: 'SENT',
      });

      results.push({
        applicationId: app.id,
        studentEmail: app.student_email,
        equipmentCode: app.final_equipment_code || app.equipment_code,
        sent: true,
      });
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : String(sendError);

      await supabase
        .from('applications')
        .update({
          overdue_email_last_error: message,
        })
        .eq('id', app.id);

      await supabase.from('overdue_email_logs').insert({
        application_id: app.id,
        student_email: app.student_email,
        equipment_code: app.final_equipment_code || app.equipment_code,
        status: 'FAILED',
        error_message: message,
      });

      results.push({
        applicationId: app.id,
        studentEmail: app.student_email,
        sent: false,
        error: message,
      });
    }
  }

  return Response.json({
    ok: true,
    checked: applications?.length || 0,
    results,
  });
});