import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Store, AskRecord, Partner } from '../types';
interface GameDetailProps { store: Store; setStore: React.Dispatch<React.SetStateAction<Store | null>>; }
const GameDetailView: React.FC<GameDetailProps> = ({ store, setStore }) => {
  const { id } = useParams(); const navigate = useNavigate();
  const gameIndex = store.games.findIndex(g => g.id === id);
  if (gameIndex < 0) return <div>Not found</div>;
  const game = store.games[gameIndex];
  const [name, setName] = useState(game.name);
  const [deadline, setDeadline] = useState<Date | undefined>(game.deadline);
  const [desiredPartners, setDesiredPartners] = useState(game.desiredPartners);

  const save = () => {
    const updated = { ...game, name, deadline, desiredPartners };
    const newGames = [...store.games]; newGames[gameIndex] = updated;
    setStore({ ...store, games: newGames });
  };

  const askedIds = game.asks.map(a => a.partnerId);
  const asked = game.asks.sort((a, b) => a.askedOn.getTime() - b.askedOn.getTime());
  const now = new Date();
  const greyThreshold = store.settings.greyThresholdDays;

  const availablePartners = store.partners
    .filter(p => !askedIds.includes(p.id))
    .filter(p => !deadline || !p.busyUntil || p.busyUntil <= deadline)
    .sort((a, b) => (a.lastStreamedWith?.getTime() ?? 0) - (b.lastStreamedWith?.getTime() ?? 0));

  const busyPartners = store.partners
    .filter(p => !askedIds.includes(p.id) && deadline && p.busyUntil && p.busyUntil > deadline);

  const askPartner = (pid: string) => {
    const newAsk: AskRecord = { partnerId: pid, askedOn: new Date(), confirmed: false };
    const newGame = { ...game, asks: [...game.asks, newAsk] };
    const newGames = [...store.games]; newGames[gameIndex] = newGame;
    setStore({ ...store, games: newGames });
  };

  return (
    <div>
      <button className="btn btn-link" onClick={() => navigate(-1)}>Back</button>
      <h2>Edit Game</h2>
      <div className="mb-3">
        <label className="form-label">Name</label>
        <input className="form-control" value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className="mb-3">
        <label className="form-label">Deadline</label>
        <DatePicker
          selected={deadline}
          onChange={(d) => setDeadline(d || undefined)}
          isClearable
          className="form-control"
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Desired # Partners</label>
        <input type="number" className="form-control" value={desiredPartners} onChange={e=>setDesiredPartners(+e.target.value)} />
      </div>
      <button className="btn btn-primary mb-4" onClick={save}>Save</button>

      <h3>Asked</h3>
      <ul className="list-group mb-3">
        {asked.map(a => {
          const partner = store.partners.find(p=>p.id===a.partnerId);
          const grey = !a.confirmed && ((now.getTime() - a.askedOn.getTime())/(1000*60*60*24) > greyThreshold);
          return (
            <li key={a.partnerId} className={`list-group-item d-flex justify-content-between ${grey?'text-muted':''}`}>
              {partner?.name} &mdash; Asked on {a.askedOn.toLocaleDateString()}
            </li>
          );
        })}
      </ul>

      <h3>Available</h3>
      <ul className="list-group mb-3">
        {availablePartners.map(p => (
          <li key={p.id} className="list-group-item d-flex justify-content-between">
            {p.name} <button className="btn btn-sm btn-outline-primary" onClick={()=>askPartner(p.id)}>Ask</button>
          </li>
        ))}
      </ul>

      <h3>Busy</h3>
      <ul className="list-group">
        {busyPartners.map(p => (
          <li key={p.id} className="list-group-item text-muted">{p.name} (busy until {p.busyUntil?.toLocaleDateString()})</li>
        ))}
      </ul>
    </div>
  );
};
export default GameDetailView;