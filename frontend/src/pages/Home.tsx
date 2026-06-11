import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

interface ParticipantData {
  status: 'ALIVE' | 'DEAD' | 'DISQUALIFIED' | 'WAITING' | 'NOT_FOUND';
  message?: string;
  score?: number;
  target?: string;
  targetAvatar?: string;
  mission?: string;
  killerName?: string;
  deathReason?: string;
  pendingClaim?: boolean;
  claimStory?: string;
  aliveCount?: number;
}

interface CurrentEdition {
  id: number;
  title: string;
  status: 'CREATING' | 'ACTIVE' | 'FINISHED';
}

interface Suspect {
  accusedUserId: number;
  name: string;
}

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<ParticipantData | null>(null);
  const [edition, setEdition] = useState<CurrentEdition | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const [showKillModal, setShowKillModal] = useState(false);
  const [killStory, setKillStory] = useState('');
  const [isSubmittingKill, setIsSubmittingKill] = useState(false);
  const [killError, setKillError] = useState('');

  const [isProcessingDeath, setIsProcessingDeath] = useState(false);

  const [showCounterModal, setShowCounterModal] = useState(false);
  const [suspects, setSuspects] = useState<Suspect[]>([]);
  const [selectedSuspect, setSelectedSuspect] = useState<number | ''>('');
  const [loadingSuspects, setLoadingSuspects] = useState(false);
  const [isSubmittingCounter, setIsSubmittingCounter] = useState(false);
  const [counterError, setCounterError] = useState('');

  const fetchStatus = async () => {
    setLoading(true);
    setError('');
    try {
      const [participantRes, editionRes] = await Promise.all([
        api.get('/participants/me').catch(() => ({ data: null })),
        api.get('/editions/current').catch(() => ({ data: { edition: null } }))
      ]);
      setData(participantRes.data);
      setEdition(editionRes.data.edition);
    } catch (err: any) {
      setError('Error de conexión con la central.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleJoinGame = async () => {
    if (!edition) return;
    setJoining(true);
    try {
      await api.post(`/editions/${edition.id}/join`);
      alert('¡Inscripción confirmada! Te avisaremos cuando el juego comience.');
      await fetchStatus();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al inscribirse.');
    } finally {
      setJoining(false);
    }
  };

  const handleReportKill = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingKill(true);
    setKillError('');
    try {
      await api.post('/participants/report-kill', { story: killStory });
      setShowKillModal(false);
      setKillStory('');
      alert('Reporte enviado. Tu objetivo ha sido notificado y debe confirmar su muerte.');
      await fetchStatus();
    } catch (err: any) {
      setKillError(err.response?.data?.error || 'Error al reportar el asesinato.');
    } finally {
      setIsSubmittingKill(false);
    }
  };

  const handleConfirmDeath = async () => {
    if (!window.confirm('¿Confirmas que la historia es cierta y has sido eliminado de forma legal?')) return;
    setIsProcessingDeath(true);
    try {
      await api.post('/participants/confirm-death');
      alert('Muerte confirmada. Has pasado a mejor vida.');
      await fetchStatus();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al confirmar la muerte.');
    } finally {
      setIsProcessingDeath(false);
    }
  };

  const handleDisputeDeath = async () => {
    if (!window.confirm('¿Estás seguro de que tu asesino ha hecho trampas o la historia es falsa?')) return;
    setIsProcessingDeath(true);
    try {
      await api.post('/participants/dispute-death');
      alert('Has disputado la muerte. El caso pasa a manos de la directiva (Administrador).');
      await fetchStatus();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al disputar la muerte.');
    } finally {
      setIsProcessingDeath(false);
    }
  };

  const handleSuicide = async () => {
    if (!window.confirm('⚠️ ¿Estás seguro de que quieres abandonar la partida? Esto te eliminará del juego de forma deshonrosa y tu cazador heredará a tu objetivo. No hay vuelta atrás.')) return;

    setIsProcessingDeath(true); // Reutilizamos este estado para bloquear la pantalla
    try {
      await api.post('/participants/suicide');
      alert('Has abandonado el juego.');
      await fetchStatus();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al intentar abandonar.');
    } finally {
      setIsProcessingDeath(false);
    }
  };

  const openCounterModal = async () => {
    setShowCounterModal(true);
    setLoadingSuspects(true);
    setCounterError('');
    try {
      const res = await api.get('/participants/suspects');
      setSuspects(res.data);
    } catch (error) {
      setCounterError('Error al cargar la lista de sospechosos.');
    } finally {
      setLoadingSuspects(false);
    }
  };

  const handleCounterAttack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSuspect) return;
    if (!window.confirm('ATENCIÓN: Si acusas a la persona equivocada, perderás 20 puntos. ¿Seguro?')) return;

    setIsSubmittingCounter(true);
    setCounterError('');

    try {
      const res = await api.post('/participants/counterattack', { accusedUserId: Number(selectedSuspect) });
      alert(res.data.message || '¡Contraataque exitoso! Has eliminado a tu asesino.');
      setShowCounterModal(false);
      setSelectedSuspect('');
      await fetchStatus();
    } catch (err: any) {
      setCounterError(err.response?.data?.error || 'Error en el contraataque.');
      await fetchStatus();
    } finally {
      setIsSubmittingCounter(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  const isNotPlaying = !data || data.status === 'WAITING' || data.status === 'NOT_FOUND';

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-3xl mx-auto relative">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-lg gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Agente {user?.name}</h2>
          {data?.status === 'ALIVE' && (
            <p className="text-sm text-gray-400 transition-all duration-500">
              Puntuación: <span className="text-red-400 font-bold">{data.score} pts</span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
          <button 
            onClick={() => navigate('/social')} 
            className="text-sm bg-blue-900 hover:bg-blue-800 px-4 py-2 rounded text-blue-100 transition-colors border border-blue-700 font-bold shadow-lg"
          >
            📰 Ver Muro / Ranking
          </button>

          {user?.isAdmin && (
            <button 
              onClick={() => navigate('/admin')} 
              className="text-sm bg-red-900 hover:bg-red-800 px-4 py-2 rounded text-red-100 transition-colors border border-red-700 font-bold shadow-lg"
            >
              ⚙️ Panel Admin
            </button>
          )}
          <button onClick={logout} className="text-sm bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-white transition-colors">
            Desconectar
          </button>
        </div>
      </div>

      {error && <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6 text-center">{error}</div>}

      {/* ESTADO 1: No participa */}
      {isNotPlaying && !error && (
        <div className="bg-gray-800 p-8 rounded-xl text-center border border-gray-700 shadow-2xl">
          <span className="text-6xl block mb-4">🕵️‍♂️</span>
          {edition?.status === 'CREATING' ? (
            <>
              <h3 className="text-3xl font-black text-white mb-2 uppercase tracking-wide">Reclutamiento Abierto</h3>
              <p className="text-gray-400 mb-6 text-lg">La <span className="text-red-500 font-bold">{edition.title}</span> está reclutando asesinos.</p>
              <button onClick={handleJoinGame} disabled={joining} className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-transform hover:scale-105 text-lg w-full md:w-auto">
                {joining ? 'Firmando contrato...' : '🩸 Unirme a la partida'}
              </button>
            </>
          ) : edition?.status === 'ACTIVE' ? (
            <>
              <h3 className="text-2xl font-bold text-white mb-2">Llegaste tarde</h3>
              <p className="text-gray-400">La <span className="text-red-500 font-bold">{edition.title}</span> ya está en curso.</p>
            </>
          ) : (
            <>
              <h3 className="text-2xl font-bold text-white mb-2">Sin contrato activo</h3>
              <p className="text-gray-400">No hay ninguna partida planificada en este momento.</p>
            </>
          )}
        </div>
      )}

      {/* ESTADO 2: JUGADOR VIVO */}
      {data?.status === 'ALIVE' && (
        <div className="space-y-6">

          {/* ========================================== */}
          {/* PANTALLA DE VICTORIA (ÚLTIMO EN PIE)       */}
          {/* ========================================== */}
          {data.aliveCount === 1 ? (
            <div className="bg-gradient-to-br from-yellow-900 to-gray-900 border-2 border-yellow-500 rounded-xl p-8 shadow-2xl shadow-yellow-900/50 text-center relative overflow-hidden">
              <div className="absolute top-0 w-full h-2 bg-yellow-400 left-0"></div>
              <span className="text-7xl block mb-4 animate-bounce">👑</span>
              <h3 className="text-4xl font-black text-white mb-2 uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-200">
                ¡Victoria Absoluta!
              </h3>
              <p className="text-yellow-100 text-lg mb-6 font-medium">
                La masacre ha terminado. Eres el último agente en pie. Has sobrevivido a la paranoia, a las traiciones y a tus propios errores. El juego es tuyo.
              </p>
              <div className="bg-black/40 p-4 rounded-lg inline-block border border-yellow-700/50">
                <p className="text-sm text-gray-400 uppercase tracking-wide">Puntuación Final</p>
                <p className="text-4xl font-bold text-yellow-500">{data.score} pts</p>
              </div>
            </div>
          ) : (
            /* INTERFAZ NORMAL DE JUEGO (Si quedan 2 o más) */
            <>
              {/* CARTEL DE CONFIRMACIÓN DE MUERTE */}
              {data.pendingClaim && (
                <div className="bg-red-900 border-2 border-red-500 rounded-xl p-6 shadow-2xl shadow-red-900/50 animate-pulse-slow relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-20 text-6xl">⚠️</div>
                  <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-widest text-red-100">¡Se ha reportado tu baja!</h3>
                  <p className="text-red-200 mb-4 font-medium">Tu asesino afirma haberte eliminado con esta historia:</p>
                  <blockquote className="bg-black/40 border-l-4 border-red-500 italic text-white p-4 rounded mb-6 text-lg">
                    "{data.claimStory}"
                  </blockquote>
                  <div className="flex flex-col sm:flex-row gap-3 relative z-10">
                    <button onClick={handleConfirmDeath} disabled={isProcessingDeath} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded shadow-lg transition-colors">
                      Confirmar Muerte
                    </button>
                    <button onClick={handleDisputeDeath} disabled={isProcessingDeath} className="flex-1 bg-gray-800 border border-gray-600 hover:bg-gray-700 text-gray-200 font-bold py-3 px-4 rounded shadow-lg transition-colors">
                      Disputar (VAR)
                    </button>
                  </div>
                </div>
              )}

              <div className={`transition-opacity ${data.pendingClaim ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                <div className="bg-gradient-to-br from-red-900 to-gray-900 p-1 rounded-xl shadow-2xl shadow-red-900/20 mb-6">
                  <div className="bg-gray-900 p-6 md:p-8 rounded-lg text-center">
                    <h3 className="text-red-500 font-bold tracking-widest uppercase text-sm mb-2">Tu Objetivo Actual</h3>
                    {/* NUEVO DISEÑO GENÉRICO DEL OBJETIVO (Oculta el alias) */}
                    <div className="w-32 h-32 mx-auto bg-gray-800 rounded-full border-4 border-red-900 mb-4 overflow-hidden flex items-center justify-center text-6xl shadow-[0_0_15px_rgba(220,38,38,0.4)]">
                      🎯
                    </div>
                    
                    <h2 className="text-3xl font-extrabold text-white mb-6">{data.target || 'Desconocido'}</h2>
                    <div className="bg-gray-800 p-4 rounded-lg text-left border border-gray-700 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                      <h4 className="text-sm text-gray-400 mb-1 uppercase font-bold">Arma / Método asignado</h4>
                      <p className="text-gray-200 italic">"{data.mission || 'Sin misión asignada'}"</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button onClick={() => setShowKillModal(true)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-4 rounded-xl shadow-lg transition-transform hover:scale-105 flex items-center justify-center gap-2">
                    <span className="text-xl">🗡️</span> Reportar Asesinato
                  </button>

                  {/* BOTÓN O AVISO DE CONTRAATAQUE (MUERTE SÚBITA) */}
                  {data.aliveCount !== undefined && data.aliveCount <= 5 ? (
                    <div className="bg-red-900/40 border border-red-500 text-red-200 font-bold py-4 px-4 rounded-xl shadow-lg flex flex-col items-center justify-center text-center gap-1 relative overflow-hidden">
                      <div className="absolute top-0 w-full h-1 bg-red-500 animate-pulse"></div>
                      <span className="text-lg">⚠️ MUERTE SÚBITA</span>
                      <span className="text-xs font-normal text-gray-300 uppercase tracking-widest">
                        {data.aliveCount} agentes restantes
                      </span>
                      <span className="text-xs text-red-400 mt-1">Defensa desactivada</span>
                    </div>
                  ) : (
                    <button onClick={openCounterModal} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 px-4 rounded-xl shadow-lg transition-transform hover:scale-105 flex items-center justify-center gap-2">
                      <span className="text-xl">🛡️</span> Intentar Contraataque
                    </button>
                  )}

                  {/* BOTÓN DE SUICIDIO (Salida de emergencia) */}
                  <div className="mt-6 text-center">
                    <button
                      onClick={handleSuicide}
                      disabled={isProcessingDeath}
                      className="text-xs text-gray-500 hover:text-red-500 uppercase tracking-widest font-bold underline transition-colors"
                    >
                      Rendirse y Abandonar Partida
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ESTADO 3: JUGADOR MUERTO */}
      {(data?.status === 'DEAD' || data?.status === 'DISQUALIFIED') && (
        <div className="bg-gray-800 p-8 rounded-xl text-center border border-gray-700 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-2 bg-red-600"></div>
          <span className="text-6xl block mb-4">💀</span>
          <h3 className="text-3xl font-bold text-white mb-2">
            {data.status === 'DEAD' ? 'Has sido eliminado' : 'Has abandonado la partida'}
          </h3>
          <p className="text-gray-400 mb-6">El juego ha terminado para ti.</p>
          <div className="bg-gray-900 p-4 rounded-lg text-left inline-block w-full">
            <p className="text-sm text-gray-400 mb-1">Fuiste eliminado por:</p>
            <p className="text-white font-bold mb-4">{data.killerName || 'Desconocido'}</p>
            <p className="text-sm text-gray-400 mb-1">Historia:</p>
            <p className="text-gray-300 italic">"{data.deathReason || 'No hay registros de cómo ocurrió.'}"</p>
          </div>
        </div>
      )}

      {/* MODAL DE REPORTE DE ASESINATO */}
      {showKillModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-lg border border-red-900/50 transform transition-all relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
            <h2 className="text-3xl font-black text-white mb-2 flex items-center gap-2"><span>🩸</span> Reportar Baja</h2>
            <p className="text-gray-400 mb-6 text-sm">Has completado tu contrato sobre <strong className="text-white">{data?.target}</strong>. Escribe un breve relato.</p>
            {killError && <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded mb-4 text-sm font-medium">{killError}</div>}
            <form onSubmit={handleReportKill} className="space-y-4">
              <textarea required placeholder="Ej: Lo pillé desprevenido en el pasillo..." className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-red-500 min-h-[120px]" value={killStory} onChange={(e) => setKillStory(e.target.value)} />
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowKillModal(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg" disabled={isSubmittingKill}>Cancelar</button>
                <button type="submit" disabled={isSubmittingKill || !killStory.trim()} className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-900 text-white font-bold py-3 px-4 rounded-lg flex justify-center items-center">
                  {isSubmittingKill ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : 'Confirmar Muerte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONTRAATAQUE */}
      {showCounterModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-lg border border-yellow-600/50 transform transition-all relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500"></div>

            <h2 className="text-3xl font-black text-white mb-2 flex items-center gap-2">
              <span>🛡️</span> Defensa Activa
            </h2>
            <p className="text-gray-400 mb-6 text-sm">
              ¿Crees que has descubierto quién te está cazando? Señálalo. Si aciertas, quedará eliminado y te llevarás los puntos. <strong className="text-red-400">Si fallas, perderás 20 puntos por falsa alarma.</strong>
            </p>

            {counterError && <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded mb-4 text-sm font-medium">{counterError}</div>}

            {loadingSuspects ? (
              <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500"></div></div>
            ) : (
              <form onSubmit={handleCounterAttack} className="space-y-4">
                <div>
                  <label className="block text-yellow-500 text-sm font-bold mb-2 uppercase tracking-wide">Selecciona al Sospechoso</label>
                  <select required value={selectedSuspect} onChange={(e) => setSelectedSuspect(e.target.value ? Number(e.target.value) : '')} className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-yellow-500 appearance-none">
                    <option value="" disabled>-- Elige un jugador --</option>
                    {suspects.map((suspect) => (
                      <option key={suspect.accusedUserId} value={suspect.accusedUserId}>{suspect.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowCounterModal(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors" disabled={isSubmittingCounter}>Mejor no arriesgo</button>
                  <button type="submit" disabled={isSubmittingCounter || selectedSuspect === ''} className="flex-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-900 disabled:text-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-colors flex justify-center items-center">
                    {isSubmittingCounter ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : 'Acusar Sospechoso'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}