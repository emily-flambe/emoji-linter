/**
 * Comprehensive test suite for CLI interface
 * Following TDD approach - tests written before implementation
 */

/* eslint-disable no-console */

const fs = require('fs');
const { CLI } = require('../src/cli');
const { ValidationError } = require('../src/utils/errors');
const detector = require('../src/core/detector');

// Mock the detector module
jest.mock('../src/core/detector');

// Mock data for testing
const mockEmojiDetections = [
  {
    emoji: '🎉',
    type: 'unicode',
    lineNumber: 1,
    columnNumber: 11
  },
  {
    emoji: '😊',
    type: 'unicode',
    lineNumber: 2,
    columnNumber: 5
  }
];

const mockScanResult = {
  filePath: '/test/file.js',
  content: 'const msg = 🎉;\nconst hello = :smile:;',
  isTextFile: true,
  isComplete: true,
  size: 100,
  stats: { size: 100, mtime: new Date() },
  error: null
};

describe('CLI Class', () => {
  let cli;
  let originalArgv;
  let originalExit;
  let originalConsoleLog;
  let originalConsoleError;
  let consoleOutput;
  let consoleErrors;
  let exitCode;

  beforeEach(() => {
    // Reset mocks
    consoleOutput = [];
    consoleErrors = [];
    exitCode = null;

    // Mock process.argv
    originalArgv = process.argv;
    
    // Mock process.exit
    originalExit = process.exit;
    process.exit = jest.fn((code) => {
      exitCode = code;
    });

    // Mock console methods
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    console.log = jest.fn((...args) => consoleOutput.push(args.join(' ')));
    console.error = jest.fn((...args) => consoleErrors.push(args.join(' ')));

    // Create CLI instance
    cli = new CLI();
  });

  afterEach(() => {
    // Restore original methods
    process.argv = originalArgv;
    process.exit = originalExit;
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    
    // Restore all mocked functions
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    test('should create CLI instance with default config', () => {
      expect(cli).toBeInstanceOf(CLI);
      expect(cli.config).toBeDefined();
      expect(cli.scanner).toBeDefined();
      expect(cli.formatter).toBeDefined();
    });

    test('should accept custom config', () => {
      const customConfig = { 
        output: { format: 'json' }
      };
      const cliWithConfig = new CLI(customConfig);
      expect(cliWithConfig.config.config.output.format).toBe('json');
    });
  });

  describe('Argument Parsing', () => {
    test('should parse check command', () => {
      const args = ['check', 'file.js'];
      const parsed = cli.parseArguments(args);
      
      expect(parsed.command).toBe('check');
      expect(parsed.files).toContain('file.js');
    });

    test('should parse fix command', () => {
      const args = ['fix', 'file.js', '--backup'];
      const parsed = cli.parseArguments(args);
      
      expect(parsed.command).toBe('fix');
      expect(parsed.files).toContain('file.js');
      expect(parsed.options.backup).toBe(true);
    });

    test('should parse diff command', () => {
      const args = ['diff', 'file.js'];
      const parsed = cli.parseArguments(args);
      
      expect(parsed.command).toBe('diff');
      expect(parsed.files).toContain('file.js');
    });

    test('should parse list command', () => {
      const args = ['list', 'src/'];
      const parsed = cli.parseArguments(args);
      
      expect(parsed.command).toBe('list');
      expect(parsed.files).toContain('src/');
    });

    test('should parse output format flags', () => {
      const args = ['check', 'file.js', '--format', 'json'];
      const parsed = cli.parseArguments(args);
      
      expect(parsed.options.format).toBe('json');
    });

    test('should parse multiple files', () => {
      const args = ['check', 'file1.js', 'file2.js', 'file3.js'];
      const parsed = cli.parseArguments(args);
      
      expect(parsed.files).toEqual(['file1.js', 'file2.js', 'file3.js']);
    });

    test('should parse config file flag', () => {
      // Mock fs.existsSync for config file validation
      jest.spyOn(fs, 'existsSync').mockReturnValueOnce(true);
      
      const args = ['check', 'file.js', '--config', '.emoji-linter-config.json'];
      const parsed = cli.parseArguments(args);
      
      expect(parsed.options.config).toBe('.emoji-linter-config.json');
      
      fs.existsSync.mockRestore();
    });

    test('should parse verbose flag', () => {
      const args = ['check', 'file.js', '--verbose'];
      const parsed = cli.parseArguments(args);
      
      expect(parsed.options.verbose).toBe(true);
    });

    test('should parse quiet flag', () => {
      const args = ['check', 'file.js', '--quiet'];
      const parsed = cli.parseArguments(args);
      
      expect(parsed.options.quiet).toBe(true);
    });

    test('should handle help flag', () => {
      const args = ['--help'];
      const parsed = cli.parseArguments(args);
      
      expect(parsed.command).toBe('help');
    });

    test('should handle version flag', () => {
      const args = ['--version'];
      const parsed = cli.parseArguments(args);
      
      expect(parsed.command).toBe('version');
    });

    test('should throw error for invalid command', () => {
      const args = ['invalid-command', 'file.js'];
      
      expect(() => cli.parseArguments(args)).toThrow(ValidationError);
    });

    test('should throw error when no files provided', () => {
      const args = ['check'];
      
      expect(() => cli.parseArguments(args)).toThrow(ValidationError);
    });
  });

  describe('Check Mode', () => {
    test('should detect emojis in files and display results', async () => {
      // Mock scanner to return test data
      cli.scanner.scanFiles = jest.fn(async function* () {
        yield { ...mockScanResult };
      });

      // Mock detector function to return test detections
      detector.findEmojis.mockReturnValue(mockEmojiDetections);

      await cli.checkMode(['test-file.js'], { format: 'table' });

      expect(cli.scanner.scanFiles).toHaveBeenCalledWith(['test-file.js']);
      expect(detector.findEmojis).toHaveBeenCalledWith(mockScanResult.content);
      expect(consoleOutput.length).toBeGreaterThan(0);
      expect(exitCode).toBe(1); // Should exit with 1 when emojis found
    });

    test('should exit with 0 when no emojis found', async () => {
      cli.scanner.scanFiles = jest.fn(async function* () {
        yield { ...mockScanResult, content: 'const msg = "hello";' };
      });

      detector.findEmojis.mockReturnValue([]);

      await cli.checkMode(['test-file.js'], {});

      expect(exitCode).toBe(0);
    });

    test('should handle file processing errors gracefully', async () => {
      const fileError = new Error('Permission denied');
      fileError.code = 'EACCES';

      cli.scanner.scanFiles = jest.fn(async function* () {
        yield {
          filePath: 'test-file.js',
          content: '',
          isTextFile: true,
          isComplete: false,
          size: 0,
          stats: null,
          error: new (require('../src/utils/errors')).FileError('Permission denied', 'test-file.js', 'EACCES')
        };
      });

      await cli.checkMode(['test-file.js'], {});

      expect(consoleErrors.length).toBeGreaterThan(0);
      expect(consoleErrors[0]).toContain('Permission denied');
    });

    test('should respect ignore patterns', async () => {
      cli.scanner.scanFiles = jest.fn(async function* () {
        yield { 
          ...mockScanResult, 
          content: 'const msg = 🎉; // emoji-linter-ignore-line'
        };
      });

      // Return emojis that would normally be detected
      detector.findEmojis.mockReturnValue([{
        emoji: '🎉',
        type: 'unicode',
        lineNumber: 1,
        columnNumber: 13
      }]);
      
      // Mock shouldIgnoreLine to return true for lines with ignore comment
      cli.config.shouldIgnoreLine = jest.fn().mockReturnValue(true);

      await cli.checkMode(['test-file.js'], {});

      expect(exitCode).toBe(0); // Should ignore the line
    });

    test('should output in JSON format', async () => {
      cli.scanner.scanFiles = jest.fn(async function* () {
        yield { ...mockScanResult };
      });

      detector.findEmojis.mockReturnValue(mockEmojiDetections);

      await cli.checkMode(['test-file.js'], { format: 'json' });

      const output = consoleOutput.join('');
      expect(() => JSON.parse(output)).not.toThrow();
      
      const parsed = JSON.parse(output);
      expect(parsed).toHaveProperty('files');
      expect(parsed).toHaveProperty('summary');
    });

    test('should handle minimal output format', async () => {
      cli.scanner.scanFiles = jest.fn(async function* () {
        yield { ...mockScanResult };
      });

      detector.findEmojis.mockReturnValue(mockEmojiDetections);

      await cli.checkMode(['test-file.js'], { format: 'minimal' });

      expect(consoleOutput.length).toBeGreaterThan(0);
      // Minimal format should be concise
      expect(consoleOutput.join('').length).toBeLessThan(200);
    });
  });

  describe('Fix Mode', () => {
    test('should remove emojis from files', async () => {
      const originalContent = 'const msg = 🎉;\nconst hello = :smile:;';
      const fixedContent = 'const msg = ;\nconst hello = ;';

      cli.scanner.scanFiles = jest.fn(async function* () {
        yield { ...mockScanResult, content: originalContent };
      });

      detector.removeEmojis.mockReturnValue(fixedContent);

      // Mock fs.writeFileSync
      const writeFileMock = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

      await cli.fixMode(['test-file.js'], {});

      expect(detector.removeEmojis).toHaveBeenCalledWith(originalContent);
      expect(writeFileMock).toHaveBeenCalledWith('/test/file.js', fixedContent, 'utf8');
      expect(consoleOutput.some(line => line.includes('Fixed'))).toBe(true);

      writeFileMock.mockRestore();
    });

    test('should create backup when --backup flag is used', async () => {
      const originalContent = 'const msg = 🎉;';
      const fixedContent = 'const msg = ;';

      cli.scanner.scanFiles = jest.fn(async function* () {
        yield { ...mockScanResult, content: originalContent };
      });

      detector.removeEmojis.mockReturnValue(fixedContent);

      const writeFileMock = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      const copyFileMock = jest.spyOn(fs, 'copyFileSync').mockImplementation(() => {});

      await cli.fixMode(['test-file.js'], { backup: true });

      expect(copyFileMock).toHaveBeenCalledWith(
        '/test/file.js', 
        '/test/file.js.bak'
      );
      expect(writeFileMock).toHaveBeenCalledWith('/test/file.js', fixedContent, 'utf8');

      writeFileMock.mockRestore();
      copyFileMock.mockRestore();
    });

    test('should not modify files when no emojis found', async () => {
      const content = 'const msg = "hello";';
      
      cli.scanner.scanFiles = jest.fn(async function* () {
        yield { ...mockScanResult, content };
      });

      // Mock findEmojis to return no emojis
      detector.findEmojis.mockReturnValue([]);
      // Mock removeEmojis to return the same content (no changes)
      detector.removeEmojis.mockReturnValue(content);

      const writeFileMock = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

      await cli.fixMode(['test-file.js'], { verbose: true });

      // Since content is unchanged, file should not be written
      expect(writeFileMock).not.toHaveBeenCalled();

      writeFileMock.mockRestore();
    });
  });

  describe('Diff Mode', () => {
    test('should show differences when emojis would be removed', async () => {
      const originalContent = 'const msg = 🎉;\nconst hello = :smile:;';
      const fixedContent = 'const msg = ;\nconst hello = ;';

      cli.scanner.scanFiles = jest.fn(async function* () {
        yield { ...mockScanResult, content: originalContent };
      });

      detector.removeEmojis.mockReturnValue(fixedContent);

      await cli.diffMode(['test-file.js'], { format: 'table' });

      expect(consoleOutput.length).toBeGreaterThan(0);
      expect(consoleOutput.some(line => line.includes('---') || line.includes('+++')))
        .toBe(true);
    });

    test('should show no differences when no emojis found', async () => {
      const content = 'const msg = "hello";';

      cli.scanner.scanFiles = jest.fn(async function* () {
        yield { ...mockScanResult, content };
      });

      detector.removeEmojis.mockReturnValue(content);

      await cli.diffMode(['test-file.js'], {});

      expect(consoleOutput.some(line => line.includes('No differences'))).toBe(true);
    });
  });

  describe('List Mode', () => {
    test('should list all files that contain emojis', async () => {
      cli.scanner.scanFiles = jest.fn(async function* () {
        yield { ...mockScanResult };
        yield { 
          ...mockScanResult, 
          filePath: '/test/another.js',
          content: 'no emojis here'
        };
      });

      detector.findEmojis
        .mockReturnValueOnce(mockEmojiDetections)
        .mockReturnValueOnce([]);

      await cli.listMode(['test-dir/'], { format: 'table' });

      expect(consoleOutput.length).toBeGreaterThan(0);
      expect(consoleOutput.some(line => line.includes('/test/file.js'))).toBe(true);
      expect(consoleOutput.some(line => line.includes('/test/another.js'))).toBe(false);
    });

    test('should show summary with counts', async () => {
      cli.scanner.scanFiles = jest.fn(async function* () {
        yield { ...mockScanResult };
      });

      detector.findEmojis.mockReturnValue(mockEmojiDetections);

      await cli.listMode(['test-file.js'], {});

      expect(consoleOutput.some(line => 
        line.includes('Total files with emojis:')
      )).toBe(true);
    });
  });

  describe('Help and Version', () => {
    test('should display help message', () => {
      cli.showHelp();

      expect(consoleOutput.length).toBeGreaterThan(0);
      expect(consoleOutput.some(line => line.includes('Usage:'))).toBe(true);
      expect(consoleOutput.some(line => line.includes('Commands:'))).toBe(true);
      expect(consoleOutput.some(line => line.includes('Options:'))).toBe(true);
    });

    test('should display version', () => {
      const packageJson = require('../package.json');
      
      cli.showVersion();

      expect(consoleOutput.some(line => line.includes(packageJson.version))).toBe(true);
    });
  });

  describe('Main Run Method', () => {
    test('should execute check command from arguments', async () => {
      process.argv = ['node', 'cli.js', 'check', 'test-file.js'];

      cli.scanner.scanFiles = jest.fn(async function* () {
        yield { ...mockScanResult };
      });

      detector.findEmojis.mockReturnValue([]);

      await cli.run();

      expect(exitCode).toBe(0);
    });

    test('should handle CLI errors gracefully', async () => {
      process.argv = ['node', 'cli.js', 'invalid-command'];

      await cli.run();

      expect(exitCode).toBe(1);
      expect(consoleErrors.length).toBeGreaterThan(0);
    });

    test('should handle file errors gracefully', async () => {
      process.argv = ['node', 'cli.js', 'check', 'nonexistent-file.js'];

      // eslint-disable-next-line require-yield
      cli.scanner.scanFiles = jest.fn(async function* () {
        throw new (require('../src/utils/errors')).FileError(
          'File not found', 
          'nonexistent-file.js', 
          'ENOENT'
        );
      });

      await cli.run();

      expect(exitCode).toBe(1);
      expect(consoleErrors.length).toBeGreaterThan(0);
    });

  });

  describe('Performance Requirements', () => {
    test('should process 1000+ files quickly', async () => {
      const start = Date.now();
      
      // Mock 1000 files
      const files = Array.from({ length: 1000 }, (_, i) => `file${i}.js`);
      
      cli.scanner.scanFiles = jest.fn(async function* () {
        for (let i = 0; i < 1000; i++) {
          yield {
            filePath: `file${i}.js`,
            content: 'const msg = "hello";',
            isTextFile: true,
            isComplete: true,
            size: 20,
            stats: { size: 20, mtime: new Date() },
            error: null
          };
        }
      });

      detector.findEmojis.mockReturnValue([]);

      await cli.checkMode(files, {});

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(2000); // Less than 2 seconds
    }, 5000);
  });

  describe('Error Handling', () => {
    test('should handle EACCES permission errors', async () => {
      cli.scanner.scanFiles = jest.fn(async function* () {
        yield {
          filePath: 'restricted-file.js',
          content: '',
          isTextFile: true,
          isComplete: false,
          size: 0,
          stats: null,
          error: new (require('../src/utils/errors')).FileError(
            'Permission denied', 
            'restricted-file.js', 
            'EACCES'
          )
        };
      });

      await cli.checkMode(['restricted-file.js'], {});

      expect(consoleErrors.some(line => line.includes('Permission denied'))).toBe(true);
    });

  });

  describe('Output Formatting', () => {
    test('should format table output correctly', async () => {
      cli.scanner.scanFiles = jest.fn(async function* () {
        yield { ...mockScanResult };
      });

      detector.findEmojis.mockReturnValue(mockEmojiDetections);

      await cli.checkMode(['test-file.js'], { format: 'table' });

      const output = consoleOutput.join('\n');
      expect(output).toMatch(/\|.*\|.*\|/); // Table format with pipes
    });

    test('should format JSON output correctly', async () => {
      cli.scanner.scanFiles = jest.fn(async function* () {
        yield { ...mockScanResult };
      });

      detector.findEmojis.mockReturnValue(mockEmojiDetections);

      await cli.checkMode(['test-file.js'], { format: 'json' });

      const output = consoleOutput.join('');
      const parsed = JSON.parse(output);
      
      expect(parsed).toHaveProperty('files');
      expect(parsed).toHaveProperty('summary');
      expect(Array.isArray(parsed.files)).toBe(true);
    });

    test('should format minimal output correctly', async () => {
      cli.scanner.scanFiles = jest.fn(async function* () {
        yield { ...mockScanResult };
      });

      detector.findEmojis.mockReturnValue(mockEmojiDetections);

      await cli.checkMode(['test-file.js'], { format: 'minimal' });

      const output = consoleOutput.join('\n');
      // Minimal format should be concise - just file:line:column
      expect(output).toMatch(/file\.js:\d+:\d+/);
    });
  });
});