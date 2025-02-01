const canvas = document.getElementById("myCanvas");

const ctx = canvas.getContext("2d");

let xRotationAngle = 0.0;

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const FOV = 90;
const NEAR = 0.1;
const FAR = 1000;
const ASPECT_RATIO = HEIGHT / WIDTH;
const FOV_TAN = 1.0 / Math.tan(degToRad(FOV) / 2.0);

const projectionMatrix = [
  [ASPECT_RATIO * FOV_TAN, 0, 0, 0],
  [0, FOV_TAN, 0, 0],
  [0, 0, FAR / (FAR - NEAR), 1],
  [0, 0, (-FAR * NEAR) / (FAR - NEAR), 0],
];

function degToRad(deg) {
  return (deg * Math.PI) / 180.0;
}

const matrixMultiply = (mat1, mat2) => {
  let out = []; // size: mat1.length x mat2[0].length

  for (let k = 0; k < mat1.length; k++) {
    out.push(Array(mat2[0].length));
    for (let j = 0; j < mat2[0].length; j++) {
      let val = 0;
      for (let i = 0; i < mat1[0].length; i++) {
        val += mat1[k][i] * mat2[i][j];
      }
      out[k][j] = val;
    }
  }
  return out;
};

const applyProjection = (projMat, point) => {
  let pointMat = [[point.x, point.y, point.z, point.z]];

  let out = matrixMultiply(pointMat, projMat);

  if (out.length != 1 && out[0].length != 4) {
    console.error("something went wrong applying the projection");
    return null;
  }
  if (out[0][3] === 0.0) {
    return new Vector3(0, 0, 0);
  }
  return new Vector3(
    out[0][0] / out[0][3],
    out[0][1] / out[0][3],
    out[0][2] / out[0][3],
  );
};

const cube = new Mesh([
  // front
  new Triangle(
    new Vector3(0, 1, 0),
    new Vector3(0, 0, 0),
    new Vector3(1, 0, 0),
  ),
  new Triangle(
    new Vector3(0, 1, 0),
    new Vector3(1, 1, 0),
    new Vector3(1, 0, 0),
  ),
  // back
  new Triangle(
    new Vector3(0, 1, 1),
    new Vector3(0, 0, 1),
    new Vector3(1, 0, 1),
  ),
  new Triangle(
    new Vector3(0, 1, 1),
    new Vector3(1, 1, 1),
    new Vector3(1, 0, 1),
  ),
  // left
  new Triangle(
    new Vector3(0, 1, 1),
    new Vector3(0, 1, 0),
    new Vector3(0, 0, 0),
  ),
  new Triangle(
    new Vector3(0, 1, 1),
    new Vector3(0, 0, 1),
    new Vector3(1, 0, 1),
  ),
  // right
  new Triangle(
    new Vector3(1, 1, 0),
    new Vector3(1, 1, 1),
    new Vector3(1, 0, 0),
  ),
  new Triangle(
    new Vector3(1, 1, 0),
    new Vector3(1, 0, 1),
    new Vector3(1, 0, 0),
  ),
  // top
  new Triangle(
    new Vector3(0, 1, 1),
    new Vector3(1, 1, 1),
    new Vector3(0, 1, 0),
  ),
  new Triangle(
    new Vector3(0, 1, 1),
    new Vector3(1, 1, 0),
    new Vector3(0, 1, 0),
  ),
  // bottom
  new Triangle(
    new Vector3(0, 0, 1),
    new Vector3(1, 0, 1),
    new Vector3(0, 0, 0),
  ),
  new Triangle(
    new Vector3(0, 0, 1),
    new Vector3(1, 0, 0),
    new Vector3(0, 0, 0),
  ),
]);

const translate = (triangle, depth) => {
  let p1 = new Vector3(triangle.p1.x, triangle.p1.y, triangle.p1.z + depth);
  let p2 = new Vector3(triangle.p2.x, triangle.p2.y, triangle.p2.z + depth);
  let p3 = new Vector3(triangle.p3.x, triangle.p3.y, triangle.p3.z + depth);
  return new Triangle(p1, p2, p3);
};

const rotate = (triangle, rotationMatrix) => {
  let p1 = matrixMultiply(
    [[triangle.p1.x, triangle.p1.y, triangle.p1.z, triangle.p1.z]],
    rotationMatrix,
  );
  let p2 = matrixMultiply(
    [[triangle.p2.x, triangle.p2.y, triangle.p2.z, triangle.p2.z]],
    rotationMatrix,
  );
  let p3 = matrixMultiply(
    [[triangle.p3.x, triangle.p3.y, triangle.p3.z, triangle.p3.z]],
    rotationMatrix,
  );
  return new Triangle(
    new Vector3(p1[0][0], p1[0][1], p1[0][2]),
    new Vector3(p2[0][0], p2[0][1], p2[0][2]),
    new Vector3(p3[0][0], p3[0][1], p3[0][2]),
  );
};

const renderTriangle = (triangle) => {
  ctx.strokeStyle = "red";
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(
    triangle.p1.x * WIDTH + WIDTH / 2.0,
    triangle.p1.y * HEIGHT + HEIGHT / 2.0,
  );
  ctx.lineTo(
    triangle.p2.x * WIDTH + WIDTH / 2.0,
    triangle.p2.y * HEIGHT + HEIGHT / 2.0,
  );
  ctx.moveTo(
    triangle.p2.x * WIDTH + WIDTH / 2.0,
    triangle.p2.y * HEIGHT + HEIGHT / 2.0,
  );
  ctx.lineTo(
    triangle.p3.x * WIDTH + WIDTH / 2.0,
    triangle.p3.y * HEIGHT + HEIGHT / 2.0,
  );
  ctx.stroke();
};

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let rotationXMatrix = [
    [1, 0, 0, 0],
    [0, Math.cos(xRotationAngle / 2.0), Math.sin(xRotationAngle / 2.0), 0],
    [0, -Math.sin(xRotationAngle / 2.0), Math.cos(xRotationAngle / 2.0), 0],
    [0, 0, 0, 1],
  ];
  xRotationAngle += 0.03;

  cube.triangles.forEach((triangle) => {
    // Rotate
    let rotatedTriangle = rotate(triangle, rotationXMatrix);

    // Translate triangle
    let translatedTriangle = translate(rotatedTriangle, 5.0);

    let projectedTriangle = new Triangle(
      applyProjection(projectionMatrix, translatedTriangle.p1),
      applyProjection(projectionMatrix, translatedTriangle.p2),
      applyProjection(projectionMatrix, translatedTriangle.p3),
    );
    renderTriangle(projectedTriangle);
  });

  requestAnimationFrame(gameLoop);
}

gameLoop();
