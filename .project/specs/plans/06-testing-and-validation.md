# Plan 06: Testing and Validation

## Scope
Comprehensive testing strategy covering all components, integration scenarios, and performance requirements.

## Dependencies
- **Requires**: Plans 01-05 (All core components implemented)
- **Provides**: Production-ready, thoroughly tested tool

## Objectives
- Achieve 95%+ test coverage on core functionality
- Validate performance requirements on large codebases  
- Test cross-platform compatibility
- Ensure reliability across diverse real-world scenarios
- Validate both CLI and GitHub Action functionality

## Deliverables

### 1. Test Infrastructure
```
tests/
├── unit/                   # Unit tests for individual components
├── integration/            # Integration tests  
├── e2e/                   # End-to-end tests
├── performance/           # Performance benchmarks
├── fixtures/              # Test data and sample files
└── helpers/               # Test utilities
```

### 2. Test Data Sets (`tests/fixtures/`)
- Sample codebases with various emoji types
- Edge case files (large, binary, malformed)
- Configuration examples (valid and invalid)
- Real-world repository samples

### 3. Performance Benchmarks (`tests/performance/`)
- Large codebase processing tests
- Memory usage validation
- Concurrent operation testing
- CI/CD pipeline performance validation

### 4. Cross-Platform Tests
- Windows, macOS, Linux compatibility
- Different Node.js versions
- Various file system scenarios

## Implementation Steps

