import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Store, AskRecord, DateFormatOption } from '../types';
import { getDatePickerFormat } from '../helpers/dateFormatter';

interface PartnerDetailProps { store: Store; setStore: React.Dispatch<React.SetStateAction<Store | null>>; }
const PartnerDetailView: React.FC<PartnerDetailProps> = ({ store, setStore }) => {
  const { id } = useParams(); const navigate = useNavigate();
  const idx = store.partners.findIndex(p=>p.id===id!);
  if(idx<0) return <div>Not found</div>;
  const partner = store.partners[idx];
  // Editable fields
  const [name, setName] = useState(partner.name);
  const [lastStreamedWith, setLastStreamedWith] = useState<Date|undefined>(partner.lastStreamedWith);
  const [busyUntil, setBusyUntil] = useState<Date|undefined>(partner.busyUntil);
  const [schedule, setSchedule] = useState(partner.schedule||'');
  const save = () => {
    const updated = { ...partner, name, lastStreamedWith, busyUntil, schedule };
    const arr = [...store.partners]; arr[idx] = updated;
    setStore({ ...store, partners: arr });
  };
  // Build calendar events
  const events = store.games.flatMap(g =>
    g.asks.filter(a => a.partnerId === id).map(a => ({ title: g.name + (a.confirmed ? ' ✓' : ''), date: a.askedOn.toISOString().split('T')[0] }))
  );
  if (lastStreamedWith) events.push({ title: 'Last Stream', date: lastStreamedWith.toISOString().split('T')[0] });
  if (busyUntil) events.push({ title: 'Busy', date: busyUntil.toISOString().split('T')[0] });
  return (
    <div>
      <button className="btn btn-link" onClick={()=>navigate(-1)}>Back</button>
      <h2>Partner Details</h2>
      <div className="mb-3">
        <label className="form-label">Name</label>
        <input className="form-control" value={name} onChange={e=>setName(e.target.value)} />
      </div>
      <div className="mb-3">
        <label className="form-label">Last Streamed With</label>
        <DatePicker selected={lastStreamedWith} onChange={d=>setLastStreamedWith(d||undefined)} isClearable className="form-control" dateFormat={getDatePickerFormat(store.settings.dateFormat)} />
      </div>
      <div className="mb-3">
        <label className="form-label">Schedule</label>
        <input className="form-control" value={schedule} onChange={e=>setSchedule(e.target.value)} />
      </div>
      <div className="mb-3">
        <label className="form-label">Busy Until</label>
        <DatePicker selected={busyUntil} onChange={d=>setBusyUntil(d||undefined)} isClearable className="form-control" dateFormat={getDatePickerFormat(store.settings.dateFormat)} />
      </div>
      <button className="btn btn-primary mb-3" onClick={save}>Save</button>
      <FullCalendar
        plugins={[dayGridPlugin, listPlugin]}
        initialView={store.settings.viewMode==='calendar'?'dayGridMonth':'listMonth'}
        events={events}
      />
    </div>
  );
};
export default PartnerDetailView;