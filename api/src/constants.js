export const META_FIELDS = ['created_dt', 'updated_dt'];
export const SCHEMA_OMITTED_FIELDS = META_FIELDS.concat(['id']);
export const CONTENT_TYPE = 'application/json';

export const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';

export const MAX_RESULTS = 50;
export const DEFAULT_LIMIT = 10;
