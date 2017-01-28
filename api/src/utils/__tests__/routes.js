/* eslint-env jest */
/* eslint-disable global-require */

import {
  isValidETag,
  isValidParams,
  isValidContentType,
  getFilteredFields,
  validateGET,
  validatePOST,
  validatePUT,
  validateDELETE,
  retrieve,
  create,
  update,
  remove,
} from '../routes';
import { SERVER_URL } from '../../constants';

jest.mock('../../db');
jest.mock('../../redux/store');

describe('routes', () => {
  describe('isValidETag', () => {
    it('should return false if the etag is null or undefined', () => {
      expect(isValidETag({}, null)).toBe(false);
      expect(isValidETag({}, undefined)).toBe(false);
    });

    it('should return false if the headers do not contain the if-none-match etag when fetching', () => {
      expect(isValidETag({}, 'etag', true)).toBe(false);
      expect(isValidETag({ 'if-none-match': '' }, 'etag', true)).toBe(false);
      expect(isValidETag({ 'if-match': 'etag' }, 'etag', true)).toBe(false);
      expect(isValidETag({
        'if-match': 'etag',
        'if-none-match': '',
      }, 'etag', true)).toBe(false);
    });

    it('should return false if the headers do not contain the if-none-match etag when not fetching', () => {
      expect(isValidETag({}, 'etag', false)).toBe(false);
      expect(isValidETag({ 'if-match': '' }, 'etag', false)).toBe(false);
      expect(isValidETag({ 'if-none-match': 'etag' }, 'etag', false)).toBe(false);
      expect(isValidETag({
        'if-match': '',
        'if-none-match': 'etag',
      }, 'etag', false)).toBe(false);
    });

    it('should return true if the if-none-match etag matches the etag parameter for fetching', () => {
      expect(isValidETag({ 'if-none-match': 'value' }, 'value', true)).toBe(true);
      expect(isValidETag({ 'if-none-match': '"generated_etag"' }, '"generated_etag"', true)).toBe(true);
    });

    it('should return true if the if-match etag matches the etag parameter when not fetching', () => {
      expect(isValidETag({ 'if-match': 'value' }, 'value', false)).toBe(true);
      expect(isValidETag({ 'if-match': '"generated_etag"' }, '"generated_etag"', false)).toBe(true);
    });
  });

  describe('isValidParams', () => {
    it('should allow for a single string of urlParams', () => {
      expect(isValidParams({ params: { id: '1' } }, 'id')).toBe(true);
      expect(isValidParams({ params: {} }, 'id')).toBe(false);
    });

    it('should allow for a list of url param strings', () => {
      const request = { params: { parentId: 1, childId: 2 } };
      expect(isValidParams(request, ['parentId'])).toBe(true);
      expect(isValidParams(request, ['parentId', 'childId'])).toBe(true);
      expect(isValidParams(request, ['parentId', 'childId', 'subchildId'])).toBe(false);
    });
  });

  describe('isValidContentType', () => {
    it('should allow an undefined content type', () => {
      expect(isValidContentType({})).toBe(true);
    });

    it('should not allow an empty string content-type', () => {
      expect(isValidContentType({ 'content-type': '' })).toBe(false);
    });

    it('should only allow application/json', () => {
      expect(isValidContentType({ 'content-type': 'text/plain' })).toBe(false);
      expect(isValidContentType({ 'content-type': 'application/json' })).toBe(true);
    });
  });

  describe('validateGET', () => {
    let res;
    beforeEach(() => {
      res = { sendStatus: jest.fn() };
    });

    it('should return true if all the url params are not defined', () => {
      const req = { params: {} };
      expect(validateGET(req, res, 'id')).toBe(true);

      req.params.testId = 'hello';
      expect(validateGET(req, res, 'id')).toBe(true);
      expect(validateGET(req, res, ['id', 'testId'])).toBe(true);
    });

    it('should call send a 400 status if all the url params are not defined', () => {
      const req = { params: {} };
      expect(validateGET(req, res, 'id')).toBe(true);
      expect(res.sendStatus.mock.calls.length).toBe(1);
      expect(res.sendStatus.mock.calls[0][0]).toBe(400);
    });

    it('should return true if the request does not have a valid content-type', () => {
      const req = { params: { id: '1' }, headers: { 'content-type': 'text/plain' } };
      expect(validateGET(req, res, 'id')).toBe(true);
    });

    it('should send a 400 status if the request does not have a valid content-type', () => {
      const req = { params: { id: '1' }, headers: { 'content-type': 'text/plain' } };
      expect(validateGET(req, res, 'id')).toBe(true);
      expect(res.sendStatus.mock.calls.length).toBe(1);
      expect(res.sendStatus.mock.calls[0][0]).toBe(400);
    });

    it('should return true if the request has a valid etag', () => {
      const req = {
        params: { id: '1' },
        headers: { 'if-none-match': '"etag1"' },
        originalUrl: '/items/1',
      };
      expect(validateGET(req, res, 'id')).toBe(true);
    });

    it('should send a 304 status if the request has a valid etag', () => {
      const req = {
        params: { id: '1' },
        headers: { 'if-none-match': '"etag1"' },
        originalUrl: '/items/1',
      };
      expect(validateGET(req, res, 'id')).toBe(true);
      expect(res.sendStatus.mock.calls.length).toBe(1);
      expect(res.sendStatus.mock.calls[0][0]).toBe(304);
    });

    it('should return false if the request has valid params, content-type and not an existing etag', () => {
      const req = {
        params: { id: '1' },
        headers: {
          'content-type': 'application/json',
          'if-none-match': '"something_fake"',
        },
      };
      expect(validateGET(req, res, 'id')).toBe(false);
    });

    it('should not call sendStatus if it is a valid request', () => {
      const req = {
        params: { id: '1' },
        headers: {
          'content-type': 'application/json',
          'if-none-match': '"something_fake"',
        },
      };
      validateGET(req, res, 'id');
      expect(res.sendStatus.mock.calls.length).toBe(0);
    });
  });

  describe('retrieve', () => {
    let req;
    let res;
    beforeEach(() => {
      req = {
        params: { id: '1' },
        headers: {},
        originalUrl: '/items/1',
      };
      res = {
        sendStatus: jest.fn(),
        setHeader: jest.fn(),
        json: jest.fn(),
      };
    });

    it('should return a route handler function for GET requests', () => {
      const handler = retrieve('Item');
      expect(handler).toBeDefined();
      expect(typeof handler).toBe('function');
    });

    it('should set the appropriate headers on a successful request', async () => {
      await retrieve('Item')(req, res);
      expect(res.setHeader.mock.calls.length).toBe(3);
      expect(res.setHeader.mock.calls[0][0]).toBe('Content-Type');
      expect(res.setHeader.mock.calls[0][1]).toBe('application/json');

      expect(res.setHeader.mock.calls[1][0]).toBe('Last-Modified');
      expect(res.setHeader.mock.calls[1][1]).toBe('Today');

      expect(res.setHeader.mock.calls[2][0]).toBe('ETag');
      expect(res.setHeader.mock.calls[2][1]).toBe('"etag1"');
    });

    it('should call the json function on the response on a successful request', async () => {
      await retrieve('Item')(req, res);
      expect(res.json.mock.calls.length).toBe(1);
      expect(res.json.mock.calls[0][0]).toBeDefined();
    });

    it('should send a 404 status if the entity is not found', async () => {
      req.params.id = '3';
      req.originalUrl = '/items/3';
      await retrieve('Item')(req, res);

      expect(res.sendStatus.mock.calls.length).toBe(1);
      expect(res.sendStatus.mock.calls[0][0]).toBe(404);
    });
  });

  describe('getFilteredFields', () => {
    it('should return the schema fields if they exist', () => {
      const fields = ['name'];
      expect(getFilteredFields({}, fields)).toBe(fields);
    });

    it('should automatically create a list of fields based on the schema if there are no schema fields', () => {
      const schema = { name: 'TEXT' };
      const expected = ['name'];
      expect(getFilteredFields(schema)).toEqual(expected);
    });

    it('should ignore the id, created_dt, and updated_dt keys from the schema', () => {
      const schema = { id: 'SERIAL', name: 'TEXT', created_dt: 'TIMESTAMP', updated_dt: 'TIMESTAMP' };
      const expected = ['name'];
      expect(getFilteredFields(schema)).toEqual(expected);
    });
  });

  describe('validatePOST', () => {
    let req;
    let res;
    beforeEach(() => {
      req = { headers: {} };
      res = { sendStatus: jest.fn() };
    });

    it('should return true if the content-type is defined and not application/json', () => {
      req.headers['content-type'] = 'text/plain';
      expect(validatePOST(req, res)).toBe(true);
    });

    it('should send a 400 status if the content-type is defined and not application/json', () => {
      req.headers['content-type'] = 'text/plain';
      expect(validatePOST(req, res)).toBe(true);
      expect(res.sendStatus.mock.calls.length).toBe(1);
      expect(res.sendStatus.mock.calls[0][0]).toBe(400);
    });

    it('should return true if the request body is empty', () => {
      req.body = {};
      expect(validatePOST(req, res)).toBe(true);

      req.body = null;
      expect(validatePOST(req, res)).toBe(true);
    });

    it('should send a 400 status if the request body is empty', () => {
      req.body = {};
      expect(validatePOST(req, res)).toBe(true);
      expect(res.sendStatus.mock.calls.length).toBe(1);
      expect(res.sendStatus.mock.calls[0][0]).toBe(400);
    });

    it('should return true if the custom validation fails', () => {
      req.body = { a: 'b' };
      expect(validatePOST(req, res, () => false)).toBe(true);
    });

    it('should send a 400 status if the custom validation fails', () => {
      req.body = { a: 'b' };
      expect(validatePOST(req, res, () => false)).toBe(true);
      expect(res.sendStatus.mock.calls.length).toBe(1);
      expect(res.sendStatus.mock.calls[0][0]).toBe(400);
    });
  });

  describe('create', () => {
    let req;
    let res;
    const schema = { id: 'SERIAL', name: 'TEXT', updated_dt: 'TIMESTAMP', created_dt: 'TIMESTAMP' };
    beforeEach(() => {
      req = {
        headers: {},
        body: {},
        originalUrl: '/items',
      };
      res = {
        sendStatus: jest.fn(),
        setHeader: jest.fn(),
      };
    });

    it('should return a route handler for creating new objects', () => {
      const handler = create('Item', schema);
      expect(handler).toBeDefined();
      expect(typeof handler).toBe('function');
    });

    it('should send a 400 response if the body is empty', () => {
      create('Item', schema)(req, res);
      expect(res.sendStatus.mock.calls.length).toBe(1);
      expect(res.sendStatus.mock.calls[0][0]).toBe(400);
    });

    it('should send a 400 response if the content-type is defined and not application/json', () => {
      req.headers['content-type'] = 'text/plain';
      create('Item', schema)(req, res);
      expect(res.sendStatus.mock.calls.length).toBe(1);
      expect(res.sendStatus.mock.calls[0][0]).toBe(400);
    });

    it('should send a 400 response if the custom validation fails', () => {
      create('Item', schema, ['name'], () => false)(req, res);
      expect(res.sendStatus.mock.calls.length).toBe(1);
      expect(res.sendStatus.mock.calls[0][0]).toBe(400);
    });

    it('should send a 201 status on successful create', async () => {
      req.body = { name: 'Woohoo' };
      await create('Item', schema)(req, res);
      expect(res.sendStatus.mock.calls.length).toBe(1);
      expect(res.sendStatus.mock.calls[0][0]).toBe(201);
    });

    it('should set the location header to the correct item url on successful create', async () => {
      req.body = { name: 'Woohoo' };
      await create('Item', schema)(req, res);
      expect(res.setHeader.mock.calls.length).toBe(1);
      expect(res.setHeader.mock.calls[0][0]).toBe('Location');
      expect(res.setHeader.mock.calls[0][1]).toBe(`${SERVER_URL}${req.originalUrl}/1000`);
    });

    it('should send a 500 status if there waas an error inserting', async () => {
      req.body = { name: 'BreakMe' };
      await create('Item', schema)(req, res);
      expect(res.sendStatus.mock.calls.length).toBe(1);
      expect(res.sendStatus.mock.calls[0][0]).toBe(500);
    });
  });

  describe('validatePUT', () => {
    let req;
    let res;
    beforeEach(() => {
      req = {
        headers: { 'if-match': '"etag1"' },
        body: { name: 'Woohoo!' },
        params: { id: '1' },
        originalUrl: '/items/1',
      };
      res = { sendStatus: jest.fn() };
    });

    it('should return true if the url params are not defined', () => {
      delete req.params.id;

      expect(validatePUT(req, res, 'id')).toBe(true);
    });

    it('should send a 400 response if the url params are not defined', () => {
      delete req.params.id;

      validatePUT(req, res, 'id');

      expect(res.sendStatus.mock.calls.length).toBe(1);
      expect(res.sendStatus.mock.calls[0][0]).toBe(400);
    });

    it('should return true if the content-type is defined and not application/json', () => {
      req.headers['content-type'] = 'text/plain';
      expect(validatePUT(req, res, 'id')).toBe(true);
    });

    it('should send a 400 response if the content-type is defined and not application/json', () => {
      req.headers['content-type'] = 'text/plain';
      validatePUT(req, res, 'id');

      expect(res.sendStatus.mock.calls.length).toBe(1);
      expect(res.sendStatus.mock.calls[0][0]).toBe(400);
    });

    it('should return true if the custom validation fails', () => {
      expect(validatePUT(req, res, 'id', () => false)).toBe(true);
    });

    it('should send a 400 response if the custom validation fails', () => {
      req.headers['content-type'] = 'text/plain';
      validatePUT(req, res, 'id', () => false);

      expect(res.sendStatus.mock.calls.length).toBe(1);
      expect(res.sendStatus.mock.calls[0][0]).toBe(400);
    });

    it('should return true if the etags do not match', () => {
      req.headers['if-match'] = null;
      expect(validatePUT(req, res, 'id')).toBe(true);

      req.headers['if-match'] = undefined;
      expect(validatePUT(req, res, 'id')).toBe(true);

      req.headers['if-match'] = '"some_non-matching_etag"';
      expect(validatePUT(req, res, 'id')).toBe(true);
    });

    it('should send a 412 status if the etags do not match', () => {
      req.headers['if-match'] = null;
      validatePUT(req, res, 'id');
      expect(res.sendStatus.mock.calls.length).toBe(1);
      expect(res.sendStatus.mock.calls[0][0]).toBe(412);

      req.headers['if-match'] = undefined;
      validatePUT(req, res, 'id');
      expect(res.sendStatus.mock.calls.length).toBe(2);
      expect(res.sendStatus.mock.calls[1][0]).toBe(412);

      req.headers['if-match'] = '"some_non-matching_etag"';
      validatePUT(req, res, 'id');
      expect(res.sendStatus.mock.calls.length).toBe(3);
      expect(res.sendStatus.mock.calls[2][0]).toBe(412);
    });

    it('should return false if it is a valid PUT', () => {
      expect(validatePUT(req, res, 'id')).toBe(false);
    });

    it('should return not call sendStatus if it is a valid PUT', () => {
      validatePUT(req, res, 'id');
      expect(res.sendStatus.mock.calls.length).toBe(0);
    });
  });

  describe('update', () => {
    let req;
    let res;
    const schema = { id: 'SERIAL', name: 'TEXT', updated_dt: 'TIMESTAMP', created_dt: 'TIMESTAMP' };
    beforeEach(() => {
      req = {
        headers: { 'if-match': '"etag1"' },
        body: { name: 'Woohoo!' },
        params: { id: '1' },
        originalUrl: '/items/1',
      };
      res = { sendStatus: jest.fn() };
    });

    it('should return a route handler function', () => {
      const handler = update('Item', schema);
      expect(handler).toBeDefined();
      expect(typeof handler).toBe('function');
    });

    it('should send a 400 status if the body is empty', () => {
      const handler = update('Item', schema);
      delete req.body;
      handler(req, res);

      expect(res.sendStatus.mock.calls.length).toBe(1);
      expect(res.sendStatus.mock.calls[0][0]).toBe(400);

      req.body = {};
      handler(req, res);

      expect(res.sendStatus.mock.calls.length).toBe(2);
      expect(res.sendStatus.mock.calls[1][0]).toBe(400);
    });

    it('should send a 400 status if the id route param is not set', () => {
      delete req.params.id;
      req.originalUrl = '/items';
      const handler = update('Item', schema);
      handler(req, res);

      expect(res.sendStatus.mock.calls.length).toBe(1);
      expect(res.sendStatus.mock.calls[0][0]).toBe(400);
    });

    it('should send a 400 status if the content-type header is defiend and not application/json', () => {
      req.headers['content-type'] = 'text/plain';
      const handler = update('Item', schema);
      handler(req, res);

      expect(res.sendStatus.mock.calls.length).toBe(1);
      expect(res.sendStatus.mock.calls[0][0]).toBe(400);
    });

    it('should send a 400 status if the custom validation fails', () => {
      const handler = update('Item', schema, ['name'], () => false);
      handler(req, res);

      expect(res.sendStatus.mock.calls.length).toBe(1);
      expect(res.sendStatus.mock.calls[0][0]).toBe(400);
    });

    it('should send a 400 status if the url param id does not equal the body id', () => {
      req.body.id = '3';
      const handler = update('Item', schema);
      handler(req, res);

      expect(res.sendStatus.mock.calls.length).toBe(1);
      expect(res.sendStatus.mock.calls[0][0]).toBe(400);
    });

    it('should send a 412 status if the etag is invalid', () => {
      const handler = update('Item', schema);
      delete req.headers['if-match'];

      handler(req, res);
      expect(res.sendStatus.mock.calls.length).toBe(1);
      expect(res.sendStatus.mock.calls[0][0]).toBe(412);

      req.headers['if-match'] = '"some_invalid_etag"';
      handler(req, res);
      expect(res.sendStatus.mock.calls.length).toBe(2);
      expect(res.sendStatus.mock.calls[1][0]).toBe(412);
    });

    it('should send a 204 status on a successful update', async () => {
      await update('Item', schema)(req, res);
      expect(res.sendStatus.mock.calls.length).toBe(1);
      expect(res.sendStatus.mock.calls[0][0]).toBe(204);
    });
  });

  describe('validateDELETE', () => {
    let req;
    let res;
    beforeEach(() => {
      req = {
        params: { id: '1' },
        headers: { 'if-match': '"etag1"' },
        originalUrl: '/items/1',
      };
      res = { sendStatus: jest.fn() };
    });

    it('should return true if the url params are not defined', () => {
      delete req.params.id;
      expect(validateDELETE(req, res, 'id')).toBe(true);

      req.params.id = '3';
      expect(validateDELETE(req, res, ['id', 'id2'])).toBe(true);
    });

    it('should send a 400 status if the url params are not defined', () => {
      delete req.params.id;
      validateDELETE(req, res, 'id');
      expect(res.sendStatus.mock.calls.length).toBe(1);
      expect(res.sendStatus.mock.calls[0][0]).toBe(400);

      req.params.id = '3';
      validateDELETE(req, res, ['id', 'id2']);
      expect(res.sendStatus.mock.calls.length).toBe(2);
      expect(res.sendStatus.mock.calls[1][0]).toBe(400);
    });

    it('should return true if the etag is invalid', () => {
      delete req.headers['if-match'];
      expect(validateDELETE(req, res, 'id')).toBe(true);

      req.headers['if-match'] = '"some_invalid_etag"';
      expect(validateDELETE(req, res, 'id')).toBe(true);
    });

    it('should send a 412 status if the etag is invalid', () => {
      delete req.headers['if-match'];
      validateDELETE(req, res, 'id');
      expect(res.sendStatus.mock.calls.length).toBe(1);
      expect(res.sendStatus.mock.calls[0][0]).toBe(412);

      req.headers['if-match'] = '"some_invalid_etag"';
      validateDELETE(req, res, 'id');
      expect(res.sendStatus.mock.calls.length).toBe(2);
      expect(res.sendStatus.mock.calls[1][0]).toBe(412);
    });

    it('should return false if the request is valid', () => {
      expect(validateDELETE(req, res, 'id')).toBe(false);
    });

    it('should not call the sendStatus function if the request is valid', () => {
      validateDELETE(req, res, 'id');
      expect(res.sendStatus.mock.calls.length).toBe(0);
    });
  });

  describe('remove', () => {
    let req;
    let res;
    beforeEach(() => {
      req = {
        params: { id: '1' },
        headers: { 'if-match': '"etag1"' },
        originalUrl: '/items/1',
      };
      res = { sendStatus: jest.fn() };
    });

    it('should create a route handler for delete requests', () => {
      const handler = remove('Item');
      expect(handler).toBeDefined();
      expect(typeof handler).toBe('function');
    });

    it('should send a 400 response if the url param is not defined', () => {
      const handler = remove('Item');
      delete req.params.id;

      handler(req, res);
      expect(res.sendStatus.mock.calls.length).toBe(1);
      expect(res.sendStatus.mock.calls[0][0]).toBe(400);
    });

    it('should send a 412 response if the etag does not match', () => {
      const handler = remove('Item');
      delete req.headers['if-match'];

      handler(req, res);
      expect(res.sendStatus.mock.calls.length).toBe(1);
      expect(res.sendStatus.mock.calls[0][0]).toBe(412);

      req.headers['if-match'] = '"some_invalid_etag"';
      handler(req, res);
      expect(res.sendStatus.mock.calls.length).toBe(2);
      expect(res.sendStatus.mock.calls[1][0]).toBe(412);
    });

    it('should send a 404 response if the entity no longer exists in the database', async () => {
      const handler = remove('Item');
      req.params.id = '3'; // sort of cheating here

      await handler(req, res);
      expect(res.sendStatus.mock.calls.length).toBe(1);
      expect(res.sendStatus.mock.calls[0][0]).toBe(404);
    });

    it('should send a 200 response if the entity was correctly deleted', async () => {
      await remove('Item')(req, res);
      expect(res.sendStatus.mock.calls.length).toBe(1);
      expect(res.sendStatus.mock.calls[0][0]).toBe(200);
    });
  });
});
