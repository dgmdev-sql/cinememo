// script.js — Frontend logic for Cinememo movie watchlist

// ============================================================
// DOM REFERENCES
// ============================================================

const addMovieForm = document.getElementById('add-movie-form');
const movieTitleInput = document.getElementById('movie-title');
const movieGenreSelect = document.getElementById('movie-genre');
const movieYearSelect = document.getElementById('movie-year');
const movieListContainer = document.getElementById('movie-list');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('btn-search');
const searchResultsContainer = document.getElementById('search-results');
const toastContainer = document.getElementById('toast-container');
const autocompleteDropdown = document.getElementById('autocomplete-dropdown');

// Toolbar controls
const sortSelect = document.getElementById('sort-select');
const filterGenre = document.getElementById('filter-genre');
const filterStatus = document.getElementById('filter-status');
const movieCount = document.getElementById('movie-count');

// Stores the poster URL when a movie is selected from autocomplete
let selectedPoster = '';

// Cache of all movies — used for client-side sort/filter
let allMovies = [];


// ============================================================
// AUTOCOMPLETE — OMDb Title Suggestions
// Searches OMDb as the user types and shows a dropdown
// ============================================================

let autocompleteTimer = null;   // Debounce timer to avoid too many API calls
let activeAutocompleteIndex = -1; // Track keyboard navigation in dropdown

/**
 * fetchSuggestions — Searches OMDb for title suggestions.
 * Uses a debounce (300ms delay) so we don't spam the API on every keystroke.
 * 
 * @param {string} query - The text the user has typed so far
 */
