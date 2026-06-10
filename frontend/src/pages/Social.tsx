import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

interface FeedItem {
  id: number;
  killer_user_id: number;
  killer_avatar: string;
  victim_name: string;
  mission: string;
  story: string;
  likes_count: number;
  created_at: string;
}

interface RankingItem {
  avatar: string;
  status: 'ALIVE' | 'DEAD' | 'DISQUALIFIED';
  score: number;
  death_reason: string;
}

export default function Social() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'FEED' | 'RANKING'>('FEED');
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [likedItems, setLikedItems] = useState<Set<number>>(() => {
    const saved = localStorage.getItem('killer_likes');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [feedRes, rankingRes] = await Promise.all([
          api.get('/social/feed'),
          api.get('/social/ranking')
        ]);
        setFeed(feedRes.data);
        setRanking(rankingRes.data);
      } catch (err) {
        setError('Error al cargar los datos sociales.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleLike = async (id: number) => {
    if (likedItems.has(id)) return; 
    
    const newLiked = new Set(likedItems).add(id);
    setLikedItems(newLiked);
    localStorage.setItem('killer_likes', JSON.stringify(Array.from(newLiked)));

    setFeed(feed.map(item => item.id === id ? { ...item, likes_count: item.likes_count + 1 } : item));

    try {
      await api.post(`/social/feed/${id}/like`);
    } catch (error) {
      console.error('Error al dar like', error);
      setFeed(feed.map(item => item.id === id ? { ...item, likes_count: item.likes_count - 1 } : item));
      newLiked.delete(id);
      setLikedItems(new Set(newLiked));
      localStorage.setItem('killer_likes', JSON.stringify(Array.from(newLiked)));
    }
  };

  // ==========================================
  // CÁLCULOS PARA EL SALÓN DE LA FAMA
  // ==========================================
  
  // 1. La Muerte más popular (mayor número de likes)
  const topDeath = feed.length > 0 ? [...feed].sort((a, b) => b.likes_count - a.likes_count)[0] : null;
  const hasLikes = topDeath && topDeath.likes_count > 0;

  // 2. El Asesino más popular (sumando los likes de todas sus muertes)
  const killerLikesMap = feed.reduce((acc, kill) => {
    acc[kill.killer_avatar] = (acc[kill.killer_avatar] || 0) + kill.likes_count;
    return acc;
  }, {} as Record<string, number>);

  const topKillerEntry = Object.entries(killerLikesMap).sort((a, b) => b[1] - a[1])[0];
  const topKiller = topKillerEntry ? { avatar: topKillerEntry[0], likes: topKillerEntry[1] } : null;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Cabecera */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
          <div>
            <h1 className="text-3xl font-black text-red-600 tracking-wider">
              THE KILLER <span className="text-white font-light text-xl">| Red Social</span>
            </h1>
            <p className="text-gray-400 mt-1">Cotilleos, muertes y egos heridos.</p>
          </div>
          <button 
            onClick={() => navigate('/')} 
            className="mt-4 md:mt-0 bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-lg font-bold transition-colors"
          >
            Volver a mi Contrato
          </button>
        </header>

        {error && <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6 text-center">{error}</div>}

        {/* ======================= */}
        {/* SALÓN DE LA FAMA (HIGHLIGHTS) */}
        {/* ======================= */}
        {hasLikes && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-gradient-to-br from-red-900/80 to-gray-900 p-5 rounded-xl border border-red-500/50 shadow-lg flex flex-col justify-between">
              <div>
                <h3 className="text-red-400 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span>🩸</span> Muerte Más Sangrienta
                </h3>
                <p className="text-white text-sm italic mb-3 line-clamp-3">"{topDeath.story}"</p>
              </div>
              <div className="flex justify-between items-end border-t border-red-900/50 pt-3">
                <p className="text-gray-400 text-xs">
                  Autor: <strong className="text-gray-200 uppercase tracking-wide">"{topDeath.killer_avatar}"</strong>
                </p>
                <div className="text-red-400 font-bold text-sm bg-red-900/30 px-3 py-1 rounded-full border border-red-800">
                  ❤️ {topDeath.likes_count}
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-900/80 to-gray-900 p-5 rounded-xl border border-yellow-500/50 shadow-lg flex flex-col justify-between">
              <div>
                <h3 className="text-yellow-400 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span>👑</span> Asesino Más Popular
                </h3>
                <p className="text-gray-400 text-sm mb-1">Premio del público para el agente:</p>
                <p className="text-white font-black text-2xl tracking-wider uppercase truncate">"{topKiller?.avatar}"</p>
              </div>
              <div className="flex justify-end border-t border-yellow-900/50 pt-3 mt-3">
                <div className="text-yellow-400 font-bold text-sm bg-yellow-900/30 px-3 py-1 rounded-full border border-yellow-800">
                  ❤️ {topKiller?.likes} likes acumulados
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pestañas */}
        <div className="flex gap-2 mb-6 bg-gray-800 p-2 rounded-xl">
          <button 
            onClick={() => setActiveTab('FEED')}
            className={`flex-1 py-3 rounded-lg font-bold transition-all ${activeTab === 'FEED' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-700'}`}
          >
            📰 Muro de Muertes
          </button>
          <button 
            onClick={() => setActiveTab('RANKING')}
            className={`flex-1 py-3 rounded-lg font-bold transition-all ${activeTab === 'RANKING' ? 'bg-yellow-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-700'}`}
          >
            🏆 Ranking de Puntos
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 md:p-6 min-h-[500px]">
            
            {/* VISTA: MURO DE MUERTES */}
            {activeTab === 'FEED' && (
              feed.length === 0 ? (
                <div className="text-center py-20 opacity-50">
                  <span className="text-6xl block mb-4">🕊️</span>
                  <p className="text-xl font-bold text-gray-300">Paz absoluta</p>
                  <p className="text-gray-400">Aún no se ha derramado sangre en esta edición.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {feed.map((kill) => {
                    const isMyKill = kill.killer_user_id === user?.id; 
                    
                    return (
                      <div key={kill.id} className="bg-gray-900 rounded-xl p-6 border border-gray-700 shadow-md hover:border-red-900/50 transition-colors">
                        <div className="flex flex-col gap-3">
                          <p className="text-gray-300 text-lg">
                            El agente <span className="text-red-500 font-black tracking-widest uppercase px-1">"{kill.killer_avatar}"</span> 
                            eliminó a <strong className="text-white text-xl ml-1">{kill.victim_name}</strong>
                          </p>
                          <p className="text-xs text-red-400 font-bold uppercase tracking-wider">
                            Arma / Método: <span className="text-gray-300 font-normal">{kill.mission}</span>
                          </p>
                          <blockquote className="bg-black/50 border-l-4 border-red-600 p-4 rounded text-gray-300 italic text-sm md:text-base mt-2">
                            "{kill.story}"
                          </blockquote>
                          <div className="mt-4 flex justify-between items-center border-t border-gray-800 pt-4">
                            <span className="text-xs text-gray-500 font-mono">
                              {new Date(kill.created_at).toLocaleString()}
                            </span>
                            {!isMyKill ? (
                              <button 
                                onClick={() => handleLike(kill.id)}
                                disabled={likedItems.has(kill.id)}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all ${
                                  likedItems.has(kill.id) 
                                    ? 'bg-red-900/30 border-red-900 text-red-400 cursor-default' 
                                    : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-red-500 hover:text-red-400'
                                }`}
                              >
                                <span>{likedItems.has(kill.id) ? '❤️' : '🤍'}</span>
                                <span className="font-bold">{kill.likes_count}</span>
                              </button>
                            ) : (
                              <div className="text-xs text-gray-600 uppercase font-bold tracking-widest flex items-center gap-2">
                                <span>❤️ {kill.likes_count}</span>
                                <span className="bg-gray-800 px-2 py-1 rounded border border-gray-700">Tu obra</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* VISTA: RANKING GENERAL */}
            {activeTab === 'RANKING' && (
              ranking.length === 0 ? (
                <div className="text-center py-20 opacity-50">
                  <p className="text-gray-400">El ranking está vacío.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-700">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="bg-gray-900 text-gray-400 text-xs md:text-sm uppercase tracking-wider">
                        <th className="p-4 w-12 text-center">#</th>
                        <th className="p-4">Alias del Agente</th>
                        <th className="p-4 text-center">Estado</th>
                        <th className="p-4 text-right">Puntos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {ranking.map((player, index) => {
                        const isDead = player.status === 'DEAD' || player.status === 'DISQUALIFIED';
                        let rowClass = 'bg-gray-800 hover:bg-gray-700 transition-colors';
                        let rankIcon = <span className="font-bold text-gray-400">{index + 1}</span>;
                        
                        if (index === 0) { rowClass = 'bg-yellow-900/20'; rankIcon = <span className="text-2xl">🥇</span>; }
                        else if (index === 1) { rowClass = 'bg-gray-300/10'; rankIcon = <span className="text-2xl">🥈</span>; }
                        else if (index === 2) { rowClass = 'bg-orange-900/20'; rankIcon = <span className="text-2xl">🥉</span>; }

                        return (
                          <tr key={index} className={`${rowClass} ${isDead ? 'opacity-50' : ''}`}>
                            <td className="p-4 text-center align-middle">{rankIcon}</td>
                            <td className="p-4">
                              <span className={`font-black tracking-wider uppercase ${isDead ? 'line-through text-gray-500' : 'text-white'}`}>
                                "{player.avatar}"
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              {player.status === 'ALIVE' && <span className="text-green-500 text-xs font-bold uppercase tracking-wider bg-green-900/30 px-2 py-1 rounded">Vivo</span>}
                              {player.status === 'DEAD' && <span className="text-red-500 text-xs font-bold uppercase tracking-wider bg-red-900/30 px-2 py-1 rounded">Eliminado</span>}
                              {player.status === 'DISQUALIFIED' && <span className="text-gray-500 text-xs font-bold uppercase tracking-wider bg-gray-900 px-2 py-1 rounded">Abandono</span>}
                            </td>
                            <td className="p-4 text-right font-black text-xl text-yellow-500">
                              {player.score}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}

          </div>
        )}
      </div>
    </div>
  );
}