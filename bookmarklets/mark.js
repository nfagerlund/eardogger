// Update existing dogear, or create a new dogear.
// TODO: - template the site URL down there.

(
  () => {
    let d = document;
    let e = 'https://eardogger.com';
    let s = {
      position:'absolute',
      width:'300px',
      boxSizing:'border-box',
      left:'calc(50% - 150px)',
      padding:'30px 10px',
      boxShadow:'0 15px 20px black',
      borderRadius:'8px',
      textAlign:'center',
      fontSize:'16px',
      fontFamily:'sans-serif',
      background:'#FFF8EB',
      color:'black',
      zIndex:'40000'
    };
    let msg = (txt, auto) => {
      let m = d.createElement('div');
      Object.assign(m.style, s);
      m.onclick = function(e){m.remove();};
      m.innerHTML = txt;
      m.place = ()=>{m.style.top = `${window.scrollY + 100}px`; d.body.append(m);};
      m.auto = ()=>{window.setTimeout(()=>{m.remove()}, 3000);};

      m.place();
      if (auto) {
        m.auto();
      }
      return m;
    };
    let go = () => {
      d.location.href = e + '/mark/' + encodeURIComponent(document.location.href);
    };
    if (fetch) {
      let b = msg('Updating dogear...');
      fetch(e + '/api/v1/update', {
        method:'POST',
        mode:'cors',
        credentials:'include',
        headers:{
          'Content-Type':'application/json',
          'Accept':'application/json'
        },
        body:JSON.stringify({current: d.location.href})
      }).then(rs=>{
        if (rs.ok) {
          b.innerHTML = 'Dogear updated';
          b.place();
          b.auto();
        } else if (rs.status === 400) {
          // explain yrself, possibly w/ link to update bookmarklet
          // expects a {error: "message"} object in the response
          rs.json().then(data=>{
            b.innerHTML = data.error;
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
    } else {
      go();
    }
  }
)();
