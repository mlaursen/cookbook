import { isEmpty, pick } from 'lodash';
import winston from 'winston';

import db from '../db';
import {
  createFindByQuery,
  createFindByIdQuery,
  createInsertQuery,
  createCreateTableQuery,
  createUpdateByIdQuery,
  createDeleteByIdQuery,
  createTableMetadataUpdateQuery,
} from './queries';
import { CONTENT_TYPE, SCHEMA_OMITTED_FIELDS, SERVER_URL, MAX_RESULTS, DEFAULT_LIMIT } from '../constants';
import store, { getETag, getCount } from '../store';
import { setCount } from '../redux/counts';
import { createETag, updateETag, deleteETag } from '../redux/etags';

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
 * Simple utility function to make sure that the requestion content type is either undefined
 * or the allowed content type of this restufl api.
 *
 * @type {Object} headers - The request headers to check
 * @return {boolean} true if the content-type header is undefined or equal to the application's
 *    allowed content-type.
 */
function isValidContentType(headers) {
  const type = headers['content-type'];
  return typeof type === 'undefined' || type === CONTENT_TYPE;
}


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

/**
 * Checks if the etag in the redux store matches the provided etag in the request header.
 *
 * @param {Object} headers - The request's headers
 * @param {String} etag - An etag from the redux store.
 * @return {boolean} true if the etag in the store matches the provided if-none-match etag.
 */
export function isValidETag(headers, etag, fetch = false) {
  const { [`if${fetch ? '-none' : ''}-match`]: headerETag } = headers;
  return etag && headerETag && etag === headerETag;
}


/**
 * Creates a route handler for reading/retrieving a single item from the database by route
 * id params. The route handler will also do conditional GET requests. If the request provided
 * a matching `If-None-Match: "${etag}"` header, the not modified response will be sent instead.
 *
 * Example:
 *   router.get('/:id', retrieve('test'));
 *
 *   curl -iX GET 'http://localhost:3001/test/1'
 *
 * @param {String} name - This is the route/table's name to use for getting
 * @return {function} an express route handler for retrieving a single item from the database.
 */
export function retrieve(name) {
  const findQuery = createFindByIdQuery(3, name);

  return async (req, res) => {
    const {
      params: { id },
      headers,
    } = req;

    let etag = getETag(id, name);
    if (!id) {
      res.status(400);
      res.send('An id is required.');
      return;
    } else if (!isValidContentType(headers)) {
      res.status(400);
      res.send(`The only supported content type is '${CONTENT_TYPE}'.`);
      return;
    } else if (isValidETag(headers, etag, true)) {
      res.sendStatus(304);
      return;
    }

    const entity = await db.oneOrNone(findQuery, { id }).catch(err => winston.debug(err));

    if (entity === null) {
      res.sendStatus(404);
      return;
    } else if (!etag) {
      store.dispatch(createETag(id, name, entity));
      etag = getETag(id, name);
    }

    res.setHeader('Content-Type', CONTENT_TYPE);
    res.setHeader('Last-Modified', entity.updated_dt || entity.created_dt);
    res.setHeader('ETag', etag);
    res.json(entity);
  };
}

/**
 * Retrieves a paginated list of entities for a table.
 *
 * Example:
 *  router.get('/', retrieveAll('test'));
 *
 *  curl -iX GET 'http://localhost:3001/test?limit=20&offset=10'
 *
 * @param {String} name - the table and route name to use
 * @param {Object=} limiters - an optional map of fields with values to limit the select statement
 *    with. The key will be the field name and the value will be a match in the WHERE clause.
 * @param {String|Array.<string>} fields - An optional string or list of fields to select. The default
 *    will select all.
 * @return {function} a route handler function that will retrieve all rows in a table in a paginated way.
 */
