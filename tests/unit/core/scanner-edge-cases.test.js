/**
 * Edge case tests for FileScanner
 */

const fs = require('fs');
const { FileScanner } = require('../../../src/core/scanner');

// Mock fs module
jest.mock('fs');

describe('FileScanner - Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('scanFiles', () => {
    test('handles empty file list', async () => {
      const scanner = new FileScanner();
      const results = [];
      
      for await (const result of scanner.scanFiles([])) {
        results.push(result);
      }
      
      expect(results).toEqual([]);
    });

    test('handles file read errors gracefully', async () => {
      const scanner = new FileScanner();
      fs.readFileSync = jest.fn().mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });
      
      const results = [];
      for await (const result of scanner.scanFiles(['test.js'])) {
        results.push(result);
      }
      
      expect(results[0].error).toBeDefined();
      expect(results[0].error.message).toContain('EACCES');
    });

    test('handles non-existent files', async () => {
      const scanner = new FileScanner();
      fs.readFileSync = jest.fn().mockImplementation(() => {
        const error = new Error('ENOENT: no such file');
        error.code = 'ENOENT';
        throw error;
      });
      
      const results = [];
      for await (const result of scanner.scanFiles(['missing.js'])) {
        results.push(result);
      }
      
      expect(results[0].error).toBeDefined();
      expect(results[0].error.code).toBe('ENOENT');
    });
  });

  describe('scanDirectory', () => {
    test('handles empty directory', async () => {
      const scanner = new FileScanner();
      fs.readdirSync = jest.fn().mockReturnValue([]);
      
      const results = [];
      for await (const result of scanner.scanDirectory('./empty')) {
        results.push(result);
      }
      
      expect(results).toEqual([]);
    });

    test('handles permission errors in directory scan', async () => {
      const scanner = new FileScanner();
      fs.readdirSync = jest.fn().mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });
      
      const results = [];
      for await (const result of scanner.scanDirectory('/restricted')) {
        results.push(result);
      }
      
      expect(results).toEqual([]);
    });
  });

  describe('getFilesRecursive', () => {
    test('handles deeply nested directories', () => {
      const scanner = new FileScanner();
      
      // Mock nested directory structure
      fs.readdirSync = jest.fn()
        .mockReturnValueOnce(['subdir'])
        .mockReturnValueOnce(['file.js']);
      
      fs.statSync = jest.fn()
        .mockReturnValueOnce({ isDirectory: () => true, isFile: () => false })
        .mockReturnValueOnce({ isDirectory: () => false, isFile: () => true });
      
      const files = scanner.getFilesRecursive('./root');
      expect(files).toContain('subdir/file.js');
    });

    test('skips files with permission errors', () => {
      const scanner = new FileScanner();
      
      fs.readdirSync = jest.fn().mockReturnValue(['file1.js', 'file2.js']);
      fs.statSync = jest.fn()
        .mockImplementationOnce(() => ({ isDirectory: () => false, isFile: () => true }))
        .mockImplementationOnce(() => {
          throw new Error('EACCES');
        });
      
      const files = scanner.getFilesRecursive('./dir');
      expect(files).toHaveLength(1);
    });
  });
});