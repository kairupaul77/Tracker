import { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [records, setRecords] = useState(() => {
    const saved = localStorage.getItem('recordCollection');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error parsing saved records:', error);
      return [];
    }
  });

  const [newRecord, setNewRecord] = useState({
    title: '',
    artist: '',
    year: '',
    genre: '',
    mediaFile: null,
    mediaType: '',
    mediaUrl: ''
  });

  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'title', direction: 'ascending' });
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  // Save to localStorage whenever records change
  useEffect(() => {
    try {
      const recordsToSave = records.map(record => {
        const { mediaFile, ...rest } = record;
        return rest;
      });
      localStorage.setItem('recordCollection', JSON.stringify(recordsToSave));
    } catch (error) {
      console.error('Error saving records:', error);
    }
  }, [records]);

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      records.forEach(record => {
        if (record.mediaUrl) {
          URL.revokeObjectURL(record.mediaUrl);
        }
      });
    };
  }, [records]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewRecord(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleFileChange = (e) => {
    try {
      const file = e.target.files[0];
      if (!file) return;

      // Validate file type
      if (!file.type.match(/audio\/.|video\/./)) {
        setError('Please upload only audio or video files');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size should be less than 10MB');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      const fileType = file.type.split('/')[0]; // 'audio' or 'video'
      const objectUrl = URL.createObjectURL(file);

      setNewRecord(prev => ({
        ...prev,
        mediaFile: file,
        mediaType: fileType,
        mediaUrl: objectUrl
      }));
      setError('');
    } catch (err) {
      console.error('Error handling file upload:', err);
      setError('Failed to process the file. Please try another one.');
    }
  };

  const addRecord = () => {
    try {
      if (!newRecord.title.trim() || !newRecord.artist.trim()) {
        setError('Title and Artist are required');
        return;
      }

      const recordToAdd = {
        ...newRecord,
        id: Date.now(),
        mediaUrl: newRecord.mediaFile ? URL.createObjectURL(newRecord.mediaFile) : ''
      };

      setRecords([...records, recordToAdd]);
      resetForm();
    } catch (err) {
      console.error('Error adding record:', err);
      setError('Failed to add record. Please try again.');
    }
  };

  const startEditing = (record) => {
    setEditingId(record.id);
    setNewRecord({
      ...record,
      mediaFile: null // Reset file input when editing
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Clear file input
    }
  };

  const saveEdit = () => {
    try {
      const updatedRecords = records.map(record => {
        if (record.id === editingId) {
          // Keep existing media if no new file was selected
          const mediaUrl = newRecord.mediaFile ?
            URL.createObjectURL(newRecord.mediaFile) :
            record.mediaUrl;

          // Revoke old object URL if we're replacing it
          if (newRecord.mediaFile && record.mediaUrl) {
            URL.revokeObjectURL(record.mediaUrl);
          }

          return {
            ...newRecord,
            id: editingId,
            mediaUrl,
            mediaType: newRecord.mediaFile ? newRecord.mediaType : record.mediaType
          };
        }
        return record;
      });

      setRecords(updatedRecords);
      setEditingId(null);
      resetForm();
    } catch (err) {
      console.error('Error saving edit:', err);
      setError('Failed to save changes. Please try again.');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    resetForm();
  };

  const resetForm = () => {
    setNewRecord({
      title: '',
      artist: '',
      year: '',
      genre: '',
      mediaFile: null,
      mediaType: '',
      mediaUrl: ''
    });
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const deleteRecord = (id) => {
    try {
      // Revoke object URL to prevent memory leaks
      const recordToDelete = records.find(record => record.id === id);
      if (recordToDelete?.mediaUrl) {
        URL.revokeObjectURL(recordToDelete.mediaUrl);
      }
      setRecords(records.filter(record => record.id !== id));
    } catch (err) {
      console.error('Error deleting record:', err);
      setError('Failed to delete record. Please try again.');
    }
  };

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedRecords = [...records].sort((a, b) => {
    // Handle empty values in sorting
    const aValue = a[sortConfig.key] || '';
    const bValue = b[sortConfig.key] || '';

    if (aValue < bValue) {
      return sortConfig.direction === 'ascending' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'ascending' ? 1 : -1;
    }
    return 0;
  });

  const filteredRecords = sortedRecords.filter(record =>
    record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.genre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderMediaPreview = (record) => {
    if (!record.mediaUrl) return null;

    try {
      return record.mediaType === 'audio' ? (
        <div className="media-preview">
          <audio controls src={record.mediaUrl}>
            Your browser does not support the audio element.
          </audio>
        </div>
      ) : record.mediaType === 'video' ? (
        <div className="media-preview">
          <video controls width="250" src={record.mediaUrl}>
            Your browser does not support the video element.
          </video>
        </div>
      ) : null;
    } catch (err) {
      console.error('Error rendering media:', err);
      return <div className="media-error">Could not load media</div>;
    }
  };

  return (
    <div className="app">
      <h1>Record Tracker</h1>

      {error && <div className="error-message">{error}</div>}

      <div className="search-box">
        <input
          type="text"
          placeholder="Search records..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="add-record">
        <h2>{editingId ? 'Edit Record' : 'Add New Record'}</h2>
        <input
          type="text"
          name="title"
          placeholder="Title *"
          value={newRecord.title}
          onChange={handleInputChange}
          required
        />
        <input
          type="text"
          name="artist"
          placeholder="Artist *"
          value={newRecord.artist}
          onChange={handleInputChange}
          required
        />
        <input
          type="text"
          name="year"
          placeholder="Year"
          value={newRecord.year}
          onChange={handleInputChange}
        />
        <input
          type="text"
          name="genre"
          placeholder="Genre"
          value={newRecord.genre}
          onChange={handleInputChange}
        />

        <div className="file-upload">
          <label htmlFor="media-upload">
            {newRecord.mediaFile ?
              `Selected: ${newRecord.mediaFile.name}` :
              'Upload Audio/Video (optional)'}
          </label>
          <input
            id="media-upload"
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="audio/*,video/*"
          />
          {newRecord.mediaUrl && !newRecord.mediaFile && (
            <div className="current-media-note">(Keeping current media)</div>
          )}
        </div>

        {editingId ? (
          <div className="edit-buttons">
            <button onClick={saveEdit}>Save Changes</button>
            <button onClick={cancelEdit}>Cancel</button>
          </div>
        ) : (
          <button onClick={addRecord}>Add Record</button>
        )}
      </div>

      <div className="records-list">
        <h2>Your Collection ({records.length} records)</h2>

        <div className="sort-options">
          <span>Sort by: </span>
          <button
            onClick={() => handleSort('title')}
            className={sortConfig.key === 'title' ? 'active' : ''}
          >
            Title {sortConfig.key === 'title' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
          </button>
          <button
            onClick={() => handleSort('artist')}
            className={sortConfig.key === 'artist' ? 'active' : ''}
          >
            Artist {sortConfig.key === 'artist' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
          </button>
          <button
            onClick={() => handleSort('year')}
            className={sortConfig.key === 'year' ? 'active' : ''}
          >
            Year {sortConfig.key === 'year' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
          </button>
        </div>

        {filteredRecords.length === 0 ? (
          <p>No records found{searchTerm && ` matching "${searchTerm}"`}.</p>
        ) : (
          <ul>
            {filteredRecords.map(record => (
              <li key={record.id} className="record-item">
                <div className="record-info">
                  <div className="record-main">
                    <strong>{record.title}</strong> by {record.artist}
                  </div>
                  <div className="record-details">
                    {record.year && <span>Year: {record.year}</span>}
                    {record.genre && <span>Genre: {record.genre}</span>}
                  </div>
                  {renderMediaPreview(record)}
                </div>
                <div className="record-actions">
                  <button
                    onClick={() => startEditing(record)}
                    className="edit-button"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteRecord(record.id)}
                    className="delete-button"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;
