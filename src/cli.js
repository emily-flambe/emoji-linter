/**
 * CLI Class for emoji-linter
 * Simplified interface with only check and fix commands
 */

/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const { Config } = require('./core/config');
const { findEmojis, removeEmojis } = require('./core/detector');
const { FileScanner } = require('./core/scanner');
const { 
  ValidationError,
  formatError,
  formatSuccess,
  formatInfo,
  handleError
} = require('./utils/errors');
const { OutputFormatter, OutputUtils } = require('./utils/output');
const { isDirectory } = require('./utils/files');

/**
 * Main CLI class
 */
class CLI {
  /**
   * Creates a new CLI instance
   * @param {string} [configPath] - Path to configuration file
   */
  constructor(configPath = null) {
    this.config = new Config(configPath);
    this.scanner = new FileScanner(this.config);
    this.formatter = new OutputFormatter();
  }

  /**
   * Parse command line arguments
   * @param {Array} args - Command line arguments (excluding node and script name)
   * @returns {Object} Parsed arguments
   * @throws {Error} When arguments are invalid
   */
  parseArguments(args) {
    if (args.length === 0) {
      return { command: 'help', files: [], options: {} };
    }

    const parsed = {
      command: null,
      files: [],
      options: {}
    };

    let i = 0;

    // Handle global flags first
    if (args[0] === '--help' || args[0] === '-h') {
      return { command: 'help', files: [], options: {} };
    }

    if (args[0] === '--version' || args[0] === '-V') {
      return { command: 'version', files: [], options: {} };
    }

    // Parse command
    const validCommands = ['check', 'fix'];
    if (!validCommands.includes(args[0])) {
      throw new ValidationError(`Invalid command: ${args[0]}. Valid commands: ${validCommands.join(', ')}`);
    }

    parsed.command = args[0];
    i++;

    // Parse files and options
    while (i < args.length) {
      const arg = args[i];

      if (arg.startsWith('--')) {
        // Handle long options
        const optionName = arg.slice(2);
        
        if (['help', 'version', 'verbose'].includes(optionName)) {
          // Boolean flags
          parsed.options[optionName] = true;
        } else if (optionName === 'format') {
          // Options with values
          if (i + 1 >= args.length) {
            throw new Error(`Option --${optionName} requires a value`);
          }
          parsed.options[optionName] = args[++i];
        } else {
          throw new Error(`Unknown option: --${optionName}`);
        }
      } else if (arg.startsWith('-')) {
        // Handle short options
        const flags = arg.slice(1);
        for (const flag of flags) {
          switch (flag) {
          case 'h':
            parsed.options.help = true;
            break;
          case 'V':
            parsed.options.version = true;
            break;
          case 'v':
            parsed.options.verbose = true;
            break;
          default:
            throw new Error(`Unknown option: -${flag}`);
          }
        }
      } else {
        // File or directory argument
        parsed.files.push(arg);
      }

      i++;
    }

    // Validate command-specific requirements
    this.validateParsedArguments(parsed);

    return parsed;
  }

  /**
   * Validate parsed arguments for command-specific requirements
   * @param {Object} parsed - Parsed arguments
   * @throws {Error} When arguments are invalid
   */
  validateParsedArguments(parsed) {
    const { command, files, options } = parsed;

    // Validate format option
    if (options.format && !['table', 'json', 'minimal'].includes(options.format)) {
      throw new Error(`Invalid format: ${options.format}. Valid formats: table, json, minimal`);
    }

    // Commands that require files
    if (['check', 'fix'].includes(command) && files.length === 0) {
      throw new ValidationError(`Command '${command}' requires at least one file or directory`);
    }
  }

  /**
   * Main entry point for CLI execution
   * @param {Array} [argv] - Command line arguments (defaults to process.argv)
   */
  async run(argv = process.argv) {
    let parsed = null;
    try {
      // Parse arguments (skip 'node' and script name)
      const args = argv.slice(2);
      parsed = this.parseArguments(args);

      // Handle help and version commands
      if (parsed.command === 'help' || parsed.options.help) {
        this.showHelp();
        process.exit(0);
      }

      if (parsed.command === 'version' || parsed.options.version) {
        this.showVersion();
        process.exit(0);
      }

      // Update formatter options
      this.formatter = new OutputFormatter({
        useColors: process.stdout.isTTY,
        maxContextLines: this.config.config.output.maxContextLines
      });

      // Execute command
      await this.executeCommand(parsed);

    } catch (error) {
      handleError(error, parsed?.options?.verbose || false);
    }
  }

