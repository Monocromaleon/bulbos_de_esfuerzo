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

    for (let x = 0; x < w * s; x++) {
      row.push(obtenerEsfuerzoPorCoordenadas(b, (x * b) / s, (z * b) / s, q));
    }

    matrix.push(row);
  }

  console.timeEnd("creating matrix");
  console.log(matrix);

  return matrix;
}
