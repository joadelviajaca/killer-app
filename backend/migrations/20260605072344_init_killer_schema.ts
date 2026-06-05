import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Tabla de Usuarios
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.string('email', 100).notNullable().unique();
    table.string('password', 255).notNullable();
    table.string('avatar', 255).nullable();
    table.boolean('is_admin').defaultTo(false);
    table.timestamps(true, true); // Crea created_at y updated_at automáticamente
  });

  // 2. Tabla de Ediciones
  await knex.schema.createTable('editions', (table) => {
    table.increments('id').primary();
    table.string('title', 100).notNullable();
    table.enum('status', ['CREATING', 'ACTIVE', 'FINISHED']).defaultTo('CREATING');
    table.date('start_date').nullable();
    table.date('end_date').nullable();
    table.timestamps(true, true);
  });

  // 3. Tabla de Misiones
  await knex.schema.createTable('missions', (table) => {
    table.increments('id').primary();
    table.text('description').notNullable();
    table.enum('difficulty', ['EASY', 'MEDIUM', 'HARD']).defaultTo('MEDIUM');
    table.boolean('is_active').defaultTo(true);
  });

  // 4. Tabla de Participantes
  await knex.schema.createTable('participants', (table) => {
    table.increments('id').primary();
    
    table.integer('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
      
    table.integer('edition_id').unsigned().notNullable()
      .references('id').inTable('editions').onDelete('CASCADE');

    table.enum('status', ['ALIVE', 'DEAD', 'DISQUALIFIED']).defaultTo('ALIVE');
    
    table.integer('target_id').unsigned().nullable()
      .references('id').inTable('participants').onDelete('SET NULL');
      
    table.integer('mission_id').unsigned().nullable()
      .references('id').inTable('missions').onDelete('SET NULL');

    table.integer('score').defaultTo(0);
    table.text('death_reason').nullable();

    table.unique(['user_id', 'edition_id']); // Un usuario por edición
  });

  // 5. Tabla de Asesinatos (Log)
  await knex.schema.createTable('kills_log', (table) => {
    table.increments('id').primary();
    
    table.integer('edition_id').unsigned().notNullable()
      .references('id').inTable('editions').onDelete('CASCADE');
      
    table.integer('killer_id').unsigned().notNullable()
      .references('id').inTable('participants').onDelete('CASCADE');
      
    table.integer('victim_id').unsigned().notNullable()
      .references('id').inTable('participants').onDelete('CASCADE');
      
    table.integer('mission_id').unsigned().notNullable()
      .references('id').inTable('missions').onDelete('CASCADE');

    table.text('story').nullable();
    table.integer('likes_count').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  // El método 'down' sirve para deshacer la migración en orden inverso
  await knex.schema.dropTableIfExists('kills_log');
  await knex.schema.dropTableIfExists('participants');
  await knex.schema.dropTableIfExists('missions');
  await knex.schema.dropTableIfExists('editions');
  await knex.schema.dropTableIfExists('users');
}