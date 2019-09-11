// client-side js
// run by the browser each time your view template referencing it is loaded

console.log('hello world :o');

let dogears = [];

// define variables that reference elements on our page
const dogearsList = document.getElementById('dogears');
const createForm = document.forms[0];
  const createPrefixInput = createForm.elements['prefix'];
  const createCurrentInput = createForm.elements['current'];
const updateForm = document.forms[1];
  const updateCurrentInput = updateForm.elements['current'];

// a helper function to call when our request for dogears is done
const getDogearsListener = function() {
  // parse our response to convert to JSON
  dogears = JSON.parse(this.responseText);

  // Replace the whole dogears list, fuck it
  dogearsList.innerHTML = '';

  // iterate through every dogear and add it to our page
  dogears.forEach( function(row) {
    const newLI = document.createElement('li');
    newLI.innerHTML = `<a href=${row.current}>${row.current}</a>`
    dogearsList.appendChild(newLI);
  });
}

const refreshDogears = function() {
  // request the dogears from our app's sqlite database
  const dogearRequest = new XMLHttpRequest();
  dogearRequest.onload = getDogearsListener;
  dogearRequest.open('get', '/list');
  dogearRequest.send();
}

refreshDogears();

// semi-generic helper for submitting an object
const submitDogear = function(dest, dogObj) {
  let dogPost = new XMLHttpRequest();
  dogPost.open('post', dest);
  dogPost.setRequestHeader("Content-Type", "application/json");
  dogPost.send(JSON.stringify(dogObj));
}

// create form:
createForm.onsubmit = function(e) {
  e.preventDefault();
  submitDogear('/create', {prefix: createPrefixInput, current: createCurrentInput});
  createPrefixInput.value = '';
  createCurrentInput.value = '';
  refreshDogears();
};

// update form:
updateForm.onsubmit = function(e) {
  e.preventDefault();
  submitDogear('/update', {current: updateCurrentInput});
  updateCurrentInput.value = '';
  refreshDogears();
};
