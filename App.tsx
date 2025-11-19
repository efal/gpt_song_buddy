import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import SongList from './components/SongList';
import SongEditor from './components/SongEditor';
import LiveMode from './components/LiveMode';
import ImportExport from './components/ImportExport';
import { storageService } from './services/storage';
import { Song } from './types';

const AppContent: React.FC = () => {
  const [view, setView] = useState<'list' | 'editor' | 'live'>('list');
  const [songs, setSongs] = useState<Song[]>([]);
  const [activeSong, setActiveSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSongs = async () => {
    setLoading(true);
    const data = await storageService.getAllSongs();
    setSongs(data);
    setLoading(false);
  };

  useEffect(() => {
    refreshSongs();
  }, []);

  const handleCreate = () => {
    setActiveSong(null);
    setView('editor');
  };

  const handleEdit = (song: Song) => {
    setActiveSong(song);
    setView('editor');
  };

  const handlePlay = (song: Song) => {
    setActiveSong(song);
    setView('live');
  };

  const handleSave = () => {
    refreshSongs();
    setView('list');
    setActiveSong(null);
  };

  // Called when slider changes in list view
  const handleQuickUpdate = async (updatedSong: Song) => {
    // Optimistic UI update
    setSongs(prev => prev.map(s => s.id === updatedSong.id ? updatedSong : s));
    // Persist to DB
    await storageService.saveSong(updatedSong);
  };

  const handleCloseEditor = () => {
    setView('list');
    setActiveSong(null);
  };

  const handleExitLive = () => {
    setView('list');
    setActiveSong(null);
  };

  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-gray-900 text-white">Loading Library...</div>;
  }

  return (
    <div className="h-full w-full">
        {view === 'list' && (
          <div className="pb-12">
            <SongList 
                songs={songs} 
                onCreate={handleCreate} 
                onEdit={handleEdit} 
                onPlay={handlePlay} 
                onUpdate={handleQuickUpdate}
            />
            <div className="max-w-4xl mx-auto px-4 mt-8 pb-12">
                 <ImportExport onRefresh={refreshSongs} />
            </div>
          </div>
        )}

        {view === 'editor' && (
          <SongEditor 
            existingSong={activeSong} 
            onSave={handleSave} 
            onClose={handleCloseEditor} 
          />
        )}

        {view === 'live' && activeSong && (
          <LiveMode 
            song={activeSong} 
            onExit={handleExitLive} 
          />
        )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
       <AppContent />
    </HashRouter>
  );
};

export default App;