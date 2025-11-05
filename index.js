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

let keys = {
  ctrl: false,
  shift: false,
  alt: false,
};

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
    mouseUpdateCallback: () => {
      modes.Drawing.fn();
    },
    fnParams: null,
    mouseUpCallback: null,
  },
  Erasing: {
    mode: "Erasing",
    fn: erase,
    strokeWidth: 5,
    buttonId: "erase-btn",
    mouseUpdateCallback: () => {
      modes.Erasing.fn();
    },
    fnParams: null,
    mouseUpCallback: null,
  },
  Filling: {
    mode: "Filling",
    fn: bucketFill,
    buttonId: "fill-btn",
    mouseUpdateCallback: null,
    fnParams: null,
    mouseUpCallback: null,
    setupCallback: () => {
      document.querySelector("#size").disabled = true;
      document.querySelector("#sizeVal").disabled = true;
    },
    switchCallback: () => {
      document.querySelector("#size").disabled = false;
      document.querySelector("#sizeVal").disabled = false;
    },
  },
  Line: {
    mode: "Line",
    fn: () => {
      lineShape(currentMode.fnParams);
    },
    strokeWidth: 5,
    buttonId: "line-btn",
    mouseUpdateCallback: () => {
      modes.Line.fn();
    },
    mouseUpCallback: () => {
      currentMode.fnParams.commit = true;
      lineShape(currentMode.fnParams);
      currentMode.fnParams.commit = false;
    },
    setupCallback: () => {
      canvasContext.lineWidth = modes.Line.strokeWidth;
      toolContext.lineWidth = modes.Line.strokeWidth;
      canvasContext.strokeStyle = color;
    },
    switchCallback: () => {
      canvasContext.lineWidth = 1;
      toolCanvas.lineWidth = 1;
    },
    fnParams: {
      x: 0,
      y: 0,
      commit: false,
    },
  },
  Square: {
    mode: "Square",
    fn: () => {
      squareShape(currentMode.fnParams);
    },
    strokeWidth: 5,
    buttonId: "square-btn",
    mouseUpdateCallback: () => {
      modes.Square.fn();
    },
    mouseUpCallback: () => {
      currentMode.fnParams.commit = true;
      squareShape(currentMode.fnParams);
      currentMode.fnParams.commit = false;
    },
    fnParams: {
      x: 0,
      y: 0,
      commit: false,
    },
    setupCallback: () => {
      canvasContext.lineWidth = modes.Square.strokeWidth;
      toolContext.lineWidth = modes.Square.strokeWidth;
      canvasContext.strokeStyle = color;
      canvasContext.lineCap = "square";
      toolContext.lineCap = "square";
    },
    switchCallback: () => {
      canvasContext.lineWidth = 1;
      toolContext.lineWidth = 1;
      canvasContext.lineCap = "butt";
      toolContext.lineCap = "butt";
    },
  },
  Triangle: {
    mode: "Triangle",
    fn: () => {
      triangleShape(currentMode.fnParams);
    },
    strokeWidth: 5,
    buttonId: "triangle-btn",
    mouseUpdateCallback: () => {
      triangleShape(currentMode.fnParams);
    },
    mouseUpCallback: () => {
      currentMode.fnParams.commit = true;
      triangleShape(currentMode.fnParams);
      currentMode.fnParams.commit = false;
    },
    fnParams: {
      x: 0,
      y: 0,
      commit: false,
    },
    setupCallback: () => {
      canvasContext.lineWidth = modes.Triangle.strokeWidth;
      toolContext.lineWidth = modes.Triangle.strokeWidth;
      canvasContext.strokeStyle = color;
      canvasContext.lineCap = "round";
      toolContext.lineCap = "round";
    },
    switchCallback: () => {
      canvasContext.lineWidth = 1;
      toolContext.lineWidth = 1;
      canvasContext.lineCap = "butt";
      toolContext.lineCap = "butt";
    },
  },
  Circle: {
    mode: "Circle",
    buttonId: "circle-btn",
    fn: () => {
      circleShape(currentMode.fnParams);
    },
    strokeWidth: 5,
    fnParams: {
      x: 0,
      y: 0,
      commit: false,
    },
    mouseUpCallback: () => {
      currentMode.fnParams.commit = true;
      circleShape(currentMode.fnParams);
      currentMode.fnParams.commit = false;
    },
    mouseUpdateCallback: () => {
      modes.Circle.fn();
    },
  },
  Star: {
    mode: "Star",
    buttonId: "star-btn",
    fn: () => {
      starShape(currentMode.fnParams);
    },
    strokeWidth: 5,
    fnParams: {
      x: 0,
      y: 0,
      commit: false,
    },
    mouseUpCallback: null,
    mouseUpCallback: () => {
      currentMode.fnParams.commit = true;
      starShape(currentMode.fnParams);
      currentMode.fnParams.commit = false;
    },
    mouseUpdateCallback: () => {
      modes.Star.fn();
    },
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
    for (let i = 0; i <= 1; i += 0.5) {
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

function lineShape(params) {
  if (!isClicking && !params.commit) {
    return;
  }
  const origin = {
    x: currentMode.fnParams.x,
    y: currentMode.fnParams.y,
  };
  // toolContext.lineWidth = currentMode.strokeWidth;
  // canvasContext.lineWidth = currentMode.strokeWidth;
  toolContext.clearRect(0, 0, canvas.width, canvas.height);

  let context;
  if (params.commit) {
    context = canvasContext;
  } else {
    context = toolContext;
  }

  context.beginPath();
  context.lineWidth = currentMode.strokeWidth;
  context.moveTo(origin.x, origin.y);
  context.lineTo(currentCoords.x, currentCoords.y);
  context.strokeStyle = color;
  context.stroke();
  context.lineWidth = 1;
}

function squareShape(params) {
  if (!isClicking && !params.commit) {
    return;
  }
  let origin = {
    x: currentMode.fnParams.x,
    y: currentMode.fnParams.y,
  };
  let points;
  if (keys.ctrl) {
    // let radius = Math.round(
    //   Math.max(
    //     5,
    //     Math.sqrt(
    //       Math.pow(currentCoords.x - origin.x, 2) +
    //         Math.pow(currentCoords.y - origin.y, 2),
    //     ),
    //   ),
    // );
    let radii = {
      x: Math.max(1, Math.abs(origin.x - currentCoords.x)),
      y: Math.max(1, Math.abs(origin.y - currentCoords.y)),
    };
    points = [
      {
        x: origin.x + Math.cos(Math.PI / 4) * radii.x,
        y: origin.y + Math.sin(Math.PI / 4) * radii.y,
      },
      {
        x: origin.x + Math.cos((3 * Math.PI) / 4) * radii.x,
        y: origin.y + Math.sin((3 * Math.PI) / 4) * radii.y,
      },
      {
        x: origin.x + Math.cos((5 * Math.PI) / 4) * radii.x,
        y: origin.y + Math.sin((5 * Math.PI) / 4) * radii.y,
      },
      {
        x: origin.x + Math.cos((7 * Math.PI) / 4) * radii.x,
        y: origin.y + Math.sin((7 * Math.PI) / 4) * radii.y,
      },
    ];
  } else {
    points = [
      {
        x: origin.x,
        y: origin.y,
      },
      {
        x: currentCoords.x,
        y: origin.y,
      },
      {
        x: currentCoords.x,
        y: currentCoords.y,
      },
      {
        x: origin.x,
        y: currentCoords.y,
      },
    ];
  }
  toolContext.clearRect(0, 0, canvas.width, canvas.height);

  let context;
  if (params.commit) {
    context = canvasContext;
  } else {
    context = toolContext;
  }
  context.beginPath(0, 0, canvas.width, canvas.height);
  context.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    context.lineTo(points[i].x, points[i].y);
  }
  context.lineTo(points[0].x, points[0].y);
  context.lineWidth = currentMode.strokeWidth;
  context.stroke();
  context.lineWidth = 1;
}

function triangleShape(params) {
  if (!isClicking && !params.commit) {
    return;
  }
  const origin = {
    x: currentMode.fnParams.x,
    y: currentMode.fnParams.y,
  };
  let points;
  if (keys.ctrl) {
    let radii = {
      x: Math.max(1, Math.abs(origin.x - currentCoords.x)),
      y: Math.max(1, Math.abs(origin.y - currentCoords.y)),
    };
    points = [
      {
        x: origin.x + Math.cos((3 * Math.PI) / 2) * radii.x,
        y: origin.y + Math.sin((3 * Math.PI) / 2) * radii.y,
      },
      {
        x: origin.x + Math.cos((5 * Math.PI) / 6) * radii.x,
        y: origin.y + Math.sin((5 * Math.PI) / 6) * radii.y,
      },
      {
        x: origin.x + Math.cos(Math.PI / 6) * radii.x,
        y: origin.y + Math.sin(Math.PI / 6) * radii.y,
      },
    ];
  } else {
    points = [
      {
        x: origin.x,
        y: origin.y,
      },
      {
        x: currentCoords.x,
        y: currentCoords.y,
      },
      {
        x: origin.x,
        y: currentCoords.y,
      },
    ];
  }

  toolContext.clearRect(0, 0, toolCanvas.width, toolCanvas.height);

  let context;
  if (params.commit) {
    context = canvasContext;
  } else {
    context = toolContext;
  }

  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    context.lineTo(points[i].x, points[i].y);
  }
  context.lineTo(points[0].x, points[0].y);
  context.lineWidth = currentMode.strokeWidth;
  context.strokeStyle = color;
  context.stroke();
  context.lineWidth = 1;
}

