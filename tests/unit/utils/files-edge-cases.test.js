/**
 * Edge case tests for file utilities
 */

const fs = require('fs');
const fileUtils = require('../../../src/utils/files');

describe('File Utils - Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isTextFile', () => {
    test('handles various extensions correctly', () => {
      expect(fileUtils.isTextFile('test.js')).toBe(true);
      expect(fileUtils.isTextFile('test.txt')).toBe(true);
      expect(fileUtils.isTextFile('test.md')).toBe(true);
      expect(fileUtils.isTextFile('test.jpg')).toBe(false);
      expect(fileUtils.isTextFile('test.png')).toBe(false);
      expect(fileUtils.isTextFile('Makefile')).toBe(true);
      expect(fileUtils.isTextFile('.gitignore')).toBe(true);
    });
    
    test('handles files without extensions', () => {
      expect(fileUtils.isTextFile('README')).toBe(true);
      expect(fileUtils.isTextFile('LICENSE')).toBe(true);
    });
  });

  describe('isDirectory', () => {
    const originalStatSync = fs.statSync;
    
    afterEach(() => {
      fs.statSync = originalStatSync;
    });
    
    test('returns true for directories', () => {
      fs.statSync = jest.fn().mockReturnValue({
        isDirectory: () => true
      });
      expect(fileUtils.isDirectory('/some/path')).toBe(true);
    });
    
    test('returns false for files', () => {
      fs.statSync = jest.fn().mockReturnValue({
        isDirectory: () => false
      });
      expect(fileUtils.isDirectory('/some/file.txt')).toBe(false);
    });
    
    test('returns false when path does not exist', () => {
      fs.statSync = jest.fn().mockImplementation(() => {
        throw new Error('ENOENT');
      });
      expect(fileUtils.isDirectory('/nonexistent')).toBe(false);
    });
    
    test('returns false for permission errors', () => {
      fs.statSync = jest.fn().mockImplementation(() => {
        const error = new Error('EACCES');
        error.code = 'EACCES';
        throw error;
      });
      expect(fileUtils.isDirectory('/no-access')).toBe(false);
    });
  });
});