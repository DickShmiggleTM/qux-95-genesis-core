
# Changelog

All notable changes to the QUX-95 system will be documented in this file.

## [1.1.0] - 2025-04-08

### Added
- Integrated File Workspace system for AI to read/write/manage files
- Added GitHub integration for repository management, commits, and syncing
- Implemented self-supervised learning capability with model tracking
- Enhanced "Hacker" theme to properly enable dark mode
- Added proper TypeScript definitions for system state interfaces
- Fixed various TypeScript errors across the codebase

### Changed
- Improved ThemeContext to handle dark mode and "Hacker" theme integration
- Enhanced saveSystem to support additional state data types
- Refined workspaceService for proper file management

### Fixed
- Fixed SavedState interface to include proper typing for all system components
- Corrected async GitHub commit handling in systemUtils
- Fixed Theme type definitions across the application
- Resolved type errors in learning and workspace services
