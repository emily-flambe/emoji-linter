# Testing Strategy for Emoji Linter

## Overview
Comprehensive testing strategy ensuring the emoji-linter GitHub Action works reliably across all use cases and edge conditions.

## Testing Levels

### 1. Unit Tests
Location: `tests/linter.test.js`, `tests/utils.test.js`

#### Core Functionality Tests
```javascript
// Emoji Detection
- Detect Unicode emojis
- Detect emoji sequences
- Detect shortcodes
- Handle skin tone modifiers
- Handle combined emojis
- Handle text with no emojis

// Validation Modes
- Require mode validation
- Forbid mode validation
- Count mode validation
- Position validation (start/end/anywhere)

// Edge Cases
- Empty strings
- Very long strings
- Strings with only spaces
- Mixed emoji types
- Invalid UTF-8 sequences
```

#### Test Data Sets
```javascript
const TEST_CASES = {
  withEmojis: [
    '✨ New feature',
    'Fix bug 🐛',
    ':sparkles: Add feature',
    '👨‍💻 Developer commit',
    '🏳️‍🌈 Pride update'
  ],
  withoutEmojis: [
    'Regular commit message',
    'Fix: Update dependencies',
    'feat(api): Add endpoint',
    'BREAKING CHANGE: Remove deprecated method'
  ],
  edgeCases: [
    '',  // Empty
    ' ',  // Whitespace only
    ':\\:',  // Fake shortcode
    '\u200B',  // Zero-width space
    '😀'.repeat(1000)  // Many emojis
  ]
};
```

### 2. Integration Tests
Location: `tests/action.test.js`

#### GitHub Context Mocking
```javascript
// Mock different GitHub events
const contexts = {
  pullRequest: {
    eventName: 'pull_request',
    payload: {
      pull_request: {
        title: '✨ Add new feature',
        body: 'This PR adds emoji validation',
        number: 123,
        head: { ref: 'feature/emoji-support' }
      }
    }
  },
  push: {
    eventName: 'push',
    payload: {
      head_commit: {
        message: '🐛 Fix critical bug'
      }
    }
  },
  issue: {
    eventName: 'issues',
    payload: {
      issue: {
        title: 'Bug: Emojis not detected'
      }
    }
  }
};
```

#### API Interaction Tests
```javascript
// Test GitHub API calls
- Creating PR comments
- Setting check runs
- Handling API errors
- Rate limiting scenarios
- Token validation
```

### 3. End-to-End Tests
Location: `.github/workflows/test.yml`

#### Workflow Tests
```yaml
test-scenarios:
  - Test require mode with PR
  - Test forbid mode with commit
  - Test count mode with branch
  - Test with allowed emoji list
  - Test with forbidden emoji list
  - Test comment posting
  - Test failure behavior
```

#### Matrix Testing
```yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest, macos-latest]
    node: [18, 20]
    mode: [require, forbid, count]
```

## Test Fixtures

### Fixture Structure
```
tests/fixtures/
├── emojis.json         # Emoji test data
├── commits.json        # Sample commit messages
├── pr-events.json      # GitHub PR event payloads
├── push-events.json    # GitHub push event payloads
└── configs.json        # Various action configurations
```

### Sample Fixtures

#### emojis.json
```json
{
  "unicode": ["✨", "🐛", "📝", "🚀", "✅"],
  "sequences": ["👨‍💻", "🏳️‍🌈", "👨‍👩‍👧‍👦"],
  "shortcodes": [":sparkles:", ":bug:", ":memo:"],
  "invalid": [":-)", ":)", "^_^", "¯\\_(ツ)_/¯"]
}
```

#### configs.json
```json
{
  "strict": {
    "mode": "require",
    "min-emojis": "1",
    "position": "start",
    "fail-on-error": "true"
  },
  "lenient": {
    "mode": "count",
    "min-emojis": "0",
    "max-emojis": "5",
    "fail-on-error": "false"
  }
}
```

## Testing Patterns

### Arrange-Act-Assert Pattern
```javascript
test('should detect Unicode emoji', () => {
  // Arrange
  const linter = new EmojiLinter({ mode: 'require' });
  const text = '✨ New feature';
  
  // Act
  const result = linter.lint(text);
  
  // Assert
  expect(result.passed).toBe(true);
  expect(result.count).toBe(1);
  expect(result.emojis).toContain('✨');
});
```

