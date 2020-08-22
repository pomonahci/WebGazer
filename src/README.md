General
-
- WebGazer is a JavaScript based library for webcam gaze prediction
- It relies on MediaPipe Facemesh to detect and track the face and grab pixel data from the eyes, which uses Tensorflow.js
- Facemesh is also used as a way to determine the position of the user's head
- Pixel data and head position data are concatenated into an array that is used to train a ridge regression model
- The ridge regression model is then able to make predictions based on the eye pixel and head position data in real time

Structural (misc.)
-
- Every time changes are made to files in src/, __you must call "grunt" in the WebGazer repo directory__ to have those changes be reflected in www/webgazer.js and therefore in the server copy of WebGazer
    - .js files in src/ are concatenated together (with some other .js files) with grunt to create the full webgazer.js file that can be found in www/
- regression models are contained within var regs[] in webgazer.js

Frame Updates/loop()
-
- the async function loop() in webgazer.js, every frame, does the following:
    - paint the latest frame of videoElement (i.e. camera feed) to videoElementCanvas, which is the canvas that is passed to facemesh to grab eye data from
    - updates facemesh prediction and redraws it
    - checks if eyes are in validation box
    - gets new prediction from regression model
    - updates gaze dot

Predictions
-
- in webgazer.js we first initialize the videoElement variable, which is an HTMLVideoElement object, and set the source to the user's camera feed.
- the contents of this videoElement are painted onto the videoElementCanvas with paintCurrentFrame() in webgazer.js, called by loop()
- the videoElementCanvas is then passed to the face detection library by calling getPrediction() in loop(), which calls getPupilFeatures(), which in turn calls TFFaceMesh.prototype.getEyePatches() in src/facemesh.js
- getEyePatches() updates the prediction made by the facemesh model, and then grabs pixel data (original dimensions/resolution/colors) as ImageData objects contained within the landmarks that correspond to the left and right eye regions, grabs the head pose as calculated with facemesh coordinates, among other things, and then wraps them into an object that is returned back to getPrediction() in webgazer.js, and is assigned to global variable latestEyeFeatures
- in getPrediction() again, RidgeReg.prototype.predict(latestEyeFeatures) is called
- RidgeReg.prototype.predict() passes the eye objects into getEyeFeats() in ridgeReg.js, which resizes (to 40x20px), grayscales, and histograms the color values the image data. Then, using simple ridge regression, we calculate the predicted X and Y gaze positions (separately) with the current ridge coefficients.
- If the Kalman filter is activated, we update the Kalman filter with the new gaze prediction and get the output from the Kalman filter.
- RidgeReg.prototype.predict() returns the (filtered) x,y predictions back to getPrediction() in webgazer.js
- getPrediction() then returns that prediction to loop(), where it is assigned to global var latestGazeData
- then we update the gaze dot to reflect the moving average across the last 4 predictions, including the most recent.

Data Collection/Regression/Training
-
- we can collect a data point by calling recordScreenPosition(x, y, eventType) in webgazer.js, where x and y are the actual gaze locations and eventType should be the string "click"
    - latestEyeFeatures is the most recent pixel data of the user's eye regions
    - every iteration of loop(), latestEyeFeatures is updated and assigned to the return value of await getPupilFeatures(...), which is called in getPrediction()
- recordScreenPosition() calls RidgeReg.prototype.addData(latestEyeFeatures, [x, y], 'click') from ridgeReg.js, which stores the user's eye data
- once data points have been collected, call RidgeReg.prototype.train() to update the model accordingly
- RidgeReg.prototype.train() calls the ridge() function in ridgeReg.js for both X and Y predictions.
- predictions are made by the ridge regression model every iteration of loop() in webgazer.js
- data is stored between sessions using [localForage](https://localforage.github.io/localForage/)

Ridge Regression
-
- coming soon