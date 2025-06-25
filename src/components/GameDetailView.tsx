import React, { useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { formatDistanceToNow } from 'date-fns';
import { Store, AskRecord, Partner, DateFormatOption } from '../types';
import { saveStore } from '../../storage';
import { formatDate, getDatePickerFormat } from '../helpers/dateFormatter';
import { getAllUniqueTags } from '../helpers/tagUtils';
import { sortPartners } from '../helpers/partnerSorters';
import { getSteamAppIdFromUrl, getSteamCoverUrl } from '../helpers/storeUtils';

interface GameDetailProps { store: Store; setStore: React.Dispatch<React.SetStateAction<Store | null>>; }
const GameDetailView: React.FC<GameDetailProps> = ({ store, setStore }) => {
  const { id } = useParams(); const navigate = useNavigate();
  const gameIndex = store.games.findIndex(g => g.id === id);
  if (gameIndex < 0) return <div>Not found</div>;
  const game = store.games[gameIndex];
  const [name, setName] = useState(game.name);
  const [deadline, setDeadline] = useState<Date | undefined>(game.deadline);
  const [desiredPartners, setDesiredPartners] = useState(game.desiredPartners);
  // storeUrlInput stores the raw value from the text field
  const [storeUrlInput, setStoreUrlInput] = useState(game.storeUrl || ''); // Initialize with game.storeUrl
  const [coverUrl, setCoverUrl] = useState(game.manualMetadata?.coverUrl); // User's manual input
  const [steamCoverPlaceholder, setSteamCoverPlaceholder] = useState<string | undefined>(undefined); // For Steam-derived placeholder
  const [tags, setTags] = useState<string[]>(game.tags || []);
  const [newTagInput, setNewTagInput] = useState('');

  const allStoreTags = React.useMemo(() => getAllUniqueTags(store), [store]);

  // This effect handles the auto-population of the Steam cover placeholder when a valid Steam URL is entered
  React.useEffect(() => {
    const steamAppId = getSteamAppIdFromUrl(storeUrlInput);
    setSteamCoverPlaceholder(getSteamCoverUrl(steamAppId));
  }, [storeUrlInput]); // Dependency only on storeUrlInput

  // Local state for game asks, to allow editing
  const [asks, setAsks] = useState<AskRecord[]>(game.asks);

  // This is the primary useEffect for syncing component state with the game prop
  const firstRenderTagsRef = React.useRef(true); // Ref to track initial tags load

  React.useEffect(() => {
    setName(game.name);
    setDeadline(game.deadline);
    setDesiredPartners(game.desiredPartners);
    setStoreUrlInput(game.storeUrl || '');
    setCoverUrl(game.manualMetadata?.coverUrl);
    setAsks(game.asks); // Ensure asks are also reset/updated if game prop changes

    // When game prop changes, update tags and mark it as an "initial load" for tags
    setTags(game.tags || []);
    firstRenderTagsRef.current = true;
  }, [game]);

  // memoizedSave now includes asks
  const memoizedSave = useCallback(() => {
    // const finalSteamId = parseSteamIdInput(steamIdInput); // We don't parse anymore, just save the raw URL
    const updatedManualMetadata = { ...(game.manualMetadata || {}), coverUrl };
    // Remove officialName if it exists from old data, ensure coverUrl is updated
    delete updatedManualMetadata.officialName;


    const updatedGame = {
      ...game,
      name,
      deadline,
      desiredPartners,
      storeUrl: storeUrlInput, // Save the raw input as the store URL
      manualMetadata: updatedManualMetadata,
      asks, // Include the updated asks from local state
      tags,
    };
    const newGames = [...store.games];
    newGames[gameIndex] = updatedGame;
    const newStore = { ...store, games: newGames };
    setStore(newStore);
    saveStore(newStore); // Save immediately
  }, [store, setStore, game, gameIndex, name, deadline, desiredPartners, storeUrlInput, coverUrl, asks, tags]); // Added asks and tags to dependencies, updated steamIdInput to storeUrlInput

  // Effect to save tags when they are modified by the user
  // React.useEffect(() => {
  //   if (firstRenderTagsRef.current) {
  //     firstRenderTagsRef.current = false; // Mark initial load as complete
  //     return; // Don't save on initial load/sync
  //   }
  //   // Only save if it's not the initial load
  //   // immediateSave(); // This will now be handled by direct calls to memoizedSave where tags/asks change
  // }, [tags]); // Removed immediateSave from dependencies


  const askedIds = asks.map(a => a.partnerId);
  // const asked = asks.sort((a, b) => new Date(a.askedOn).getTime() - new Date(b.askedOn).getTime());
  // Sorting directly in the map function to ensure stable keys if dates are equal or invalid
  const now = new Date();
  const greyThreshold = store.settings.greyThresholdDays;

  const partnersForConsideration = store.partners
    .filter(p => !askedIds.includes(p.id))
    .filter(p => !deadline || !p.busyUntil || new Date(p.busyUntil) <= deadline);

  const availablePartners = sortPartners(partnersForConsideration, tags);

  const busyPartners = store.partners
    .filter(p => !askedIds.includes(p.id) && deadline && p.busyUntil && new Date(p.busyUntil) > deadline);

  const askPartner = (pid: string) => {
    const newAsk: AskRecord = { partnerId: pid, askedOn: new Date(), confirmed: false, response: '' };
    const updatedAsks = [...asks, newAsk];
    setAsks(updatedAsks);
    memoizedSave();
  };

  const handleAskChange = (index: number, field: keyof AskRecord, value: any) => {
    const updatedAsks = asks.map((ask, i) => {
      if (i === index) {
        return { ...ask, [field]: value };
      }
      return ask;
    });
    setAsks(updatedAsks);
    memoizedSave();
  };

  const deleteAsk = (index: number) => {
    const updatedAsks = asks.filter((_, i) => i !== index);
    setAsks(updatedAsks);
    memoizedSave();
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
      memoizedSave();
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
    memoizedSave();
  };

  const imageUrlForDisplay: string = coverUrl || steamCoverPlaceholder || "https://placehold.co/428x200?text=No+Game+Image";

  return (
    <div>
      <img src={imageUrlForDisplay} alt="Game Cover" className="img-fluid mb-3" style={{ maxHeight: '200px' }}/>
      <button className="btn btn-link" onClick={() => navigate(-1)}>Back</button>
      <div className="row mb-3">
        <input className="form-control form-control-lg" placeholder="Name" value={name} onChange={e => { setName(e.target.value); memoizedSave(); }} />
      </div>
      <div className="row mb-3">
        <label className={`col-sm-${labelBoostrapColumns} col-form-label`}>Deadline</label>
        <div className={`col-sm-${fieldBootstrapColumns}`}>
          <DatePicker
            selected={deadline}
            onChange={(d) => { setDeadline(d || undefined); memoizedSave(); }}
            isClearable
            className="form-control"
            dateFormat={getDatePickerFormat(store.settings.dateFormat)}
          />
        </div>
      </div>
      <div className="row mb-3">
        <label className={`col-sm-${labelBoostrapColumns} col-form-label`}>Desired # Partners</label>
        <div className={`col-sm-${fieldBootstrapColumns}`}>
          <input type="number" className="form-control" value={desiredPartners} onChange={e=> { setDesiredPartners(+e.target.value); memoizedSave(); }} />
        </div>
      </div>
      <div className="row mb-3">
        <label className={`col-sm-${labelBoostrapColumns} col-form-label`}>Store Page URL</label>
        <div className={`col-sm-${fieldBootstrapColumns}`}>
          <input className="form-control" value={storeUrlInput} onChange={e => { setStoreUrlInput(e.target.value); memoizedSave(); }} />
        </div>
      </div>
      <div className="row mb-3">
        <label className={`col-sm-${labelBoostrapColumns} col-form-label`}>Cover URL</label>
        <div className={`col-sm-${fieldBootstrapColumns}`}>
          <input
            className="form-control"
            value={coverUrl || ''}
            onChange={e => { setCoverUrl(e.target.value); memoizedSave(); }}
            placeholder={steamCoverPlaceholder || ''}
          />
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
                  // onBlur removed as onChange now saves
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
                  // onBlur removed as onChange now saves
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  className="form-check-input"
                  id={`confirmed-${index}`}
                  checked={a.confirmed}
                  onChange={(e) => handleAskChange(index, 'confirmed', e.target.checked)}
                  // onBlur removed as onChange now saves
                />
              </td>
              <td>
                <button className="btn btn-sm btn-danger" onClick={() => { deleteAsk(index); memoizedSave(); }}>Delete</button>
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
              const today = new Date();
              const openAsksForPartner = store.games.reduce((acc: {confirmed: string[], unconfirmed: string[]}, currentGame) => {
                if (currentGame.id === game.id) {
                  return acc; // Don't check current game
                }
                if (currentGame.deadline && new Date(currentGame.deadline) <= today) {
                  return acc;
                }
                const gameHasAllNeededConfirmations = currentGame.desiredPartners <= currentGame.asks.filter(a => a.confirmed).length;

                currentGame.asks.filter(ask =>
                  ask.partnerId === p?.id
                ).forEach(ask => {
                  if (ask.confirmed) {
                    acc.confirmed.push(currentGame.name);
                  } else if ((!gameHasAllNeededConfirmations) && ((!ask.response) || ask.response.trim() == "")) {
                    acc.unconfirmed.push(currentGame.name);
                  }
                });
                return acc;
              }, {confirmed: [], unconfirmed: []});
              if (openAsksForPartner.confirmed.length > 0 || openAsksForPartner.unconfirmed.length > 0) {
                return (
                  <small className="ms-2 text-muted d-block">
                    (Already {
                      [
                        openAsksForPartner.confirmed.length > 0 ?
                        `streaming [${openAsksForPartner.confirmed.join(', ')}]` : null,
                        openAsksForPartner.unconfirmed.length > 0 ?
                        `waiting for response for [${openAsksForPartner.unconfirmed.join(', ')}]` : null,
                      ].filter(it => it != null).join(", ")
                    })
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
    </div>
  );
};
export default GameDetailView;