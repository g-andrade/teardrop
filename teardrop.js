$(document).ready(init);

// from https://gist.github.com/wteuber/6241786
Math.fmod = function (a,b) { return Number((a - (Math.floor(a / b) * b)).toPrecision(8)); };

var TWO_PI = 2 * Math.PI;

var TEARDROP_M_VALUE = 0;
var TEARDROP_ANGLE = 0;
var TEARDROP_ANGLE_BASE_STEP = TWO_PI / 5;
var MAX_TEARDROP_M_VALUE = 5;
var TEARDROP_FUNCTIONS = [];
var TEADROP_REL_SPACING = 0.03;
var TEARDROP_SPACING;
var MAX_TEARDROP_FUNCTIONS = 30;

var MOUSE_POS = {"x": 0, "y": 0};
var BOARD_CANVAS;
var BOARD_CANVAS_CTX;

function init() {
    BOARD_CANVAS = $("#whiteboard")[0];
    onResize();
    $(window).on('resize', onResize);

    MOUSE_POS = {
        "x": BOARD_CANVAS.width / 2,
        "y": BOARD_CANVAS.height / 2};

    setInterval(
    //$("#whiteboard").bind("click",
            function (e) {
                TEARDROP_FUNCTIONS.push(
                    newTeardropFunction(TEARDROP_M_VALUE, TEARDROP_ANGLE));
                    render();

                if (TEARDROP_FUNCTIONS.length > MAX_TEARDROP_FUNCTIONS) {
                    TEARDROP_FUNCTIONS = TEARDROP_FUNCTIONS.slice(
                            TEARDROP_FUNCTIONS.length - MAX_TEARDROP_FUNCTIONS,
                            TEARDROP_FUNCTIONS.length);
                }
            //});
            },
            100);

    $("#whiteboard").bind("mousemove",
            function (e) {
                MOUSE_POS = {"x": e.pageX, "y": e.pageY};
            });

    $('#whiteboard').bind("touchmove",
            function (e) {
                var targetTouches = e.originalEvent.targetTouches;
                if (targetTouches.length != 1) {
                    return;
                }
                var touch = targetTouches[0];
                MOUSE_POS = {"x": touch.pageX, "y": touch.pageY};
            });
}

function onResize() {
    var boundingRect = BOARD_CANVAS.getBoundingClientRect();
    BOARD_CANVAS.width = boundingRect.width;
    BOARD_CANVAS.height = boundingRect.height;
    BOARD_CANVAS_CTX = BOARD_CANVAS.getContext("2d");
    TEARDROP_SPACING = Math.min(BOARD_CANVAS.width, BOARD_CANVAS.height) * TEADROP_REL_SPACING;
    render();
}

function canonicalAngle(angle) {
    // sigh....
    /*var ratio = angle / TWO_PI;
    return TWO_PI * (ratio - Math.floor(ratio));*/
    var res = Math.fmod(angle, TWO_PI);
    res = (res >= 0 ? res : (TWO_PI - res));
    res = (res >= Math.PI ? res - TWO_PI : res);
    return res;
}

function newTeardropFunction(m, teardropAngle) {
    return function(angle) {
        var baseXY = {
            "x": Math.cos(angle),
            "y": Math.sin(angle) * Math.pow(Math.sin(angle / 2.0), m)
        };
        var generatedAngle = Math.atan2(baseXY.y, baseXY.x);
        var generatedMagnitude = Math.sqrt(
                (baseXY.x * baseXY.x) +
                (baseXY.y * baseXY.y));
        return {
            "angle": canonicalAngle(generatedAngle + teardropAngle),
            "magnitude": generatedMagnitude
        };
    };
}

