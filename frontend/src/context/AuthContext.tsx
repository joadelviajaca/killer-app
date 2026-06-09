import { createContext, useState, useContext, ReactNode, useEffect } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  avatar: string; 
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>(null as any);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true); // <-- FUNDAMENTAL: Empezamos asumiendo que estamos cargando

  useEffect(() => {
    // Al arrancar la app, miramos si hay sesión guardada
    const token = localStorage.getItem('killer_token');
    const storedUser = localStorage.getItem('killer_user');

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error al recuperar la sesión');
        localStorage.removeItem('killer_token');
        localStorage.removeItem('killer_user');
      }
    }
    // Una vez comprobado, quitamos el modo carga para que las rutas hagan su trabajo
    setLoading(false); 
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem('killer_token', token);
    localStorage.setItem('killer_user', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('killer_token');
    localStorage.removeItem('killer_user');
    setUser(null);
    setIsAuthenticated(false);
  };

  // Si estamos cargando, mostramos un spinner y NO renderizamos las rutas todavía
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);