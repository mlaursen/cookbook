/* eslint-env jest */

jest.unmock('../queries');

import {
  createSelect,
  createBindings,
  createWhereClause,
  createFindByQuery,
  createFindByIdQuery,
  createInsertQuery,
  createUpdateByQuery,
  createUpdateByIdQuery,
  createDeleteByQuery,
  createDeleteByIdQuery,
} from '../queries';

describe('queries', () => {
  describe('createSelect', () => {
    it('creates a select statement with a string of field', () => {
      expect(createSelect('*')).toBe('select *');
      expect(createSelect('test')).toBe('select test');
    });

    it('creates a select statement with an array of fields', () => {
      expect(createSelect(['id', 'name'])).toBe('select id, name');
    });

    it('allows for an empty string select', () => {
      expect(createSelect('')).toBe('select ');
    });

    it('allows for an empty array select', () => {
      expect(createSelect([])).toBe('select ');
    });
  });

  describe('createBindings', () => {
    it('creates a sql string for binding values from an array', () => {
      expect(createBindings(['id'])).toBe('id = $<id>');
      expect(createBindings(['id', 'name'])).toBe('id = $<id> name = $<name>');
    });

    it('creates a sql string for binding values from an object', () => {
      expect(createBindings({ id: 3 })).toBe('id = $<id>');
    });

    it('creates a sql string joined by `and` if there is more than one key in the binding object', () => {
      expect(createBindings({ id: 3, name: 'hello' })).toBe('id = $<id> and name = $<name>');
    });

    it('creates a sql string joined by a custom joiner if defined', () => {
      expect(createBindings(['id', 'name'], ' or')).toBe('id = $<id> or name = $<name>');
      expect(createBindings({ id: 3, name: 'hello' }, ' or')).toBe('id = $<id> or name = $<name>');
    });
  });

  describe('createWhereClause', () => {
    it('returns the empty string if the bindings are null or undefined', () => {
      expect(createWhereClause(null)).toBe('');
      expect(createWhereClause()).toBe('');
      expect(createWhereClause(undefined)).toBe('');
    });

    it('returns the empty string if the bindings object has no values', () => {
      expect(createWhereClause({})).toBe('');
    });

    it('creates a where clause with a leading space', () => {
      expect(createWhereClause({ name: 'Hello' })).toBe(' where name = $<name>');
      expect(createWhereClause({ id: 3, name: 'noop' })).toBe(' where id = $<id> and name = $<name>');
    });
  });

  describe('createFindByQuery', () => {
    it('creates a query to find a row in the database', () => {
      expect(createFindByQuery({ id: 3 }, 'test')).toBe('select * from test where id = $<id>');
    });
  });

  describe('createFindByIdQuery', () => {
    it('creates a query to find a row in the database by id', () => {
      expect(createFindByIdQuery(3, 'test')).toBe('select * from test where id = $<id>');
    });
  });

  describe('createInsertQuery', () => {
    it('should return a string for an insert query', () => {
      expect(createInsertQuery('Test', { name: 'Woop' })).toBe('insert into Test(name) values ($<name>) returning id');
    });
  });

  describe('createUpdateByQuery', () => {
    it('creates a sql string to update rows in a table', () => {
      expect(createUpdateByQuery({ name: 'Hello' }, 'test', { id: 3 })).toBe('update test set name = $<name> where id = $<id>');
    });
  });

  describe('createUpdateByIdQuery', () => {
    it('creates a sql string to update a row in a table by id', () => {
      expect(createUpdateByIdQuery(3, { name: 'hello' }, 'test')).toBe('update test set name = $<name> where id = $<id>');
    });
  });

  describe('createDeleteByQuery', () => {
    it('creates a sql string to delete rows in a table', () => {
      expect(createDeleteByQuery('test', { id: 5 })).toBe('delete from test where id = $<id>');
    });

    it('can delete all rows in a table if there are no bindings', () => {
      expect(createDeleteByQuery('test')).toBe('delete from test');
    });
  });

  describe('createDeleteByIdQuery', () => {
    it('creates a query to delete a single row in a table by id', () => {
      expect(createDeleteByIdQuery(3, 'test')).toBe('delete from test where id = $<id>');
    });
  });
});
