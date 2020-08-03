
var elapsedTime = Date.now();

var showGazeDot = true;

$(document).keydown(function(e){
    if (e.keyCode == 32) { // ' '
        $("#spacebar").show();
        // var save_url = "http://localhost:8000/" + elapsedTime + "ms/SPACEBAR_PRESSED";
        // var temp_image = new Image();
        // temp_image.src = save_url;
       return false;
    }
    if (e.keyCode == 191) {  // '/'
        showGazeDot ? $("#webgazerGazeDot").hide() : $("#webgazerGazeDot").show();
        showGazeDot = !showGazeDot;
    }
    if (e.keyCode == 82) { // 'r'
        elapsedTime = 0;
    }
    if (e.keyCode == 84) { // 't'
        var ts = new Targets(calibrationPoints, 'calibration', 5);
        ts.start();
    }
    if (e.keyCode == 67) { // 'c'
        webgazer.clearData();
    }
});

$(document).keyup(function(e){
    if (e.keyCode == 32) {
        $("#spacebar").hide();
    }
});

window.onload = function() {

    $("#spacebar").hide();

    // var fpsArray = new webgazer.util.DataWindow(10);

    //start the webgazer tracker
    webgazer.setRegression('ridge') /* currently must set regression and tracker */
        .setTracker('TFFacemesh')
        .setGazeListener((data, clock) => {
        //   var save_url = "http://localhost:8000/" + elapsedTime + "ms/" + (data ? data.x : null) + "," + (data ? data.y : null);
        //   var temp_image = new Image();
        //   temp_image.src = save_url;
        //   document.getElementById("prediction").innerHTML = (data ? data.x : null) + "," + (data ? data.y : null);
        })
        .begin()
        .showPredictionPoints(true); /* shows a square every 100 milliseconds where current prediction is */


    //Set up the webgazer video feedback.
    var setup = function() {

        //Set up the main canvas. The main canvas is used to calibrate the webgazer.
        var canvas = document.getElementById("plotting_canvas");
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        canvas.style.position = 'fixed';
        // webgazer.setVideoViewerSize(200,200);
    };

    function checkIfReady() {
        if (webgazer.isReady()) {
            setup();
        } else {
            setTimeout(checkIfReady, 100);
        }
    }
    setTimeout(checkIfReady,100);
    eyeboxLoop();
    
};

window.readingEyeBox = {
    'origin': null,
    'width': null,
    'height': null,
    'canvas': null
}

window.readingEyeBox.setPositions = function (positions) {
    if (positions) {
        window.readingEyeBox.origin = [Math.round(positions[226][0]), Math.round(positions[8][1])];
        window.readingEyeBox.width = Math.round(positions[446][0] - positions[226][0]);
        window.readingEyeBox.height = Math.round(positions[195][1] - positions[8][1]);
        // window.readingEyeBox.topRight = Math.round([positions[446][0],positions[8][1]]);
        // window.readingEyeBox.bottomLeft = Math.round([positions[226][0],positions[195][1]]);
        // window.readingEyeBox.bottomRight = Math.round([positions[446][0],positions[195][1]]);
    }
    // console.log(window.readingEyeBox);
}

var resizeWidth = 150;
var resizeHeight = 50;
var eyeboxCanvas = document.getElementById("eyebox_canvas");

window.readingEyeBox.displayEyeBox = async function () {
    if (!window.readingEyeBox.canvas) {
        window.readingEyeBox.canvas = webgazer.getVideoElementCanvas();
    }
    if (window.readingEyeBox.canvas && readingEyeBox.origin) {
        var eyeBoxImageData = window.readingEyeBox.canvas.getContext('2d').getImageData(window.readingEyeBox.origin[0],
                                                                                        window.readingEyeBox.origin[1],
                                                                                        window.readingEyeBox.width,
                                                                                        window.readingEyeBox.height);
        var gray = new Uint8ClampedArray(eyeBoxImageData.data.length);
        for (var i = 0; i < gray.length; i += 4 ) {
            var avg = Math.round((eyeBoxImageData.data[i] + eyeBoxImageData.data[i+1] + eyeBoxImageData.data[i+2]) / 3);
            gray[i] = avg;
            gray[i+1] = avg;
            gray[i+2] = avg;
            gray[i+3] = eyeBoxImageData.data[i+3];
        }
        var hist = new Uint8ClampedArray(gray.length);
        webgazer.util.equalizeHistogram(gray, 5, hist);
        eyeBoxImageData = new ImageData(hist, eyeBoxImageData.width, eyeBoxImageData.height);
        // console.log(eyeBoxImageData);
        var canvas = document.createElement('canvas');
        canvas.width = window.readingEyeBox.width;
        canvas.height = window.readingEyeBox.height;

        canvas.getContext('2d').putImageData(eyeBoxImageData,0,0);

        // save the canvas into eyebox canvas
        eyeboxCanvas.getContext('2d').drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, resizeWidth, resizeHeight);
    }
}

async function eyeboxLoop() {
    await window.readingEyeBox.displayEyeBox();
    requestAnimationFrame(eyeboxLoop);
}

var startTime = Date.now();

var interval = setInterval(function() {
    elapsedTime = Date.now() - startTime;
    document.getElementById("timer").innerHTML = elapsedTime;
}, 1);
    
// Kalman Filter defaults to on. Can be toggled by user.
window.applyKalmanFilter = true;

// Set to true if you want to save the data even if you reload the page.
window.saveDataAcrossSessions = true;

window.onbeforeunload = function() {
    webgazer.end();
}

/**
 * Restart the calibration process by clearing the local storage and reseting the calibration point
 */
function Restart(){
    document.getElementById("Accuracy").innerHTML = "<a>Not yet Calibrated</a>";
    ClearCalibration();
    PopUpInstruction();
}


