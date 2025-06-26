// src/components/GamesListView.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Game, Store, DateFormatOption } from '../types';
import { formatDate } from '../helpers/dateFormatter';
import { formatDistanceToNow } from 'date-fns';
import { getSteamAppIdFromUrl, getSteamCoverUrl } from '../helpers/storeUtils';

interface GamesListProps {
  store: Store;
  setStore: React.Dispatch<React.SetStateAction<Store | null>>;
}

const GamesListView: React.FC<GamesListProps> = ({ store, setStore }) => {
  const navigate = useNavigate();

  // Filter out done games first
  const notDoneGames = store.games.filter(g => !g.done);
  const doneGames = store.games.filter(g => g.done);

  // Sort done games by done date, most recent first
  doneGames.sort((a, b) => (b.done?.date.getTime() ?? 0) - (a.done?.date.getTime() ?? 0));

  // Split and sort not-done games
  const met = notDoneGames.filter(g => g.asks.filter(a => a.confirmed).length >= g.desiredPartners);
  const unmet = notDoneGames.filter(g => g.asks.filter(a => a.confirmed).length < g.desiredPartners);
  const sortByDeadline = (a: Game, b: Game) => {
    const t1 = a.deadline?.getTime() ?? Infinity;
    const t2 = b.deadline?.getTime() ?? Infinity;
    return t1 - t2;
  };

  const addGame = () => {
    const newGame: Game = {
      id: uuidv4(),
      name: 'New Game',
      deadline: undefined,
      storeUrl: undefined,
      manualMetadata: {},
      desiredPartners: 1,
      asks: [],
      tags: []
    };
    setStore({
      ...store,
      games: [...store.games, newGame]
    });
    navigate(`/games/${newGame.id}`);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Need more collabs partners</h2>
        <button className="btn btn-sm btn-primary" onClick={addGame}>+ Add Game</button>
      </div>

      <ul className="list-group mb-4">
        {unmet.sort(sortByDeadline).map(g => (
          <li key={g.id} className="list-group-item d-flex justify-content-between align-items-center">
            <div>
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
              <Link to={`/games/${g.id}`} style={{ verticalAlign: 'middle' }}>{g.name}</Link>
            </div>
            <small>{g.deadline ? `${formatDate(g.deadline, store.settings.dateFormat)} (${formatDistanceToNow(g.deadline, { addSuffix: true })})` : 'No deadline'} | {g.asks.filter(a=>a.confirmed).length}/{g.desiredPartners}</small>
          </li>
        ))}
      </ul>

      <h2>Collabs planned</h2>
      <ul className="list-group">
        {met.sort(sortByDeadline).map(g => (
          <li key={g.id} className="list-group-item d-flex justify-content-between align-items-center">
            <div>
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
              <Link to={`/games/${g.id}`} style={{ verticalAlign: 'middle' }}>{g.name}</Link>
            </div>
            <small>{g.deadline ? `${formatDate(g.deadline, store.settings.dateFormat)} (${formatDistanceToNow(g.deadline, { addSuffix: true })})` : 'No deadline'} | {g.asks.filter(a=>a.confirmed).length}/{g.desiredPartners}</small>
          </li>
        ))}
      </ul>

      <h2>Done Games</h2>
      <ul className="list-group">
        {doneGames.map(g => {
          const confirmedPartners = g.asks
            .filter(ask => ask.confirmed)
            .map(ask => store.partners.find(p => p.id === ask.partnerId)?.name)
            .filter(name => name !== undefined);

          return (
            <li key={g.id} className="list-group-item">
              <div className="d-flex justify-content-between align-items-center">
                <div>
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
                  <Link to={`/games/${g.id}`} style={{ verticalAlign: 'middle' }}>{g.name}</Link>
                </div>
                <small>{g.done ? `Done on: ${formatDate(g.done.date, store.settings.dateFormat)}` : 'Not done'}</small>
              </div>
              {confirmedPartners.length > 0 && (
                <div style={{ marginLeft: '60px', fontSize: '0.9em', color: 'grey' }}>
                  Confirmed Partners: {confirmedPartners.join(', ')}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default GamesListView;