  /**
   * Execute the parsed command
   * @param {Object} parsed - Parsed command arguments
   */
  async executeCommand(parsed) {
    const { command, files, options } = parsed;

    switch (command) {
    case 'check':
      await this.checkMode(files, options);
      break;
    case 'fix':
      await this.fixMode(files, options);
      break;
    default:
      throw new ValidationError(`Unknown command: ${command}`);
    }
  }

  /**
   * Expand paths that are directories into individual file paths
   * @param {Array} paths - Array of file and directory paths
   * @returns {Promise<Array>} Array of individual file paths
   */
  async expandPaths(paths) {
    const expandedFiles = [];
    
    for (const inputPath of paths) {
      try {
        if (await isDirectory(inputPath)) {
          // Use scanDirectory to get all files in the directory
          for await (const scanResult of this.scanner.scanDirectory(inputPath)) {
            if (!scanResult.error) {
              expandedFiles.push(scanResult.filePath);
            }
          }
        } else {
          // It's a file, add it directly
          expandedFiles.push(inputPath);
        }
      } catch (error) {
        // If we can't determine if it's a directory, treat it as a file
        // This will let the scanner handle the error appropriately
        expandedFiles.push(inputPath);
      }
    }
    
    return expandedFiles;
  }

  /**
   * Check mode - detect emojis in files and report results
   * @param {Array} files - Files to check
   * @param {Object} options - Command options
   */
  async checkMode(files, options) {
    const results = [];
    const summary = {
      totalFiles: 0,
      filesWithEmojis: 0,
      totalEmojis: 0,
      emojiTypes: {},
      errors: []
    };

    const startTime = Date.now();

    try {
      // Expand directory paths into individual file paths
      const expandedFiles = await this.expandPaths(files);
      
      // Process files
      for await (const scanResult of this.scanner.scanFiles(expandedFiles)) {
        summary.totalFiles++;

        if (scanResult.error) {
          summary.errors.push({
            filePath: scanResult.filePath,
            error: scanResult.error.message
          });
          
          console.error(formatError(scanResult.error));
          continue;
        }

        // Skip binary files
        if (!scanResult.isTextFile) {
          if (options.verbose) {
            console.log(`Skipping binary file: ${scanResult.filePath}`);
          }
          continue;
        }

        // Skip files based on configuration ignore patterns
        if (this.config.shouldIgnoreFile(scanResult.filePath, scanResult.content)) {
          if (options.verbose) {
            console.log(`Ignoring file: ${scanResult.filePath}`);
          }
          continue;
        }

        // Detect emojis
        try {
          const emojis = findEmojis(scanResult.content);
          
          // Filter out ignored emojis and lines
          const filteredEmojis = emojis.filter(emoji => {
            // Check if emoji should be ignored
            if (this.config.shouldIgnoreEmoji(emoji.emoji)) {
              return false;
            }

            // Check if line should be ignored
            const lines = scanResult.content.split('\n');
            const line = lines[emoji.lineNumber - 1];
            if (line && this.config.shouldIgnoreLine(line)) {
              return false;
            }

            return true;
          });

          // Update summary
          if (filteredEmojis.length > 0) {
            summary.filesWithEmojis++;
            summary.totalEmojis += filteredEmojis.length;

            // Count emoji types
            for (const emoji of filteredEmojis) {
              summary.emojiTypes[emoji.type] = (summary.emojiTypes[emoji.type] || 0) + 1;
            }
          }

          results.push({
            filePath: scanResult.filePath,
            emojis: filteredEmojis,
            size: scanResult.size,
            isComplete: scanResult.isComplete
          });

        } catch (error) {
          const processingError = new Error(
            `Failed to process emojis: ${error.message}`,
            scanResult.filePath
          );
          summary.errors.push({
            filePath: scanResult.filePath,
            error: processingError.message
          });
          
          console.error(formatError(processingError));
        }
      }

      // Calculate processing time
      const duration = Date.now() - startTime;
      summary.processingTime = OutputUtils.formatDuration(duration);

      // Output results
      const format = options.format || this.config.config.output.format || 'table';
      const output = this.formatter.formatResults(results, format, summary);
      
      console.log(output);

      // Show performance info in verbose mode
      if (options.verbose) {
        console.log(`\nProcessed ${summary.totalFiles} files in ${summary.processingTime}`);
        if (summary.errors.length > 0) {
          console.log(`Errors encountered: ${summary.errors.length}`);
        }
      }

      // Exit with appropriate code
      const exitCode = summary.totalEmojis > 0 ? 1 : 0;
      process.exit(exitCode);

    } catch (error) {
      throw new Error(`Check mode failed: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Fix mode - remove emojis from files
   * @param {Array} files - Files to fix
   * @param {Object} options - Command options
   */
  async fixMode(files, options) {
    const results = [];
    let filesModified = 0;
    let totalEmojisRemoved = 0;

    try {
      // Expand directory paths into individual file paths
      const expandedFiles = await this.expandPaths(files);
      
      for await (const scanResult of this.scanner.scanFiles(expandedFiles)) {
        if (scanResult.error) {
          console.error(formatError(scanResult.error));
          continue;
        }

        // Skip binary files
        if (!scanResult.isTextFile) {
          continue;
        }

        // Skip ignored files
        if (this.config.shouldIgnoreFile(scanResult.filePath, scanResult.content)) {
          if (options.verbose) {
            console.log(`Ignoring file: ${scanResult.filePath}`);
          }
          continue;
        }

        try {
          // First, detect emojis to see if file needs processing
          const emojis = findEmojis(scanResult.content);
          
          // Filter out ignored emojis and lines
          const filteredEmojis = emojis.filter(emoji => {
            // Check if emoji should be ignored
            if (this.config.shouldIgnoreEmoji(emoji.emoji)) {
              return false;
            }

            // Check if line should be ignored
            const lines = scanResult.content.split('\n');
            const line = lines[emoji.lineNumber - 1];
            if (line && this.config.shouldIgnoreLine(line)) {
              return false;
            }

            return true;
          });

          // Skip files with no emojis that need fixing
          if (filteredEmojis.length === 0) {
            if (options.verbose) {
              console.log(`No emojis to fix: ${scanResult.filePath}`);
            }
            continue;
          }

          // Remove emojis from content
          const fixedContent = removeEmojis(scanResult.content);

          // Write fixed content to file
          fs.writeFileSync(scanResult.filePath, fixedContent, 'utf8');

          filesModified++;
          totalEmojisRemoved += filteredEmojis.length;

          console.log(
            `Fixed: ${scanResult.filePath} (removed ${filteredEmojis.length} emojis)`
          );

          results.push({
            filePath: scanResult.filePath,
            emojisRemoved: filteredEmojis.length,
            originalSize: scanResult.size,
            newSize: Buffer.byteLength(fixedContent, 'utf8')
          });

        } catch (error) {
          const processingError = new Error(
            `Failed to fix file: ${error.message}`,
            scanResult.filePath
          );
          
          console.error(formatError(processingError));
        }
      }

      // Show summary
      console.log(
        formatSuccess(
          `Fixed ${filesModified} files, removed ${totalEmojisRemoved} emojis`
        )
      );

    } catch (error) {
      throw new Error(`Fix mode failed: ${error.message}`);
    }
  }

  /**
   * Show help message
   */
  showHelp() {
    const help = `
emoji-linter - Remove emojis from your code

Usage:
  emoji-linter <command> [options] <files...>

Commands:
  check    Check files for emojis and report results
  fix      Remove emojis from files

Options:
  --format <type>  Output format: table, json, minimal (default: table)
  --verbose, -v    Show verbose output
  --help, -h       Show this help message
  --version, -V    Show version information

Examples:
  emoji-linter check src/               # Check all files in src/
  emoji-linter check --format json .    # Check with JSON output
  emoji-linter fix src/*.js             # Fix JS files
  emoji-linter fix --verbose .          # Fix all files with verbose output

Configuration:
  Create a .emoji-linter.config.json file to customize behavior.
  
Exit Codes:
  0 - Success (no emojis found in check mode)
  1 - Emojis found (check mode) or error occurred
`;

    console.log(help.trim());
  }

  /**
   * Show version information
   */
  showVersion() {
    try {
      const packagePath = path.join(__dirname, '..', 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      console.log(`emoji-linter v${packageJson.version}`);
    } catch (error) {
      console.log('emoji-linter v1.0.0');
    }
  }

  /**
   * Run CLI and return structured results for GitHub Action integration
   * @param {Array} args - Command line arguments (excluding node and script name)
   * @param {Object} [options] - Additional options
   * @param {string} [options.config] - Config file path
   * @param {string} [options.format] - Output format
   * @param {boolean} [options.quiet] - Suppress console output
   * @returns {Promise<Object>} Structured results with success, results, and summary
   */
  async runAndGetResults(args = [], options = {}) {
    let parsed = null;
    let results = [];
    const summary = {
      totalFiles: 0,
      filesWithEmojis: 0,
      totalEmojis: 0,
      emojiTypes: {},
      errors: []
    };

    try {
      // Parse arguments
      parsed = this.parseArguments(args);

      // Apply additional options
      if (options.config) {
        parsed.options.config = options.config;
      }
      if (options.format) {
        parsed.options.format = options.format;
      }
      if (options.quiet !== undefined) {
        parsed.options.quiet = options.quiet;
      }

      // Handle help and version commands
      if (parsed.command === 'help' || parsed.options.help) {
        return {
          success: true,
          command: 'help',
          results: [],
          summary: {
            totalFiles: 0,
            filesWithEmojis: 0,
            totalEmojis: 0,
            errors: []
          }
        };
      }

      if (parsed.command === 'version' || parsed.options.version) {
        return {
          success: true,
          command: 'version',
          results: [],
          summary: {
            totalFiles: 0,
            filesWithEmojis: 0,
            totalEmojis: 0,
            errors: []
          }
        };
      }

      // Update formatter options
      this.formatter = new OutputFormatter({
        useColors: false, // Disable colors for GitHub Action output
        maxContextLines: this.config.config.output.maxContextLines
      });

      // Execute command and collect results
      switch (parsed.command) {
      case 'check':
        results = await this.checkModeResults(parsed.files, parsed.options);
        break;
      case 'fix':
        results = await this.fixModeResults(parsed.files, parsed.options);
        break;
      default:
        throw new ValidationError(`Unknown command: ${parsed.command}`);
      }

      return {
        success: true,
        command: parsed.command,
        results: results.files,
        summary: results.summary
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        command: parsed?.command || null,
        results: results,
        summary
      };
    }
  }

  /**
   * Check mode - collect results without console output
   * @param {Array} files - Files to check
   * @param {Object} _options - Command options (unused)
   * @returns {Promise<Object>} Results with files array and summary
   */
  async checkModeResults(files, _options) { // eslint-disable-line no-unused-vars
    const results = [];
    const summary = {
      totalFiles: 0,
      filesWithEmojis: 0,
      totalEmojis: 0,
      emojiTypes: {},
      errors: []
    };

    try {
      // Expand directory paths into individual file paths
      const expandedFiles = await this.expandPaths(files);
      
      // Process files
      for await (const scanResult of this.scanner.scanFiles(expandedFiles)) {
        summary.totalFiles++;

        if (scanResult.error) {
          summary.errors.push({
            filePath: scanResult.filePath,
            error: scanResult.error.message
          });
          continue;
        }

        // Skip binary files
        if (!scanResult.isTextFile) {
          continue;
        }

        // Skip files based on configuration ignore patterns
        if (this.config.shouldIgnoreFile(scanResult.filePath, scanResult.content)) {
          continue;
        }

        // Detect emojis
        try {
          const emojis = findEmojis(scanResult.content);
          
          // Filter out ignored emojis and lines
          const filteredEmojis = emojis.filter(emoji => {
            // Check if emoji should be ignored
            if (this.config.shouldIgnoreEmoji(emoji.emoji)) {
              return false;
            }

            // Check if line should be ignored
            const lines = scanResult.content.split('\n');
            const line = lines[emoji.lineNumber - 1];
            if (line && this.config.shouldIgnoreLine(line)) {
              return false;
            }

            return true;
          });

          // Update summary
          if (filteredEmojis.length > 0) {
            summary.filesWithEmojis++;
            summary.totalEmojis += filteredEmojis.length;

            // Count emoji types
            for (const emoji of filteredEmojis) {
              summary.emojiTypes[emoji.type] = (summary.emojiTypes[emoji.type] || 0) + 1;
            }
          }

          results.push({
            filePath: scanResult.filePath,
            emojis: filteredEmojis,
            size: scanResult.size,
            isComplete: scanResult.isComplete
          });

        } catch (error) {
          const processingError = new Error(
            `Failed to process emojis: ${error.message}`,
            scanResult.filePath
          );
          summary.errors.push({
            filePath: scanResult.filePath,
            error: processingError.message
          });
        }
      }

      return { files: results, summary };

    } catch (error) {
      throw new Error(`Check mode failed: ${error.message}`);
    }
  }

  /**
   * Fix mode results - placeholder for future implementation
   * @param {Array} files - Files to fix
   * @param {Object} options - Command options
   * @returns {Promise<Object>} Results with files array and summary
   */
  async fixModeResults(files, options) {
    // For GitHub Action, we'll use check mode logic
    // Fix mode can be enhanced later for specific use cases
    return await this.checkModeResults(files, options);
  }
}

module.exports = {
  CLI
};