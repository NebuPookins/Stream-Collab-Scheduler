import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Store, DateFormatOption } from '../types';
import { saveStore } from '../storage';
import { deserialize } from '../helpers/serializers';

interface SettingsProps { store: Store; setStore: React.Dispatch<React.SetStateAction<Store | null>>; }

const SettingsView: React.FC<SettingsProps> = ({ store, setStore }) => {
  const [greyDays, setGreyDays] = useState(store.settings.greyThresholdDays);
  const [darkMode, setDarkMode] = useState(store.settings.darkMode);
  const [dateFormat, setDateFormat] = useState<DateFormatOption>(store.settings.dateFormat);

  const initialLoadComplete = useRef(false);

  // Effect to reset initialLoadComplete flag when the store.settings prop itself changes (e.g. after import)
  useEffect(() => {
    initialLoadComplete.current = false;
    setGreyDays(store.settings.greyThresholdDays);
    setDarkMode(store.settings.darkMode);
    setDateFormat(store.settings.dateFormat);
  }, [store.settings]);

  // useEffect for saving
  useEffect(() => {
    if (!initialLoadComplete.current) {
      // Heuristic to wait for state sync from props
      if (greyDays === store.settings.greyThresholdDays &&
          darkMode === store.settings.darkMode && dateFormat === store.settings.dateFormat) {
        initialLoadComplete.current = true;
      }
      return; // Don't save on initial load or during state sync
    }

    const newSettings = { greyThresholdDays: greyDays, darkMode, dateFormat };
    const newStore = { ...store, settings: newSettings };
    setStore(newStore);
    saveStore(newStore);
  }, [greyDays, darkMode, dateFormat, store, setStore]);

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stream-collab-scheduler.backup.${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const fileContent = reader.result as string;
        const data = deserialize(fileContent);
        setStore(data);
      } catch (error) {
        console.error("Failed to parse imported JSON:", error);
        // Optionally, inform the user about the error e.g. using a toast notification
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <h2>Settings</h2>
      <div className="mb-3">
        <label>Grey threshold (days)</label>
        <input type="number" className="form-control" value={greyDays} onChange={e => setGreyDays(+e.target.value)} />
      </div>
      <div className="form-check form-switch mb-3">
        <input className="form-check-input" type="checkbox" checked={darkMode} onChange={e => setDarkMode(e.target.checked)} />
        <label className="form-check-label">Dark Mode</label>
      </div>
      <div className="mb-3">
        <label>Date Format</label>
        <select className="form-select" value={dateFormat} onChange={e => setDateFormat(e.target.value as DateFormatOption)}>
          <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
          <option value="Month Day, Year">Month Day, Year</option>
        </select>
      </div>
       <button className="btn btn-secondary me-2" onClick={exportJSON}>Download backup</button>
       <input type="file" accept="application/json" onChange={importJSON} style={{ display: 'none' }} id="import-file-input" />
       <button className="btn btn-primary" onClick={() => document.getElementById('import-file-input')?.click()}>Restore from backup</button>
    </div>
  );
};
export default SettingsView;