function circleShape(params) {
  if (!isClicking && !params.commit) {
    return;
  }

  // The center of the circle will be a point between where the user clicked
  // first, and where the user's mouse is currently as long as the left mouse
  // button is being held
  let center;
  if (keys.ctrl) {
    center = {
      x: currentMode.fnParams.x,
      y: currentMode.fnParams.y,
    };
  } else {
    center = {
      x: Math.round((currentMode.fnParams.x + currentCoords.x) / 2),
      y: Math.round((currentMode.fnParams.y + currentCoords.y) / 2),
    };
  }

  // The x and y radii are not 1 to 1. Depending on where the user's mouse is,
  // the radius on the x axis may not be equal to the radius on the y axis. It can be
  // higher or lower. This means the user can make ellipses as opposed to just
  // circles
  let radii = {
    x: Math.max(1, Math.abs(center.x - currentCoords.x)),
    y: Math.max(1, Math.abs(center.y - currentCoords.y)),
  };

  toolContext.clearRect(0, 0, toolCanvas.width, toolCanvas.height);

  let context;
  if (params.commit) {
    context = canvasContext;
  } else {
    context = toolContext;
  }

  context.moveTo(center.x, center.y);
  context.beginPath();
  context.ellipse(center.x, center.y, radii.x, radii.y, 0, 0, 2 * Math.PI);
  context.strokeStyle = color;
  context.lineWidth = currentMode.strokeWidth;
  context.stroke();
}

