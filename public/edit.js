// edit.js — Frontend logic for the edit movie page

// ============================================================
// DOM REFERENCES
// ============================================================

const editForm = document.getElementById('edit-movie-form');
const editTitleInput = document.getElementById('edit-title');
const editRatingSelect = document.getElementById('edit-rating');
const editPlatformSelect = document.getElementById('edit-platform');
const editNotesInput = document.getElementById('edit-notes');
const toastContainer = document.getElementById('toast-container');

// Get the movie ID from the URL query string (e.g., ?id=1234567890)
const urlParams = new URLSearchParams(window.location.search);
const movieId = urlParams.get('id');




// ============================================================
// TOAST NOTIFICATION
// ============================================================

const showToast = (message, type = 'success') => {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
};


// ============================================================
// LOAD MOVIE DATA — Pre-fill the form
// ============================================================

const loadMovieData = async () => {
  if (!movieId) {
    showToast('No movie ID provided', 'error');
    setTimeout(() => window.location.href = 'index.html', 1500);
    return;
  }

  try {
    const response = await fetch(`/api/movies/${movieId}`);

    if (!response.ok) {
      throw new Error('Movie not found');
    }

    const movie = await response.json();

    // Fill the title input
    editTitleInput.value = movie.title;

    // Fill the new fields
    if (movie.rating) editRatingSelect.value = movie.rating;
    if (movie.platform) editPlatformSelect.value = movie.platform;
    if (movie.notes) editNotesInput.value = movie.notes;

    // Now that options might have been added/selected, apply the custom select UI
    setupCustomSelects();

  } catch (error) {
    console.error('Error loading movie:', error);
    showToast('Could not load movie data', 'error');
    setTimeout(() => window.location.href = 'index.html', 1500);
  }
};


// ============================================================
// UPDATE — Save the edited movie
// ============================================================

editForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const title = editTitleInput.value.trim();
  const rating = editRatingSelect.value;
  const platform = editPlatformSelect.value;
  const notes = editNotesInput.value.trim();

  if (!title) {
    showToast('Title cannot be empty', 'error');
    return;
  }

  try {
    const response = await fetch(`/api/movies/${movieId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, rating, platform, notes })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update movie');
    }

    showToast(`"${title}" updated successfully!`);

    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1000);

  } catch (error) {
    console.error('Error updating movie:', error);
    showToast(error.message, 'error');
  }
});


// Custom dropdowns

const setupCustomSelects = (container = document) => {
  const selects = container.querySelectorAll('select:not(.is-custom-upgraded)');
  
  selects.forEach(selectEl => {
    selectEl.classList.add('is-custom-upgraded');
    selectEl.style.display = 'none';

    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper';
    
    const trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';
    trigger.setAttribute('tabindex', '0');
    
    const dropdown = document.createElement('div');
    dropdown.className = 'custom-select-dropdown';

    const updateTriggerText = () => {
      const selectedOption = selectEl.options[selectEl.selectedIndex];
      trigger.textContent = selectedOption ? selectedOption.text : 'Select...';
    };

    const renderOptions = () => {
      dropdown.innerHTML = '';
      Array.from(selectEl.options).forEach((opt, index) => {
        if (opt.disabled && !opt.value) return;

        const item = document.createElement('div');
        item.className = 'custom-select-option';
        if (index === selectEl.selectedIndex) item.classList.add('is-selected');
        
        item.textContent = opt.text;
        
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          selectEl.selectedIndex = index;
          selectEl.dispatchEvent(new Event('change'));
          
          updateTriggerText();
          wrapper.classList.remove('is-open');
          
          dropdown.querySelectorAll('.custom-select-option').forEach(el => el.classList.remove('is-selected'));
          item.classList.add('is-selected');
        });
        
        dropdown.appendChild(item);
      });
      updateTriggerText();
    };

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

loadMovieData();
