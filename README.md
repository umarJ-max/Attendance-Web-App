# StudyTrack - Attendance Tracker

A lightweight offline-first attendance tracking application for personal use.

## Features

- **Subject-wise Attendance** - Track attendance for individual subjects
- **Dark/Light Theme** - Toggle between dark and light modes  
- **Class Count Tracking** - Automatic count of classes attended per subject
- **Analytics Dashboard** - View attendance percentage per subject
- **Offline Support** - Works completely offline with Service Worker
- **Data Management** - Export/import data, clear records
- **Local Storage** - All data stored locally, no cloud sync
- **Responsive Design** - Works on desktop, tablet, and mobile
- **No Dependencies** - Vanilla JavaScript, zero external packages

## Usage

1. Open `index.html` in a web browser
2. Create subjects to track
3. Mark attendance for each subject
4. View analytics and statistics

## Storage

All data is stored locally in your browser. No internet connection required after first load.

## Files

- `index.html` - Main application interface
- `app.js` - Application logic
- `styles.css` - Styling and theme support
- `sw.js` - Service Worker for offline support
- `manifest.json` - PWA configuration
