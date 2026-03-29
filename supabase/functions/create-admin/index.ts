import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existing = existingUsers?.users?.find(u => u.email === "admin@pop9.com");
  if (existing) {
    await supabase.auth.admin.deleteUser(existing.id);
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: "admin@pop9.com",
    password: "admin123",
    email_confirm: true,
    user_metadata: { full_name: "Admin POP9" }
  });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });

  await supabase.from("profiles").upsert({
    id: data.user.id,
    email: "admin@pop9.com",
    full_name: "Admin POP9"
  });

  await supabase.from("user_roles").upsert({
    user_id: data.user.id,
    role: "admin"
  }, { onConflict: "user_id,role" });

  return new Response(JSON.stringify({ success: true, userId: data.user.id }));
});
