// src/components/PartnersListView.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Partner, Store, Game } from '../types';
import { formatDate } from '../helpers/dateFormatter';
import { sortPartners, calculateLastStreamed } from '../helpers/partnerSorters';
import { getPartnerGameStates } from '../helpers/storeUtils'; // Updated import

interface PartnersListProps {
  store: Store;
  setStore: React.Dispatch<React.SetStateAction<Store | null>>;
}

const PartnersListView: React.FC<PartnersListProps> = ({ store, setStore }) => {
  const navigate = useNavigate();
  const [filterText, setFilterText] = useState('');

  // Only pass non-trashed games to getPartnerGameStates
  const filteredGames = store.games.filter(g => !g.trashed);
  // Sort partners using the new helper function.
  // No game-specific tags here, so gameTags argument is undefined.
  const sortedPartners = sortPartners(store.partners, filteredGames); // Pass store.games

  const filteredPartners = sortedPartners.filter(partner =>
    partner.name.toLowerCase().includes(filterText.toLowerCase())
  );

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

      <div className="mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Filter partners..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
      </div>

      <table className="table table-striped table-hover mb-4">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Busy Until</th>
            <th scope="col">Last Streamed</th>
            <th scope="col">Planned Streaming</th>
            <th scope="col">Open Asks</th>
          </tr>
        </thead>
        <tbody>
          {filteredPartners.length > 0 ? (
            filteredPartners.map(p => {
              const { plannedStreams, pendingAsks } = getPartnerGameStates(p, filteredGames);
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
                    {(() => {
                      const lastStreamedDate = calculateLastStreamed(p, filteredGames);
                      return lastStreamedDate ? formatDate(lastStreamedDate, store.settings.dateFormat) : 'Never';
                    })()}
                  </td>
                  <td> {/* Planned Streaming column data */}
                    {plannedStreams.length > 0 ? (
                      plannedStreams.map((game: Game, index: number) => (
                        <React.Fragment key={game.id}>
                          <Link to={`/games/${game.id}`}>{game.name}</Link>
                          {index < plannedStreams.length - 1 && ', '}
                        </React.Fragment>
                      ))
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                  <td> {/* Open Asks column data - now uses pendingAsks */}
                    {pendingAsks.length > 0 ? (
                      pendingAsks.map((game: Game, index: number) => (
                        <React.Fragment key={game.id}>
                          <Link to={`/games/${game.id}`}>{game.name}</Link>
                          {index < pendingAsks.length - 1 && ', '}
                        </React.Fragment>
                      ))
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={5} className="text-center">
                No partners match your filter.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PartnersListView;

