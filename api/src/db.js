import Promise from 'bluebird';
import pgPromise from 'pg-promise';
import dotenv from 'dotenv';

dotenv.config();

const { PG_USER, PG_PASS, PG_HOST, PG_PORT, PG_DATABASE } = process.env;
const pgp = pgPromise({ promiseLib: Promise });

export default pgp({
  host: PG_HOST,
  port: PG_PORT,
  user: PG_USER,
  password: PG_PASS,
  database: PG_DATABASE,
});

export function createSchema(schema) {
  return {
    id: 'SERIAL',
    ...schema,
    created_dt: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP',
    updated_dt: 'TIMESTAMP',
  };
}
