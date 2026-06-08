import knex from 'knex';
import knexConfig from '../knexfile.js';

// Seleccionamos el entorno (por defecto usará 'development' que definimos en knexfile)
const environment = process.env.NODE_ENV || 'development';
const db = knex(knexConfig[environment]);

export default db;