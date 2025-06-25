export interface AskRecord {
  partnerId: string;
  askedOn: Date;
  response?: string;
  confirmed: boolean;
}

export interface Game {
  id: string;
  name: string;
  deadline?: Date;
  steamId?: string;
  manualMetadata?: { coverUrl?: string; officialName?: string; [key: string]: any };
  desiredPartners: number;
  asks: AskRecord[];
  tags?: string[];
  done?: Date;
}

export interface Partner {
  id: string;
  name: string;
  lastStreamedWith?: Date;
  schedule?: string;
  busyUntil?: Date;
  genrePreferences?: string[];
  lovesTags?: string[];
  hatesTags?: string[];
}

export type DateFormatOption = "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD" | "Month Day, Year";

export interface Settings {
  greyThresholdDays: number;
  viewMode: "calendar" | "list";
  darkMode: boolean;
  dateFormat: DateFormatOption;
}

export interface Store {
  games: Game[];
  partners: Partner[];
  settings: Settings;
}