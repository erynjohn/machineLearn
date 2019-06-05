
const express = require('express');

const path = require('path');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const withAuth = require('../middleware');
const fs = require('fs');
const cv = require('opencv4nodejs');
var NodeWebcam = require("node-webcam");
const router = express.Router();
const secret = process.env.SECRET;


router.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// router.get('/api/home', (req, res) => {
// });

router.get('/api/home', (req, res) => {

  const basePath = './data/face-recognition';
  const imgsPath = path.resolve(basePath, 'imgs');
  const userImg = path.resolve(basePath, 'userImg');
  // const nameMappings = ["eryn", "mary", "rick"];
  const nameMappings = fs.readFileSync('names.js', 'utf8').replace(/(\r\n|\n|\r)/gm, "").split(',');

  // setup camera for capture
  let captureUser = (() => {
    var opts = {
      delay: 0,
      saveShot: true,
      device: false
    }
    var Webcam = NodeWebcam.create(opts)
    Webcam.capture(`${userImg}/eryn6.jpg`, function (err, data) {
      if (err) throw err
    })

  })
  //get user image and run prediction
  let run = async () => { 
    await captureUser();
    await checkPrediction();
  }
  run();

  let checkPrediction = (() => {

    setTimeout(() => {
      let checkImages = (() => {
        const imgFiles = fs.readdirSync(imgsPath);
        const user = fs.readdirSync(userImg);
        const classifier = new cv.CascadeClassifier(cv.HAAR_FRONTALFACE_ALT2);
        return {
          imgFiles,
          user,
          classifier
        }
      })
      let checkFile = checkImages();
  
      const getFaceImage = (grayImg) => {
        const faceRects = checkFile.classifier.detectMultiScale(grayImg).objects;
        if (!faceRects.length) {
          console.log("No face detected")
          run();
        } else {
          return grayImg.getRegion(faceRects[0]);
        }
      };
      // webcam image process
      const userImages = checkFile.user
        .map(files => path.resolve(userImg, files))
        .map(filePath => cv.imread(filePath))
        .map(img => img.bgrToGray())
        // detect and extract face
        .map(getFaceImage)
        .map(faceImg => {
          if(faceImg.empty == true) {
            run();
          } else {
            return faceImg.resize(80, 80)
          }
        });
  
      const images = checkFile.imgFiles
        .map(file => path.resolve(imgsPath, file))
        .map(filePath => cv.imread(filePath))
        .map(img => img.bgrToGray())
  
        // detect and extract face
        .map(getFaceImage)
        .map(faceImg => {
          if(faceImg.empty == true) {
            run();
          } else {
  
            return faceImg.resize(80, 80)
          }
        });
  
          
      const isImageFour = (_, i) => checkFile.imgFiles[i].includes('4');
      const isNotImageFour = (_, i) => !isImageFour(_, i);
      // use images 1 - 3 for training
      const trainImages = images.filter(isNotImageFour);
      const testImages = userImages;
      // make labels
      const labels = checkFile.imgFiles
        .filter(isNotImageFour)
        .map(file => nameMappings.findIndex(name => file.includes(name)));
      const runPrediction = (recognizer) => {
        testImages.forEach((img) => {
          const result = recognizer.predict(img);
          console.log('predicted: %s, confidence: %s', nameMappings[result.label], result.confidence);
          cv.imshowWait('face', img);
          cv.destroyAllWindows();
          if (result.confidence > 106) {
            console.log("welcome " + nameMappings[result.label].toUpperCase())
            //Todo replace with dynamic data
            const email = 'me@example.com';
            const password = 'mypassword';

            User.findOne({ email }, function (err, user) {
              if (err) {
                console.error(err);
                res.status(500)
                  .json({
                    error: 'Internal error please try again'
                  });
              } else if (!user) {
                res.status(401)
                  .json({
                    error: 'Incorrect email or password'
                  });
              } else {
                user.isCorrectPassword(password, function (err, same) {
                  if (err) {
                    res.status(500)
                      .json({
                        error: 'Internal error please try again'
                      });
                  } else if (!same) {
                    res.status(401)
                      .json({
                        error: 'Incorrect email or password'
                      });
                  } else {
                    // Issue token
                    const payload = { email };
                    const token = jwt.sign(payload, secret, {
                      expiresIn: '1h'
                    });
                    res.cookie('token', token, { httpOnly: true }).sendStatus(200);
                  }
                });
              }
            });

          } else {
            res.send('Move Closer, almost have it!');
            console.log('Move closer, almost have it!');
            run();
          }
        });
      };
  
      const lbph = new cv.LBPHFaceRecognizer();
      lbph.train(trainImages, labels);
  
      console.log('lbph:');
      runPrediction(lbph);
  
    }, 3000)
  })

  res.status(204)
});

router.post('/api/register', (req, res) => {
  const { email, password } = req.body;
  const user = new User({ email, password });
  user.save(function (err) {
    if (err) {
      console.log(err);
      res.status(500).send("Error registering new user please try again.");
    } else {
      res.status(200).send("Welcome to the club!");
    }
  });
});
router.post('/api/logout', (req, res) => {
  res.clearCookie('token')
    .sendStatus(200);
})


router.post('/api/authenticate', (req, res) => {
  const { email, password } = req.body;
    User.findOne({ email }, function (err, user) {
      if (err) {
        console.error(err);
        res.status(500)
          .json({
            error: 'Internal error please try again'
          });
      } else if (!user) {
        res.status(401)
          .json({
            error: 'Incorrect email or password'
          });
      } else {
        user.isCorrectPassword(password, function (err, same) {
          if (err) {
            res.status(500)
              .json({
                error: 'Internal error please try again'
              });
          } else if (!same) {
            res.status(401)
              .json({
                error: 'Incorrect email or password'
              });
          } else {
            // Issue token
            const payload = { email };
            const token = jwt.sign(payload, secret, {
              expiresIn: '1h'
            });
            res.cookie('token', token, { httpOnly: true }).sendStatus(200);
          }
        });
      }
    });
});

router.get('/checkToken', withAuth, (req, res) => {
  res.sendStatus(200);
});

module.exports = router;