import React, { useState } from 'react';
import { Song } from '../types';
import { Music, Play, Edit, Search, Settings, X } from 'lucide-react';

interface SongListProps {
  songs: Song[];
  onEdit: (song: Song) => void;
  onPlay: (song: Song) => void;
  onCreate: () => void;
  onUpdate: (song: Song) => void;
}

const SongList: React.FC<SongListProps> = ({ songs, onEdit, onPlay, onCreate, onUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredSongs = songs.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.lyrics.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSettings = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedId(expandedId === id ? null : id);
  };

  const handleQuickChange = (song: Song, field: keyof Song, value: number) => {
    const updatedSong = { ...song, [field]: value };
    onUpdate(updatedSong);
  };

  return (
    <div className="max-w-4xl mx-auto w-full p-4">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-green-400">
          Song Buddy
        </h1>
        <button 
          onClick={onCreate}
          className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold shadow-lg transition transform hover:scale-105"
        >
          + New Song
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input 
            type="text"
            placeholder="Search songs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <div className="grid gap-3">
        {filteredSongs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
                <Music size={48} className="mx-auto mb-4 opacity-50" />
                <p>No songs found. Create one or import a library.</p>
            </div>
        ) : (
            filteredSongs.map(song => (
                <div key={song.id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden transition-all duration-200">
                    <div className="p-4 flex items-center justify-between">
                        <div className="flex-1 min-w-0 mr-4 cursor-pointer" onClick={() => onPlay(song)}>
                            <h3 className="text-lg font-bold text-white truncate">{song.title}</h3>
                            <div className="flex items-center text-xs text-gray-400 mt-1 space-x-3">
                                <span className="bg-gray-700 px-2 py-0.5 rounded text-blue-300">{song.scrollspeed} px/s</span>
                                <span className="bg-gray-700 px-2 py-0.5 rounded text-purple-300">{song.fontsize}px</span>
                                <span>•</span>
                                <span>Trig: {song.audioTrigger.threshold}dB</span>
                            </div>
                        </div>
                        <div className="flex items-center space-x-1">
                             <button 
                                onClick={(e) => toggleSettings(song.id, e)}
                                className={`p-3 rounded-full transition ${expandedId === song.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                                title="Quick Settings"
                            >
                                {expandedId === song.id ? <X size={20} /> : <Settings size={20} />}
                            </button>
                             <button 
                                onClick={() => onEdit(song)}
                                className="p-3 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition"
                                title="Edit Text"
                            >
                                <Edit size={20} />
                            </button>
                            <button 
                                onClick={() => onPlay(song)}
                                className="p-3 bg-green-600 hover:bg-green-500 text-white rounded-full shadow-md transition transform hover:scale-110 ml-2"
                                title="Live Mode"
                            >
                                <Play size={20} fill="currentColor" />
                            </button>
                        </div>
                    </div>
                    
                    {/* Quick Settings Panel */}
                    {expandedId === song.id && (
                        <div className="bg-gray-900/50 border-t border-gray-700 p-4 grid gap-4 animate-in slide-in-from-top-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-gray-400">Font Size</span>
                                        <span className="font-bold text-blue-400">{song.fontsize}px</span>
                                    </div>
                                    <input 
                                        type="range" min="20" max="120" step="2"
                                        value={song.fontsize}
                                        onChange={(e) => handleQuickChange(song, 'fontsize', parseInt(e.target.value))}
                                        className="w-full accent-blue-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-gray-400">Scroll Speed</span>
                                        <span className="font-bold text-green-400">{song.scrollspeed} px/s</span>
                                    </div>
                                    <input 
                                        type="range" min="5" max="200" step="5"
                                        value={song.scrollspeed}
                                        onChange={(e) => handleQuickChange(song, 'scrollspeed', parseInt(e.target.value))}
                                        className="w-full accent-green-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ))
        )}
      </div>
    </div>
  );
};

export default SongList;