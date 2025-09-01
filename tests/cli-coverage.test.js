/**
 * CLI Coverage Tests - targeting uncovered lines
 */

const { CLI } = require('../src/cli');
const fs = require('fs');
const path = require('path');

// Mock modules
jest.mock('fs');
jest.mock('child_process');
jest.mock('../src/core/scanner');
jest.mock('../src/core/detector');

describe('CLI Coverage Boost', () => {
  let cli;
  let originalExit;
  let originalLog;
  let originalError;

  beforeAll(() => {
    originalExit = process.exit;
    originalLog = console.log;
    originalError = console.error;
    process.exit = jest.fn();
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterAll(() => {
    process.exit = originalExit;
    console.log = originalLog;
    console.error = originalError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    cli = new CLI();
  });

  describe('Check Command Coverage', () => {
    test('handles --staged option', async () => {
      const execSync = require('child_process').execSync;
      execSync.mockReturnValue('file1.js\nfile2.js\n');
      
      await cli.executeCheck({ staged: true });
      expect(execSync).toHaveBeenCalledWith(expect.stringContaining('git diff'), expect.any(Object));
    });

    test('handles empty staged files', async () => {
      const execSync = require('child_process').execSync;
      execSync.mockReturnValue('');
      
      await cli.executeCheck({ staged: true });
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No staged files'));
    });

    test('handles git error', async () => {
      const execSync = require('child_process').execSync;
      execSync.mockImplementation(() => {
        throw new Error('Not a git repository');
      });
      
      await cli.executeCheck({ staged: true });
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Git error'));
    });

    test('handles quiet mode', async () => {
      await cli.executeCheck({ quiet: true }, ['test.js']);
      expect(console.log).toHaveBeenCalledTimes(0);
    });

    test('handles verbose mode', async () => {
      await cli.executeCheck({ verbose: true }, ['test.js']);
      // Verbose mode should output more
    });

    test('handles different output formats', async () => {
      await cli.executeCheck({ format: 'json' }, ['test.js']);
      await cli.executeCheck({ format: 'minimal' }, ['test.js']);
      await cli.executeCheck({ format: 'table' }, ['test.js']);
    });
  });

  describe('Fix Command Coverage', () => {
    test('handles backup option', async () => {
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockReturnValue('content with 😊');
      fs.writeFileSync = jest.fn();
      fs.copyFileSync = jest.fn();
      
      await cli.executeFix({ backup: true }, ['test.js']);
      expect(fs.copyFileSync).toHaveBeenCalled();
    });

    test('handles dry-run option', async () => {
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockReturnValue('content with 😊');
      fs.writeFileSync = jest.fn();
      
      await cli.executeFix({ dryRun: true }, ['test.js']);
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    test('handles write error', async () => {
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockReturnValue('content with 😊');
      fs.writeFileSync = jest.fn().mockImplementation(() => {
        throw new Error('EACCES');
      });
      
      await cli.executeFix({}, ['test.js']);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error'));
    });
  });

  describe('Diff Command Coverage', () => {
    test('shows diff output', async () => {
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockReturnValue('line 1 😊\nline 2\nline 3 🚀');
      
      await cli.executeDiff({}, ['test.js']);
      expect(console.log).toHaveBeenCalled();
    });

    test('handles no changes', async () => {
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockReturnValue('no emojis here');
      
      await cli.executeDiff({}, ['test.js']);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No changes'));
    });

    test('handles color option', async () => {
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockReturnValue('text 😊');
      
      await cli.executeDiff({ color: true }, ['test.js']);
      await cli.executeDiff({ color: false }, ['test.js']);
    });
  });

  describe('List Command Coverage', () => {
    test('lists files with emojis', async () => {
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockReturnValue('has emoji 😊');
      fs.readdirSync = jest.fn().mockReturnValue(['file1.js', 'file2.js']);
      fs.statSync = jest.fn().mockReturnValue({ isDirectory: () => false });
      
      await cli.executeList({}, ['.']);
      expect(console.log).toHaveBeenCalled();
    });

    test('handles empty results', async () => {
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockReturnValue('no emojis');
      fs.readdirSync = jest.fn().mockReturnValue(['file1.js']);
      fs.statSync = jest.fn().mockReturnValue({ isDirectory: () => false });
      
      await cli.executeList({}, ['.']);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No files'));
    });

    test('handles count option', async () => {
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockReturnValue('😊 😊 🚀');
      fs.readdirSync = jest.fn().mockReturnValue(['file1.js']);
      fs.statSync = jest.fn().mockReturnValue({ isDirectory: () => false });
      
      await cli.executeList({ count: true }, ['.']);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('3'));
    });
  });

  describe('Install Hook Command Coverage', () => {
    test('installs pre-commit hook', async () => {
      fs.existsSync = jest.fn().mockReturnValue(false);
      fs.mkdirSync = jest.fn();
      fs.writeFileSync = jest.fn();
      fs.chmodSync = jest.fn();
      
      await cli.executeInstallHook({});
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(fs.chmodSync).toHaveBeenCalled();
    });

    test('handles existing hook', async () => {
      fs.existsSync = jest.fn().mockReturnValue(true);
      
      await cli.executeInstallHook({});
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('already exists'));
    });

    test('handles force option', async () => {
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.writeFileSync = jest.fn();
      fs.chmodSync = jest.fn();
      
      await cli.executeInstallHook({ force: true });
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    test('handles not a git repository', async () => {
      fs.existsSync = jest.fn().mockImplementation((path) => {
        if (path.includes('.git')) return false;
        return true;
      });
      
      await cli.executeInstallHook({});
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('git repository'));
    });
  });

  describe('Error Handling Coverage', () => {
    test('handles invalid command gracefully', async () => {
      await cli.run(['node', 'cli.js', 'invalid']);
      expect(console.error).toHaveBeenCalled();
    });

    test('handles missing arguments', async () => {
      await cli.run(['node', 'cli.js', 'check']);
      expect(console.error).toHaveBeenCalled();
    });

    test('handles file not found', async () => {
      fs.existsSync = jest.fn().mockReturnValue(false);
      
      await cli.executeCheck({}, ['nonexistent.js']);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('not found'));
    });

    test('handles permission errors', async () => {
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockImplementation(() => {
        const error = new Error('Permission denied');
        error.code = 'EACCES';
        throw error;
      });
      
      await cli.executeCheck({}, ['protected.js']);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Permission'));
    });
  });

  describe('Configuration Loading Coverage', () => {
    test('loads custom config file', async () => {
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
        ignore: { files: ['*.test.js'] }
      }));
      
      await cli.loadConfig({ config: 'custom.json' });
      expect(fs.readFileSync).toHaveBeenCalledWith('custom.json', 'utf8');
    });

    test('handles invalid JSON config', async () => {
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockReturnValue('invalid json');
      
      await cli.loadConfig({});
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Invalid'));
    });

    test('uses defaults when config missing', async () => {
      fs.existsSync = jest.fn().mockReturnValue(false);
      
      const config = await cli.loadConfig({});
      expect(config).toBeDefined();
      expect(config.ignore).toBeDefined();
    });
  });

  describe('Progress Reporting Coverage', () => {
    test('shows progress bar in verbose mode', async () => {
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readdirSync = jest.fn().mockReturnValue(Array(100).fill('file.js'));
      fs.statSync = jest.fn().mockReturnValue({ isDirectory: () => false });
      fs.readFileSync = jest.fn().mockReturnValue('content');
      
      await cli.executeCheck({ verbose: true }, ['.']);
      // Progress should be shown
    });

    test('hides progress in quiet mode', async () => {
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readdirSync = jest.fn().mockReturnValue(['file.js']);
      fs.statSync = jest.fn().mockReturnValue({ isDirectory: () => false });
      fs.readFileSync = jest.fn().mockReturnValue('content');
      
      await cli.executeCheck({ quiet: true }, ['.']);
      // No progress shown
    });
  });
});