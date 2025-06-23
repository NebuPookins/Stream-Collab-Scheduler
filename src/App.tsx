import React, { useEffect, useState } from "react";
import { Routes, Route, NavLink } from "react-router-dom";
import { Store } from "./types";
import { loadStore, saveStore } from "./storage";
import GamesListView from "./components/GamesListView";
import GameDetailView from "./components/GameDetailView";
import PartnersListView from "./components/PartnersListView";
import PartnerDetailView from "./components/PartnerDetailView";
import SettingsView from "./components/SettingsView";

const App: React.FC = () => {
  const [store, setStore] = useState<Store | null>(null);

  useEffect(() => {
    loadStore().then(setStore);
  }, []);

  useEffect(() => {
    if (store) saveStore(store);
  }, [store]);

  if (!store) return <div>Loading...</div>;

  return (
    <div className={store.settings.darkMode ? 'bg-dark text-light' : ''}>
      <nav className="navbar navbar-expand-lg navbar-light bg-light">
        <NavLink className="navbar-brand" to="/games">Scheduler</NavLink>
      </nav>
      <div className="container-fluid">
        <div className="row">
          <div className="col-2 bg-secondary vh-100">
            <ul className="nav flex-column text-white mt-3">
              <li className="nav-item"><NavLink className="nav-link text-white" to="/games">Games</NavLink></li>
              <li className="nav-item"><NavLink className="nav-link text-white" to="/partners">Partners</NavLink></li>
              <li className="nav-item"><NavLink className="nav-link text-white" to="/settings">Settings</NavLink></li>
            </ul>
          </div>
          <div className="col-10 p-4">
            <Routes>
              <Route path="/games" element={<GamesListView store={store} setStore={setStore} />} />
              <Route path="/games/:id" element={<GameDetailView store={store} setStore={setStore} />} />
              <Route path="/partners" element={<PartnersListView store={store} setStore={setStore} />} />
              <Route path="/partners/:id" element={<PartnerDetailView store={store} setStore={setStore} />} />
              <Route path="/settings" element={<SettingsView store={store} setStore={setStore} />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;