// data/scriptureData.ts
import { Scripture } from '../types/scripture';
import { oldTestamentScriptures } from './oldTestamentScriptures';
import { newTestamentScriptures } from './newTestamentScriptures';
import { bookOfMormonScriptures } from './bookOfMormonScriptures';
import { doctrineAndCovenantsScriptures } from './doctrineAndCovenantsScriptures';

// Combine all scripture collections
export const allScriptures: Scripture[] = [
  ...oldTestamentScriptures,
  ...newTestamentScriptures,
  ...bookOfMormonScriptures,
  ...doctrineAndCovenantsScriptures,
];

// Utility function to get scriptures by collection
export const getScripturesByCollection = (collection: 'OT' | 'NT' | 'BOM' | 'DC'): Scripture[] => {
  switch (collection) {
    case 'OT':
      return oldTestamentScriptures;
    case 'NT':
      return newTestamentScriptures;
    case 'BOM':
      return bookOfMormonScriptures;
    case 'DC':
      return doctrineAndCovenantsScriptures;
    default:
      return [];
  }
};

// Export individual collections for direct access
export {
  oldTestamentScriptures,
  newTestamentScriptures,
  bookOfMormonScriptures,
  doctrineAndCovenantsScriptures,
};