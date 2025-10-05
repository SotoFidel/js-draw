/**
 * @type HtmlCanvasElement
 */
let canvas;

/**
 * @type HtmlCanvasElement
 */
let toolCanvas;
const canvasContainer = document.getElementById("canvasContainer");

/**
 * @type CanvasRenderingContext2D
 */
let canvasContext;

/**
 * @type CanvasRenderingContext2D
 */
let toolContext;

let isClicking = false;
let canvasOffsetX = 0;
let canvasOffsetY = 0;
let changeStack = [];
let changeStateIndex = 0;

/**
 * @typedef {Object} Vec2
 * @property {number} x - x coordinates
 * @property {number} y - y coordinates
 */

/**
 * @type Vec2
 */
let oldCoords = { x: 0, y: 0 };

/**
 * @type Vec2
 */
let currentCoords = { x: 0, y: 0 };

let color = "#000000";
let alphaColor = "#00000000";

/**
 * The app knows what it needs to do based on what mode it is in.
 * So effectively this is a state whose state changes are determined by
 * ui buttons.
 */
let modes = {
  Drawing: {
    mode: "Drawing",
    fn: draw,
    strokeWidth: 5,
    buttonId: "draw-btn",
    mouseUpdate: true,
  },
  Erasing: {
    mode: "Erasing",
    fn: erase,
    strokeWidth: 5,
    buttonId: "erase-btn",
    mouseUpdate: true,
  },
  Filling: {
    mode: "Filling",
    fn: bucketFill,
    buttonId: "fill-btn",
    mouseUpdate: false,
    fnParams: null,
  },
};

let currentMode = modes.Drawing;

function clearCanvas() {
  canvasContext.fillStyle = "white";
  canvasContext.fillRect(0, 0, canvas.width, canvas.height);
  canvasContext.fillStyle = color;
}

function draw() {
  toolContext.clearRect(0, 0, toolCanvas.width, toolCanvas.height);
  toolContext.beginPath();
  // tctx.rect(newCoords.x, newCoords.y, currentMode.strokeWidth, currentMode.strokeWidth);
  toolContext.arc(
    Math.max(currentCoords.x, 0),
    Math.max(currentCoords.y, 0),
    currentMode.strokeWidth,
    0,
    2 * Math.PI,
  );
  toolContext.stroke();

  if (isClicking) {
    canvasContext.beginPath();
    let nc;
    for (let i = 0; i <= 1; i += 0.02) {
      nc = interpolate(oldCoords, currentCoords, i);
      canvasContext.arc(
        Math.max(nc.x, 0),
        Math.max(nc.y, 0),
        currentMode.strokeWidth,
        0,
        2 * Math.PI,
      );
    }
    canvasContext.strokeStyle = "#00000000";
    canvasContext.fillStyle = color;
    canvasContext.fill();
  }
}

function erase() {
  toolContext.clearRect(0, 0, toolCanvas.width, toolCanvas.height);
  toolContext.beginPath();
  toolContext.rect(
    Math.max(currentCoords.x - currentMode.strokeWidth / 2, 0),
    Math.max(currentCoords.y - currentMode.strokeWidth / 2, 0),
    currentMode.strokeWidth,
    currentMode.strokeWidth,
  );
  toolContext.stroke();
  if (isClicking) {
    canvasContext.fillStyle = "white";
    let nc;
    // console.log("erase ", oldCoords, newCoords);
    for (let i = 0; i <= 1; i += 0.05) {
      nc = interpolate(oldCoords, currentCoords, i);
      canvasContext.fillRect(
        Math.max(nc.x - currentMode.strokeWidth / 2, 0),
        Math.max(nc.y - currentMode.strokeWidth / 2, 0),
        currentMode.strokeWidth,
        currentMode.strokeWidth,
      );
    }
    // ctx.clearRect(Math.max(newCoords.x - 5, 0), Math.max(newCoords.y - 5, 0), 10, 10);
  }
  canvasContext.fillStyle = color;
}

function exportImage() {
  let tempAnchor = document.createElement("a");
  let imageUrl = canvas.toDataURL("image/png");
  tempAnchor.href = imageUrl;
  tempAnchor.download = "exportedImage";
  let ribbon = document.querySelector("#ribbon");
  if (!ribbon) return;
  ribbon.appendChild(tempAnchor);
  tempAnchor.click();
  ribbon.removeChild(tempAnchor);
}

