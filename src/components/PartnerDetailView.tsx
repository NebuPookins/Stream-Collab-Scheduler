import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import { useAutosave } from '../hooks/useAutosave';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Store, AskRecord, DateFormatOption } from '../types';
import { getDatePickerFormat } from '../helpers/dateFormatter';

interface PartnerDetailProps { store: Store; setStore: React.Dispatch<React.SetStateAction<Store | null>>; }
const PartnerDetailView: React.FC<PartnerDetailProps> = ({ store, setStore }) => {
  const { id } = useParams(); const navigate = useNavigate();
  const idx = store.partners.findIndex(p=>p.id===id!);
  if(idx<0) return <div>Not found</div>;
  const partner = store.partners[idx];
  // Editable fields
  const [name, setName] = useState(partner.name);
  const [lastStreamedWith, setLastStreamedWith] = useState<Date|undefined>(partner.lastStreamedWith);
  const [busyUntil, setBusyUntil] = useState<Date|undefined>(partner.busyUntil);
  const [schedule, setSchedule] = useState(partner.schedule||'');
  const [lovesTags, setLovesTags] = useState<string[]>(partner.lovesTags || []);
  const [hatesTags, setHatesTags] = useState<string[]>(partner.hatesTags || []);
  const [newLovesTagInput, setNewLovesTagInput] = useState('');
  const [newHatesTagInput, setNewHatesTagInput] = useState('');

  // Refs to track initial load for tags
  const initialLovesTagsLoadRef = React.useRef(true);
  const initialHatesTagsLoadRef = React.useRef(true);

  // Effect to set initial load refs on mount
  React.useEffect(() => {
    initialLovesTagsLoadRef.current = true;
    initialHatesTagsLoadRef.current = true;
  }, []); // Empty dependency array means this runs once on mount

  const memoizedSave = useCallback(() => {
    const updated = { ...partner, name, lastStreamedWith, busyUntil, schedule, lovesTags, hatesTags };
    const arr = [...store.partners]; arr[idx] = updated;
    setStore({ ...store, partners: arr });
  }, [store, setStore, partner, idx, name, lastStreamedWith, busyUntil, schedule, lovesTags, hatesTags]);

  const immediateSave = useAutosave(memoizedSave, [name, lastStreamedWith, busyUntil, schedule, lovesTags, hatesTags]);

  // Effect to save lovesTags when they are modified by the user
  React.useEffect(() => {
    if (initialLovesTagsLoadRef.current) {
      initialLovesTagsLoadRef.current = false; // Mark initial load as complete
      return; // Don't save on initial load/sync
    }
    immediateSave();
  }, [lovesTags, immediateSave]);

  // Effect to save hatesTags when they are modified by the user
  React.useEffect(() => {
    if (initialHatesTagsLoadRef.current) {
      initialHatesTagsLoadRef.current = false; // Mark initial load as complete
      return; // Don't save on initial load/sync
    }
    immediateSave();
  }, [hatesTags, immediateSave]);

  // Build calendar events
  const events = store.games.flatMap(g =>
    g.asks.filter(a => a.partnerId === id).map(a => ({ title: g.name + (a.confirmed ? ' ✓' : ''), date: a.askedOn.toISOString().split('T')[0] }))
  );
  if (lastStreamedWith) events.push({ title: 'Last Stream', date: lastStreamedWith.toISOString().split('T')[0] });
  if (busyUntil) events.push({ title: 'Busy', date: busyUntil.toISOString().split('T')[0] });

  const addTag = (type: 'loves' | 'hates') => {
    if (type === 'loves' && newLovesTagInput && !lovesTags.includes(newLovesTagInput)) {
      setLovesTags([...lovesTags, newLovesTagInput]);
      setNewLovesTagInput('');
      // immediateSave(); // Handled by useEffect for lovesTags
    } else if (type === 'hates' && newHatesTagInput && !hatesTags.includes(newHatesTagInput)) {
      setHatesTags([...hatesTags, newHatesTagInput]);
      setNewHatesTagInput('');
      // immediateSave(); // Handled by useEffect for hatesTags
    }
  };

  const removeTag = (type: 'loves' | 'hates', tagToRemove: string) => {
    if (type === 'loves') {
      setLovesTags(lovesTags.filter(tag => tag !== tagToRemove));
      // immediateSave(); // Handled by useEffect for lovesTags
    } else {
      setHatesTags(hatesTags.filter(tag => tag !== tagToRemove));
      // immediateSave(); // Handled by useEffect for hatesTags
    }
  };

  return (
    <div>
      <button className="btn btn-link" onClick={()=>navigate(-1)}>Back</button>
      <h2>Partner Details</h2>
      <div className="mb-3">
        <label className="form-label">Name</label>
        <input className="form-control" value={name} onChange={e=>setName(e.target.value)} onBlur={immediateSave} />
      </div>
      <div className="mb-3">
        <label className="form-label">Last Streamed With</label>
        <DatePicker selected={lastStreamedWith} onChange={d=>setLastStreamedWith(d||undefined)} onBlur={immediateSave} isClearable className="form-control" dateFormat={getDatePickerFormat(store.settings.dateFormat)} />
      </div>
      <div className="mb-3">
        <label className="form-label">Schedule</label>
        <input className="form-control" value={schedule} onChange={e=>setSchedule(e.target.value)} onBlur={immediateSave} />
      </div>
      <div className="mb-3">
        <label className="form-label">Busy Until</label>
        <DatePicker selected={busyUntil} onChange={d=>setBusyUntil(d||undefined)} onBlur={immediateSave} isClearable className="form-control" dateFormat={getDatePickerFormat(store.settings.dateFormat)} />
      </div>

      {/* Loves Tags */}
      <div className="mb-3">
        <label className="form-label">Loves Tags</label>
        <div>
          {lovesTags.map(tag => (
            <span key={tag} className="badge bg-success me-1">
              {tag}
              <button type="button" className="btn-close btn-close-white ms-1" aria-label="Remove tag" onClick={() => removeTag('loves', tag)}></button>
            </span>
          ))}
        </div>
        <div className="input-group mt-2">
          <input
            type="text"
            className="form-control"
            value={newLovesTagInput}
            onChange={e => setNewLovesTagInput(e.target.value)}
            onKeyPress={e => { if (e.key === 'Enter') { addTag('loves'); e.preventDefault(); } }}
            placeholder="Add loved tag"
          />
          <button className="btn btn-outline-success" type="button" onClick={() => addTag('loves')}>Add</button>
        </div>
      </div>

      {/* Hates Tags */}
      <div className="mb-3">
        <label className="form-label">Hates Tags</label>
        <div>
          {hatesTags.map(tag => (
            <span key={tag} className="badge bg-danger me-1">
              {tag}
              <button type="button" className="btn-close btn-close-white ms-1" aria-label="Remove tag" onClick={() => removeTag('hates', tag)}></button>
            </span>
          ))}
        </div>
        <div className="input-group mt-2">
          <input
            type="text"
            className="form-control"
            value={newHatesTagInput}
            onChange={e => setNewHatesTagInput(e.target.value)}
            onKeyPress={e => { if (e.key === 'Enter') { addTag('hates'); e.preventDefault(); } }}
            placeholder="Add hated tag"
          />
          <button className="btn btn-outline-danger" type="button" onClick={() => addTag('hates')}>Add</button>
        </div>
      </div>

      <FullCalendar
        plugins={[dayGridPlugin, listPlugin]}
        initialView={store.settings.viewMode==='calendar'?'dayGridMonth':'listMonth'}
        events={events}
      />
    </div>
  );
};
export default PartnerDetailView;