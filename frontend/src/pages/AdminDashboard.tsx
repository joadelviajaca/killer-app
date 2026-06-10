import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

// Definimos cómo es un usuario que viene del backend
interface Player {
  id: number;
  name: string;
  email: string;
  avatar: string;
  is_admin: boolean;
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // Nuevos estados para almacenar la lista
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);

  // Al cargar el componente, pedimos la lista al backend
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await api.get('/admin/users');
        setPlayers(response.data);
      } catch (error) {
        console.error("Error al cargar los jugadores", error);
      } finally {
        setLoadingPlayers(false);
      }
    };

    fetchPlayers();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      {/* ... Cabecera y Tarjetas Superiores igual que antes ... */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-10 bg-gray-800 p-6 rounded-xl border border-red-900/50 shadow-lg shadow-red-900/10">
        <div>
          <h1 className="text-3xl font-black text-red-600 tracking-wider">THE KILLER <span className="text-white font-light text-xl">| Panel de Control</span></h1>
          <p className="text-gray-400 mt-1">Director de Juego: <span className="text-gray-200 font-bold">{user?.name}</span> (Avatar: {user?.avatar})</p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-4">
          <button onClick={() => navigate('/')} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded font-medium transition-colors">
            Ver vista de Jugador
          </button>
          <button onClick={logout} className="bg-red-900 hover:bg-red-800 text-red-100 px-4 py-2 rounded font-medium transition-colors">
            Desconectar
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-gray-400 text-sm font-bold uppercase mb-2">Estado del Servidor</h3>
          <p className="text-3xl font-bold text-green-500">Activo</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-gray-400 text-sm font-bold uppercase mb-2">Edición en Curso</h3>
          <p className="text-3xl font-bold text-yellow-500">Ninguna</p>
        </div>
        <button className="bg-red-600 hover:bg-red-700 text-white p-6 rounded-xl border border-red-500 flex flex-col items-center justify-center transition-transform hover:scale-105">
          <span className="text-3xl mb-2">⚔️</span>
          <span className="font-bold text-lg">Crear Nueva Edición</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* COLUMNA IZQUIERDA: LISTA DE JUGADORES */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden flex flex-col h-96">
          <div className="bg-gray-700/50 p-4 border-b border-gray-700 flex justify-between items-center shrink-0">
            <h2 className="text-xl font-bold">Agentes Registrados</h2>
            <span className="bg-gray-900 text-xs py-1 px-3 rounded-full border border-gray-600">
              Total: {players.length}
            </span>
          </div>
          
          <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
            {loadingPlayers ? (
              <p className="text-center text-gray-500 mt-10">Desencriptando archivos...</p>
            ) : players.length === 0 ? (
              <p className="text-center text-gray-500 mt-10">Aún no hay agentes registrados.</p>
            ) : (
              <ul className="space-y-3">
                {players.map((player) => (
                  <li key={player.id} className="bg-gray-900 p-3 rounded-lg border border-gray-700 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-white flex items-center gap-2">
                        {player.name}
                        {player.is_admin && <span className="bg-red-900 text-red-200 text-xs px-2 py-0.5 rounded uppercase">Admin</span>}
                      </p>
                      <p className="text-sm text-gray-400">{player.email}</p>
                    </div>
                    <div className="text-right">
                      <span className="block text-xs text-gray-500 uppercase">Alias</span>
                      <span className="font-bold text-gray-300">{player.avatar}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: REPORTES */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="bg-gray-700/50 p-4 border-b border-gray-700">
            <h2 className="text-xl font-bold">Últimos Movimientos</h2>
          </div>
          <div className="p-6 text-center text-gray-500">
            No hay actividad reciente.
          </div>
        </div>
      </div>
    </div>
  );
}