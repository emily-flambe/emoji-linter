/**
 * Tests for CLI git integration features
 */

const { CLI } = require('../../../src/cli');
const { execSync } = require('child_process');
const fs = require('fs');

// Mock modules
jest.mock('child_process');
jest.mock('fs');

describe('CLI - Git Integration', () => {
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

  describe('getStagedFiles', () => {
    test('gets staged files correctly', async () => {
      execSync.mockReturnValue('file1.js\nfile2.js\n');
      
      const files = await cli.getStagedFiles();
      expect(execSync).toHaveBeenCalledWith(
        'git diff --cached --name-only',
        expect.any(Object)
      );
      expect(files).toEqual(['file1.js', 'file2.js']);
    });

    test('handles empty staged files', async () => {
      execSync.mockReturnValue('');
      
      const files = await cli.getStagedFiles();
      expect(files).toEqual([]);
    });

    test('handles git not being available', async () => {
      execSync.mockImplementation(() => {
        const error = new Error('Command not found: git');
        error.code = 'ENOENT';
        throw error;
      });
      
      await expect(cli.getStagedFiles()).rejects.toThrow();
    });

    test('handles not being in a git repository', async () => {
      execSync.mockImplementation(() => {
        const error = new Error('fatal: not a git repository');
        error.stderr = 'fatal: not a git repository';
        throw error;
      });
      
      await expect(cli.getStagedFiles()).rejects.toThrow();
    });
  });

  describe('install-hook command', () => {
    test('installs pre-commit hook successfully', async () => {
      execSync.mockReturnValue('.git'); // Mock git rev-parse
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.writeFileSync = jest.fn();
      fs.chmodSync = jest.fn();
      
      await cli.installHook();
      
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.git/hooks/pre-commit'),
        expect.any(String)
      );
      expect(fs.chmodSync).toHaveBeenCalledWith(
        expect.stringContaining('.git/hooks/pre-commit'),
        '755'
      );
    });

    test('handles missing git repository', async () => {
      execSync.mockImplementation(() => {
        throw new Error('Not a git repository');
      });
      
      await expect(cli.installHook()).rejects.toThrow('Not in a git repository');
    });
  });

  describe('checkMode with --staged', () => {
    test('processes staged files correctly', async () => {
      execSync.mockReturnValue('file1.js\nfile2.js\n');
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockReturnValue('no emojis');
      
      await cli.checkMode([], { staged: true });
      
      expect(execSync).toHaveBeenCalledWith(
        'git diff --cached --name-only',
        expect.any(Object)
      );
    });

    test('shows message when no staged files', async () => {
      execSync.mockReturnValue('');
      
      await cli.checkMode([], { staged: true });
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No staged files')
      );
    });
  });
});