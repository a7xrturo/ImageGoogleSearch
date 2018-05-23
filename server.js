// server.js
// where your node app starts

// init project
var fs = require('fs');
var paths = require('path');
var express = require('express');
var GoogleImages = require('google-images');
var app = express();
// using https://www.npmjs.com/package/google-images#set-up-google-custom-search-engine
// https://console.developers.google.com/apis/credentials
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
const client = new GoogleImages(process.env.CSEid, process.env.APIkey);

// Main Page
app.get(/\//, function (req, res) {
  res.setHeader('Content-Type', 'text/html');
  res.sendFile(paths.join(__dirname, '.', 'index.html'));
});

// Recently submitted
app.get('/recent/search', function(req, res) {
  fs.readFile('./history.json', function(err, data) {
    if(!err && data) {
      res.setHeader('Content-Type', 'application/json');
      var json = JSON.parse(data);
      var jsonStr = JSON.stringify(json.table);
      res.end(jsonStr); 
    } else {
      console.log('Error reading file');
    }
  });
});

// Checks if there is a query and if its in the format: 'offset=<number>'
var checkIfQuery = function(req, res, next) {
  if(Object.keys(req.query).length !== 0) {
    if(!isNaN(req.query.offset)) {
      var search = req.path.split('%20').join(' ').substring(1,);
      client.search(search, {page: req.query.offset})
        .then(images => {
          var newimg = {};
          for(var i = 0; i < images.length; i++) {
            var info = (({ url, description, parentPage }) => ({url, description, parentPage}))(images[i]);
            newimg[i] = info;
          }
          // Write to file
          writeToHistory(search);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(newimg));
        })
        .catch(failureCallback);
    } else {
      var response = {'Error':'Try with this format for pagination: "?offset=<number>" '};
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(response));
    }
  } else {
    // There is no query, call the other callback function to handle when there is on query
    next();
  }
};

// Performs the search if there is no query present
var doWithoutQuery = function(req, res) {
  var search = req.path.split('%20').join(' ').substring(1,);
  client.search(search)
    .then(images => {
      var newimg = {};
      for(var i = 0; i < images.length; i++) {
        var info = (({ url, description, parentPage }) => ({url, description, parentPage}))(images[i]);
        newimg[i] = info;
      }
      // Write to file
      writeToHistory(search);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(newimg));
    })
    .catch(failureCallback);
};

// Check for format -> https://google-image-search.glitch.me/<search>
app.get('^\/[a-zA-Z0-9 ]*$', checkIfQuery, doWithoutQuery);

// 404 Not Found
app.get("*", function (req, res) {
  res.setHeader('Content-Type', 'text/plain');
  res.end('404, Not Found');
});

// Listen for requests
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});

function failureCallback(error) {
  console.log("It failed with " + error);
};

function writeToHistory(search) {
  fs.readFile('./history.json', 'utf8', function(err, data) {
    if(!err && data) {
      var obj = JSON.parse(data);
      obj.table.push({search : search, date: new Date()});
      var json = JSON.stringify(obj); 
      fs.writeFile('./history.json', json, 'utf8', function(err) {if(err) throw err;}); 
    } else {
      var history = {table: []};
      history.table.push({search : search, date: new Date()});
      var json = JSON.stringify(history);
      fs.writeFile('./history.json', json, 'utf8', function(err) {if(err) throw err;});
    }
  });
};