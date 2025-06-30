// src/components/PartnersListView.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Partner, Store, Game } from '../types'; // Added Game
import { formatDate } from '../helpers/dateFormatter';
import { sortPartners, calculateLastStreamed } from '../helpers/partnerSorters'; // Added calculateLastStreamed
import { getOpenAsksForPartner } from '../helpers/storeUtils'; // Added import

interface PartnersListProps {
  store: Store;
  setStore: React.Dispatch<React.SetStateAction<Store | null>>;
}

const PartnersListView: React.FC<PartnersListProps> = ({ store, setStore }) => {
  const navigate = useNavigate();

  // Sort partners using the new helper function.
  // No game-specific tags here, so gameTags argument is undefined.
  const sortedPartners = sortPartners(store.partners, store.games); // Pass store.games

  const addPartner = () => {
    const newPartner: Partner = {
      id: uuidv4(),
      name: 'New Partner',
      lastStreamedWith: undefined,
      schedule: '',
      busyUntil: undefined,
      genrePreferences: []
    };
    setStore({
      ...store,
      partners: [...store.partners, newPartner]
    });
    navigate(`/partners/${newPartner.id}`);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Partners</h2>
        <button className="btn btn-sm btn-primary" onClick={addPartner}>+ Add Partner</button>
      </div>

      <table className="table table-striped table-hover mb-4">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Busy Until</th>
            <th scope="col">Last Streamed</th>
            <th scope="col">Open Asks</th> {/* Added Open Asks header */}
          </tr>
        </thead>
        <tbody>
        {sortedPartners.map(p => {
          const openAsks = getOpenAsksForPartner(p, store.games); // Get open asks
          return (
            <tr key={p.id}>
              <th scope="row">
                <Link to={`/partners/${p.id}`}>{p.name}</Link>
              </th>
              <td>
                {
                (p.busyUntil && new Date(p.busyUntil) > new Date()) ? (
                  <span>
                    {formatDate(p.busyUntil, store.settings.dateFormat)}
                  </span>
                ):(
                  <span>
                    Available
                  </span>
                )
                }
              </td>
              <td>
                {
                  (() => {
                    const lastStreamedDate = calculateLastStreamed(p, store.games);
                    return lastStreamedDate ? formatDate(lastStreamedDate, store.settings.dateFormat) : 'Never';
                  })()
                }
              </td>
              <td> {/* Added Open Asks column data */}
                {openAsks.length > 0 ? (
                  openAsks.map((game: Game, index: number) => (
                    <React.Fragment key={game.id}>
                      <Link to={`/games/${game.id}`}>{game.name}</Link>
                      {index < openAsks.length - 1 && ', '}
                    </React.Fragment>
                  ))
                ) : (
                  <span>-</span>
                )}
              </td>
            </tr>
          );
        })}
        </tbody>
      </table>
    </div>
  );
};

export default PartnersListView;
