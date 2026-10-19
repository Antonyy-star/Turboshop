import type { User } from "@supabase/supabase-js";
import type { createServiceClient } from "./server";

// listUsers returns at most perPage users per call; page through all of them.
export async function listAllUsers(supabase: ReturnType<typeof createServiceClient>): Promise<User[]> {
  const users: User[] = [];
  const perPage = 1000;
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    users.push(...data.users);
    if (data.users.length < perPage) break;
  }
  return users;
}
