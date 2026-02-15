import { supabase } from "../lib/supabase";

export const FREE_MAX_CREATED = 1;

export async function getActiveCreatedCount(userId: string): Promise<number> {
  const now = new Date().toISOString();

  const { count, error } = await supabase
    .from("squares")
    .select("id", { count: "exact", head: true })
    .eq("created_by", userId)
    .gt("deadline", now);

  if (error) {
    console.error("Error counting active squares:", error);
    return 0;
  }

  return count ?? 0;
}
