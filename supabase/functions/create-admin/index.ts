import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const adminEmail = "ricardoferreiradonascimento89@gmail.com";
  const adminPassword = "123456";
  const adminName = "Ricardo Ferreira do Nascimento";

  // 1. Delete ALL existing users (reset total)
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  if (existingUsers?.users) {
    for (const user of existingUsers.users) {
      // Clean up related data first
      await supabase.from("user_roles").delete().eq("user_id", user.id);
      await supabase.from("profiles").delete().eq("id", user.id);
      await supabase.auth.admin.deleteUser(user.id);
    }
  }

  // 2. Create admin user
  const { data, error } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { full_name: adminName }
  });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });

  const userId = data.user.id;

  // 3. Ensure profile
  await supabase.from("profiles").upsert({
    id: userId,
    email: adminEmail,
    full_name: adminName
  });

  // 4. Ensure admin role
  await supabase.from("user_roles").upsert({
    user_id: userId,
    role: "admin"
  }, { onConflict: "user_id,role" });

  return new Response(JSON.stringify({ 
    success: true, 
    userId,
    message: "All users deleted. Admin recreated.",
    admin: adminEmail
  }));
});