function bucketFill() {
  const sourceColor = getPixelColor(
    currentMode.fnParams.x,
    currentMode.fnParams.y,
  );

  canvasContext.strokeStyle = color;
  canvasContext.fillStyle = color;

  let pixelStack = [];
  let currentPixel;
  let validColors = [];
  let invalidColors = [];
  invalidColors.push(color);

  if (!isInside(currentMode.fnParams.x, currentMode.fnParams.y)) {
    console.log("alarm!!!");
    return;
  }
  pixelStack.push({
    x1: currentMode.fnParams.x,
    x2: currentMode.fnParams.x,
    y: currentMode.fnParams.y,
    dy: 1,
  });
  pixelStack.push({
    x1: currentMode.fnParams.x,
    x2: currentMode.fnParams.x,
    y: currentMode.fnParams.y - 1,
    dy: -1,
  });

  while (pixelStack.length > 0) {
    // console.log("working...");
    currentPixel = pixelStack.pop();
    if (!currentPixel) return;
    let x = currentPixel.x1;
    if (isInside(x, currentPixel.y)) {
      while (isInside(x - 1, currentPixel.y)) {
        setPixelColor(x - 1, currentPixel.y);
        x--;
      }
      if (x < currentPixel.x1) {
        pixelStack.push({
          x1: x,
          x2: currentPixel.x1 - 1,
          y: currentPixel.y - currentPixel.dy,
          dy: -currentPixel.dy,
        });
      }
    }
    while (currentPixel.x1 <= currentPixel.x2) {
      while (isInside(currentPixel.x1, currentPixel.y)) {
        setPixelColor(currentPixel.x1, currentPixel.y);
        currentPixel.x1++;
      }
      if (currentPixel.x1 > x) {
        pixelStack.push({
          x1: x,
          x2: currentPixel.x1 - 1,
          y: currentPixel.y + currentPixel.dy,
          dy: currentPixel.dy,
        });
      }
      if (currentPixel.x1 - 1 > currentPixel.x2) {
        pixelStack.push({
          x1: currentPixel.x2 + 1,
          x2: currentPixel.x1 - 1,
          y: currentPixel.y - currentPixel.dy,
          dy: -currentPixel.dy,
        });
      }
      currentPixel.x1++;
      while (
        currentPixel.x1 < currentPixel.x2 &&
        !isInside(currentPixel.x1, currentPixel.y)
      ) {
        currentPixel.x1++;
      }
      x = currentPixel.x1;
    }
  }

  /**
   * Checks if the current x,y coordinates
   * are close enough to the color of the pixel that
   * was clicked to initiate the bucket fill.
   *
   * @param {number} x - x coord
   * @param {number} y - y coord
   */
  function isInside(x, y) {
    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) {
      return false;
    }
    let currentPixelHex = getPixelColor(x, y);
    if (validColors.includes(currentPixelHex)) {
      return true;
    }
    if (invalidColors.includes(currentPixelHex)) {
      return false;
    }
    let currentPixel = hexToRgb(currentPixelHex);
    let rdiff, gdiff, bdiff;
    let sourceColorRgb = hexToRgb(sourceColor);

    rdiff = Math.abs(sourceColorRgb[0] - currentPixel[0]);
    gdiff = Math.abs(sourceColorRgb[1] - currentPixel[1]);
    bdiff = Math.abs(sourceColorRgb[2] - currentPixel[2]);

    let valid = rdiff <= 5 && gdiff <= 5 && bdiff <= 5;
    // x >= 0 &&
    // x < canvas.width &&
    // y >= 0 &&
    // y < canvas.height;

    if (valid) {
      validColors.push(currentPixelHex);
    } else {
      invalidColors.push(currentPixelHex);
    }

    return valid;
  }

  function getPixelColor(x, y, format = "hex") {
    let pixel = canvasContext.getImageData(x, y, 1, 1);
    if (format == "rgb") {
      return [pixel.data[0], pixel.data[1], pixel.data[2]];
    }
    return rgbToHex(pixel);
  }

  function rgbToHex(rgb) {
    let hexRgb =
      `#${rgb.data[0].toString(16).padStart(2, "0")}` +
      `${rgb.data[1].toString(16).padStart(2, "0")}` +
      `${rgb.data[2].toString(16).padStart(2, "0")}`;

    return hexRgb;
  }

  /**
   * @param {string} hex
   *  A hex color code with a '#' expected at the beginning of the string
   * @returns Array<number>
   *  An array where each element corresponds to an RGB value
   */
  function hexToRgb(hex) {
    return hex
      .slice(1)
      .match(/../g)
      .map((i) => {
        return parseInt(i, 16);
      });
  }

  function setPixelColor(x, y) {
    canvasContext.fillRect(x, y, 1, 1);
  }
}

