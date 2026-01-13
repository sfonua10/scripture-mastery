# Scripture Mastery Pro - Development Guide

## Project Overview

Scripture Mastery Pro is a mobile app that tests users' knowledge of LDS scriptures through a quiz-style game. Users see a scripture passage and guess its source (book, chapter, and/or verse) based on difficulty level.

**Target Audience:**
- Members of The Church of Jesus Christ of Latter-day Saints
- Seminary and Institute students
- Anyone interested in scripture memorization

## Tech Stack

- **Framework:** React Native 0.76.7 with Expo 52
- **Language:** TypeScript 5.3
- **Navigation:** Expo Router 4.0 (file-based routing)
- **State Management:** React Context API + AsyncStorage
- **Key Libraries:**
  - `expo-haptics` - Vibration feedback
  - `expo-sharing` + `react-native-view-shot` - Social sharing with score cards
  - `react-native-confetti-cannon` - Celebration animations
  - `expo-linear-gradient` - Gradient buttons
  - `@expo/vector-icons` - UI icons

## Project Structure

```
/app                    # Expo Router screens
  /(tabs)/
    index.tsx          # Home screen (mode selection)
    settings.tsx       # Settings screen
    _layout.tsx        # Tab navigator config
  game.tsx             # Main game screen
  _layout.tsx          # Root layout with ThemeProvider

/components            # Reusable UI components
  ThemedText.tsx       # Theme-aware text
  ThemedView.tsx       # Theme-aware container
  TutorialModal.tsx    # How to Play modal
  HapticTab.tsx        # Tab with haptic feedback

/contexts
  ThemeContext.tsx     # Light/dark/system theme management

/data                  # Scripture data
  scriptureData.ts     # Aggregates all scripture collections
  oldTestamentScriptures.ts
  newTestamentScriptures.ts
  bookOfMormonScriptures.ts
  doctrineAndCovenantsScriptures.ts

/hooks
  useColorScheme.ts    # Current color scheme hook
  useThemeColor.ts     # Get theme-aware colors
  useTutorial.ts       # Tutorial visibility state

/utils
  scriptureUtils.ts    # Answer validation, random selection

/types
  scripture.ts         # Scripture, GameMode, GameStats types

/constants
  Colors.ts            # Light/dark color palette

/assets
  /icons               # App icons (iOS, Android)
  /images              # Banner and screenshots
```

## Common Commands

```bash
npm install            # Install dependencies
npx expo start         # Start dev server (Expo Go)
npm test               # Run Jest tests
```

### Building & Running (Use EAS, not local builds)

**IMPORTANT:** Do NOT use `npx expo run:ios` or `npx expo run:android`. These create local native builds that clutter the repo with hundreds of build artifacts. Use EAS instead:

```bash
# Build for simulator/emulator
eas build --profile development --platform ios
eas build --profile development --platform android

# Install a build on simulator/emulator
eas build:run -p ios
eas build:run -p android

# Build for production/App Store
eas build --profile production --platform ios
eas build --profile production --platform android

# Submit to App Store / Play Store
eas submit -p ios
eas submit -p android
```

## Architecture Patterns

### Theme Management
Theme state is managed in `contexts/ThemeContext.tsx` with three modes: `light`, `dark`, `system`. Preference is persisted to AsyncStorage.

```typescript
const { theme, setTheme, effectiveTheme } = useTheme();
```

### Scripture Data Structure
Each scripture has text and a structured reference:

```typescript
interface Scripture {
  text: string;
  reference: {
    book: string;
    chapter: number;
    verse: number;
  };
}
```

### Game Modes
- **Easy:** Guess book only (e.g., "Matthew")
- **Medium:** Guess book + chapter (e.g., "John 3")
- **Hard:** Guess book + chapter + verse (e.g., "Alma 32:21")

### Answer Validation
`utils/scriptureUtils.ts` handles guess validation with normalization:
- Case-insensitive comparison
- Whitespace tolerance
- D&C abbreviation handling ("D&C", "DC", "Doctrine and Covenants")

## Coding Conventions

- **TypeScript** for all files
- **Functional components** with hooks
- **Theme-aware components:** Use `ThemedText` and `ThemedView` for automatic theme support
- **Haptic feedback:** Add haptics for button presses and feedback
- **Expo Router:** File-based routing in `/app` directory

## React Best Practices

### Avoid Unnecessary useEffect
Follow React's "You Might Not Need an Effect" guidelines:

- **Don't sync state to props** - If you need to update state when props change, derive the value during render instead
- **Don't use effects for initialization** - Use useState initializers or derive values
- **Don't use effects for event handling** - Handle events in event handlers directly
- **Prefer derived state** - Calculate values during render rather than storing and syncing

**Instead of:**
```typescript
useEffect(() => {
  if (someCondition) {
    setSomeState(derivedValue);
  }
}, [someCondition]);
```

**Do this:**
```typescript
const derivedValue = someCondition ? computedValue : defaultValue;
```

**Valid useEffect uses:**
- Fetching data on mount
- Setting up subscriptions/event listeners (with cleanup)
- Synchronizing with external systems (DOM, third-party libraries)

## Key Files

| File | Purpose |
|------|---------|
| `app/game.tsx` | Main game logic, scoring, sharing (~700 lines) |
| `app/(tabs)/index.tsx` | Home screen with difficulty selection |
| `contexts/ThemeContext.tsx` | Theme state and persistence |
| `utils/scriptureUtils.ts` | Answer validation and scripture selection |
| `data/scriptureData.ts` | Master scripture collection |
| `components/TutorialModal.tsx` | How to Play modal |
| `constants/Colors.ts` | Theme color definitions |

## Game Flow

1. User selects difficulty on home screen
2. Game loads 10 random scriptures
3. For each scripture:
   - Display scripture text
   - User types guess and submits
   - Show correct/incorrect feedback with haptics
   - Advance to next question
4. After 10 questions:
   - Display final score with color-coded feedback
   - High scores (8+/10) trigger confetti
   - Option to share score card or play again

## Testing

Jest is configured with `jest-expo` preset. Run tests with:

```bash
npm test
```
