import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { ToastContainer } from './components/ToastContainer';
import { HomePage } from './pages/HomePage';
import { MySongsPage } from './pages/MySongsPage';
import { KaraokePage } from './pages/KaraokePage';
import { HistoryPage } from './pages/HistoryPage';
import { GroupPage } from './pages/GroupPage';

export const App: React.FC = () => {
  return (
    <AppProvider>
      <HashRouter>
        <div className="app-container">
          <Navbar />
          <main style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/my-songs" element={<MySongsPage />} />
              <Route path="/karaoke" element={<KaraokePage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/group" element={<GroupPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <BottomNav />
          <ToastContainer />
        </div>
      </HashRouter>
    </AppProvider>
  );
};

export default App;
