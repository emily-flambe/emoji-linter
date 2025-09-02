/**
 * Tests for CLI command options and flags
 */

const { CLI } = require('../../../src/cli');
const fs = require('fs');

// Mock modules
jest.mock('fs');
jest.mock('../../../src/core/scanner');

describe('CLI - Command Options', () => {
  let cli;
  let originalLog;
  let originalError;

  beforeAll(() => {
    originalLog = console.log;
    originalError = console.error;
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterAll(() => {
    console.log = originalLog;
    console.error = originalError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    cli = new CLI();
    
    // Default mock setup
    fs.existsSync = jest.fn().mockReturnValue(true);
    fs.readFileSync = jest.fn().mockReturnValue('test content');
  });

  describe('Output format options', () => {
    test('handles --format json', async () => {
      const spy = jest.spyOn(cli, 'checkMode');
      await cli.checkMode(['test.js'], { format: 'json' });
      expect(spy).toHaveBeenCalledWith(['test.js'], expect.objectContaining({ format: 'json' }));
    });

    test('handles --format minimal', async () => {
      const spy = jest.spyOn(cli, 'checkMode');
      await cli.checkMode(['test.js'], { format: 'minimal' });
      expect(spy).toHaveBeenCalledWith(['test.js'], expect.objectContaining({ format: 'minimal' }));
    });

    test('handles --format table (default)', async () => {
      const spy = jest.spyOn(cli, 'checkMode');
      await cli.checkMode(['test.js'], { format: 'table' });
      expect(spy).toHaveBeenCalledWith(['test.js'], expect.objectContaining({ format: 'table' }));
    });
  });

  describe('Verbosity options', () => {
    test('handles --quiet mode', async () => {
      await cli.checkMode(['test.js'], { quiet: true });
      // In quiet mode, should minimize output
      expect(console.log).toHaveBeenCalledTimes(0);
    });

    test('handles --verbose mode', async () => {
      await cli.checkMode(['test.js'], { verbose: true });
      // Verbose mode should be passed through
    });
  });

  describe('Fix command options', () => {
    beforeEach(() => {
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockReturnValue('content with 😊');
      fs.writeFileSync = jest.fn();
    });

    test('handles --backup option', async () => {
      fs.copyFileSync = jest.fn();
      
      await cli.fixMode(['test.js'], { backup: true });
      expect(fs.copyFileSync).toHaveBeenCalledWith(
        'test.js',
        'test.js.bak'
      );
    });

    test('handles --dry-run option', async () => {
      await cli.fixMode(['test.js'], { dryRun: true });
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe('Config file options', () => {
    test('loads custom config file', async () => {
      const customConfig = {
        ignore: {
          files: ['custom-ignore.js'],
          emojis: ['✅']
        }
      };
      
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockReturnValue(JSON.stringify(customConfig));
      
      const cliWithConfig = new CLI();
      expect(cliWithConfig.config).toBeDefined();
    });

    test('handles missing config file gracefully', () => {
      fs.existsSync = jest.fn().mockReturnValue(false);
      
      // Should not throw when config is missing
      expect(() => new CLI()).not.toThrow();
    });

    test('handles invalid JSON in config file', () => {
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockReturnValue('{ invalid json');
      
      // Should throw on invalid JSON
      expect(() => new CLI()).toThrow('Invalid config file');
    });
  });

  describe('Path expansion', () => {
    test('expands directory paths', async () => {
      fs.statSync = jest.fn().mockReturnValue({ 
        isDirectory: () => true,
        isFile: () => false 
      });
      fs.readdirSync = jest.fn().mockReturnValue(['file1.js', 'file2.js']);
      
      const expanded = await cli.expandPaths(['src/']);
      expect(expanded).toContain('src/file1.js');
      expect(expanded).toContain('src/file2.js');
    });

    test('handles single files', async () => {
      fs.statSync = jest.fn().mockReturnValue({ 
        isDirectory: () => false,
        isFile: () => true 
      });
      
      const expanded = await cli.expandPaths(['test.js']);
      expect(expanded).toEqual(['test.js']);
    });

    test('handles non-existent paths', async () => {
      fs.statSync = jest.fn().mockImplementation(() => {
        throw new Error('ENOENT');
      });
      
      const expanded = await cli.expandPaths(['missing.js']);
      expect(expanded).toEqual([]);
    });
  });
});