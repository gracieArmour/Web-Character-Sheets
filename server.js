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
        if(!config.restrictAccess) {
          return next();
        }else {
          var ip = req.socket.remoteAddress;
          console.log(ip + " requested " + req.url);

          if(ip == null || config.allowedAddresses.indexOf(ip) == -1) {
              console.log("Access denied from remote IP " + ip);
              return next(new Error("Your IP address is not allowed to access this resource."));
          }
          next();
        }
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
var listStats = {
  soa: [{statName:"Mighty",debilityName:"Weakened"},{statName:"Agile",debilityName:"Shaky"},{statName:"Versed",debilityName:"Addled"},{statName:"Cunning",debilityName:"Confused"},{statName:"Spirited",debilityName:"Broken"}],
  dnd: []
};

class contextBlock {
  systems = systemsList;
  sysName;
  charID;
  // sheet context
  sheetContext = {
    basicProperties: [{name:"Age"}, {name:"Height"}, {name:"Weight"}],
    statsList: []
  };

  constructor(sys,id) {
    if (sys) {
      this.sysName = sys;
      this.charID = id;
      this.layout = "system";
      this.sheetContext['statsList'] = listStats[sys];
    }
  }

  rawify() {
    this.raw = JSON.stringify(this,undefined,4);
  }
}

// routing for home page using regex to catch possible home path variations
app.get('/:homePath(home|index|index.html)?', (req, res) => {res.status(200).render('home', new contextBlock)});

// routing for systems pages
app.get('/systems/:sys', (req, res) => {
  var sys = req.params.sys;
  var responseContext = new contextBlock(sys);
  if (systemsList.includes(sys)) {
    if (sys=="soa") {
      connection.query('SELECT * FROM soa_moves', (err, rows, fields) => {
        var output = [];
        if (err) {
          console.log(err);
        }else {
          rows.forEach(row => {
            output.push({
              id: row.id,
              type: row.type,
              playbook: row.source,
              name: row.name
            });
          });
        }
        responseContext.sheetContext["allMoves"] = output;

        // debug
        responseContext.rawify();

        // send response
        res.status(200).render(path.join('systems',sys), responseContext);
      })
    }else {
      // debug
      responseContext.rawify();

      // send response
      res.status(200).render(path.join('systems',sys), responseContext);
    }
  
  }else {
    res.status(404).render('404', responseContext);
  }
});

// routing for loaded character pages
app.get('/character/:sys/:charid', (req, res) => {
  var sys = req.params.sys;
  var id = req.params.charid;
  var responseContext = new contextBlock(sys,id);

  if (systemsList.includes(sys)) {
    console.log('SELECT * FROM '+sys+'_characters WHERE id='+id);
    connection.query('SELECT * FROM '+sys+'_characters WHERE id='+id, (err, rows, fields) => {
      if (err) {
        console.log(err);
      }else {
        console.log(rows);
        // modify context
        Object.keys(rows[0]).forEach(key => {
          responseContext.sheetContext[key] = rows[0][key];
        });

        // send response
        res.status(200).render(path.join('systems',sys), responseContext);
      }
    })
  }else {
    res.status(404).render('404', responseContext);
  }
});

// catch form data
app.post('/save_character', express.json(), (req, res) => {
  console.log(req.body);
  res.status(200).send("post successful");
  res.end();
});

app.post('/database/:fetchType', (req, res) => {
  var fetchType = req.params.fetchType;
  
  if (fetchType=="AllMoves") {
    connection.query('SELECT * FROM soa_moves', (err, rows, fields) => {
      var output = {};
      if (err) {
        console.log(err);
      }else {
        rows.forEach(row => {
          output[row.id] = row;
        });
      }
      res.status(200).send(output);
    })
  }
})

// routing for 404 error page
app.use((req, res) => {res.status(404).render('404', new contextBlock)});

// server creation
app.listen(port, function () {
  console.log("== Server is listening on port", port);
});
