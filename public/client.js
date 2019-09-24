// client-side js

// define variables that reference elements on our page
const bookmarksList = document.getElementById('dogears');
const createForm = document.getElementById('create-dogear');
const updateForm = document.getElementById('update-dogear');

if (bookmarksList) {
  // Then we're on the front page and you're logged in.

  // Get the list of bookmarks from the API, and refresh the on-page list with current info.
  const refreshDogears = () => {
    fetch('/api/v1/list', {
      method: 'GET',
      credentials: 'include',
      headers:{'Content-Type': 'application/json', 'Accept': 'application/json'}
    }).then(response => {
      response.json().then(dogears => {
        bookmarksList.innerHTML = dogears
          .map(mark => `<li><a href=${mark.current}>${mark.display_name || mark.current}</a></li>`)
          .join(' ');
      });
    }).catch(err => {
      bookmarksList.innerHTML = `<li>Something went wrong! Error: ${err}</li>`;
    });
  }

  refreshDogears();

  // semi-generic helper for submitting a dogear
  const submitDogear = (dest, dogObj) => {
    fetch(dest, {
      method: 'POST',
      credentials: 'include',
      headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
      body: JSON.stringify(dogObj)
    }).then(response => {
      refreshDogears();
      return true;
    }).catch(err => {
      return false;
    });
  }

  // Set up create form:
  createForm.addEventListener('submit', function(e) {
    e.preventDefault();
    submitDogear('/api/v1/create', {
      prefix: this.elements['prefix'].value,
      current: this.elements['current'].value,
      display_name: this.elements['display_name'].value,
    }).then(success => {
      this.querySelectorAll('input').forEach(input => {
        input.value = '';
      });
    });
  });

  // Set up update form:
  updateForm.addEventListener('submit', function(e) {
    e.preventDefault();
    submitDogear('/api/v1/update', {
      current: this.elements['current'].value,
    }).then(success => {
      this.elements['current'].value = '';
    });
  });
}
