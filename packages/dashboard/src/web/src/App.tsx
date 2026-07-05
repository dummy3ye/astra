import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Servers from './pages/Servers';
import Users from './pages/Users';
import Warnings from './pages/Warnings';
import AuditLog from './pages/AuditLog';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/servers" element={<Servers />} />
          <Route path="/users" element={<Users />} />
          <Route path="/warnings" element={<Warnings />} />
          <Route path="/audit-log" element={<AuditLog />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}
