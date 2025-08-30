# Plan 03: Configuration System

## Scope
Build configuration management system with file-based and inline ignore mechanisms.

## Dependencies
- **Requires**: Plans 01-02 (Detection Engine + File Scanner) completed
- **Provides**: Configuration support for CLI tool

## Objectives  
- Load and parse `.emoji-linter.json` configuration files
- Support file/directory ignore patterns (glob style)
- Implement inline comment ignore system  
- Provide sensible defaults with user overrides
- Validate configuration and provide helpful error messages

## Deliverables

### 1. Configuration Manager (`src/core/config.js`)
```javascript
class Config {
  constructor(configPath, options)
  loadConfig(configPath) // Load and parse config file
  shouldIgnoreFile(filePath) // Check if file should be skipped
  shouldIgnoreEmoji(emoji) // Check if specific emoji should be ignored
  shouldIgnoreLine(line, lineNumber) // Check inline ignore comments
  mergeWithDefaults(userConfig) // Merge user config with defaults
}
```

### 2. Inline Ignore Parser (`src/utils/ignore.js`)
```javascript
const IgnoreParser = {
  parseFileHeader(content), // Check for file-level ignores
  parseLineIgnores(content), // Find line-level ignores  
  hasIgnoreComment(line), // Check if line has ignore comment
  stripIgnoreComments(line) // Remove ignore comments from line
}
```

### 3. Default Configuration (`src/config/defaults.js`)
```javascript
const DEFAULT_CONFIG = {
  ignore: { files: [...], emojis: [...], patterns: [...] },
  detection: { unicode: true, shortcodes: true, ... },
  output: { format: 'table', showContext: true, ... }
}
```

## Implementation Steps

### Step 1: Basic Configuration Loading
```javascript
class Config {
  constructor(configPath = '.emoji-linter.json') {
    this.config = this.loadConfig(configPath);
  }

  loadConfig(configPath) {
    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');
        const userConfig = JSON.parse(content);
        return this.mergeWithDefaults(userConfig);
      }
    } catch (error) {
      throw new ConfigError(`Failed to parse config file ${configPath}: ${error.message}`);
    }
    
    return this.getDefaultConfig();
  }
}
```

### Step 2: File Ignore Logic
```javascript
shouldIgnoreFile(filePath) {
  const normalizedPath = path.posix.normalize(filePath);
  
  return this.config.ignore.files.some(pattern => {
    return minimatch(normalizedPath, pattern, { 
      matchBase: true,
      dot: true 
    });
  });
}
```

### Step 3: Inline Ignore Comments
```javascript
const IgnoreParser = {
  parseFileHeader(content) {
    const lines = content.split('\n').slice(0, 5); // Check first 5 lines
    return lines.some(line => 
      line.trim().includes('emoji-linter-ignore-file')
    );
  },

  parseLineIgnores(content) {
    const lines = content.split('\n');
    const ignoreLines = new Set();
    
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      
      // Check for ignore-line comment
      if (line.includes('emoji-linter-ignore-line')) {
        ignoreLines.add(lineNumber);
      }
      
      // Check for ignore-next-line comment  
      if (line.includes('emoji-linter-ignore-next-line')) {
        ignoreLines.add(lineNumber + 1);
      }
    });
    
    return ignoreLines;
  }
}
```

### Step 4: Configuration Validation
```javascript
validateConfig(config) {
  const errors = [];
  
  // Validate ignore patterns
  if (config.ignore?.files) {
    config.ignore.files.forEach((pattern, index) => {
      try {
        minimatch('test', pattern);
      } catch (error) {
        errors.push(`Invalid glob pattern at ignore.files[${index}]: ${pattern}`);
      }
    });
  }
  
  // Validate detection settings
  if (config.detection && typeof config.detection !== 'object') {
    errors.push('detection must be an object');
  }
  
  if (errors.length > 0) {
    throw new ConfigValidationError(errors);
  }
  
  return true;
}
```

### Step 5: Configuration Merging
```javascript
mergeWithDefaults(userConfig) {
  const merged = {
    ignore: {
      ...DEFAULT_CONFIG.ignore,
      ...userConfig.ignore,
      files: [
        ...DEFAULT_CONFIG.ignore.files,
        ...(userConfig.ignore?.files || [])
      ]
    },
    detection: {
      ...DEFAULT_CONFIG.detection,
      ...userConfig.detection
    },
    output: {
      ...DEFAULT_CONFIG.output,  
      ...userConfig.output
    }
  };
  
  this.validateConfig(merged);
  return merged;
}
```

## Test Strategy

### Unit Tests Required

1. **Configuration Loading**:
   ```javascript
   test('loads valid config file', () => {
     fs.writeFileSync('/tmp/.emoji-linter.json', JSON.stringify({
       ignore: { files: ['*.test.js'] }
     }));
     
     const config = new Config('/tmp/.emoji-linter.json');
     expect(config.shouldIgnoreFile('app.test.js')).toBe(true);
   });
   ```

