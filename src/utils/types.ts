export type RootStackParamList = {
  FriendsScreen: undefined;
  CreateSquareScreen: undefined;
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
};

// utils/leagueMap.ts
export const leagueMap: Record<string, string> = {
  NFL: "nfl",
  NCAAF: "ncaaf",
};
