export type RootStackParamList = {
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
  };
  HowToScreen: undefined;
};
