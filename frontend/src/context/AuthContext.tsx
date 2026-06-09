import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';

// Definimos los tipos para TypeScript
interface User {
  id: number;
  name: string;
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Al cargar la app, comprobamos si ya había una sesión guardada
  useEffect(() => {
    const storedToken = localStorage.getItem('killer_token');
    const storedUser = localStorage.getItem('killer_user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('killer_token', newToken);
    localStorage.setItem('killer_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('killer_token');
    localStorage.removeItem('killer_user');
    setToken(null);
    setUser(null);
    // Redirigir al login o recargar
    window.location.href = '/login'; 
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para usar el contexto fácilmente
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};