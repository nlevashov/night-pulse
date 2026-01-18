# Night Pulse

iOS app for tracking and sharing your sleep heart rate data with your coach or team.

## Features

- **Sleep Heart Rate Analysis**: Automatically fetches sleep and heart rate data from Apple HealthKit
- **Daily Reports**: Generates visual charts with heart rate trends across sleep phases (Core, Deep, REM)
- **Multiple Sharing Channels**:
  - Gmail: Send reports via email with chart attachment
  - Telegram: Send to a bot/group with formatted message and chart
  - Manual Share: Use iOS share sheet to send anywhere
- **Background Delivery**: Automatically sends reports after you wake up
- **Outlier Detection**: Uses IQR method to filter unrealistic heart rate values

## Screenshots

[TODO: Add screenshots]

## Requirements

- iOS 15.0+
- Apple Watch with heart rate and sleep tracking enabled
- Node.js 18+

## Quick Start

```bash
# Clone the repository
git clone https://github.com/nlevashov/night-pulse.git
cd night-pulse

# Install dependencies
npm install

# Start Metro bundler
npm start

# Build and run on iOS simulator
npx expo run:ios
```

> **Note**: This app requires a development build (not Expo Go) due to native HealthKit integration.

## Configuration

### Google OAuth (for Gmail)

To use Gmail integration, you need your own Google OAuth credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API
4. Create OAuth 2.0 credentials (iOS application)
5. Add your iOS bundle identifier: `com.yourname.nightpulse`
6. Copy the Client ID

Update `lib/config.ts`:
```typescript
export const GOOGLE_CLIENT_ID = 'your-client-id.apps.googleusercontent.com';
```

Update `app.json` with your reversed client ID in `CFBundleURLSchemes`:
```json
"CFBundleURLSchemes": [
  "com.googleusercontent.apps.your-client-id"
]
```

### Telegram Bot

1. Create a bot via [@BotFather](https://t.me/botfather)
2. Get your chat ID (send a message to your bot and check the Telegram API)
3. Configure in the app's Channels settings

## Project Structure

```
├── app/                      # Expo Router pages
│   ├── (tabs)/              # Tab navigation screens
│   │   ├── index.tsx        # History list (home)
│   │   └── channels.tsx     # Channel settings
│   ├── day/[date].tsx       # Day detail with chart
│   └── _layout.tsx          # Root layout
├── components/              # Reusable UI components
│   ├── cards/              # Card components (HistoryRow, etc.)
│   ├── charts/             # Chart rendering (MiniSparkline, etc.)
│   ├── sharing/            # Share-related components
│   └── ui/                 # Basic UI elements (buttons, icons)
├── lib/                     # Core business logic
│   ├── background/         # Background task handling
│   ├── channels/           # Gmail, Telegram integrations
│   ├── formatting/         # Report text generation
│   ├── healthkit/          # HealthKit data fetching
│   ├── processing/         # Data analysis & outlier detection
│   ├── sharing/            # Share sheet integration
│   ├── storage/            # AsyncStorage & SecureStore
│   ├── config.ts           # App configuration
│   └── types.ts            # Core type definitions
├── constants/              # Colors, sleep phases
├── __tests__/              # Unit tests
└── assets/                 # Images, icons, fonts
```

## Key Technologies

| Technology | Purpose |
|------------|---------|
| [Expo](https://expo.dev/) | React Native framework |
| [Expo Router](https://docs.expo.dev/router/introduction/) | File-based routing |
| [@kingstinct/react-native-healthkit](https://github.com/kingstinct/react-native-healthkit) | HealthKit integration |
| [react-native-bottom-tabs](https://github.com/nicktaylor/react-native-bottom-tabs) | Native iOS tab bar |
| [react-native-share](https://github.com/react-native-share/react-native-share) | iOS share sheet |

## HealthKit Permissions

The app requests read access to:
- **Sleep Analysis** - Sleep phases and duration
- **Heart Rate** - HR measurements during sleep
- **Step Count** - Wake detection trigger
- **Workouts** - Wake detection trigger

## Background Delivery

The app uses `expo-background-fetch` to automatically check for and send sleep reports:

| Setting | Value |
|---------|-------|
| Minimum interval | 15 minutes (iOS minimum) |
| Active hours | 07:00 - 19:00 |
| Wake triggers | 1 hour passed, 100+ steps, or workout started |

> **Note**: iOS controls actual execution timing based on battery, network, and usage patterns.

## Development

### Available Scripts

```bash
npm start           # Start Metro bundler
npm run ios         # Run on iOS simulator
npm run android     # Run on Android emulator
npm test            # Run unit tests
npm run test:watch  # Run tests in watch mode
npm run test:coverage # Run tests with coverage
npm run typecheck   # TypeScript type checking
npm run lint        # ESLint code linting
```

### Building

```bash
# Development build
eas build --profile development --platform ios

# Preview build
eas build --profile preview --platform ios

# Production build
eas build --profile production --platform ios
```

## Contributing

We welcome contributions! Please follow these guidelines:

### Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `npm test`
5. Run type checking: `npm run typecheck`
6. Commit with a descriptive message
7. Push and create a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow the existing code patterns
- Add JSDoc comments for public functions
- Write unit tests for new logic in `lib/`

### Commit Messages

Use clear, descriptive commit messages:
- `feat: Add new feature`
- `fix: Fix bug in component`
- `refactor: Improve code structure`
- `docs: Update documentation`
- `test: Add unit tests`

### Pull Request Guidelines

- Keep PRs focused on a single feature/fix
- Update tests if changing behavior
- Update README if adding new features
- Ensure all tests pass before requesting review

## Architecture

### Data Flow

```
HealthKit → sleep-analyzer → SleepDay → formatting → channels
                  ↓
            outlier-detection
                  ↓
              statistics
```

### Key Modules

- **`lib/processing/sleep-analyzer.ts`** - Main data processing pipeline
- **`lib/processing/outlier-detection.ts`** - IQR-based outlier filtering
- **`lib/formatting/report-text.ts`** - Unified text generation for all channels
- **`lib/background/tasks.ts`** - Background task orchestration

## Troubleshooting

### HealthKit data not appearing
- Ensure Apple Watch is synced with iPhone
- Check HealthKit permissions in iOS Settings
- Sleep data needs to be recorded by Apple Watch

### Background sends not working
- Background App Refresh must be enabled
- iOS may delay or skip background tasks based on usage patterns
- Check device logs for `[Background]` or `[MorningCheck]` entries

### Gmail authentication issues
- Verify Google OAuth credentials are correct
- Check that the reversed client ID in `app.json` matches
- Ensure Gmail API is enabled in Google Cloud Console

## License

MIT License - see [LICENSE](LICENSE) for details.

## Links

- [Expo Documentation](https://docs.expo.dev/)
- [HealthKit Documentation](https://developer.apple.com/documentation/healthkit)
- [Report Issues](https://github.com/nlevashov/night-pulse/issues)
