import { isEmpty, pick } from 'lodash';
import winston from 'winston';
import express from 'express';

import db from '../db';
import {
  createWhereClause,
  createFindByQuery,
  createFindByIdQuery,
  createInsertQuery,
  createUpdateByIdQuery,
  createDeleteByIdQuery,
} from './queries';
import { CONTENT_TYPE, SCHEMA_OMITTED_FIELDS, SERVER_URL, MAX_RESULTS, DEFAULT_LIMIT } from '../constants';
import store from '../redux/store';
import { getETag, getCount } from '../redux/selectors';
import { setCount } from '../redux/counts';
import { createETag, deleteETag } from '../redux/etags';


/**
 * Simple utility function to make sure that the requestion content type is either undefined
 * or the allowed content type of this restufl api.
 *
 * @type {Object} headers - The request headers to check
 * @return {boolean} true if the content-type header is undefined or equal to the application's
 *    allowed content-type.
 */
export function isValidContentType(headers) {
  const type = headers['content-type'];
  return typeof type === 'undefined' || type === CONTENT_TYPE;
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
  return !!etag && !!headerETag && etag === headerETag;
}

/**
 * Checks if the request has all the required url parameters defined.
 *
 * @param {Object} req - The http request object
 * @param {String|Array.<String>} - The url parameters required
 * @return {boolean} true if all the url parameters are defined.
 */
export function isValidParams(req, urlParams) {
  const { params } = req;
  if (Array.isArray(urlParams)) {
    const keys = Object.keys(params);
    return urlParams.filter(param => keys.indexOf(param) !== -1).length === urlParams.length;
  }

  return !!params[urlParams];
}

/**
 * Does some simple validation on a GET request. It will:
 * - Check if all the url parameters are defined on the request
 *   - returns true sends a 400 response
 * - Check if the content-type is valid on the request
 *   - returns true sends a 400 response
 * - Check if the etags match on the request.
 *   - returns true and sends a 304 response
 *
 * @param {Object} req - The http request
 * @param {Object} res - The http response
 * @param {String|Array.<String>} urlParams - The url params required
 * @return {boolean} true if the response has already been sent.
 */
