# Development Standards for Emoji Linter

## Code Style Guidelines

### JavaScript Standards
- Use ES6+ features (arrow functions, destructuring, template literals)
- Prefer `const` over `let`, avoid `var`
- Use meaningful variable names
- Keep functions small and focused (< 20 lines ideally)
- Use async/await over callbacks or raw promises

### Naming Conventions
```javascript
// Classes: PascalCase
class EmojiLinter { }

// Functions/Methods: camelCase
function findEmojis() { }

// Constants: UPPER_SNAKE_CASE
const EMOJI_REGEX = /.../;

// Private methods: prefix with underscore
_validateInput() { }
```

### File Organization
```
src/
  index.js      // Entry point only - minimal logic
  linter.js     // Core linting class and logic
  utils.js      // Helper functions
  constants.js  // Regex patterns and constants
```

## GitHub Action Specific Standards

### Input Handling
```javascript
// ALWAYS use @actions/core for inputs
const mode = core.getInput('mode');

// ALWAYS provide defaults
const minEmojis = parseInt(core.getInput('min-emojis')) || 1;

// ALWAYS validate inputs
if (!['require', 'forbid', 'count'].includes(mode)) {
  throw new Error(`Invalid mode: ${mode}`);
}
```

### Output Standards
```javascript
// Use structured outputs
core.setOutput('passed', result.passed);
core.setOutput('emoji-count', result.count);
core.setOutput('message', result.message);

// Provide detailed failure reasons
core.setFailed(`Validation failed: ${specific_reason}`);
```

### Error Handling Pattern
```javascript
async function run() {
  try {
    // Main logic
  } catch (error) {
    // ALWAYS provide context
    core.setFailed(`Action failed: ${error.message}`);
    
    // Log full error in debug mode
    core.debug(error.stack);
  }
}
```

## Testing Standards

### Test Structure
```javascript
describe('EmojiLinter', () => {
  describe('require mode', () => {
    test('should pass when emoji present', () => {
      // Arrange
      const linter = new EmojiLinter({ mode: 'require' });
      
      // Act
      const result = linter.lint('✨ Feature');
      
      // Assert
      expect(result.passed).toBe(true);
    });
  });
});
```

### Test Coverage Requirements
- Minimum 80% overall coverage
- 100% coverage for regex patterns
- All error paths must be tested
- All input combinations tested

## Emoji Detection Standards

### Pattern Requirements
Must detect:
1. Unicode emojis: ✨ 🚀 📝
2. Emoji sequences: 👨‍💻 🏳️‍🌈
3. Shortcodes: :sparkles: :rocket:
4. Skin tone modifiers: 👋🏻 👋🏿
5. Combined emojis: 👨‍👩‍👧‍👦

### Regex Patterns
```javascript
// Unicode emoji pattern (comprehensive)
const EMOJI_REGEX = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;

// Shortcode pattern
const SHORTCODE_REGEX = /:[a-zA-Z0-9_+-]+:/g;

// Use Unicode property escapes when available
// Fallback to explicit ranges for older Node versions
```

## Build and Distribution

### Build Process
1. Source code in `src/`
2. Build with `@vercel/ncc`
3. Output to `dist/index.js`
4. Commit both source and dist

### Distribution Requirements
- `dist/index.js` MUST be committed
- Must be rebuilt for every change
- Include source maps for debugging
- Bundle all dependencies

### Version Management
```bash
# Patch version for bug fixes
npm version patch  # 1.0.0 -> 1.0.1

# Minor version for new features
npm version minor  # 1.0.0 -> 1.1.0

# Major version for breaking changes
npm version major  # 1.0.0 -> 2.0.0
```

## Performance Guidelines

### Optimization Priorities
1. **Fast startup** - Action should start quickly
2. **Efficient regex** - Optimize pattern matching
3. **Minimal API calls** - Batch GitHub API operations
4. **Early exit** - Fail fast on errors

### Memory Management
- Don't load entire files into memory
- Stream large content when possible
- Clear references to large objects
- Use const for immutable values

## Documentation Standards

### Code Comments
```javascript
/**
 * Validates emoji usage according to configured rules
 * @param {string} text - Text to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
function validateEmojis(text, options) {
  // Complex logic explanation here
  
  // TODO: Future enhancement description
  
  // HACK: Temporary workaround explanation
}
```

### README Requirements
- Clear usage examples
- All inputs documented
- Output format explained
- Common use cases shown
- Troubleshooting section

## Security Guidelines

### Token Handling
```javascript
// NEVER hardcode tokens
const token = core.getInput('github-token');

// ALWAYS use token from input
const octokit = github.getOctokit(token);

// NEVER log tokens
core.setSecret(token);  // Masks in logs
```

### Input Validation
```javascript
// Sanitize user inputs
const sanitized = input.replace(/[^\w\s-]/g, '');

// Validate numeric inputs
const num = parseInt(input);
if (isNaN(num) || num < 0) {
  throw new Error('Invalid number');
}

// Limit array sizes
const emojis = input.split(',').slice(0, 100);
```

## Continuous Integration

### Required Checks
- Tests must pass
- Linting must pass
- Build must succeed
- Coverage > 80%

### Automated Workflows
```yaml
# On every PR
- Run tests
- Check linting
- Verify build
- Post coverage report

# On merge to main
- Run full test suite
- Build distribution
- Create release draft
```

## Common Patterns

### Configuration Object Pattern
```javascript
const defaultOptions = {
  mode: 'require',
  minEmojis: 1,
  maxEmojis: null,
  position: 'anywhere'
};

const options = { ...defaultOptions, ...userOptions };
```

### Result Object Pattern
```javascript
return {
  passed: boolean,
  count: number,
  message: string,
  emojis: array,
  details: object
};
```

### Feature Flag Pattern
```javascript
const features = {
  advancedDetection: process.env.ADVANCED_DETECTION === 'true',
  unicodeProperties: supportsUnicodeProperties()
};
```