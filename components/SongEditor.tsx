import React, { useState, useEffect } from 'react';
import { Song, DEFAULT_SONG } from '../types';
import { storageService } from '../services/storage';
import { v4 as uuidv4 } from 'uuid';
import { Save, Trash2, ArrowLeft } from 'lucide-react';

interface SongEditorProps {
  existingSong?: Song | null;
  onClose: () => void;
  onSave: () => void;
}

const SongEditor: React.FC<SongEditorProps> = ({ existingSong, onClose, onSave }) => {
  const [formData, setFormData] = useState<Song>(existingSong || { ...DEFAULT_SONG, id: uuidv4(), createdAt: Date.now() });

  const handleChange = (field: keyof Song, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTriggerChange = (field: string, value: number) => {
    setFormData(prev => ({ 
        ...prev, 
        audioTrigger: { ...prev.audioTrigger, [field]: value } 
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await storageService.saveSong(formData);
    onSave();
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this song?')) {
        await storageService.deleteSong(formData.id);
        onSave(); // Refreshes list and closes
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900 sticky top-0 z-10">
        <button onClick={onClose} className="flex items-center text-gray-400 hover:text-white">
            <ArrowLeft className="mr-2" /> Back
        </button>
        <h2 className="text-xl font-bold">{existingSong ? 'Edit Song' : 'New Song'}</h2>
        <div className="flex space-x-2">
            {existingSong && (
                <button onClick={handleDelete} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg">
                    <Trash2 size={20} />
                </button>
            )}
            <button onClick={handleSubmit} className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold">
                <Save size={18} className="mr-2" /> Save
            </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 max-w-3xl mx-auto w-full space-y-6">
        <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Song Title</label>
            <input 
                type="text" 
                required
                value={formData.title}
                onChange={e => handleChange('title', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Enter title..."
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Font Size ({formData.fontsize}px)</label>
                <input 
                    type="range" min="20" max="120" step="2"
                    value={formData.fontsize}
                    onChange={e => handleChange('fontsize', parseInt(e.target.value))}
                    className="w-full accent-blue-500"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Scroll Speed ({formData.scrollspeed} px/s)</label>
                <input 
                    type="range" min="5" max="200" step="5"
                    value={formData.scrollspeed}
                    onChange={e => handleChange('scrollspeed', parseInt(e.target.value))}
                    className="w-full accent-green-500"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Audio Trigger ({formData.audioTrigger.threshold} dB)</label>
                <input 
                    type="range" min="-80" max="-10" step="5"
                    value={formData.audioTrigger.threshold}
                    onChange={e => handleTriggerChange('threshold', parseInt(e.target.value))}
                    className="w-full accent-red-500"
                />
                <p className="text-xs text-gray-500 mt-1">Lower = more sensitive. -35dB is typical for live bands.</p>
            </div>
        </div>

        <div className="flex-1 flex flex-col min-h-[400px]">
            <label className="block text-sm font-medium text-gray-400 mb-1">Lyrics</label>
            <textarea 
                value={formData.lyrics}
                onChange={e => handleChange('lyrics', e.target.value)}
                className="w-full flex-1 bg-gray-800 border border-gray-700 rounded-lg p-4 text-lg font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed resize-none"
                placeholder="Paste lyrics here..."
            />
        </div>
      </form>
    </div>
  );
};

export default SongEditor;