### Step 1: Test Infrastructure Setup
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!dist/**'
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/core/': {
      branches: 95,
      functions: 98,
      lines: 98,
      statements: 98
    }
  },
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/setup.js']
};
```

### Step 2: Comprehensive Fixture Creation
```javascript
// tests/fixtures/generator.js
const fs = require('fs').promises;
const path = require('path');

class FixtureGenerator {
  async createTestCodebase() {
    const fixtures = {
      'with-emojis.js': `
        const message = "Hello ✨ World";
        console.log("Debug 🚀");
        // This has emojis: 🎉 🔥
      `,
      
      'mixed-content.py': `
        def greet():
            print("Hello 👋")  # emoji-linter-ignore-line
            print("World 🌍")
      `,
      
      'shortcodes.md': `
        # Project :rocket:
        
        Status: :white_check_mark: Complete
        
        ## Features :sparkles:
      `,
      
      'sequences.jsx': `
        const developer = "👨‍💻";
        const family = "👨‍👩‍👧‍👦";
        const flag = "🏳️‍🌈";
      `,
      
      'skin-tones.ts': `
        const waves = ["👋🏻", "👋🏼", "👋🏽", "👋🏾", "👋🏿"];
        const handshake = "🤝🏽";
      `,
      
      'clean-file.js': `
        const message = "Hello World";
        console.log("Debug info");
        // No emojis here
      `,
      
      'ignore-file.js': `
        // emoji-linter-ignore-file
        const status = "Ready ✨";
        const rocket = "🚀 Launch";
      `,
      
      'large-file.js': this.generateLargeFile(1000), // 1000 lines
      
      'binary-file.png': Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64')
    };

    // Create nested directory structure
    await this.createNestedStructure();
    
    return fixtures;
  }

  generateLargeFile(lines) {
    const content = [];
    for (let i = 0; i < lines; i++) {
      if (i % 100 === 0) {
        content.push(`console.log("Line ${i} with emoji ✨");`);
      } else {
        content.push(`console.log("Line ${i}");`);
      }
    }
    return content.join('\n');
  }

  async createNestedStructure() {
    const structure = {
      'src/': {
        'components/': {
          'Button.jsx': 'export const Button = () => <button>Click ✨</button>;',
          'Icon.tsx': 'export const Icon = ({ emoji }: { emoji: string }) => <span>{emoji}</span>;'
        },
        'utils/': {
          'helpers.js': 'export const format = (msg) => `${msg} 🚀`;',
          'constants.ts': 'export const EMOJI = "✨";'
        },
        'index.js': 'console.log("App started 🎉");'
      },
      'tests/': {
        'component.test.js': 'test("renders emoji 🧪", () => {});'
      },
      'docs/': {
        'README.md': '# Project 🚀\n\nThis has emojis ✨',
        'API.md': '## API Reference\n\nNo emojis here.'
      }
    };

    await this.createDirectoryStructure('tests/fixtures/sample-codebase', structure);
  }
}
```

### Step 3: Unit Test Suites

#### Emoji Detection Engine Tests
```javascript
// tests/unit/detector.test.js
describe('EmojiDetector', () => {
  let detector;

  beforeEach(() => {
    detector = new EmojiDetector();
  });

  describe('Unicode Emoji Detection', () => {
    const unicodeEmojis = ['✨', '🚀', '📝', '❤️', '🎉', '🔥', '💯'];
    
    test.each(unicodeEmojis)('detects Unicode emoji: %s', (emoji) => {
      const result = detector.findEmojis(`Hello ${emoji} World`);
      expect(result).toHaveLength(1);
      expect(result[0].emoji).toBe(emoji);
      expect(result[0].type).toBe('unicode');
    });
  });

  describe('Emoji Sequences', () => {
    const sequences = [
      '👨‍💻',  // Man technologist
      '🏳️‍🌈',  // Rainbow flag
      '👨‍👩‍👧‍👦',  // Family
      '🧑‍🚀',  // Astronaut
      '👩‍⚕️'   // Woman health worker
    ];

    test.each(sequences)('detects emoji sequence: %s', (sequence) => {
      const result = detector.findEmojis(`Code by ${sequence}`);
      expect(result).toHaveLength(1);
      expect(result[0].emoji).toBe(sequence);
      expect(result[0].type).toBe('sequence');
    });
  });

  describe('Skin Tone Modifiers', () => {
    const skinTones = ['👋🏻', '👋🏼', '👋🏽', '👋🏾', '👋🏿'];
    
    test.each(skinTones)('detects skin tone emoji: %s', (emoji) => {
      const result = detector.findEmojis(`Wave ${emoji}`);
      expect(result).toHaveLength(1);
      expect(result[0].emoji).toBe(emoji);
    });
  });

  describe('Shortcode Emojis', () => {
    const shortcodes = [':rocket:', ':sparkles:', ':heart:', ':fire:', ':100:'];
    
    test.each(shortcodes)('detects shortcode: %s', (shortcode) => {
      const result = detector.findEmojis(`Status ${shortcode}`);
      expect(result).toHaveLength(1);
      expect(result[0].emoji).toBe(shortcode);
      expect(result[0].type).toBe('shortcode');
    });
  });

  describe('Mixed Content', () => {
    test('detects multiple emoji types in same text', () => {
      const text = 'Unicode ✨, shortcode :rocket:, sequence 👨‍💻';
      const result = detector.findEmojis(text);
      
      expect(result).toHaveLength(3);
      expect(result[0].emoji).toBe('✨');
      expect(result[1].emoji).toBe(':rocket:');
      expect(result[2].emoji).toBe('👨‍💻');
    });
  });

  describe('Edge Cases', () => {
    test('handles empty string', () => {
      expect(detector.findEmojis('')).toHaveLength(0);
    });

    test('handles only emojis', () => {
      const result = detector.findEmojis('✨🚀📝');
      expect(result).toHaveLength(3);
    });

    test('handles very long text', () => {
      const longText = 'word '.repeat(10000) + '✨';
      const result = detector.findEmojis(longText);
      expect(result).toHaveLength(1);
      expect(result[0].emoji).toBe('✨');
    });
  });

  describe('Performance', () => {
    test('processes 1KB text quickly', () => {
      const text = 'Hello world ✨ '.repeat(50); // ~1KB
      const start = Date.now();
      detector.findEmojis(text);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(10); // < 10ms
    });

    test('processes 1MB text under 100ms', () => {
      const text = 'Hello world ✨ '.repeat(50000); // ~1MB
      const start = Date.now();
      detector.findEmojis(text);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // < 100ms
    });
  });
});
```

#### Configuration System Tests
```javascript
// tests/unit/config.test.js
describe('Configuration System', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'emoji-linter-test-'));
  });

  afterEach(async () => {
    await fs.rmdir(tempDir, { recursive: true });
  });

  test('loads valid configuration file', async () => {
    const configPath = path.join(tempDir, '.emoji-linter.json');
    const configData = {
      ignore: {
        files: ['*.test.js', 'docs/**'],
        emojis: ['✨']
      }
    };

    await fs.writeFile(configPath, JSON.stringify(configData));
    
    const config = new Config(configPath);
    expect(config.shouldIgnoreFile('app.test.js')).toBe(true);
    expect(config.shouldIgnoreFile('src/app.js')).toBe(false);
    expect(config.shouldIgnoreEmoji('✨')).toBe(true);
  });

  test('handles malformed configuration gracefully', () => {
    const configPath = path.join(tempDir, '.emoji-linter.json');
    
    expect(() => {
      fs.writeFileSync(configPath, '{ invalid json');
      new Config(configPath);
    }).toThrow(ConfigError);
  });

  test('validates glob patterns', () => {
    expect(() => {
      new Config().validateConfig({
        ignore: { files: ['[invalid-pattern'] }
      });
    }).toThrow(ConfigValidationError);
  });
});
```

### Step 4: Integration Tests
```javascript
// tests/integration/cli.test.js
describe('CLI Integration', () => {
  test('check mode with real codebase', async () => {
    const cli = new CLI();
    const exitCode = await cli.run(['tests/fixtures/sample-codebase'], { 
      check: true,
      format: 'json'
    });

    expect(exitCode).toBe(1); // Emojis found
  });

  test('fix mode modifies files correctly', async () => {
    // Copy fixture to temp location
    const tempFile = path.join(tempDir, 'test.js');
    await fs.copyFile('tests/fixtures/with-emojis.js', tempFile);

    const cli = new CLI();
    await cli.run([tempFile], { fix: true });

    const content = await fs.readFile(tempFile, 'utf8');
    expect(content).not.toContain('✨');
    expect(content).not.toContain('🚀');
  });

  test('respects ignore patterns', async () => {
    const configPath = path.join(tempDir, '.emoji-linter.json');
    await fs.writeFile(configPath, JSON.stringify({
      ignore: { files: ['**/*.md'] }
    }));

    const cli = new CLI();
    const exitCode = await cli.run(['tests/fixtures/sample-codebase'], {
      check: true,
      config: configPath
    });

    // Should ignore markdown files with emojis
    // Implementation should verify this logic
  });
});
```

### Step 5: Performance Benchmarks
```javascript
// tests/performance/benchmark.test.js
describe('Performance Benchmarks', () => {
  test('processes 1000+ files under 2 seconds', async () => {
    // Create large test codebase
    await createLargeCodebase(1000);

    const cli = new CLI();
    const start = Date.now();
    
    await cli.run(['tests/fixtures/large-codebase'], { check: true });
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
  });

  test('memory usage remains reasonable', async () => {
    const initialMemory = process.memoryUsage();
    
    const cli = new CLI();
    await cli.run(['tests/fixtures/large-codebase'], { check: true });
    
    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    
    expect(memoryIncrease).toBeLessThan(200 * 1024 * 1024); // < 200MB
  });

  test('GitHub Action performance in CI environment', async () => {
    // Simulate GitHub Actions environment
    process.env.GITHUB_ACTIONS = 'true';
    
    const action = require('../../src/action');
    const start = Date.now();
    
    await action.run();
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(30000); // < 30 seconds
  });
});
```

### Step 6: Cross-Platform Testing
```javascript
// tests/platform/compatibility.test.js
describe('Cross-Platform Compatibility', () => {
  const platforms = process.env.CI ? 
    ['win32', 'darwin', 'linux'] : 
    [process.platform];

  test.each(platforms)('works on %s', async (platform) => {
    // Mock platform-specific behavior
    Object.defineProperty(process, 'platform', {
      value: platform
    });

    const cli = new CLI();
    await expect(cli.run(['tests/fixtures/mixed-content'], {
      check: true
    })).resolves.not.toThrow();
  });

  test('handles Windows path separators', async () => {
    const windowsPath = 'src\\components\\Button.jsx';
    const config = new Config();
    
    // Should normalize paths consistently
    expect(config.shouldIgnoreFile(windowsPath)).toBeDefined();
  });

  test('handles different line endings', async () => {
    const contentWithCRLF = 'const msg = "Hello ✨";\r\nconst other = "World";';
    const detector = new EmojiDetector();
    
    const result = detector.findEmojis(contentWithCRLF);
    expect(result).toHaveLength(1);
  });
});
```

## Test Organization

### Test Categories
1. **Unit Tests** (95% coverage target)
   - Individual component functionality
   - Edge cases and error scenarios
   - Performance micro-benchmarks

2. **Integration Tests** (Real-world scenarios)
   - Component interaction
   - Configuration system integration
   - File system operations

3. **End-to-End Tests** (User workflows)
   - Complete CLI workflows
   - GitHub Action workflows
   - Error recovery scenarios

4. **Performance Tests** (Requirements validation)
   - Large codebase processing
   - Memory usage validation
   - Concurrent operations

### Test Data Management
```javascript
// tests/helpers/fixtures.js
class TestFixtures {
  static async setup() {
    // Create consistent test environment
  }
  
