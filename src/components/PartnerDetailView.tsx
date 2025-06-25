import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import DatePicker from 'react-datepicker';
import { saveStore } from '../../storage';
import 'react-datepicker/dist/react-datepicker.css';
import { Store, AskRecord, DateFormatOption, Game } from '../types';
import { getDatePickerFormat } from '../helpers/dateFormatter';
import { getAllUniqueTags, calculateGameScoreForPartner } from '../helpers/tagUtils';
import { Link } from 'react-router-dom';

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

  const allStoreTags = React.useMemo(() => getAllUniqueTags(store), [store]);

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
    const newStore = { ...store, partners: arr };
    setStore(newStore);
    saveStore(newStore);
  }, [store, setStore, partner, idx, name, lastStreamedWith, busyUntil, schedule, lovesTags, hatesTags]);

  // Build calendar events
  const events = store.games.flatMap(g =>
    g.asks.filter(a => a.partnerId === id).map(a => ({ title: g.name + (a.confirmed ? ' ✓' : ''), date: a.askedOn.toISOString().split('T')[0] }))
  );
  if (lastStreamedWith) events.push({ title: 'Last Stream', date: lastStreamedWith.toISOString().split('T')[0] });
  if (busyUntil) events.push({ title: 'Busy', date: busyUntil.toISOString().split('T')[0] });

  const relevantGames = React.useMemo(() => {
    return store.games
      .filter(game => {
        const confirmedAsks = game.asks.filter(a => a.confirmed).length;
        return game.desiredPartners > confirmedAsks;
      })
      .map(game => {
        const score = calculateGameScoreForPartner(game.tags, partner.lovesTags, partner.hatesTags);
        return { ...game, score };
      })
      .sort((a, b) => {
        // Primary sort: score descending
        if (a.score !== b.score) {
          return b.score - a.score;
        }
        // Secondary sort: deadline ascending (nulls last)
        if (a.deadline && b.deadline) {
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        }
        if (a.deadline) return -1; // a has deadline, b doesn't, a comes first
        if (b.deadline) return 1;  // b has deadline, a doesn't, b comes first
        return 0; // both deadlines are null
      });
  }, [store.games, partner.lovesTags, partner.hatesTags]);

  const addTag = (type: 'loves' | 'hates') => {
    if (type === 'loves' && newLovesTagInput && !lovesTags.includes(newLovesTagInput)) {
      setLovesTags([...lovesTags, newLovesTagInput]);
      setNewLovesTagInput('');
      memoizedSave();
    } else if (type === 'hates' && newHatesTagInput && !hatesTags.includes(newHatesTagInput)) {
      setHatesTags([...hatesTags, newHatesTagInput]);
      setNewHatesTagInput('');
      memoizedSave();
    }
  };

  const removeTag = (type: 'loves' | 'hates', tagToRemove: string) => {
    if (type === 'loves') {
      setLovesTags(lovesTags.filter(tag => tag !== tagToRemove));
      memoizedSave();
    } else {
      setHatesTags(hatesTags.filter(tag => tag !== tagToRemove));
      memoizedSave();
    }
  };

  return (
    <div>
      <button className="btn btn-link" onClick={()=>navigate(-1)}>Back</button>
      <h2>Partner Details</h2>
      <div className="mb-3">
        <label className="form-label">Name</label>
        <input className="form-control" value={name} onChange={e=>{setName(e.target.value); memoizedSave();}} />
      </div>
      <div className="mb-3">
        <label className="form-label">Last Streamed With</label>
        <DatePicker selected={lastStreamedWith} onChange={d=>{setLastStreamedWith(d||undefined); memoizedSave();}} isClearable className="form-control" dateFormat={getDatePickerFormat(store.settings.dateFormat)} />
      </div>
      <div className="mb-3">
        <label className="form-label">Schedule</label>
        <input className="form-control" value={schedule} onChange={e=>{setSchedule(e.target.value); memoizedSave();}} />
      </div>
      <div className="mb-3">
        <label className="form-label">Busy Until</label>
        <DatePicker selected={busyUntil} onChange={d=>{setBusyUntil(d||undefined); memoizedSave();}} isClearable className="form-control" dateFormat={getDatePickerFormat(store.settings.dateFormat)} />
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
            list="all-tags-datalist-partner"
          />
          <datalist id="all-tags-datalist-partner">
            {allStoreTags.map(tag => (
              <option key={`loves-${tag}`} value={tag} />
            ))}
          </datalist>
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
            list="all-tags-datalist-partner"
          />
          <datalist id="all-tags-datalist-partner">
            {allStoreTags.map(tag => (
              <option key={`hates-${tag}`} value={tag} />
            ))}
          </datalist>
          <button className="btn btn-outline-danger" type="button" onClick={() => addTag('hates')}>Add</button>
        </div>
      </div>

      <FullCalendar
        plugins={[dayGridPlugin, listPlugin]}
        initialView={store.settings.viewMode==='calendar'?'dayGridMonth':'listYear'}
        events={events}
      />

      <h3 className="mt-4">Relevant Games ({relevantGames.length})</h3>
      {relevantGames.length > 0 ? (
        <ul className="list-group">
          {relevantGames.map(game => (
            <li key={game.id} className="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <Link to={`/games/${game.id}`}>{game.name}</Link>
                <span className="ms-2">
                  (Score: {game.score})
                  {game.tags?.map(tag => {
                    if (partner.lovesTags?.includes(tag)) {
                      return <span key={`${game.id}-loves-${tag}`} title={`Loves: ${tag}`} className="ms-1">❤️</span>;
                    }
                    if (partner.hatesTags?.includes(tag)) {
                      return <span key={`${game.id}-hates-${tag}`} title={`Hates: ${tag}`} className="ms-1">🗑️</span>;
                    }
                    return null;
                  })}
                </span>
              </div>
              <small className="text-muted">
                {game.deadline ? `Deadline: ${new Date(game.deadline).toLocaleDateString()}` : 'No deadline'}
              </small>
            </li>
          ))}
        </ul>
      ) : (
        <p>No relevant games found for this partner based on current criteria.</p>
      )}
    </div>
  );
};
export default PartnerDetailView;