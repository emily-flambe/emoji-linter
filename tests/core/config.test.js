const fs = require('fs');
const path = require('path');
const os = require('os');
const { Config } = require('../../src/core/config');

describe('Config', () => {
  let tempDir;
  let originalCwd;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'emoji-linter-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should create config with defaults when no options provided', () => {
      const config = new Config();
      expect(config.config.ignore.files).toEqual([]);
      expect(config.config.output.format).toBe('table');
    });

    it('should merge provided options with defaults', () => {
      const options = {
        output: { format: 'json' }
      };
      const config = new Config(options);
      
      expect(config.config.output.format).toBe('json');
      // Should still have defaults for unspecified options
      expect(config.config.ignore.files).toEqual([]);
    });

    it('should handle invalid options gracefully', () => {
      const invalidOptions = {
        output: { format: 123 } // wrong type
      };
      
      // Should throw on invalid format
      expect(() => new Config(invalidOptions)).toThrow('Output format must be');
    });
  });

  describe('loadConfig', () => {
    it('should load config from .emoji-linter.json', () => {
      const configData = {
        ignore: { files: ['custom/**'] },
        output: { format: 'json' }
      };
      fs.writeFileSync('.emoji-linter.json', JSON.stringify(configData));
      
      const config = new Config();
      config.loadConfig();
      
      expect(config.config.ignore.files).toEqual(expect.arrayContaining(['custom/**']));
      expect(config.config.output.format).toBe('json');
    });

    it('should load config from custom file path', () => {
      const configPath = path.join(tempDir, 'custom-config.json');
      const configData = {
        output: { format: 'json' }
      };
      fs.writeFileSync(configPath, JSON.stringify(configData));
      
      const config = new Config();
      config.loadConfig(configPath);
      
      expect(config.config.output.format).toBe('json');
    });

    it('should use defaults when config file does not exist', () => {
      const config = new Config();
      config.loadConfig();
      
      expect(config.config.output.format).toBe('table');
      expect(config.config.output.format).toBe('table');
    });

    it('should throw Error for invalid JSON', () => {
      fs.writeFileSync('.emoji-linter.json', '{ invalid json }');
      
      const config = new Config();
      expect(() => config.loadConfig())
        .toThrow(Error);
    });

    it('should throw Error for invalid config structure', () => {
      const invalidConfig = {
        invalid: 'config'
      };
      fs.writeFileSync('.emoji-linter.json', JSON.stringify(invalidConfig));
      
      const config = new Config();
      expect(() => config.loadConfig())
        .toThrow(Error);
    });

    it('should handle file read errors gracefully', () => {
      const config = new Config();
      // Try to load from a directory instead of file to trigger error
      expect(() => config.loadConfig('/'))
        .toThrow(Error);
    });
  });

  describe('shouldIgnoreFile', () => {
    let config;

    beforeEach(() => {
      config = new Config({
        ignore: {
          files: ['**/*.md', 'test/**', 'specific-file.js']
        }
      });
    });

    it('should return true for files matching glob patterns', () => {
      expect(config.shouldIgnoreFile('README.md')).toBe(true);
      expect(config.shouldIgnoreFile('docs/guide.md')).toBe(true);
      expect(config.shouldIgnoreFile('test/sample.js')).toBe(true);
      expect(config.shouldIgnoreFile('test/deep/nested.js')).toBe(true);
      expect(config.shouldIgnoreFile('specific-file.js')).toBe(true);
    });

    it('should return false for files not matching patterns', () => {
      expect(config.shouldIgnoreFile('src/index.js')).toBe(false);
      expect(config.shouldIgnoreFile('lib/utils.js')).toBe(false);
      expect(config.shouldIgnoreFile('package.json')).toBe(false);
    });

    it('should handle absolute paths', () => {
      const absolutePath = path.resolve(tempDir, 'README.md');
      expect(config.shouldIgnoreFile(absolutePath)).toBe(true);
    });

    it('should handle empty ignore patterns', () => {
      const emptyConfig = new Config({ ignore: { files: [] } });
      expect(emptyConfig.shouldIgnoreFile('any-file.js')).toBe(false);
    });
  });

  describe('shouldIgnoreEmoji', () => {
    it('should return true for emojis in ignore list', () => {
      const config = new Config({
        ignore: {
          emojis: ['😀', '👍', '❤️']
        }
      });
      
      expect(config.shouldIgnoreEmoji('😀')).toBe(true);
      expect(config.shouldIgnoreEmoji('👍')).toBe(true);
      expect(config.shouldIgnoreEmoji('❤️')).toBe(true);
    });

    it('should return false for emojis not in ignore list', () => {
      const config = new Config({
        ignore: {
          emojis: ['😀']
        }
      });
      
      expect(config.shouldIgnoreEmoji('👎')).toBe(false);
      expect(config.shouldIgnoreEmoji('🚀')).toBe(false);
    });

    it('should handle empty emoji ignore list', () => {
      const config = new Config({ ignore: { emojis: [] } });
      expect(config.shouldIgnoreEmoji('😀')).toBe(false);
    });
  });

  describe('shouldIgnoreLine', () => {
    let config;

    beforeEach(() => {
      config = new Config();
    });

    it('should return true for lines with emoji-linter-disable comment', () => {
      const testCases = [
        'const message = "Hello 😀"; // emoji-linter-disable',
        'console.log("👍"); /* emoji-linter-disable */',
        'const text = "Test 🚀 rocket"; // emoji-linter-disable',
        '  // emoji-linter-disable',
        '/* emoji-linter-disable */'
      ];

      testCases.forEach(line => {
        expect(config.shouldIgnoreLine(line)).toBe(true);
      });
    });

    it('should return false for lines without ignore comment', () => {
      const testCases = [
        'const message = "Hello 😀";',
        'console.log("👍");',
        'const text = "Test 🚀 rocket";',
        '// regular comment',
        '/* normal comment */',
        'const x = "emoji-linter-disable-not-comment";'
      ];

      testCases.forEach(line => {
        expect(config.shouldIgnoreLine(line)).toBe(false);
      });
    });

    it('should handle different comment styles', () => {
      expect(config.shouldIgnoreLine('text; // emoji-linter-disable')).toBe(true);
      expect(config.shouldIgnoreLine('text; /* emoji-linter-disable */')).toBe(true);
      expect(config.shouldIgnoreLine('# emoji-linter-disable')).toBe(true);
      expect(config.shouldIgnoreLine('<!-- emoji-linter-disable -->')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(config.shouldIgnoreLine('test; // EMOJI-LINTER-DISABLE')).toBe(true);
      expect(config.shouldIgnoreLine('test; // Emoji-Linter-Disable')).toBe(true);
    });
  });


  describe('validation', () => {
    it('should validate output config', () => {
      const invalidConfig = { output: { format: 'invalid-format' } };
      expect(() => new Config(invalidConfig)).toThrow('Output format must be');
    });
  });

  describe('file ignore with inline comments', () => {
    it('should handle file-level ignore comment', () => {
      const content = `// emoji-linter-disable-file
const message = "Hello 😀";
const greeting = "Hi 👋";`;
      
      const config = new Config();
      expect(config.shouldIgnoreFile('test.js', content)).toBe(true);
    });

    it('should not ignore file without file-level comment', () => {
      const content = `const message = "Hello 😀";
const greeting = "Hi 👋";`;
      
      const config = new Config();
      expect(config.shouldIgnoreFile('test.js', content)).toBe(false);
    });

    it('should handle different file-level comment styles', () => {
      const testCases = [
        '/* emoji-linter-disable-file */',
        '// emoji-linter-disable-file',
        '# emoji-linter-disable-file',
        '<!-- emoji-linter-disable-file -->'
      ];
      
      const config = new Config();
      
      testCases.forEach(comment => {
        const content = `${comment}\nconst test = "😀";`;
        expect(config.shouldIgnoreFile('test.js', content)).toBe(true);
      });
    });
  });
});

describe('Error', () => {
  it('should be instance of Error', () => {
    const error = new Error('test message');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('Error');
    expect(error.message).toBe('test message');
  });
});

describe('Error', () => {
  it('should be instance of Error', () => {
    const error = new Error('validation failed');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('Error');
    expect(error.message).toBe('validation failed');
  });
});