function starShape(params) {
  if (!isClicking && !params.commit) {
    return;
  }

  let center = {
    x: currentMode.fnParams.x,
    y: currentMode.fnParams.y,
  };

  // Get the max of either the number 5 or
  // the distance between the start point and the current location of the
  // user's mouse
  let outerRadius = Math.round(
    Math.max(
      5,
      Math.sqrt(
        Math.pow(currentCoords.x - center.x, 2) +
          Math.pow(currentCoords.y - center.y, 2),
      ),
    ),
  );

  let innerRadius = outerRadius / 2.5;

  // Partitioning a circle into 10 different points
  // (5 for the outer radius, 5 for the inner) and making the star by drawing
  // alternating lines between the outer radius points and the inner radius
  // points will not yield a star whose top point is facing 'up'. Apply rotation of 270 degrees
  // to solve this
  let rotation = (Math.PI / 2) * 3;
  let increments = Math.PI / 5;
  let currentX, currentY;

  toolContext.clearRect(0, 0, toolCanvas.width, toolCanvas.height);
  let context;
  if (params.commit) {
    context = canvasContext;
  } else {
    context = toolContext;
  }

  context.beginPath();
  context.moveTo(center.x, center.y - outerRadius);

  for (let i = 0; i < 5; i++) {
    currentX = center.x + Math.cos(rotation) * outerRadius;
    currentY = center.y + Math.sin(rotation) * outerRadius;
    context.lineTo(currentX, currentY);
    rotation += increments;

    currentX = center.x + Math.cos(rotation) * innerRadius;
    currentY = center.y + Math.sin(rotation) * innerRadius;
    context.lineTo(currentX, currentY);
    rotation += increments;
  }

  context.lineTo(center.x, center.y - outerRadius);
  context.closePath();
  context.strokeStyle = color;
  context.lineWidth = currentMode.strokeWidth;
  context.stroke();
}

