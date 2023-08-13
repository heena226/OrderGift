const express = require('express');
const { check, validationResult } = require('express-validator');
const path = require('path');

// Session - import express-session
const session = require('express-session');

// Import mongoose and connect to DB
const mongoose = require('mongoose');

const fileUpload = require('express-fileupload');

const cookieParser = require('cookie-parser')

// Please read this post if you are issuing connecting to MongoDB Compass
// https://stackoverflow.com/questions/46523321/mongoerror-connect-econnrefused-127-0-0-127017
mongoose.connect('mongodb://0.0.0.0:27017/mywebsite', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Request Model
// Mongoose will create a collection called 'contacts' in the MongoDB database (Mongoose pluralizes the model name to create the collection name by default).
const Request = mongoose.model('requests', {
  name: String,
  email: String,
  description: String,
  priority: String,
  status: String,
  imageName: String,
});

// Request Model
const Product = mongoose.model('products', {
  name: String,
  email: String,
  customerId: String,
  product1: Number,
  product2: Number,
  product3: Number,
  amountBeforeTax: Number,
  amountAfterTax: Number
});

// Session - create a model for admin users
const Admin = mongoose.model('Admin', {
  username: String,
  password: String,
});

let myApp = express();
myApp.set('views', path.join(__dirname, 'views'));
myApp.use(express.static(__dirname + '/views'));
myApp.use(express.static(__dirname + '/public'));
myApp.set('details', path.join(__dirname, 'details'));
myApp.use(express.static(__dirname + '/details'));
myApp.set('view engine', 'ejs');
myApp.use(fileUpload());

// let’s you use the cookieParser in application
myApp.use(cookieParser());
myApp.use(express.urlencoded({ extended: false }));

// Session setup
myApp.use(
  session({
    secret: 'aslkdfjlaskd1237103498', // should be unique for each application
    resave: false,
    saveUninitialized: true,
  })
);

// render the login form
myApp.get('/admin-login', (req, res) => {
    res.render('login'); // will render views/login.ejs
});
  
myApp.get('/logout', (req, res) => {
    req.session.username = ''; // reset the username
    req.session.loggedIn = false; // make logged in false from true
    res.redirect('/admin-login');
});

myApp.get('/admin-home', async(req, res) => {
    if (req.session.loggedIn) {

      const data = await Product.find();
      res.render('admin-home', { data });
    } else {
      res.redirect('/admin-login');
    }
});

// login process page
myApp.post('/loginForm', async (req, res) => {
    // fetch login data
    let username = req.body.username;
    let password = req.body.password;
  
    // find admin in the database
    const admin = await Admin.findOne({
      username,
      password,
    }).exec();
  
    if (admin) {
      req.session.username = admin.username;
      req.session.loggedIn = true;

        const data = await Product.find();
        res.render('admin-home', { data });

    } else {
      let pageData = {
        error: 'Login details not correct',
      };
      res.render('login', pageData);
    }
});

// Admin account setup
myApp.get('/setup', function (req, res) {
    var adminData = {
      username: 'admin',
      password: 'admin',
    };
    let newAdmin = new Admin(adminData);
    newAdmin.save();
    // res.send('Done');
    res.redirect('/setup-done');
});

myApp.get('/setup-done', (req, res) => {
    res.cookie(`Admin LoggedIn`,`True`);
  res.render('setup-done'); // will render views/login.ejs
});

// Fetch multiple records
// Declare callback method to async
// To fetch multiple records, use the find() method on the model
// No arguments will return all records
myApp.get('/admin-home', async (req, res) => {
    const data = await Product.find();
    res.render('admin-home', { data });
});


myApp.get('/', (req, res) => {
    res.render('requestform');
});

myApp.get('/edit-thanks', (req, res) => {
  res.render('edit-thanks');
})
  
const custIdRegex = /^[A-Z]\d[A-Z][ -]?\d\d\d$/;

const checkRegex = (value, regex) => {
    return regex.test(value) ? true : false;
};

// Method to check the user input phone number
const custIdChecker = (value) => {
  if (!checkRegex(value, custIdRegex)) {
    throw new Error('Please enter the Customer Id in format - "XNX-NNN"')
  }
  return true
}

myApp.post(
    '/contact-form',
    [
      // all checks will have to return true to pass validation
      check('name', 'Must have a name').not().isEmpty(),
    check('email', 'Must have email').isEmail(),
    check('customerId').custom(custIdChecker),
    ],
    (req, res) => {
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.render('requestform', {
          errors: errors.array(),
        });
      } else 
      { 
        let product1 = 0, product2 = 0, product3 = 0
  
        let name = req.body.name;
        let email = req.body.email;
        let customerId = req.body.customerId;
        
        if(req.body.product1 === undefined && req.body.product2 === undefined && req.body.product3 === undefined) {
          res.render('requestthanks1', {
            custName: "customerName"
          });
        } else {
          // Check if the user has selected any product 
          if (req.body.product1 !== undefined) {
            product1 = req.body.product1
          } else {
              product1 = 0
          }
          if (req.body.product2 !== undefined) {
              product2 = req.body.product2
          } else {
              product2 = 0
          }
          if (req.body.product3 !== undefined) {
              product3 = req.body.product3
          } else {
              product3 = 0
          }

          // Declaring the variable for the amount
          let amountBeforeTax = ((product1 * 6.5) + (product2 * 14.5) + (product3 * 31.99)).toFixed(2)
          // Calculating the tax as per the provinces in Canada
          let taxPercent = 1.13
          let amountAfterTax = (amountBeforeTax * taxPercent).toFixed(2)

          let myRequest = new Product({
            name,
            email,
            customerId,
            product1,
            product2,
            product3,
            amountBeforeTax,
            amountAfterTax
          });

          myRequest.save();

          res.render('requestthanks1', {
            name: name,          
            email: email,   
            customerId: customerId,    
            product1: product1,
            product2: product2,
            product3: product3,
            amountBeforeTax: amountBeforeTax,
            amountAfterTax: amountAfterTax,
            custName: name
          });
        }
        
      }
    }
);

// Fetching data for one request from database
myApp.get('/details/:id', async (req, res) => {
  let userId = req.params.id
  const singleProduct = await Product.findOne({
     _id: userId,
  }).exec();
  res.render('product', { product: singleProduct });
});

// Delete endpoint - using id from url to find the record to delete
myApp.get('/delete/:id', async (req, res) => {
    let id = req.params.id;
    await Product.findByIdAndRemove({ _id: id }).exec();
  
    res.render('delete');
});


myApp.listen(8090);
//tell everything was ok
console.log('Everything executed fine.. website at port 8090....');