  static async cleanup() {
    // Clean up test artifacts  
  }
  
  static getEmojiSamples() {
    return {
      unicode: ['✨', '🚀', '📝', '❤️'],
      sequences: ['👨‍💻', '🏳️‍🌈'],
      shortcodes: [':rocket:', ':sparkles:'],
      skinTones: ['👋🏻', '👋🏿']
    };
  }
}
```

## Success Criteria

### Coverage Requirements
- [ ] Overall test coverage ≥95%
- [ ] Core detection engine ≥98% coverage
- [ ] All edge cases covered
- [ ] Error scenarios tested

### Performance Validation
- [ ] 1000+ file processing <2 seconds
- [ ] Memory usage <200MB for large codebases
- [ ] GitHub Action execution <30 seconds
- [ ] No memory leaks detected

### Quality Assurance
- [ ] All tests pass on CI/CD
- [ ] Cross-platform compatibility verified
- [ ] Real-world scenario testing completed
- [ ] Performance regression testing

### Documentation
- [ ] Test documentation complete
- [ ] Performance benchmark documentation
- [ ] Troubleshooting guide for test failures
- [ ] CI/CD integration guide

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node: [18, 20, 21]
    
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run test:performance
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Definition of Done
- All test suites pass consistently across platforms
- Performance requirements validated through benchmarks
- Test coverage meets or exceeds targets
- Real-world scenario testing completed successfully  
- CI/CD pipeline integration working
- Comprehensive test documentation available