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
    if (store) {
      saveStore(store);
      // Update data-bs-theme attribute on html element
      if (store.settings.darkMode) {
        document.documentElement.setAttribute('data-bs-theme', 'dark');
      } else {
        document.documentElement.setAttribute('data-bs-theme', 'light');
      }
    }
  }, [store]);

  if (!store) return <div>Loading...</div>;

  return (
    <div>
      <nav className="navbar navbar-expand-lg">
        <ul className="navbar-nav me-auto mb-2 mb-lg-0">
          <li className="nav-item"><NavLink className="nav-link" to="/games">Games</NavLink></li>
          <li className="nav-item"><NavLink className="nav-link" to="/partners">Partners</NavLink></li>
          <li className="nav-item"><NavLink className="nav-link" to="/settings">Settings</NavLink></li>
        </ul>
      </nav>
      <div className="container-fluid">
        <Routes>
          <Route path="/games" element={<GamesListView store={store} setStore={setStore} />} />
          <Route path="/games/:id" element={<GameDetailView store={store} setStore={setStore} />} />
          <Route path="/partners" element={<PartnersListView store={store} setStore={setStore} />} />
          <Route path="/partners/:id" element={<PartnerDetailView store={store} setStore={setStore} />} />
          <Route path="/settings" element={<SettingsView store={store} setStore={setStore} />} />
        </Routes>
      </div>
    </div>
  );
};

export default App;