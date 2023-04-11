/*
* Serving logic using Express-Handlebars
*/

// dependencies
require('dotenv').config();
const express = require('express');
const session = require('express-session');
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

app.use(session({
  secret: process.env.DBSECRET,
  resave: true,
  saveUninitialized: false
}));

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
    if (err) {
      console.log(err);
    }else {
      console.log("Database Connected");
    }
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
    statsList: [],
  };

  constructor(sys,id) {
    if (sys) {
      this.sysName = sys;
      this.layout = "system";
      this.sheetContext['statsList'] = listStats[sys];
    }
    if (id) {
      this.charID = id;
      this.sheetContext['basicProperties'] = [];
    }
  }

  rawify() {
    this.raw = JSON.stringify(this,undefined,4);

    return this;
  }
}

async function soaGetListData(context) {
  // get moves
  await connection.query('SELECT * FROM soa_moves', (err, rows, fields) => {
    if (err) throw err;
    // create allMoves
    context.sheetContext["allMoves"] = [];
    rows.forEach(row => {
      context.sheetContext["allMoves"].push({
        id: row.id,
        type: row.type,
        playbook: row.source,
        name: row.name
      });
    });
  });

  // get equipment
  await connection.query('SELECT * FROM soa_equipment', (err, rows, fields) => {
    if (err) throw err;
    // create allEquipment
    context.sheetContext["allEquipment"] = [];
    rows.forEach(row => {
      context.sheetContext["allEquipment"].push({
        id: row.id,
        type: row.type,
        custom: row.is_custom,
        name: row.name
      });
    });
  });
}

// routing for home page using regex to catch possible home path variations
app.get('/:homePath(home|index|index.html)?', (req, res) => {res.status(200).render('home', new contextBlock)});

// routing for systems pages
app.get('/systems/:sys', (req, res) => {
  var sys = req.params.sys;
  var responseContext = new contextBlock(sys);
  if (systemsList.includes(sys)) {
    if (sys=="soa") {
      soaGetListData(responseContext)
        .then(res.status(200).render(path.join('systems',sys), responseContext.rawify()));
    }else {
      res.status(200).render(path.join('systems',sys), responseContext.rawify());
    }
  }else {
    res.status(404).render('404', responseContext);
  }
});

// routing for character list page
app.get('/load_characters/:sys', (req, res) => {
  var sys = req.params.sys;
  var responseContext = new contextBlock(sys);

  if (systemsList.includes(sys)) {
    connection.query('SELECT * FROM '+sys+'_characters', (err, rows, fields) => {
      if (err) throw err;
      // modify context
      responseContext.sheetContext['charactersList'] = [];
      rows.forEach(row => {
        if (JSON.parse(row.users).includes(req.session.username)) {
          responseContext.sheetContext['charactersList'].push({id: row.id,name: row.name,image: row.image_url});
        }
      });

      // send response
      res.status(200).render('characterList', responseContext.rawify());
    });
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
    // grab character data
    connection.query('SELECT * FROM '+sys+'_characters WHERE id='+id, (err, rows, fields) => {
      if (err) throw err;
      if (JSON.parse(rows[0]['users']).includes(req.session.username)) {
        // grab list data
        if (sys=="soa") {
          soaGetListData(responseContext)
            .then((result) => {
              // modify context
              Object.keys(rows[0]).forEach(key => {
                if (key=="id") {
                  responseContext.sheetContext['charID'] = rows[0][key];
                }else if (key=="moves" || key=="equipment") {
                  // console.log(rows[0][key]);
                }else if (key=="users" || key=="basic_properties" || key=="playbooks") {
                  responseContext.sheetContext[key] = JSON.parse(rows[0][key]);
                }else if (key.includes("stat") || key.includes("debility")) {
                  responseContext.sheetContext["statsList"].forEach(stat => {
                    if (stat.statName.toUpperCase()==key.split("_")[1].toUpperCase()) {
                      stat['statValue'] = rows[0][key];
                    }else if (stat.debilityName.toUpperCase()==key.split("_")[1].toUpperCase()) {
                      stat['debilityValue'] = rows[0][key];
                    }
                  });
                }else {
                  responseContext.sheetContext[key] = rows[0][key];
                }
              });
            
              // create equipment list for character
              if (rows[0]['equipment']) {
                responseContext.sheetContext['equipment'] = [];
                JSON.parse(rows[0]["equipment"]).forEach(item => {
                  var itemObj = responseContext.sheetContext['allEquipment'].find(entry => entry.id==item.id);
                  itemObj.uses = item.uses;
                  responseContext.sheetContext['equipment'].push(itemObj);
                });
              }
            
              // create move list for character
              if (rows[0]['moves']) {
                responseContext.sheetContext['moves'] = [];
                JSON.parse(rows[0]["moves"]).forEach(move => {
                  responseContext.sheetContext['moves'].push(responseContext.sheetContext['allMoves'].find(entry => entry.id==move));
                });
              }
            })
            .then(res.status(200).render(path.join('systems',sys), responseContext.rawify()));
        }else {
          res.status(200).render(path.join('systems',sys), responseContext.rawify());
        }
      }else {
        res.status(404).render('404', responseContext);
      }
    })
  }else {
    res.status(404).render('404', responseContext);
  }
});

