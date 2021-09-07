// load fully-configured express app
import app from './app';

// listen for requests
let listener = app.listen(process.env.PORT, function() {
  let address = listener.address();
  if (typeof address === 'string') {
    console.log(`Got something unexpected back from Server.address(): ${address}`);
  } else if (address === null) {
    console.log('Got null back from Server.address()??');
  } else {
    console.log('Your app is listening on port ' + address.port);
  }
});
