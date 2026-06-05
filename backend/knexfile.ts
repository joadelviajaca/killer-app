import type { Knex } from 'knex';
import dotenv from 'dotenv';

dotenv.config();

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || 'database', // Nombre del contenedor de MySQL en docker-compose
      user: process.env.DB_USER || 'killer_user',
      password: process.env.DB_PASSWORD || 'killer_password',
      database: process.env.DB_NAME || 'killer_game',
      port: Number(process.env.DB_PORT) || 3306,
    },
    migrations: {
      extension: 'ts',
      directory: './migrations',
    },
  },
};

export default config;