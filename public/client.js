// client-side js

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

  refreshDogears();

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
      refreshDogears();
      return true;
    }).catch(err => {
      return false;
    });
  };

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

if (createForm && createForm.elements['prefix'].value) {
  const initialVal = createForm.elements['prefix'].value;
  const initialUrl = new URL(initialVal);
  createForm.elements['prefix'].setSelectionRange(
    initialVal.indexOf(initialUrl.pathname) + 1,
    initialVal.length
  );
}
