const fs = require('fs');
const path = require('path');

// File path for storing movie records
const DATA_FILE = path.join(__dirname, 'movies.json');

// Read all movies from the JSON file
function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    // Seed with sample file if available
    const SAMPLE_FILE = path.join(__dirname, 'movies.example.json');
    if (fs.existsSync(SAMPLE_FILE)) {
      try {
        const sampleContent = fs.readFileSync(SAMPLE_FILE, 'utf-8');
        fs.writeFileSync(DATA_FILE, sampleContent);
        return JSON.parse(sampleContent);
      } catch (err) {
        console.warn('Could not read sample file:', err.message);
      }
    }

    // Default to empty array if no sample exists
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
    return [];
  }

  try {
    const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(fileContent);
  } catch (err) {
    console.error('Error reading movies.json:', err.message);
    return [];
  }
}

// Save movies to the JSON file
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

module.exports = { readData, writeData };
