// Load environment variables from .env file
require('dotenv').config();

// Import required libraries
const axios = require('axios'); // Library for making HTTP requests
const mongoose = require('mongoose'); // MongoDB library for Node.js
const express = require('express'); // Node.js web framework for building APIs

const app = express(); // Initialize the Express web framework

app.set('view engine', 'ejs');
app.engine('ejs', require('ejs').__express);
app.set('views', __dirname + '/views'); 

const bodyParser = require('body-parser');

// Serve our public folder as a static folder so we can use the css and html pages
app.use(express.static('public'));

// Parse data from HTML forms
app.use(bodyParser.urlencoded({ extended: true }));

// Retrieve the Google Geocoding API key from .env file
const key = process.env.API_KEY;

// Retrieve the MongoDB URI from .env file
const uri = process.env.DATABASE_URI;


const connectDB = async () => {
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true, 
      useUnifiedTopology: true,
    })
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error(error);
  }
}
  
// Connect to the MongoDB 
connectDB();


//create schema for address
const addressSchema = new mongoose.Schema({
  //no duplicate address
  address: {type:String, unique: true},
  location: {
    lat: Number,
    lng: Number
  }
});
const Address = mongoose.model('Address', addressSchema, 'gps');


// HTML form submission page 
app.get('/', (req, res) => {
  res.status(200).sendFile(__dirname + '/public/index.html');
});
//show all page
app.get('/all', async (req, res) => {
  //list all addresses in a form
  await Address.find()
    .then(addresses => {
    res.render('list', {addresses});
  })
});
// Retrieve data from form submission page
app.post('/gps', (req, res) => {
// Get the form data from the request body
const streetNumber = req.body.streetNumber.trim();
const streetName = req.body.streetName.trim();
const city = req.body.city.trim();
const stateProvince = req.body.stateProvince.trim();
const country = req.body.country.trim();
const address = `${streetNumber} ${streetName} ${city} ${stateProvince} ${country}`;

// Google Geocoding API request URL
const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`;

// API request using get, listens for get requests
axios.get(url)
  .then(response => {
    // Get the GPS coordinates from the response
    const location = response.data.results[0].geometry.location;
    console.log(`Retrieved GPS coordinates for ${address}`);
    console.log(location);

    // newAddress instance with address and location fields
    const newAddress = new Address({
      address,
      location
    })
    newAddress.save()
    .then(() => {
      console.log(`Address saved to MongoDB`);
      console.log(`GPS saved to MongoDB`);
      res.status(200).render('gps', {location});
    }).catch((err)=>{
      //catch duplicate address error and redirect to error page
       res.render('error',{err});
    });
    }).catch((err)=>{
      //catch server request error and redirect to error page
      res.render('error',{err});
    });
});

app.post('/coord', (req, res) => {
// Get the form data from the request body
const lat = req.body.latitude.trim();
const lng = req.body.longitude.trim();
const coord = `${lat}, ${lng}`;
console.log(lat+" "+lng);
// Google Geocoding API request URL
const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(coord)}&key=${key}`;

// API request using get, listens for get requests
axios.get(url)
  .then(response => {
    // Get the address from the response
    const address= response.data.results[0].formatted_address;

    console.log(`Retrieved address for ${coord}`);
    console.log(address);

    // newAddress instance with address and location fields
    const newAddress = new Address({
      address,
      location:{lat,lng}
    });

    // Save the address and GPS coordinates to MongoDB
    newAddress.save()
    .then(() => {
      console.log(`Address saved to MongoDB`);
      console.log(`GPS saved to MongoDB`);
      res.status(200).render('address', {address});
    }).catch((err)=>{
      //catch duplicate address error and redirect to error page
        res.render('error',{err});
    });
    }).catch((err)=>{
      //catch server request error and redirect to error page
      res.render('error',{err});
    });

});
//delete request based on id
app.get('/all/:_id',(req,res)=>{
  console.log(req.params._id);
  //redirect to show all page after deletion
  Address.findByIdAndRemove(req.params._id)
  .then(()=> res.redirect("/all"));
 
});

//listen to database update
const port = process.env.PORT || 8000;
  app.listen(port, () => {
    console.log(`Server started on port: ${port}`);

});

  


  