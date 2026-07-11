import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ShieldCheck, LogOut, User as UserIcon, RefreshCw } from 'lucide-react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Evaluation from './pages/Evaluation';
import Report from './pages/Report';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

const LoginRoute = () => {
  const { user } = useAuth();
  return user ? <Navigate to="/" /> : <Login />;
};

const SYNC_LABELS = {
  idle: { text: 'Sincronizado', className: 'bg-green-500/10 text-green-400 border-green-500/20' },
  saving: { text: 'Autoguardando...', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  saved: { text: 'Guardado', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  error: { text: 'Error de sync', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

function WizardLayout() {
  const [currentTab, setCurrentTab] = React.useState('dashboard');
  const [syncStatus, setSyncStatus] = React.useState('idle');
  const { user, logout } = useAuth();

  const handleTabChange = (tabId) => {
    if (tabId === 'evaluation' || tabId === 'report') {
      if (!localStorage.getItem('activeEvalId')) {
        alert('Primero registre o seleccione una auditoría en el Panel de Control.');
        return;
      }
    }
    setCurrentTab(tabId);
  };

  const syncConfig = SYNC_LABELS[syncStatus] || SYNC_LABELS.idle;

  return (
    <div className="min-h-screen text-gray-100 bg-[#050505]">
      <header className="border-b border-gray-800 bg-[#0a0a0a] px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide text-white uppercase">TechCheck Pro</h1>
            <p className="text-[10px] text-gray-500">Módulo de Inferencia de Adopción FLOSS (TOE)</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span
            className={`hidden sm:flex text-xs px-2.5 py-1 rounded-full border font-medium items-center gap-1.5 ${syncConfig.className}`}
          >
            {syncStatus === 'saving' ? (
              <RefreshCw size={12} className="animate-spin" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            )}
            {syncConfig.text}
          </span>

          <div className="h-5 w-[1px] bg-gray-800 hidden sm:block" />

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-300 bg-gray-900/80 px-3 py-1.5 rounded-xl border border-gray-800 font-medium">
              <UserIcon size={14} className="text-blue-400" />
              <span>{user?.username || 'Usuario'}</span>
            </div>

            <button
              onClick={logout}
              title="Cerrar Sesión"
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2 rounded-xl border border-red-500/20 transition-all cursor-pointer flex items-center justify-center active:scale-95"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <nav className="max-w-6xl mx-auto px-4 mt-6">
        <div className="flex border-b border-gray-800 text-sm overflow-x-auto">
          {[
            { id: 'dashboard', label: '1. Panel de Control & Alcance' },
            { id: 'evaluation', label: '2. Matriz de Evaluación (61 ítems)' },
            { id: 'report', label: '3. Dictamen & Matriz FODA' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-6 py-3 font-medium transition-all cursor-pointer whitespace-nowrap ${
                currentTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-400 font-semibold'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4 mt-4 mb-12">
        {currentTab === 'dashboard' && (
          <Dashboard onNavigate={() => handleTabChange('evaluation')} />
        )}
        {currentTab === 'evaluation' && (
          <Evaluation onNext={() => handleTabChange('report')} onSyncChange={setSyncStatus} />
        )}
        {currentTab === 'report' && <Report />}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <WizardLayout />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
