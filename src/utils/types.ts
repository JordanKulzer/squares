export type RootStackParamList = {
  FriendsScreen: undefined;
  CreateSquareScreen: {
    isPublic?: boolean;
    isCustomGame?: boolean;
    team1?: string;
    team2?: string;
    team1FullName?: string;
    team2FullName?: string;
    team1Abbr?: string;
    team2Abbr?: string;
    league?: string;
    deadline?: string;
    inputTitle?: string;
    username?: string;
    selectedColor?: string | null;
    maxSelections?: string;
    eventId?: string;
  } | undefined;
  InviteFriendsScreen: {
    gridId: string;
    sessionTitle: string;
  };
  JoinSquareScreen:
    | {
        gridId: string;
        inputTitle: string;
        deadline: string;
        /** @deprecated use playerColors */
        usedColors?: string[];
        playerColors?: { userId: string; color: string }[];
      }
    | {
        sessionId: string;
        inviteId?: string; // Optional: if coming from invite, mark as accepted after joining
        fromNotification?: boolean; // true when opened via push notification tap
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
  GamePickerScreen: undefined;
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
