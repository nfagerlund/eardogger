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
const refreshDogears = async () => {
  try {
    const response = await fetch('/api/v1/list', {
      method: 'GET',
      credentials: 'include',
      headers:{'Content-Type': 'application/json', 'Accept': 'application/json'}
    });
    const bookmarks = await response.json();
    // Replace the whole bookmarks list
    bookmarksList.innerHTML = bookmarks
      .map( mark => `<li><a href=${mark.current}>${mark.display_name || mark.current}</a></li>` )
      .join(' ');
  } catch (e) {
    bookmarksList.innerHTML = `<li>Something went wrong! Error: ${e}</li>`;
  }
}

refreshDogears();

// semi-generic helper for submitting an object
const submitDogear = async (dest, dogObj) => {
  try {
    const response = await fetch(dest, {
      method: 'POST',
      credentials: 'include',
      headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
      body: JSON.stringify(dogObj)
    });

    refreshDogears();

    return true;
  } catch (e) {
    // Later: give feedback that it failed?
    return false;
  }
}

// create form:
createForm.onsubmit = async function(e) {
  e.preventDefault();
  const success = await submitDogear('/api/v1/create', {
    prefix: createPrefixInput.value,
    current: createCurrentInput.value,
    display_name: createNameInput.value
  });
  if (success) {
    createPrefixInput.value = '';
    createCurrentInput.value = '';
    createNameInput.value = '';
  }
};

// update form:
updateForm.onsubmit = async function(e) {
  e.preventDefault();
  const success = await submitDogear('/api/v1/update', {current: updateCurrentInput.value});
  if (success) {
    updateCurrentInput.value = '';
  }
};
