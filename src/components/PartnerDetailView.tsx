import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import { saveStore } from '../storage';
import 'react-datepicker/dist/react-datepicker.css';
import { Store, AskRecord, DateFormatOption, Game, Partner } from '../types';
import { getDatePickerFormat, formatDate, formatScheduledTimes, getEffectiveDeadline } from '../helpers/dateFormatter';
import { getAllUniqueTags, calculateGameScoreForPartner } from '../helpers/tagUtils';
import { formatDistanceToNow } from 'date-fns';

// Define interfaces for the combined event types
interface EventBase {
  date: Date;
  key: string;
}

interface AskRequestEvent extends EventBase {
  type: 'ask';
  game: Game;
  ask: AskRecord;
}

interface BusyEvent extends EventBase {
  type: 'busy';
}

interface GameDoneEvent extends EventBase {
  type: 'done';
  game: Game;
  otherPartners: Partner[];
}

type PartnerEvent = AskRequestEvent | BusyEvent | GameDoneEvent;

interface PartnerDetailProps { store: Store; setStore: React.Dispatch<React.SetStateAction<Store | null>>; }
const PartnerDetailView: React.FC<PartnerDetailProps> = ({ store, setStore }) => {
  const { id } = useParams<{ id: string }>(); const navigate = useNavigate();
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

  const initialLoadComplete = useRef(false);

  // Effect to reset initialLoadComplete flag when the partner prop itself changes
  useEffect(() => {
    initialLoadComplete.current = false;
    setName(partner.name);
    setLastStreamedWith(partner.lastStreamedWith);
    setBusyUntil(partner.busyUntil);
    setSchedule(partner.schedule || '');
    setLovesTags(partner.lovesTags || []);
    setHatesTags(partner.hatesTags || []);
  }, [partner]);

  // useEffect for saving
  useEffect(() => {
    if (!initialLoadComplete.current) {
      // Heuristic to wait for state sync from partner prop
      if (name === partner.name && lastStreamedWith === partner.lastStreamedWith &&
          busyUntil === partner.busyUntil && schedule === (partner.schedule || '') &&
          JSON.stringify(lovesTags) === JSON.stringify(partner.lovesTags || []) &&
          JSON.stringify(hatesTags) === JSON.stringify(partner.hatesTags || [])) {
        initialLoadComplete.current = true;
      }
      return; // Don't save on initial load or during state sync
    }

    const updatedPartner = { ...partner, name, lastStreamedWith, busyUntil, schedule, lovesTags, hatesTags };
    const newPartners = [...store.partners];
    newPartners[idx] = updatedPartner;
    const newStore = { ...store, partners: newPartners };
    setStore(newStore);
    saveStore(newStore);
  }, [name, lastStreamedWith, busyUntil, schedule, lovesTags, hatesTags, partner, idx, store, setStore]);

  // Only consider non-trashed games for events and relevantGames
  const nonTrashedGames = store.games.filter(g => !g.trashed);

  const partnerEvents = React.useMemo(() => {
    const events: PartnerEvent[] = [];

    // Add AskRequests
    nonTrashedGames.forEach(game => {
      game.asks.forEach((ask, askIdx) => {
        if (ask.partnerId === id) {
          events.push({
            type: 'ask',
            date: ask.askedOn,
            game,
            ask,
            key: `ask-${game.id}-${askIdx}`
          });
        }
      });
    });

    // Add Busy Until
    if (partner.busyUntil) {
      events.push({
        type: 'busy',
        date: partner.busyUntil,
        key: 'busy-until'
      });
    }

    // Add Game Done events
    nonTrashedGames.forEach(game => {
      if (game.done && game.asks.some(a => a.partnerId === id && a.confirmed)) {
        const otherConfirmedPartners = store.partners.filter(p =>
          p.id !== id && game.asks.some(a => a.partnerId === p.id && a.confirmed)
        );
        events.push({
          type: 'done',
          date: game.done.date,
          game,
          otherPartners: otherConfirmedPartners,
          key: `done-${game.id}`
        });
      }
    });

    // Sort events chronologically
    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [nonTrashedGames, store.partners, id, partner.busyUntil]);

  const relevantGames = React.useMemo(() => {
    return nonTrashedGames
      .filter(game => {
        // Don't include games that are marked as done
        if (game.done) {
          return false;
        }
        const confirmedAsks = game.asks.filter(a => a.confirmed).length;
        if (game.desiredPartners <= confirmedAsks) {
          return false;
        }
        // Don't include a game if we already have an AskRecord with the current partner for that game.
        if (game.asks.some(ask => ask.partnerId === id)) {
          return false;
        }
        return true;
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
        // Secondary sort: effective deadline ascending (nulls last)
        const t1 = getEffectiveDeadline(a)?.getTime() ?? Infinity;
        const t2 = getEffectiveDeadline(b)?.getTime() ?? Infinity;
        if (t1 !== t2) {
          return t1 - t2;
        }
        return 0;
      });
  }, [nonTrashedGames, partner.lovesTags, partner.hatesTags, id]);

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
        <input className="form-control" value={name} onChange={e=>setName(e.target.value)} />
      </div>
      <div className="mb-3">
        <label className="form-label">Last Streamed With</label>
        <DatePicker selected={lastStreamedWith} onChange={d=>setLastStreamedWith(d||undefined)} isClearable className="form-control" dateFormat={getDatePickerFormat(store.settings.dateFormat)} />
      </div>
      <div className="mb-3">
        <label className="form-label">Schedule</label>
        <input className="form-control" value={schedule} onChange={e=>setSchedule(e.target.value)} />
      </div>
      <div className="mb-3">
        <label className="form-label">Busy Until</label>
        <DatePicker selected={busyUntil} onChange={d=>setBusyUntil(d||undefined)} isClearable className="form-control" dateFormat={getDatePickerFormat(store.settings.dateFormat)} />
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

      <div className="mt-4">
        <h3>Events</h3>
        {partnerEvents.length > 0 ? (
          <ul className="list-group">
            {partnerEvents.map((event) => (
              <li key={event.key} className="list-group-item">
                <div className="d-flex w-100 justify-content-between">
                  <h5 className="mb-1">
                    {event.type === 'ask' && `Requested: ${event.game.name}`}
                    {event.type === 'busy' && "Busy Until"}
                    {event.type === 'done' && `Played: ${event.game.name}`}
                  </h5>
                  <small>{formatDate(event.date, store.settings.dateFormat)}</small>
                </div>
                {event.type === 'ask' && (
                  <div>
                    <p className="mb-1">
                      Game: <Link to={`/games/${event.game.id}`}>{event.game.name}</Link>
                      {event.game.manualMetadata?.coverUrl && (
                        <img src={event.game.manualMetadata.coverUrl} alt={event.game.name} style={{ maxWidth: '50px', marginLeft: '10px', float: 'right' }} />
                      )}
                    </p>
                    <p className="mb-1">Response: {event.ask.response || 'No response yet'}</p>
                    <p className="mb-1">Confirmed: {event.ask.confirmed ? 'Yes' : 'No'}</p>
                  </div>
                )}
                {event.type === 'done' && (
                  <div>
                    <p className="mb-1">
                      Game: <Link to={`/games/${event.game.id}`}>{event.game.name}</Link>
                      {event.game.manualMetadata?.coverUrl && (
                        <img src={event.game.manualMetadata.coverUrl} alt={event.game.name} style={{ maxWidth: '50px', marginLeft: '10px', float: 'right' }} />
                      )}
                    </p>
                    {event.otherPartners.length > 0 && (
                      <p className="mb-1">
                        Other Partners: {event.otherPartners.map(p => <Link key={p.id} to={`/partners/${p.id}`} className="me-2">{p.name}</Link>)}
                      </p>
                    )}
                    <p className="mb-1">Notes: {event.game.done?.streamingNotes || 'N/A'}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>No events found for this partner.</p>
        )}
      </div>

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
                {game.deadline ? `Deadline: ${formatDate(new Date(game.deadline), store.settings.dateFormat)} (${formatDistanceToNow(new Date(game.deadline), { addSuffix: true })})` : 'No deadline'}
                {formatScheduledTimes(game.scheduledTimes, store.settings.dateFormat) && (
                  <span className="ms-2">
                    {game.deadline ? ' • ' : ''}Scheduled: {formatScheduledTimes(game.scheduledTimes, store.settings.dateFormat)}
                  </span>
                )}
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