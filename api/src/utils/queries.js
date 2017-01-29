/** @module utils/queries */
import { isEmpty } from 'lodash';

/**
 * Dynamically creates the start of a `SELECT` statement with a list of fields or
 * a string.
 *
 * @param {String|Array.<String>} [fields=*] - the fields to select from.
 * @return {String} the start of a `SELECT` statement with the fields.
 */
export function createSelect(fields = '*') {
  return `select ${Array.isArray(fields) ? fields.join(', ') : fields}`;
}

/**
 * Dynamically creates a string for binding parameters with postgres.
 *
 * @param {Array.<String>|Object} fields - Either a list of fields to map over or an object
 *    with key names to map over to create the bindings.
 * @param {String=} joinWith - an optional string to use to join all the bindings together.
 *    If omitted and the `fields` param is an object, each binding will be joined with `' and'`.
 * @return {String} a binding string for a sql query.
 */
export function createBindings(fields, joinWith) {
  let joiner = joinWith;
  const isList = Array.isArray(fields);
  if (typeof joiner === 'undefined') {
    joiner = isList ? '' : ' and';
  }

  const list = isList ? fields : Object.keys(fields);
  const l = list.length;

  return list.reduce((bindings, f, i) => `${bindings} ${f} = $<${f}>${i + 1 < l ? joiner : ''}`.trim(), '');
}

/**
 * Creates an optional where clause for a sql query.
 *
 * @param {Object=} bindings - an optional object of bindings to add.
 * @return {String} an empty string or a `WHERE` clause.
 */
export function createWhereClause(bindings) {
  return isEmpty(bindings) ? '' : ` where ${createBindings(bindings)}`;
}

/**
 * Creates a `SELECT x FROM table ...` sql query.
 *
 * Example:
 * ```js
 * createFindByQuery(['id'], 'User'); // 'select * from User where id = $<id>'
 * ```
 *
 * @param {Object|Array.<String>=} bindings - any bindings that should be used to limit the results.
 * @param {String} table - The table to query from
 * @param {String|Array.<String>} [fields=*] - the fields to return from the select.
 * @return {String} the sql query string.
 */
export function createFindByQuery(bindings, table, fields) {
  return `${createSelect(fields)} from ${table}${createWhereClause(bindings)}`;
}

/**
 * Creates a `SELECT x FROM table WHERE id = $<id>` sql query.
 *
 * Example:
 * ```js
 * createFindByIdQuery('3', 'User'); // 'select * from User where id = $<id>'
 * ```
 *
 * @param {String|number} id - An id that really serves no use and should be removed
 * @param {String} table - the table name to query
 * @param {String|Array.<String>} [fields=*] - the fields to return from the select.
 * @return {String} the sql query string.
 */
export function createFindByIdQuery(id, table, fields) {
  return createFindByQuery({ id }, table, fields);
}

/**
 * Creates a sql query string for inserting values into a table.
 *
 * Example:
 * ```js
 * createInsertQuery('User', { username: 'wowza', password: 'really?plaintext?' });
 * // 'insert into User(username, password) values($<username>, $<password>) returning id'
 *
 * @param {String} table - the table name to query
 * @param {Array.<String>|Object} values - either the object that contains the new values to map
 *    overy the key names or a list of fields that should be used in the insert state,ent.
 * @return {String} the sql query string.
 */
export function createInsertQuery(table, values) {
  const names = Object.keys(values);
  const l = names.length;
  const vals = names.reduce((vs, name, i) => `$<${name}>${i + 1 < l ? ', ' : ''}`, '');
  return `insert into ${table}(${names}) values (${vals}) returning id`;
}

/**
 * Creates the sql string to update values in a table.
 *
 * Example:
 * ```js
 * createUpdateByQuery({ name: 'Amazing' }, 'Test', { id: 3, name: 'Not Amazing' });
 * // 'update Test set name = $<name> where id = $<id> and name = $<name>';
 * ```
 *
 * @param {Object|Array.<String>} values - either an object of field key names or a list
 *    of field names to update.
 * @param {String} table - the table name to updated
 * @param {Object} bindings - either an object of field key name  to use in the WHERE clause.
 * @return {String} the sql query string for updating a table.
 */
export function createUpdateByQuery(values, table, bindings) {
  return `update ${table} set ${createBindings(values)}${createWhereClause(bindings)}`;
}

/**
 * Creates a simple update query by a single id.
 *
 * Example:
 * ```js
 * createUpdateByIdQuery(3, { name: 'Amazing' }, 'Test');
 * // 'update Test set name = $<name> where id = $<id>'
 * ```
 *
 * @param {String|number} id - a useless param that should be removed
 * @param {Object|Array.<String>} values - either an object of field key name sor a list
 *    of field names to update.
 * @param {String} table - the table name to use
 * @return {String} the sql query string.
 */
export function createUpdateByIdQuery(id, values, table) {
  return createUpdateByQuery(values, table, { id });
}

/**
 * Creates a delete query
 *
 * Example:
 * ```
 * createDeleteByQuery('User', { id: 3, name: 'Amazing' });
 * // 'delete from user where id = $<id> and name = $<name>'
 * ```
 *
 * @param {String} table - the table name to use
 * @param {Object} bindings - either an object of field key name  to use in the WHERE clause.
 * @return {String} the sql query string
 */
export function createDeleteByQuery(table, bindings) {
  return `delete from ${table}${createWhereClause(bindings)}`;
}

/**
 * Creates a simple `DELETE FROM` query by a single id.
 *
 * Example:
 * ```
 * createDeleteByQuery(3, 'User');
 * // 'delete from user where id = $<id>'
 * ```
 *
 * @param {String|number} id - a useless param that should be removed
 * @param {String} table - the table name to use
 * @return {String} the sql query string.
 */
export function createDeleteByIdQuery(id, table) {
  return createDeleteByQuery(table, { id });
}

/**
 *
 * @param {Object} schema - The schema to generate fields from
 * @return {String} a comma separated string of fields.
 * @access private
 */
export function createFields(schema) {
  const keys = Object.keys(schema);
  const l = keys.length;
  return keys.reduce((fields, name, i) => `${fields} ${name} ${schema[name]}${i + 1 < l ? ', ' : ''}`.trim(), '');
}

/**
 * A simple utility function that will dynamically create a `CREATE TABLE` query from
 * a schema and add constraints.
 *
 * @param {String} name - the table name to use
 * @param {Object} schema - a field->datatype mapping of the table's schema.
 * @param {String=} additionalConstraints - a string of any additional constraints to add.
 * @return {String} the `CREATE TABLE` query string.
 */
export function createCreateTableQuery(name, schema, additionalConstraints) {
  let constraints = `, constraint pk_${name}_Id PRIMARY KEY(id)`;
  if (additionalConstraints) {
    constraints = `${constraints}, ${additionalConstraints}`;
  }

  return `create table if not exists ${name} (${createFields(schema)}${constraints})`;
}

/**
 * Creates the sql query for the trigger that automatically updates the `updated_dt`
 * on every table.
 *
 * @param {String} name - The table name
 * @return {String} the trigger creation query string.
 */
export function createTableMetadataUpdateQuery(name) {
  return `
  create trigger update_${name}_updated_dt before update on ${name}
  for each row execute procedure
  update_metadata_updated_dt();
  `;
}
