// search engine id (cx) and google api key: make sure to later make these environment variables
var googleSearchData = {
  cx: "013625214229824497897:ivtrkbjobea",
  key: "AIzaSyAdMd0I_GZUlypsnGP_GrzBaeN0xRqNZCI",
  frontUrl: "https://www.googleapis.com/customsearch/v1"
};


// require helper modules
var path = require('path');
var request = require('request');


// require express
var express = require('express');
var app = express();


// require mongodb
var mongo = require('mongodb').MongoClient;
var dbUrl = "mongodb://localhost:27017/image_search"; // local version


// begin by creating a capped collection!
var collection;
mongo.connect(dbUrl, function(err, client) {
  client.db("image_search").createCollection("image_search_latest", {
    capped: true,
    size: 256 * 10000, // what size?
    max: 10
  });
  
  collection = client.db("image_search").collection('image_search_latest');
});


// app routing
app.get('/', function(req, res, next) {
  console.log("home page");
  
  // render the home page index.html
  res.sendFile(path.join(__dirname, 'index.html'));
});


// query usage
app.get('/search/:search_string', function(req, res, next) {
  var searchString = req.params.search_string;
  var offset = req.query.offset;
  
  if (!searchString) {
    console.log("empty search string");
    
    next();
  }
  
  // store search string into database
  collection.insertOne({
    term: searchString,
    when: new Date().toString()
  });
  
  // call google search api and return search results
  var options = {
    url: googleSearchData.frontUrl,
    qs: {
      q: searchString,
      cx: googleSearchData.cx,
      searchType: "image",
      key: googleSearchData.key,
      start: (offset ? parseInt(offset) + 1 : 1)
    }
  };
  
  // to do... request not working.
  request(options, function(error, response, body) {
    if (error) throw error;
    
    var jsonBody = JSON.parse(body);
    
    res.send(jsonBody.items.map(function(item) {
      return {
        url: item.link,
        snippet: item.snippet,
        thumbnail: item.image.thumbnailLink,
        context: item.image.contextLink
      };
    }));
  });
});


// latest usage
app.get('/latest', function(req, res, next) {
  collection.find({}, {projection: {
    term: 1,
    when: 1,
    _id: 0
  }}).toArray(function(err, items) {
    if (err) throw err;
    
    res.send(items);
  });
});


// other
app.get('/*.ico', function(req, res, next) {
  // do nothing...
});


app.use(function(req, res) {
  console.log("Usage error: no match");
  
  res.send({error: "Usage error"});
});


app.listen(3000, function() {
  console.log('Example app listening on port 3000!');
});

