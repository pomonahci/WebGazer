(function(window) {
    'use strict';

    window.webgazer = window.webgazer || {};
    webgazer.tracker = webgazer.tracker || {};

    /**
     * Constructor of TFFaceMesh object
     * @constructor
     */
    var TFFaceMesh = function() {
        //Backend options are webgl, wasm, and CPU.
        //For recent laptops WASM is better than WebGL.
        //TODO: This hack makes loading the model block the UI. We should fix that
        // this.model = (async () => { return await facemesh.load({"maxFaces":1}) })();
        this.model = facemesh.load({"maxFaces":1});
        this.predictionReady = false;
    };
 
    webgazer.tracker.TFFaceMesh = TFFaceMesh;

    // Global variable for face landmark positions array
    TFFaceMesh.prototype.positionsArray = null;

    /**
     * Isolates the two patches that correspond to the user's eyes
     * @param  {Canvas} imageCanvas - canvas corresponding to the webcam stream
     * @param  {Boolean} update - whether or not to update the face overlay prediction
     * @return {Object} the two eye-patches, first left, then right eye
     */
    TFFaceMesh.prototype.getEyePatches = async function(imageCanvas, update) {

        // Update facemesh prediction if needed
        if (update) {
            try {
                await this.update(imageCanvas);
            } catch (e) {
                if (e.name == "BadCanvasError") return null;
                else if (e.name == "BadPredictionError") return false;
            }
        }

        // Get value saved to global variable
        const positions = this.positionsArray;

        // Fit the detected eye in a rectangle. [20200626 xk] not clear which approach is better
        // https://raw.githubusercontent.com/tensorflow/tfjs-models/master/facemesh/mesh_map.jpg
        // Won't really cut off any parts of the eye, at the cost of warping the shape (i.e. height/
        // width ratio) of the bounding box.
        var leftOriginX = Math.round(Math.min(positions[247][0], positions[130][0], positions[25][0]));
        var leftOriginY = Math.round(Math.min(positions[247][1], positions[27][1], positions[190][1]));
        var leftWidth = Math.round(Math.max(positions[190][0], positions[243][0], positions[233][0]) - leftOriginX);
        var leftHeight = Math.round(Math.max(positions[25][1], positions[23][1], positions[112][1]) - leftOriginY);
        var rightOriginX = Math.round(Math.min(positions[414][0], positions[463][0], positions[453][0]));
        var rightOriginY = Math.round(Math.min(positions[414][1], positions[257][1], positions[467][1]));
        var rightWidth = Math.round(Math.max(positions[467][0], positions[359][0], positions[255][0]) - rightOriginX);
        var rightHeight = Math.round(Math.max(positions[341][1], positions[253][1], positions[255][1]) - rightOriginY);
        
        // Head pose
        var leftEyeCorner = positions[33];
        var rightEyeCorner = positions[263];
        var noseTip = positions[1];

        if (leftWidth === 0 || rightWidth === 0){
          console.log('an eye patch had zero width');
          return null;
        }

        if (leftHeight === 0 || rightHeight === 0){
          console.log('an eye patch had zero height');
          return null;
        }

        // Start building object to be returned
        var eyeObjs = {};

        var leftImageData = imageCanvas.getContext('2d').getImageData(leftOriginX, leftOriginY, leftWidth, leftHeight);
        eyeObjs.left = {
            patch: leftImageData,
            imagex: leftOriginX,
            imagey: leftOriginY,
            width: leftWidth,
            height: leftHeight,
            corner: leftEyeCorner,
            nose: noseTip
        };

        var rightImageData = imageCanvas.getContext('2d').getImageData(rightOriginX, rightOriginY, rightWidth, rightHeight);
        eyeObjs.right = {
            patch: rightImageData,
            imagex: rightOriginX,
            imagey: rightOriginY,
            width: rightWidth,
            height: rightHeight,
            corner: rightEyeCorner,
            nose: noseTip
        };

        this.predictionReady = true;

        return eyeObjs;
    };

    /**
     * Updates the facemesh prediction
     * @param  {Canvas} imageCanvas - canvas corresponding to the webcam stream
     */
    TFFaceMesh.prototype.update = async function(imageCanvas) {
 
        if (imageCanvas.width === 0) throw {name: "BadCanvasError", message: "imageCanvas.width === 0"};

        // Load the MediaPipe facemesh model.
        const model = await this.model;

        // Pass in a video stream (or an image, canvas, or 3D tensor) to obtain an
        // array of detected faces from the MediaPipe graph.
        const predictions = await model.estimateFaces(imageCanvas);

        if (predictions.length == 0) throw {name: "BadPredictionError", message: "predictions.length == 0"};

        // Save positions to global variable
        this.positionsArray = predictions[0].scaledMesh;
    };


    /**
     * Returns the positions array corresponding to the last call to getEyePatches.
     * Requires that getEyePatches() was called previously, else returns null.
     */
    TFFaceMesh.prototype.getPositions = function () {
        return this.positionsArray;
    }

    /**
     * Reset the tracker to default values
     */
    TFFaceMesh.prototype.reset = function(){
        console.log( "Unimplemented; Tracking.js has no obvious reset function" );
    }

    /**
     * Draw TF_FaceMesh_Overlay
     */
    TFFaceMesh.prototype.drawFaceOverlay= function(ctx, keypoints){
        // If keypoints is falsy, don't do anything
        if (keypoints) {
            ctx.fillStyle = '#32EEDB';
            ctx.strokeStyle = '#32EEDB';
            ctx.lineWidth = 0.5;
          
            for (let i = 0; i < keypoints.length; i++) {
                const x = keypoints[i][0];
                const y = keypoints[i][1];
    
                ctx.beginPath();
                ctx.arc(x, y, 1 /* radius */, 0, 2 * Math.PI);
                ctx.closePath();
                ctx.fill();
            }
        }
    }

    /**
     * The TFFaceMesh object name
     * @type {string}
     */
    TFFaceMesh.prototype.name = 'TFFaceMesh';
    
}(window));
