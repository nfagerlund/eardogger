// load fully-configured express app
let app = require('./app');

// listen for requests
let listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});
