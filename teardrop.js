$(document).ready(init);

// from https://gist.github.com/wteuber/6241786
Math.fmod = function (a,b) { return Number((a - (Math.floor(a / b) * b)).toPrecision(8)); };

var TWO_PI = 2 * Math.PI;

var TEARDROP_M_VALUE = 0;
var TEARDROP_ANGLE = 0;
var TEARDROP_ANGLE_BASE_STEP = TWO_PI / 5;
var MIN_TEARDROP_M_VALUE = 0;
var MAX_TEARDROP_M_VALUE = 20;
var TEARDROP_FUNCTION_PARAMS = [];
var MAX_TEARDROP_FUNCTIONS = 40;
var HARD_MAX_TEADROP_FUNCTIONS = 50;

var TEARDROP_SPACING;
var TEARDROP_REL_SPACING = 0.02;
var BASE_TEARDROP_SPACING;
var BASE_TEARDROP_REL_SPACING = 0.0;
var BASE_TEARDROP_REL_SPACING_REL_GROWTH = 0.1;

var BOARD_CANVAS;
var BOARD_CANVAS_CTX;

var CURRENT_POSITION = {"x": 0, "y": 0};
var MOUSE_POS = {"x": 0, "y": 0};
var CANVAS_MOUSE_POS = {"x": 0, "y": 0};
var TARGET_APPROACH_VELOCITY = {"x": 0, "y": 0};
var TARGET_MAGNITUDE = 0.0;
var TARGET_VISUAL_ANGLE = 0.0;
var MAX_TARGET_APPROACH_REL_VEL_MAGNITUDE = 0.1; // relative units per second
var MAX_TARGET_APPROACH_VEL_MAGNITUDE = {"x": 0, "y": 0}; // pixels per second