// points A and B, frac between 0 and 1
/**
 * @param {Vec2} a
 * @param {Vec2} b
 * @param {number} t
 */
function interpolate(a, b, t) {
  var nx = a.x + (b.x - a.x) * t;
  var ny = a.y + (b.y - a.y) * t;
  return { x: nx, y: ny };
}

function redoAction() {
  console.log("Before Redo: ", changeStack, changeStateIndex);
  if (changeStateIndex == changeStack.length - 1 || changeStack.length == 1) {
    console.log("redoAction(): returning");
    return;
  }
  canvasContext.putImageData(changeStack[++changeStateIndex], 0, 0);
  console.log("After Redo: ", changeStack, changeStateIndex);
}

function undoAction() {
  console.log("Before Undo: ", changeStack, changeStateIndex);
  if (changeStateIndex == 0) {
    console.log("undoAction(): returning");
    return;
  }

  canvasContext.putImageData(changeStack[--changeStateIndex], 0, 0);
  console.log("After Undo: ", changeStack, changeStateIndex);
}

function setMethod(method) {
  toolContext.clearRect(0, 0, toolCanvas.width, toolCanvas.height);
  modes[currentMode.mode].strokeWidth = currentMode.strokeWidth || 0;
  currentMode = modes[method];
  document.querySelector("#size").value = currentMode.strokeWidth || 0;
  document.querySelector("#sizeVal").value = currentMode.strokeWidth || 0;
  if (method == modes.Filling.mode) {
    document.querySelector("#size").disabled = true;
    document.querySelector("#sizeVal").disabled = true;
  } else {
    document.querySelector("#size").disabled = false;
    document.querySelector("#sizeVal").disabled = false;
  }

  document.querySelectorAll(".tool:has(button)").forEach((btn) => {
    btn.classList.remove("chosen");
  });
  document
    .querySelector(`.tool:has(#${currentMode.buttonId})`)
    .classList.add("chosen");
}

function calculateOffsets() {
  canvasOffsetX = canvas.getBoundingClientRect().x;
  canvasOffsetY = canvas.getBoundingClientRect().y;
}

function createCanvas() {
  let canvasContainerRect = canvasContainer.getBoundingClientRect();

  canvas = document.createElement("canvas");
  canvas.setAttribute("id", "canvas");
  canvas.setAttribute("width", `${canvasContainerRect.width}`);
  canvas.setAttribute("height", `${canvasContainerRect.height}`);

  toolCanvas = document.createElement("canvas");
  toolCanvas.setAttribute("id", "toolLayer");
  toolCanvas.setAttribute("width", `${canvasContainerRect.width}`);
  toolCanvas.setAttribute("height", `${canvasContainerRect.height}`);

  canvasContainer.replaceWith(canvas);
  canvas.after(toolCanvas);
  canvasContext = canvas.getContext("2d", { willReadFrequently: true });
  canvasContext.fillStyle = "white";
  canvasContext.fillRect(0, 0, canvas.width, canvas.height);
  canvasContext.lineWidth = 0;
  canvasContext.fillStyle = "black";

  toolContext = toolCanvas.getContext("2d", { willReadFrequently: true });
  toolContext.lineWidth = 0;
  toolContext.fillStyle = "black";

  changeStack.push(
    canvasContext.getImageData(0, 0, canvas.width, canvas.height),
  );
  changeStateIndex = 0;
}

