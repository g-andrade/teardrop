$(document).ready(init);

// from https://gist.github.com/wteuber/6241786
Math.fmod = function (a,b) { return Number((a - (Math.floor(a / b) * b)).toPrecision(8)); };

var TWO_PI = 2 * Math.PI;

var TEARDROP_M_VALUE = 0;
var TEARDROP_ANGLE = 0;
var TEARDROP_ANGLE_BASE_STEP = TWO_PI / 5;
var MAX_TEARDROP_M_VALUE = 5;
var TEARDROP_FUNCTION_CONTOURS = [];
var MAX_TEARDROP_FUNCTIONS = 30;

var TEARDROP_SPACING;
var TEARDROP_REL_SPACING = 0.03;
var BASE_TEARDROP_SPACING;
var BASE_TEARDROP_REL_SPACING = 0.0;
var BASE_TEARDROP_REL_SPACING_REL_GROWTH = 0.1;

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
                var teardropFunction = newTeardropFunction(TEARDROP_M_VALUE, TEARDROP_ANGLE);
                var contourTotalSlices = 201;
                functionCountours = new Array(contourTotalSlices);
                for (sliceIndex = 0; sliceIndex < contourTotalSlices; sliceIndex++) {
                    angle = ((sliceIndex / contourTotalSlices) * TWO_PI);
                    polarCoordinates = teardropFunction(angle);
                    functionCountours[sliceIndex] = polarCoordinates;
                }

                // two extra for easier interpolation
                firstPolarCoordinates = functionCountours[functionCountours.length - 1];
                firstPolarCoordinates.angle -= TWO_PI;
                functionCountours.unshift(firstPolarCoordinates);
                lastPolarCoordinates = functionCountours[1];
                lastPolarCoordinates.angle += TWO_PI;
                functionCountours.push(lastPolarCoordinates);

                functionCountours.sort(comparePolarAngles);
                TEARDROP_FUNCTION_CONTOURS.push(functionCountours);

                if (TEARDROP_FUNCTION_CONTOURS.length > MAX_TEARDROP_FUNCTIONS) {
                    TEARDROP_FUNCTION_CONTOURS = TEARDROP_FUNCTION_CONTOURS.slice(
                            TEARDROP_FUNCTION_CONTOURS.length - MAX_TEARDROP_FUNCTIONS,
                            TEARDROP_FUNCTION_CONTOURS.length);
                }
                BASE_TEARDROP_REL_SPACING = 0;
                BASE_TEARDROP_SPACING = 0;
            //});
            },
            50);

    setInterval(
            function (e) {
                render();
                BASE_TEARDROP_REL_SPACING += (TEARDROP_REL_SPACING * BASE_TEARDROP_REL_SPACING_REL_GROWTH);
                BASE_TEARDROP_SPACING = Math.min(BOARD_CANVAS.width, BOARD_CANVAS.height) * BASE_TEARDROP_REL_SPACING;
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
    TEARDROP_SPACING = Math.min(BOARD_CANVAS.width, BOARD_CANVAS.height) * TEARDROP_REL_SPACING;
    BASE_TEARDROP_SPACING = Math.min(BOARD_CANVAS.width, BOARD_CANVAS.height) * BASE_TEARDROP_REL_SPACING;
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
    var functionIndex, sliceIndex, angle, magnitude;
    var polarCoordinates, firstPolarCoordinates, lastPolarCoordinates;

    var renderTotalSlices = 50;
    var renderXAccumulators = new Array(renderTotalSlices);
    var renderYAccumulators = new Array(renderTotalSlices);
    for (var i = 0; i < renderTotalSlices; i++) {
        renderXAccumulators[i] = BOARD_CANVAS.width / 2;
        renderYAccumulators[i] = BOARD_CANVAS.height / 2;
    }
    for (functionIndex = (TEARDROP_FUNCTION_CONTOURS.length - 1);
            functionIndex >= 0; functionIndex--)
    {
        functionCountours = TEARDROP_FUNCTION_CONTOURS[functionIndex];
        for (sliceIndex = 0; sliceIndex < renderTotalSlices; sliceIndex++) {
            angle = ((sliceIndex / renderTotalSlices) * TWO_PI) - Math.PI;
            magnitude = interpolateMagnitudeFromContour(functionCountours, angle);
            //console.log("angle " + angle + ", magnitude " + magnitude);
            var xOffset = Math.cos(angle) * magnitude;
            var yOffset = Math.sin(angle) * magnitude;

            var teardropSpacing = (
                    functionIndex == (TEARDROP_FUNCTION_CONTOURS.length - 1) ?
                    BASE_TEARDROP_SPACING : TEARDROP_SPACING);
            renderXAccumulators[sliceIndex] += teardropSpacing * xOffset;
            renderYAccumulators[sliceIndex] += teardropSpacing * yOffset;
            var x = renderXAccumulators[sliceIndex];
            var y = renderYAccumulators[sliceIndex];

            if (sliceIndex === 0) {
                // first slice
                BOARD_CANVAS_CTX.beginPath();
                BOARD_CANVAS_CTX.moveTo(x, y);
                continue;
            }
            BOARD_CANVAS_CTX.lineTo(x, y);
            if (sliceIndex == (renderTotalSlices - 1)) {
                // last slice
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
    if ((leftIndex == (rightIndex - 1)) || (angle < left.angle) || (angle > right.angle)) {
        var angleDiff = right.angle - left.angle;
        var relAngle = angle - left.angle;
        return (left.magnitude + ((relAngle / angleDiff) * (right.magnitude - left.magnitude)));
    }

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

    TEARDROP_ANGLE = (TWO_PI - Math.atan2(-centeredRelCanvasY, centeredRelCanvasX)) + Math.PI;
    //TEARDROP_ANGLE += TEARDROP_ANGLE_BASE_STEP * Math.max(0, centeredRelDistance);
}
