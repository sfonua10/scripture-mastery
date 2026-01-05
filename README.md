# Scripture Mastery Pro

A mobile app that tests your knowledge of scriptures from the King James Bible, Book of Mormon, Doctrine & Covenants, and Pearl of Great Price.

## Overview

Scripture Mastery Pro helps users improve their knowledge of LDS scriptures through a quiz-style game. See a scripture passage, guess its source, and track your progress through 10-question sessions.

## Features

### Game Modes
- **Easy Mode:** Guess only the book (e.g., "Matthew" or "1 Nephi")
- **Medium Mode:** Guess the book and chapter (e.g., "John 3")
- **Hard Mode:** Guess the book, chapter, and verse (e.g., "Alma 32:21")

### Gameplay
- 10-question sessions with real-time scoring
- Immediate feedback with haptic vibrations
- Confetti celebration for high scores (8+/10)
- Color-coded score feedback (green/yellow/red)

### Social Sharing
- Share your scores with a branded score card
- Export score images to social media

### Customization
- Light, dark, and system theme modes
- Clean, distraction-free design with serif typography
- Built-in "How to Play" tutorial

## Getting Started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

3. Run on device/simulator

   ```bash
   npx expo run:ios      # iOS
   npx expo run:android  # Android
   ```

## Tech Stack

- React Native with Expo
- TypeScript
- Expo Router for navigation
- React Context for state management

## Project Structure

```
/app          # Screens and navigation (Expo Router)
/components   # Reusable UI components
/contexts     # React Context providers
/data         # Scripture data files
/hooks        # Custom React hooks
/utils        # Helper functions
/types        # TypeScript type definitions
/constants    # Colors and theme constants
/assets       # Icons and images
```

## Scripture Data

The app includes 500+ scripture passages from:
- Old Testament (King James Bible)
- New Testament (King James Bible)
- Book of Mormon
- Doctrine & Covenants
- Pearl of Great Price

## Future Enhancements

- Progress tracking and statistics
- Customizable scripture collections
- Timed challenges
- Multi-player or competitive modes
- Detailed scripture study tools
- Bookmarking favorite scriptures

## License

This project is licensed under the MIT License.
