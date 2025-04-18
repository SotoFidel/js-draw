// const canvas = document.getElementById("canvas");
let canvas;
const canvasContainer = document.getElementById("canvasContainer");
let ctx;

let cursorEnabled = false;
let offsetX = 0;
let offsetY = 0;
let changeStack = [];
let redoStack = [];
let oldCoords = { x: 0, y: 0 }
let newCoords = { x: 0, y: 0 }
let prevImageData;
let color = "#000000";

let modes = {
    Drawing: { mode: "Drawing", fn: draw, strokeWidth: 10 },
    Erasing: { mode: "Erasing", fn: erase, strokeWidth: 10 }
};

let currentMode = modes.Drawing;


function setupCanvasEvents() {
    canvas.addEventListener("mousedown", (event) => {
        // left click to draw
        if (event.buttons == 1) {
            redoStack = [];
            cursorEnabled = true;
            if (currentMode.mode == "Drawing") {
                ctx.beginPath();
                ctx.arc(Math.max(newCoords.x, 0),
                    Math.max(newCoords.y, 0), currentMode.strokeWidth, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
            }
            if (currentMode.mode == "Erasing") {
                ctx.clearRect(Math.max(newCoords.x - (currentMode.strokeWidth / 2), 0), Math.max(newCoords.y - (currentMode.strokeWidth / 2), 0), currentMode.strokeWidth, currentMode.strokeWidth);
            }
        }
    });


    ["mouseup", "mouseleave"].forEach((eventType) => {
        canvas.addEventListener(eventType, () => {
            cursorEnabled = false;
            changeStack.push(ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height));
        });
    });

    canvas.addEventListener("mousemove", (event) => {
        oldCoords = newCoords;
        newCoords = { x: event.x - offsetX, y: event.y - offsetY };

        // console.log("Painting new blue at: ", newCoords);
        // ctx.beginPath();
        // ctx.strokeStyle = "blue";
        // ctx.lineWidth = 3;
        // ctx.rect(newCoords.x - 5, newCoords.y - 5, 10, 10);
        // ctx.stroke();
        // console.log("painting old red at: ", oldCoords);
        // ctx.beginPath();
        // ctx.strokeStyle = "red";
        // ctx.lineWidth = 2;
        // ctx.rect(oldCoords.x - 5, oldCoords.y - 5, 10, 10);
        // ctx.stroke();
        // let newC;
        //
        // ctx.beginPath();
        // ctx.strokeStyle = "purple";
        // ctx.lineWidth = 4;
        // for (let i = 0; i <= 1; i += .05) {
        //     newC = interpolate(oldCoords, newCoords, i);
        //     ctx.rect(newC.x - 5, newC.y - 5, 10, 10);
        //     ctx.stroke();
        // }
        // console.log("mousemove ", oldCoords, newCoords);
        currentMode.fn();
    });

    addEventListener("keydown", (event) => {
        // undo
        if (event.ctrlKey && event.key == 'z') {
            if (changeStack.length > 1) {
                redoStack.push(changeStack.pop());
                ctx.putImageData(changeStack[changeStack.length - 1], 0, 0);
            } else if (changeStack.length == 1) {
                ctx.putImageData(changeStack[0], 0, 0);
                redoStack.push(changeStack.pop());
            }
        }
        if (event.ctrlKey && event.shiftKey && event.key == 'Z') {
            if (redoStack.length > 0) {
                ctx.putImageData(redoStack.pop(), 0, 0);
            }
        }

    });


}

function setupUiEvents() {
    let brushSizeInput = document.querySelector("#ribbon > input#size");
    let brushSizeOutput = document.querySelector("#sizeVal");
    brushSizeOutput.value = brushSizeInput.value;
    brushSizeInput.addEventListener("input", (event) => {
        brushSizeOutput.value = event.target.value;
        modes[currentMode.mode].strokeWidth = event.target.value;
    });
    brushSizeOutput.addEventListener("change", (event) => {
        if (event.target.value > 500) {
            event.target.value = 500;
        }
        brushSizeInput.value = event.target.value;
        modes[currentMode.mode].strokeWidth = event.target.value;
    });

    document.querySelector("#colorPicker").addEventListener("change", (event) => {
        color = event.target.value;
    });
}

function update() {
    currentMode.fn();
    requestAnimationFrame(update);
}

function draw() {

    if (cursorEnabled) {
        for (let i = 0; i <= 1; i += .01) {
            nc = interpolate(oldCoords, newCoords, i);
            ctx.beginPath();
            ctx.arc(Math.max(nc.x, 0),
                Math.max(nc.y, 0), currentMode.strokeWidth, 0, 2 * Math.PI);
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.fill();
            ctx.stroke();
        }
    }
}

function erase() {
    if (cursorEnabled) {
        let nc;
        // console.log("erase ", oldCoords, newCoords);
        for (let i = 0; i <= 1; i += .05) {
            nc = interpolate(oldCoords, newCoords, i);
            ctx.clearRect(Math.max(nc.x - (currentMode.strokeWidth / 2), 0), Math.max(nc.y - (currentMode.strokeWidth / 2), 0), currentMode.strokeWidth, currentMode.strokeWidth);
        }
        // ctx.clearRect(Math.max(newCoords.x - 5, 0), Math.max(newCoords.y - 5, 0), 10, 10);
    }
}

function interpolate(a, b, t) // points A and B, frac between 0 and 1
{
    var nx = a.x + (b.x - a.x) * t;
    var ny = a.y + (b.y - a.y) * t;
    return { x: nx, y: ny };
}

function setMethod(method) {
    modes[currentMode.mode].strokeWidth = currentMode.strokeWidth;
    currentMode = modes[method];
    document.querySelector("#size").value = currentMode.strokeWidth;
    document.querySelector("#sizeVal").value = currentMode.strokeWidth;
}

function calculateOffsets() {
    offsetX = canvas.getBoundingClientRect().x;
    offsetY = canvas.getBoundingClientRect().y;
}

function createCanvas() {
    let canvasContainerRect = canvasContainer.getBoundingClientRect();
    canvas = document.createElement("canvas");
    canvas.setAttribute("id", "canvas");
    canvas.setAttribute("width", `${canvasContainerRect.width}`);
    canvas.setAttribute("height", `${canvasContainerRect.height}`);
    canvasContainer.replaceWith(canvas);
    ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.lineWidth = 0;
    ctx.fillStyle = "black";
    changeStack.push(ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height));
}

window.onload = function() {
    createCanvas();
    calculateOffsets();
    setupCanvasEvents();
    setupUiEvents();
    // requestAnimationFrame(update);
}

