/*
* Serving logic using Express-Handlebars
*/

// dependencies
const express = require('express');
const exhandle = require('express-handlebars');
const fs = require('fs');
const path = require('path');

// set port value
var port = process.env.PORT || 3000;

// set up express for use with handlebars
const app = express();

app.use(express.static('public'));

app.engine('handlebars', exhandle.engine({
  defaultLayout: 'main'
}));
app.set('view engine', 'handlebars');

// var characterFilenames = fs.readdirSync(path.join(__dirname,'character_data'));
// characterFilenames.forEach
// var postData = JSON.parse(fs.readFileSync("./postData.json"));

// get list of current systems pages
var systemsList = fs.readdirSync(path.join(__dirname,'views','systems'));
systemsList.forEach((name,index) => { systemsList[index] = name.replace(".handlebars","")});

// routing for home page using regex to catch possible home path variations
app.get('/:homePath(home|index|index.html)?', function(req, res) {
  res.status(200).render('home', {
    systems: systemsList
  });
});

// routing for systems pages
app.get('/systems/:sys', function(req, res) {
  var sys = req.params.sys;
  if (systemsList.includes(sys)) {
    res.status(200).render(path.join('systems',sys), { layout: 'system' });
  }else {
    res.status(404).render('404');
  }
});

// catch form data
app.post('/save_character', express.json(), function( req, res ) {
  console.log(req.body);
  res.status(200).send("post successful");
  res.end();
});

// routing for 404 error page
app.use((req, res) => {res.status(404).render('404')});

// server creation
app.listen(port, function () {
  console.log("== Server is listening on port", port);
});
