# Scripture Mastery App - Version 1 Context

## App Overview
Scripture Mastery is a mobile application that tests users' knowledge of scriptures from the King James Bible, Book of Mormon, Doctrine & Covenants, and Pearl of Great Price. The core gameplay involves showing users a scripture passage and asking them to identify its source at varying levels of difficulty.

## Target Audience
- Members of The Church of Jesus Christ of Latter-day Saints
- Seminary and Institute students
- Anyone interested in improving their knowledge of LDS scriptures

## Core Functionality (Version 1)

### Game Modes
1. **Easy Mode**: Users guess only the book (e.g., "Matthew" or "1 Nephi")
2. **Medium Mode**: Users guess the book and chapter (e.g., "John 3")
3. **Hard Mode**: Users guess the book, chapter, and verse (e.g., "Alma 32:21")

### Screens
1. **Home Screen**
   - App title: "Scripture Mastery"
   - Three difficulty mode options
   - Clean, simple interface
   - Settings link (minimal for v1 - just light/dark mode)
   - Version number

2. **Game Screen**
   - Displays a random scripture text
   - Input method for guessing (appropriate to difficulty level)
   - Submit button
   - Next button (disabled until guess is submitted)

3. **Result Screen**
   - Feedback on correctness (visual and textual)
   - Displays correct answer if user was wrong
   - Shows the scripture again for reference
   - Next Scripture button
   - Return to Home option

### User Flow
1. User selects difficulty mode from Home Screen
2. Game displays a random scripture
3. User inputs their guess and submits
4. App shows whether answer was correct/incorrect with the correct reference
5. User taps "Next Scripture" to continue or returns to Home Screen
6. Repeat steps 2-5

## Technical Implementation

### Data Source
- Using [bcbooks/scriptures-json](https://github.com/bcbooks/scriptures-json) repository
- Reference structure from book-of-mormon-reference.json and similar files
- Need to source actual scripture text content

### Technology Stack
- React Native with Expo for cross-platform development
- Local storage for saving settings and potentially high scores
- No backend requirement for Version 1 (all data bundled with app)

### UI/UX Focus
- Clean, distraction-free design
- Serif font for scripture text (Times New Roman or similar)
- Minimal color palette (primarily black/white with accent colors for feedback)
- Focus on readability and ease of interaction

## Version 1 Limitations
- No user accounts or online features
- No scripture study tools beyond the guessing game
- Limited customization options
- No progress tracking beyond the current session

## Potential Future Features (Post-V1)
- Progress tracking and statistics
- Customizable scripture collections
- Timed challenges
- Multi-player or competitive modes
- Detailed scripture study tools
- Bookmarking favorite scriptures
- Social sharing features

## Success Metrics
- App Store & Google Play Store ratings
- User retention (how often users return to the app)
- Session duration
- Completion rates for game sessions

## Initial Release Timeline
- Development: [Timeline TBD]
- Testing: [Timeline TBD]
- App Store submission: [Timeline TBD]
- Launch: [Timeline TBD]