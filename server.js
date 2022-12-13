/*
* Serving logic using Express-Handlebars
*/

// dependencies
require('dotenv').config();
const express = require('express');
const exhandle = require('express-handlebars');
const mysql = require('mysql');
const fs = require('fs');
const path = require('path');
// var db = require('./my_modules/db.js');

// collect environmentally stored variables
var port = process.env.PORT || 3000;

// set up express for use with handlebars
const app = express();

app.use(express.static('public'));

app.engine('handlebars', exhandle.engine({
  defaultLayout: 'main'
}));
app.set('view engine', 'handlebars');

// connect to database
var connection;

setTimeout(function() {
  connection = mysql.createConnection({
    host: process.env.DBADDRESS,
    user: process.env.DBUSER,
    password: process.env.DBPASS,
    database: process.env.DBNAME
  });

  connection.connect(function(err) {
    if (err) throw err;
  });
}, 4000);

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
    res.status(200).render(path.join('systems',sys), {
      layout: 'system'
    });
  }else {
    res.status(404).render('404');
  }
});

// routing for systems pages
app.get('/load_character/:sys/:charid', function(req, res) {
  var sys = req.params.sys;
  var id = req.params.charid;
  var context = {};
  if (systemsList.includes(sys)) {
    console.log('SELECT * FROM '+sys+'_characters WHERE id='+id);
    connection.query('SELECT * FROM '+sys+'_characters WHERE id='+id, (err, rows, fields) => {
      if (err) {
        console.log(err);
      }else {
        console.log(rows);
        Object.keys(rows[0]).forEach(key => {
          context[key] = rows[0][key];
        });
        context['layout'] = 'system';
        res.status(200).render(path.join('systems',sys), context);
      }
    })
  }else {
    res.status(404).render('404');
  }
});

// catch form data
app.post('/save_character', express.json(), function(req, res) {
  console.log(req.body);
  res.status(200).send("post successful");
  res.end();
});

app.post('/database', function(req, res) {
  connection.connect();

  connection.query('SELECT * FROM test', (err, rows, fields) => {
    if (err) {
      console.log(err);
    }else {
      rows.forEach(row => {
        console.log("ID: "+row.id+", NAME: "+row.name);
      });
    }
  })

  connection.end();
  res.status(200).send("posted");
})

// routing for 404 error page
app.use((req, res) => {res.status(404).render('404')});

// server creation
app.listen(port, function () {
  console.log("== Server is listening on port", port);
});
