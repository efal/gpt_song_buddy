
import localforage from 'localforage';
import { Song, SongLibrary } from '../types';

const DB_NAME = 'SongBuddyDB';
const STORE_NAME = 'songs';

localforage.config({
  name: DB_NAME,
  storeName: STORE_NAME
});

export const storageService = {
  async getAllSongs(): Promise<Song[]> {
    const songs: Song[] = [];
    await localforage.iterate((value: Song) => {
      songs.push(value);
    });
    // Sort by custom order first (playlist), then by title
    return songs.sort((a, b) => {
      const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.title.localeCompare(b.title);
    });
  },

  async getSong(id: string): Promise<Song | null> {
    return await localforage.getItem<Song>(id);
  },

  async saveSong(song: Song): Promise<void> {
    await localforage.setItem(song.id, song);
  },

  async deleteSong(id: string): Promise<void> {
    await localforage.removeItem(id);
  },

  async exportLibrary(): Promise<string> {
    const songs = await this.getAllSongs();
    const library: SongLibrary = {
      version: 1,
      songs
    };
    return JSON.stringify(library, null, 2);
  },

  async importLibrary(jsonString: string): Promise<number> {
    try {
      const library: SongLibrary = JSON.parse(jsonString);
      if (!library.songs || !Array.isArray(library.songs)) {
        throw new Error('Invalid library format');
      }
      let count = 0;
      for (const song of library.songs) {
        // Validation check
        if (song.id && song.title) {
            await this.saveSong(song);
            count++;
        }
      }
      return count;
    } catch (e) {
      console.error('Import failed', e);
      throw e;
    }
  }
};
