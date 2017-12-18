const fs = require('fs');
const request = require('request');
const config = require('../config.json');


uploadBundle(config.token, '../bundle/dev/bundle.zip');

function uploadBundle(token, path) {

  const url = 'http://dev2.viewar.com/resources/AppfilesUpload';
  const formData = {
    token,
    file: fs.createReadStream(__dirname + '/' + path),
  };

  const req = request.post({ url, formData }, (err, resp, body) => {
    if (err) {
      console.log('Error!', err);
    } else {
      console.log(body);
    }
  });
}
