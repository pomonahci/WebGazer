/*
 * This function calculates a measurement for how precise 
 * the eye tracker currently is which is displayed to the user
 */
function calculatePrecision(past50Array) {
  var windowHeight = $(window).height();
  var windowWidth = $(window).width();

  // Retrieve the last 50 gaze prediction points
  var x50 = past50Array[0];
  var y50 = past50Array[1];

  // Calculate the position of the point the user is staring at
  var staringPointX = windowWidth / 2;
  var staringPointY = windowHeight / 2;

  var distanceErrors = new Array(50);
  var precisions = new Array(50);
  calculateErrors(distanceErrors, precisions, windowHeight, x50, y50, staringPointX, staringPointY);
  var averageError = calculateAverage(distanceErrors);
  var totalSquaredError = 0;
  for (var i = 0; i < distanceErrors.length; i++) {
    // Calculate total squared error for st dev calculation
    totalSquaredError += Math.pow(distanceErrors[i] - averageError, 2);
  }
  var standardDeviation = Math.sqrt(totalSquaredError / distanceErrors.length);

  var averagePrecision = calculateAverage(precisions);

  // Return the error measurements
  return {
    avg: Math.round(averageError),
    stdev: Math.round(standardDeviation),
    precision: Math.round(averagePrecision)
  }
};

/*
 * Calculate percentage accuracy for each prediction based on distance of
 * the prediction point from the centre point (uses the window height as
 * lower threshold 0%)
 */
function calculateErrors(distanceErrors, precisions, windowHeight, x50, y50, staringPointX, staringPointY) {
  for (x = 0; x < 50; x++) {
    // Calculate distance between each prediction and staring point
    var xDiff = staringPointX - x50[x];
    var yDiff = staringPointY - y50[x];
    var distance = Math.sqrt((xDiff * xDiff) + (yDiff * yDiff));

    // Store the distance
    distanceErrors[x] = distance;

    // Calculate precision percentage
    var halfWindowHeight = windowHeight / 2;
    var precision = 0;
    if (distance <= halfWindowHeight && distance > -1) {
      precision = 100 - (distance / halfWindowHeight * 100);
    } else if (distance > halfWindowHeight) {
      precision = 0;
    } else if (distance > -1) {
      precision = 100;
    }

    // Store the precision
    precisions[x] = precision;
  }
}

/*
 * Calculates the average of all values in array
 */
function calculateAverage(values) {
  var avg = 0;
  for (x = 0; x < 50; x++) {
    avg += values[x];
  }
  avg = avg / 50;
  return avg;
}