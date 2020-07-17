var target;
var targetX, targetY, destX, destY;

function TargetPoint(x, y) {
    this.x = x;
    this.y = y;
}

function init() {
    target = document.getElementById("target");
    target.style.left = "0px";
    target.style.top = "0px";

    targetX = parseInt(target.style.left);
    targetY = parseInt(target.style.top);
}

var lastTime = 0;
var moving = false;

function randomMove() {
    var x = Math.random() * window.innerWidth;
    var y = Math.random() * window.innerHeight;
    moveTarget(x,y);
}

var interval;

function initializeTargetPoints(points) {
    interval = setInterval(()=>(moveToPoints(points)), 2000);
}

/**
 * 
 * @param {array} points a "stack" of coordinates
 */
function moveToPoints(points) {
    if (points.length > 0) {
        var dest = points.pop();
        moveTargetToPoint(dest.x, dest.y);
    } else {
        clearInterval(interval);
    }
}

function moveTargetToPoint(x, y) {
    moving = true;

    lastTime = 0;

    targetX = parseInt(target.style.left);
    targetY = parseInt(target.style.top);

    destX = x;
    destY = y;

    window.requestAnimationFrame(frame);
}

/**
 * @param {*} ms elapsed time in ms, similar to performance.now(), passed in by requestAnimationFrame
 */
function frame(ms) {
    var elapsed;
    if (lastTime == 0) {
        elapsed = 0;
    } else {
        elapsed = ms - lastTime;
    }
    
    lastTime = ms;

    moveElement(elapsed);

    if (Math.abs(targetX - destX) >= 0.5 || Math.abs(targetY - destY) >= 0.5) {
        window.requestAnimationFrame(frame);
    } else {
        moving = false;
        console.log("stopped")
    }
}

/**
 * 
 * @param {*} ms 
 */
function moveElement(ms) {
    
    var between = calcDistAndAngle(targetX, targetY, destX, destY);
    
    var velocity = between.dist / 0.25;
    var vector = new Vector(velocity, between.angle);
    var elapsedSeconds = ms / 1000;

    targetX += (vector.magnitudeX * elapsedSeconds);
    targetY += (vector.magnitudeY * elapsedSeconds);

    target.style.left = Math.round(targetX) + "px";
    target.style.top = Math.round(targetY) + "px";
}

function calcDistAndAngle(x1, y1, x2, y2) {
    var dx = x2 - x1;
    var dy = y2 - y1;

    return {
        // pythagorean
        dist: Math.sqrt(dx * dx + dy * dy),
        // angle in radians
        angle: Math.atan2(dy, dx)
    }
}

function Vector(magnitude, angle) {
    this.magnitudeX = magnitude * Math.cos(angle);
    this.magnitudeY = magnitude * Math.sin(angle);
}

