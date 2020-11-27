// client-side js
(() => {

// lightweight .ready() replacement
function whenever(callback) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback);
  } else {
    // yolo
    callback();
  }
}

// page state variables, which some functions refer to.
// These get filled in with DOM elements (or not) once the document is ready.
let bookmarksList = null;
let createForm = null;
let updateForm = null;
let countdownIndicator = null;

// clipboard button handler
function clipboardHandler(button) {
  let target = document.getElementById( button.getAttribute('data-copy-target') );
  let copyButtons = document.getElementsByClassName('copy-button');
  if (navigator.clipboard) { // New style
    navigator.clipboard.writeText(target.textContent).then(() => {
      resetButtonStatuses('success', button, copyButtons);
    }).catch(() => {
      resetButtonStatuses('fail', button, copyButtons);
    });
  } else { // Old style
    // ganked from https://stackoverflow.com/questions/34045777/copy-to-clipboard-using-javascript-in-ios
    let oldEditable = target.contentEditable;
    let oldRead = target.readOnly;
    target.contentEditable = true;
    target.readOnly = false;

    let range = document.createRange();
    range.selectNodeContents(target);
    let s = window.getSelection();
    s.removeAllRanges();
    s.addRange(range);
    target.setSelectionRange(0, target.textContent.length);

    target.contentEditable = oldEditable;
    target.readOnly = oldRead;

    let result = document.execCommand('copy');
    let status = result ? 'success' : 'fail';

    resetButtonStatuses(status, button, copyButtons);
  }
}

// button status resetter, for sets of buttons that touch a global object like clipboard
function resetButtonStatuses(newStatus, activeButton, allButtons) {
  for (var i = 0; i < allButtons.length; i++) {
    let current = allButtons[i];
    let status = current.getElementsByClassName('status')[0];
    if (current === activeButton) {
      status.textContent = current.getAttribute(`data-status-${newStatus}`);
    } else {
      status.textContent = current.getAttribute('data-status-ready');
    }
  }
}

// Build a dogear list item, returning a DOM element. No side-effects.
function makeDogear(mark) {
  const li = document.createElement('li');

  const a = document.createElement('a');
  a.setAttribute('href', mark.current);
  a.innerText = mark.display_name || mark.prefix;
  const current = document.createElement('span');
  current.classList.add('current');
  current.innerText = '(' + mark.current + ')';
  const lastDate = document.createElement('span');
  lastDate.classList.add('date');
  lastDate.innerText = 'Last read: ' + (new Date(mark.updated)).toLocaleDateString();
  const destroy = document.createElement('button');
  destroy.setAttribute('type', 'button')
  destroy.setAttribute('data-dogear-id', mark.id);
  destroy.classList.add('delete-dogear');
  destroy.innerText = 'Delete';

  li.append(a, ' ', current, ' ', lastDate, ' ', destroy);

  return li;
}

// Get the list of bookmarks from the API, and refresh the on-page list with current info.
function refreshDogears() {
  if (!bookmarksList) {
    return;
  }

  fetch('/api/v1/list', {
    method: 'GET',
    credentials: 'include',
    headers:{'Content-Type': 'application/json', 'Accept': 'application/json'}
  }).then(response => {
    response.json().then(dogears => {
      bookmarksList.innerHTML = '';
      bookmarksList.append( ...dogears.map(makeDogear) );
    });
  }).catch(err => {
    bookmarksList.innerHTML = `<li>Something went wrong! Error: ${err}</li>`;
  });
}

// Submit a dogear object to the endpoint of your choice. Returns a promise that resolves to a bool (success y/n).
function submitDogear(dest, dogObj) {
  return fetch(dest, {
    method: 'POST',
    credentials: 'include',
    headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
    body: JSON.stringify(dogObj)
  }).then(response => {
    if (response.ok) {
      refreshDogears();
      return true;
    } else {
      return false;
    }
  }).catch(_err => {
    return false;
  });
};

// u guessed it,
function deleteDogear(id) {
  fetch(`/api/v1/dogear/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
  }).then(_res => {
    refreshDogears();
  });
}

// OK, go for it.
whenever(() => {

// some important elements:
bookmarksList = document.getElementById('dogears');
createForm = document.getElementById('create-dogear');
updateForm = document.getElementById('update-dogear');
countdownIndicator = document.getElementById('countdown');

if (updateForm) {
  // Set up manual update form:
  updateForm.addEventListener('submit', function(e) {
    e.preventDefault();
    submitDogear('/api/v1/update', {
      current: this.elements['current'].value,
    }).then(success => {
      if (success) {
        this.elements['current'].value = '';
      } else {
        document.location.href = '/mark/' + encodeURIComponent(this.elements['current'].value);
      }
    });
  });
}

if (countdownIndicator) {
  // we're redirecting soon.
  var count = 3;
  function tick() {
    if (count > 0) {
      countdownIndicator.innerText = count.toString();
      setTimeout(tick, count * 300);
    } else {
      document.location.href = countdownIndicator.getAttribute('data-returnto');
    }
    count--;
  }
  tick();
}

// Munge a default prefix for normal version of the create form
if (createForm && createForm.elements['prefix'] && createForm.elements['prefix'].value) {
  const prefix = createForm.elements['prefix'];
  const changePrefix = document.getElementById('change-prefix');

  const prefixHost = (new URL(prefix.defaultValue)).host + '/';

  prefix.value = prefixHost;
  prefix.readOnly = true;
  prefix.classList.add('read-only');
  changePrefix.style.display = 'inline-block'; // 'cause it's hidden by default.

  changePrefix.addEventListener('click', function(_e){
    this.style.display = 'none';
    prefix.readOnly = false;
    prefix.classList.remove('read-only');
    prefix.value = prefix.defaultValue.replace(/^https?:\/\//, '');
    prefix.focus();
  });
}

// The big "clicking on buttons" listener
document.body.addEventListener('click', function(e){
  const that = e.target;
  if (that.matches('.help-reveal')) {
    // Help text toggle buttons:
    e.preventDefault();
    const helpTarget = document.getElementById( that.getAttribute('data-help-target') );
    helpTarget.classList.toggle('help-hidden');
    that.classList.toggle('help-reveal-active');
  } else if (that.matches('.copy-button')) {
    // Clipboard copy buttons:
    e.preventDefault();
    clipboardHandler(that);
  } else if (that.matches('.really-delete-dogear')) {
    // Armed delete buttons (order matters, must check this before the next one):
    e.preventDefault();
    deleteDogear(that.getAttribute('data-dogear-id'));
  } else if (that.matches('.delete-dogear')) {
    // Unarmed delete buttons:
    e.preventDefault();
    that.classList.add('really-delete-dogear');
    that.innerText = 'REALLY delete';
  } else {
    // Disarm delete buttons when clicking elsewhere:
    const reallies = this.getElementsByClassName('really-delete-dogear');
    // it's a live HTMLCollection, so we have to run the loop backwards. Comedy.
    for (var i = reallies.length - 1; i >= 0; i--) {
      reallies[i].innerText = 'Delete';
      reallies[i].classList.remove('really-delete-dogear');
    }
  }
});


}); // end whenever()
})(); // that's a wrap
