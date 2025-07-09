import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { formatDistanceToNow } from 'date-fns';
import { Store, AskRecord } from '../types';
import { saveStore } from '../storage';
import { formatDate, getDatePickerFormat } from '../helpers/dateFormatter';
import { getAllUniqueTags } from '../helpers/tagUtils';
import { sortPartners } from '../helpers/partnerSorters';
import { getSteamAppIdFromUrl, getSteamCoverUrl, getPartnerGameStates } from '../helpers/storeUtils'; // Added getPartnerGameStates
import MarkdownNotesField from './MarkdownNotesField';

interface GameDetailProps { store: Store; setStore: React.Dispatch<React.SetStateAction<Store | null>>; }
const GameDetailView: React.FC<GameDetailProps> = ({ store, setStore }) => {
  const { id } = useParams(); const navigate = useNavigate();
  const gameIndex = store.games.findIndex(g => g.id === id);
  if (gameIndex < 0) return <div>Not found</div>;
  const game = store.games[gameIndex];
  
  const [name, setName] = useState(game.name);
  const [deadline, setDeadline] = useState<Date | undefined>(game.deadline);
  const [desiredPartners, setDesiredPartners] = useState(game.desiredPartners);
  const [storeUrlInput, setStoreUrlInput] = useState(game.storeUrl || '');
  const [coverUrl, setCoverUrl] = useState(game.manualMetadata?.coverUrl);
  const [steamCoverPlaceholder, setSteamCoverPlaceholder] = useState<string | undefined>(undefined);
  const [tags, setTags] = useState<string[]>(game.tags || []);
  const [newTagInput, setNewTagInput] = useState('');
  const [notes, setNotes] = useState(game.notes || '');
  const [doneState, setDoneState] = useState(game.done);
  const [scheduledTimes, setScheduledTimes] = useState<Date[]>(game.scheduledTimes || []);

  const allStoreTags = React.useMemo(() => getAllUniqueTags(store), [store]);

  // This effect handles the auto-population of the Steam cover placeholder when a valid Steam URL is entered
  React.useEffect(() => {
    const steamAppId = getSteamAppIdFromUrl(storeUrlInput);
    setSteamCoverPlaceholder(getSteamCoverUrl(steamAppId));
  }, [storeUrlInput]); // Dependency only on storeUrlInput

  // Local state for game asks, to allow editing
  const [asks, setAsks] = useState<AskRecord[]>(game.asks);

  const initialLoadComplete = useRef(false);

  // Effect to reset initialLoadComplete flag when the game prop itself changes
  useEffect(() => {
    initialLoadComplete.current = false;
    setName(game.name);
    setDeadline(game.deadline);
    setDesiredPartners(game.desiredPartners);
    setStoreUrlInput(game.storeUrl || '');
    setCoverUrl(game.manualMetadata?.coverUrl);
    setAsks(game.asks);
    setTags(game.tags || []);
    setNotes(game.notes || '');
    setDoneState(game.done);
    setScheduledTimes(game.scheduledTimes || []);
  }, [game]);

  // useEffect for saving
  useEffect(() => {
    if (!initialLoadComplete.current) {
      // Check if all state variables have been initialized based on 'game' prop
      // This is a bit of a heuristic, but tries to wait until the first sync from 'game' is done.
      if (name === game.name && deadline === game.deadline && desiredPartners === game.desiredPartners &&
          storeUrlInput === (game.storeUrl || '') && coverUrl === game.manualMetadata?.coverUrl &&
          JSON.stringify(asks) === JSON.stringify(game.asks) && JSON.stringify(tags) === JSON.stringify(game.tags || []) &&
          notes === (game.notes || '') && JSON.stringify(doneState) === JSON.stringify(game.done) &&
          JSON.stringify(scheduledTimes) === JSON.stringify(game.scheduledTimes || [])) {
        initialLoadComplete.current = true;
      }
      return; // Don't save on initial load or during the state sync from game prop
    }

    const updatedManualMetadata = { ...(game.manualMetadata || {}), coverUrl };

    const updatedGame = {
      ...game,
      name,
      deadline,
      desiredPartners,
      storeUrl: storeUrlInput,
      manualMetadata: updatedManualMetadata,
      asks,
      tags,
      notes,
      done: doneState,
      scheduledTimes,
    };

    const newGames = [...store.games];
    newGames[gameIndex] = updatedGame;
    const newStore = { ...store, games: newGames };
    setStore(newStore); // Update local React state first
    saveStore(newStore); // Then persist to storage
  }, [name, deadline, desiredPartners, storeUrlInput, coverUrl, asks, tags, notes, doneState, scheduledTimes, game, gameIndex, store, setStore]);


  const askedIds = asks.map(a => a.partnerId);
  const now = new Date();
  const greyThreshold = store.settings.greyThresholdDays;

  const partnersForConsideration = store.partners
    .filter(p => !askedIds.includes(p.id))
    .filter(p => !deadline || !p.busyUntil || new Date(p.busyUntil) <= deadline);

  const availablePartners = sortPartners(partnersForConsideration, store.games, tags);

  const busyPartners = store.partners
    .filter(p => !askedIds.includes(p.id) && deadline && p.busyUntil && new Date(p.busyUntil) > deadline);

  const askPartner = (pid: string) => {
    const newAsk: AskRecord = { partnerId: pid, askedOn: new Date(), confirmed: false, response: '' };
    const updatedAsks = [...asks, newAsk];
    setAsks(updatedAsks);
    // No direct setStore here, will be handled by useAutosave or immediateSave via memoizedSave
  };

  const handleAskChange = (index: number, field: keyof AskRecord, value: any) => {
    const updatedAsks = asks.map((ask, i) => {
      if (i === index) {
        return { ...ask, [field]: value };
      }
      return ask;
    });
    setAsks(updatedAsks);
  };

  const deleteAsk = (index: number) => {
    const updatedAsks = asks.filter((_, i) => i !== index);
    setAsks(updatedAsks);
  };

  const labelBoostrapColumns = 3;
  const fieldBootstrapColumns = 12 - labelBoostrapColumns;

  const addTag = () => {
    if (newTagInput && !tags.includes(newTagInput)) {
      setTags([...tags, newTagInput]);
      setNewTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleMarkAsDone = () => {
    setDoneState({ date: new Date(), streamingNotes: '' });
  };

  const handleUnmarkAsDone = () => {
    setDoneState(undefined);
  };

  const addScheduledTime = () => {
    setScheduledTimes([...scheduledTimes, new Date()]);
  };

  const removeScheduledTime = (index: number) => {
    setScheduledTimes(scheduledTimes.filter((_, i) => i !== index));
  };

  const updateScheduledTime = (index: number, newDate: Date) => {
    const updatedTimes = [...scheduledTimes];
    updatedTimes[index] = newDate;
    setScheduledTimes(updatedTimes);
  };

  const getDiscordTimestamp = (date: Date) => {
    const unixTimestamp = Math.floor(date.getTime() / 1000);
    return `<t:${unixTimestamp}:F>`;
  };

  const imageUrlForDisplay: string = coverUrl || steamCoverPlaceholder || "https://placehold.co/428x200?text=No+Game+Image";

  return (
    <div>
      {game.trashed && (
        <div className="alert alert-warning mb-4">
          <h4>This game is in the Trash</h4>
          <p>You can restore it using the button below, or permanently delete it from Settings.</p>
          <button className="btn btn-success" onClick={() => {
            setStore({
              ...store,
              games: store.games.map(g => g.id === game.id ? { ...g, trashed: false } : g)
            });
          }}>Restore from Trash</button>
        </div>
      )}
      
      <img src={imageUrlForDisplay} alt="Game Cover" className="img-fluid mb-3" style={{ maxHeight: '200px' }}/>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <button className="btn btn-link" onClick={() => navigate(-1)}>Back</button>
        <div>
          {doneState ? (
            <button className="btn btn-warning me-2" onClick={handleUnmarkAsDone}>Unmark Done</button>
          ) : (
            <button className="btn btn-success me-2" onClick={handleMarkAsDone}>Mark as Done</button>
          )}
          {!game.trashed && (
            <button className="btn btn-outline-danger" onClick={() => {
              setStore({
                ...store,
                games: store.games.map(g => g.id === game.id ? { ...g, trashed: true } : g)
              });
              navigate('/games');
            }}>Move to Trash</button>
          )}
        </div>
      </div>
      <div className="row mb-3">
        <input className="form-control form-control-lg" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className="row mb-3">
        <label className={`col-sm-${labelBoostrapColumns} col-form-label`}>Deadline</label>
        <div className={`col-sm-${fieldBootstrapColumns}`}>
          <DatePicker
            selected={deadline}
            onChange={(d) => setDeadline(d || undefined)}
            isClearable
            className="form-control"
            dateFormat={getDatePickerFormat(store.settings.dateFormat)}
          />
        </div>
      </div>
      <div className="row mb-3">
        <label className={`col-sm-${labelBoostrapColumns} col-form-label`}>Desired # Partners</label>
        <div className={`col-sm-${fieldBootstrapColumns}`}>
          <input type="number" className="form-control" value={desiredPartners} onChange={e=>setDesiredPartners(+e.target.value)} />
        </div>
      </div>
      <div className="row mb-3">
        <label className={`col-sm-${labelBoostrapColumns} col-form-label`}>Store Page URL</label>
        <div className={`col-sm-${fieldBootstrapColumns}`}>
          <input className="form-control" value={storeUrlInput} onChange={e => setStoreUrlInput(e.target.value)} />
        </div>
      </div>
      <div className="row mb-3">
        <label className={`col-sm-${labelBoostrapColumns} col-form-label`}>Cover URL</label>
        <div className={`col-sm-${fieldBootstrapColumns}`}>
          <input
            className="form-control"
            value={coverUrl || ''}
            onChange={e => setCoverUrl(e.target.value)}
            placeholder={steamCoverPlaceholder || ''}
          />
        </div>
      </div>

      <MarkdownNotesField
        value={notes}
        onChange={setNotes}
        label="Notes"
        placeholder="Enter notes here..."
      />

      <div className="row mb-3">
        <label className={`col-sm-${labelBoostrapColumns} col-form-label`}>Tags</label>
        <div className={`col-sm-${fieldBootstrapColumns}`}>
          <div>
            {tags.map(tag => (
              <span key={tag} className="badge bg-secondary me-1">
                {tag}
                <button type="button" className="btn-close btn-close-white ms-1" aria-label="Remove tag" onClick={() => removeTag(tag)}></button>
              </span>
            ))}
          </div>
          <div className="input-group mt-2">
            <input
              type="text"
              className="form-control"
              value={newTagInput}
              onChange={e => setNewTagInput(e.target.value)}
              onKeyPress={e => { if (e.key === 'Enter') { addTag(); e.preventDefault(); } }}
              placeholder="Add new tag"
              list="all-tags-datalist"
            />
            <datalist id="all-tags-datalist">
              {allStoreTags.map(tag => (
                <option key={tag} value={tag} />
              ))}
            </datalist>
            <button className="btn btn-outline-secondary" type="button" onClick={addTag}>Add</button>
          </div>
        </div>
      </div>

      <div className="row mb-3">
        <label className={`col-sm-${labelBoostrapColumns} col-form-label`}>Scheduled Times</label>
        <div className={`col-sm-${fieldBootstrapColumns}`}>
          <div className="mb-2">
            <button className="btn btn-outline-primary btn-sm" onClick={addScheduledTime}>+ Add Scheduled Time</button>
          </div>
          {scheduledTimes.length === 0 ? (
            <p className="text-muted">No scheduled times added yet.</p>
          ) : (
            <div>
              {scheduledTimes.map((time, index) => (
                <div key={index} className="d-flex align-items-center mb-2">
                  <button 
                    className="btn btn-outline-danger btn-sm" 
                    onClick={() => removeScheduledTime(index)}
                    title="Remove scheduled time"
                  >
                    ×
                  </button>
                  &nbsp;
                  <div style={{ width: 'auto' }}>
                    <DatePicker
                      selected={time}
                      onChange={(date) => updateScheduledTime(index, date || new Date())}
                      showTimeSelect
                      timeFormat="HH:mm"
                      timeIntervals={1}
                      dateFormat="MMMM d, yyyy h:mm aa"
                      className="form-control me-2"
                    />
                  </div>
                  &nbsp;
                  <code className="me-2" style={{ fontSize: '0.9em' }}>
                    {getDiscordTimestamp(time)}
                  </code>
                  {deadline && time > deadline && (
                    <span title="Scheduled time is after deadline" style={{ fontSize: '1.2em' }}>⚠️</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {doneState && doneState.date ? (
        <div>
          <h3>Streamed with ({formatDate(new Date(doneState.date), store.settings.dateFormat)})</h3>
          <ul className="list-group mb-3">
            {asks.filter(a => a.confirmed).map(a => {
              const partner = store.partners.find(p => p.id === a.partnerId);
              return (
                <li key={a.partnerId} className="list-group-item">
                  {partner ? <Link to={`/partners/${partner.id}`}>{partner.name}</Link> : 'Unknown Partner'}
                </li>
              );
            })}
          </ul>
          <MarkdownNotesField
            value={doneState.streamingNotes}
            onChange={(value) => setDoneState({ ...doneState, streamingNotes: value })}
            label="Streaming Notes"
            placeholder="Enter stream notes here (markdown)..."
          />
        </div>
      ) : (
        <>
          <h3>Asked</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Partner</th>
                <th>Asked on</th>
                <th>Response</th>
                <th>Confirmed</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
            {asks.sort((a,b) => new Date(a.askedOn).getTime() - new Date(b.askedOn).getTime()).map((a, index) => {
              const partner = store.partners.find(p=>p.id===a.partnerId);
              // Ensure askedOn is a Date object for DatePicker
              const askedOnDate = typeof a.askedOn === 'string' ? new Date(a.askedOn) : a.askedOn;
              const grey = !a.confirmed && ((now.getTime() - askedOnDate.getTime())/(1000*60*60*24) > greyThreshold);

              const tagFeedback = partner && tags.length > 0 ? (
                <>
                  {tags.map(tag => {
                    if (partner.lovesTags?.includes(tag)) {
                      return <span key={`${partner.id}-loves-${tag}`} title={`Loves: ${tag}`}>❤️</span>;
                    }
                    if (partner.hatesTags?.includes(tag)) {
                      return <span key={`${partner.id}-hates-${tag}`} title={`Hates: ${tag}`}>🗑️</span>;
                    }
                    return null;
                  })}
                </>
              ) : null;

              return (
                <tr key={a.partnerId + index} className={`${grey?'table-danger':''}`}>
                  <th scope="row">
                    {partner ? <Link to={`/partners/${partner.id}`}>{partner.name}</Link> : 'Unknown Partner'}
                    {tagFeedback && <span className="ms-2">{tagFeedback}</span>}
                  </th>
                  <td>
                    <DatePicker
                      selected={askedOnDate}
                      onChange={(date) => handleAskChange(index, 'askedOn', date || new Date())}
                      className="form-control form-control-sm d-inline-block"
                      dateFormat={getDatePickerFormat(store.settings.dateFormat)}
                    />
                    {askedOnDate instanceof Date && !isNaN(askedOnDate.getTime()) ? (
                      <small className="ms-2 text-muted">
                        {formatDistanceToNow(askedOnDate, { addSuffix: true })}
                      </small>
                    ) : null}
                    </td>
                    <td>
                    <input
                      type="text"
                      className="form-control form-control-sm d-inline-block"
                      style={{ width: 'auto', minWidth: '200px' }}
                      value={a.response || ''}
                      onChange={(e) => handleAskChange(index, 'response', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id={`confirmed-${index}`}
                      checked={a.confirmed}
                      onChange={(e) => handleAskChange(index, 'confirmed', e.target.checked)}
                    />
                  </td>
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={() => { deleteAsk(index); }}>Delete</button>
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>

          <h3>Available</h3>
          <ul className="list-group mb-3">
            {availablePartners.map(p => {
              const tagFeedback = tags.length > 0 ? (
                <>
                  {tags.map(tag => {
                    if (p.lovesTags?.includes(tag)) {
                      return <span key={`${p.id}-loves-${tag}`} title={`Loves: ${tag}`}>❤️</span>;
                    }
                    if (p.hatesTags?.includes(tag)) {
                      return <span key={`${p.id}-hates-${tag}`} title={`Hates: ${tag}`}>👎🏻</span>;
                    }
                    return null;
                  })}
                </>
              ) : null;

              return (
              <li key={p.id} className="list-group-item d-flex justify-content-between">
                <div>
                  <Link to={`/partners/${p.id}`}>{p.name}</Link>
                  {p.busyUntil && new Date(p.busyUntil) > new Date() && (
                    <span className="ms-1 text-muted">
                      (busy until {formatDate(p.busyUntil, store.settings.dateFormat)})
                    </span>
                  )}
                  {tagFeedback && <span className="ms-2">{tagFeedback}</span>}
                </div>
                <div>
                {(() => {
                  const { plannedStreams, pendingAsks } = getPartnerGameStates(p, store.games, game.id);

                  const formatGameLinks = (games: { id: string, name: string }[]) => {
                    return games.map((g, index) => (
                      <React.Fragment key={g.id}>
                        <Link to={`/games/${g.id}`}>{g.name}</Link>
                        {index < games.length - 1 ? ', ' : ''}
                      </React.Fragment>
                    ));
                  };

                  if (plannedStreams.length > 0 || pendingAsks.length > 0) {
                    const confirmedLinks = plannedStreams.length > 0 ?
                      <>streaming [{formatGameLinks(plannedStreams.map(g => ({ id: g.id, name: g.name })))}]</> : null;
                    const unconfirmedLinks = pendingAsks.length > 0 ?
                      <>waiting for response for [{formatGameLinks(pendingAsks.map(g => ({ id: g.id, name: g.name })))}]</> : null;

                    return (
                      <small className="ms-2 text-muted d-block">
                        (Already {confirmedLinks}
                        {confirmedLinks && unconfirmedLinks ? ", " : ""}
                        {unconfirmedLinks})
                      </small>
                    );
                  }
                  return null;
                })()}
                </div>
                <button className="btn btn-sm btn-outline-primary ms-2" onClick={()=>askPartner(p.id)}>Ask</button>
              </li>
              );
            })}
          </ul>

          <h3>Busy</h3>
          <ul className="list-group">
            {busyPartners.map(p => (
              <li key={p.id} className="list-group-item text-muted">
                <Link to={`/partners/${p.id}`} className="text-muted">{p.name}</Link> (busy until {p.busyUntil ? formatDate(p.busyUntil, store.settings.dateFormat) : ''})
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};
export default GameDetailView;