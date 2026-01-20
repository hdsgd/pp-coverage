import { getValueByPath } from '../../src/utils/objectHelpers';

describe('objectHelpers', () => {
  describe('getValueByPath', () => {
    it('should get simple value from data', () => {
      const data = { name: 'John' };
      expect(getValueByPath(data, 'name')).toBe('John');
    });

    it('should get nested value', () => {
      const data = { user: { address: { city: 'NYC' } } };
      expect(getValueByPath(data, 'user.address.city')).toBe('NYC');
    });

    it('should return undefined for missing path', () => {
      const data = { user: { name: 'John' } };
      expect(getValueByPath(data, 'user.email')).toBeUndefined();
    });

    it('should return undefined when object is null', () => {
      expect(getValueByPath(null, 'path')).toBeUndefined();
    });

    it('should return undefined when object is undefined', () => {
      expect(getValueByPath(undefined, 'path')).toBeUndefined();
    });

    it('should return undefined when path is empty', () => {
      const data = { name: 'John' };
      expect(getValueByPath(data, '')).toBeUndefined();
    });

    it('should handle deeply nested paths', () => {
      const data = { a: { b: { c: { d: { e: 'value' } } } } };
      expect(getValueByPath(data, 'a.b.c.d.e')).toBe('value');
    });

    it('should return undefined for path with null in middle', () => {
      const data = { user: { address: null } };
      expect(getValueByPath(data, 'user.address.city')).toBeUndefined();
    });

    it('should handle numeric values', () => {
      const data = { count: 42, nested: { value: 0 } };
      expect(getValueByPath(data, 'count')).toBe(42);
      expect(getValueByPath(data, 'nested.value')).toBe(0);
    });

    it('should handle boolean values', () => {
      const data = { isActive: true, nested: { flag: false } };
      expect(getValueByPath(data, 'isActive')).toBe(true);
      expect(getValueByPath(data, 'nested.flag')).toBe(false);
    });

    it('should handle array access', () => {
      const data = { items: ['a', 'b', 'c'] };
      expect(getValueByPath(data, 'items.0')).toBe('a');
      expect(getValueByPath(data, 'items.2')).toBe('c');
    });

    it('should handle object in array', () => {
      const data = { users: [{ name: 'John' }, { name: 'Jane' }] };
      expect(getValueByPath(data, 'users.0.name')).toBe('John');
      expect(getValueByPath(data, 'users.1.name')).toBe('Jane');
    });
  });
});
