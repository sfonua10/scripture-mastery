# Scripture Mastery App

A mobile application that tests users' knowledge of scriptures from the King James Bible, Book of Mormon, Doctrine & Covenants, and Pearl of Great Price.

## App Overview

Scripture Mastery is designed to help users improve their knowledge of LDS scriptures. The core gameplay involves showing users a scripture passage and asking them to identify its source at varying levels of difficulty.

## Features

### Game Modes
1. **Easy Mode**: Users guess only the book (e.g., "Matthew" or "1 Nephi")
2. **Medium Mode**: Users guess the book and chapter (e.g., "John 3")
3. **Hard Mode**: Users guess the book, chapter, and verse (e.g., "Alma 32:21")

### Key Features
- Clean, distraction-free design
- Serif font for scripture text
- Haptic feedback for correct/incorrect answers
- Light/dark mode support

## Getting Started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

## Development

This app is built with:
- React Native with Expo
- TypeScript
- Expo Router for navigation

### Project Structure

- `/app`: Main application screens and navigation
- `/components`: Reusable UI components
- `/constants`: App-wide constants like colors
- `/data`: Scripture data and services
- `/types`: TypeScript type definitions

## Data Source

The scripture data is currently using placeholder content. In a production version, it would use the [bcbooks/scriptures-json](https://github.com/bcbooks/scriptures-json) repository or a similar data source.

## Future Enhancements

- Progress tracking and statistics
- Customizable scripture collections
- Timed challenges
- Multi-player or competitive modes
- Detailed scripture study tools
- Bookmarking favorite scriptures
- Social sharing features

## License

This project is licensed under the MIT License.