export function retrieveAll(name, limiters, fields) {
  const findAllQuery = createFindByQuery(limiters, name, fields);
  const countQuery = `select count(*) from ${name}`;
  const makeLink = (req, offset, limit) => `${SERVER_URL}${req.originalUrl}?offset=${offset}&limit=${limit}`;

  return async (req, res) => {
    let { limit, offset } = req.query;
    limit = parseInt(limit, 10);
    offset = parseInt(offset, 10);
    if (!offset) {
      offset = 0;
    }

    if (!limit) {
      limit = DEFAULT_LIMIT;
    }

    if (limit > MAX_RESULTS) {
      res.status(400);
      res.send(`The max limit is ${MAX_RESULTS}.`);
      return;
    }

    // It might be better to just always get all rows and use js to filter results.
    const results = await db.many(`${findAllQuery} limit $<limit> offset $<offset>`, { limit, offset, ...limiters }).catch(err => {
      res.sendStatus(500);
      winston.debug(err);
    });

    let total = getCount(name);
    if (!total) {
      const { count } = await db.one(countQuery).catch(err => {
        res.sendStatus(500);
        winston.debug(err);
      });
      total = parseInt(count, 10);
      store.dispatch(setCount(name, total));
    }

    res.json({
      data: results,
      meta: {
        total,
        offset,
        limit,
        next: offset + limit < total ? makeLink(req, offset + limit, limit) : null,
        previous: offset > 0 ? makeLink(req, Math.max(0, offset - limit), limit) : null,
      },
    });
  };
}

function getFilteredFields(schema, schemaFields) {
  let fields = schemaFields;
  if (!fields || fields.length === 0) {
    fields = Object.keys(schema).filter(f => SCHEMA_OMITTED_FIELDS.indexOf(f) === -1);
  }

  return fields;
}

/**
 * Creates a new row for the given table name and schema.
 *
 * Example:
 *   router.post('/', create('test2', SCHEMA));
 *
 * This will allow a user to post to the test2 route and make sure that only data from your schema except
 * for metadata and id are submitted.
 *
 * Example 2:
 *  router.post('/', create('test', SCHEMA, ['name', 'weight'], ({ name, weight }) => name.length < 120 && isNumber(weight)));
 *
 * This will allow a user to post to your test route and validate that the request included a name that waas
 * less than 120 characters and the weight is a number. If the user supplied additional fields, they will not
 * be included in the create request.
 *
 * @param {String} name - the table name to use.
 * @param {Object} schema - The table's schema.
 * @param {Array.<string>=} schemaFields - an optional list of fields to only include when doing a create request.
 *    When omitted, the schema will be used and all fields except for metadata and id will be used.
 * @param {function=} validation - An optional validation function to call before creating an object.
 * @return {function} a route handler for creating new objects.
 */
export function create(name, schema, schemaFields, validation) {
  const fields = getFilteredFields(schema, schemaFields);
  const insertQuery = createInsertQuery(name, pick(schema, fields));

  return async (req, res) => {
    const {
      body,
      headers,
    } = req;

    if (!isValidContentType(headers)) {
      res.status(400);
      res.send(`The only supported content type is '${CONTENT_TYPE}'.`);
      return;
    } else if (isEmpty(body)) {
      res.status(400);
      res.send('Data must be provided.');
      return;
    } else if (typeof validation === 'function' && !validation(body)) {
      res.sendStatus(400);
      return;
    }

    const result = await db.one(insertQuery, pick(body, fields)).catch(err => winston.debug(err));
    if (!result || !result.id) {
      res.sendStatus(500);
    } else {
      res.setHeader('Location', `${SERVER_URL}${req.originalUrl}/${result.id}`);
      res.sendStatus(201);
      store.dispatch(setCount(name, 0));
    }
  };
}

/**
 * Creates a route handler to update an object in the database by id. Before updating the object,
 * an etag check will occur to make sure the user has the most recent version. If the etag check fails,
 * the precondition failed response will be sent and the object will not be persisted to the database.
 *
 * Example:
 *  router.put('/:id', update('test', SCHEMA));
 *
 *  curl -iX PUT 'http://localhost:3001/test/1' -H 'If-None-Match: "fjdkasfjkladsjfkldsajfkldjsa"' -d '{ "id": 1, "name": "test" }'
 *
 * Example 2:
 *   router.put('/:id', update('test', SCHEMA, ['name'], ({ name }) => name && name !== 'Freddy'));
 *
 * This example will now do some extra validation to make sure that the name is truthy and the name is not Freddy.
 *
 * @param {String} name - The table name to use.
 * @param {Object} schema - The table's schema to use.
 * @param {Array.<string>=} schemaFields - an optional list of fields to only include when doing a create request.
 *    When omitted, the schema will be used and all fields except for metadata and id will be used.
 * @param {function=} validation - An optional validation function to call before creating the new row.
 * @return {function} a route handler for updating objects.
 */