const fetchSuggestions = (query) => {
  // Clear any previous timer (debounce)
  clearTimeout(autocompleteTimer);

  // Need at least 3 characters for a meaningful search
  if (query.length < 3) {
    closeAutocomplete();
    return;
  }

  // Show loading state
  autocompleteDropdown.innerHTML = '<div class="autocomplete-loading">Searching...</div>';
  autocompleteDropdown.classList.add('is-open');

  // Wait 300ms after the user stops typing before making the API call
  autocompleteTimer = setTimeout(async () => {
    try {
      const response = await fetch(`/api/lookup?s=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (!response.ok) {
        closeAutocomplete();
        return;
      }

      // Render suggestion items
      activeAutocompleteIndex = -1;
      autocompleteDropdown.innerHTML = data.slice(0, 6).map((movie, index) => `
        <div class="autocomplete-item" role="option" data-index="${index}"
             data-title="${escapeAttr(movie.title)}" 
             data-year="${escapeAttr(movie.year)}"
             data-type="${escapeAttr(movie.type)}"
             data-imdbid="${escapeAttr(movie.imdbID || '')}">
          ${movie.poster && movie.poster !== 'N/A'
            ? `<img src="${escapeAttr(movie.poster)}" alt="" class="ac-poster" loading="lazy">`
            : `<div class="ac-poster-placeholder">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                  <line x1="7" y1="2" x2="7" y2="22"></line>
                  <line x1="17" y1="2" x2="17" y2="22"></line>
                </svg>
              </div>`
          }
          <div class="ac-info">
            <div class="ac-title">${escapeHtml(movie.title)}</div>
            <div class="ac-meta">${escapeHtml(movie.year)} · ${escapeHtml(movie.type)}</div>
          </div>
        </div>
      `).join('');

      autocompleteDropdown.classList.add('is-open');

      // Add click handlers to each suggestion item
      autocompleteDropdown.querySelectorAll('.autocomplete-item').forEach(item => {
        item.addEventListener('click', () => selectSuggestion(item));
      });

    } catch (error) {
      closeAutocomplete();
    }
  }, 300);
};

/**
 * selectSuggestion — When a user clicks on a suggestion,
 * fill the title input, set the year dropdown, and auto-fetch genre.
 * 
 * How it works:
 * 1. Immediately set the title and year from the suggestion data
 * 2. Call /api/detail with the imdbID to get the full movie info
 * 3. Extract the first genre from the comma-separated genre string
 * 4. Match it to the genre dropdown and auto-select it
 */
const selectSuggestion = async (item) => {
  const title = item.getAttribute('data-title');
  const year = item.getAttribute('data-year');
  const imdbId = item.getAttribute('data-imdbid');

  // Step 1: Set the title input immediately
  movieTitleInput.value = title;

  // Step 2: Set the hidden year input
  const yearMatch = year.match(/\d{4}/);
  if (yearMatch) {
    movieYearSelect.value = yearMatch[0];
  }

  closeAutocomplete();

  // Step 3: Fetch full details to get the genre and poster
  if (imdbId) {
    try {
      const response = await fetch(`/api/detail?i=${encodeURIComponent(imdbId)}`);
      const details = await response.json();

      if (response.ok) {
        // Store the poster URL (upgrade to high-res SX1000)
        if (details.poster && details.poster !== 'N/A') {
          selectedPoster = details.poster.replace('SX300', 'SX1000');
        }

        if (details.genre) {
          // OMDb returns genre as "Action, Adventure, Sci-Fi"
          // We take the first genre and try to match it to our dropdown
          const firstGenre = details.genre.split(',')[0].trim();
          movieGenreSelect.value = firstGenre;
          showToast(`Auto-filled: ${firstGenre} · ${year}`);
        }
      }
    } catch (error) {
      // Genre auto-fill failed silently — user can still pick manually
      console.warn('Could not auto-fill genre:', error.message);
    }
  }

  // Focus the Add button since all fields are now filled
  document.getElementById('btn-add').focus();
};

/**
 * closeAutocomplete — Hides the dropdown
 */
const closeAutocomplete = () => {
  autocompleteDropdown.classList.remove('is-open');
  autocompleteDropdown.innerHTML = '';
  activeAutocompleteIndex = -1;
};

// --- Autocomplete Event Listeners ---

// Search as the user types (with debounce)
movieTitleInput.addEventListener('input', (event) => {
  fetchSuggestions(event.target.value.trim());
});

// Keyboard navigation in the dropdown (arrow keys + enter)
movieTitleInput.addEventListener('keydown', (event) => {
  const items = autocompleteDropdown.querySelectorAll('.autocomplete-item');
  if (items.length === 0) return;

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    activeAutocompleteIndex = Math.min(activeAutocompleteIndex + 1, items.length - 1);
    updateActiveItem(items);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    activeAutocompleteIndex = Math.max(activeAutocompleteIndex - 1, 0);
    updateActiveItem(items);
  } else if (event.key === 'Enter' && activeAutocompleteIndex >= 0) {
    event.preventDefault();
    selectSuggestion(items[activeAutocompleteIndex]);
  } else if (event.key === 'Escape') {
    closeAutocomplete();
  }
});

// Highlight the active item during keyboard navigation
const updateActiveItem = (items) => {
  items.forEach((item, index) => {
    item.classList.toggle('is-active', index === activeAutocompleteIndex);
  });
};

// Close dropdown when clicking outside
document.addEventListener('click', (event) => {
  if (!event.target.closest('.autocomplete-wrapper')) {
    closeAutocomplete();
  }
});


// ============================================================
// TOAST NOTIFICATIONS
// ============================================================

const showToast = (message, type = 'success') => {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
};


// ============================================================
// SORT & FILTER HELPERS
// ============================================================

/**
 * sortMovies — Sorts the movie array based on the selected sort option.
 * This runs client-side on the cached array so we don't re-fetch.
 */
const sortMovies = (movies, sortBy) => {
  const sorted = [...movies];
  switch (sortBy) {
    case 'title-asc':    return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case 'title-desc':   return sorted.sort((a, b) => b.title.localeCompare(a.title));
    case 'year-desc':    return sorted.sort((a, b) => Number(b.year) - Number(a.year));
    case 'year-asc':     return sorted.sort((a, b) => Number(a.year) - Number(b.year));
    case 'favorites':    return sorted.sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0));
    case 'added-asc':    return sorted;  // Already in insertion order
    case 'added-desc':   return sorted.reverse();
    default:             return sorted;
  }
};

/**
 * filterMovies — Filters by genre and watch status.
 */
const filterMovies = (movies, genre, status) => {
  return movies.filter(movie => {
    const genreMatch = genre === 'all' || movie.genre === genre;
    const statusMatch = status === 'all' || (movie.status || 'want') === status;
    return genreMatch && statusMatch;
  });
};

/**
 * populateGenreFilter — Fills the genre dropdown with genres
 * from actual movie data (no duplicates).
 */
const populateGenreFilter = (movies) => {
  const genres = [...new Set(movies.map(m => m.genre))].sort();
  const currentValue = filterGenre.value;

  // Keep the "All genres" option, rebuild the rest
  filterGenre.innerHTML = '<option value="all">All genres</option>';
  genres.forEach(genre => {
    const option = document.createElement('option');
    option.value = genre;
    option.textContent = genre;
    filterGenre.appendChild(option);
  });

  // Restore selection if it still exists
  if (genres.includes(currentValue)) {
    filterGenre.value = currentValue;
  }

  // Update the custom dropdown UI if it exists
  if (filterGenre._updateCustomSelect) {
    filterGenre._updateCustomSelect();
  }
};

// ============================================================
// ============================================================
// MOVIE DETAILS MODAL
// ============================================================

const renderStars = (rating) => {
  if (!rating) return '';
  const starCount = (rating.match(/⭐/g) || rating.match(/⭐️/g) || []).length;
  if (starCount === 0) return escapeHtml(rating);
  const starSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:1px"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
  return starSvg.repeat(starCount);
};

const modalOverlay = document.getElementById('movie-modal');
const modalBodyContent = document.getElementById('modal-body-content');
const modalCloseBtn = document.querySelector('.modal-close');

const openMovieModal = (movieId) => {
  const movie = allMovies.find(m => m.id === movieId);
  if (!movie) return;

  const posterHtml = movie.poster && movie.poster !== 'N/A'
    ? `<img src="${escapeHtml(movie.poster)}" alt="${escapeHtml(movie.title)} poster" style="width:100%; height:100%; object-fit:cover;">`
    : `<div class="movie-poster-placeholder" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:rgb(var(--gray-100)); color:rgb(var(--gray-400));">No Poster</div>`;
  modalBodyContent.innerHTML = `
    <div class="movie-poster-wrapper">
      ${posterHtml}
    </div>
    <div class="modal-details">
      <h2>${escapeHtml(movie.title)}</h2>
      <div class="movie-meta">
        <span class="tag">${escapeHtml(movie.genre)}</span>
        <span class="tag">${escapeHtml(movie.year)}</span>
        ${movie.platform ? `<span class="tag platform-tag">${escapeHtml(movie.platform)}</span>` : ''}
        ${movie.rating ? `<span class="tag rating-tag">${renderStars(movie.rating)}</span>` : ''}
      </div>
      <div class="modal-notes">${movie.notes ? escapeHtml(movie.notes) : '<span class="empty-notes">No personal notes added yet. Click edit to add some!</span>'}</div>
    </div>
  `;

  modalOverlay.classList.remove('hidden');
};

const closeMovieModal = () => {
  modalOverlay.classList.add('hidden');
};

modalCloseBtn.addEventListener('click', closeMovieModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeMovieModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMovieModal();
});

const handleCardClick = (e, movieId) => {
  // Prevent opening modal if clicking on buttons or selects
  if (e.target.closest('button') || e.target.closest('a') || e.target.closest('select') || e.target.closest('.custom-select-wrapper')) {
    return;
  }
  openMovieModal(movieId);
};

/**
 * renderMovies — Takes the cached allMovies array, applies
 * the current sort and filter, and renders the cards.
 */
const renderMovies = () => {
  const sortBy = sortSelect.value;
  const genreFilter = filterGenre.value;
  const statusFilter = filterStatus.value;

  let movies = filterMovies(allMovies, genreFilter, statusFilter);
  movies = sortMovies(movies, sortBy);

  // Update movie count
  movieCount.textContent = `(${allMovies.length})`;

  // Show/hide toolbar based on whether there are any movies
  document.getElementById('toolbar').style.display = allMovies.length > 0 ? 'flex' : 'none';

  if (movies.length === 0) {
    movieListContainer.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
          <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
          <line x1="7" y1="2" x2="7" y2="22"></line>
          <line x1="17" y1="2" x2="17" y2="22"></line>
          <line x1="2" y1="12" x2="22" y2="12"></line>
        </svg>
        <p>${allMovies.length === 0 ? 'No movies yet. Add your first one above.' : 'No movies match your filters.'}</p>
      </div>
    `;
    return;
  }

  // Status labels for display
  const statusLabels = { want: 'Want to Watch', watching: 'Watching', watched: 'Watched' };

  // Render compact cards
  movieListContainer.innerHTML = movies.map((movie, index) => `
    <div class="movie-row" role="button" tabindex="0" onclick="handleCardClick(event, '${movie.id}')" style="animation-delay: ${index * 0.04}s; cursor: pointer;">
      <div class="movie-poster-wrapper">
        ${movie.poster
          ? `<img src="${escapeHtml(movie.poster)}" alt="" class="movie-poster" loading="lazy">`
          : `<div class="movie-poster-placeholder">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                <line x1="7" y1="2" x2="7" y2="22"></line>
                <line x1="17" y1="2" x2="17" y2="22"></line>
              </svg>
            </div>`
        }
      </div>
      <div class="movie-info">
        <div style="display:flex; align-items:start; justify-content:space-between; gap:4px">
          <h3>${escapeHtml(movie.title)}</h3>
          <button class="btn-fav ${movie.favorite ? 'is-fav' : ''}" 
                  onclick="toggleFavorite('${movie.id}', ${!movie.favorite})"
                  aria-label="${movie.favorite ? 'Remove from favorites' : 'Add to favorites'}"
                  title="${movie.favorite ? 'Remove from favorites' : 'Add to favorites'}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="${movie.favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          </button>
        </div>
        <div class="movie-meta">
          <span class="tag">${escapeHtml(movie.genre)}</span>
          <span class="tag">${escapeHtml(movie.year)}</span>
          ${movie.platform ? `<span class="tag" style="background:rgb(var(--gray-100)); font-weight:600;">${escapeHtml(movie.platform)}</span>` : ''}
          ${movie.rating ? `<span class="tag rating-tag">${renderStars(movie.rating)}</span>` : ''}
          <select class="status-select" onchange="changeStatus('${movie.id}', this.value)"
                  aria-label="Watch status">
            <option value="want" ${(movie.status || 'want') === 'want' ? 'selected' : ''}>Want to Watch</option>
            <option value="watching" ${movie.status === 'watching' ? 'selected' : ''}>Watching</option>
            <option value="watched" ${movie.status === 'watched' ? 'selected' : ''}>Watched</option>
          </select>
        </div>
        <div class="movie-actions-row">
          <a href="edit.html?id=${movie.id}" class="btn btn-secondary btn-sm" aria-label="Edit ${escapeHtml(movie.title)}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Edit
          </a>
          <button class="btn btn-danger btn-sm" onclick="deleteMovie('${movie.id}')" aria-label="Delete ${escapeHtml(movie.title)}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <polyline points="3,6 5,6 21,6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Delete
          </button>
        </div>
      </div>
    </div>
  `).join('');

  // Upgrade dropdowns to custom selects
  setupCustomSelects(movieListContainer);
};


// ============================================================
// READ — Load and Display All Movies
// ============================================================

const loadMovies = async () => {
  try {
    const response = await fetch('/api/movies');
    allMovies = await response.json();

    // Populate filters from actual data
    populateGenreFilter(allMovies);

    // Render with current sort/filter settings
    renderMovies();

  } catch (error) {
    console.error('Error loading movies:', error);
    showToast('Failed to load movies', 'error');
  }
};


// ============================================================
// FAVORITE TOGGLE — PATCH /api/movies/:id { favorite }
// ============================================================

const toggleFavorite = async (movieId, newValue) => {
  try {
    const response = await fetch(`/api/movies/${movieId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ favorite: newValue })
    });

    if (!response.ok) throw new Error('Failed to update');

    // Update the local cache instead of re-fetching
    const movie = allMovies.find(m => m.id === movieId);
    if (movie) movie.favorite = newValue;
    renderMovies();

    showToast(newValue ? 'Added to favorites' : 'Removed from favorites');
  } catch (error) {
    showToast('Failed to update favorite', 'error');
  }
};


// ============================================================
// STATUS CHANGE — PATCH /api/movies/:id { status }
// ============================================================

const changeStatus = async (movieId, newStatus) => {
  try {
    const response = await fetch(`/api/movies/${movieId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    if (!response.ok) throw new Error('Failed to update');

    // Update local cache
    const movie = allMovies.find(m => m.id === movieId);
    if (movie) movie.status = newStatus;
    renderMovies();

    const labels = { want: 'Want to Watch', watching: 'Watching', watched: 'Watched' };
    showToast(`Status → ${labels[newStatus]}`);
  } catch (error) {
    showToast('Failed to update status', 'error');
  }
};


// ============================================================
// TOOLBAR EVENT LISTENERS — re-render on change
// ============================================================

sortSelect.addEventListener('change', renderMovies);
filterGenre.addEventListener('change', renderMovies);
filterStatus.addEventListener('change', renderMovies);

addMovieForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const title = movieTitleInput.value.trim();
  const genre = movieGenreSelect.value;
  const year = movieYearSelect.value;

  if (!title || !genre || !year) {
    showToast('Please fill in all fields', 'error');
    return;
  }

  try {
    const response = await fetch('/api/movies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, genre, year, poster: selectedPoster })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to add movie');
    }

    addMovieForm.reset();
    selectedPoster = '';  // Clear stored poster after adding
    showToast(`"${title}" added to your watchlist!`);
    loadMovies();

  } catch (error) {
    console.error('Error adding movie:', error);
    showToast(error.message, 'error');
  }
});


// ============================================================
// DELETE — Remove a Movie
// ============================================================

const deleteMovie = async (movieId) => {
  const confirmDelete = confirm('Are you sure you want to delete this movie?');
  if (!confirmDelete) return;

  try {
    const response = await fetch(`/api/movies/${movieId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to delete movie');
    }

    showToast('Movie deleted');
    loadMovies();

  } catch (error) {
    console.error('Error deleting movie:', error);
    showToast(error.message, 'error');
  }
};


// ============================================================
// LOOKUP — OMDb Full Search
// ============================================================

const searchOMDb = async () => {
  const query = searchInput.value.trim();

  if (!query) {
    showToast('Please enter a movie title to search', 'error');
    return;
  }

  searchResultsContainer.innerHTML = `
    <div class="empty-state">
      <div class="spinner"></div>
      <p style="margin-top: 1rem;">Searching OMDb...</p>
    </div>
  `;

  try {
    const response = await fetch(`/api/lookup?s=${encodeURIComponent(query)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Search failed');
    }

    searchResultsContainer.innerHTML = data.map((movie, index) => `
      <div class="search-card" role="listitem" style="animation-delay: ${index * 0.04}s">
        ${movie.poster && movie.poster !== 'N/A'
          ? `<img src="${escapeHtml(movie.poster)}" alt="Poster for ${escapeHtml(movie.title)}" class="poster" loading="lazy">`
          : `<div class="poster-placeholder" aria-hidden="true">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
                <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                <line x1="7" y1="2" x2="7" y2="22"></line>
                <line x1="17" y1="2" x2="17" y2="22"></line>
              </svg>
            </div>`
        }
        <div class="search-info">
          <h4>${escapeHtml(movie.title)}</h4>
          <div class="search-meta">
            <span>${escapeHtml(movie.year)}</span>
            <span class="type-badge">${escapeHtml(movie.type)}</span>
          </div>
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error('Error searching OMDb:', error);
    searchResultsContainer.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(error.message)}</p>
      </div>
    `;
  }
};

searchButton.addEventListener('click', searchOMDb);
searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') searchOMDb();
});


// ============================================================
// UTILITIES
// ============================================================

/**
 * escapeHtml — Prevents XSS by escaping special HTML characters.
 */
const escapeHtml = (text) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

/**
 * escapeAttr — Escapes text for safe use in HTML attribute values.
 */
const escapeAttr = (text) => {
  return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};


// Custom dropdowns

const setupCustomSelects = (container = document) => {
  // Target all selects in the container that haven't been upgraded yet
  const selects = container.querySelectorAll('select:not(.is-custom-upgraded)');
  
  selects.forEach(selectEl => {
    selectEl.classList.add('is-custom-upgraded');
    
    // Hide the native select
    selectEl.style.display = 'none';

    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper';
    
    // Create trigger
    const trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';
    trigger.setAttribute('tabindex', '0');
    
    // Create dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'custom-select-dropdown';

    const updateTriggerText = () => {
      const selectedOption = selectEl.options[selectEl.selectedIndex];
      trigger.textContent = selectedOption ? selectedOption.text : 'Select...';
    };

    const renderOptions = () => {
      dropdown.innerHTML = '';
      Array.from(selectEl.options).forEach((opt, index) => {
        // Skip hidden placeholder options
        if (opt.disabled && !opt.value) return;

        const item = document.createElement('div');
        item.className = 'custom-select-option';
        if (index === selectEl.selectedIndex) item.classList.add('is-selected');
        
        item.textContent = opt.text;
        
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          selectEl.selectedIndex = index;
          selectEl.dispatchEvent(new Event('change')); // Trigger existing logic
          
          updateTriggerText();
          wrapper.classList.remove('is-open');
          
          dropdown.querySelectorAll('.custom-select-option').forEach(el => el.classList.remove('is-selected'));
          item.classList.add('is-selected');
        });
        
        dropdown.appendChild(item);
      });
      updateTriggerText();
    };

    // Attach updater to the DOM node so external scripts can trigger a re-render
    selectEl._updateCustomSelect = renderOptions;

    renderOptions();

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.custom-select-wrapper').forEach(w => {
        if (w !== wrapper) w.classList.remove('is-open');
      });
      wrapper.classList.toggle('is-open');
    });

    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) wrapper.classList.remove('is-open');
    });

    selectEl.parentNode.insertBefore(wrapper, selectEl.nextSibling);
    wrapper.appendChild(trigger);
    wrapper.appendChild(dropdown);
  });
};


// ============================================================
// INITIALIZE
// ============================================================

setupCustomSelects();
loadMovies();
