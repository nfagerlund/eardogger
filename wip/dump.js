var fs = require('fs');
fs.readFile( __dirname + '/../schema/schema.sql', 'utf8', function(err, data){
  console.log(err);
  console.log(data);
});
