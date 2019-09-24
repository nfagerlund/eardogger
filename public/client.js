// client-side js
// run by the browser each time your view template referencing it is loaded

console.log('hello world :o');

let dogears = [];

// define variables that reference elements on our page
const bookmarksList = document.getElementById('dogears');
const createForm = document.forms[0];
  const createPrefixInput = createForm.elements['prefix'];
  const createCurrentInput = createForm.elements['current'];
  const createNameInput = createForm.elements['display_name'];
const updateForm = document.forms[1];
  const updateCurrentInput = updateForm.elements['current'];

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

// semi-generic helper for submitting an object
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

// create form:
createForm.addEventListener('submit', function(e) {
  e.preventDefault();
  submitDogear('/api/v1/create', {
    prefix: createPrefixInput.value,
    current: createCurrentInput.value,
    display_name: createNameInput.value
  }).then(success => {
    createPrefixInput.value = '';
    createCurrentInput.value = '';
    createNameInput.value = '';
  });
});

// update form:
updateForm.addEventListener('submit', function(e) {
  e.preventDefault();
  submitDogear('/api/v1/update', {current: updateCurrentInput.value}).then(success => {
    updateCurrentInput.value = '';
  });
});
