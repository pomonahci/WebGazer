'use strict';
(function(window) {

    window.webgazer = window.webgazer || {};
    webgazer.reg = webgazer.reg || {};
    webgazer.mat = webgazer.mat || {};
    webgazer.util = webgazer.util || {};
    webgazer.params = webgazer.params || {};

    var ridgeParameter = Math.pow(10, -5);
    var resizeWidth = 40;
    var resizeHeight = 20;
    var dataWindow = 700;
    var trailDataWindow = 10;

    /**
     * Performs ridge regression, according to the Weka code.
     * @param {Array} y - corresponds to screen coordinates (either x or y) for each of n click events
     * @param {Array.<Array.<Number>>} X - corresponds to gray pixel features (120 pixels for both eyes) for each of n clicks
     * @param {Array} k - ridge parameter
     * @return{Array} regression coefficients
     */
    function ridge(y, X, k){
        var nc = X[0].length;
        var m_Coefficients = new Array(nc);
        var xt = webgazer.mat.transpose(X);
        var solution = new Array();
        var success = true;
        do{
            var ss = webgazer.mat.mult(xt,X);
            // Set ridge regression adjustment
            for (var i = 0; i < nc; i++) {
                ss[i][i] = ss[i][i] + k;
            }

            // Carry out the regression
            var bb = webgazer.mat.mult(xt,y);
            for(var i = 0; i < nc; i++) {
                m_Coefficients[i] = bb[i][0];
            }
            try{
                var n = (m_Coefficients.length !== 0 ? m_Coefficients.length/m_Coefficients.length: 0);
                if (m_Coefficients.length*n !== m_Coefficients.length){
                    console.log('Array length must be a multiple of m')
                }
                solution = (ss.length === ss[0].length ? (numeric.LUsolve(numeric.LU(ss,true),bb)) : (webgazer.mat.QRDecomposition(ss,bb)));

                for (var i = 0; i < nc; i++){
                    m_Coefficients[i] = solution[i];
                }
                success = true;
            }
            catch (ex){
                k *= 10;
                console.log(ex);
                success = false;
            }
        } while (!success);
        return m_Coefficients;
    }
    
    /**
     * Compute eyes size as gray histogram
     * @param {Object} eyes - The eyes where looking for gray histogram
     * @returns {Array.<T>} The eyes gray level histogram
     */
    function getEyeFeats(eyes) {
        var resizedLeft = webgazer.util.resizeEye(eyes.left, resizeWidth, resizeHeight);
        var resizedright = webgazer.util.resizeEye(eyes.right, resizeWidth, resizeHeight);

        var leftGray = webgazer.util.grayscale(resizedLeft.data, resizedLeft.width, resizedLeft.height);
        var rightGray = webgazer.util.grayscale(resizedright.data, resizedright.width, resizedright.height);

        var histLeft = [];
        webgazer.util.equalizeHistogram(leftGray, 5, histLeft);
        var histRight = [];
        webgazer.util.equalizeHistogram(rightGray, 5, histRight);

        var leftGrayArray = Array.prototype.slice.call(histLeft);
        var rightGrayArray = Array.prototype.slice.call(histRight);

        var allFeats = leftGrayArray.concat(rightGrayArray);

        for (var i = 0; i < allFeats.length; i++){
            allFeats[i] = (allFeats[i])
        }

        // Add headpose stats
        var rightCorner = eyes.right.corner;
        var leftCorner = eyes.left.corner;

        // Creates a user specific distance
        var distance = Math.sqrt((rightCorner[0] - leftCorner[0]) ** 2 + (rightCorner[1] - leftCorner[1]) ** 2 + (rightCorner[2] - leftCorner[2]) ** 2);
        //allFeats.push(distance ** 2);

        

        // Finds an estimate for head location and standardize it
        // TODO: Make this automatically adjust for different window sizes
        var locationX = Math.floor((rightCorner[0] + leftCorner[0]) / 2)
        var locationY = Math.floor((rightCorner[1] + leftCorner[1]) / 2)
        allFeats.push(locationX)
        allFeats.push(locationY)

        // Finding normal vector to the plane created by eye corners and nose
        var nose = eyes.left.nose;
        var nl = [leftCorner[0] - nose[0], leftCorner[1] - nose[1], leftCorner[2] - nose[2]];
        var nr = [rightCorner[0] - nose[0], rightCorner[1] - nose[1], rightCorner[2] - nose[2]];
        var headPose = [(nl[1]*nr[2] - nl[2]*nr[1]), - (nl[0]*nr[2] - nl[2]*nr[0]) , (nl[0]*nr[1] - nl[1]*nr[0])];

        // Make it a unit vector
        var magnitude = Math.sqrt(headPose[0] **2 + headPose[1] **2 + headPose[2] **2);
        headPose = [headPose[0] / magnitude, headPose[1] / magnitude, headPose[2] / magnitude];

        // Find the angle it creates and normalize it by dividing by pi/2
        // aTan can return NaN with negative numbers so convert afterwards
        if (headPose[0] > 0){
            var xAngle = (Math.atan(headPose[0]/headPose[2]));
        } else {
            var xAngle = -1 * (Math.atan((headPose[0]*-1)/headPose[2]));
        }
        var yAngle = (Math.atan(headPose[1]/headPose[2]));
        headPose = [xAngle, yAngle]
        allFeats.concat(headPose);

        var distance2 = Math.sqrt((rightCorner[0] - leftCorner[0]) ** 2 + (rightCorner[1] - leftCorner[1]) ** 2);
        distance2 = distance2 / Math.cos(xAngle);
        console.log(distance2)
        // allFeats.push(distance2)

        // Find the head tilt angle
        var tilt = Math.atan((rightCorner[1] - leftCorner[1]) / (rightCorner[0] - leftCorner[0]))
        // console.log(tilt)
        allFeats.push(tilt)
  
        return allFeats;

    }


    /**
     * Creates a Z-score standardization method for better regression
     * @param {Array. <Array.<Number>>} X - data to be standardized
     * @return {Array. <Array.<Number>>} - the standardized data TODO: Fix this
     */
    function standardizeInput(X){

        // Deep copy
        var copyX = Array.from(X);
        var xt = webgazer.mat.transpose(X);
        var meanList = [];
        var sdList = [];

        // Loop through the input variables to standardize
        for (var i = 0; i < xt.length; i++){
            var meansd = getMeanSD(xt[i]);
            mean = meansd[0];
            sd = meansd[1];
            for (var j = 0; j < xt[i].length; j++){
                copyX[j][i] = (xt[i][j] - mean) / sd;
            }
            meanList.push(mean);
            sdList.push(sd);
        }
        return [copyX, meanList, sdList];
    }

    /**
     * Find the mean and standard deviation of an array
     * @param {Array.<Number>} A - Array to find mean and sd
     * @return {Object} - mean and standard deviation
     */
    function getMeanSD(A){

        // Calculate mean
        var sum = 0
        var numValues = A.length;
        for (var i = 0; i < numValues; i++){
            sum += A[i]
        }
        var mean = sum / numValues

        // Calculate Standard Deviation
        sum = 0;
        for (var i = 0; i < numValues; i++){
            sum += (A[i] - mean) ** 2;
        }
        sd = Math.sqrt(sum / numValues);

        return [mean, sd];
    }


    //TODO: still usefull ???
    /**
     *
     * @returns {Number}
     */
    function getCurrentFixationIndex() {
        var index = 0;
        var recentX = this.screenXTrailArray.get(0);
        var recentY = this.screenYTrailArray.get(0);
        for (var i = this.screenXTrailArray.length - 1; i >= 0; i--) {
            var currX = this.screenXTrailArray.get(i);
            var currY = this.screenYTrailArray.get(i);
            var euclideanDistance = Math.sqrt(Math.pow((currX-recentX),2)+Math.pow((currY-recentY),2));
            if (euclideanDistance > 72){
                return i+1;
            }
        }
        return i;
    }

    /**
     * Constructor of RidgeReg object,
     * this object allow to perform ridge regression
     * @constructor
     */
    webgazer.reg.RidgeReg = function() {
        this.init();
    };

    /**
     * Initialize new arrays and initialize Kalman filter.
     */
    webgazer.reg.RidgeReg.prototype.init = function() {
        this.screenXClicksArray = new webgazer.util.DataWindow(dataWindow);
        this.screenYClicksArray = new webgazer.util.DataWindow(dataWindow);
        this.eyeFeaturesClicks = new webgazer.util.DataWindow(dataWindow);

        //sets to one second worth of cursor trail
        this.trailTime = 1000;
        this.trailDataWindow = this.trailTime / webgazer.params.moveTickSize;
        this.screenXTrailArray = new webgazer.util.DataWindow(trailDataWindow);
        this.screenYTrailArray = new webgazer.util.DataWindow(trailDataWindow);
        this.eyeFeaturesTrail = new webgazer.util.DataWindow(trailDataWindow);
        this.trailTimes = new webgazer.util.DataWindow(trailDataWindow);

        this.dataClicks = new webgazer.util.DataWindow(dataWindow);
        this.dataTrail = new webgazer.util.DataWindow(trailDataWindow);

        // Regression coefficients
        let numPixels = resizeWidth * resizeHeight * 2
        this.coefficientsX = new Array(numPixels).fill(0);
        this.coefficientsY = new Array(numPixels).fill(0);
        this.meanList = new Array(numPixels).fill(0);
        this.sdList = new Array(numPixels).fill(0);
        this.XMean = 0;
        this.XSd = 1;
        this.YMean = 0;
        this.YSd = 1;
        this.hasRegressed = false

        // Initialize Kalman filter [20200608 xk] what do we do about parameters?
        // [20200611 xk] unsure what to do w.r.t. dimensionality of these matrices. So far at least 
        //               by my own anecdotal observation a 4x1 x vector seems to work alright
        var F = [ [1, 0, 1, 0],
                  [0, 1, 0, 1],
                  [0, 0, 1, 0],
                  [0, 0, 0, 1]];
        
        //Parameters Q and R may require some fine tuning
        var Q = [ [1/4, 0,    1/2, 0],
                  [0,   1/4,  0,   1/2],
                  [1/2, 0,    1,   0],
                  [0,  1/2,  0,   1]];// * delta_t
        var delta_t = 1/10; // The amount of time between frames
        Q = numeric.mul(Q, delta_t);
        
        var H = [ [1, 0, 0, 0, 0, 0],
                  [0, 1, 0, 0, 0, 0],
                  [0, 0, 1, 0, 0, 0],
                  [0, 0, 0, 1, 0, 0]];
        var H = [ [1, 0, 0, 0],
                  [0, 1, 0, 0]];
        var pixel_error = 47; //We will need to fine tune this value [20200611 xk] I just put a random value here 
        
        //This matrix represents the expected measurement error
        var R = numeric.mul(numeric.identity(2), pixel_error);

        var P_initial = numeric.mul(numeric.identity(4), 0.0001); //Initial covariance matrix
        var x_initial = [[500], [500], [0], [0]]; // Initial measurement matrix

        this.kalman = new self.webgazer.util.KalmanFilter(F, H, Q, R, P_initial, x_initial);

    };


    /**
     * Updates the regression coefficients for predictions
     */
    webgazer.reg.RidgeReg.prototype.regress = function(){

        var screenXArray = this.screenXClicksArray.data;
        var screenYArray = this.screenYClicksArray.data;
        var eyeFeatures = this.eyeFeaturesClicks.data;

        // Standardize the inputs
        var standerdizedIn = standardizeInput(eyeFeatures);
        eyeFeatures = standerdizedIn[0];
        this.meanList = standerdizedIn[1];
        this.sdList = standerdizedIn[2];

        // Standardize X and Y outputs
        var standardizedX = standardizeInput(screenXArray);
        var standardizedY = standardizeInput(screenYArray);
        screenXArray = standardizedX[0];
        screenYArray = standardizedY[0];
        this.XMean = standardizedX[1][0];
        this.YMean = standardizedY[1][0];
        this.XSd = standardizedX[2][0];
        this.YSd = standardizedY[2][0];

        // Regress
        this.coefficientsX = ridge(screenXArray, eyeFeatures, ridgeParameter);
        this.coefficientsY = ridge(screenYArray, eyeFeatures, ridgeParameter);
    } 


    /**
     * Add given data from eyes
     * @param {Object} eyes - eyes where extract data to add
     * @param {Object} screenPos - The current screen point
     * @param {Object} type - The type of performed action
     */
    webgazer.reg.RidgeReg.prototype.addData = function(eyes, screenPos, type) {
        if (!eyes) {
            return;
        }
        if (eyes.left.blink || eyes.right.blink) {
            return;
        }
        if (type === 'click') {
            this.screenXClicksArray.push([screenPos[0]]);
            this.screenYClicksArray.push([screenPos[1]]);

            // This now includes the headpose inputs
            this.eyeFeaturesClicks.push(getEyeFeats(eyes));

            this.dataClicks.push({'eyes':eyes, 'screenPos':screenPos, 'type':type});
        } else if (type === 'move') {
            this.screenXTrailArray.push([screenPos[0]]);
            this.screenYTrailArray.push([screenPos[1]]);

            this.eyeFeaturesTrail.push(getEyeFeats(eyes));
            this.trailTimes.push(performance.now());
            this.dataTrail.push({'eyes':eyes, 'screenPos':screenPos, 'type':type});
        }

        // Initialize coefficient list
        if (!this.hasRegressed){
            let numPixels = resizeWidth * resizeHeight * 2
            this.coefficientsX = new Array(numPixels).fill(0);
            this.coefficientsY = new Array(numPixels).fill(0);
            this.hasRegressed = true;
            this.meanList = new Array(numPixels).fill(0);
            this.sdList = new Array(numPixels).fill(0);
        }


        // [20180730 JT] Why do we do this? It doesn't return anything...
        // But as JS is pass by reference, it still affects it.
        //
        // Causes problems for when we want to call 'addData' twice in a row on the same object, but perhaps with different screenPos or types (think multiple interactions within one video frame)
        //eyes.left.patch = Array.from(eyes.left.patch.data);
        //eyes.right.patch = Array.from(eyes.right.patch.data);
    }

    /**
     * Try to predict coordinates from pupil data
     * after apply linear regression on data set
     * @param {Object} eyesObj - The current user eyes object
     * @returns {Object}
     */
    webgazer.reg.RidgeReg.prototype.predict = function(eyesObj) {
        if (!eyesObj || this.eyeFeaturesClicks.length === 0) {
            return null;
        }

        // Initialize coefficient list
        if (!this.hasRegressed){
            let numPixels = resizeWidth * resizeHeight * 2
            this.coefficientsX = new Array(numPixels).fill(0);
            this.coefficientsY = new Array(numPixels).fill(0);
            this.hasRegressed = true;
            this.meanList = new Array(numPixels).fill(0);
            this.sdList = new Array(numPixels).fill(0);
        }

        var eyeFeats = getEyeFeats(eyesObj);
        var predictedX = 0;
        for(var i=0; i< eyeFeats.length; i++){
            predictedX += ((eyeFeats[i] - this.meanList[i]) / this.sdList[i]) * this.coefficientsX[i];
        }
        var predictedY = 0;
        for(var i=0; i< eyeFeats.length; i++){
            predictedY += ((eyeFeats[i] - this.meanList[i]) / this.sdList[i]) * this.coefficientsY[i];
        }

        predictedX = (predictedX * this.XSd) + this.XMean;
        predictedY = (predictedY * this.YSd) + this.YMean;
        
        predictedX = Math.floor(predictedX);
        predictedY = Math.floor(predictedY);

        // Check if preidctedX and predictedY are real values, otherwise the kalman filter becomes incorrect
        if (window.applyKalmanFilter && predictedX && predictedY) {
            // Update Kalman model, and get prediction
            var newGaze = [predictedX, predictedY]; // [20200607 xk] Should we use a 1x4 vector?
            newGaze = this.kalman.update(newGaze);
    
            return {
                x: newGaze[0],
                y: newGaze[1]
            };
        } else {
            return {
                x: predictedX,
                y: predictedY
            };
        }
    };


    /**
     * Add given data to current data set then,
     * replace current data member with given data
     * @param {Array.<Object>} data - The data to set
     */
    webgazer.reg.RidgeReg.prototype.setData = function(data) {
        for (var i = 0; i < data.length; i++) {
            // Clone data array
            var leftData = new Uint8ClampedArray(data[i].eyes.left.patch.data);
            var rightData = new Uint8ClampedArray(data[i].eyes.right.patch.data);
            // Duplicate ImageData object
            data[i].eyes.left.patch = new ImageData(leftData, data[i].eyes.left.width, data[i].eyes.left.height);
            data[i].eyes.right.patch = new ImageData(rightData, data[i].eyes.right.width, data[i].eyes.right.height);

            // Add those data objects to model
            this.addData(data[i].eyes, data[i].screenPos, data[i].type);
        }
    };

    /**
     * Return the data
     * @returns {Array.<Object>|*}
     */
    webgazer.reg.RidgeReg.prototype.getData = function() {
        return this.dataClicks.data;
    }
    
    /**
     * The RidgeReg object name
     * @type {string}
     */
    webgazer.reg.RidgeReg.prototype.name = 'ridge';
    
}(window));
