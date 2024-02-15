const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const config = require('./config/database');
const bodyParser = require('body-parser');
const session = require('express-session');
const { body } = require('express-validator');
const flash = require('connect-flash');
const expressMessages = require('express-messages');




mongoose.connect(config.database);
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error: '));
db.once('open', function () {
  console.log('Connected successfully');
});

const app = express();
app.use(express.json());

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));


//middleware body parser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


//set global errors variable 
app.locals.errors = null ;

app.set('trust proxy', 1);
app.use(
  session({
    secret: 'keyboard cat',
    resave: true,
    saveUninitialized: true,
   // cookie: { secure: true },
  })
);

// Express Messages middleware
app.use(require('connect-flash')());
app.use(function (req, res, next) {
  res.locals.messages = expressMessages(req, res);
  next();
});

// Use express-validator middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
//

// Importing routers
const pagesRouter = require('./routes/pages');
const adminPagesRouter = require('./routes/admin_pages');
const adminCategories = require('./routes/admin_categories.js');
const adminProducts = require('./routes/admin_products.js');

// Use routers as middleware

app.use('/', pagesRouter);
app.use('/admin/pages', adminPagesRouter);
app.use('/admin/categories',adminCategories);
app.use('/admin/products',adminProducts);

const port = 3000;
app.listen(port, function () {
  console.log('Server is running on port ' + port);
});
