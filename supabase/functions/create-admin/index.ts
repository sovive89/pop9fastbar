import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const adminEmail = "ricardoferreiradonascimento89@gmail.com";
  const adminPassword = "123456";
  const adminName = "Ricardo Ferreira do Nascimento";

  // 1. List all existing users
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const users = existingUsers?.users || [];
  
  const deletedIds: string[] = [];
  let adminUserId: string | null = null;

  // 2. Delete all NON-admin users first, keep admin for update
  for (const user of users) {
    if (user.email === adminEmail) {
      adminUserId = user.id;
      continue;
    }
    await supabase.from("user_roles").delete().eq("user_id", user.id);
    await supabase.from("profiles").delete().eq("id", user.id);
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (!error) deletedIds.push(user.id);
  }

  // 3. If admin exists, update; otherwise create
  if (adminUserId) {
    await supabase.auth.admin.updateUserById(adminUserId, {
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: adminName }
    });
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: adminName }
    });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    adminUserId = data.user.id;
  }

  // 4. Ensure profile
  await supabase.from("profiles").upsert({
    id: adminUserId,
    email: adminEmail,
    full_name: adminName
  });

  // 5. Ensure admin role
  await supabase.from("user_roles").upsert({
    user_id: adminUserId,
    role: "admin"
  }, { onConflict: "user_id,role" });

  return new Response(JSON.stringify({ 
    success: true, 
    adminUserId,
    deletedUsers: deletedIds.length,
    message: `Reset complete. Only admin remains: ${adminEmail}`
  }));
});