// points A and B, frac between 0 and 1
/**
 * @param {Vec2} a
 * @param {Vec2} b
 * @param {number} t
 */
function interpolate(a, b, t) {
  let nx = a.x + (b.x - a.x) * t;
  let ny = a.y + (b.y - a.y) * t;
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

/**
 * @param {string} method
 */
function setMethod(method) {
  if (currentMode.switchCallback) {
    currentMode.switchCallback();
  }

  toolContext.clearRect(0, 0, toolCanvas.width, toolCanvas.height);

  // Save the stroke width for this mode before switching to another mode
  modes[currentMode.mode].strokeWidth = currentMode.strokeWidth || 0;
  currentMode = modes[method];

  document.querySelector("#size").value = currentMode.strokeWidth || 0;
  document.querySelector("#sizeVal").value = currentMode.strokeWidth || 0;

  document.querySelector(".tool.chosen").classList.remove("chosen");
  document
    .querySelector(`.tool:has(#${currentMode.buttonId})`)
    .classList.add("chosen");

  if (currentMode.setupCallback) {
    currentMode.setupCallback();
  }
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
    if (event.buttons != 1) {
      return;
    }

    isClicking = true;

    // If the user decided to undo some of their changes, and afterwards
    // began to draw/erase/etc on the board again, then erase all states on the changeStack
    // until the current state index is the latest (last one in changeStack)
    if (changeStateIndex < changeStack.length - 1) {
      for (let i = changeStack.length; i > changeStateIndex + 1; i--) {
        changeStack.pop();
      }
    }

    // currentMode.fnParams = {
    //   x: Math.round(event.x - canvasOffsetX),
    //   y: Math.round(event.y - canvasOffsetY),
    // };

    currentMode.fnParams.x = Math.round(event.x - canvasOffsetX);
    currentMode.fnParams.y = Math.round(event.y - canvasOffsetY);

    currentMode.fn();
  });

  canvas.addEventListener("mouseup", () => {
    isClicking = false;

    // Mainly for shape modes. When we leave the mouse up,
    // we will 'commit' the shape to the main canvas instead of the overlay/tool
    // canvas. Commit it to the main canvas and THEN update the change stack
    if (currentMode.mouseUpCallback) {
      currentMode.mouseUpCallback();
    }
    changeStack.push(
      canvasContext.getImageData(0, 0, canvas.width, canvas.height),
    );
    changeStateIndex = changeStack.length - 1;
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

    if (currentMode.mouseUpdateCallback != null) {
      currentMode.mouseUpdateCallback();
    }
  });
}

function setupKeyEvents() {
  document.addEventListener("keydown", (event) => {
    keys.ctrl = event.ctrlKey;
    keys.shift = event.shiftKey;
    keys.alt = event.altKey;
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
  document.addEventListener("keyup", (event) => {
    keys.ctrl = event.ctrlKey;
    keys.shift = event.shiftKey;
    keys.alt = event.altKey;
  });
}

function setupUiEvents() {
  document.querySelector(".tool:has(#draw-btn)").classList.add("chosen");
  let brushSizeInput = document.querySelector("#ribbon input#size");
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
  });
}

window.onload = function () {
  createCanvas();
  calculateOffsets();
  setupCanvasEvents();
  setupUiEvents();
  setupKeyEvents();
};