function init() {
    BOARD_CANVAS = $("#whiteboard")[0];
    onResize(true);
    $(window).on('resize', onResize);

    MOUSE_POS = {
        "x": BOARD_CANVAS.width / 2,
        "y": BOARD_CANVAS.height / 2};

    setInterval(
            function (e) {
                updatePosition();
            },
            50);

    setInterval(
    //$("#whiteboard").bind("click",
            function (e) {
                var teardropFunction = newTeardropFunction(TEARDROP_M_VALUE, TEARDROP_ANGLE);
                var contourTotalSlices = 1001;
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

                functionParams = {
                    "countours": functionCountours,
                    "strokeStyle": colorToColorStr(newColor())
                };

                TEARDROP_FUNCTION_PARAMS.push(functionParams);

                if (TEARDROP_FUNCTION_PARAMS.length > MAX_TEARDROP_FUNCTIONS) {
                    TEARDROP_FUNCTION_PARAMS = TEARDROP_FUNCTION_PARAMS.slice(
                            TEARDROP_FUNCTION_PARAMS.length - MAX_TEARDROP_FUNCTIONS,
                            TEARDROP_FUNCTION_PARAMS.length);
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

    setInterval(
            function (e) {
                if (MAX_TEARDROP_FUNCTIONS < HARD_MAX_TEADROP_FUNCTIONS)
                    MAX_TEARDROP_FUNCTIONS++;
            },
            5000);

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

function colorToColorStr(color) {
    return '#' + ('000000' + color.toString(16)).slice(-6);
}

var COLOR_RANGE_LEN = 128;
var NEW_COLOR_IDX = Math.floor(Math.random() * COLOR_RANGE_LEN);

function newColor() {
    // based on: http://krazydad.com/tutorials/makecolors.php
    var baseColorFreq = TARGET_MAGNITUDE * 0.1;
    var frequency1 = 0.05 + baseColorFreq;
    var frequency2 = 0.03 + baseColorFreq;
    var frequency3 = 0.02 + baseColorFreq;
    var phase1 = 0;
    var phase2 = 2;
    var phase3 = 4;
    var center = 128;
    var width = 127;
    var len = 50;

    var red = Math.sin(frequency1*NEW_COLOR_IDX + phase1) * width + center;
    var greenn = Math.sin(frequency2*NEW_COLOR_IDX + phase2) * width + center;
    var blue = Math.sin(frequency3*NEW_COLOR_IDX + phase3) * width + center;
    NEW_COLOR_IDX++;
    if (NEW_COLOR_IDX > COLOR_RANGE_LEN) {
        NEW_COLOR_IDX = 0;
    }
    return (red << 16) | (greenn << 8) | blue;
}

function onResize(isFirst) {
    var boundingRect = BOARD_CANVAS.getBoundingClientRect();
    BOARD_CANVAS.width = boundingRect.width;
    BOARD_CANVAS.height = boundingRect.height;
    BOARD_CANVAS_CTX = BOARD_CANVAS.getContext("2d");
    TEARDROP_SPACING = Math.min(BOARD_CANVAS.width, BOARD_CANVAS.height) * TEARDROP_REL_SPACING;
    BASE_TEARDROP_SPACING = Math.min(BOARD_CANVAS.width, BOARD_CANVAS.height) * BASE_TEARDROP_REL_SPACING;
    MAX_TARGET_APPROACH_VEL_MAGNITUDE.x = MAX_TARGET_APPROACH_REL_VEL_MAGNITUDE * BOARD_CANVAS.width;
    MAX_TARGET_APPROACH_VEL_MAGNITUDE.y = MAX_TARGET_APPROACH_REL_VEL_MAGNITUDE * BOARD_CANVAS.height;
    if (isFirst) {
        CURRENT_POSITION = {"x": BOARD_CANVAS.width / 2, "y": BOARD_CANVAS.height / 2};
    }
    updatePosition();
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
    var prevFunctionPoints = [];
    for (var i = 0; i < renderTotalSlices; i++) {
        renderXAccumulators[i] = CURRENT_POSITION.x;
        renderYAccumulators[i] = CURRENT_POSITION.y;
    }
    for (functionIndex = (TEARDROP_FUNCTION_PARAMS.length - 1);
            functionIndex >= 0; functionIndex--)
    {
        functionParams = TEARDROP_FUNCTION_PARAMS[functionIndex];
        functionCountours = functionParams.countours;
        functionStrokeStyle = functionParams.strokeStyle;
        var functionPoints = [];
        for (sliceIndex = 0; sliceIndex < renderTotalSlices; sliceIndex++) {
            angle = ((sliceIndex / renderTotalSlices) * TWO_PI) - Math.PI;
            magnitude = interpolateMagnitudeFromContour(functionCountours, angle);
            //console.log("angle " + angle + ", magnitude " + magnitude);
            var xOffset = Math.cos(angle) * magnitude;
            var yOffset = Math.sin(angle) * magnitude;

            var teardropSpacing = (
                    functionIndex == (TEARDROP_FUNCTION_PARAMS.length - 1) ?
                    BASE_TEARDROP_SPACING : TEARDROP_SPACING);
            renderXAccumulators[sliceIndex] += teardropSpacing * xOffset;
            renderYAccumulators[sliceIndex] += teardropSpacing * yOffset;
            var x = renderXAccumulators[sliceIndex];
            var y = renderYAccumulators[sliceIndex];
            functionPoints.push({"x":x, "y": y});

            if (sliceIndex === 0) {
                // first slice
                BOARD_CANVAS_CTX.beginPath();
                BOARD_CANVAS_CTX.moveTo(x, y);
                continue;
            }
            BOARD_CANVAS_CTX.lineTo(x, y);
            if (sliceIndex == (renderTotalSlices - 1)) {
                // last slice
                if (prevFunctionPoints.length > 0) {
                    for (var prevFunctionPointsIndex = prevFunctionPoints.length - 1;
                            prevFunctionPointsIndex >= 0;
                            prevFunctionPointsIndex--)
                    {
                        var prevPoint = prevFunctionPoints[prevFunctionPointsIndex];
                        BOARD_CANVAS_CTX.lineTo(prevPoint.x, prevPoint.y);
                    }
                    BOARD_CANVAS_CTX.lineTo(
                            prevFunctionPoints[prevFunctionPoints.length - 1].x,
                            prevFunctionPoints[prevFunctionPoints.length - 1].y);
                    BOARD_CANVAS_CTX.lineTo(x, y);
                }
                BOARD_CANVAS_CTX.closePath();
                BOARD_CANVAS_CTX.fillStyle = functionStrokeStyle;
                BOARD_CANVAS_CTX.fill();
                BOARD_CANVAS_CTX.strokeStyle = functionStrokeStyle;
                BOARD_CANVAS_CTX.stroke();
            }
        }
        prevFunctionPoints = functionPoints;
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

var INITIAL_TEADROPPARAMS_TIMESTAMP = Date.now();
var ROTATION_VELOCITY = Math.PI; // radians per second

function refreshTeardropParams() {
    var currentTimestamp = Date.now();
    var ellapsedMilliseconds = currentTimestamp - INITIAL_TEADROPPARAMS_TIMESTAMP;
    var timeFactor = ellapsedMilliseconds / 1000;

    TEARDROP_M_VALUE = MIN_TEARDROP_M_VALUE + (TARGET_MAGNITUDE * (MAX_TEARDROP_M_VALUE - MIN_TEARDROP_M_VALUE));
    //TEARDROP_ANGLE = TARGET_VISUAL_ANGLE + ((0.1 + TARGET_MAGNITUDE) * timeFactor * ROTATION_VELOCITY);
    TEARDROP_ANGLE = TARGET_VISUAL_ANGLE;
}

var LAST_UPDATE_POSITION_TIMESTAMP = Date.now();

function updatePosition() {
    var currentTimestamp = Date.now();
    var ellapsedMilliseconds = currentTimestamp - LAST_UPDATE_POSITION_TIMESTAMP;
    var timeFactor = ellapsedMilliseconds / 1000;
    LAST_UPDATE_POSITION_TIMESTAMP = Date.now();

    updateCanvasMousePos();
    var vectorX = CANVAS_MOUSE_POS.x - CURRENT_POSITION.x;
    var vectorY = CANVAS_MOUSE_POS.y - CURRENT_POSITION.y;
    var relVectorX = vectorX / BOARD_CANVAS.width;
    var relVectorY = vectorY / BOARD_CANVAS.height;
    var relVectorAngle = Math.atan2(relVectorY, relVectorX);
    var relVectorMagnitude = Math.sqrt((relVectorX * relVectorX) + (relVectorY * relVectorY));
    TARGET_VISUAL_ANGLE = Math.atan2(
            relVectorY * (BOARD_CANVAS.height / BOARD_CANVAS.width),
            relVectorX);
    TARGET_MAGNITUDE = relVectorMagnitude;

    var targetApproachVelXMagnitude = timeFactor * MAX_TARGET_APPROACH_VEL_MAGNITUDE.x;
    var targetApproachVelYMagnitude = timeFactor * MAX_TARGET_APPROACH_VEL_MAGNITUDE.y;
    targetApproachVelXMagnitude *= (
            relVectorMagnitude < MAX_TARGET_APPROACH_REL_VEL_MAGNITUDE ?
            Math.sqrt(relVectorMagnitude / MAX_TARGET_APPROACH_REL_VEL_MAGNITUDE) :
            1);
    targetApproachVelYMagnitude *= (
            relVectorMagnitude < MAX_TARGET_APPROACH_REL_VEL_MAGNITUDE ?
            Math.sqrt(relVectorMagnitude / MAX_TARGET_APPROACH_REL_VEL_MAGNITUDE) :
            1);
    TARGET_APPROACH_VELOCITY.x = (targetApproachVelXMagnitude * Math.cos(relVectorAngle));
    TARGET_APPROACH_VELOCITY.y = (targetApproachVelYMagnitude * Math.sin(relVectorAngle));
    CURRENT_POSITION.x += TARGET_APPROACH_VELOCITY.x;
    CURRENT_POSITION.y += TARGET_APPROACH_VELOCITY.y;
    CURRENT_POSITION.x = Math.max(0, Math.min(BOARD_CANVAS.width, CURRENT_POSITION.x));
    CURRENT_POSITION.y = Math.max(0, Math.min(BOARD_CANVAS.height, CURRENT_POSITION.y));
}

function updateCanvasMousePos() {
    var boundingRect = BOARD_CANVAS.getBoundingClientRect();
    CANVAS_MOUSE_POS = {
        "x": MOUSE_POS.x - boundingRect.left,
        "y": MOUSE_POS.y - boundingRect.top
    };
}