// authenticate login
app.post('/auth/:loginType', express.json(), (req, res) => {
  var type = req.params.loginType;
  console.log(req.body);
  var username = req.body.username;
  var password = req.body.password;

  if (username && password) {
    connection.query('SELECT * FROM user_accounts WHERE username="'+username+'"', (err,rows,fields) => {
      if (err) throw err;
      if (rows.length > 0) {
        if (type=="login") {
          if (rows[0]['password']==password) {
            req.session.loggedin = true;
            req.session.username = username;
            res.send('Logged in');
          }else {
            res.send('Incorrect password');
          }
        }else {
          res.send('Username not available');
        }
      }else {
        if (type=="login") {
          res.send('Username does not exist');
        }else {
          connection.query('INSERT INTO user_accounts (username, password) VALUES (\"'+username+'\", \"'+password+'\")', (insertErr, insertRows, insertFields) => {
            if (err) {
              console.log(err);
            }else {
              req.session.loggedin = true;
              req.session.username = username;
              res.send('Account created');
            }
          })
        }
      }
    })
  }else {
    res.send('Must fill out both fields');
  }
  res.end();
});

// share character
app.post('/share_character/:sys/:id', express.json(), (req,res) => {
  var sys = req.params.sys;
  var id = req.params.id;
  var newUser = req.body.newUser;
  var existingUsers = req.body.existingUsers;

  if (newUser) {
    connection.query('SELECT * FROM user_accounts WHERE username="'+newUser+'"', (err,rows,fields) => {
      if (err) throw err;
      if (rows.length > 0) {
        existingUsers.push(newUser);
        if (!(existingUsers.includes(req.session.username))) {
          existingUsers.push(req.session.username);
        }
        connection.query('UPDATE '+sys+'_characters SET users=\''+JSON.stringify(existingUsers)+'\' WHERE id='+id, (err,rows,fields) => {
          if (err) {
            console.log(err);
          }else {
            res.send('Shared successfully');
          }
        });
      }else {
        res.send('Account does not exist, username may be misspelled');
      }
    });
  }else {
    if (!(existingUsers.includes(req.session.username))) {
      existingUsers.push(req.session.username);
    }
    connection.query('UPDATE '+sys+'_characters SET users=\''+JSON.stringify(existingUsers)+'\' WHERE id='+id, (err,rows,fields) => {
      if (err) throw err;
      res.send('Shared successfully');
    });
  }
  res.end();
});

// catch form data
app.post('/save_character', express.json(), (req, res) => {
  console.log(req.body);
  res.status(200).send("post successful");
  res.end();
});

// send raw data to client
app.post('/database/:fetchType', (req, res) => {
  var fetchType = req.params.fetchType;
  
  switch (fetchType) {
    case "AllMoves":
    case "AllEquipment":
      connection.query('SELECT * FROM soa_'+fetchType.replace("All","").toLowerCase(), (err, rows, fields) => {
        var output = {};
        if (err) throw err;
        rows.forEach(row => {
          output[row.id] = row;
        });
        res.status(200).send(output);
      })
      break;
  }
  res.end();
})

// routing for 404 error page
app.use((req, res) => {res.status(404).render('404', new contextBlock)});

// server creation
app.listen(port, function () {
  console.log("== Server is listening on port", port);
});
