/**
 * Tests for custom error classes
 */

const { ValidationError, FileError } = require('../../../src/utils/errors');

describe('Error Classes', () => {
  describe('ValidationError', () => {
    test('creates error with correct properties', () => {
      const error = new ValidationError('Invalid configuration');
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Invalid configuration');
    });
    
    test('maintains stack trace', () => {
      const error = new ValidationError('test');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ValidationError');
    });
  });

  describe('FileError', () => {
    test('creates error with correct properties', () => {
      const error = new FileError('File not found', '/path/to/file');
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('FileError');
      expect(error.message).toBe('File not found');
      expect(error.filePath).toBe('/path/to/file');
    });
    
    test('can include error code', () => {
      const error = new FileError('Permission denied', '/path/to/file', 'EACCES');
      expect(error.code).toBe('EACCES');
      expect(error.filePath).toBe('/path/to/file');
    });
  });
});