// @ts-nocheck
// Supabase Edge Function to backfill quarter_winners for existing completed games
// Deploy with: supabase functions deploy backfill-quarter-winners
// Run once with: curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/backfill-quarter-winners

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface Player {
  userId: string;
  username: string;
  color: string;
}

interface Selection {
  x: number;
  y: number;
  userId: string;
  username?: string;
}

interface QuarterScore {
  home: number | null;
  away: number | null;
}

interface QuarterWinner {
  quarter: string;
  username: string;
  square: [number, number];
}

interface SquareGame {
  id: string;
  quarter_scores: QuarterScore[] | null;
  quarter_winners: QuarterWinner[] | null;
  selections: Selection[] | null;
  x_axis: number[] | null;
  y_axis: number[] | null;
  players: Player[] | null;
  game_completed: boolean | null;
}

// Determine quarter winners using the same logic as SquareScreen
function determineQuarterWinners(
  scores: QuarterScore[],
  selections: Selection[],
  xAxis: number[],
  yAxis: number[],
  playerUsernames: Record<string, string>
): QuarterWinner[] {
  return scores
    .map((score, i) => {
      const { home, away } = score || {};
      if (home == null || away == null) return null;

      // For backfill, we assume team1 is home (most common case)
      // The isTeam1Home logic would need game-specific API data to determine correctly
      // This matches how scores are typically stored
      const x = xAxis.findIndex((val) => val === away % 10);
      const y = yAxis.findIndex((val) => val === home % 10);

      if (x === -1 || y === -1) {
        return {
          quarter: `${i + 1}`,
          username: "No Winner",
          square: [home % 10, away % 10] as [number, number],
        };
      }

      const matchingSelection = selections.find(
        (sel) => sel.x === x && sel.y === y
      );

      return {
        quarter: `${i + 1}`,
        username: matchingSelection
          ? playerUsernames[matchingSelection.userId] || "Unknown"
          : "No Winner",
        square: [xAxis[x], yAxis[y]] as [number, number],
      };
    })
    .filter(Boolean) as QuarterWinner[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting backfill of quarter_winners...");

    // Fetch all games that have quarter_scores but null quarter_winners
    const { data: games, error: fetchError } = await supabase
      .from("squares")
      .select("id, quarter_scores, quarter_winners, selections, x_axis, y_axis, players, game_completed")
      .is("quarter_winners", null)
      .not("quarter_scores", "is", null);

    if (fetchError) {
      console.error("Failed to fetch games:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch games", details: fetchError }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!games || games.length === 0) {
      return new Response(
        JSON.stringify({ message: "No games need backfilling", updated: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    console.log(`Found ${games.length} games to backfill`);

    let updatedCount = 0;
    const errors: { gameId: string; error: string }[] = [];

    for (const game of games as SquareGame[]) {
      try {
        const { id, quarter_scores, selections, x_axis, y_axis, players } = game;

        // Skip if missing required data
        if (!quarter_scores || !selections || !x_axis || !y_axis || !players) {
          console.log(`Skipping game ${id}: missing required data`);
          continue;
        }

        // Check if any quarters have scores
        const hasScores = quarter_scores.some(
          (q) => q.home != null && q.away != null
        );
        if (!hasScores) {
          console.log(`Skipping game ${id}: no completed quarters`);
          continue;
        }

        // Build playerUsernames map
        const playerUsernames: Record<string, string> = {};
        players.forEach((p) => {
          playerUsernames[p.userId] = p.username || p.userId;
        });

        // Calculate quarter winners
        const quarterWinners = determineQuarterWinners(
          quarter_scores,
          selections,
          x_axis,
          y_axis,
          playerUsernames
        );

        if (quarterWinners.length === 0) {
          console.log(`Skipping game ${id}: no winners calculated`);
          continue;
        }

        // Update the game with calculated quarter_winners
        const { error: updateError } = await supabase
          .from("squares")
          .update({ quarter_winners: quarterWinners })
          .eq("id", id);

        if (updateError) {
          console.error(`Failed to update game ${id}:`, updateError);
          errors.push({ gameId: id, error: updateError.message });
        } else {
          console.log(`Updated game ${id} with ${quarterWinners.length} quarter winners`);
          updatedCount++;
        }
      } catch (err) {
        console.error(`Error processing game ${game.id}:`, err);
        errors.push({ gameId: game.id, error: String(err) });
      }
    }

    const result = {
      message: "Backfill complete",
      totalGames: games.length,
      updated: updatedCount,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log("Backfill result:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error in backfill:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
