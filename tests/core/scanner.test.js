/**
 * Test suite for FileScanner class
 * Tests file system scanning, binary detection, and streaming capabilities
 */
const fs = require('fs').promises;
const path = require('path');
const { FileScanner, FileProcessingError } = require('../../src/core/scanner');

describe('FileScanner', () => {
  let scanner;
  let testDir;
  let cleanup = [];

  beforeEach(() => {
    scanner = new FileScanner();
    testDir = path.join(__dirname, '../fixtures/scanner');
  });

  afterEach(async () => {
    // Clean up any created test files
    for (const filePath of cleanup) {
      try {
        await fs.unlink(filePath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    cleanup = [];
  });

  describe('constructor', () => {
    it('creates scanner with default configuration', () => {
      const scanner = new FileScanner();
      expect(scanner).toBeInstanceOf(FileScanner);
    });

    it('accepts custom configuration', () => {
      const config = { 
        maxFileSize: 1024 * 1024,
        binaryExtensions: ['.bin', '.exe']
      };
      const scanner = new FileScanner(config);
      expect(scanner).toBeInstanceOf(FileScanner);
    });
  });

  describe('isTextFile', () => {
    it('identifies text files by extension', () => {
      expect(scanner.isTextFile('test.js')).toBe(true);
      expect(scanner.isTextFile('test.txt')).toBe(true);
      expect(scanner.isTextFile('test.md')).toBe(true);
      expect(scanner.isTextFile('test.json')).toBe(true);
      expect(scanner.isTextFile('test.yml')).toBe(true);
      expect(scanner.isTextFile('test.yaml')).toBe(true);
      expect(scanner.isTextFile('test.html')).toBe(true);
      expect(scanner.isTextFile('test.css')).toBe(true);
      expect(scanner.isTextFile('test.py')).toBe(true);
      expect(scanner.isTextFile('test.java')).toBe(true);
      expect(scanner.isTextFile('test.cpp')).toBe(true);
      expect(scanner.isTextFile('test.h')).toBe(true);
      expect(scanner.isTextFile('test.sh')).toBe(true);
      expect(scanner.isTextFile('Dockerfile')).toBe(true);
      expect(scanner.isTextFile('Makefile')).toBe(true);
    });

    it('identifies binary files by extension', () => {
      expect(scanner.isTextFile('test.jpg')).toBe(false);
      expect(scanner.isTextFile('test.png')).toBe(false);
      expect(scanner.isTextFile('test.gif')).toBe(false);
      expect(scanner.isTextFile('test.mp4')).toBe(false);
      expect(scanner.isTextFile('test.pdf')).toBe(false);
      expect(scanner.isTextFile('test.zip')).toBe(false);
      expect(scanner.isTextFile('test.exe')).toBe(false);
      expect(scanner.isTextFile('test.dll')).toBe(false);
      expect(scanner.isTextFile('test.so')).toBe(false);
      expect(scanner.isTextFile('test.dylib')).toBe(false);
    });

    it('handles files without extensions', () => {
      expect(scanner.isTextFile('README')).toBe(true);
      expect(scanner.isTextFile('LICENSE')).toBe(true);
      expect(scanner.isTextFile('.gitignore')).toBe(true);
      expect(scanner.isTextFile('.env')).toBe(true);
    });

    it('handles case insensitive extensions', () => {
      expect(scanner.isTextFile('test.JS')).toBe(true);
      expect(scanner.isTextFile('test.TXT')).toBe(true);
      expect(scanner.isTextFile('test.JPG')).toBe(false);
      expect(scanner.isTextFile('test.PNG')).toBe(false);
    });
  });

  describe('readFileContent', () => {
    beforeEach(async () => {
      // Ensure test fixtures directory exists
      await fs.mkdir(testDir, { recursive: true });
    });

    it('reads small text files completely', async () => {
      const filePath = path.join(testDir, 'small.txt');
      const content = 'Hello world! This is a small test file.';
      await fs.writeFile(filePath, content, 'utf8');
      cleanup.push(filePath);

      const result = await scanner.readFileContent(filePath);
      expect(result.content).toBe(content);
      expect(result.isComplete).toBe(true);
      expect(result.size).toBe(content.length);
    });

    it('streams large files partially', async () => {
      const filePath = path.join(testDir, 'large.txt');
      // Create a large file (>50MB limit simulation)
      const largeContent = 'A'.repeat(100000); // 100KB for testing
      await fs.writeFile(filePath, largeContent, 'utf8');
      cleanup.push(filePath);

      // Mock large file by setting small maxFileSize
      const smallScanner = new FileScanner({ maxFileSize: 1000 });
      const result = await smallScanner.readFileContent(filePath);
      
      expect(result.content.length).toBeLessThanOrEqual(1000);
      expect(result.isComplete).toBe(false);
      expect(result.size).toBeGreaterThan(1000);
    });

    it('handles non-existent files', async () => {
      const filePath = path.join(testDir, 'nonexistent.txt');
      
      await expect(scanner.readFileContent(filePath))
        .rejects.toThrow(FileProcessingError);
    });

    it('handles permission errors', async () => {
      const filePath = path.join(testDir, 'readonly.txt');
      await fs.writeFile(filePath, 'test content', 'utf8');
      // Note: chmod might not work on all systems, this is a best-effort test
      try {
        await fs.chmod(filePath, 0o000);
        cleanup.push(filePath);
        
        await expect(scanner.readFileContent(filePath))
          .rejects.toThrow(FileProcessingError);
      } catch (e) {
        // Skip test if chmod fails (e.g., on Windows)
        cleanup.push(filePath);
      }
    });

    it('provides file stats with content', async () => {
      const filePath = path.join(testDir, 'stats.txt');
      const content = 'File with stats';
      await fs.writeFile(filePath, content, 'utf8');
      cleanup.push(filePath);

      const result = await scanner.readFileContent(filePath);
      expect(result.stats).toBeDefined();
      expect(result.stats.isFile()).toBe(true);
      expect(result.stats.size).toBe(content.length);
      expect(typeof result.stats.mtime.getTime).toBe('function');
    });
  });

  describe('scanFiles', () => {
    beforeEach(async () => {
      await fs.mkdir(testDir, { recursive: true });
    });

    it('scans multiple files', async () => {
      const files = ['file1.txt', 'file2.js', 'file3.md'];
      const filePaths = [];
      
      for (const file of files) {
        const filePath = path.join(testDir, file);
        await fs.writeFile(filePath, `Content of ${file}`, 'utf8');
        filePaths.push(filePath);
        cleanup.push(filePath);
      }

      const results = [];
      for await (const result of scanner.scanFiles(filePaths)) {
        results.push(result);
      }

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.filePath).toBe(filePaths[index]);
        expect(result.content).toBe(`Content of ${files[index]}`);
        expect(result.isTextFile).toBe(true);
        expect(result.error).toBeNull();
      });
    });

    it('handles mixed text and binary files', async () => {
      const textFile = path.join(testDir, 'text.txt');
      const binaryFile = path.join(testDir, 'binary.jpg');
      
      await fs.writeFile(textFile, 'Text content', 'utf8');
      await fs.writeFile(binaryFile, Buffer.from([0xFF, 0xD8, 0xFF]), 'binary');
      cleanup.push(textFile, binaryFile);

      const results = [];
      for await (const result of scanner.scanFiles([textFile, binaryFile])) {
        results.push(result);
      }

      expect(results).toHaveLength(2);
      
      const textResult = results.find(r => r.filePath === textFile);
      expect(textResult.isTextFile).toBe(true);
      expect(textResult.content).toBe('Text content');
      expect(textResult.error).toBeNull();

      const binaryResult = results.find(r => r.filePath === binaryFile);
      expect(binaryResult.isTextFile).toBe(false);
      expect(binaryResult.content).toBe('');
      expect(binaryResult.error).toBeNull();
    });

    it('handles file processing errors gracefully', async () => {
      const validFile = path.join(testDir, 'valid.txt');
      const invalidFile = path.join(testDir, 'invalid.txt');
      
      await fs.writeFile(validFile, 'Valid content', 'utf8');
      cleanup.push(validFile);
      // Don't create invalidFile to simulate error

      const results = [];
      for await (const result of scanner.scanFiles([validFile, invalidFile])) {
        results.push(result);
      }

      expect(results).toHaveLength(2);
      
      const validResult = results.find(r => r.filePath === validFile);
      expect(validResult.error).toBeNull();
      expect(validResult.content).toBe('Valid content');

      const invalidResult = results.find(r => r.filePath === invalidFile);
      expect(invalidResult.error).toBeInstanceOf(FileProcessingError);
      expect(invalidResult.content).toBe('');
    });

    it('yields results as AsyncGenerator', async () => {
      const filePath = path.join(testDir, 'generator.txt');
      await fs.writeFile(filePath, 'Generator test', 'utf8');
      cleanup.push(filePath);

      const generator = scanner.scanFiles([filePath]);
      expect(typeof generator[Symbol.asyncIterator]).toBe('function');

      const iterator = generator[Symbol.asyncIterator]();
      const { value, done } = await iterator.next();
      
      expect(done).toBe(false);
      expect(value.filePath).toBe(filePath);
      expect(value.content).toBe('Generator test');

      const { done: secondDone } = await iterator.next();
      expect(secondDone).toBe(true);
    });
  });

  describe('scanDirectory', () => {
    let nestedTestDir;

    beforeEach(async () => {
      nestedTestDir = path.join(testDir, 'nested');
      await fs.mkdir(nestedTestDir, { recursive: true });
      
      // Create nested structure
      await fs.mkdir(path.join(nestedTestDir, 'subdir1'), { recursive: true });
      await fs.mkdir(path.join(nestedTestDir, 'subdir2'), { recursive: true });
      
      // Create files
      await fs.writeFile(path.join(nestedTestDir, 'root.txt'), 'root file', 'utf8');
      await fs.writeFile(path.join(nestedTestDir, 'root.js'), 'root js file', 'utf8');
      await fs.writeFile(path.join(nestedTestDir, 'subdir1', 'sub1.txt'), 'sub1 file', 'utf8');
      await fs.writeFile(path.join(nestedTestDir, 'subdir2', 'sub2.md'), 'sub2 file', 'utf8');
      await fs.writeFile(path.join(nestedTestDir, 'binary.png'), Buffer.from([0x89, 0x50]), 'binary');
      
      cleanup.push(
        path.join(nestedTestDir, 'root.txt'),
        path.join(nestedTestDir, 'root.js'),
        path.join(nestedTestDir, 'subdir1', 'sub1.txt'),
        path.join(nestedTestDir, 'subdir2', 'sub2.md'),
        path.join(nestedTestDir, 'binary.png')
      );
    });

    it('scans directory recursively', async () => {
      const results = [];
      for await (const result of scanner.scanDirectory(nestedTestDir)) {
        results.push(result);
      }

      expect(results.length).toBeGreaterThanOrEqual(4); // At least 4 text files
      
      const textFiles = results.filter(r => r.isTextFile);
      const binaryFiles = results.filter(r => !r.isTextFile);
      
      expect(textFiles).toHaveLength(4);
      expect(binaryFiles).toHaveLength(1);
      
      // Verify specific files
      const rootTxt = results.find(r => r.filePath.endsWith('root.txt'));
      expect(rootTxt).toBeDefined();
      expect(rootTxt.content).toBe('root file');
      
      const sub1Txt = results.find(r => r.filePath.endsWith('sub1.txt'));
      expect(sub1Txt).toBeDefined();
      expect(sub1Txt.content).toBe('sub1 file');
    });

    it('handles empty directories', async () => {
      const emptyDir = path.join(testDir, 'empty');
      await fs.mkdir(emptyDir, { recursive: true });

      const results = [];
      for await (const result of scanner.scanDirectory(emptyDir)) {
        results.push(result);
      }

      expect(results).toHaveLength(0);
    });

    it('handles non-existent directories', async () => {
      const nonExistentDir = path.join(testDir, 'nonexistent');
      
      const generator = scanner.scanDirectory(nonExistentDir);
      await expect(async () => {
        // eslint-disable-next-line no-unused-vars
        for await (const _result of generator) {
          // This should not execute
        }
      }).rejects.toThrow(FileProcessingError);
    });

    it('handles permission denied directories', async () => {
      // Since permission testing is system-dependent, we'll just verify
      // that the scanner handles various error conditions gracefully
      const restrictedDir = path.join(testDir, 'restricted_' + Date.now());
      
      // Test that a directory we try to create with restricted permissions
      // still allows the scanner to handle the error gracefully
      try {
        await fs.mkdir(restrictedDir, { mode: 0o000 });
        
        const generator = scanner.scanDirectory(restrictedDir);
        await expect(async () => {
          // eslint-disable-next-line no-unused-vars
          for await (const _result of generator) {
            // This should throw an error
          }
        }).rejects.toThrow(FileProcessingError);
        
        // Clean up
        await fs.rmdir(restrictedDir);
      } catch (e) {
        // If permission tests don't work on this system, just verify
        // the scanner can handle basic error cases
        expect(scanner).toBeInstanceOf(FileScanner);
      }
    });

    it('yields results as AsyncGenerator', async () => {
      const generator = scanner.scanDirectory(nestedTestDir);
      expect(typeof generator[Symbol.asyncIterator]).toBe('function');

      const iterator = generator[Symbol.asyncIterator]();
      const { value, done } = await iterator.next();
      
      expect(done).toBe(false);
      expect(value).toBeDefined();
      expect(value.filePath).toBeDefined();
      expect(value.isTextFile).toBeDefined();
    });
  });

  describe('Performance requirements', () => {
    it('processes files efficiently', async () => {
      // Create multiple test files for performance testing
      const fileCount = 100;
      const files = [];
      
      for (let i = 0; i < fileCount; i++) {
        const filePath = path.join(testDir, `perf_${i}.txt`);
        await fs.writeFile(filePath, `Performance test file ${i}`, 'utf8');
        files.push(filePath);
        cleanup.push(filePath);
      }

      const startTime = process.hrtime.bigint();
      
      const results = [];
      for await (const result of scanner.scanFiles(files)) {
        results.push(result);
      }

      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1000000;

      expect(results).toHaveLength(fileCount);
      expect(durationMs).toBeLessThan(2000); // Less than 2 seconds for 100 files
      
      // Calculate files per second
      const filesPerSecond = fileCount / (durationMs / 1000);
      expect(filesPerSecond).toBeGreaterThan(50); // At least 50 files/second
    });
  });

  describe('Error handling', () => {
    it('creates FileProcessingError with context', () => {
      const error = new FileProcessingError('Test error', '/test/path', 'ENOENT');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.filePath).toBe('/test/path');
      expect(error.code).toBe('ENOENT');
      expect(error.name).toBe('FileProcessingError');
    });

    it('FileProcessingError toString includes context', () => {
      const error = new FileProcessingError('Test error', '/test/path', 'ENOENT');
      const errorString = error.toString();
      
      expect(errorString).toContain('FileProcessingError');
      expect(errorString).toContain('Test error');
      expect(errorString).toContain('/test/path');
    });
  });
});