import { isEmpty } from 'lodash';

export function createSelect(fields = '*') {
  return `select ${Array.isArray(fields) ? fields.join(', ') : fields}`;
}

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

export function createWhereClause(bindings) {
  return isEmpty(bindings) ? '' : ` where ${createBindings(bindings)}`;
}

export function createFindByQuery(bindings, table, fields) {
  return `${createSelect(fields)} from ${table}${createWhereClause(bindings)}`;
}

export function createFindByIdQuery(id, table, fields) {
  return createFindByQuery({ id }, table, fields);
}

export function createInsertQuery(table, values) {
  const names = Object.keys(values);
  const l = names.length;
  const vals = names.reduce((vs, name, i) => `$<${name}>${i + 1 < l ? ', ' : ''}`, '');
  return `insert into ${table}(${names}) values (${vals}) returning id`;
}

export function createUpdateByQuery(values, table, bindings) {
  return `update ${table} set ${createBindings(values)}${createWhereClause(bindings)}`;
}

export function createUpdateByIdQuery(id, values, table) {
  return createUpdateByQuery(values, table, { id });
}

export function createDeleteByQuery(table, bindings) {
  return `delete from ${table}${createWhereClause(bindings)}`;
}

export function createDeleteByIdQuery(id, table) {
  return createDeleteByQuery(table, { id });
}

export function createFields(schema) {
  const keys = Object.keys(schema);
  const l = keys.length;
  return keys.reduce((fields, name, i) => `${fields} ${name} ${schema[name]}${i + 1 < l ? ', ' : ''}`.trim(), '');
}

export function createCreateTableQuery(name, schema, additionalConstraints) {
  let constraints = `, constraint pk_${name}_Id PRIMARY KEY(id)`;
  if (additionalConstraints) {
    constraints = `${constraints}, ${additionalConstraints}`;
  }

  return `create table if not exists ${name} (${createFields(schema)}${constraints})`;
}

export function createTableMetadataUpdateQuery(name) {
  return `
  create trigger update_${name}_updated_dt before update on ingredient
  for each row execute procedure
  update_metadata_updated_dt();
  `;
}
