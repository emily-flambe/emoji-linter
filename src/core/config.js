/**
 * Configuration management for emoji-linter
 */

const fs = require('fs');
const path = require('path');
const { minimatch } = require('minimatch');
const ignore = require('ignore');

const DEFAULT_CONFIG = {
  ignore: {
    files: [
      '**/node_modules/**',
      '**/.git/**', 
      '**/dist/**',
      '**/build/**',
      '**/coverage/**'
    ],
    emojis: [],
    patterns: []
  },
  output: {
    format: 'table',
    useColors: process.stdout.isTTY
  }
};

/**
 * Configuration class for emoji-linter settings
 */
class Config {
  constructor(configPath) {
    if (process.env.DEBUG_IGNORE || process.env.DEBUG_CONFIG) {
      console.log('=== Config Constructor ===');
      console.log('Config path passed to constructor:', configPath);
    }
    this.config = this.loadConfig(configPath);
    // Initialize the ignore instance with patterns
    this.ig = ignore();
    if (this.config.ignore?.files) {
      if (process.env.DEBUG_IGNORE) {
        console.log('Loading ignore patterns:', this.config.ignore.files);
      }
      this.ig.add(this.config.ignore.files);
    }
  }

  /**
   * Load configuration from file
   * @param {string} [configPath] - Path to config file
   * @returns {Object} Configuration object
   */
  loadConfig(configPath) {
    // Always resolve config from current working directory
    if (!configPath) {
      configPath = '.emoji-linter.config.json';
    }
    
    // Special handling for relative paths to avoid ncc bundling issues
    let resolvedPath;
    if (path.isAbsolute(configPath)) {
      resolvedPath = configPath;
    } else {
      // Use path.join instead of path.resolve to avoid ncc issues
      resolvedPath = path.join(process.cwd(), configPath);
    }

    if (process.env.DEBUG_IGNORE || process.env.DEBUG_CONFIG) {
      console.log('=== Config Resolution Debug ===');
      console.log('Config path passed to loadConfig:', configPath);
      console.log('Current working directory:', process.cwd());
      console.log('Resolved config path:', resolvedPath);
    }

    if (!fs.existsSync(resolvedPath)) {
      if (process.env.DEBUG_CONFIG || process.env.DEBUG_IGNORE) {
        console.log('Config file not found:', resolvedPath);
      }
      return DEFAULT_CONFIG;
    }
    
    configPath = resolvedPath;

    try {
      const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (process.env.DEBUG_CONFIG || process.env.DEBUG_IGNORE) {
        console.log('Loaded config from:', configPath);
        console.log('Ignore patterns:', userConfig.ignore?.files?.length || 0);
      }
      return {
        ignore: { ...DEFAULT_CONFIG.ignore, ...userConfig.ignore },
        output: { ...DEFAULT_CONFIG.output, ...userConfig.output }
      };
    } catch (error) {
      throw new Error(`Invalid config file: ${error.message}`);
    }
  }

  /**
   * Check if file should be ignored
   * @param {string} filePath - File path to check
   * @param {string} [content] - File content (unused, for CLI compatibility)
   * @returns {boolean} True if file should be ignored
   */
  shouldIgnoreFile(filePath, content) {
    // Normalize path: remove leading ./ and convert backslashes
    let normalized = filePath.replace(/\\/g, '/');
    if (normalized.startsWith('./')) {
      normalized = normalized.slice(2);
    }
    
    // Use ignore package for gitignore-style matching
    return this.ig.ignores(normalized);
  }
  
  /**
   * Check if directory should be ignored (not traversed)
   * @param {string} dirPath - Directory path to check
   * @returns {boolean} True if directory should be skipped
   */
  shouldIgnoreDirectory(dirPath) {
    // Normalize path
    let normalized = dirPath.replace(/\\/g, '/');
    if (normalized.startsWith('./')) {
      normalized = normalized.slice(2);
    }
    
    if (process.env.DEBUG_IGNORE) {
      console.log(`Checking directory: ${normalized}`);
    }
    
    // Check if the directory itself should be ignored
    if (this.ig.ignores(normalized)) {
      if (process.env.DEBUG_IGNORE) {
        console.log(`  → Directory ignored by exact match`);
      }
      return true;
    }
    
    // Check if all files in this directory would be ignored
    // This handles patterns like "node_modules/**" 
    const testFile = normalized + '/test.file';
    const result = this.ig.ignores(testFile);
    
    if (process.env.DEBUG_IGNORE) {
      console.log(`  → Test file ${testFile}: ${result ? 'ignored' : 'not ignored'}`);
    }
    
    return result;
  }

  /**
   * Check if emoji should be ignored
   * @param {string} emoji - Emoji to check
   * @returns {boolean} True if emoji should be ignored
   */
  shouldIgnoreEmoji(emoji) {
    const ignored = this.config.ignore?.emojis || [];
    return ignored.includes(emoji);
  }

  /**
   * Check if line should be ignored based on ignore comments
   * @param {string} line - Line content
   * @returns {boolean} True if line should be ignored
   */
  shouldIgnoreLine(line) {
    return line.includes('emoji-linter-ignore-line') || 
           line.includes('emoji-linter-ignore-next-line');
  }
}

module.exports = { Config };