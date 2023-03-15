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
const { response } = require('express');
// var db = require('./my_modules/db.js');

// collect environmentally stored variables
var port = process.env.PORT || 3000;

// set up express for use with handlebars
const app = express();

// server config
app.use((req, res, next) => {
    fs.readFile(__dirname + '/config.json', function(err, file) {
        if(err) return next(new Error("Internal error : " + err.message));

        const config = JSON.parse(file.toString('utf8'));
		
		//WHITELIST
        if(!config.restrictAccess) return next();
        
        var ip = req.socket.remoteAddress;

        if(ip == null || config.allowedAddresses.indexOf(ip) == -1) {
            console.log("Access denied from remote IP " + ip);
            return next(new Error("Your IP address is not allowed to access this resource."));
        }
        next();
    });
});

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
	  port: process.env.DBPORT,
    user: process.env.DBUSER,
    password: process.env.DBPASS,
    database: process.env.DBNAME
  });

  connection.connect(function(err) {
    if (err) throw err;
  });
}, 4000);


// get list of current systems pages
var systemsList = fs.readdirSync(path.join(__dirname,'views','systems'));
systemsList.forEach((name,index) => { systemsList[index] = name.replace(".handlebars","")});


// context variables to be used in page routing
var responseContext = {
  sysName: '',
  systems: systemsList,
  sheetContext: {
    statsList: []
  }
};

var listStats = {
  soa: [{statName:"Mighty",debilityName:"Weakened"},{statName:"Agile",debilityName:"Shaky"},{statName:"Versed",debilityName:"Addled"},{statName:"Cunning",debilityName:"Confused"},{statName:"Spirited",debilityName:"Broken"}],
  dnd: []
};

// routing for home page using regex to catch possible home path variations
app.get('/:homePath(home|index|index.html)?', function(req, res) {
  console.log(req.socket.remoteAddress);
  res.status(200).render('home', responseContext);
});

// routing for systems pages
app.get('/systems/:sys', function(req, res) {
  var sys = req.params.sys;
  if (systemsList.includes(sys)) {
    // modify context
    responseContext['sheetContext']['statsList'] = listStats[sys];
    responseContext['sheetContext']['basicProperties'] = [{name:"Age"}, {name:"Height"}, {name:"Weight"}];
    responseContext['layout'] = 'system';
    responseContext['sysName'] = sys;
    
    // debug
    responseContext['raw'] = JSON.stringify(responseContext['sheetContext'],undefined,4);

    // send response
    res.status(200).render(path.join('systems',sys), responseContext);
    delete responseContext.layout;
  }else {
    res.status(404).render('404', responseContext);
  }
});

// routing for systems pages
app.get('/character/:sys/:charid', function(req, res) {
  var sys = req.params.sys;
  var id = req.params.charid;
  if (systemsList.includes(sys)) {
    console.log('SELECT * FROM '+sys+'_characters WHERE id='+id);
    connection.query('SELECT * FROM '+sys+'_characters WHERE id='+id, (err, rows, fields) => {
      if (err) {
        console.log(err);
      }else {
        console.log(rows);
        // modify context
        Object.keys(rows[0]).forEach(key => {
          responseContext['sheetContext'][key] = rows[0][key];
        });
        responseContext['sheetContext']['statsList'] = listStats[sys];
        responseContext['sheetContext']['basicProperties'] = [{name:"Age"}, {name:"Height"}, {name:"Weight"}];
        responseContext['layout'] = 'system';
        responseContext['sysName'] = sys;
        responseContext['charID'] = id;

        // send response
        res.status(200).render(path.join('systems',sys), responseContext);
        delete responseContext.layout;
      }
    })
  }else {
    res.status(404).render('404', responseContext);
  }
});

// catch form data
app.post('/save_character', express.json(), function(req, res) {
  console.log(req.body);
  res.status(200).send("post successful");
  res.end();
});

app.post('/database', function(req, res) {
  connection.query('SELECT * FROM test', (err, rows, fields) => {
    if (err) {
      console.log(err);
    }else {
      rows.forEach(row => {
        console.log("ID: "+row.id+", NAME: "+row.name);
      });
    }
  })
  res.status(200).send("posted");
})

// routing for 404 error page
app.use((req, res) => {res.status(404).render('404', responseContext)});

// server creation
app.listen(port, function () {
  console.log("== Server is listening on port", port);
});
