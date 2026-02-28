export type RootStackParamList = {
  FriendsScreen: undefined;
  CreateSquareScreen: { isPublic?: boolean } | undefined;
  InviteFriendsScreen: {
    gridId: string;
    sessionTitle: string;
  };
  JoinSquareScreen:
    | {
        gridId: string;
        inputTitle: string;
        deadline: string;
        usedColors?: string[];
      }
    | {
        sessionId: string;
        inviteId?: string; // Optional: if coming from invite, mark as accepted after joining
      };
  SquareScreen: {
    gridId: string;
    inputTitle: string;
    username: string;
    deadline: string;
    eventId: string;
    disableAnimation?: boolean;
    pricePerSquare?: number;
    league?: string;
  };
  HowToScreen: undefined;
  ProfileScreen: undefined;
  BrowsePublicSquaresScreen: undefined;
  LeaderboardScreen: undefined;
  BadgesScreen: undefined;
  EditSquareScreen: {
    gridId: string;
  };
};

// utils/leagueMap.ts
export const leagueMap: Record<string, string> = {
  NFL: "nfl",
  NCAAF: "ncaaf",
  NBA: "nba",
  NCAAB: "ncaab",
};

// Active leagues shown in Browse/Filter UI
export const ACTIVE_LEAGUES = ["NFL", "NCAAF", "NBA", "NCAAB"];

// Future leagues (uncomment when implemented)
// export const FUTURE_LEAGUES = ["NHL", "MLB", "MLS"];
