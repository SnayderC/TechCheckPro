import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ShieldCheck, LogOut, User as UserIcon, RefreshCw } from 'lucide-react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Evaluation from './pages/Evaluation';
import Report from './pages/Report';
import Compare from './pages/Compare';
import WhatIf from './pages/WhatIf';
import ExecutiveDashboard from './pages/ExecutiveDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminCatalog from './pages/AdminCatalog';
import { verificarCompletitudEvaluacion } from './utils/evaluacionCompletitud';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && !isAdmin) return <Navigate to="/" />;
  return children;
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
  offline: { text: 'Progreso guardado temporalmente', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
};

function WizardLayout() {
  const [currentTab, setCurrentTab] = React.useState('dashboard');
  const [syncStatus, setSyncStatus] = React.useState('idle');
  const [tabAviso, setTabAviso] = React.useState(null);
  const { user, logout, isAdmin } = useAuth();

  const tabs = [
    { id: 'dashboard', label: 'Panel de Control', roles: 'all' },
    { id: 'evaluation', label: 'Matriz TOE', roles: 'all' },
    { id: 'report', label: 'Dictamen FODA', roles: 'all', requiereEvaluacionCompleta: true },
    { id: 'compare', label: 'Comparar', roles: 'all' },
    { id: 'whatif', label: 'What-If', roles: 'all' },
    ...(isAdmin ? [
      { id: 'executive', label: 'Dashboard Gerencial', roles: 'admin' },
      { id: 'admin-catalog', label: 'Catálogo TOE', roles: 'admin' },
      { id: 'admin-users', label: 'Usuarios', roles: 'admin' },
    ] : []),
  ];

  const handleTabChange = async (tabId) => {
    setTabAviso(null);

    if (['evaluation', 'report', 'whatif'].includes(tabId) && !localStorage.getItem('activeEvalId')) {
      setTabAviso('Primero registre o seleccione una auditoría en el Panel de Control.');
      return;
    }

    const tab = tabs.find((t) => t.id === tabId);
    if (tab?.requiereEvaluacionCompleta) {
      const evalId = localStorage.getItem('activeEvalId');
      try {
        const status = await verificarCompletitudEvaluacion(evalId);
        if (!status.puedeVerDictamen) {
          setTabAviso(
            status.mensajeBloqueo
            || 'Complete y califique todos los subfactores relevantes en la Matriz TOE antes de ver el dictamen.',
          );
          return;
        }
      } catch {
        setTabAviso('No se pudo verificar el progreso de la evaluación. Intente de nuevo.');
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
            <p className="text-[10px] text-gray-500">Evaluación de adopción FLOSS</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className={`hidden sm:flex text-xs px-2.5 py-1 rounded-full border font-medium items-center gap-1.5 ${syncConfig.className}`}>
            {syncStatus === 'saving' ? <RefreshCw size={12} className="animate-spin" /> : <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
            {syncConfig.text}
          </span>
          <div className="h-5 w-[1px] bg-gray-800 hidden sm:block" />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-300 bg-gray-900/80 px-3 py-1.5 rounded-xl border border-gray-800 font-medium">
              <UserIcon size={14} className="text-blue-400" />
              <span>{user?.username}</span>
              {isAdmin && <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">ADMIN</span>}
            </div>
            <button onClick={logout} title="Cerrar Sesión" className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2 rounded-xl border border-red-500/20 transition-all cursor-pointer">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <nav className="max-w-6xl mx-auto px-4 mt-6">
        <div className="flex border-b border-gray-800 text-sm overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-3 font-medium transition-all cursor-pointer whitespace-nowrap text-xs sm:text-sm ${
                currentTab === tab.id ? 'border-b-2 border-blue-500 text-blue-400 font-semibold' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {tabAviso && (
        <div className="max-w-6xl mx-auto px-4 mt-4">
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm px-4 py-3 rounded-xl flex items-start justify-between gap-4">
            <p>{tabAviso}</p>
            <button
              type="button"
              onClick={() => setTabAviso(null)}
              className="text-amber-400 hover:text-amber-200 text-xs shrink-0 cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto p-4 mt-4 mb-12">
        {currentTab === 'dashboard' && <Dashboard onNavigate={() => handleTabChange('evaluation')} />}
        {currentTab === 'evaluation' && (
          <Evaluation
            onNext={() => handleTabChange('report')}
            onSyncChange={setSyncStatus}
          />
        )}
        {currentTab === 'report' && <Report onIrEvaluacion={() => handleTabChange('evaluation')} />}
        {currentTab === 'compare' && <Compare />}
        {currentTab === 'whatif' && <WhatIf />}
        {currentTab === 'executive' && isAdmin && <ExecutiveDashboard />}
        {currentTab === 'admin-catalog' && isAdmin && <AdminCatalog />}
        {currentTab === 'admin-users' && isAdmin && <AdminUsers />}
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
          <Route path="/" element={<ProtectedRoute><WizardLayout /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
