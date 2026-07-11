import { StrictMode, Component } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#050505',
          color: '#f87171',
          fontFamily: 'sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
        }}>
          <div style={{ maxWidth: 520, textAlign: 'center' }}>
            <h1 style={{ color: '#fff', marginBottom: '1rem' }}>Error al cargar TechCheck Pro</h1>
            <p style={{ fontSize: 14, marginBottom: '1rem' }}>{this.state.error.message}</p>
            <p style={{ fontSize: 12, color: '#9ca3af' }}>
              Prueba recargar la página. Si persiste, ejecuta:{' '}
              <code style={{ background: '#111', padding: '2px 6px', borderRadius: 4 }}>
                docker compose exec frontend npm install
              </code>
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
