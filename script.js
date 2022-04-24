/**
 * Calcula el ángulo (en radianes) de un punto respecto al eje z
 *
 * @param {Number} x Posición (m) del punto en el eje x
 * @param {Number} z Posición (m) del punto en el eje z
 * @param {Number} b Distancia (m) de la carga
 *
 * @returns El ángulo (en radianes) respecto al eje z
 */
function obtenerBeta(x, z, b) {
  return Math.atan((x - b / 2) / z);
}

/**
 * Calcula el ángulo (en radianes) de un punto respecto al eje x
 *
 * @param {Number} x Posición (m) del punto en el eje x
 * @param {Number} z Posición (m) del punto en el eje z
 * @param {Number} b Distancia (m) de la carga
 *
 * @returns El ángulo (en radianes) respecto al eje x
 */
function obtenerAlfa(x, z, b) {
  return Math.atan((x + b / 2) / z) - obtenerBeta(x, z, b);
}

/**
 * Calcula el esfuerzo vertical para un conjunto de angulos alfa y beta
 *
 * @param {Number} q Magnitud de la carga en superficie (kN/m^2)
 * @param {Number} alfa Angulo (en radianes) respecto al eje x
 * @param {Number} beta Angulo (en radianes) respecto al eje z
 *
 * @returns La magnitud (kN/m^2) de esfuerzo vertical para un conjunto de
 * angulos
 */
function obtenerEsfuerzoVertical(alfa, beta, q) {
  return (q / Math.PI) * (alfa + Math.sin(alfa) * Math.cos(alfa + 2 * beta));
}

/**
 * Calcula el esfurezo vertical para unas coordenadas x, z dadas (en m)
 *
 * @param {Number} b Distancia (m) de la carga
 * @param {Number} q Magnitud de la carga a nivel de suelo (kN/m^2)
 * @param {Number} x Eje x: distancia (m) desde el centro a lo ancho de la superficie
 * @param {Number} z Eje z: profundidad (m) desde la superficie del suelo
 * @returns El esfuerzo vertical de q en la posición (x, z)
 */
function obtenerEsfuerzoPorCoordenadas(b, x, z, q) {
  const alfa = obtenerAlfa(x, z, b);
  const beta = obtenerBeta(x, z, b);

  return obtenerEsfuerzoVertical(alfa, beta, q);
}

/**
 * Construye una matriz de puntos de w * h metros, donde cada punto representa
 * el esfuerzo vertical para esas coordenadas (expresadas en (z, x))
 *
 * @param parametros Parametros de entrada para calcular la matriz de esfuerzos
 * @param {Number} parametros.b Distancia (m) de la carga
 * @param {Number} parametros.q Magnitud de la carga a nivel de suelo (kN/m^2)
 * @param {Number} parametros.s Factor de resolución: es el número que indica la
 * cantidad de subdivisiones B/s a partir de las cuáles se obtiene el tamaño de
 * la matriz, y se calculan los valores
 * @param {Number} parametros.w Ancho de la matríz. Se mide como `w` veces `b`.
 * @param {Number} parametros.h Altura de la matríz. Se mide como `h` veces `b`.
 *
 * @returns Una matriz de dos dimensiones, con coordenadas (z, x) que representa
 * los esfuerzos verticales en cada punto coordenado.
 */
function calcularMatrizDeEsfuerzos({
  b = 5,
  q = 10,
  s = 5_000,
  w = 2,
  h = 4,
} = {}) {
  const matrix = [];

  console.time("creating matrix");
  for (let z = 0; z < h * s; z++) {
    const row = [];

    for (let x = -w * s; x < w * s; x++) {
      row.push(obtenerEsfuerzoPorCoordenadas(b, (x * b) / s, (z * b) / s, q));
    }

    matrix.push(row);
  }

  console.timeEnd("creating matrix");

  return matrix;
}

window.onload = function () {
  const optionsForm = document.getElementById("options");
  optionsForm.onsubmit = onOptionsSubmit;
};

/**
 * @param {SubmitEvent} event
 */
