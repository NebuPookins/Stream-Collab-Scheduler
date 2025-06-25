import React, { useState, useCallback } from 'react';
import { Store, DateFormatOption } from '../types';
import { saveStore } from '../../storage';

interface SettingsProps { store: Store; setStore: React.Dispatch<React.SetStateAction<Store | null>>; }

const SettingsView: React.FC<SettingsProps> = ({ store, setStore }) => {
  const [greyDays, setGreyDays] = useState(store.settings.greyThresholdDays);
  const [viewMode, setViewMode] = useState(store.settings.viewMode);
  const [darkMode, setDarkMode] = useState(store.settings.darkMode);
  const [dateFormat, setDateFormat] = useState<DateFormatOption>(store.settings.dateFormat);

  const memoizedSave = useCallback(() => {
    const newSettings = { greyThresholdDays: greyDays, viewMode, darkMode, dateFormat };
    const newStore = { ...store, settings: newSettings };
    setStore(newStore);
    saveStore(newStore);
  }, [store, setStore, greyDays, viewMode, darkMode, dateFormat]);

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { try { const data = JSON.parse(reader.result as string); setStore(data); } catch {} };
    reader.readAsText(file);
  };

  return (
    <div>
      <h2>Settings</h2>
      <div className="mb-3">
        <label>Grey threshold (days)</label>
        <input type="number" className="form-control" value={greyDays} onChange={e => { setGreyDays(+e.target.value); memoizedSave(); }} />
      </div>
      <div className="mb-3">
        <label>View mode</label>
        <select className="form-select" value={viewMode} onChange={e => { setViewMode(e.target.value as any); memoizedSave(); }}>
          <option value="calendar">Calendar</option>
          <option value="list">List</option>
        </select>
      </div>
      <div className="form-check form-switch mb-3">
        <input className="form-check-input" type="checkbox" checked={darkMode} onChange={e => { setDarkMode(e.target.checked); memoizedSave(); }} />
        <label className="form-check-label">Dark Mode</label>
      </div>
      <div className="mb-3">
        <label>Date Format</label>
        <select className="form-select" value={dateFormat} onChange={e => { setDateFormat(e.target.value as DateFormatOption); memoizedSave(); }}>
          <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
          <option value="Month Day, Year">Month Day, Year</option>
        </select>
      </div>
      <button className="btn btn-secondary me-2" onClick={exportJSON}>Export JSON</button>
      <input type="file" accept="application/json" onChange={importJSON} />
    </div>
  );
};
export default SettingsView;