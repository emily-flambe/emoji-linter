# Project Steering Document

## Mission Statement
Create a robust, dual-purpose emoji linting tool that:
1. **CLI Linter**: Scans codebases to detect and optionally remove emojis from source code (like python black)
2. **GitHub Action**: Validates emoji usage in commits, pull requests, and branches for CI/CD integration

Helping teams maintain professional, emoji-free codebases while supporting flexible workflow validation.

## Project Goals

### Primary Goals
1. **Dual-Purpose Architecture**: CLI tool for codebase linting + GitHub Action for workflow validation
2. **Comprehensive Emoji Detection**: Accurately detect all forms of emojis (Unicode, sequences, shortcodes, skin tones)
3. **Professional Code Cleanup**: Remove emojis from source code with ignore mechanisms
4. **Flexible Configuration**: Config file system for ignoring specific emojis, files, and directories
5. **Inline Ignore Support**: Comment-based ignore system (file-level and line-level)
6. **Fast Execution**: Efficient scanning and minimal CI/CD pipeline impact
7. **Easy Integration**: Simple CLI usage and GitHub workflow integration

### Success Metrics
- Zero false positives in emoji detection across all Unicode ranges
- < 2 seconds execution time for typical codebase scanning (1000+ files)
- < 5 seconds execution time for GitHub Action usage
- 95%+ test coverage on core functionality
- npm package publication + GitHub Marketplace listing
- CLI tool adoption: 500+ downloads/month
- GitHub Action usage: 100+ repositories

## Technical Priorities

### Must Have (P0)
- [ ] **CLI Tool Core**: Executable linter with file system scanning
- [ ] **Comprehensive Detection**: Unicode emojis, sequences, shortcodes, skin tones
- [ ] **Cleanup Modes**: Check-only, fix-in-place, write-to-stdout
- [ ] **Configuration System**: `.emoji-linter.json` config file support
- [ ] **File Ignoring**: Glob patterns for ignoring files/directories
- [ ] **Inline Ignoring**: Comment-based ignore system
  - `// emoji-linter-ignore-file` (top of file)
  - `// emoji-linter-ignore-line` or `// emoji-linter-ignore-next-line`
- [ ] **GitHub Action Mode**: Integration wrapper for CI/CD
- [ ] **Clear Error Messages**: File locations, line numbers, emoji details
- [ ] **Performance**: Fast scanning of large codebases

### Should Have (P1)
- [ ] **Advanced CLI Features**:
  - Diff mode (show what would change)
  - Statistics (emoji count by type)
  - Multiple output formats (JSON, table, minimal)
- [ ] **Enhanced Configuration**:
  - Individual emoji allow/deny lists
  - File type-specific rules
  - Custom regex patterns
- [ ] **GitHub Action Enhancements**:
  - PR comment feedback with diff
  - Branch name validation
  - Detailed action outputs
- [ ] **IDE Integration**: VS Code extension support

### Nice to Have (P2)
- [ ] Emoji statistics
- [ ] Custom regex patterns
- [ ] Webhook notifications
- [ ] Badge generation
- [ ] Usage analytics

## Development Phases

### Phase 1: CLI Foundation (Current)
- Set up project structure ✓
- **CLI Architecture**: Executable, argument parsing, file scanning
- **Core Detection Engine**: Comprehensive emoji detection
- **Configuration System**: Config file parsing, ignore mechanisms
- **Cleanup Logic**: In-place editing, backup options
- **Basic Testing**: Core functionality test suite

### Phase 2: GitHub Action Integration
- **Action Wrapper**: GitHub Action compatibility layer
- **CI/CD Features**: Validation modes, PR comments
- **Advanced Configuration**: Allow/deny lists, custom patterns
- **Performance Optimization**: Large codebase handling
- **Comprehensive Testing**: CLI + Action integration tests

### Phase 3: Distribution & Polish
- **npm Package**: CLI tool distribution
- **GitHub Marketplace**: Action publication
- **Documentation**: CLI usage guide, Action examples
- **IDE Integration**: VS Code extension foundation
- **Performance Benchmarking**: Large repository testing

### Phase 4: Growth
- Feature requests from users
- Performance improvements
- Additional validation targets
- Integration with other tools

## Quality Standards

### Code Quality
- **Test Coverage**: Minimum 80%, target 95% for core logic
- **Linting**: ESLint with standard configuration
- **Documentation**: JSDoc comments for all public methods
- **Code Review**: All PRs reviewed before merge

### Performance
- **Startup Time**: < 2 seconds
- **Validation Time**: < 100ms for typical text
- **Memory Usage**: < 50MB
- **Bundle Size**: < 1MB

### Security
- No hardcoded secrets or tokens
- Input validation on all user inputs
- Secure GitHub API usage
- Regular dependency updates

## Risk Management

### Technical Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Regex performance issues | High | Optimize patterns, add limits |
| Unicode compatibility | Medium | Fallback patterns, testing |
| API rate limiting | Medium | Caching, batch operations |
| Breaking changes | High | Semantic versioning, deprecation |

### Project Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Scope creep | Medium | Strict phase boundaries |
| Maintenance burden | Medium | Automation, clear docs |
| User adoption | Low | Marketing, examples |

## Maintenance Strategy

### Regular Tasks
- **Weekly**: Dependency updates check
- **Monthly**: Performance review
- **Quarterly**: Feature planning
- **Yearly**: Major version planning

### Support Channels
- GitHub Issues for bug reports
- GitHub Discussions for questions
- Pull Requests for contributions
- Documentation site for guides

## Decision Making

### Decision Process
1. **Proposals**: Create issue with detailed description
2. **Discussion**: Community and maintainer input
3. **Decision**: Based on project goals and technical merit
4. **Implementation**: Following development standards
5. **Review**: Code review and testing

### Decision Criteria
- Aligns with project mission
- Maintains backward compatibility
- Improves user experience
- Technically sound
- Maintainable long-term

## Communication

### Internal Communication
- Code comments for complex logic
- ADRs for architectural decisions
- PR descriptions for changes
- Commit messages following Gitmoji

### External Communication
- README for basic usage
- Wiki for detailed guides
- Releases for version updates
- Discussions for community

## Success Criteria

### Short Term (3 months)
- [ ] Published to GitHub Marketplace
- [ ] 100% test coverage on regex patterns
- [ ] Used in 10+ repositories
- [ ] Zero critical bugs

### Medium Term (6 months)
- [ ] 500+ GitHub stars
- [ ] Used in 100+ repositories
- [ ] Featured in GitHub blog/newsletter
- [ ] Community contributions

### Long Term (1 year)
- [ ] 1000+ GitHub stars
- [ ] Industry standard for emoji linting
- [ ] Integration with major CI/CD platforms
- [ ] Sustainable maintenance model

## Governance

### Roles
- **Maintainer**: Code review, releases, strategy
- **Contributors**: Features, bugs, documentation
- **Users**: Feedback, testing, promotion

### Contribution Guidelines
1. Fork the repository
2. Create feature branch
3. Write tests first (TDD)
4. Implement feature
5. Update documentation
6. Submit PR with description
7. Address review feedback

### Code of Conduct
- Be respectful and inclusive
- Welcome newcomers
- Provide constructive feedback
- Focus on technical merit
- Maintain professional standards