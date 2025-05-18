import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest) {
  // Fix #1: Added proper typing and used underscore to indicate unused parameter

  try {
    // Fix #2: Await the client creation
    const supabase = await createClient();

    // Authentication check
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Import the migration function
    const { migrateAnalyticsTable } = await import(
      "@/scripts/migrate-analytics"
    );
    await migrateAnalyticsTable();

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    // Fix #3: Properly type the error and handle it safely
    console.error("Migration error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown migration error";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