function setupCanvasEvents() {
  canvas.addEventListener("mousedown", (event) => {
    // left click to perform action
    if (event.buttons == 1) {
      isClicking = true;

      if (changeStateIndex < changeStack.length - 1) {
        for (let i = changeStack.length; i > changeStateIndex + 1; i--) {
          changeStack.pop();
        }
      }

      if (currentMode.mode == "Filling") {
        // TODO: for some reason, making the bucketfill method use currentCoords for its starting coordinates causes
        // the fill algorithm to bug out, which forces me to use this edge case check. Find a way to not make this
        // soo clunky. We can try higher order functions or removing the mousemove event listener.
        currentMode.fnParams = {
          x: Math.round(event.x - canvasOffsetX),
          y: Math.round(event.y - canvasOffsetY),
        };
      }
      currentMode.fn();
    }
  });

  canvas.addEventListener("mouseup", () => {
    isClicking = false;
    changeStack.push(
      canvasContext.getImageData(0, 0, canvas.width, canvas.height),
    );
    changeStateIndex = changeStack.length - 1;
    console.log(changeStack, changeStateIndex);
  });

  canvas.addEventListener("mouseleave", () => {
    toolContext.clearRect(0, 0, toolCanvas.width, toolCanvas.height);
  });

  canvas.addEventListener("mousemove", (event) => {
    oldCoords = currentCoords;
    currentCoords = {
      x: Math.max(event.x - canvasOffsetX, 0),
      y: Math.max(event.y - canvasOffsetY, 0),
    };

    if (currentMode.mouseUpdate) {
      currentMode.fn();
    }
  });
}

function setupKeyEvents() {
  document.addEventListener("keydown", (event) => {
    switch (event.key) {
      case "b":
        isClicking = false;
        setMethod("Drawing");
        break;
      case "c":
        if (event.ctrlKey && event.altKey) {
          clearCanvas();
        }
        break;
      case "e":
        isClicking = false;
        setMethod("Erasing");
        break;
      case "E":
        isClicking = false;
        if (event.ctrlKey && event.shiftKey) {
          exportImage();
        }
        break;
      case "f":
        isClicking = false;
        setMethod("Filling");
        break;
      case "z":
        if (event.ctrlKey) {
          undoAction();
        }
        break;
      case "Z":
        if (event.ctrlKey && event.shiftKey) {
          redoAction();
        }
        break;
      default:
        break;
    }
  });
}

function setupUiEvents() {
  document.querySelector(".tool:has(#draw-btn)").classList.add("chosen");
  let brushSizeInput = document.querySelector("#ribbon > input#size");
  let brushSizeOutput = document.querySelector("#sizeVal");
  brushSizeOutput.value = brushSizeInput.value;

  brushSizeInput.addEventListener("input", (event) => {
    brushSizeOutput.value = event.target.value;
    modes[currentMode.mode].strokeWidth = event.target.value;
  });

  brushSizeInput.addEventListener("wheel", (event) => {
    if (event.deltaY < 0) {
      brushSizeInput.stepUp(2);
    } else {
      brushSizeInput.stepDown(2);
    }
    brushSizeOutput.value = brushSizeInput.value;
    modes[currentMode.mode].strokeWidth = brushSizeInput.value;
  });

  brushSizeOutput.addEventListener("change", (event) => {
    if (event.target.value > 500) {
      event.target.value = 500;
    }
    brushSizeInput.value = event.target.value;
    modes[currentMode.mode].strokeWidth = event.target.value;
  });

  brushSizeOutput.addEventListener("wheel", (event) => {
    if (event.deltaY < 0) {
      brushSizeOutput.stepUp(2);
    } else {
      brushSizeOutput.stepDown(2);
    }
    brushSizeInput.value = brushSizeOutput.value;
    modes[currentMode.mode].strokeWidth = brushSizeOutput.value;
  });

  document.querySelector("#colorPicker").addEventListener("change", (event) => {
    color = event.target.value;
    alphaColor = `${color}ff`;
    console.log("new color ", color);
    console.log("new color ", alphaColor);
  });
}

window.onload = function () {
  createCanvas();
  calculateOffsets();
  setupCanvasEvents();
  setupUiEvents();
  setupKeyEvents();
};
