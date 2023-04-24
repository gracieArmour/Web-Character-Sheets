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
const cfUtils = require('./public/crossFileUtils.js');

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
  pool = mysql.createPool({
    connectionLimit: 10,
    host: process.env.DBADDRESS,
	  port: process.env.DBPORT,
    user: process.env.DBUSER,
    password: process.env.DBPASS,
    database: process.env.DBNAME
  });
  console.log("Database Connected");
}, 4000);

function queryPromise(queryStr) {
  return new Promise((resolve,reject) => {
    pool.query(queryStr, (err,rows) => {
      if (err) {
        return reject(err);
      }
      return resolve(rows);
    })
  })
}

function queryPromiseArr(queryStr,arr) {
  return new Promise((resolve,reject) => {
    pool.query(queryStr, arr, (err,rows) => {
      if (err) {
        return reject(err);
      }
      return resolve(rows);
    })
  })
}


// get list of current systems pages
var systemsList = fs.readdirSync(path.join(__dirname,'views','systems'));
systemsList.forEach((name,index) => { systemsList[index] = name.replace(".handlebars","")});


// context variables to be used in page routing
const listStats = {
  soa: [{statName:"Mighty",debilityName:"Weakened"},{statName:"Agile",debilityName:"Shaky"},{statName:"Versed",debilityName:"Addled"},{statName:"Cunning",debilityName:"Confused"},{statName:"Spirited",debilityName:"Broken"}],
  dnd: []
};

class contextBlock {
  systems = systemsList;
  sysName;
  charID;
  // sheet context
  sheetContext = {
    basic_properties: [{name:"Age"}, {name:"Height"}, {name:"Weight"}],
    statsList: [],
  };

  constructor(sys,id) {
    if (sys) {
      this.sysName = sys;
      this.layout = "system";
      this.sheetContext.statsList = JSON.parse(JSON.stringify(listStats[sys]));
    }
    if (id) {
      this.charID = id;
      this.sheetContext.basic_properties = [];
    }
  }

  rawify() {
    this.raw = JSON.stringify(this,undefined,4);

    return this;
  }
}

async function soaGetListData(context) {
  // get moves
  var playbookRows = await queryPromise('SELECT DISTINCT source FROM soa_moves WHERE source<>"Custom"');
  var equipRows = await queryPromise('SELECT * FROM soa_equipment');
  var moveRows = await queryPromise('SELECT * FROM soa_moves');

  // create allPlaybooks
  context.sheetContext["allPlaybooks"] = [];
  playbookRows.forEach(row => {
    context.sheetContext["allPlaybooks"].push(row.source);
  });

  // create allEquipment
  context.sheetContext["allEquipment"] = [];
  equipRows.forEach(row => {
    context.sheetContext["allEquipment"].push({
      id: row.id,
      type: row.type,
      custom: row.is_custom,
      name: row.name
    });
  });

  // create allMoves
  context.sheetContext["allMoves"] = [];
  moveRows.forEach(row => {
    context.sheetContext["allMoves"].push({
      id: row.id,
      type: row.type,
      playbook: row.source,
      name: row.name
    });
  });

  return [equipRows,moveRows];
}

async function soaAddCustoms(char,user) {
  if (char.customEquips) {
    for (const item of char.customEquips) {
      var response = await queryPromiseArr("INSERT INTO soa_equipment SET ?", [item]);
      char.equipment.push({id: response.insertId, uses: item.base_uses});
      console.log("New soa item (id="+response.insertId+") created by "+user);
    }
  }

  if (char.customMoves) {
    for (const move of char.customMoves) {
      var response = await queryPromiseArr("INSERT INTO soa_moves SET ?", [move]);
      char['moves'].push(response.insertId);
      console.log("New soa move (id="+response.insertId+") created by "+user);
    }
  }

  // cleanup
  delete char.customEquips;
  delete char.customMoves;
  char.equipment = JSON.stringify(char.equipment);
  char.moves = JSON.stringify(char.moves);
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
        .then((result) => {
          res.status(200).render(path.join('systems',sys), responseContext.rawify())
        });
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
    queryPromise('SELECT * FROM '+sys+'_characters')
      .then((rows) => {
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
    queryPromise('SELECT * FROM '+sys+'_characters WHERE id='+id)
      .then((rows) => {
        if (JSON.parse(rows[0]['users']).includes(req.session.username)) {
          // grab list data
          if (sys=="soa") {
            soaGetListData(responseContext)
              .then((result) => {
                // modify context
                Object.keys(rows[0]).forEach(key => {
                  if (key=="id") {
                    responseContext.sheetContext['charID'] = rows[0][key];
                  }else if (key=="moves" || key=="equipment" || key=="created_at") {
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
                  }else if (key=="last_updated") {
                    responseContext.sheetContext[key] = new Date(rows[0][key]).toLocaleString('en-US',{
                      timeZone: req.session.userTZ,
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      weekday: 'short',
                      hour12: true,
                      hour: 'numeric',
                      minute: 'numeric'
                    });
                  }else {
                    responseContext.sheetContext[key] = rows[0][key];
                  }
                });
              
                // create equipment list for character
                if (rows[0]['equipment']) {
                  responseContext.sheetContext['equipment'] = [];
                  JSON.parse(rows[0]["equipment"]).forEach(item => {
                    var itemObj = result[0].find(entry => entry.id==item.id);
                    itemObj.uses = item.uses;
                    responseContext.sheetContext['equipment'].push(itemObj);
                  });
                }
              
                // create move list for character
                if (rows[0]['moves']) {
                  responseContext.sheetContext['moves'] = [];
                  JSON.parse(rows[0]["moves"]).forEach(move => {
                    responseContext.sheetContext['moves'].push(result[1].find(entry => entry.id==move));
                  });
                }
              })
              .then((result) => {
                res.status(200).render(path.join('systems',sys), responseContext.rawify())
              });
          }else {
            res.status(200).render(path.join('systems',sys), responseContext.rawify());
          }
        }else {
          res.status(404).render('404', responseContext);
        }
      });
  }else {
    res.status(404).render('404', responseContext);
  }
});

