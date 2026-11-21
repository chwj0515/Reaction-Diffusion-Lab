(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const canvas = $("simCanvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const N = canvas.width, SIZE = N * N;
  let A = new Float32Array(SIZE), B = new Float32Array(SIZE);
  let nextA = new Float32Array(SIZE), nextB = new Float32Array(SIZE);
  let image = ctx.createImageData(N, N);
  let running = true, iterations = 0, animationId = 0;
  const params = { da: 1, db: .5, feed: .055, kill: .062, speed: 6 };


  function readControls() {
    for (const key of ["da", "db", "feed", "kill", "speed"]) {
      params[key] = Number($(key).value);
      $(key + "Out").textContent =
        key === "feed" || key === "kill" ? params[key].toFixed(4) :
        key === "speed" ? `${params[key]} steps/frame` : params[key].toFixed(2);
    }
  }

  function addSeed(cx, cy, radius = 6) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > radius * radius) continue;
        const x = (cx + dx + N) % N, y = (cy + dy + N) % N;
        const i = y * N + x;
        A[i] = .5; B[i] = .25;
      }
    }
  }

  function reset() {
    A.fill(1); B.fill(0); nextA.fill(1); nextB.fill(0);
    addSeed(N >> 1, N >> 1, 9);
    for (let i = 0; i < 18; i++) {
      addSeed(Math.floor(Math.random() * N), Math.floor(Math.random() * N), 2 + Math.floor(Math.random() * 3));
    }
    iterations = 0;
    render();
  }

  function laplacian(field, x, y) {
    const up = ((y + N - 1) % N) * N + x;
    const down = ((y + 1) % N) * N + x;
    const left = y * N + (x + N - 1) % N;
    const right = y * N + (x + 1) % N;
    const ul = ((y + N - 1) % N) * N + (x + N - 1) % N;
    const ur = ((y + N - 1) % N) * N + (x + 1) % N;
    const dl = ((y + 1) % N) * N + (x + N - 1) % N;
    const dr = ((y + 1) % N) * N + (x + 1) % N;
    return .2 * (field[up] + field[down] + field[left] + field[right]) +
           .05 * (field[ul] + field[ur] + field[dl] + field[dr]) - field[y * N + x];
  }

  function step() {
    const { da, db, feed, kill } = params;
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const i = y * N + x, a = A[i], b = B[i];
        const reaction = a * b * b;
        const dA = da * laplacian(A, x, y) - reaction + feed * (1 - a);
        const dB = db * laplacian(B, x, y) + reaction - (feed + kill) * b;
        nextA[i] = Math.max(0, Math.min(1, a + dA));
        nextB[i] = Math.max(0, Math.min(1, b + dB));
      }
    }
    [A, nextA] = [nextA, A];
    [B, nextB] = [nextB, B];
    iterations++;
  }

  function render() {
    const pixels = image.data;
    for (let i = 0; i < SIZE; i++) {
      const v = Math.max(0, Math.min(1, B[i] * 3.1));
      const t = Math.max(0, Math.min(1, (v - .04) * 1.7));
      const p = i * 4;
      pixels[p] = Math.round(8 + 30 * t + 190 * t * t);
      pixels[p + 1] = Math.round(14 + 120 * t + 90 * t * t);
      pixels[p + 2] = Math.round(25 + 210 * t);
      pixels[p + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
  }

  function animate() {
    if (running) {
      for (let i = 0; i < params.speed; i++) step();
      render();
    }
    animationId = requestAnimationFrame(animate);
  }



  for (const key of ["da", "db", "feed", "kill", "speed"]) {
    $(key).addEventListener("input", readControls);
  }

  let painting = false;
  function paint(event) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(N - 1, Math.floor((event.clientX - rect.left) / rect.width * N)));
    const y = Math.max(0, Math.min(N - 1, Math.floor((event.clientY - rect.top) / rect.height * N)));
    addSeed(x, y, 5);
  }
  canvas.addEventListener("pointerdown", event => {
    painting = true;
    canvas.setPointerCapture(event.pointerId);
    paint(event);
  });
  canvas.addEventListener("pointermove", event => { if (painting) paint(event); });
  canvas.addEventListener("pointerup", () => { painting = false; });
  canvas.addEventListener("pointercancel", () => { painting = false; });


  readControls();
  reset();
  animate();
  window.addEventListener("beforeunload", () => cancelAnimationFrame(animationId));
})();
