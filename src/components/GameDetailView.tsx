import React, { useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import { useAutosave } from '../hooks/useAutosave';
import 'react-datepicker/dist/react-datepicker.css';
import { formatDistanceToNow } from 'date-fns';
import { Store, AskRecord, Partner, DateFormatOption } from '../types';
import { formatDate, getDatePickerFormat } from '../helpers/dateFormatter';

interface GameDetailProps { store: Store; setStore: React.Dispatch<React.SetStateAction<Store | null>>; }
const GameDetailView: React.FC<GameDetailProps> = ({ store, setStore }) => {
  const { id } = useParams(); const navigate = useNavigate();
  const gameIndex = store.games.findIndex(g => g.id === id);
  if (gameIndex < 0) return <div>Not found</div>;
  const game = store.games[gameIndex];
  const [name, setName] = useState(game.name);
  const [deadline, setDeadline] = useState<Date | undefined>(game.deadline);
  const [desiredPartners, setDesiredPartners] = useState(game.desiredPartners);
  // steamIdInput stores the raw value from the text field (can be URL or ID)
  const [steamIdInput, setSteamIdInput] = useState(game.steamId || ''); // Initialize with game.steamId if it's just an ID, or let user paste URL
  const [coverUrl, setCoverUrl] = useState(game.manualMetadata?.coverUrl);
  const [tags, setTags] = useState<string[]>(game.tags || []);
  const [newTagInput, setNewTagInput] = useState('');

  // This function extracts the ID from a URL or validates if it's an ID
  const parseSteamIdInput = (input: string): string | undefined => {
    if (!input) return undefined;
    const match = input.match(/store.steampowered.com\/app\/(\d+)/);
    if (match && match[1]) {
      return match[1];
    }
    // Check if it's a simple ID
    if (/^\d+$/.test(input)) {
      return input;
    }
    return undefined;
  };

  // This effect handles the auto-population of fields when a valid Steam ID is extracted
  React.useEffect(() => {
    const extractedId = parseSteamIdInput(steamIdInput);

    if (extractedId) {
      // Auto-populate coverUrl if it's currently empty or hasn't been set
      // And the game's stored coverUrl is also empty
      if (!coverUrl && !game.manualMetadata?.coverUrl) {
        setCoverUrl(`https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${extractedId}/header.jpg`);
      }
    } else {
      // If steamIdInput is cleared or invalid, clear auto-filled coverUrl only if it was not manually set
      if (!game.manualMetadata?.coverUrl) setCoverUrl(undefined);
    }
  }, [steamIdInput, game.manualMetadata?.coverUrl]);

  // Local state for game asks, to allow editing
  const [asks, setAsks] = useState<AskRecord[]>(game.asks);

  // This is the primary useEffect for syncing component state with the game prop
  const firstRenderTagsRef = React.useRef(true); // Ref to track initial tags load

  React.useEffect(() => {
    setName(game.name);
    setDeadline(game.deadline);
    setDesiredPartners(game.desiredPartners);
    setSteamIdInput(game.steamId || '');
    setCoverUrl(game.manualMetadata?.coverUrl);
    setAsks(game.asks); // Ensure asks are also reset/updated if game prop changes

    // When game prop changes, update tags and mark it as an "initial load" for tags
    setTags(game.tags || []);
    firstRenderTagsRef.current = true;
  }, [game]);

  // memoizedSave now includes asks
  const memoizedSave = useCallback(() => {
    const finalSteamId = parseSteamIdInput(steamIdInput);
    const { officialName, ...otherMetadata } = game.manualMetadata || {};
    const updatedManualMetadata = { ...otherMetadata, coverUrl };

    const updatedGame = {
      ...game,
      name,
      deadline,
      desiredPartners,
      steamId: finalSteamId,
      manualMetadata: updatedManualMetadata,
      asks, // Include the updated asks from local state
      tags,
    };
    const newGames = [...store.games];
    newGames[gameIndex] = updatedGame;
    setStore({ ...store, games: newGames });
  }, [store, setStore, game, gameIndex, name, deadline, desiredPartners, steamIdInput, coverUrl, asks, tags]); // Added asks and tags to dependencies

  // immediateSave now includes asks in dependencies for useAutosave
  const immediateSave = useAutosave(memoizedSave, [name, deadline, desiredPartners, steamIdInput, coverUrl, asks, tags]); // Added asks and tags to dependencies

  // Effect to save tags when they are modified by the user
  React.useEffect(() => {
    if (firstRenderTagsRef.current) {
      firstRenderTagsRef.current = false; // Mark initial load as complete
      return; // Don't save on initial load/sync
    }
    // Only save if it's not the initial load
    immediateSave();
  }, [tags, immediateSave]); // immediateSave is included as it's a dependency from useAutosave


  const askedIds = asks.map(a => a.partnerId);
  // const asked = asks.sort((a, b) => new Date(a.askedOn).getTime() - new Date(b.askedOn).getTime());
  // Sorting directly in the map function to ensure stable keys if dates are equal or invalid
  const now = new Date();
  const greyThreshold = store.settings.greyThresholdDays;

  const availablePartners = store.partners
    .filter(p => !askedIds.includes(p.id))
    .filter(p => !deadline || !p.busyUntil || p.busyUntil <= deadline)
    .sort((a, b) => {
      const calculateScore = (partner: Partner) => {
        if (!tags || tags.length === 0) return 0;
        let score = 0;
        tags.forEach(tag => {
          if (partner.lovesTags?.includes(tag)) score++;
          if (partner.hatesTags?.includes(tag)) score--;
        });
        return score;
      };

      const scoreA = calculateScore(a);
      const scoreB = calculateScore(b);

      if (scoreA !== scoreB) {
        return scoreB - scoreA; // Sort by score descending
      }
      return (a.lastStreamedWith?.getTime() ?? 0) - (b.lastStreamedWith?.getTime() ?? 0); // Then by last streamed ascending
    });

  const busyPartners = store.partners
    .filter(p => !askedIds.includes(p.id) && deadline && p.busyUntil && p.busyUntil > deadline);

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
    // Consider if immediateSave should be called here or rely on useAutosave
    // For deletion, immediate save is probably better.
    // This will be handled by adding `asks` to useAutosave dependencies and calling immediateSave from the button.
  };

  const labelBoostrapColumns = 3;
  const fieldBootstrapColumns = 12 - labelBoostrapColumns;

  const addTag = () => {
    if (newTagInput && !tags.includes(newTagInput)) {
      setTags([...tags, newTagInput]);
      setNewTagInput('');
      // immediateSave(); // Removed: useAutosave will trigger due to 'tags' dependency change
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
    // immediateSave(); // Removed: useAutosave will trigger due to 'tags' dependency change
  };

  return (
    <div>
      {coverUrl && <img src={coverUrl} alt="Game Cover" className="img-fluid mb-3" style={{ maxHeight: '200px' }} />}
      <button className="btn btn-link" onClick={() => navigate(-1)}>Back</button>
      <div className="row mb-3">
        <input className="form-control form-control-lg" placeholder="Name" value={name} onChange={e => setName(e.target.value)} onBlur={immediateSave} />
      </div>
      <div className="row mb-3">
        <label className={`col-sm-${labelBoostrapColumns} col-form-label`}>Deadline</label>
        <div className={`col-sm-${fieldBootstrapColumns}`}>
          <DatePicker
            selected={deadline}
            onChange={(d) => setDeadline(d || undefined)}
            onBlur={immediateSave}
            isClearable
            className="form-control"
            dateFormat={getDatePickerFormat(store.settings.dateFormat)}
          />
        </div>
      </div>
      <div className="row mb-3">
        <label className={`col-sm-${labelBoostrapColumns} col-form-label`}>Desired # Partners</label>
        <div className={`col-sm-${fieldBootstrapColumns}`}>
          <input type="number" className="form-control" value={desiredPartners} onChange={e=>setDesiredPartners(+e.target.value)} onBlur={immediateSave} />
        </div>
      </div>
      <div className="row mb-3">
        <label className={`col-sm-${labelBoostrapColumns} col-form-label`}>Steam ID or Store Page URL</label>
        <div className={`col-sm-${fieldBootstrapColumns}`}>
          <input className="form-control" value={steamIdInput} onChange={e => setSteamIdInput(e.target.value)} onBlur={immediateSave} />
        </div>
      </div>
      <div className="row mb-3">
        <label className={`col-sm-${labelBoostrapColumns} col-form-label`}>Cover URL</label>
        <div className={`col-sm-${fieldBootstrapColumns}`}>
          <input className="form-control" value={coverUrl || ''} onChange={e => setCoverUrl(e.target.value)} onBlur={immediateSave} />
        </div>
      </div>

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
            />
            <button className="btn btn-outline-secondary" type="button" onClick={addTag}>Add</button>
          </div>
        </div>
      </div>

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
                  onBlur={immediateSave}
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
                  onBlur={immediateSave}
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  className="form-check-input"
                  id={`confirmed-${index}`}
                  checked={a.confirmed}
                  onChange={(e) => handleAskChange(index, 'confirmed', e.target.checked)}
                  onBlur={immediateSave}
                />
              </td>
              <td>
                <button className="btn btn-sm btn-danger" onClick={() => { deleteAsk(index); immediateSave(); }}>Delete</button>
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
                  return <span key={`${p.id}-hates-${tag}`} title={`Hates: ${tag}`}>🗑️</span>;
                }
                return null;
              })}
            </>
          ) : null;

          return (
          <li key={p.id} className="list-group-item d-flex justify-content-between">
            <div>
              <Link to={`/partners/${p.id}`}>{p.name}</Link>
              {tagFeedback && <span className="ms-2">{tagFeedback}</span>}
            </div>
            <div>
            {(() => {
              const today = new Date();
              const openAsksForPartner = store.games.reduce((acc: string[], currentGame) => {
                if (currentGame.id === game.id) {
                  return acc; // Don't check current game
                }
                if (currentGame.deadline && new Date(currentGame.deadline) <= today) {
                  return acc;
                }
                if (currentGame.desiredPartners <= currentGame.asks.filter(a => a.confirmed).length) {
                  return acc;
                }

                const askRecord = currentGame.asks.find(ask =>
                  ask.partnerId === p?.id &&
                  (!ask.response || ask.response.trim() === '') &&
                  !ask.confirmed
                );

                if (askRecord) {
                  acc.push(currentGame.name);
                }
                return acc;
              }, []);

              if (openAsksForPartner.length > 0) {
                return (
                  <small className="ms-2 text-muted d-block">
                    (Already waiting for response for {openAsksForPartner.join(', ')})
                  </small>
                );
              }
              return null;
            })()}
            <button className="btn btn-sm btn-outline-primary ms-2" onClick={()=>askPartner(p.id)}>Ask</button>
            </div>
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
    </div>
  );
};
export default GameDetailView;