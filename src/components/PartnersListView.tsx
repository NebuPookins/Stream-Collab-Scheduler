// src/components/PartnersListView.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Partner, Store } from '../types';
import { formatDate } from '../helpers/dateFormatter';
import { sortPartners, calculateLastStreamed } from '../helpers/partnerSorters'; // Added calculateLastStreamed

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
          </tr>
        </thead>
        <tbody>
        {sortedPartners.map(p => (
          <tr key={p.id}>
            <th scope="row">
              <Link to={`/partners/${p.id}`}>{p.name}</Link>
            </th>
            <td>
              {p.busyUntil && new Date(p.busyUntil) > new Date() && (
                <span className="me-2 text-muted">
                  (busy until {formatDate(p.busyUntil, store.settings.dateFormat)})
                </span>
              )}
            </td>
            <td>
              {
                (() => {
                  const lastStreamedDate = calculateLastStreamed(p, store.games);
                  return lastStreamedDate ? formatDate(lastStreamedDate, store.settings.dateFormat) : 'Never';
                })()
              }
            </td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>
  );
};

export default PartnersListView;
