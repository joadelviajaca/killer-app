import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// Definimos la estructura de datos que esperamos del backend
interface ParticipantData {
  status: 'ALIVE' | 'DEAD' | 'PENDING';
  score: number;
  targetName?: string;
  targetAvatar?: string;
  missionDescription?: string;
  killerName?: string;
  deathReason?: string;
  pendingClaim?: boolean;
}

export default function Home() {
  const { user, logout } = useAuth();
  const [data, setData] = useState<ParticipantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await api.get('/participants/me');
        setData(response.data);
      } catch (err: any) {
        // Si da un 404, significa que el jugador no participa en ninguna edición activa
        if (err.response?.status === 404) {
          setData(null);
        } else {
          setError('Error al conectar con el servidor.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-3xl mx-auto">
      {/* Cabecera Superior */}
      <div className="flex justify-between items-center mb-8 bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-lg">
        <div>
          <h2 className="text-xl font-bold text-white">Agente {user?.name}</h2>
          {data && <p className="text-sm text-gray-400">Puntuación: <span className="text-red-400 font-bold">{data.score} pts</span></p>}
        </div>
        <button onClick={logout} className="text-sm bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-white transition-colors">
          Desconectar
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6 text-center">
          {error}
        </div>
      )}

      {/* ESTADO 1: No participa o no hay juego activo */}
      {!data && !error && (
        <div className="bg-gray-800 p-8 rounded-xl text-center border border-gray-700">
          <span className="text-6xl block mb-4">🕵️‍♂️</span>
          <h3 className="text-2xl font-bold text-white mb-2">Sin contrato activo</h3>
          <p className="text-gray-400">No estás asignado a ninguna partida en curso. Mantente a la espera de nuevas órdenes del administrador.</p>
        </div>
      )}

      {/* ESTADO 2: JUGADOR VIVO */}
      {data?.status === 'ALIVE' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-red-900 to-gray-900 p-1 rounded-xl shadow-2xl shadow-red-900/20">
            <div className="bg-gray-900 p-6 md:p-8 rounded-lg text-center">
              <h3 className="text-red-500 font-bold tracking-widest uppercase text-sm mb-2">Tu Objetivo Actual</h3>
              
              <div className="w-32 h-32 mx-auto bg-gray-800 rounded-full border-4 border-red-900 mb-4 overflow-hidden flex items-center justify-center text-5xl">
                {data.targetAvatar || '👤'}
              </div>
              
              <h2 className="text-3xl font-extrabold text-white mb-6">{data.targetName}</h2>
              
              <div className="bg-gray-800 p-4 rounded-lg text-left border border-gray-700 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                <h4 className="text-sm text-gray-400 mb-1 uppercase font-bold">Arma / Método asignado</h4>
                <p className="text-gray-200 italic">"{data.missionDescription}"</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-4 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2">
              <span>🗡️</span> Reportar Asesinato
            </button>
            <button className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 px-4 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2">
              <span>🛡️</span> Intentar Contraataque
            </button>
          </div>
        </div>
      )}

      {/* ESTADO 3: JUGADOR MUERTO */}
      {data?.status === 'DEAD' && (
        <div className="bg-gray-800 p-8 rounded-xl text-center border border-gray-700 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-red-600"></div>
          <span className="text-6xl block mb-4">💀</span>
          <h3 className="text-3xl font-bold text-white mb-2">Has sido eliminado</h3>
          <p className="text-gray-400 mb-6">El juego ha terminado para ti.</p>
          
          <div className="bg-gray-900 p-4 rounded-lg text-left inline-block w-full">
            <p className="text-sm text-gray-400 mb-1">Fuiste eliminado por:</p>
            <p className="text-white font-bold mb-4">{data.killerName || 'Desconocido'}</p>
            <p className="text-sm text-gray-400 mb-1">Historia:</p>
            <p className="text-gray-300 italic">"{data.deathReason}"</p>
          </div>
        </div>
      )}
    </div>
  );
}