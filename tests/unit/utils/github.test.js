/**
 * Tests for GitHub utilities
 */

const github = require('@actions/github');
const { GitHubUtils } = require('../../../src/utils/github');

// Mock @actions/github
jest.mock('@actions/github');

describe('GitHubUtils', () => {
  let mockOctokit;
  let mockCreateComment;
  let githubUtils;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock Octokit methods
    mockCreateComment = jest.fn();
    mockOctokit = {
      rest: {
        issues: {
          createComment: mockCreateComment
        }
      }
    };

    // Mock getOctokit
    github.getOctokit = jest.fn().mockReturnValue(mockOctokit);

    // Mock GitHub context
    github.context = {
      repo: {
        owner: 'test-user',
        repo: 'test-repo'
      }
    };

    // Create GitHubUtils instance
    githubUtils = new GitHubUtils('fake-token');
  });

  describe('Constructor', () => {
    it('should create instance with token', () => {
      const utils = new GitHubUtils('test-token');
      expect(utils).toBeInstanceOf(GitHubUtils);
      expect(github.getOctokit).toHaveBeenCalledWith('test-token');
    });

    it('should throw error without token', () => {
      expect(() => new GitHubUtils()).toThrow('GitHub token is required');
      expect(() => new GitHubUtils('')).toThrow('GitHub token is required');
      expect(() => new GitHubUtils(null)).toThrow('GitHub token is required');
    });
  });

  describe('postPRComment', () => {
    it('should post PR comment successfully', async () => {
      const prNumber = 123;
      const commentBody = 'Test comment';

      mockCreateComment.mockResolvedValue({
        data: { id: 456, html_url: 'https://github.com/test-user/test-repo/issues/123#issuecomment-456' }
      });

      const result = await githubUtils.postPRComment(prNumber, commentBody);

      expect(mockCreateComment).toHaveBeenCalledWith({
        owner: 'test-user',
        repo: 'test-repo',
        issue_number: prNumber,
        body: commentBody
      });

      expect(result).toEqual({
        id: 456,
        url: 'https://github.com/test-user/test-repo/issues/123#issuecomment-456'
      });
    });

    it('should handle API errors gracefully', async () => {
      const prNumber = 123;
      const commentBody = 'Test comment';

      mockCreateComment.mockRejectedValue(new Error('GitHub API error'));

      await expect(githubUtils.postPRComment(prNumber, commentBody))
        .rejects.toThrow('Failed to post PR comment: GitHub API error');
    });

    it('should validate PR number', async () => {
      const commentBody = 'Test comment';

      await expect(githubUtils.postPRComment(null, commentBody))
        .rejects.toThrow('PR number is required');

      await expect(githubUtils.postPRComment('', commentBody))
        .rejects.toThrow('PR number is required');

      await expect(githubUtils.postPRComment(0, commentBody))
        .rejects.toThrow('PR number must be a positive integer');

      await expect(githubUtils.postPRComment(-1, commentBody))
        .rejects.toThrow('PR number must be a positive integer');
    });

    it('should validate comment body', async () => {
      const prNumber = 123;

      await expect(githubUtils.postPRComment(prNumber, null))
        .rejects.toThrow('Comment body is required');

      await expect(githubUtils.postPRComment(prNumber, ''))
        .rejects.toThrow('Comment body is required');

      await expect(githubUtils.postPRComment(prNumber, '   '))
        .rejects.toThrow('Comment body is required');
    });
  });

  describe('formatEmojiReport', () => {
    it('should format report for clean mode with no emojis', () => {
      const results = [];
      const summary = {
        totalFiles: 5,
        filesWithEmojis: 0,
        totalEmojis: 0,
        errors: []
      };
      const mode = 'clean';

      const report = GitHubUtils.formatEmojiReport(results, summary, mode);

      expect(report).toContain('## Emoji Linter Report');
      expect(report).toContain('**Status:** ✅ No emojis found');
      expect(report).toContain('**Mode:** clean');
      expect(report).toContain('**Files scanned:** 5');
      expect(report).toContain('**Files with emojis:** 0');
      expect(report).toContain('**Total emojis:** 0');
    });

    it('should format report for forbid mode with emojis found', () => {
      const results = [
        {
          filePath: './src/test.js',
          emojis: [
            { emoji: '👍', type: 'unicode', lineNumber: 10, columnNumber: 5 },
            { emoji: '🎉', type: 'unicode', lineNumber: 15, columnNumber: 20 }
          ]
        },
        {
          filePath: './src/other.js',
          emojis: [
            { emoji: '❤️', type: 'unicode', lineNumber: 3, columnNumber: 15 }
          ]
        }
      ];
      const summary = {
        totalFiles: 5,
        filesWithEmojis: 2,
        totalEmojis: 3,
        errors: []
      };
      const mode = 'forbid';

      const report = GitHubUtils.formatEmojiReport(results, summary, mode);

      expect(report).toContain('## Emoji Linter Report');
      expect(report).toContain('**Status:** ❌ Emojis found');
      expect(report).toContain('**Mode:** forbid');
      expect(report).toContain('**Files scanned:** 5');
      expect(report).toContain('**Files with emojis:** 2');
      expect(report).toContain('**Total emojis:** 3');
      
      // Check file details
      expect(report).toContain('### Files with emojis:');
      expect(report).toContain('**./src/test.js** (2 emojis)');
      expect(report).toContain('- Line 10, Column 5: 👍 (unicode)');
      expect(report).toContain('- Line 15, Column 20: 🎉 (unicode)');
      expect(report).toContain('**./src/other.js** (1 emoji)');
      expect(report).toContain('- Line 3, Column 15: ❤️ (unicode)');
    });


    it('should include error information when present', () => {
      const results = [];
      const summary = {
        totalFiles: 2,
        filesWithEmojis: 0,
        totalEmojis: 0,
        errors: [
          { filePath: './src/broken.js', error: 'File not readable' },
          { filePath: './src/binary.bin', error: 'Binary file skipped' }
        ]
      };
      const mode = 'clean';

      const report = GitHubUtils.formatEmojiReport(results, summary, mode);

      expect(report).toContain('### Errors encountered:');
      expect(report).toContain('- **./src/broken.js**: File not readable');
      expect(report).toContain('- **./src/binary.bin**: Binary file skipped');
    });

    it('should handle empty results gracefully', () => {
      const results = [];
      const summary = {
        totalFiles: 0,
        filesWithEmojis: 0,
        totalEmojis: 0,
        errors: []
      };
      const mode = 'clean';

      const report = GitHubUtils.formatEmojiReport(results, summary, mode);

      expect(report).toContain('## Emoji Linter Report');
      expect(report).toContain('**Files scanned:** 0');
      expect(report).not.toContain('### Files with emojis:');
    });

    it('should limit file details when there are many files', () => {
      const results = [];
      for (let i = 1; i <= 15; i++) {
        results.push({
          filePath: `./src/file${i}.js`,
          emojis: [
            { emoji: '👍', type: 'unicode', lineNumber: 1, columnNumber: 1 }
          ]
        });
      }

      const summary = {
        totalFiles: 20,
        filesWithEmojis: 15,
        totalEmojis: 15,
        errors: []
      };
      const mode = 'forbid';

      const report = GitHubUtils.formatEmojiReport(results, summary, mode);

      // Should show first 10 files
      expect(report).toContain('**./src/file1.js**');
      expect(report).toContain('**./src/file10.js**');
      expect(report).toContain('... and 5 more files');
      expect(report).not.toContain('**./src/file11.js**');
    });
  });

  describe('validateInputs', () => {
    it('should validate valid inputs', () => {
      const validInputs = [
        { mode: 'clean', path: '.', configFile: '.emoji-linter.json' },
        { mode: 'clean', path: './src', configFile: 'custom.json' },
        { mode: 'forbid', path: '/absolute/path', configFile: '.emoji-linter.json' }
      ];

      validInputs.forEach(inputs => {
        expect(() => GitHubUtils.validateInputs(inputs)).not.toThrow();
      });
    });

    it('should reject invalid mode', () => {
      const inputs = { mode: 'invalid', path: '.', configFile: '.emoji-linter.json' };
      expect(() => GitHubUtils.validateInputs(inputs))
        .toThrow('Invalid mode: invalid. Valid modes: clean, forbid');
    });

    it('should reject empty path', () => {
      const inputs = { mode: 'clean', path: '', configFile: '.emoji-linter.json' };
      expect(() => GitHubUtils.validateInputs(inputs))
        .toThrow('Path cannot be empty');

      const inputsNull = { mode: 'clean', path: null, configFile: '.emoji-linter.json' };
      expect(() => GitHubUtils.validateInputs(inputsNull))
        .toThrow('Path cannot be empty');
    });

    it('should reject empty config file', () => {
      const inputs = { mode: 'clean', path: '.', configFile: '' };
      expect(() => GitHubUtils.validateInputs(inputs))
        .toThrow('Config file cannot be empty');

      const inputsNull = { mode: 'clean', path: '.', configFile: null };
      expect(() => GitHubUtils.validateInputs(inputsNull))
        .toThrow('Config file cannot be empty');
    });
  });

  describe('isPullRequest', () => {
    it('should detect pull request events', () => {
      const prContexts = [
        { eventName: 'pull_request', payload: { pull_request: { number: 123 } } },
        { eventName: 'pull_request_target', payload: { pull_request: { number: 456 } } }
      ];

      prContexts.forEach(context => {
        expect(GitHubUtils.isPullRequest(context)).toBe(true);
      });
    });

    it('should reject non-pull request events', () => {
      const nonPrContexts = [
        { eventName: 'push', payload: {} },
        { eventName: 'issue', payload: {} },
        { eventName: 'release', payload: {} },
        { eventName: 'pull_request', payload: {} }, // Missing pull_request in payload
        { eventName: 'pull_request_target', payload: {} } // Missing pull_request in payload
      ];

      nonPrContexts.forEach((context) => {
        const result = GitHubUtils.isPullRequest(context);
        expect(result).toBe(false);
      });
    });
  });

  describe('getPRNumber', () => {
    it('should extract PR number from context', () => {
      const contexts = [
        { payload: { pull_request: { number: 123 } } },
        { payload: { pull_request: { number: 456 } } }
      ];

      expect(GitHubUtils.getPRNumber(contexts[0])).toBe(123);
      expect(GitHubUtils.getPRNumber(contexts[1])).toBe(456);
    });

    it('should return null for invalid context', () => {
      const invalidContexts = [
        { payload: {} },
        { payload: { pull_request: {} } },
        { payload: { pull_request: { number: null } } },
        { payload: { pull_request: { number: 'not-a-number' } } }
      ];

      invalidContexts.forEach(context => {
        expect(GitHubUtils.getPRNumber(context)).toBeNull();
      });
    });
  });
});