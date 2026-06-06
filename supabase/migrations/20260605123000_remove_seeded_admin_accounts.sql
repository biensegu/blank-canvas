-- Remove previously seeded placeholder administrator accounts.
-- Real administrators must be created through Supabase Auth and granted the admin role explicitly.
DELETE FROM auth.users
WHERE email IN (
  'admin1@piezaapieza.local',
  'admin2@piezaapieza.local',
  'admin3@piezaapieza.local'
);
