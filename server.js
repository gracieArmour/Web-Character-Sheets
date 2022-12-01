/*
* Serving logic using Express-Handlebars
*/

// dependencies
var express = require('express');
var exhandle = require('express-handlebars');
var fs = require('fs');

// set up express for use with handlebars
var app = express();
var port = process.env.PORT || 3000;

app.use(express.static('public'));

app.engine('handlebars', exhandle.engine({
  defaultLayout: 'main'
}));
app.set('view engine', 'handlebars');

// var postData = JSON.parse(fs.readFileSync("./postData.json"));

// routing for home page using regex to catch possible home path variations
app.get('/:homePath(home|index|index.html)?', function(req, res) {
  res.status(200).render('postsPage', {
    posts: postData
  });
});

// app.get('/posts/:postIndex', function(req, res) {
//   var postIndex = req.params.postIndex;
//   if (postData[postIndex]) {
//     res.status(200).render('postsPage', {
//       postOnly: true,
//       postData: postData[postIndex]
//     });
//   }else {
//     res.status(404).render('404');
//   }
// });

// routing for 404 error page
app.get('*', function (req, res) {
  res.status(404).render('404');
});


// server creation
app.listen(port, function () {
  console.log("== Server is listening on port", port);
});
