import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    avatar: '' // Añadido el estado para el avatar
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', formData);
      navigate('/login', { state: { message: 'Registro completado. Ya puedes iniciar sesión.' } });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al registrar el usuario');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-red-600 mb-2">THE KILLER</h1>
          <h2 className="text-xl text-gray-300">Registro de Agente</h2>
        </div>
        
        {error && <div className="bg-red-900/50 text-red-200 p-3 rounded mb-4 text-sm text-center border border-red-500">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Nombre Real</label>
            <input
              type="text"
              required
              className="w-full bg-gray-900 text-white border border-gray-700 rounded px-4 py-2 focus:outline-none focus:border-red-500"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          {/* NUEVO CAMPO: ALIAS */}
          <div>
            <label className="block text-gray-400 text-sm mb-1">Alias (Nombre en Clave)</label>
            <input
              type="text"
              required
              className="w-full bg-gray-900 text-white border border-gray-700 rounded px-4 py-2 focus:outline-none focus:border-red-500"
              value={formData.avatar}
              onChange={(e) => setFormData({...formData, avatar: e.target.value})}
            />
            <p className="text-xs text-gray-500 mt-1 italic">
              Este será tu nombre en el ranking público de asesinatos. ¡Elige algo no muy obvio para mantener tu identidad en secreto!
            </p>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Correo Electrónico</label>
            <input
              type="email"
              required
              className="w-full bg-gray-900 text-white border border-gray-700 rounded px-4 py-2 focus:outline-none focus:border-red-500"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Contraseña</label>
            <input
              type="password"
              required
              className="w-full bg-gray-900 text-white border border-gray-700 rounded px-4 py-2 focus:outline-none focus:border-red-500"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded transition-colors mt-6">
            Solicitar Ingreso
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-400">
          ¿Ya tienes autorización? <Link to="/login" className="text-red-400 hover:text-red-300">Inicia sesión aquí</Link>
        </div>
      </div>
    </div>
  );
}