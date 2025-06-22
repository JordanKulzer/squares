export type RootStackParamList = {
  CreateSquareScreen: undefined;
  JoinSquareScreen: {
    gridId: string;
    inputTitle: string;
    deadline: string;
    usedColors?: string[];
  };
  SquareScreen: {
    gridId: string;
    inputTitle: string;
    username: string;
    deadline: string;
    eventId: string;
    disableAnimation?: boolean;
  };
  HowToScreen: undefined;
};
