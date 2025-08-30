# Plan 04: CLI Implementation

## Scope
Build the command-line interface that ties together all core components into a usable CLI tool.

## Dependencies
- **Requires**: Plans 01-03 (Detection Engine + File Scanner + Configuration) completed
- **Provides**: Functional CLI tool ready for npm distribution

## Objectives
- Create executable CLI tool with professional UX
- Implement all CLI modes (check, fix, diff, list)
- Provide clear, actionable output with file locations and line numbers
- Handle errors gracefully with helpful messages
- Achieve performance targets for large codebases

## Deliverables

### 1. CLI Executable (`bin/emoji-linter.js`)
```bash
#!/usr/bin/env node
# Handles argument parsing and delegates to CLI implementation
```

### 2. CLI Implementation (`src/cli.js`)
```javascript
class CLI {
  async run(args, options)  // Main CLI entry point
  async checkMode(files)    // Check-only mode  
  async fixMode(files)      // In-place fixing mode
  async diffMode(files)     // Preview changes mode
  async listMode(files)     // List emojis mode
}
```

### 3. Output Formatter (`src/utils/output.js`)
```javascript
const OutputFormatter = {
  formatTable(results),     // Table format output
  formatJSON(results),      // JSON format output  
  formatMinimal(results),   // Minimal text output
  formatDiff(changes)       // Diff-style output
}
```

### 4. CLI Error Handling (`src/utils/errors.js`)
```javascript
class CLIError extends Error {
  constructor(message, exitCode, suggestions)
}
```

## Implementation Steps

### Step 1: Argument Parsing and Validation
```javascript
#!/usr/bin/env node
const { program } = require('commander');
const { runCLI } = require('../src/cli');

program
  .name('emoji-linter')
  .description('Detect and remove emojis from source code')
  .version(require('../package.json').version);

program
  .argument('[files...]', 'Files or directories to scan', ['.'])
  .option('-c, --check', 'Check for emojis without modifying files')
  .option('-f, --fix', 'Remove emojis in-place')
  .option('--diff', 'Show diff of what would be changed')
  .option('--list', 'List all emojis found')
  .option('--config <path>', 'Path to config file', '.emoji-linter.json')
  .option('--ignore-config', 'Ignore config file')
  .option('--format <format>', 'Output format: table, json, minimal', 'table')
  .option('--include <pattern>', 'Include files matching pattern')
  .option('--exclude <pattern>', 'Exclude files matching pattern')
  .option('--backup', 'Create .bak backup files when using --fix')
  .option('-q, --quiet', 'Minimal output')
  .option('-v, --verbose', 'Detailed output')
  .action(async (files, options) => {
    try {
      const exitCode = await runCLI(files, options);
      process.exit(exitCode);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      if (error.suggestions) {
        console.error(`\nSuggestions:\n${error.suggestions.map(s => `  - ${s}`).join('\n')}`);
      }
      process.exit(error.exitCode || 2);
    }
  });

program.parse();
```

### Step 2: Main CLI Logic  
```javascript
const { Config } = require('./core/config');
const { EmojiDetector } = require('./core/detector');
const { FileScanner } = require('./core/scanner');
const { OutputFormatter } = require('./utils/output');

class CLI {
  constructor() {
    this.config = null;
    this.detector = null;
    this.scanner = null;
  }

  async run(files, options) {
    // Initialize components
    this.config = new Config(options.ignoreConfig ? null : options.config);
    this.detector = new EmojiDetector(this.config.config.detection);
    this.scanner = new FileScanner();

    // Validate arguments
    this.validateOptions(options);

    // Determine mode and execute
    if (options.check) return await this.checkMode(files, options);
    if (options.fix) return await this.fixMode(files, options);  
    if (options.diff) return await this.diffMode(files, options);
    if (options.list) return await this.listMode(files, options);
    
    // Default to check mode
    return await this.checkMode(files, options);
  }

  validateOptions(options) {
    const modes = [options.check, options.fix, options.diff, options.list].filter(Boolean);
    if (modes.length > 1) {
      throw new CLIError(
        'Only one mode can be specified at a time',
        2,
        ['Use only one of: --check, --fix, --diff, --list']
      );
    }

    const validFormats = ['table', 'json', 'minimal'];
    if (!validFormats.includes(options.format)) {
      throw new CLIError(
        `Invalid format: ${options.format}`,
        2,
        [`Valid formats: ${validFormats.join(', ')}`]
      );
    }
  }
}
```

