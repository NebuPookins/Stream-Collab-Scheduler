import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Game, Store } from '../types';
import { formatDate } from '../helpers/dateFormatter';
import { formatDistanceToNow } from 'date-fns';
import { getSteamAppIdFromUrl, getSteamCoverUrl } from '../helpers/storeUtils';
import { formatScheduledTimes, getEffectiveDeadline } from '../helpers/dateFormatter';
import { sortUnmetGames } from '../helpers/gameSorters';

interface GamesListProps {
  store: Store;
  setStore: React.Dispatch<React.SetStateAction<Store | null>>;
}

const GamesListView: React.FC<GamesListProps> = ({ store, setStore }) => {
  const navigate = useNavigate();

  const [filterText, setFilterText] = React.useState('');

  // Filter out trashed and done games first, and by filterText
  const filterByName = (g: Game) => g.name.toLowerCase().includes(filterText.toLowerCase());
  const notDoneGames = store.games.filter(g => !g.done && !g.trashed && filterByName(g));
  const doneGames = store.games.filter(g => g.done && !g.trashed && filterByName(g));

  // Sort done games by done date, most recent first
  doneGames.sort((a, b) => (b.done?.date.getTime() ?? 0) - (a.done?.date.getTime() ?? 0));

  // Split and sort not-done games
  const met = notDoneGames.filter(g => g.asks.filter(a => a.confirmed).length >= g.desiredPartners);
  const unmet = notDoneGames.filter(g => g.asks.filter(a => a.confirmed).length < g.desiredPartners);
  
  const sortedUnmetGames = sortUnmetGames(unmet);

  const addGame = () => {
    const newGame: Game = {
      id: uuidv4(),
      name: 'New Game',
      deadline: undefined,
      storeUrl: undefined,
      manualMetadata: {},
      desiredPartners: 1,
      asks: [],
      tags: [],
      trashed: false, // Default to not trashed
      scheduledTimes: [] // Default to empty array
    };
    setStore({
      ...store,
      games: [...store.games, newGame]
    });
    navigate(`/games/${newGame.id}`);
  };

  const sortByEffectiveDeadline = (a: Game, b: Game) => {
    const t1 = getEffectiveDeadline(a)?.getTime() ?? Infinity;
    const t2 = getEffectiveDeadline(b)?.getTime() ?? Infinity;
    return t1 - t2;
  };

  return (
    <div>
      <div className="mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Filter games by name..."
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
        />
      </div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Need more collabs partners</h2>
        <button className="btn btn-sm btn-primary" onClick={addGame}>+ Add Game</button>
      </div>

      <table className="table table-striped table-hover mb-4">
        <thead>
          <tr>
            <th scope="col">Game</th>
            <th scope="col">Deadline</th>
            <th scope="col">Scheduled Date</th>
            <th scope="col">Confirmed</th>
            <th scope="col">Pending Asks</th>
          </tr>
        </thead>
        <tbody>
          {sortedUnmetGames.map(g => (
            <tr key={g.id}>
              <th scope="row">
                <Link to={`/games/${g.id}`}>
                  {(() => {
                    let imageUrl = g.manualMetadata?.coverUrl;
                    if (!imageUrl && g.storeUrl) {
                      const steamAppId = getSteamAppIdFromUrl(g.storeUrl);
                      imageUrl = getSteamCoverUrl(steamAppId);
                      // If not a steam URL or no app ID, imageUrl will be undefined, so no image will be shown unless manually provided.
                    }
                    return imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={g.name}
                        style={{ width: '50px', height: 'auto', marginRight: '10px', verticalAlign: 'middle' }}
                      />
                    ) : null;
                  })()}
                  {g.name}
                </Link>
              </th>
              <td>
                {g.deadline ? `${formatDate(g.deadline, store.settings.dateFormat)} (${formatDistanceToNow(g.deadline, { addSuffix: true })})` : 'No deadline'}
              </td>
              <td>
                {formatScheduledTimes(g.scheduledTimes, store.settings.dateFormat)}
              </td>
              <td>
                {g.asks.filter(a => a.confirmed).length}/{g.desiredPartners}
              </td>
              <td>
                {(() => {
                  const recentAsks = g.asks.filter(a => {
                    const today = new Date();
                    const askedDate = new Date(a.askedOn);
                    const diffTime = Math.abs(today.getTime() - askedDate.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return !a.confirmed && diffDays <= store.settings.greyThresholdDays && (!a.response || a.response.trim() === '');
                  }).length;
                  return recentAsks.toString();
                })()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Collabs Partners Ready</h2>
      <table className="table table-striped table-hover mb-4">
        <thead>
          <tr>
            <th scope="col">Game</th>
            <th scope="col">Deadline</th>
            <th scope="col">Scheduled Date</th>
            <th scope="col">Partners</th>
          </tr>
        </thead>
        <tbody>
        {met.sort(sortByEffectiveDeadline).map(g => (
          <tr key={g.id}>
            <th scope="row">
              <Link to={`/games/${g.id}`} style={{ verticalAlign: 'middle' }}>
              {(() => {
                let imageUrl = g.manualMetadata?.coverUrl;
                if (!imageUrl && g.storeUrl) {
                  const steamAppId = getSteamAppIdFromUrl(g.storeUrl);
                  imageUrl = getSteamCoverUrl(steamAppId);
                  // If not a steam URL or no app ID, imageUrl will be undefined, so no image will be shown unless manually provided.
                }
                return imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={g.name}
                    style={{ width: '50px', height: 'auto', marginRight: '10px', verticalAlign: 'middle' }}
                  />
                ) : null;
              })()}
              {g.name}
              </Link>
            </th>
            <td>{g.deadline ? `${formatDate(g.deadline, store.settings.dateFormat)} (${formatDistanceToNow(g.deadline, { addSuffix: true })})` : 'No deadline'}</td>
            <td>
              {formatScheduledTimes(g.scheduledTimes, store.settings.dateFormat)}
            </td>
            <td>
              {g.asks
                .filter(ask => ask.confirmed)
                .map((ask, index, arr) => {
                  const partner = store.partners.find(p => p.id === ask.partnerId);
                  return partner ? (
                    <React.Fragment key={partner.id}>
                      <Link to={`/partners/${partner.id}`}>{partner.name}</Link>
                      {index < arr.length - 1 ? ', ' : ''}
                    </React.Fragment>
                  ) : null;
                })}&nbsp;/&nbsp;{g.desiredPartners}
            </td>
          </tr>
        ))}
        </tbody>
      </table>

      <h2>Collabs Done</h2>
      <table className="table table-striped table-hover mb-4">
        <thead>
          <tr>
            <th scope="col">Game</th>
            <th scope="col">Date Streamed</th>
            <th scope="col">Partners</th>
          </tr>
        </thead>
        <tbody>
        {doneGames.map(g => {
          const confirmedPartners = g.asks
            .filter(ask => ask.confirmed)
            .map(ask => store.partners.find(p => p.id === ask.partnerId)?.name)
            .filter(name => name !== undefined);

          return (
            <tr key={g.id}>
              <th scope="row">
                <Link to={`/games/${g.id}`}>
                  {(() => {
                    let imageUrl = g.manualMetadata?.coverUrl;
                    if (!imageUrl && g.storeUrl) {
                      const steamAppId = getSteamAppIdFromUrl(g.storeUrl);
                      imageUrl = getSteamCoverUrl(steamAppId);
                    }
                    return imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={g.name}
                        style={{ width: '50px', height: 'auto', marginRight: '10px', verticalAlign: 'middle' }}
                      />
                    ) : null;
                  })()}
                  {g.name}
                  </Link>
                </th>
                <td>
                  {g.done ? formatDate(g.done.date, store.settings.dateFormat) : 'Not done'}
                </td>
              <td>
                {g.asks
                  .filter(ask => ask.confirmed)
                  .map((ask, index, arr) => {
                    const partner = store.partners.find(p => p.id === ask.partnerId);
                    return partner ? (
                      <React.Fragment key={partner.id}>
                        <Link to={`/partners/${partner.id}`}>{partner.name}</Link>
                        {index < arr.length - 1 ? ', ' : ''}
                      </React.Fragment>
                    ) : null;
                  })}
              </td>
            </tr>
          );
        })}
      </tbody>
      </table>
    </div>
  );
};

export default GamesListView;
