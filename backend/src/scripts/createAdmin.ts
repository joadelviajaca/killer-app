import bcrypt from 'bcrypt';
import db from '../db.js';

async function createAdmin() {
  // Capturamos los argumentos que se pasen por consola
  const email = process.argv[2];
  const password = process.argv[3];
  const name = process.argv[4] || 'Administrador';

  if (!email || !password) {
    console.error('❌ Uso incorrecto.');
    console.error('👉 Ejecuta: npm run create-admin <email> <password> ["Nombre Opcional"]');
    process.exit(1);
  }

  try {
    const existingUser = await db('users').where({ email }).first();

    if (existingUser) {
      console.log('⚠️ El usuario ya existe. Actualizando permisos a administrador...');
      await db('users').where({ email }).update({ is_admin: true });
      console.log('✅ Usuario actualizado a administrador con éxito.');
    } else {
      console.log('Creando nuevo usuario administrador...');
      const hashedPassword = await bcrypt.hash(password, 10);
      
      await db('users').insert({
        name,
        email,
        password: hashedPassword,
        is_admin: true,
      });
      console.log('✅ Administrador creado con éxito.');
    }
  } catch (error) {
    console.error('❌ Error crítico al crear el administrador:', error);
  } finally {
    // Cerramos la conexión a la base de datos para que el script termine
    await db.destroy();
    process.exit(0);
  }
}

createAdmin();