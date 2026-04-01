import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const adminEmail = "ricardoferreiradonascimento89@gmail.com";
  const adminPassword = "123456";
  const adminName = "Ricardo Ferreira do Nascimento";

  const testEmail = "teste@pop9bar.com";
  const testPassword = "123456";
  const testName = "Usuário Teste";

  const results: Record<string, unknown> = {};

  // --- Ensure Admin ---
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const users = existingUsers?.users || [];

  const existingAdmin = users.find(u => u.email === adminEmail);
  let adminId: string;

  if (existingAdmin) {
    await supabase.auth.admin.updateUserById(existingAdmin.id, {
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: adminName }
    });
    adminId = existingAdmin.id;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: adminEmail, password: adminPassword, email_confirm: true,
      user_metadata: { full_name: adminName }
    });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    adminId = data.user.id;
  }

  await supabase.from("profiles").upsert({ id: adminId, email: adminEmail, full_name: adminName });
  await supabase.from("user_roles").upsert({ user_id: adminId, role: "admin" }, { onConflict: "user_id,role" });
  results.admin = { email: adminEmail, role: "admin" };

  // --- Ensure Test User ---
  const existingTest = users.find(u => u.email === testEmail);
  let testId: string;

  if (existingTest) {
    await supabase.auth.admin.updateUserById(existingTest.id, {
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: testName }
    });
    testId = existingTest.id;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: testEmail, password: testPassword, email_confirm: true,
      user_metadata: { full_name: testName }
    });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    testId = data.user.id;
  }

  await supabase.from("profiles").upsert({ id: testId, email: testEmail, full_name: testName });
  await supabase.from("user_roles").upsert({ user_id: testId, role: "attendant" }, { onConflict: "user_id,role" });
  results.test = { email: testEmail, role: "attendant" };

  return new Response(JSON.stringify({ success: true, ...results }));
});
