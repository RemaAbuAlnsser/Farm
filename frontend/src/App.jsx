import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar        from "./components/Navbar";
import Dashboard     from "./pages/Dashboard";
import Notifications from "./pages/Notifications";
import Cows          from "./pages/Cows";
import Calves        from "./pages/Calves";
import Finances      from "./pages/Finances";
import Users         from "./pages/Users";
import Guide         from "./pages/Guide";
import Login         from "./pages/Login";
import { isLoggedIn } from "./auth";
import "./App.css";
import "./auth";

export default function App() {
  const [loggedIn, setLoggedIn]       = useState(isLoggedIn());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifCount, setNotifCount]   = useState(0);

  const refreshNotifCount = useCallback(() => {
    axios.get("http://localhost:3001/api/notifications")
      .then((r) => setNotifCount(r.data.length))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    refreshNotifCount();
    const interval = setInterval(refreshNotifCount, 30000);
    return () => clearInterval(interval);
  }, [loggedIn, refreshNotifCount]);

  if (!loggedIn) {
    return <Login onLogin={() => setLoggedIn(true)} />;
  }

  return (
    <BrowserRouter>
      <div className="app-layout">
        <div className="mobile-topbar">
          <button className="hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
          <span className="mobile-title">مزرعة</span>
        </div>

        {sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        <Navbar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} notifCount={notifCount} />

        <main className="main-content">
          <Routes>
            <Route path="/"              element={<Dashboard />} />
            <Route path="/notifications" element={<Notifications onDismiss={refreshNotifCount} />} />
            <Route path="/cows"          element={<Cows />} />
            <Route path="/calves"        element={<Calves />} />
            <Route path="/finances"      element={<Finances />} />
            <Route path="/users"         element={<Users />} />
            <Route path="/guide"         element={<Guide />} />
            <Route path="/login"         element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
