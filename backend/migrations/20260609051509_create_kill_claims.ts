import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('kill_claims', (table) => {
    table.increments('id').primary();
    table.integer('edition_id').unsigned().notNullable().references('id').inTable('editions').onDelete('CASCADE');
    table.integer('killer_id').unsigned().notNullable().references('id').inTable('participants').onDelete('CASCADE');
    table.integer('victim_id').unsigned().notNullable().references('id').inTable('participants').onDelete('CASCADE');
    table.text('story').notNullable(); // Ahora la historia la escribe el asesino al reportar
    table.enum('status', ['PENDING', 'DISPUTED']).defaultTo('PENDING');
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('kill_claims');
}