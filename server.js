const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const mongoose = require('mongoose');

const router = require('./routes/routes');
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

const mongo_uri = process.env.MONGODB_URI || 'mongodb://localhost/react-auth';
mongoose.connect(mongo_uri, { useNewUrlParser: true }, function(err) {
  if (err) {
    throw err;
  } else {
    console.log('Connected to DB');
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.use('/',router);


app.listen(process.env.PORT || 5000);
