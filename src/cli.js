/**
 * CLI Class for emoji-linter
 * Provides command-line interface with check, fix, diff, and list modes
 */

/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const { Config } = require('./core/config');
const { findEmojis, removeEmojis } = require('./core/detector');
const { FileScanner } = require('./core/scanner');
const { 
  FileError,
  formatError,
  formatSuccess,
  formatInfo,
  handleError,
  fromSystemError
} = require('./utils/errors');
const { OutputFormatter, OutputUtils } = require('./utils/output');
const { isDirectory } = require('./utils/files');

/**
 * Main CLI class
 */
class CLI {
  /**
   * Creates a new CLI instance
   * @param {Object} [customConfig] - Custom configuration options
   */
  constructor(customConfig = {}) {
    this.config = new Config(customConfig);
    this.scanner = new FileScanner();
    // Use detector functions directly
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
    const validCommands = ['check', 'fix', 'diff', 'list', 'install-hook'];
    if (!validCommands.includes(args[0])) {
      throw new Error(`Invalid command: ${args[0]}. Valid commands: ${validCommands.join(', ')}`);
    }

    parsed.command = args[0];
    i++;

    // Parse files and options
    while (i < args.length) {
      const arg = args[i];

      if (arg.startsWith('--')) {
        // Handle long options
        const optionName = arg.slice(2);
        
        if (['help', 'version', 'verbose', 'quiet', 'backup', 'dry-run', 'staged'].includes(optionName)) {
          // Boolean flags
          parsed.options[this.camelCase(optionName)] = true;
        } else if (['format', 'config', 'output', 'encoding'].includes(optionName)) {
          // Options with values
          if (i + 1 >= args.length) {
            throw new Error(`Option --${optionName} requires a value`);
          }
          parsed.options[this.camelCase(optionName)] = args[++i];
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
          case 'q':
            parsed.options.quiet = true;
            break;
          case 'b':
            parsed.options.backup = true;
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

    // Check for conflicting options
    if (options.verbose && options.quiet) {
      throw new Error('Cannot use both --verbose and --quiet options');
    }

    // Validate format option
    if (options.format && !['table', 'json', 'minimal'].includes(options.format)) {
      throw new Error(`Invalid format: ${options.format}. Valid formats: table, json, minimal`);
    }

    // Commands that require files (unless --staged is used)
    if (['check', 'fix', 'diff', 'list'].includes(command) && files.length === 0 && !options.staged) {
      throw new Error(`Command '${command}' requires at least one file or directory (or use --staged for git staged files)`);
    }

    // Validate config file if specified
    if (options.config && !fs.existsSync(options.config)) {
      throw new Error(`Config file not found: ${options.config}`);
    }
  }

  /**
   * Convert kebab-case to camelCase
   * @param {string} str - String to convert
   * @returns {string} camelCase string
   */
  camelCase(str) {
    return str.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
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

      // Load custom config if specified
      if (parsed.options.config) {
        // Create a new config with the custom config file
        this.config = new Config();
        this.config.loadConfig(parsed.options.config);
      }

      // Update formatter options
      this.formatter = new OutputFormatter({
        useColors: process.stdout.isTTY && !parsed.options.quiet,
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
    case 'diff':
      await this.diffMode(files, options);
      break;
    case 'list':
      await this.listMode(files, options);
      break;
    case 'install-hook':
      await this.installHook(options);
      break;
    default:
      throw new ValidationError(`Unknown command: ${command}`);
    }
  }

  /**
   * Get list of git staged files
   * @returns {Promise<Array>} Array of staged file paths
   */
  async getStagedFiles() {
    const { execSync } = require('child_process');
    
    try {
      // Get list of staged files from git
      const result = execSync('git diff --cached --name-only --diff-filter=ACM', {
        encoding: 'utf8'
      });
      
      // Split by newline and filter out empty strings
      const files = result.split('\n').filter(file => file.trim());
      
      if (files.length === 0) {
        throw new Error('No staged files found. Stage files with "git add" before running with --staged flag.');
      }
      
      return files;
    } catch (error) {
      if (error.message.includes('not a git repository')) {
        throw new Error('Not in a git repository. The --staged flag only works inside git repositories.');
      }
      throw error;
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
      // Get files to check - either from arguments or staged files
      let expandedFiles;
      if (options.staged) {
        expandedFiles = await this.getStagedFiles();
        if (!options.quiet) {
          console.log(formatInfo(`Checking ${expandedFiles.length} staged files...`));
        }
      } else {
        // Expand directory paths into individual file paths
        expandedFiles = await this.expandPaths(files);
      }
      
      // Process files
      for await (const scanResult of this.scanner.scanFiles(expandedFiles)) {
        summary.totalFiles++;

        if (scanResult.error) {
          summary.errors.push({
            filePath: scanResult.filePath,
            error: scanResult.error.message
          });
          
          if (!options.quiet) {
            console.error(formatError(scanResult.error));
          }
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
          
          if (!options.quiet) {
            console.error(formatError(processingError));
          }
        }
      }

      // Calculate processing time
      const duration = Date.now() - startTime;
      summary.processingTime = OutputUtils.formatDuration(duration);

      // Output results
      const format = options.format || this.config.config.output.format || 'table';
      const output = this.formatter.formatResults(results, format, summary);
      
      if (!options.quiet) {
        console.log(output);
      }

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
          if (!options.quiet) {
            console.error(formatError(scanResult.error));
          }
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

          // Create backup if requested
          if (options.backup) {
            const backupPath = `${scanResult.filePath}.bak`;
            fs.copyFileSync(scanResult.filePath, backupPath);
            if (options.verbose) {
              console.log(`Created backup: ${backupPath}`);
            }
          }

          // Write fixed content to file
          if (!options.dryRun) {
            fs.writeFileSync(scanResult.filePath, fixedContent, 'utf8');
          }

          filesModified++;
          totalEmojisRemoved += filteredEmojis.length;

          if (!options.quiet) {
            console.log(
              `Fixed: ${scanResult.filePath} (removed ${filteredEmojis.length} emojis)`
            );
          }

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
          
          if (!options.quiet) {
            console.error(formatError(processingError));
          }
        }
      }

      // Show summary
      if (!options.quiet) {
        console.log(
          formatSuccess(
            `Fixed ${filesModified} files, removed ${totalEmojisRemoved} emojis`
          )
        );
      }

      if (options.dryRun && !options.quiet) {
        console.log(formatInfo('Dry run - no files were modified'));
      }

    } catch (error) {
      throw new Error(`Fix mode failed: ${error.message}`);
    }
  }

  /**
   * Diff mode - show what changes would be made
   * @param {Array} files - Files to analyze
   * @param {Object} options - Command options
   */
  async diffMode(files, options) {
    const diffs = [];

    try {
      // Expand directory paths into individual file paths
      const expandedFiles = await this.expandPaths(files);
      
      for await (const scanResult of this.scanner.scanFiles(expandedFiles)) {
        if (scanResult.error) {
          if (!options.quiet) {
            console.error(formatError(scanResult.error));
          }
          continue;
        }

        // Skip binary files
        if (!scanResult.isTextFile) {
          continue;
        }

        // Skip ignored files
        if (this.config.shouldIgnoreFile(scanResult.filePath, scanResult.content)) {
          continue;
        }

        try {
          const originalContent = scanResult.content;
          const fixedContent = removeEmojis(originalContent);

          if (originalContent === fixedContent) {
            diffs.push({
              filePath: scanResult.filePath,
              hasChanges: false
            });
            continue;
          }

          // Generate line-by-line diff
          const originalLines = originalContent.split('\n');
          const fixedLines = fixedContent.split('\n');
          const changes = [];

          for (let i = 0; i < Math.max(originalLines.length, fixedLines.length); i++) {
            const originalLine = originalLines[i] || '';
            const fixedLine = fixedLines[i] || '';

            if (originalLine !== fixedLine) {
              changes.push({
                lineNumber: i + 1,
                before: originalLine,
                after: fixedLine
              });
            }
          }

          diffs.push({
            filePath: scanResult.filePath,
            hasChanges: true,
            changes
          });

        } catch (error) {
          const processingError = new Error(
            `Failed to generate diff: ${error.message}`,
            scanResult.filePath
          );
          
          if (!options.quiet) {
            console.error(formatError(processingError));
          }
        }
      }

      // Output diff results
      const format = options.format || 'table';
      const output = this.formatter.formatDiff(diffs, format);
      
      if (!options.quiet) {
        console.log(output);
      }

    } catch (error) {
      throw new Error(`Diff mode failed: ${error.message}`);
    }
  }

  /**
   * List mode - list files containing emojis
   * @param {Array} files - Files to analyze
   * @param {Object} options - Command options
   */
  async listMode(files, options) {
    const results = [];

    try {
      // Expand directory paths into individual file paths
      const expandedFiles = await this.expandPaths(files);
      
      for await (const scanResult of this.scanner.scanFiles(expandedFiles)) {
        if (scanResult.error) {
          if (!options.quiet) {
            console.error(formatError(scanResult.error));
          }
          continue;
        }

        // Skip binary files
        if (!scanResult.isTextFile) {
          continue;
        }

        // Skip ignored files
        if (this.config.shouldIgnoreFile(scanResult.filePath, scanResult.content)) {
          continue;
        }

        try {
          const emojis = findEmojis(scanResult.content);
          
          // Filter ignored emojis and lines
          const filteredEmojis = emojis.filter(emoji => {
            const lines = scanResult.content.split('\n');
            const line = lines[emoji.lineNumber - 1];
            return !this.config.shouldIgnoreEmoji(emoji.emoji) &&
                   !(line && this.config.shouldIgnoreLine(line));
          });

          if (filteredEmojis.length > 0) {
            results.push({
              filePath: scanResult.filePath,
              emojis: filteredEmojis,
              size: scanResult.size
            });
          }

        } catch (error) {
          const processingError = new Error(
            `Failed to analyze file: ${error.message}`,
            scanResult.filePath
          );
          
          if (!options.quiet) {
            console.error(formatError(processingError));
          }
        }
      }

      // Output list results
      const format = options.format || 'table';
      const output = this.formatter.formatList(results, format);
      
      if (!options.quiet) {
        console.log(output);
      }

    } catch (error) {
      throw new Error(`List mode failed: ${error.message}`);
    }
  }

  /**
   * Install pre-commit hook
   * @param {Object} options - Command options
   */
  async installHook(options) {
    const { execSync } = require('child_process');
    
    try {
      // Check if we're in a git repository
      execSync('git rev-parse --git-dir', { encoding: 'utf8' });
    } catch (error) {
      throw new Error('Not in a git repository. Run this command from the root of your git project.');
    }

    const hookPath = path.join('.git', 'hooks', 'pre-commit');
    const hookContent = `#!/bin/sh
# emoji-linter pre-commit hook
# Checks staged files for emojis before allowing commit

# Check if emoji-linter is available
if ! command -v emoji-linter &> /dev/null; then
  echo "emoji-linter is not installed. Please install it first:"
  echo "  npm install -g emoji-linter"
  exit 1
fi

# Run emoji-linter on staged files
emoji-linter check --staged

# Exit with the same code as emoji-linter
exit $?
`;

    try {
      // Check if hook already exists
      if (fs.existsSync(hookPath)) {
        if (!options.force) {
          throw new Error(`Pre-commit hook already exists at ${hookPath}. Use --force to overwrite.`);
        }
        if (!options.quiet) {
          console.log(formatInfo('Overwriting existing pre-commit hook...'));
        }
      }

      // Write the hook file
      fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });
      
      // Make it executable (belt and suspenders - mode should handle it)
      fs.chmodSync(hookPath, 0o755);

      if (!options.quiet) {
        console.log(formatSuccess('Pre-commit hook installed successfully!'));
        console.log('\nThe hook will check staged files for emojis before each commit.');
        console.log('To skip the hook for a single commit, use: git commit --no-verify');
        console.log('\nTo uninstall the hook, run: rm .git/hooks/pre-commit');
      }
    } catch (error) {
      throw new Error(`Failed to install hook: ${error.message}`);
    }
  }