function onOptionsSubmit(event) {
  event.preventDefault();

  const bInput = document.querySelector("#b_distance");
  const qInput = document.querySelector("#q_force");
  const graphDistanceSelect = document.querySelector("#graph_distance");

  const bValue = Number(bInput.value);
  const qValue = Number(qInput.value);
  const graphDistance = Number(graphDistanceSelect.value);

  const subdivisions = 200;

  const h = 8;
  const w = 7;

  const matrix = calcularMatrizDeEsfuerzos({
    b: bValue,
    q: qValue,
    s: subdivisions,
    h,
    w,
  });

  drawCanvas(matrix, {
    graphDistance,
    b: bValue,
    q: qValue,
    s: subdivisions,
    h,
  });
}

function drawCanvas(
  matrix,
  { b, graphDistance, s: graphUnitSubdivisions = 5_000, q, w = 2, h = 4 } = {}
) {
  /** @type {HTMLCanvasElement} */
  const canvas = document.querySelector(".canvas");

  const { width: cWidth, height: cHeight } = canvas.getBoundingClientRect();
  canvas.width = cWidth;
  canvas.height = cHeight;

  const center = cWidth / 2 - cWidth * 0.05;
  const baseY = cHeight * 0.1;

  const unitS = (cHeight * 0.8) / (h * graphUnitSubdivisions);

  const context = canvas.getContext("2d");

  context.clearRect(0, 0, cWidth, cHeight);

  console.time("drawing graph outline");
  drawGraphOutline(context, {
    cHeight,
    cWidth,
    center,
    baseY,
    unitS,
    graphDistance,
    subdivisions: graphUnitSubdivisions,
    w,
    h,
    b,
  });
  console.timeEnd("drawing graph outline");

  console.timeEnd("drawing graph label");
  drawGraphGradientLabel(context, {
    cHeight,
    cWidth,
    baseY,
    q,
    subdivisions: graphUnitSubdivisions,
  });
  console.timeEnd("drawing graph label");

  // Starts drawing matrix
  const coordToPosition = getCoordToPosition(center, baseY, unitS);
  const colHalf = Math.floor(matrix[0].length / 2);

  console.time("drawing matrix");
  for (let posZ in matrix) {
    for (let iX in matrix[posZ]) {
      const effort = matrix[posZ][iX];
      const posX = iX - colHalf;

      drawPoint(
        context,
        { posX, posZ, effort, unitS, q, center, cWidth },
        coordToPosition
      );
    }
  }

  console.timeEnd("drawing matrix");
}

/**
 *
 * @param {CanvasRenderingContext2D} context
 * @param {Object} params
 */
const drawGraphOutline = (
  context,
  {
    cHeight,
    cWidth,
    center,
    baseY,
    unitS,
    graphDistance,
    subdivisions,
    w,
    h,
    b,
  }
) => {
  context.strokeRect(center - cWidth * 0.4, baseY, cWidth * 0.8, cHeight * 0.8);

  /** @type {HTMLImageElement} */
  const qSurfaceImg = document.querySelector(".q-surface-image");
  context.drawImage(
    qSurfaceImg,
    center - (unitS * subdivisions) / 2,
    cHeight * 0.06,
    unitS * subdivisions,
    cHeight * 0.03
  );

  // Draw vertical separation lines
  for (let x = -6 * w; x < 6 * w; x += 1 / graphDistance) {
    context.strokeStyle =
      x == Math.floor(x)
        ? "rgba(191, 191, 191, 0.6)"
        : "rgba(191, 191, 191, 0.4)";

    const baseX = center + x * unitS * subdivisions;
    if (baseX >= center - cWidth * 0.4 && baseX <= center + cWidth * 0.4) {
      context.strokeRect(
        baseX,
        baseY,
        unitS,
        x == Math.floor(x) ? cHeight * 0.81 : cHeight * 0.8
      );

      if (x == Math.floor(x)) {
        context.font = "15px sans-serif";
        context.fillText(`${Math.abs(x) * b}`, baseX, cHeight * 0.915);
      }
    }
  }

  // Draw horizontal separation lines
  for (let z = 0; z < h; z += 1 / graphDistance) {
    context.strokeStyle =
      z == Math.floor(z)
        ? "rgba(191, 191, 191, 0.6)"
        : "rgba(191, 191, 191, 0.4)";

    context.strokeRect(
      z == Math.floor(z) ? center - cWidth * 0.41 : center - cWidth * 0.4,
      baseY + z * unitS * subdivisions,
      z == Math.floor(z) ? cWidth * 0.81 : cWidth * 0.8,
      unitS
    );

    if (z == Math.floor(z)) {
      context.font = "15px sans-serif";
      context.fillText(
        `${Math.abs(z) * b}`,
        center - cWidth * 0.415,
        baseY + z * unitS * subdivisions
      );
    }
  }
};

