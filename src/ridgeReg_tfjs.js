'use strict';
(function(window) {

    window.webgazer = window.webgazer || {};
    webgazer.reg = webgazer.reg || {};
    webgazer.mat = webgazer.mat || {};
    webgazer.util = webgazer.util || {};
    webgazer.params = webgazer.params || {};

    var ridgeParameter = Math.pow(10,-3);
    var resizeWidth = 48;
    var resizeHeight = 24;
    var histStep = 5; // default set to 5, shouldn't be more than resizeWidth or resizeHeight
    var dataWindow = 700;
    var trailDataWindow = 10;

    /**
     * Performs ridge regression, according to the Weka code.
     * @param {Array} y - corresponds to screen coordinates (either x or y) for each of n click events
     * @param {Array.<Array.<Number>>} X - corresponds to gray pixel features (120 pixels for both eyes) for each of n clicks
     * @param {Number} k - ridge parameter
     * @return{Array} regression coefficients
     */
    async function ridge(y, X, k){

        console.log(resizeWidth + "," + resizeHeight);

        console.log("recalculating ridge regression...");

        if (!y || !X || y.length == 0 || X.length == 0) { return; }

        var ridge1 = performance.now();

        var tensor_y = tf.tensor2d(y, [y.length, (y[0] ? y[0].length : 0)], 'float32');
        var tensor_X = tf.tensor2d(X, [X.length, (X[0] ? X[0].length : 0)], 'float32');

        var nc = X[0].length;
        var m_Coefficients = new Array(nc);

        var tensor_xt = tensor_X.transpose();
        
        var solution = new Array();
        var success = true;
        do{

            var tensor_ss = tf.matMul(tensor_xt,tensor_X);

            // Set ridge regression adjustment by creating matrix with k in the diagonal and adding it to ss
            var tensor_k = tf.eye(nc).mul(k);

            var tensor_ss_k = tensor_ss.add(tensor_k);
            
            // Carry out the regression
            var tensor_bb = tf.matMul(tensor_xt, tensor_y);

            var tbb = tensor_bb.array(); // TODO: make this async
            var tss = tensor_ss_k.array(); // TODO: same here

            for(var i = 0; i < nc; i++) {
                m_Coefficients[i] = 0;
            }
            var ridge2 = performance.now();

            try{
                var n = (m_Coefficients.length !== 0 ? m_Coefficients.length/m_Coefficients.length: 0);
                if (m_Coefficients.length*n !== m_Coefficients.length){
                    console.log('Array length must be a multiple of m')
                }
                // solution = (tss.length === tss[0].length ? (math.lusolve(math.lup(tss), tbb)._data.flat()) : (webgazer.mat.QRDecomposition(tss,tbb)));
                // solution = (ss.length === ss[0].length ? (math.lusolve(math.lup(ss), bb)._data.flat()) : (webgazer.mat.QRDecomposition(ss,bb)));
                var ss = await tss;
                var ridge3 = performance.now();
                console.log("solving...")
                solution = (ss.length === ss[0].length ? (numeric.LUsolve(numeric.LU(ss,true), await tbb)) : (webgazer.mat.QRDecomposition(ss, await bb)));
                // solution = (ss.length === ss[0].length ? (numeric.LUsolve(numeric.LU(ss,true),bb)) : (webgazer.mat.QRDecomposition(ss,bb)));
                // console.log(solution);
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
        var ridge4 = performance.now();
        console.log("done");
        console.log("matrix mult: " + (ridge2 - ridge1) + "ms, awaiting: " + (ridge3 - ridge2) + "ms, solving: " + (ridge4 - ridge3));
        return m_Coefficients;
        // }
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
        var histRight = [];

        webgazer.util.equalizeHistogram(leftGray, histStep, histLeft);
        webgazer.util.equalizeHistogram(rightGray, histStep, histRight);

        var leftGrayArray = Array.prototype.slice.call(histLeft);
        var rightGrayArray = Array.prototype.slice.call(histRight);
        // var leftGrayArray = Array.prototype.slice.call(leftGray);
        // var rightGrayArray = Array.prototype.slice.call(rightGray);

        return leftGrayArray.concat(rightGrayArray);
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

        // Max Test
        this.coefficientsX = []
        this.coefficientsY = []
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

        this.regress();
    };

    // TODO: Document this
    webgazer.reg.RidgeReg.prototype.regress = async function(){
        var screenXArray = this.screenXClicksArray.data;
        var screenYArray = this.screenYClicksArray.data;
        var eyeFeatures = this.eyeFeaturesClicks.data;

        // let ridge1 = performance.now();
        this.coefficientsX = await ridge(screenXArray, eyeFeatures, ridgeParameter);
        this.coefficientsY = await ridge(screenYArray, eyeFeatures, ridgeParameter);
        // let ridge2 = performance.now();
        // console.log("Regression took " + (ridge2 - ridge1) + " time");
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

            this.eyeFeaturesClicks.push(getEyeFeats(eyes));
            this.dataClicks.push({'eyes':eyes, 'screenPos':screenPos, 'type':type});
        } else if (type === 'move') {
            this.screenXTrailArray.push([screenPos[0]]);
            this.screenYTrailArray.push([screenPos[1]]);

            this.eyeFeaturesTrail.push(getEyeFeats(eyes));
            this.trailTimes.push(performance.now());
            this.dataTrail.push({'eyes':eyes, 'screenPos':screenPos, 'type':type});
        }

        if (!this.hasRegressed){
            this.regress();
            this.hasRegressed = true;
        }
        // this.regress();



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
        // var acceptTime = performance.now() - this.trailTime;
        // var trailX = [];
        // var trailY = [];
        // var trailFeat = [];
        // for (var i = 0; i < this.trailDataWindow; i++) {
        //     if (this.trailTimes.get(i) > acceptTime) {
        //         trailX.push(this.screenXTrailArray.get(i));
        //         trailY.push(this.screenYTrailArray.get(i));
        //         trailFeat.push(this.eyeFeaturesTrail.get(i));
        //     }
        // }

        if (!this.hasRegressed){
            this.regress();
            this.hasRegressed = true;
        }
        var eyeFeats = getEyeFeats(eyesObj);
        var predictedX = 0;
        for(var i=0; i< eyeFeats.length; i++){
            predictedX += eyeFeats[i] * this.coefficientsX[i];
        }
        var predictedY = 0;
        for(var i=0; i< eyeFeats.length; i++){
            predictedY += eyeFeats[i] * this.coefficientsY[i];
        }

        predictedX = Math.floor(predictedX);
        predictedY = Math.floor(predictedY);

        if (window.applyKalmanFilter) {
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
