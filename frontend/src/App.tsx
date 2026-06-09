import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';

// Componente de seguridad: Expulsa a los que no tengan token
const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Pantalla principal temporal
const Home = () => {
  const { user, logout } = useAuth();
  return (
    <div className="p-8 text-center">
      <h1 className="text-3xl text-red-500 mb-4">Bienvenido, {user?.name}</h1>
      <p className="mb-4">Tu identidad ha sido verificada.</p>
      <button onClick={logout} className="bg-gray-700 px-4 py-2 rounded">Cerrar Sesión</button>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Ruta pública */}
          <Route path="/login" element={<Login />} />

          {/* Rutas privadas */}
          <Route 
            path="/" 
            element={
              <PrivateRoute>
                <Home />
              </PrivateRoute>
            } 
          />
          
          {/* Ruta por defecto (404) */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}