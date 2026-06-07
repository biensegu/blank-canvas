import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const adminEmail = process.env.TEST_ADMIN_EMAIL;
const adminPassword = process.env.TEST_ADMIN_PASSWORD;
const studentEmail = process.env.TEST_STUDENT_EMAIL;
const studentPassword = process.env.TEST_STUDENT_PASSWORD;

const missing = [];
if (!url) missing.push("VITE_SUPABASE_URL or SUPABASE_URL");
if (!anonKey) missing.push("VITE_SUPABASE_PUBLISHABLE_KEY or SUPABASE_PUBLISHABLE_KEY");
if (!adminEmail) missing.push("TEST_ADMIN_EMAIL");
if (!adminPassword) missing.push("TEST_ADMIN_PASSWORD");
if (!studentEmail) missing.push("TEST_STUDENT_EMAIL");
if (!studentPassword) missing.push("TEST_STUDENT_PASSWORD");

if (missing.length) {
  console.error(`Missing env vars: ${missing.join(", ")}`);
  process.exit(1);
}

const anon = createClient(url, anonKey);
const admin = createClient(url, anonKey);
const student = createClient(url, anonKey);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function deniedOrEmpty(result) {
  return !!result.error || (Array.isArray(result.data) && result.data.length === 0);
}

async function signIn(client, email, password, label) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`${label} login failed: ${error.message}`);
  if (!data.user) throw new Error(`${label} login returned no user`);
  return data.user;
}

async function main() {
  const { error: anonCoursesError } = await anon
    .from("courses")
    .select("id", { count: "exact", head: true });
  assert(!anonCoursesError, `anon should read public course catalog: ${anonCoursesError?.message}`);

  const anonProfiles = await anon.from("profiles").select("id").limit(1);
  assert(deniedOrEmpty(anonProfiles), "anon must not read private profiles");

  const adminUser = await signIn(admin, adminEmail, adminPassword, "admin");
  const studentUser = await signIn(student, studentEmail, studentPassword, "student");

  const { data: adminRole, error: adminRoleError } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", adminUser.id)
    .eq("role", "admin")
    .maybeSingle();
  assert(!adminRoleError && adminRole?.role === "admin", "admin user must have admin role");

  const { data: ownProfile, error: ownProfileError } = await student
    .from("profiles")
    .select("id")
    .eq("id", studentUser.id)
    .maybeSingle();
  assert(!ownProfileError && ownProfile?.id === studentUser.id, "student should read own profile");

  const otherProfiles = await student
    .from("profiles")
    .select("id")
    .neq("id", studentUser.id)
    .limit(1);
  assert(deniedOrEmpty(otherProfiles), "student must not read other profiles");

  const otherRoles = await student
    .from("user_roles")
    .select("user_id, role")
    .neq("user_id", studentUser.id)
    .limit(1);
  assert(deniedOrEmpty(otherRoles), "student must not read other users' roles");

  const foreignActivity = await student.from("activity_events").insert({
    user_id: adminUser.id,
    type: "test_security",
    metadata: {},
  });
  assert(!!foreignActivity.error, "student must not insert activity for another user");

  const { error: adminProfilesError } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true });
  assert(!adminProfilesError, `admin should read profiles: ${adminProfilesError?.message}`);

  const { error: adminEnrollmentsError } = await admin
    .from("enrollments")
    .select("id", { count: "exact", head: true });
  assert(!adminEnrollmentsError, `admin should read enrollments: ${adminEnrollmentsError?.message}`);

  console.log("RLS checks passed");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
