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

// OK, go for it.
whenever(() => {

// some important elements:
const bookmarksList = document.getElementById('dogears');
const createForm = document.getElementById('create-dogear');
const updateForm = document.getElementById('update-dogear');
const countdownIndicator = document.getElementById('countdown');

if (bookmarksList) {
  // Then we're on the front page and you're logged in.

  // Build a dogear list item, but gotta do it paranoid-like because html injection,
  // so this returns a DOM element.
  const makeDogear = mark => {
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
  const refreshDogears = () => {
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

  // delegate delete buttons
  bookmarksList.addEventListener('click', function(e){
    const that = e.target;
    if ( that.classList.contains('really-delete-dogear') ) {
      e.preventDefault();
      fetch(`/api/v1/dogear/${that.getAttribute('data-dogear-id')}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
      }).then(res => {
        refreshDogears();
      });
    } else if ( that.classList.contains('delete-dogear') ) {
      e.preventDefault();
      that.classList.add('really-delete-dogear');
      that.innerText = 'REALLY delete';
    } else {
      const reallies = this.getElementsByClassName('really-delete-dogear');
      // it's a live HTMLCollection, so we have to run the loop backwards. Comedy.
      for (var i = reallies.length - 1; i >= 0; i--) {
        reallies[i].innerText = 'Delete';
        reallies[i].classList.remove('really-delete-dogear');
      }
    }
  });

  // semi-generic helper for submitting a dogear
  const submitDogear = (dest, dogObj) => {
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
    }).catch(err => {
      return false;
    });
  };

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
if (createForm && createForm.elements['prefix'].value) {
  const prefix = createForm.elements['prefix'];
  const changePrefix = document.getElementById('change-prefix');

  const prefixHost = (new URL(prefix.defaultValue)).host + '/';

  prefix.value = prefixHost;
  prefix.readOnly = true;
  prefix.classList.add('read-only');
  changePrefix.style.display = 'inline-block';

  changePrefix.addEventListener('click', function(e){
    this.style.display = 'none';
    prefix.readOnly = false;
    prefix.classList.remove('read-only');
    prefix.value = prefix.defaultValue.replace(/^https?:\/\//, '');
    prefix.focus();
  });
}

// Toggle help when help buttons are clicked
document.body.addEventListener('click', function(e){
  const that = e.target;
  if (that.matches('.help-reveal')) {
    e.preventDefault();
    const helpTarget = document.getElementById( that.getAttribute('data-help-target') );
    helpTarget.classList.toggle('help-hidden');
    that.classList.toggle('help-reveal-active');
  }
});


}); // end whenever()
})(); // that's a wrap
