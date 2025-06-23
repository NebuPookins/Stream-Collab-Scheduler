// src/components/GamesListView.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Game, Store, DateFormatOption } from '../types';
import { formatDate } from '../helpers/dateFormatter';

interface GamesListProps {
  store: Store;
  setStore: React.Dispatch<React.SetStateAction<Store | null>>;
}

const GamesListView: React.FC<GamesListProps> = ({ store, setStore }) => {
  const navigate = useNavigate();

  // split and sort as before
  const met = store.games.filter(g => g.asks.filter(a => a.confirmed).length >= g.desiredPartners);
  const unmet = store.games.filter(g => g.asks.filter(a => a.confirmed).length < g.desiredPartners);
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
      steamId: undefined,
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
        <h2>Unmet</h2>
        <button className="btn btn-sm btn-primary" onClick={addGame}>+ Add Game</button>
      </div>

      <ul className="list-group mb-4">
        {unmet.sort(sortByDeadline).map(g => (
          <li key={g.id} className="list-group-item d-flex justify-content-between align-items-center">
            <div>
              {g.manualMetadata?.coverUrl && (
                <img
                  src={g.manualMetadata.coverUrl}
                  alt={g.name}
                  style={{ width: '50px', height: 'auto', marginRight: '10px', verticalAlign: 'middle' }}
                />
              )}
              <Link to={`/games/${g.id}`} style={{ verticalAlign: 'middle' }}>{g.name}</Link>
            </div>
            <small>{g.deadline ? formatDate(g.deadline, store.settings.dateFormat) : 'No deadline'} | {g.asks.filter(a=>a.confirmed).length}/{g.desiredPartners}</small>
          </li>
        ))}
      </ul>

      <h2>Met</h2>
      <ul className="list-group">
        {met.sort(sortByDeadline).map(g => (
          <li key={g.id} className="list-group-item d-flex justify-content-between align-items-center">
            <div>
              {g.manualMetadata?.coverUrl && (
                <img
                  src={g.manualMetadata.coverUrl}
                  alt={g.name}
                  style={{ width: '50px', height: 'auto', marginRight: '10px', verticalAlign: 'middle' }}
                />
              )}
              <Link to={`/games/${g.id}`} style={{ verticalAlign: 'middle' }}>{g.name}</Link>
            </div>
            <small>{g.deadline ? formatDate(g.deadline, store.settings.dateFormat) : 'No deadline'} | {g.asks.filter(a=>a.confirmed).length}/{g.desiredPartners}</small>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default GamesListView;