function render() {
    refreshTeardropParams();
    BOARD_CANVAS_CTX.clearRect(0, 0, BOARD_CANVAS.width, BOARD_CANVAS.height);
    var functionIndex, sliceIndex, angle, magnitude, polarCoordinates;
    var contourTotalSlices = 11;
    var contoursPerFunction = new Array(TEARDROP_FUNCTIONS.length);

    for (functionIndex = (TEARDROP_FUNCTIONS.length - 1);
            functionIndex >= 0; functionIndex--)
    {
        functionCountours = new Array(contourTotalSlices);
        for (sliceIndex = 0; sliceIndex < contourTotalSlices; sliceIndex++) {
            angle = ((sliceIndex / contourTotalSlices) * TWO_PI);
            polarCoordinates = TEARDROP_FUNCTIONS[functionIndex](angle);
            functionCountours[sliceIndex] = polarCoordinates;
        }
        functionCountours.sort(comparePolarAngles);
        contoursPerFunction[functionIndex] = functionCountours;
    }

    var renderTotalSlices = 10;
    var renderXAccumulators = new Array(renderTotalSlices);
    var renderYAccumulators = new Array(renderTotalSlices);
    for (var i = 0; i < renderTotalSlices; i++) {
        renderXAccumulators[i] = BOARD_CANVAS.width / 2;
        renderYAccumulators[i] = BOARD_CANVAS.height / 2;
    }
    for (functionIndex = (TEARDROP_FUNCTIONS.length - 1);
            functionIndex >= 0; functionIndex--)
    {
        functionCountours = contoursPerFunction[functionIndex];
        for (sliceIndex = 0; sliceIndex < renderTotalSlices; sliceIndex++) {
            angle = ((sliceIndex / renderTotalSlices) * TWO_PI) - Math.PI;
            magnitude = interpolateMagnitudeFromContour(functionCountours, angle);
            //console.log("angle " + angle + ", magnitude " + magnitude);
            var xOffset = Math.cos(angle) * magnitude;
            var yOffset = Math.sin(angle) * magnitude;
            renderXAccumulators[sliceIndex] += TEARDROP_SPACING * xOffset;
            renderYAccumulators[sliceIndex] += TEARDROP_SPACING * yOffset;
            var x = renderXAccumulators[sliceIndex];
            var y = renderYAccumulators[sliceIndex];
            if (sliceIndex === 0) {
                // first
                BOARD_CANVAS_CTX.beginPath();
                BOARD_CANVAS_CTX.moveTo(x, y);
                continue;
            }
            BOARD_CANVAS_CTX.lineTo(x, y);
            if (sliceIndex == (renderTotalSlices - 1)) {
                // last
                BOARD_CANVAS_CTX.closePath();
                BOARD_CANVAS_CTX.strokeStyle="#FF0000";
                BOARD_CANVAS_CTX.stroke();
            }
        }
    }
}

function interpolateMagnitudeFromContour(sortedContours, angle, leftIndex, rightIndex) {
    if (leftIndex === undefined)
        leftIndex = 0;
    if (rightIndex === undefined)
        rightIndex = sortedContours.length - 1;

    var left = sortedContours[leftIndex];
    var right = sortedContours[rightIndex];
    if (leftIndex == (rightIndex - 1)) {
        var angleDiff = right.angle - left.angle;
        var relAngle = angle - left.angle;
        return (left.magnitude + ((relAngle / angleDiff) * (right.magnitude - left.magnitude)));
    }
    if (angle < left.angle)
        return left.magnitude;
    if (angle > right.angle)
        return right.magnitude;

    var middleIndex = leftIndex + Math.floor((rightIndex - leftIndex) / 2);
    var middle = sortedContours[middleIndex];
    if (angle < middle.angle)
        return interpolateMagnitudeFromContour(sortedContours, angle, leftIndex, middleIndex);
    return interpolateMagnitudeFromContour(sortedContours, angle, middleIndex, rightIndex);
}

function comparePolarAngles(polarCoordinatesA, polarCoordinatesB) {
    return polarCoordinatesA.angle - polarCoordinatesB.angle;
}

function refreshTeardropParams() {
    var canvasBoundingRect = BOARD_CANVAS.getBoundingClientRect();
    var canvasYXRatio = BOARD_CANVAS.height / BOARD_CANVAS.width;
    var canvasX = MOUSE_POS.x - canvasBoundingRect.left;
    var canvasY = MOUSE_POS.y - canvasBoundingRect.top;
    var relCanvasX = canvasX / BOARD_CANVAS.width;
    var relCanvasY = canvasY / BOARD_CANVAS.height;
    var centeredRelCanvasX = (relCanvasX - 0.5) * 2.0;
    var centeredRelCanvasY = ((relCanvasY - 0.5) * 2.0) * canvasYXRatio;
    var centeredRelDistance = Math.sqrt(
            (centeredRelCanvasX * centeredRelCanvasX) +
            (centeredRelCanvasY * centeredRelCanvasY));

    TEARDROP_M_VALUE = centeredRelDistance * MAX_TEARDROP_M_VALUE;

    //TEARDROP_ANGLE = (TWO_PI - Math.atan2(-centeredRelCanvasY, centeredRelCanvasX)) + Math.PI;
    TEARDROP_ANGLE += TEARDROP_ANGLE_BASE_STEP * Math.max(0, centeredRelDistance);
}
