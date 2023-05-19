/*
* Serving logic using Express-Handlebars
*/

// dependencies
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const cookieSession = require('cookie-session');
const { randomBytes } = require('crypto');
const exhandle = require('express-handlebars');
const mysql = require('mysql');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const cfUtils = require('./public/crossFileUtils.js');

// collect environmentally stored variables
var port = process.env.PORT || 3000;
var envName = process.env.ENVNAME;

// set up express for use with handlebars
const app = express();

// helmet security measures
//if images break, fully turn off COEP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "font-src": ["'self'","cdn.rawgit.com","maxcdn.bootstrapcdn.com"],
      "script-src": ["'self'","cdn.jsdelivr.net"],
      "script-src-attr": "'unsafe-inline'",
      "connect-src": ["'self'","cdn.jsdelivr.net"],
      "img-src": ["'self'","https:"]
    }
  },
  crossOriginEmbedderPolicy: {
    policy: "credentialless"
  },
  hsts: false
}));

// server config
function addressMatch(address,allowlist) {
  match = false;

  allowlist.map(str => new RegExp("^::ffff:"+str)).forEach(range => {
    if (range.test(address)) {
      match = true;
    }
  });

  return match;
}

// Cloudflare Only Whitelisting
app.use((req, res, next) => {
    if (envName=="dev") {
      return next();
    }

    var whitelistArr = fs.readFileSync('whitelist.txt','utf8').split(',');
    var ip = req.socket.remoteAddress;
    console.log(ip + " requested " + req.url);

    if(ip == null || !addressMatch(ip,whitelistArr)) {
        console.log("Access denied from remote IP " + ip);
        return next(new Error("Your IP address is not allowed to access this resource."));
    }
    return next();
});

app.use(express.json());
app.use(cookieParser());

app.use(cookieSession({
  name: 'session',
  secret: process.env.DBSECRET,
  maxAge: 24 * 60 * 60 * 1000,
  sameSite: 'lax',
  httpOnly: true
}));

app.use(express.static('public'));

app.engine('handlebars', exhandle.engine({
  defaultLayout: 'main'
}));
app.set('view engine', 'handlebars');

// connect to database
var pool;

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
  loggedin;
  username;
  // sheet context
  sheetContext = {
    basic_properties: [{name:"Age"}, {name:"Height"}, {name:"Weight"}],
    statsList: [],
  };

  constructor(req,sys,id) {
    if (req.session.csrf === undefined) {
      req.session.csrf = randomBytes(100).toString('base64');
    }
    this.csrfToken = req.session.csrf;
    this.loggedin = req.session.loggedin;
    this.username = req.session.username;
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
  var moveTypes = await queryPromise('SELECT DISTINCT type FROM soa_moves');

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

  // create moveTypes
  context.sheetContext['moveTypes'] = moveTypes.map(row => row.type);

  return [equipRows,moveRows];
}

async function soaAddCustoms(char,user) {
  if (char.customEquips) {
    for (var item of char.customEquips) {
      var pos = item.position;
      var exp = item.is_expanded;
      delete item.position;
      delete item.is_expanded;
      if (item.id) {
        var response = await queryPromiseArr('UPDATE soa_equipment SET ? WHERE id=?',[item,item.id]);
        char.equipment.splice(pos,0,{id: item.id, uses: item.base_uses, is_expanded: exp});
        console.log("Custom soa item (id="+item.id+") updated by "+user);
      }else {
        delete item.id;
        var response = await queryPromiseArr("INSERT INTO soa_equipment SET ?", [item]);
        char.equipment.splice(pos,0,{id: response.insertId, uses: item.base_uses, is_expanded: exp});
        console.log("New soa item (id="+response.insertId+") created by "+user);
      }
    }
  }

  if (char.customMoves) {
    for (var move of char.customMoves) {
      var pos = item.position;
      var exp = item.is_expanded;
      delete item.position;
      delete item.is_expanded;
      if (move.id) {
        var response = await queryPromiseArr('UPDATE soa_moves SET ? WHERE id=?',[move,move.id]);
        char.moves.splice(pos,0,{id:move.id, is_expanded: exp});
        console.log("Custom soa move (id="+move.id+") updated by "+user);
      }else {
        delete move.id;
        var response = await queryPromiseArr("INSERT INTO soa_moves SET ?", [move]);
        char.moves.splice(pos,0,{id:response.insertId, is_expanded: exp});
        console.log("New soa move (id="+response.insertId+") created by "+user);
      }
    }
  }

  // cleanup
  delete char.customEquips;
  delete char.customMoves;
  char.equipment = JSON.stringify(char.equipment);
  char.moves = JSON.stringify(char.moves);
}

