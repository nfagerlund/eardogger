// Update existing dogear, or create a new dogear.
// TODO: - use this to populate the bookmarklet install textarea.
//       - automatically minify and urlencode this.
//       - template the site URL down there. (IDK, probably have to make this a module that returns a function)

(
  () => {
    let d = document;
    let e = 'https://eardogger.glitch.me';
    let s = {
      position:'fixed',
      width:'300px',
      top:'100px',
      left:'calc(50% - 150px)',
      padding:'10px',
      boxShadow:'0 0 20px black',
      border:'2px solid black',
      background:'white',
      color:'black',
      zIndex:'40000'
    };
    let msg = (txt, auto) => {
      let m = d.createElement('div');
      Object.assign(m.style, s);
      m.onclick = function(e){this.remove();};
      m.innerHTML = txt;
      d.body.append(m);
      if (auto) {
        window.setTimeout(()=>{m.remove()}, 3000);
      }
    };
    let go = () => {
      d.location.href = e + '/mark/' + encodeURIComponent(document.location.href);
    }
    fetch(e + '/api/v1/update', {
      method:'POST',
      mode:'cors',
      credentials:'include',
      headers:{
        'Content-Type':'application/json',
        'Accept':'application/json'
      },
      body:JSON.stringify({current: document.location.href})
    }).then(rs=>{
      if (rs.ok) {
        msg('Bookmark updated', true);
      } else if (rs.status === 400) {
        // explain yrself, possibly w/ link to update bookmarklet
        // expects a {error: "message"} object in the response
        rs.json().then(data=>{
          msg(data.error);
        });
      } else {
        // other http error - 401 not logged in, or 404 bookmark doesn't exist
        // navigate to old-style update/create page
        go();
      }
    }).catch(err=>{
      // CSP or CORS problem, request was never sent
      // navigate to old-style update page
      go();
    });
  }
)();
