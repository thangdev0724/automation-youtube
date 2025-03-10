# YouTube Automation

A sophisticated TypeScript-based automation tool for simulating realistic user behavior on YouTube.

## Overview

This project simulates human-like interactions with YouTube, including browsing the home page, searching for content, watching videos, and interacting with videos (likes, comments, subscribes). The automation follows configurable behavior patterns with probabilistic decision making to mimic natural user sessions.

## Features

- **State Machine Workflow**: Uses XState for managing complex user session flows
- **Realistic User Simulation**:
  - Configurable probability-based actions
  - Human-like timing and randomized delays
  - Natural scrolling and navigation patterns
  - Authentic engagement behaviors (likes, comments, subscriptions)
- **Customizable Session Parameters**:
  - Session duration limits
  - Video watch count limits
  - Idle timeout settings
  - Interaction rates
- **Detailed Logging**: Comprehensive session logs and screenshot capturing
- **Google Sheets Integration**: Configuration can be loaded from Google Sheets
- **Persistent Browser Sessions**: Maintains cookies and login state

## Architecture

The project is built with a modular architecture:

- **Controllers**: Handle specific page interactions
  - `HomeController`: Manages home page browsing
  - `SearchController`: Handles search interactions
  - `VideoController`: Controls video playback and interactions
  - `BrowserManager`: Manages browser sessions
- **Models**: Encapsulates business logic
  - `Session`: Tracks session state and limits
- **State Machine**: Defines the overall user flow
  - `youtube-machine.ts`: XState machine for managing session states
- **Utilities**: Helper functions
  - `logger.ts`: Logging utilities
  - `random.ts`: Probability and randomization functions

## Configuration

The application behavior is highly configurable through Google Sheets or environment variables. Major configuration parameters include:

### Session Limits
- `sessionDuration`: Maximum session length (minutes)
- `maxVideos`: Maximum videos to watch per session
- `idleTimeout`: Maximum idle time before ending session

### Browsing Behavior
- Home page navigation probabilities
- Search behavior patterns
- Video watching patterns

### Interaction Rates
- `likeVideo`: Probability of liking videos
- `commentVideo`: Probability of commenting
- `subscribeChannel`: Probability of subscribing

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up Google Sheets API credentials:
   - Create a service account in Google Cloud Console
   - Add credentials to `src/config/credentials.json`
   - Share your Google Sheet with the service account email

4. Create `.env` file with:
   ```
   GOOGLE_SHEET_ID=your_sheet_id
   HEADLESS=false  # Set to true for headless operation
   SLOW_MO=50      # Delay for each action (ms)
   RECORD_VIDEO=false  # Set to true to record sessions
   ```

5. Build the project:
   ```bash
   npm run build
   ```

## Usage

Run the application:

```bash
npm start
```

For development with auto-reloading:

```bash
npm run dev
```

## State Flow Diagram

The application follows a complex state machine flow (see `optimized-state-flow.mermaid`), which maps out the entire user journey including:

- Session initialization
- Login process
- Home page browsing
- Search behavior
- Video watching
- User interactions
- Session termination
- Statistics collection

## Data Collection

Each session records:
- Videos watched
- Searches performed
- Interactions (likes, comments, subscribes)
- Session duration
- Navigation patterns

This data can be automatically uploaded to Google Sheets for analysis.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## Dependencies

- TypeScript
- Playwright (browser automation)
- XState (state management)
- Google APIs (sheets integration)
- Winston (logging)
- dotenv (environment configuration)

## License

[MIT License](LICENSE)