  /**
   * Show help message
   */
  showHelp() {
    const help = `
emoji-linter - Detect and manage emoji usage in your codebase

Usage:
  emoji-linter <command> [options] <files...>

Commands:
  check         Check files for emoji usage and report results
  fix           Remove emojis from files (with optional backup)
  diff          Show what changes would be made without modifying files
  list          List files that contain emojis
  install-hook  Install git pre-commit hook to check staged files

Options:
  --format <format>    Output format: table, json, minimal (default: table)
  --config <path>      Path to configuration file
  --backup, -b         Create backup files before fixing (fix mode only)
  --staged             Check only git staged files (check mode)
  --dry-run           Show what would be done without making changes
  --verbose, -v        Show verbose output
  --quiet, -q          Suppress non-essential output
  --help, -h           Show this help message
  --version, -V        Show version information

Examples:
  emoji-linter check src/                    # Check all files in src/
  emoji-linter check --staged                # Check only staged files
  emoji-linter fix --backup src/*.js         # Fix JS files with backup
  emoji-linter diff --format json src/       # Show diff in JSON format
  emoji-linter list --format minimal src/    # List files with minimal output
  emoji-linter install-hook                  # Install git pre-commit hook

Pre-commit Hook:
  emoji-linter install-hook                  # Install hook
  git commit                                 # Hook runs automatically
  git commit --no-verify                     # Skip hook for one commit

Configuration:
  Create a .emoji-linter.config.json file to customize behavior. 
  By default, all files are scanned - use ignore patterns for common directories.
  
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

      // Load custom config if specified
      if (parsed.options.config) {
        // Create a new config with the custom config file
        this.config = new Config();
        this.config.loadConfig(parsed.options.config);
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
      case 'diff':
        results = await this.diffModeResults(parsed.files, parsed.options);
        break;
      case 'list':
        results = await this.listModeResults(parsed.files, parsed.options);
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

  /**
   * Diff mode results - placeholder for future implementation
   * @param {Array} files - Files to analyze
   * @param {Object} options - Command options
   * @returns {Promise<Object>} Results with files array and summary
   */
  async diffModeResults(files, options) {
    // For GitHub Action, we'll use check mode logic
    return await this.checkModeResults(files, options);
  }

  /**
   * List mode results - placeholder for future implementation
   * @param {Array} files - Files to analyze
   * @param {Object} options - Command options
   * @returns {Promise<Object>} Results with files array and summary
   */
  async listModeResults(files, options) {
    // For GitHub Action, we'll use check mode logic
    return await this.checkModeResults(files, options);
  }
}

module.exports = {
  CLI
};