### Step 3: Check Mode Implementation
```javascript
async checkMode(files, options) {
  const results = [];
  const startTime = Date.now();

  try {
    for (const inputPath of files) {
      if (this.config.shouldIgnoreFile(inputPath)) continue;

      for await (const filePath of this.scanner.scanFiles([inputPath])) {
        if (this.config.shouldIgnoreFile(filePath)) continue;
        
        const content = await this.scanner.readFileContent(filePath);
        if (!content) continue;

        // Check for file-level ignore
        if (this.config.shouldIgnoreFileContent(content)) continue;

        const fileResults = await this.processFile(filePath, content, options);
        if (fileResults.length > 0) {
          results.push(...fileResults);
        }
      }
    }

    // Output results
    const output = OutputFormatter.format(results, options.format, {
      showContext: !options.quiet,
      verbose: options.verbose
    });
    
    console.log(output);

    // Summary
    if (!options.quiet && results.length > 0) {
      const duration = Date.now() - startTime;
      console.log(`\nFound ${results.length} emojis across ${new Set(results.map(r => r.file)).size} files (${duration}ms)`);
    }

    return results.length > 0 ? 1 : 0; // Exit code 1 if emojis found
    
  } catch (error) {
    throw new CLIError(`Check failed: ${error.message}`, 1);
  }
}
```

### Step 4: Fix Mode Implementation
```javascript
async fixMode(files, options) {
  const results = [];
  const changedFiles = new Set();

  try {
    for (const inputPath of files) {
      for await (const filePath of this.scanner.scanFiles([inputPath])) {
        if (this.config.shouldIgnoreFile(filePath)) continue;
        
        const content = await this.scanner.readFileContent(filePath);
        if (!content) continue;

        if (this.config.shouldIgnoreFileContent(content)) continue;

        const emojis = await this.processFile(filePath, content, options);
        if (emojis.length === 0) continue;

        // Create backup if requested
        if (options.backup) {
          await this.createBackup(filePath);
        }

        // Remove emojis
        const cleanContent = this.removeEmojisFromContent(content, filePath);
        await fs.writeFile(filePath, cleanContent, 'utf8');
        
        changedFiles.add(filePath);
        results.push(...emojis);

        if (options.verbose) {
          console.log(`Fixed ${emojis.length} emojis in ${filePath}`);
        }
      }
    }

    if (!options.quiet) {
      console.log(`Removed ${results.length} emojis from ${changedFiles.size} files`);
    }

    return 0; // Success

  } catch (error) {
    throw new CLIError(`Fix failed: ${error.message}`, 1);
  }
}

removeEmojisFromContent(content, filePath) {
  const lines = content.split('\n');
  const ignoreLines = this.config.parseLineIgnores(content);
  
  const cleanLines = lines.map((line, index) => {
    const lineNumber = index + 1;
    if (ignoreLines.has(lineNumber)) {
      return line; // Don't modify ignored lines
    }
    return this.detector.removeEmojis(line);
  });
  
  return cleanLines.join('\n');
}
```

### Step 5: Diff and List Modes
```javascript
async diffMode(files, options) {
  const changes = [];

  for (const inputPath of files) {
    for await (const filePath of this.scanner.scanFiles([inputPath])) {
      if (this.config.shouldIgnoreFile(filePath)) continue;
      
      const content = await this.scanner.readFileContent(filePath);
      if (!content) continue;

      const cleanContent = this.removeEmojisFromContent(content, filePath);
      if (content !== cleanContent) {
        changes.push({
          file: filePath,
          original: content,
          modified: cleanContent
        });
      }
    }
  }

  const output = OutputFormatter.formatDiff(changes);
  console.log(output);
  
  return changes.length > 0 ? 1 : 0;
}

async listMode(files, options) {
  const allEmojis = new Map(); // emoji -> files[]

  for (const inputPath of files) {
    for await (const filePath of this.scanner.scanFiles([inputPath])) {
      if (this.config.shouldIgnoreFile(filePath)) continue;
      
      const content = await this.scanner.readFileContent(filePath);
      if (!content) continue;

      const emojis = await this.processFile(filePath, content, options);
      
      emojis.forEach(emojiResult => {
        if (!allEmojis.has(emojiResult.emoji)) {
          allEmojis.set(emojiResult.emoji, []);
        }
        allEmojis.get(emojiResult.emoji).push({
          file: filePath,
          line: emojiResult.line,
          column: emojiResult.column
        });
      });
    }
  }

  const output = OutputFormatter.formatEmojiList(allEmojis, options.format);
  console.log(output);
  
  return 0;
}
```

