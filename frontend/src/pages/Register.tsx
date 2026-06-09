import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      // Llamada al endpoint de registro que creamos en el backend
      await api.post('/auth/register', { name, email, password });
      
      setSuccess(true);
      
      // Esperamos 2 segundos para que el usuario lea el mensaje de éxito 
      // y lo mandamos al login para que inicie sesión
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al registrar el usuario');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-xl shadow-2xl overflow-hidden p-8 border border-gray-700">
        
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
            The Killer <span className="text-red-500">2.0</span>
          </h1>
          <p className="text-gray-400">Crea tu perfil de jugador</p>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6 text-sm text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-900/50 border border-green-500 text-green-200 px-4 py-3 rounded-lg mb-6 text-sm text-center">
            Perfil creado con éxito. Redirigiendo al acceso...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="name">
              Nombre y Apellidos (Reales)
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
              placeholder="Ej: Juan Pérez"
              disabled={success}
            />
            <p className="text-xs text-gray-500 mt-1">Necesario para que tu asesino sepa a quién buscar.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="email">
              Correo Institucional
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
              placeholder="tu@email.com"
              disabled={success}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
              placeholder="••••••••"
              disabled={success}
            />
          </div>

          <button
            type="submit"
            disabled={success}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg shadow-red-600/30 mt-4"
          >
            Inscribirse
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
            ¿Ya tienes un contrato? <span className="text-red-500 underline">Entra aquí</span>
          </Link>
        </div>

      </div>
    </div>
  );
}