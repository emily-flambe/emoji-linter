/**
 * Configuration management for emoji-linter
 */

const fs = require('fs');
const path = require('path');
const { shouldIgnoreLine, shouldIgnoreFile: shouldIgnoreFileContent } = require('../utils/ignore');

// Default configuration
const DEFAULT_CONFIG = {
  ignore: {
    files: [],
    emojis: [],
    patterns: []
  },
  output: {
    format: 'table',
    showContext: true,
    maxContextLines: 2,
    useColors: true
  },
  cleanup: {
    preserveWhitespace: false,
    createBackup: false
  }
};

/**
 * Configuration class for emoji-linter settings
 */
class Config {
  constructor(options = {}) {
    this.config = this.loadConfig(null, options);
  }

  /**
   * Load and merge configuration
   * @param {string} configPath - Optional path to config file
   * @param {object} options - Additional options to merge
   * @returns {object} Merged configuration
   * @throws {Error} When config file is invalid
   */
  loadConfig(configPath = null, options = {}) {
    // Start with defaults
    const config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    
    // Find config file if not specified
    const filePath = configPath || this.findConfigFile();
    
    if (filePath && fs.existsSync(filePath)) {
      try {
        const configContent = fs.readFileSync(filePath, 'utf8');
        const userConfig = JSON.parse(configContent);
        
        // Merge user config with defaults
        if (userConfig.ignore) {
          config.ignore = { ...config.ignore, ...userConfig.ignore };
        }
        if (userConfig.output) {
          config.output = { ...config.output, ...userConfig.output };
        }
        if (userConfig.cleanup) {
          config.cleanup = { ...config.cleanup, ...userConfig.cleanup };
        }
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw new Error(`Invalid JSON in config file: ${error.message}`);
        }
        throw new Error(`Failed to read config file: ${error.message}`);
      }
    }
    
    // Merge in constructor options
    if (options.ignore) {
      config.ignore = { ...config.ignore, ...options.ignore };
    }
    if (options.output) {
      config.output = { ...config.output, ...options.output };
    }
    if (options.cleanup) {
      config.cleanup = { ...config.cleanup, ...options.cleanup };
    }
    
    // Basic validation
    this.validateConfig(config);
    
    this.config = config;
    return config;
  }

  /**
   * Find configuration file in current directory
   * @returns {string|null} Path to config file or null if not found
   */
  findConfigFile() {
    const configFiles = ['.emoji-linter.config.json', '.emoji-linter.json'];
    
    for (const filename of configFiles) {
      const filePath = path.join(process.cwd(), filename);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        return filePath;
      }
    }
    
    return null;
  }

  /**
   * Basic configuration validation
   * @param {object} config - Configuration to validate
   * @throws {Error} When configuration is invalid
   */
  validateConfig(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('Configuration must be an object');
    }
    
    // Validate arrays are actually arrays
    const arrays = ['ignore.files', 'ignore.emojis', 'ignore.patterns'];
    arrays.forEach(path => {
      const value = this.getNestedProperty(config, path);
      if (value !== undefined && !Array.isArray(value)) {
        throw new Error(`${path} must be an array`);
      }
    });
    
    // Validate output format
    if (config.output?.format && !['table', 'json', 'minimal'].includes(config.output.format)) {
      throw new Error('Output format must be table, json, or minimal');
    }
  }

  /**
   * Get nested property from object using dot notation
   * @param {object} obj - Object to search
   * @param {string} path - Dot notation path (e.g., 'ignore.files')
   * @returns {any} Property value or undefined
   */
  getNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Check if a file should be ignored
   * @param {string} filePath - Path to the file
   * @param {string} content - File content (optional)
   * @returns {boolean} True if file should be ignored
   */
  shouldIgnoreFile(filePath, content = null) {
    // Check for inline file-level ignore comment
    if (content && shouldIgnoreFileContent(content)) {
      return true;
    }

    // Pattern matching for file paths
    const patterns = this.config.ignore?.files || [];
    
    // Handle both absolute and relative paths
    let normalizedPath;
    if (path.isAbsolute(filePath)) {
      normalizedPath = path.relative(process.cwd(), filePath);
    } else {
      normalizedPath = filePath;
    }
    normalizedPath = normalizedPath.replace(/\\/g, '/');
    
    return patterns.some(pattern => {
      // Convert glob pattern to regex - order matters!
      let regexPattern = pattern
        .replace(/\./g, '\\.')           // Escape dots first
        .replace(/\*\*\//g, '(?:.*/)?')  // **/ matches zero or more dirs
        .replace(/\/\*\*/g, '/___GLOBSTAR___')  // Mark /** for later replacement
        .replace(/\*\*/g, '___GLOBSTAR___')     // Mark ** for later replacement
        .replace(/\*/g, '[^/]*')         // * matches anything except /
        .replace(/___GLOBSTAR___/g, '.*'); // Replace marked globstars with .*
      
      return new RegExp(`^${regexPattern}$`).test(normalizedPath);
    });
  }

  /**
   * Check if an emoji should be ignored
   * @param {string} emoji - The emoji to check
   * @returns {boolean} True if emoji should be ignored
   */
  shouldIgnoreEmoji(emoji) {
    return this.config.ignore?.emojis?.includes(emoji) || false;
  }

  /**
   * Check if a line should be ignored based on inline comments
   * @param {string} line - The line to check
   * @returns {boolean} True if line should be ignored
   */
  shouldIgnoreLine(line) {
    return shouldIgnoreLine(line);
  }
}

module.exports = {
  Config
};