2. **File Ignore Patterns**:
   ```javascript
   test('ignores files matching glob patterns', () => {
     const config = new Config();
     config.config.ignore.files = ['**/*.md', 'dist/**'];
     
     expect(config.shouldIgnoreFile('README.md')).toBe(true);
     expect(config.shouldIgnoreFile('dist/index.js')).toBe(true);
     expect(config.shouldIgnoreFile('src/index.js')).toBe(false);
   });
   ```

3. **Inline Ignores**:
   ```javascript
   test('detects file-level ignore comments', () => {
     const content = '// emoji-linter-ignore-file\nconst msg = "Hello ✨";';
     expect(IgnoreParser.parseFileHeader(content)).toBe(true);
   });

   test('detects line-level ignore comments', () => {
     const content = `
       const msg = "Hello ✨"; // emoji-linter-ignore-line
       const other = "World 🌍";
     `;
     const ignoreLines = IgnoreParser.parseLineIgnores(content);
     expect(ignoreLines.has(2)).toBe(true);
     expect(ignoreLines.has(3)).toBe(false);
   });
   ```

4. **Configuration Validation**:
   ```javascript
   test('validates glob patterns', () => {
     expect(() => {
       new Config().validateConfig({
         ignore: { files: ['[invalid'] }
       });
     }).toThrow(ConfigValidationError);
   });
   ```

### Integration Tests
```javascript
describe('Full configuration integration', () => {
  test('respects all ignore mechanisms', async () => {
    // Setup config file
    const config = {
      ignore: {
        files: ['*.test.js'],
        emojis: ['✨']
      }
    };
    
    // Setup test files
    const testFile = `
      // emoji-linter-ignore-next-line
      const sparkle = "✨";
      const rocket = "🚀"; // Should be detected
    `;
    
    // Test integration
    const configManager = new Config();
    expect(configManager.shouldIgnoreFile('app.test.js')).toBe(true);
    
    const ignoreLines = configManager.parseLineIgnores(testFile);
    expect(ignoreLines.has(3)).toBe(true); // Sparkle line ignored
    expect(ignoreLines.has(4)).toBe(false); // Rocket line not ignored
  });
});
```

## Configuration Schema

### Default Configuration File
```json
{
  "ignore": {
    "files": [
      "**/*.md",
      "docs/**",
      "test/fixtures/**", 
      "**/node_modules/**",
      ".git/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "**/*.min.js",
      "**/*.map"
    ],
    "emojis": [],
    "patterns": []
  },
  "detection": {
    "unicode": true,
    "shortcodes": true,
    "sequences": true,
    "skinTones": true
  },
  "output": {
    "format": "table",
    "showContext": true,
    "maxContextLines": 2
  },
  "cleanup": {
    "preserveWhitespace": false,
    "createBackup": false
  }
}
```

## Inline Comment Formats

### File-Level Ignores
```javascript
// emoji-linter-ignore-file
/* emoji-linter-ignore-file */
# emoji-linter-ignore-file
<!-- emoji-linter-ignore-file -->
```

### Line-Level Ignores  
```javascript
const msg = "Hello ✨"; // emoji-linter-ignore-line
const msg2 = "World 🌍"; /* emoji-linter-ignore-line */

// emoji-linter-ignore-next-line  
const msg3 = "Rocket 🚀";
```

## Success Criteria

### Functional Requirements
- [ ] Loads configuration from `.emoji-linter.json`
- [ ] Supports glob patterns for file ignoring
- [ ] Detects and processes inline ignore comments
- [ ] Merges user config with sensible defaults
- [ ] Validates configuration and reports errors clearly

### Quality Requirements  
- [ ] 95%+ test coverage
- [ ] Handles malformed JSON gracefully
- [ ] Cross-platform path handling
- [ ] Performance: config loading < 10ms

### Error Handling
- [ ] Clear error messages for invalid JSON
- [ ] Helpful suggestions for invalid glob patterns
- [ ] Graceful fallback when config file missing
- [ ] Detailed error location information

## Error Classes
```javascript
class ConfigError extends Error {
  constructor(message, configPath) {
    super(message);
    this.name = 'ConfigError';
    this.configPath = configPath;
  }
}

class ConfigValidationError extends ConfigError {
  constructor(errors) {
    super(`Configuration validation failed:\n${errors.join('\n')}`);
    this.name = 'ConfigValidationError';
    this.errors = errors;
  }
}
```

## Integration Points
- **File Scanner**: Provides ignore patterns for file filtering
- **Emoji Detector**: Provides detection settings and emoji ignore lists
- **CLI Tool**: Receives config path and options from command line
- **Output**: Provides formatting preferences for results display

## Definition of Done
- Configuration system handles all specified ignore mechanisms
- Comprehensive validation with helpful error messages  
- Full test coverage including edge cases
- Documentation with configuration examples
- Ready to integrate with CLI implementation