/**
 *
 * @param {CanvasRenderingContext2D} context
 * @param {Object} params
 */
const drawGraphGradientLabel = (context, { cWidth, cHeight, baseY, q }) => {
  const unitH = cHeight * 0.008;
  
  for (let x = 100; x >= 0; x--) {
    const percent = x / 100;
    
    const { r, g, b } = getColourGradientValue(
      [255, 0, 0],
      [0, 0, 255],
      1 - percent
    );

    context.beginPath();
    context.fillStyle = `rgba(${r}, ${g}, ${b}, 1)`;
    context.rect(cWidth * 0.9, baseY + (100 - x) * unitH, cWidth * 0.03, unitH);
    context.fill();

    if (x % 10 === 0) {
      context.fillStyle = `rgba(191, 191, 191, 0.6)`;
      context.fillRect(cWidth * 0.93, baseY + (100 - x) * unitH, cWidth * 0.01, cHeight * 0.001);
      
      context.fillStyle = `black`;
      context.font = `15px sans-serif`;
      context.fillText(`${q * percent}${percent === 1 ? ' kN/m²' : ''}`, cWidth * 0.943, baseY + (100 - x) * unitH + cHeight * 0.005);
    }
  }

  context.strokeStyle = 'black';
  context.strokeRect(cWidth * 0.9, baseY, cWidth * 0.03, cHeight * 0.8);
};

/**
 * @typedef Coords
 * @prop {Number} x
 * @prop {Number} y
 */

/**
 *
 * @param {Number} center
 * @param {Number} baseY
 * @param {Number} unitS
 * @returns {function(Number, Number):Coords}
 */
const getCoordToPosition = (center, baseY, unitS) => (x, z) => ({
  x: center + x * unitS,
  y: baseY + z * unitS,
});

const getColourGradientValue = (colour1, colour2, percent) => ({
  r: Math.floor(colour1[0] + percent * (colour2[0] - colour1[0])),
  g: Math.floor(colour1[1] + percent * (colour2[1] - colour1[1])),
  b: Math.floor(colour1[2] + percent * (colour2[2] - colour1[2])),
});

/**
 *
 * @param {CanvasRenderingContext2D} context
 * @param {Object} params
 * @param {Number} params.center,
 * @param {Number} params.cWidth,
 * @param {Number} params.posX
 * @param {Number} params.posZ
 * @param {Number} params.effort
 * @param {Number} params.unitS
 * @param {Number} params.q
 * @param {function(Number, Number):Coords} coordToPosition
 */
const drawPoint = (
  context,
  { center, cWidth, posX, posZ, effort, unitS, q },
  coordToPosition
) => {
  const { x, y } = coordToPosition(posX, posZ);

  const percent = effort / q;

  if (
    x >= center - cWidth * 0.4 &&
    x <= center + cWidth * 0.4 &&
    percent > 0.085
  ) {
    const { r, g, b } = getColourGradientValue(
      [255, 0, 0],
      [0, 0, 255],
      1 - percent
    );

    context.beginPath();
    context.fillStyle = `rgba(${r}, ${g}, ${b}, 1)`;

    context.rect(x, y, unitS, unitS);
    context.fill();
  }
};