export function validateGET(req, res, urlParams) {
  if (!isValidParams(req, urlParams) || !isValidContentType(req.headers)) {
    res.sendStatus(400);
    return true;
  } else if (isValidETag(req.headers, getETag(req.originalUrl), true)) {
    res.sendStatus(304);
    return true;
  }

  return false;
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
  const findQuery = createFindByIdQuery(name, name);

  return async function handleGET(req, res) {
    if (validateGET(req, res, 'id')) {
      return;
    }

    const {
      params: { id },
      originalUrl: route,
    } = req;

    let etag = getETag(route);
    const entity = await db.oneOrNone(findQuery, { id }).catch(err => winston.debug(err));
    if (entity === null) {
      res.sendStatus(404);
      return;
    } else if (!etag) {
      store.dispatch(createETag(route, entity));
      etag = getETag(route);
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
  const countQuery = `select count(*) from ${name}${createWhereClause(limiters)}`;
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

/**
 * A utility function for automatically generating a list of fields for a schema
 * if there are no defined schemaFields. It will NOT include any metadata fields
 * and the primary key of the schema (usually ID).
 *
 * @param {Object} schema - The schema to generate from
 * @param {Array.<String>=} - An optional array of fields to use.
 * @return {Array.<String>} the list of fields to use.
 */
export function getFilteredFields(schema, schemaFields) {
  let fields = schemaFields;
  if (!fields || fields.length === 0) {
    fields = Object.keys(schema).filter(f => SCHEMA_OMITTED_FIELDS.indexOf(f) === -1);
  }

  return fields;
}

/**
 * A simple utility function to validate a POST request.
 *
 * @param {Object} req - The http request
 * @param {Object} res - The http response
 * @param {function=} validation - An optional validation function to call on the
 *    request body
 * @return {boolean} true if the POST request was invalid and the response has
 *    already been sent.
 */
export function validatePOST(req, res, validation) {
  const { headers, body } = req;
  if (!isValidContentType(headers) || isEmpty(body) || (typeof validation === 'function' && !validation(body))) {
    res.sendStatus(400);
    return true;
  }

  return false;
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
    if (validatePOST(req, res, validation)) {
      return;
    }

    const { body } = req;
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
 * A simple utility function to validating a PUT request.
 *
 * @param {Object} req - The http request
 * @param {Object} res - The http response
 * @param {String|Array.<String>} urlParams - The url params to verify before
 *    doing an update.
 * @param {function=} validation - An optional additional validation function to call
 *    on the request body.
 * @return {boolean} true if the response has already been sent.
 */
export function validatePUT(req, res, urlParams, validation) {
  const { headers, body } = req;
  if (!isValidParams(req, urlParams) || !isValidContentType(headers) || isEmpty(body) || (typeof validation === 'function' && !validation(body))) {
    res.sendStatus(400);
    return true;
  } else if (!isValidETag(headers, getETag(req.originalUrl))) {
    res.sendStatus(412);
    return true;
  }

  return false;
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

  return async (req, res) => {
    if (validatePUT(req, res, 'id', validation)) {
      return;
    }

    const { body, params: { id }, originalUrl: route } = req;
    if (body.id && `${body.id}` !== id) {
      res.sendStatus(400);
      return;
    }

    const result = await db.result(updateQuery, { id, ...pick(body, fields) }).catch(err => winston.debug(err));
    if (result.rowCount === 1) {
      res.sendStatus(204);
      store.dispatch(deleteETag(route));
    } else {
      res.sendStatus(500);
    }
  };
}

/**
 * A simple utility function to validate a delete request and send the correct
 * status code response if it is invalid.
 *
 * @param {Object} req - The http request
 * @param {Object} res - The http response
 * @param {String|Array.<String>} urlParams - The url params to verify before
 *    doing a delete.
 * @return {boolean} true if the response has already been sent.
 */
export function validateDELETE(req, res, urlParams) {
  const { headers, originalUrl } = req;
  if (!isValidParams(req, urlParams)) {
    res.sendStatus(400);
    return true;
  } else if (!isValidETag(headers, getETag(originalUrl))) {
    res.sendStatus(412);
    return true;
  }

  return false;
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
    if (validateDELETE(req, res, 'id')) {
      return;
    }

    const { id } = req.params;
    const entity = await db.oneOrNone(findQuery, { id }).catch(handleError(res));
    if (entity === null) {
      res.sendStatus(404);
      return;
    }

    const result = await db.result(deleteQuery, { id }).catch(handleError(res));

    if (result.rowCount === 1) {
      res.sendStatus(200);
      store.dispatch(deleteETag(req.originalUrl));
      store.dispatch(setCount(name, 0));
    } else {
      res.sendStatus(500);
    }
  };
}

export const GET = 'GET';
export const POST = 'POST';
export const PUT = 'PUT';
export const DELETE = 'DELETE';
export const GET_ALL = 'GET_ALL';

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
 * @param {Object=} options - The additional options to use when creating a CRUD route.
 * @param {String|Array.<String>=} options.methods - A single method or a list of methods that will be allowed
 *    for this route. If this is omitted, all types will be added.
 * @param {Array.<String>=} options.schemaFields - An optional list of fields that should be included in the
 *    post and put requests. If this is omitted, it will be all the fields in the schema except for the primary
 *    key and metadata fields.
 * @param {function=} options.createValidation -An optional validation function to call before creating an object.
 * @param {functionoptionsvalidations.updateValidation - An optional validation function to call before updating an object.
 * @return {Object} the router object with the corresponding enabled CRUD handlers
 */
export default function createCRUDRoute(tableName, schema, options = {}) {
  let { methods } = options;
  if (!methods) {
    methods = [GET, GET_ALL, PUT, POST, DELETE];
  } else if (!Array.isArray(methods)) {
    methods = [methods];
  }

  const { createValidation, updateValidation, schemaFields } = options;

  const router = express.Router();
  if (methods.indexOf('GET_ALL') !== -1) {
    router.get('/', retrieveAll(tableName));
  }

  if (methods.indexOf(GET) !== -1) {
    router.get('/:id', retrieve(tableName));
  }

  if (methods.indexOf(POST) !== -1) {
    router.post('/', create(tableName, schema, schemaFields, createValidation));
  }

  if (methods.indexOf(PUT) !== -1) {
    router.put('/:id', update(tableName, schema, schemaFields, updateValidation));
  }

  if (methods.indexOf(DELETE) !== -1) {
    router.delete('/:id', remove(tableName));
  }

  return router;
}