### Parameterized Tests
```javascript
describe.each([
  ['✨ Feature', true, 1],
  ['No emoji', false, 0],
  ['Multiple 🎨 emojis 🚀', true, 2]
])('lint("%s")', (text, shouldPass, expectedCount) => {
  test(`should ${shouldPass ? 'pass' : 'fail'} with ${expectedCount} emojis`, () => {
    const result = linter.lint(text);
    expect(result.passed).toBe(shouldPass);
    expect(result.count).toBe(expectedCount);
  });
});
```

### Mock Verification
```javascript
test('should post comment on PR failure', async () => {
  // Setup mocks
  const createComment = jest.fn();
  github.getOctokit.mockReturnValue({
    rest: { issues: { createComment } }
  });
  
  // Run action
  await run();
  
  // Verify
  expect(createComment).toHaveBeenCalledWith(
    expect.objectContaining({
      issue_number: 123,
      body: expect.stringContaining('Emoji Linter Results')
    })
  );
});
```

## Coverage Requirements

### Minimum Coverage Targets
- Overall: 80%
- Core logic (linter.js): 95%
- Regex patterns: 100%
- Error handling: 100%
- API interactions: 85%

### Coverage Reports
```bash
# Generate coverage
npm test -- --coverage

# Coverage output
--------------------|---------|----------|---------|---------|
File                | % Stmts | % Branch | % Funcs | % Lines |
--------------------|---------|----------|---------|---------|
All files           |   85.32 |    82.14 |   90.00 |   85.32 |
 src/linter.js      |   95.45 |    93.75 |  100.00 |   95.45 |
 src/index.js       |   78.26 |    75.00 |   83.33 |   78.26 |
 src/utils.js       |   88.89 |    85.71 |   90.00 |   88.89 |
--------------------|---------|----------|---------|---------|
```

## Local Testing

### Manual Testing Script
```bash
#!/bin/bash
# test-local.sh

# Test with act (GitHub Actions emulator)
act pull_request -e tests/fixtures/pr-event.json

# Test specific scenarios
act -j test-require
act -j test-forbid
act -j test-count

# Test with different inputs
act pull_request \
  --input mode=forbid \
  --input target=branch \
  -e tests/fixtures/pr-event.json
```

### Docker Testing
```dockerfile
# Dockerfile.test
FROM node:20
WORKDIR /action
COPY . .
RUN npm ci
RUN npm test
RUN npm run build
ENTRYPOINT ["node", "/action/dist/index.js"]
```

## Continuous Testing

### Pre-commit Hooks
```json
// .husky/pre-commit
{
  "hooks": {
    "pre-commit": "npm test && npm run lint",
    "pre-push": "npm run build && npm test"
  }
}
```

### CI Pipeline
```yaml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test -- --coverage
      - run: npm run lint
      - run: npm run build
      
  test-action:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./
        with:
          mode: require
          target: commit
```

## Performance Testing

### Benchmark Tests
```javascript
test('should handle large strings efficiently', () => {
  const largeText = 'text '.repeat(10000) + '✨';
  
  const start = Date.now();
  const result = linter.lint(largeText);
  const duration = Date.now() - start;
  
  expect(duration).toBeLessThan(100); // < 100ms
  expect(result.count).toBe(1);
});
```

### Memory Testing
```javascript
test('should not leak memory', () => {
  const initialMemory = process.memoryUsage().heapUsed;
  
  // Run many iterations
  for (let i = 0; i < 1000; i++) {
    const linter = new EmojiLinter({ mode: 'require' });
    linter.lint('✨ Test');
  }
  
  global.gc(); // Force garbage collection
  const finalMemory = process.memoryUsage().heapUsed;
  
  // Memory increase should be minimal
  expect(finalMemory - initialMemory).toBeLessThan(1024 * 1024); // < 1MB
});
```

## Regression Testing

### Regression Test Suite
```javascript
// tests/regression.test.js
describe('Regression Tests', () => {
  test('Issue #1: Should handle emoji at end', () => {
    // Specific test for reported issue
  });
  
  test('Issue #2: Should detect skin tone modifiers', () => {
    // Test for skin tone bug
  });
});
```

## Test Maintenance

### Test Review Checklist
- [ ] All new features have tests
- [ ] All bug fixes include regression tests
- [ ] Tests are readable and documented
- [ ] Tests cover happy path and edge cases
- [ ] Tests are independent and idempotent
- [ ] Test data is realistic
- [ ] Mocks are properly cleaned up

### Test Refactoring Guidelines
1. Keep tests DRY with shared fixtures
2. Extract common test utilities
3. Use descriptive test names
4. Group related tests with describe blocks
5. Update tests when requirements change