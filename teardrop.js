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
var MAX_TEARDROP_FUNCTIONS = 35;

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
    return Math.fmod(angle, TWO_PI);
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
        var rotatedXY = {
            "x": generatedMagnitude * Math.cos(generatedAngle + teardropAngle),
            "y": generatedMagnitude * Math.sin(generatedAngle + teardropAngle)
        };
        return rotatedXY;
    };
}

function render() {
    refreshTeardropParams();
    BOARD_CANVAS_CTX.clearRect(0, 0, BOARD_CANVAS.width, BOARD_CANVAS.height);
    var totalSlices = 50;
    var xAccumulators = new Array(totalSlices);
    var yAccumulators = new Array(totalSlices);
    for (var i = 0; i < totalSlices; i++) {
        xAccumulators[i] = BOARD_CANVAS.width / 2;
        yAccumulators[i] = BOARD_CANVAS.height / 2;
    }

    for (var functionIndex = (TEARDROP_FUNCTIONS.length - 1);
            functionIndex >= 0; functionIndex--)
    {
        for (var sliceIndex = 0; sliceIndex < totalSlices; sliceIndex++) {
            var angle = ((sliceIndex / totalSlices) * TWO_PI);
            var xyOffset = TEARDROP_FUNCTIONS[functionIndex](angle);
            xAccumulators[sliceIndex] += TEARDROP_SPACING * xyOffset.x;
            yAccumulators[sliceIndex] += TEARDROP_SPACING * xyOffset.y;
            var x = xAccumulators[sliceIndex];
            var y = yAccumulators[sliceIndex];
            if (sliceIndex === 0) {
                // first
                BOARD_CANVAS_CTX.beginPath();
                BOARD_CANVAS_CTX.moveTo(x, y);
                continue;
            }
            BOARD_CANVAS_CTX.lineTo(x, y);
            if (sliceIndex == (totalSlices - 1)) {
                // last
                BOARD_CANVAS_CTX.closePath();
                BOARD_CANVAS_CTX.strokeStyle="#FF0000";
                BOARD_CANVAS_CTX.stroke();
            }
        }
    }
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
