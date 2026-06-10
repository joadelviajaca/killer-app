import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface Player {
  id: number;
  name: string;
  email: string;
  avatar: string;
  is_admin: boolean;
}

interface Edition {
  id: number;
  title: string;
  status: 'CREATING' | 'ACTIVE' | 'FINISHED';
}

interface Claim {
  id: number;
  killer_name: string;
  victim_name: string;
  story: string;
  status: 'PENDING' | 'DISPUTED';
  created_at: string;
}

// NUEVA INTERFAZ PARA LOS INSCRITOS
interface EnrolledParticipant {
  participant_id: number;
  user_id: number;
  name: string;
  email: string;
  avatar: string;
  status: string;
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentEdition, setCurrentEdition] = useState<Edition | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  
  // NUEVOS ESTADOS PARA LOS INSCRITOS Y LAS PESTAÑAS
  const [enrolled, setEnrolled] = useState<EnrolledParticipant[]>([]);
  const [leftTab, setLeftTab] = useState<'ALL' | 'ENROLLED'>('ALL');

  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editionTitle, setEditionTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const [editingUser, setEditingUser] = useState<Player | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', email: '', avatar: '' });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Estado para pruebas de envío de email (no se muestra en la UI, solo para testear internamente)
  const [isTestingEmail, setIsTestingEmail] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [usersRes, editionRes, claimsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/editions/current'),
        api.get('/participants/claims').catch(() => ({ data: [] }))
      ]);
      
      setPlayers(usersRes.data);
      const fetchedEdition = editionRes.data.edition;
      setCurrentEdition(fetchedEdition);
      setClaims(claimsRes.data);

      // Si hay una edición, pedimos los inscritos
      if (fetchedEdition) {
        const enrolledRes = await api.get(`/editions/${fetchedEdition.id}/participants`);
        setEnrolled(enrolledRes.data);
      } else {
        setEnrolled([]);
        setLeftTab('ALL'); // Forzamos ir a TODOS si no hay edición
      }

    } catch (error) {
      console.error("Error al cargar los datos del dashboard", error);
    } finally {
      setLoading(false);
    }
  };

  // Función para probar la configuración de email (puede ser un botón oculto o una opción en el menú)
  const handleTestEmail = async () => {
    const testEmail = window.prompt('Introduce un correo electrónico para enviar la prueba:');
    if (!testEmail) return;

    setIsTestingEmail(true);
    try {
      const res = await api.post('/admin/test-email', { email: testEmail });
      alert(res.data.message);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al enviar el correo de prueba.');
    } finally {
      setIsTestingEmail(false);
    }
  };

  const handleCreateEdition = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setModalError('');
    try {
      await api.post('/editions', { title: editionTitle });
      setShowCreateModal(false);
      setEditionTitle('');
      await fetchDashboardData(); 
      setLeftTab('ENROLLED'); // Movemos la vista a los inscritos automáticamente
    } catch (error: any) {
      setModalError(error.response?.data?.error || 'Error al crear la edición.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartGame = async () => {
    if (!currentEdition) return;
    if (enrolled.length < 3) {
      alert('Necesitas al menos 3 jugadores inscritos para que el círculo funcione matemáticamente.');
      return;
    }
    if (!window.confirm('¿Estás seguro de arrancar el juego? Se cerrarán las inscripciones y se repartirán los objetivos.')) return;
    try {
      await api.post(`/editions/${currentEdition.id}/start`);
      alert('¡El juego ha comenzado!');
      await fetchDashboardData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al arrancar el juego.');
    }
  };

  const handleFinishGame = async () => {
    if (!currentEdition) return;
    if (!window.confirm('¿Quieres finalizar esta edición de The Killer por completo?')) return;
    try {
      await api.post(`/editions/${currentEdition.id}/finish`);
      alert('Edición finalizada.');
      await fetchDashboardData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al finalizar el juego.');
    }
  };

  const handleResolveClaim = async (claimId: number, action: 'APPROVE' | 'REJECT') => {
    const actionText = action === 'APPROVE' ? 'APROBAR el asesinato' : 'RECHAZAR el asesinato (Falsa alarma)';
    if (!window.confirm(`¿Seguro que quieres ${actionText}? Esta acción es irreversible.`)) return;
    
    setResolvingId(claimId);
    try {
      await api.post(`/participants/claims/${claimId}/resolve`, { action });
      await fetchDashboardData(); 
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al resolver el caso.');
    } finally {
      setResolvingId(null);
    }
  };

  const handleDeleteUser = async (id: number, name: string) => {
    if (!window.confirm(`⚠️ PELIGRO: ¿Estás seguro de que quieres eliminar a ${name} de la base de datos por completo?`)) return;
    try {
      await api.delete(`/admin/users/${id}`);
      alert('Agente eliminado.');
      await fetchDashboardData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al eliminar el agente.');
    }
  };

  // NUEVA: Función para expulsar a un jugador de la edición actual
  const handleKickParticipant = async (participantId: number, name: string) => {
    if (!currentEdition) return;
    if (!window.confirm(`¿Seguro que quieres expulsar a ${name} de esta edición? Podrá volver a inscribirse si lo desea.`)) return;
    
    try {
      await api.delete(`/editions/${currentEdition.id}/participants/${participantId}`);
      // Actualizamos solo la lista de inscritos localmente para que sea instantáneo
      setEnrolled(enrolled.filter(p => p.participant_id !== participantId));
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al expulsar al participante.');
    }
  };

  const openEditModal = (player: Player) => {
    setEditingUser(player);
    setEditFormData({ name: player.name, email: player.email, avatar: player.avatar });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSubmittingEdit(true);
    try {
      await api.put(`/admin/users/${editingUser.id}`, editFormData);
      alert('Datos actualizados correctamente.');
      setEditingUser(null);
      await fetchDashboardData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al actualizar el agente.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8 relative">
      <header className="flex flex-col md:flex-row justify-between items-center mb-10 bg-gray-800 p-6 rounded-xl border border-red-900/50 shadow-lg shadow-red-900/10">
        <div>
          <h1 className="text-3xl font-black text-red-600 tracking-wider">THE KILLER <span className="text-white font-light text-xl">| Panel de Control</span></h1>
          <p className="text-gray-400 mt-1">Director de Juego: <span className="text-gray-200 font-bold">{user?.name}</span></p>
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
          <h3 className="text-gray-400 text-sm font-bold uppercase mb-2">Estado de Edición</h3>
          {currentEdition ? (
             <p className={`text-2xl font-bold ${currentEdition.status === 'ACTIVE' ? 'text-green-500' : 'text-blue-400'}`}>
               {currentEdition.status === 'ACTIVE' ? 'Juego en Curso' : 'Inscripciones Abiertas'}
             </p>
          ) : (
             <p className="text-2xl font-bold text-gray-500">Ninguna activa</p>
          )}
        </div>

        {/* NUEVO BOTÓN DE PRUEBA DE CORREO */}
          <button
            onClick={handleTestEmail}
            disabled={isTestingEmail}
            className="mt-4 w-full text-xs font-bold uppercase tracking-wider bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded text-gray-300 hover:text-white transition-colors flex justify-center items-center gap-2"
          >
            {isTestingEmail ? 'Enviando pings...' : '✉️ Probar Servidor de Correo'}
          </button>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-gray-400 text-sm font-bold uppercase mb-2">Edición Actual</h3>
          <p className="text-xl font-bold text-yellow-500 truncate">{currentEdition ? currentEdition.title : '---'}</p>
        </div>
        {!currentEdition && (
          <button onClick={() => setShowCreateModal(true)} className="bg-red-600 hover:bg-red-700 text-white p-6 rounded-xl border border-red-500 flex flex-col items-center justify-center transition-transform hover:scale-105 shadow-lg shadow-red-900/20">
            <span className="text-3xl mb-1">📢</span>
            <span className="font-bold text-lg">Abrir Inscripciones</span>
          </button>
        )}
        {currentEdition?.status === 'CREATING' && (
          <button onClick={handleStartGame} className="bg-green-600 hover:bg-green-700 text-white p-6 rounded-xl border border-green-500 flex flex-col items-center justify-center transition-transform hover:scale-105 shadow-lg shadow-green-900/20">
            <span className="text-3xl mb-1">⚔️</span>
            <span className="font-bold text-lg">Arrancar Juego</span>
          </button>
        )}
        {currentEdition?.status === 'ACTIVE' && (
          <button onClick={handleFinishGame} className="bg-gray-700 hover:bg-gray-600 text-white p-6 rounded-xl border border-gray-500 flex flex-col items-center justify-center transition-transform hover:scale-105 shadow-lg">
            <span className="text-3xl mb-1">🛑</span>
            <span className="font-bold text-lg">Finalizar Edición</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* ========================================== */}
        {/* COLUMNA IZQUIERDA: GESTIÓN CON PESTAÑAS    */}
        {/* ========================================== */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden flex flex-col h-[500px]">
          {/* Pestañas */}
          <div className="bg-gray-700/50 p-2 border-b border-gray-700 flex justify-between items-center shrink-0">
            <div className="flex gap-2 w-full">
              <button 
                onClick={() => setLeftTab('ALL')}
                className={`flex-1 py-2 px-4 rounded font-bold text-sm transition-colors ${leftTab === 'ALL' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Base de Datos ({players.length})
              </button>
              {currentEdition && (
                <button 
                  onClick={() => setLeftTab('ENROLLED')}
                  className={`flex-1 py-2 px-4 rounded font-bold text-sm transition-colors ${leftTab === 'ENROLLED' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  Inscritos ({enrolled.length})
                </button>
              )}
            </div>
          </div>

          <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
            {loading ? (
              <p className="text-center text-gray-500 mt-10">Desencriptando archivos...</p>
            ) : leftTab === 'ALL' ? (
              // VISTA: TODOS LOS USUARIOS
              <ul className="space-y-3">
                {players.map((player) => (
                  <li key={player.id} className="bg-gray-900 p-3 rounded-lg border border-gray-700 flex justify-between items-center hover:border-gray-500 transition-colors">
                    <div>
                      <p className="font-bold text-white flex items-center gap-2">
                        {player.name} <span className="text-gray-500 text-xs font-normal">({player.avatar})</span>
                        {player.is_admin && <span className="bg-red-900 text-red-200 text-[10px] px-2 py-0.5 rounded uppercase">Admin</span>}
                      </p>
                      <p className="text-sm text-gray-400">{player.email}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => openEditModal(player)} className="bg-blue-900/50 hover:bg-blue-800 text-blue-300 p-2 rounded transition-colors" title="Editar">✏️</button>
                      <button onClick={() => handleDeleteUser(player.id, player.name)} disabled={player.is_admin} className="bg-red-900/50 hover:bg-red-800 text-red-300 p-2 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Eliminar total">🗑️</button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              // VISTA: INSCRITOS EN LA EDICIÓN ACTUAL
              enrolled.length === 0 ? (
                <p className="text-center text-gray-500 mt-10">Nadie se ha inscrito aún en esta edición.</p>
              ) : (
                <ul className="space-y-3">
                  {enrolled.map((player) => (
                    <li key={player.participant_id} className="bg-gray-900 p-3 rounded-lg border border-gray-700 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-white">{player.name} <span className="text-gray-500 text-xs font-normal">({player.avatar})</span></p>
                        <p className="text-sm text-gray-400">
                          Estado actual: <span className={player.status === 'ALIVE' ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>{player.status}</span>
                        </p>
                      </div>
                      <div>
                        {currentEdition?.status === 'CREATING' ? (
                          <button 
                            onClick={() => handleKickParticipant(player.participant_id, player.name)}
                            className="bg-yellow-900/50 hover:bg-yellow-800 text-yellow-300 px-3 py-1.5 rounded text-sm font-bold border border-yellow-700 transition-colors"
                          >
                            Expulsar
                          </button>
                        ) : (
                          <span className="text-xs text-gray-600 uppercase border border-gray-700 px-2 py-1 rounded" title="El juego ya empezó. Usa el suicidio desde su cuenta para sacarlo.">En Juego 🔒</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: TRIBUNAL DEL JUEGO (VAR) */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden flex flex-col h-[500px]">
          <div className="bg-gray-700/50 p-4 border-b border-gray-700 flex justify-between items-center shrink-0">
            <h2 className="text-xl font-bold">Casos Pendientes (VAR)</h2>
            <span className="bg-red-900 text-red-100 text-xs py-1 px-3 rounded-full border border-red-700 font-bold">
              {claims.length} Reportes
            </span>
          </div>
          <div className="p-4 overflow-y-auto flex-1 custom-scrollbar bg-gray-900/30">
            {loading ? (
              <p className="text-center text-gray-500 mt-10">Revisando expedientes...</p>
            ) : claims.length === 0 ? (
              <div className="text-center mt-16">
                <span className="text-5xl block mb-4 opacity-50">⚖️</span>
                <p className="text-gray-400">Todo tranquilo. No hay disputas pendientes.</p>
              </div>
            ) : (
              <ul className="space-y-4">
                {claims.map((claim) => (
                  <li 
                    key={claim.id} 
                    className={`p-4 rounded-lg border-2 ${
                      claim.status === 'DISPUTED' 
                        ? 'bg-red-900/20 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                        : 'bg-gray-800 border-gray-600'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className={`text-xs font-black uppercase tracking-wider px-2 py-1 rounded ${
                          claim.status === 'DISPUTED' ? 'bg-red-600 text-white animate-pulse' : 'bg-yellow-600 text-white'
                        }`}>
                          {claim.status === 'DISPUTED' ? 'EN DISPUTA (URGENTE)' : 'ESPERANDO A LA VÍCTIMA'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">{new Date(claim.created_at).toLocaleDateString()}</span>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm text-gray-400 mb-1">Asesino: <strong className="text-white">{claim.killer_name}</strong></p>
                      <p className="text-sm text-gray-400 mb-2">Víctima: <strong className="text-white">{claim.victim_name}</strong></p>
                      <div className="bg-black/50 p-3 rounded text-sm italic text-gray-300 border-l-2 border-red-500">"{claim.story}"</div>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => handleResolveClaim(claim.id, 'APPROVE')} disabled={resolvingId === claim.id} className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2 px-3 rounded transition-colors">
                        {resolvingId === claim.id ? '...' : 'Aprobar Muerte'}
                      </button>
                      <button onClick={() => handleResolveClaim(claim.id, 'REJECT')} disabled={resolvingId === claim.id} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold py-2 px-3 rounded transition-colors">
                        {resolvingId === claim.id ? '...' : 'Rechazar / Falsa'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* MODAL PARA ABRIR INSCRIPCIONES */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-2">Abrir Inscripciones</h2>
            {modalError && <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded mb-4 text-sm">{modalError}</div>}
            <form onSubmit={handleCreateEdition} className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Nombre de la Edición</label>
                <input
                  type="text" required placeholder="Ej: Edición Primavera 2026"
                  className="w-full bg-gray-900 text-white border border-gray-700 rounded px-4 py-2 focus:outline-none focus:border-red-500"
                  value={editionTitle} onChange={(e) => setEditionTitle(e.target.value)}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded transition-colors" disabled={isSubmitting}>Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded transition-colors">{isSubmitting ? '...' : 'Confirmar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA EDITAR USUARIO */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-md border border-blue-900/50">
            <h2 className="text-2xl font-bold text-white mb-6">✏️ Editar Agente</h2>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Nombre Real</label>
                <input
                  type="text" required
                  className="w-full bg-gray-900 text-white border border-gray-700 rounded px-4 py-2 focus:outline-none focus:border-blue-500"
                  value={editFormData.name} onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Correo Electrónico</label>
                <input
                  type="email" required
                  className="w-full bg-gray-900 text-white border border-gray-700 rounded px-4 py-2 focus:outline-none focus:border-blue-500"
                  value={editFormData.email} onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Alias (Avatar)</label>
                <input
                  type="text" required
                  className="w-full bg-gray-900 text-white border border-gray-700 rounded px-4 py-2 focus:outline-none focus:border-blue-500"
                  value={editFormData.avatar} onChange={(e) => setEditFormData({...editFormData, avatar: e.target.value})}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded transition-colors" disabled={isSubmittingEdit}>Cancelar</button>
                <button type="submit" disabled={isSubmittingEdit} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition-colors">{isSubmittingEdit ? 'Guardando...' : 'Guardar Cambios'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}