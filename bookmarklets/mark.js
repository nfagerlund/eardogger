// Update existing bookmark, or create a new bookmark.
// TODO: use this to populate the bookmarklet install textarea

(
  () => {
    let d = document;
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
    fetch('https://eardogger.glitch.me/update', {
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
        // expects a {help: "html"} object in the response
        rs.json().then(data=>{
          msg(data.help);
        });
      } else {
        // other http error - 401 not logged in, or 404 bookmark doesn't exist
        // navigate to old-style update/create page
      }
    }).catch(error=>{
        // CSP or CORS problem, request was never sent
        // navigate to old-style update page
    });
  }
)();
