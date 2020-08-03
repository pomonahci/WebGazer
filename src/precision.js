/*
 * Initialises variables used to store accuracy eigenValues
 * This is used by the calibration example file
 */
var store_points_var = false;
var xPastPoints = new Array(50);
var yPastPoints = new Array(50);
var numPastPoints = 50;

/**
 * Change number of points to be stored, defaults to 50 as above
 */
function adjust_num_stored_points(num) {
  numPastPoints = num;
  xPastPoints = new Array(num);
  yPastPoints = new Array(num);
}

/*
 * Stores the position of the fifty most recent tracker preditions
 */
function store_points(x, y, k) {
  xPastPoints[k] = x;
  yPastPoints[k] = y;
}