// routing for home page using regex to catch possible home path variations
app.get('/:homePath(home|index|index.html)?', (req, res) => {res.status(200).render('home', new contextBlock(req))});

// routing for systems pages
app.get('/systems/:sys', (req, res) => {
  var sys = req.params.sys;
  var responseContext = new contextBlock(req,sys);

  if (!systemsList.includes(sys)) {
    res.status(200).render(path.join('systems',sys), responseContext.rawify());
  }

  switch (sys) {
    case "soa":
      soaGetListData(responseContext)
        .then((result) => {
          res.status(200).render(path.join('systems',sys), responseContext.rawify())
        });
      break;
    default:
      res.status(404).render('404', responseContext);
  }
});

// routing for character list page
app.get('/load_characters/:sys', (req, res) => {
  var sys = req.params.sys;
  var responseContext = new contextBlock(req,sys);

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
// load soa characters
async function soaLoadChar(context,char,userTZ,listData) {
  // modify context
  Object.keys(char).forEach(key => {
    if (key=="id") {
      context.sheetContext['charID'] = char[key];
    }else if (key=="moves" || key=="equipment" || key=="created_at") {
      // console.log(char[key]);
    }else if (key=="users" || key=="basic_properties" || key=="playbooks") {
      context.sheetContext[key] = JSON.parse(char[key]);
    }else if (key.includes("stat") || key.includes("debility")) {
      context.sheetContext["statsList"].forEach(stat => {
        if (stat.statName.toUpperCase()==key.split("_")[1].toUpperCase()) {
          stat['statValue'] = char[key];
        }else if (stat.debilityName.toUpperCase()==key.split("_")[1].toUpperCase()) {
          stat['debilityValue'] = char[key];
        }
      });
    }else if (key=="last_updated") {
      context.sheetContext[key] = new Date(char[key]).toLocaleString('en-US',{
        timeZone: userTZ,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        weekday: 'short',
        hour12: true,
        hour: 'numeric',
        minute: 'numeric'
      });
    }else {
      context.sheetContext[key] = char[key];
    }
  });

  // create equipment list for character
  if (char['equipment']) {
    context.sheetContext['equipment'] = [];
    JSON.parse(char["equipment"]).forEach(item => {
      var itemObj = listData[0].find(entry => entry.id==item.id);
      itemObj.uses = item.uses;
      itemObj['is_expanded'] = item.is_expanded;
      context.sheetContext['equipment'].push(itemObj);
    });
  }

  // create move list for character
  if (char['moves']) {
    context.sheetContext['moves'] = [];
    JSON.parse(char["moves"]).forEach(move => {
      var moveObj = listData[1].find(entry => entry.id==move.id);
      moveObj['is_custom'] = (moveObj.source == "Custom");
      moveObj['is_expanded'] = move.is_expanded;
      context.sheetContext['moves'].push(moveObj);
    });
  }
}

app.get('/character/:sys/:charid', (req, res) => {
  var sys = req.params.sys;
  var id = req.params.charid;
  var responseContext = new contextBlock(req,sys,id);

  if (!systemsList.includes(sys)) {
    res.status(404).render('404', responseContext);
    return;
  }

  // grab character data
  queryPromise('SELECT * FROM '+sys+'_characters WHERE id='+id)
    .then((rows) => {
      if (!JSON.parse(rows[0]['users']).includes(req.session.username)) {
        res.status(404).render('404', responseContext);
        return;
      }
      
      // grab list data
      switch (sys) {
        case "soa":
          soaGetListData(responseContext)
            .then(result => soaLoadChar(responseContext,rows[0],req.session.userTZ,result))
            .then((result) => {
              res.status(200).render(path.join('systems',sys), responseContext.rawify());
            });
          break;
        default:
          res.status(200).render(path.join('systems',sys), responseContext.rawify());
      }
    });
});


// POSTS

// CSRF Checker Middleware
function checkCSRF(req) {
  var bodyToken = req.body.csrf;
  delete req.body.csrf;
  if (!bodyToken) {
    console.log("CSRF Token not included");
    return false;
  }

  if (bodyToken !== req.session.csrf) {
    console.log("CSRF tokens do not match");
    return false;
  }

  return true;
}

// authenticate login
app.post('/auth/:loginType', (req, res) => {
  if (!checkCSRF(req)) {
    res.send(new Error("CSRF Error"));
    return;
  }
  var type = req.params.loginType;
  var username = req.body.username;
  var password = req.body.password;
  var userTZ = req.body.userTZ;

  if (!username || !password) {
    res.send('Must fill out both fields');
    return;
  }

  queryPromise('SELECT * FROM user_accounts WHERE username="'+username+'"')
    .then((rows) => {
      if (rows.length > 0) {
        if (type=="signup") {
          res.send('Username not available');
          return;
        }

        if (rows[0]['password']==password) {
          req.session.username = username;
          req.session.userTZ = userTZ;
          req.session.loggedin = true;
          res.send('Logged in');
        }else {
          res.send('Incorrect password');
        }
      }else {
        if (type=="login") {
          res.send('Username does not exist');
          return;
        }

        queryPromise('INSERT INTO user_accounts (username, password) VALUES (\"'+username+'\", \"'+password+'\")')
          .then((result) => {
            req.session.username = username;
            req.session.userTZ = userTZ;
            req.session.loggedin = true;
            res.send('Account created');
          });
      }
    });
});

// logout
app.post('/logout', (req,res) => {
  if (!checkCSRF(req)) {
    res.send(new Error("CSRF Error"));
    return;
  }
  res.status(200).clearCookie('session');
  req.session = null;
  res.status(200).send("Logged out");
});

// share character
app.post('/share_character/:sys/:id', (req,res) => {
  if (!checkCSRF(req)) {
    res.send(new Error("CSRF Error"));
    return;
  }
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
app.post('/save_character', (req, res) => {
  if (!checkCSRF(req)) {
    res.send(new Error("CSRF Error"));
    return;
  }
  var character = req.body;
  character['image_url'] = character.image_url.slice(0,2083);
  if (character.id) {
    soaAddCustoms(character,req.session.username)
      .then((result) => {
        var charid = character.id;
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
    soaAddCustoms(character,req.session.username)
      .then((result) => {
        if (!req.session.loggedin) {
          res.send("Must be logged in to create character");
          return;
        }

        // add user
        character['users'] = [req.session.username];
        character.users = JSON.stringify(character.users);

        // add character to database
        var response = queryPromiseArr('INSERT INTO soa_characters SET ?',[character]);
        response.then((result) => {
          console.log('New Character saved by '+req.session.username);
          res.status(200).send('/character/soa/'+result.insertId);
        });
      });
  }
});

// send raw data to client
app.post('/database/:fetchType', (req, res) => {
  if (!checkCSRF(req)) {
    res.send(new Error("CSRF Error"));
    return;
  }
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
app.use((req, res) => {res.status(404).render('404', new contextBlock(req))});


switch (envName) {
  case "dev":
    // dev server creation
    http.createServer(app).listen(port, function () {
      console.log("== Dev Server is listening on port", port);
    });
    break;
  case "prod":
    // public server creation
    var serverOptions = {
      key: fs.readFileSync('certs/ServerKey.pem'),
      cert: fs.readFileSync('certs/ServerCert.cert')
    };

    https.createServer(serverOptions,app).listen(port, function () {
      console.log("== Prod Server is listening on port", port);
    });
    break;
}
