
export interface AudioTriggerConfig {
  threshold: number; // dB value, e.g., -40
}

export interface Song {
  id: string;
  title: string;
  lyrics: string;
  fontsize: number; // px
  scrollspeed: number; // pixels per second
  audioTrigger: AudioTriggerConfig;
  order?: number; // For playlist sorting
  createdAt: number;
}

export interface SongLibrary {
  version: number;
  songs: Song[];
}

export const DEFAULT_SONG: Omit<Song, 'id' | 'createdAt'> = {
  title: '',
  lyrics: '',
  fontsize: 48,
  scrollspeed: 30,
  audioTrigger: {
    threshold: -35
  }
};
