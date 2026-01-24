export type RootStackParamList = {
  FriendsScreen: undefined;
  CreateSquareScreen: undefined;
  JoinSquareScreen:
    | {
        gridId: string;
        inputTitle: string;
        deadline: string;
        usedColors?: string[];
      }
    | {
        sessionId: string;
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
