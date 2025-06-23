// src/components/PartnersListView.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Partner, Store, DateFormatOption } from '../types';
import { formatDate } from '../helpers/dateFormatter';

interface PartnersListProps {
  store: Store;
  setStore: React.Dispatch<React.SetStateAction<Store | null>>;
}

const PartnersListView: React.FC<PartnersListProps> = ({ store, setStore }) => {
  const navigate = useNavigate();

  const sorted = [...store.partners].sort(
    (a, b) => (a.lastStreamedWith?.getTime() ?? 0) - (b.lastStreamedWith?.getTime() ?? 0)
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

      <ul className="list-group">
        {sorted.map(p => (
          <li key={p.id} className="list-group-item d-flex justify-content-between align-items-center">
            <Link to={`/partners/${p.id}`}>{p.name}</Link>
            <span>{p.lastStreamedWith ? formatDate(p.lastStreamedWith, store.settings.dateFormat) : 'Never'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PartnersListView;