export function update(name, schema, schemaFields, validation) {
  const fields = getFilteredFields(schema, schemaFields);
  const updateQuery = createUpdateByIdQuery(3, pick(schema, fields), name);
  const findQuery = createFindByIdQuery(3, name);

  return async (req, res) => {
    const { body, headers, params: { id } } = req;

    if (!id) {
      res.status(400);
      res.send('An id is required to update an entity.');
      return;
    } else if (!isValidContentType(headers)) {
      res.status(400);
      res.send(`The only supported content type is '${CONTENT_TYPE}'.`);
      return;
    } else if (isEmpty(body)) {
      res.status(400);
      res.send('Data must be provided.');
      return;
    } else if (!isValidETag(headers, getETag(id, name))) {
      res.sendStatus(412);
      return;
    } else if (typeof validation === 'function' && !validation(body)) {
      res.sendStatus(400);
      return;
    }

    const result = await db.result(updateQuery, { id, ...pick(body, fields) }).catch(err => winston.debug(err));
    if (result.rowCount === 1) {
      res.sendStatus(204);
      const entity = await db.oneOrNone(findQuery, { id }).catch(err => winston.debug(err));
      store.dispatch(updateETag(id, name, entity));
    } else {
      res.sendStatus(500);
    }
  };
}

/**
 * Creates a route handler to remove an object from the database by id. The handler will
 * make sure that the user has provided the correct etags before allowing the delete to happen.
 *
 * Example:
 *   router.delete('/:id', remove('test'));
 *
 *   curl -iX DELETE 'http://localhost:3001/test/3' -H 'If-None-Match: "fdkafjkasfkdas"'
 *
 * @param {String} name - the table name to use.
 * @return {function} a route handler for deleting objects in the database
 */
export function remove(name) {
  const findQuery = createFindByIdQuery(3, name);
  const deleteQuery = createDeleteByIdQuery(3, name);

  const handleError = res => err => {
    res.sendStatus(500);
    winston.debug(err);
  };

  return async (req, res) => {
    const {
      params: { id },
      headers,
    } = req;

    const etag = getETag(id, name);
    if (!id) {
      res.status(400);
      res.send('An id is required to update an entity.');
      return;
    } else if (!etag) {
      // Can kind of cheat here.. If our store does not have the etag defined, it has never been requested
      // before or already is deleted
      res.sendStatus(404);
      return;
    } else if (!isValidETag(headers, etag)) {
      res.sendStatus(412);
      return;
    }

    const entity = await db.oneOrNone(findQuery, { id }).catch(handleError(res));
    if (entity === null) {
      res.sendStatus(404);
      return;
    }

    const result = await db.result(deleteQuery, { id }).catch(handleError(res));

    if (result.rowCount === 1) {
      res.sendStatus(200);
      store.dispatch(deleteETag(id, name));
      store.dispatch(setCount(name, 0));
    } else {
      res.sendStatus(500);
    }
  };
}

/**
 * A utility function for updating a router to include all the basics of CRUD.
 *
 * Example:
 *   import express from 'express';
 *
 *   const myCoolRoute = express.router();
 *   crudify(myCoolRoute, 'my_cool_table', createSchema({ cool: 'TEXT', not_cool: TEXT }));
 *   export default myCoolRoute;
 *
 * @param {Object} router - An express router to update with the crud routes.
 * @param {String} name - the table name to use.
 * @param {Object} schema - The table's schema to use.
 * @param {Array.<string>=} schemaFields - an optional list of fields to only include when doing a create request.
 *    When omitted, the schema will be used and all fields except for metadata and id will be used.
 * @param {function=} createValidation - An optional validation function to call before creating an object.
 * @param {function=} updateValidation - An optional validation function to call before updating an object.
 */
export default function crudify(router, name, schema, schemaFields, createValidation, updateValidation) {
  router.get('/', retrieveAll(name));
  router.get('/:id', retrieve(name));
  router.put('/:id', update(name, schema, schemaFields, updateValidation));
  router.post('/', create(name, schema, schemaFields, createValidation));
  router.delete('/:id', remove(name));
}
