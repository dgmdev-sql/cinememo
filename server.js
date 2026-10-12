require('dotenv').config();

const express = require('express');
const path = require('path');
const { readData, writeData } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// OMDb API key from .env file
const OMDB_API_KEY = process.env.OMDB_API_KEY;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


// --- CRUD Routes ---

// Get all movies
app.get('/api/movies', (req, res) => {
  const movies = readData();
  res.json(movies);
});

// Get a single movie by ID
app.get('/api/movies/:id', (req, res) => {
  const movies = readData();
  const movie = movies.find(m => m.id === req.params.id);

  if (!movie) {
    return res.status(404).json({ error: 'Movie not found' });
  }

  res.json(movie);
});

// Add a new movie
app.post('/api/movies', (req, res) => {
  const { title, genre, year, poster } = req.body;

  // Validation
  if (!title || !genre || !year) {
    return res.status(400).json({ error: 'All fields (title, genre, year) are required' });
  }

  if (title.trim() === '' || genre.trim() === '' || year.toString().trim() === '') {
    return res.status(400).json({ error: 'Fields cannot be empty' });
  }

  const movies = readData();

  const newMovie = {
    id: Date.now().toString(),
    title: title.trim(),
    genre: genre.trim(),
    year: year.toString().trim(),
    poster: poster || '',
    favorite: false,
    status: 'want'
  };

  movies.push(newMovie);
  writeData(movies);

  res.status(201).json(newMovie);
});

// Update a movie by ID
app.put('/api/movies/:id', (req, res) => {
  const { title, genre, year, poster, rating, platform, notes } = req.body;

  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'Title cannot be empty' });
  }

  const movies = readData();
  const movieIndex = movies.findIndex(m => m.id === req.params.id);

  if (movieIndex === -1) {
    return res.status(404).json({ error: 'Movie not found' });
  }

  const existingMovie = movies[movieIndex];

  movies[movieIndex] = {
    ...existingMovie,
    title: title.trim(),
    genre: genre ? genre.trim() : existingMovie.genre,
    year: year ? year.toString().trim() : existingMovie.year,
    poster: poster || existingMovie.poster || '',
    rating: rating || '',
    platform: platform || '',
    notes: notes || ''
  };

  writeData(movies);
  res.json(movies[movieIndex]);
});

// Update individual fields (favorite, status)
app.patch('/api/movies/:id', (req, res) => {
  const movies = readData();
  const movieIndex = movies.findIndex(m => m.id === req.params.id);

  if (movieIndex === -1) {
    return res.status(404).json({ error: 'Movie not found' });
  }

  const allowed = ['favorite', 'status'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      movies[movieIndex][key] = req.body[key];
    }
  }

  writeData(movies);
  res.json(movies[movieIndex]);
});

// Delete a movie by ID
app.delete('/api/movies/:id', (req, res) => {
  let movies = readData();
  const movieExists = movies.some(m => m.id === req.params.id);

  if (!movieExists) {
    return res.status(404).json({ error: 'Movie not found' });
  }

  movies = movies.filter(m => m.id !== req.params.id);
  writeData(movies);

  res.json({ message: 'Movie deleted successfully' });
});


// --- Online Lookup Routes (OMDb API) ---

// Search movies by title
app.get('/api/lookup', async (req, res) => {
  const searchTerm = req.query.s;

  if (!searchTerm || searchTerm.trim() === '') {
    return res.status(400).json({ error: 'Please provide a search term using ?s=moviename' });
  }

  if (!OMDB_API_KEY || OMDB_API_KEY === 'YOUR_KEY' || OMDB_API_KEY === 'your_omdb_api_key_here') {
    return res.status(500).json({ error: 'OMDb API key is not configured' });
  }

  try {
    const omdbUrl = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(searchTerm.trim())}`;
    const response = await fetch(omdbUrl, { signal: AbortSignal.timeout(6000) });
    const data = await response.json();

    if (data.Response === 'False') {
      return res.status(404).json({ error: data.Error || 'No results found' });
    }

    const results = data.Search.map(movie => ({
      title: movie.Title,
      year: movie.Year,
      type: movie.Type,
      poster: movie.Poster !== 'N/A' ? movie.Poster.replace('SX300', 'SX1000') : 'N/A',
      imdbID: movie.imdbID
    }));

    res.json(results);
  } catch (error) {
    console.error('OMDb API error:', error.message);
    res.status(500).json({ error: 'Failed to fetch data from OMDb' });
  }
});

// Get movie details by IMDb ID
app.get('/api/detail', async (req, res) => {
  const imdbId = req.query.i;

  if (!imdbId || imdbId.trim() === '') {
    return res.status(400).json({ error: 'Please provide an IMDb ID using ?i=tt1234567' });
  }

  if (!OMDB_API_KEY || OMDB_API_KEY === 'YOUR_KEY' || OMDB_API_KEY === 'your_omdb_api_key_here') {
    return res.status(500).json({ error: 'OMDb API key is not configured' });
  }

  try {
    const omdbUrl = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${encodeURIComponent(imdbId.trim())}`;
    const response = await fetch(omdbUrl, { signal: AbortSignal.timeout(6000) });
    const data = await response.json();

    if (data.Response === 'False') {
      return res.status(404).json({ error: data.Error || 'Movie not found' });
    }

    res.json({
      title: data.Title,
      year: data.Year,
      genre: data.Genre,
      director: data.Director,
      plot: data.Plot,
      poster: data.Poster,
      imdbRating: data.imdbRating
    });
  } catch (error) {
    console.error('OMDb detail error:', error.message);
    res.status(500).json({ error: 'Failed to fetch movie details' });
  }
});


// Start server
app.listen(PORT, () => {
  console.log(`🎬 Movie Watchlist server running at http://localhost:${PORT}`);
  console.log(`   Press Ctrl+C to stop the server`);
});

// Process error listeners
process.on('uncaughtException', (err) => {
  console.error('⚠️ Unhandled Exception:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('⚠️ Unhandled Rejection:', reason);
});
