/* eslint-env jest */
import { getETag, getCount } from '../selectors';

jest.mock('../store');

describe('selectors', () => {
  describe('getETag', () => {
    it('should get an etag for a route', () => {
      expect(getETag('/items/1')).toBe('"etag1"');
      expect(getETag('/items/1/subitems')).toBe('"etag2"');
    });

    it('should return undefined if a route does not currently exist', () => {
      expect(getETag('/somethingnonexistant')).toBeUndefined();
    });
  });

  describe('getCount', () => {
    it('should be able to get a count for a route', () => {
      expect(getCount('/items')).toBe(32);
      expect(getCount('/items/1/subitems')).toBe(10);
      expect(getCount('/subitems')).toBe(0);
    });

    it('should return undefined if a route does not currently exist', () => {
      expect(getCount('/somethingnonexistant')).toBeUndefined();
    });
  });
});