## Test Strategy

### Unit Tests
```javascript
describe('CLI', () => {
  let cli;
  
  beforeEach(() => {
    cli = new CLI();
  });

  test('check mode returns 1 when emojis found', async () => {
    // Setup test files with emojis
    const exitCode = await cli.checkMode(['test/fixtures/with-emojis.js'], {});
    expect(exitCode).toBe(1);
  });

  test('fix mode modifies files in place', async () => {
    const testFile = '/tmp/test.js';
    await fs.writeFile(testFile, 'const msg = "Hello ✨";');
    
    await cli.fixMode([testFile], {});
    
    const content = await fs.readFile(testFile, 'utf8');
    expect(content).toBe('const msg = "Hello ";');
  });

  test('respects ignore patterns', async () => {
    const results = await cli.checkMode(['test/fixtures/'], {
      config: 'test/configs/ignore-md.json'
    });
    // Should not find emojis in .md files
  });
});
```

### Integration Tests
```javascript
describe('CLI Integration', () => {
  test('full workflow with real codebase', async () => {
    // Test against real repository structure
    const { stdout, stderr, exitCode } = await exec('node bin/emoji-linter.js --check test/fixtures/large-repo');
    
    expect(exitCode).toBe(1);
    expect(stdout).toContain('Found emojis in');
    expect(stderr).toBe('');
  });

  test('performance with large codebase', async () => {
    const start = Date.now();
    const exitCode = await runCLI(['test/fixtures/1000-files'], { check: true });
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(2000); // < 2 seconds
  });
});
```

## Success Criteria

### Functional Requirements
- [ ] All CLI modes work correctly (check, fix, diff, list)
- [ ] Proper exit codes (0=success, 1=emojis found, 2=error)
- [ ] Respects all configuration and ignore mechanisms
- [ ] Handles file system errors gracefully
- [ ] Provides clear, actionable output

### Performance Requirements  
- [ ] Processes 1000+ files in < 2 seconds
- [ ] Memory usage < 200MB for large codebases
- [ ] Graceful handling of large files (>10MB)

### UX Requirements
- [ ] Clear help text and examples
- [ ] Helpful error messages with suggestions
- [ ] Progress indication for large operations
- [ ] Consistent output formatting across modes

## Output Examples

### Table Format
```
┌─────────────────────────┬──────┬────────┬───────┬─────────────────────────┐
│ File                    │ Line │ Column │ Emoji │ Context                 │
├─────────────────────────┼──────┼────────┼───────┼─────────────────────────┤
│ src/utils.js           │   12 │      8 │   ✨   │ console.log('Debug ✨'); │
│ src/components/App.jsx │   45 │     15 │   🚀   │ const status = 'Ready 🚀'│
└─────────────────────────┴──────┴────────┴───────┴─────────────────────────┘

Found 2 emojis across 2 files (150ms)
```

### JSON Format
```json
{
  "summary": {
    "totalEmojis": 2,
    "filesWithEmojis": 2,
    "duration": 150
  },
  "results": [
    {
      "file": "src/utils.js",
      "line": 12,
      "column": 8,
      "emoji": "✨",
      "type": "unicode",
      "context": "console.log('Debug ✨');"
    }
  ]
}
```

## Definition of Done
- CLI tool handles all specified modes correctly
- Performance requirements met on target platforms  
- Professional UX with helpful error messages
- Comprehensive test coverage including edge cases
- Ready for npm publication as executable package