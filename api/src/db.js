import Promise from 'bluebird';
import pgPromise from 'pg-promise';
import dotenv from 'dotenv';
import {
  createCreateTableQuery,
  createTableMetadataUpdateQuery,
} from './utils/queries';

dotenv.config();

const { PG_USER, PG_PASS, PG_HOST, PG_PORT, PG_DATABASE } = process.env;
const pgp = pgPromise({ promiseLib: Promise });

const db = pgp({
  host: PG_HOST,
  port: PG_PORT,
  user: PG_USER,
  password: PG_PASS,
  database: PG_DATABASE,
});

export default db;

export function createSchema(schema) {
  return {
    id: 'SERIAL',
    ...schema,
    created_dt: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP',
    updated_dt: 'TIMESTAMP',
  };
}


// Create the postgres function that generates table triggers to update metadata columns
// Should really only be used at beginning stages
db.none(`
create or replace function update_metadata_updated_dt()
returns trigger as $$
begin
  NEW.updated_dt = now();
  return NEW;
end;
$$ language 'plpgsql';
`);

/**
 * This is a utility function that should really only be used in development
 * and the VERY early stages of this project.
 *
 * It will drop the table if it exists and then create a new one based on the given schema
 * and constraints. Once the table has been created, a trigger will be created for the table
 * that will automatically update the metadata columns.
 *
 * @param {String} name - The table's name.
 * @param {Object} schema - The table's schema.
 * @param {String=} constraints - Any additional constraints that should be added to the table.
 * @return {Object} the final query result of added the trigger to the table.
 */
export async function createTable(name, schema, constraints) {
  await db.none(`drop table if exists ${name}`);
  await db.none(createCreateTableQuery(name, schema, constraints));
  return await db.result(createTableMetadataUpdateQuery(name));
}
