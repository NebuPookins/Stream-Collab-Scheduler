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
  storeUrl?: string;
  manualMetadata?: { coverUrl?: string; [key: string]: any };
  desiredPartners: number;
  asks: AskRecord[];
  tags?: string[];
  notes?: string;
  done?: {
    date: Date;
    streamingNotes: string;
  };
  trashed?: boolean;
  scheduledTimes?: Date[];
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
  dateFormat: DateFormatOption;
  darkMode?: boolean;
  /**
   * Default hour (0-23) for new scheduled times (e.g., 18 for 6PM)
   */
  defaultScheduledHour?: number;
  /**
   * Default minute (0-59) for new scheduled times (e.g., 0 for on the hour)
   */
  defaultScheduledMinute?: number;
}

export interface Store {
  games: Game[];
  partners: Partner[];
  settings: Settings;
}