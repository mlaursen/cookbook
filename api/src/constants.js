/**
 * A list of metadata fields that appear on every table.
 * @constant {Array.<String>}
 * @default
 */
export const META_FIELDS = ['created_dt', 'updated_dt'];

/**
 * A list of fields that should be omitted when doing post and update
 * requests.
 * @constant {Array.<String>}
 * @default
 */
export const SCHEMA_OMITTED_FIELDS = META_FIELDS.concat(['id']);

/**
 * The allowed content type for requests in the RESTful API.
 * @constant {String}
 * @default
 */
export const CONTENT_TYPE = 'application/json';

/**
 * The url to use when generating meta links
 * @constant {String}
 * @default
 */
export const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';

/**
 * The maximum number of results that will be allowed when retrieving a list
 * of data.
 * @constant {number}
 * @default
 */
export const MAX_RESULTS = 50;

/**
 * The default number of items to limit to when retrieving a list of data.
 * @constant {number}
 * @default
 */
export const DEFAULT_LIMIT = 10;
