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

// clipboard button handler
function clipboardHandler(button) {
  let target = document.getElementById( button.getAttribute('data-copy-target') );
  let copyButtons = document.getElementsByClassName('copy-button');
  if (navigator.clipboard) {
    navigator.clipboard.writeText(target.textContent).then(() => {
      resetButtonStatuses('success', button, copyButtons);
    }).catch(() => {
      resetButtonStatuses('fail', button, copyButtons);
    });
  } else {
    resetButtonStatuses('fail', button, copyButtons);
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

// Get the list of bookmarks from the backend, and refresh the on-page list with current info.
function refreshDogears() {
  const bookmarksList = document.getElementById('dogears');
  if (!bookmarksList) {
    return;
  }

  fetch('/fragments/dogears', {
    method: 'GET',
    credentials: 'include',
  }).then(response => {
    response.text().then(dogears => {
      bookmarksList.innerHTML = dogears;
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

function replaceFragment(url, fragmentElementId, triggerElement) {
  triggerElement.classList.add('busy-fetching');
  return fetch(url, {
    credentials: 'include',
  }).then(response => {
    response.text().then(text => {
      if (response.ok) {
        document.getElementById(fragmentElementId).outerHTML = text;
      } else {
        document.getElementById(fragmentElementId).prepend(`Hmm, something went wrong: ${text}`);
      }
    });
  }).catch(err => {
    document.getElementById(fragmentElementId).prepend(`Hmm, something went wrong: ${err}`);
  }).finally(() => {
    triggerElement.classList.remove('busy-fetching');
  });
}

// The big "clicking on buttons" listener
document.addEventListener('click', function(e){
  const that = e.target;
  if (that.matches('.help-reveal')) {
    // Help text toggle buttons:
    e.preventDefault();
    const helpTarget = document.getElementById( that.getAttribute('data-help-target') );
    helpTarget.classList.toggle('help-hidden');
    that.classList.toggle('help-reveal-active');
  } else if (that.matches('.pagination-link')) {
    e.preventDefault();
    replaceFragment(
      that.getAttribute('data-fragment-url'),
      that.getAttribute('data-fragment-element-id'),
      that
    ).then(() => {
      // Later, do a history.pushState(), once I sort that out.
    }).catch(() => {
      // set location.href
    });
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

// Manual "dogear a URL" form on homepage
document.addEventListener('submit', function(e){
  const that = e.target;
  if (that.matches('#update-dogear')) {
    e.preventDefault();
    submitDogear('/api/v1/update', {
      current: that.elements['current'].value,
    }).then(success => {
      if (success) {
        that.elements['current'].value = '';
      } else {
        document.location.href = '/mark/' + encodeURIComponent(that.elements['current'].value);
      }
    });
  }
});

// OK, here's all the stuff where I need to know the page state before doing something:
whenever(() => {

// "Returning to site in..." countdown timer after dogearing something
const countdownIndicator = document.getElementById('countdown');
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

// Creating new dogear: Suggest the domain name as the default prefix, but let them customize it
// if the same domain hosts several sites.
const createForm = document.getElementById('create-dogear');
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

}); // end whenever()
})(); // that's a wrap
