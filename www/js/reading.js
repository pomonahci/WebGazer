window.onload = function() {

    //start the webgazer tracker
    webgazer.setRegression('ridge') /* currently must set regression and tracker */
        .setTracker('TFFacemesh')
        .setGazeListener(function(data, clock) {
          //   console.log(data); /* data is an object containing an x and y key which are the x and y prediction coordinates (no bounds limiting) */
          //   console.log(clock); /* elapsed time in milliseconds since webgazer.begin() was called */
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
};

// Kalman Filter defaults to on. Can be toggled by user.
window.applyKalmanFilter = true;

// Set to true if you want to save the data even if you reload the page.
window.saveDataAcrossSessions = true;

window.onbeforeunload = function() {
    webgazer.end();
}

window.readingEyeBox = {
    'topLeft': null,
    'topRight': null,
    'bottomLeft': null,
    'bottomRight': null
}

window.readingEyeBox.setPositions = function (positions) {
    if (positions) {
        window.readingEyeBox.topLeft = [positions[46][0],positions[46][1]];
        window.readingEyeBox.topRight = [positions[276][0],positions[276][1]];
        window.readingEyeBox.bottomLeft = [positions[117][0],positions[117][1]];
        window.readingEyeBox.bottomRight = [positions[346][0],positions[346][1]];
    }
    // console.log(window.readingEyeBox);
}

window.readingEyeBox.displayEyeBox = async function () {

}

/**
 * Restart the calibration process by clearing the local storage and reseting the calibration point
 */
function Restart(){
    document.getElementById("Accuracy").innerHTML = "<a>Not yet Calibrated</a>";
    ClearCalibration();
    PopUpInstruction();
}

$(document).keydown(function(e){
    if (e.keyCode == 32) { 
       console.log( "next line" );
       return false;
    }
});