// authenticate login
app.post('/auth/:loginType', express.json(), (req, res) => {
  var type = req.params.loginType;
  var username = req.body.username;
  var password = req.body.password;
  var userTZ = req.body.userTZ;

  if (username && password) {
    queryPromise('SELECT * FROM user_accounts WHERE username="'+username+'"')
      .then((rows) => {
        if (rows.length > 0) {
          if (type=="login") {
            if (rows[0]['password']==password) {
              req.session.loggedin = true;
              req.session.username = username;
              req.session.userTZ = userTZ;
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
            queryPromise('INSERT INTO user_accounts (username, password) VALUES (\"'+username+'\", \"'+password+'\")')
              .then((result) => {
                req.session.loggedin = true;
                req.session.username = username;
                req.session.userTZ = userTZ;
                res.send('Account created');
              });
          }
        }
      });
  }else {
    res.send('Must fill out both fields');
  }
});

// share character
app.post('/share_character/:sys/:id', express.json(), (req,res) => {
  var sys = req.params.sys;
  var id = req.params.id;
  var newUser = req.body.newUser;
  var existingUsers = req.body.existingUsers;

  if (newUser) {
    queryPromise('SELECT * FROM user_accounts WHERE username="'+newUser+'"')
      .then((rows) => {
        if (rows.length > 0) {
          if (!existingUsers.includes(newUser)) {
            existingUsers.push(newUser);
          }
          if (!(existingUsers.includes(req.session.username))) {
            existingUsers.push(req.session.username);
          }
          queryPromise('UPDATE '+sys+'_characters SET users=\''+JSON.stringify(existingUsers)+'\' WHERE id='+id)
            .then((result) => {
              res.send('Shared successfully');
            });
        }else {
          res.send('Account does not exist, username may be misspelled');
        }
      });
  }else {
    if (!(existingUsers.includes(req.session.username))) {
      existingUsers.push(req.session.username);
    }
    queryPromise('UPDATE '+sys+'_characters SET users=\''+JSON.stringify(existingUsers)+'\' WHERE id='+id)
      .then((result) => {
        res.send('Shared successfully');
      });
  }
});


// catch save character request
app.post('/save_character', express.json(), (req, res) => {
  var character = req.body;
  if (character.id) {
    soaAddCustoms(character)
      .then((result) => {
        var charid = character.id
        delete character.id;
        var response = queryPromiseArr('UPDATE soa_characters SET ? WHERE id=?',[character,charid]);
        response.then((result) => {
          console.log('Existing Character updated by '+req.session.username);
          queryPromise("SELECT last_updated FROM soa_characters WHERE id="+charid)
            .then((rows) => {
              res.status(200).send(new Date(rows[0].last_updated).toLocaleString('en-US',{
                timeZone: req.session.userTZ,
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                weekday: 'short',
                hour12: true,
                hour: 'numeric',
                minute: 'numeric'
              }));
            });
        });
      });
  }else {
    soaAddCustoms(character)
      .then((result) => {
        if (req.session.loggedin) {
          // add user
          character['users'] = [req.session.username];
          character.users = JSON.stringify(character.users);

          // add character to database
          var response = queryPromiseArr('INSERT INTO soa_characters SET ?',[character])
          response.then((result) => {
            console.log('New Character saved by '+req.session.username);
            res.status(200).send('/character/soa/'+result.insertId);
          });
        }else {
          res.send("Must be logged in to create character");
        }
      });
  }
});

// send raw data to client
app.post('/database/:fetchType', (req, res) => {
  var fetchType = req.params.fetchType;
  
  switch (fetchType) {
    case "AllMoves":
    case "AllEquipment":
      queryPromise('SELECT * FROM soa_'+fetchType.replace("All","").toLowerCase())
        .then((rows) => {
          var output = {};
          rows.forEach(row => {
            output[row.id] = row;
          });
          res.status(200).send(output);
        });
      break;
    case "AllPlaybooks":
      queryPromise('SELECT DISTINCT source FROM soa_moves WHERE source<>"Custom"')
        .then((rows) => {
          var output = [];
          rows.forEach(row => {
            output.push(row.source);
          });
          res.status(200).send(output);
        });
  }
})

// routing for 404 error page
app.use((req, res) => {res.status(404).render('404', new contextBlock)});

// server creation
app.listen(port, function () {
  console.log("== Server is listening on port", port);
});
