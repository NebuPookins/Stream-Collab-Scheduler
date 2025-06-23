// src/components/PartnersListView.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Partner, Store, DateFormatOption } from '../types';
import { formatDate } from '../helpers/dateFormatter';
import { sortPartners } from '../helpers/partnerSorters';

interface PartnersListProps {
  store: Store;
  setStore: React.Dispatch<React.SetStateAction<Store | null>>;
}

const PartnersListView: React.FC<PartnersListProps> = ({ store, setStore }) => {
  const navigate = useNavigate();

  // Sort partners using the new helper function.
  // No game-specific tags here, so gameTags argument is undefined.
  const sortedPartners = sortPartners(store.partners);

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

      <ul className="list-group">
        {sortedPartners.map(p => (
          <li key={p.id} className="list-group-item d-flex justify-content-between align-items-center">
            <Link to={`/partners/${p.id}`}>{p.name}</Link>
            <div>
              {p.busyUntil && new Date(p.busyUntil) > new Date() && (
                <span className="me-2 text-muted">
                  (busy until {formatDate(p.busyUntil, store.settings.dateFormat)})
                </span>
              )}
              <span>Last streamed: {p.lastStreamedWith ? formatDate(p.lastStreamedWith, store.settings.dateFormat) : 'Never'}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PartnersListView;
