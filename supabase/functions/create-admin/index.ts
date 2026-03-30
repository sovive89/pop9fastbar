import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const adminEmail = "ricardoferreiradonascimento89@gmail.com";
  const adminPassword = "123456";

  // Delete all existing users
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  if (existingUsers?.users) {
    for (const user of existingUsers.users) {
      await supabase.from("user_roles").delete().eq("user_id", user.id);
      await supabase.from("profiles").delete().eq("id", user.id);
      await supabase.auth.admin.deleteUser(user.id);
    }
  }

  // Create admin user
  const { data, error } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { full_name: "Ricardo Ferreira" }
  });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });

  // Create profile
  await supabase.from("profiles").upsert({
    id: data.user.id,
    email: adminEmail,
    full_name: "Ricardo Ferreira"
  });

  // Assign admin role
  await supabase.from("user_roles").upsert({
    user_id: data.user.id,
    role: "admin"
  }, { onConflict: "user_id,role" });

  return new Response(JSON.stringify({ success: true, userId: data.user.id }));
});
