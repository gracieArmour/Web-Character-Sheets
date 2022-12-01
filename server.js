/*
* Serving logic using Express-Handlebars
*/

// dependencies
const express = require('express');
const exhandle = require('express-handlebars');
const fs = require('fs');

// set port value
var port = process.env.PORT || 3000;

// set up express for use with handlebars
const app = express();

app.use(express.static('public'));

app.engine('handlebars', exhandle.engine({
  defaultLayout: 'main'
}));
app.set('view engine', 'handlebars');

// catch form data
app.use(express.urlencoded({ extended: false }));
app.use(express.json);

app.post('/post/character', function(req,res) {
  console.log(res.body);
})

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
