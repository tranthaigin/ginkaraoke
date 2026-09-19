import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { AuthGate } from './components/AuthGate';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { ToastContainer } from './components/ToastContainer';
import { HomePage } from './pages/HomePage';
import { MySongsPage } from './pages/MySongsPage';
import { KaraokePage } from './pages/KaraokePage';
import { HistoryPage } from './pages/HistoryPage';
import { GroupPage } from './pages/GroupPage';
import { PrivacyPage } from './pages/PrivacyPage';

function ProtectedApp() {
  const { authStatus, profile, currentGroup } = useApp();
  if (authStatus !== 'ready' || !profile?.onboarding_completed || !currentGroup) return <AuthGate />;
  return (
    <div className="app-container">
      <Navbar />
      <main className="app-main">
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
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="*" element={<AppProvider><ProtectedApp /></AppProvider>} />
      </Routes>
    </HashRouter>
  );
}
