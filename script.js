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

  const presets = {
    spots:  { feed: .035, kill: .065, description: "작은 점 형태의 반점이 만들어지는 조건입니다." },
    stripes:{ feed: .04,  kill: .06,  description: "길게 이어지는 줄무늬와 물결 형태를 관찰합니다." },
    maze:   { feed: .029, kill: .057, description: "서로 연결된 미로 형태의 패턴을 관찰합니다." },
    waves:  { feed: .018, kill: .051, description: "초기 물질이 주변으로 퍼지는 파동 형태를 관찰합니다." }
  };

  function readControls() {
    for (const key of ["da", "db", "feed", "kill", "speed"]) {
      params[key] = Number($(key).value);
      $(key + "Out").textContent =
        key === "feed" || key === "kill" ? params[key].toFixed(4) :
        key === "speed" ? `${params[key]} steps/frame` : params[key].toFixed(2);
    }
    $("recordValues").textContent =
      `Dₐ ${params.da.toFixed(2)} · Dᵦ ${params.db.toFixed(2)} · f ${params.feed.toFixed(4)} · k ${params.kill.toFixed(4)}`;
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
    $("iterationCount").textContent = `${iterations.toLocaleString()} iterations`;
  }

  function animate() {
    if (running) {
      for (let i = 0; i < params.speed; i++) step();
      render();
    }
    animationId = requestAnimationFrame(animate);
  }

  function setRunning(value) {
    running = value;
    $("toggleBtn").textContent = running ? "Ⅱ 일시정지" : "▶ 다시 시작";
    $("statusText").textContent = running ? "실행 중" : "일시정지";
    $("statusDot").style.background = running ? "#b8ef68" : "#e6b85c";
  }

  function applyPreset(name) {
    const preset = presets[name];
    $("feed").value = preset.feed;
    $("kill").value = preset.kill;
    readControls();
    $("presetDescription")?.remove();
    document.querySelectorAll(".preset").forEach(btn => btn.classList.toggle("active", btn.dataset.preset === name));
    let desc = document.getElementById("presetDescription");
    if (!desc) {
      desc = document.createElement("p");
      desc.id = "presetDescription";
      desc.className = "hint";
      document.querySelector(".preset-block").appendChild(desc);
    }
    desc.textContent = preset.description;
    reset();
  }

  $("toggleBtn").addEventListener("click", () => setRunning(!running));
  $("resetBtn").addEventListener("click", reset);
  $("seedBtn").addEventListener("click", () => addSeed(Math.floor(Math.random() * N), Math.floor(Math.random() * N), 7));
  $("defaultsBtn").addEventListener("click", () => {
    $("da").value = 1; $("db").value = .5; $("feed").value = .055;
    $("kill").value = .062; $("speed").value = 6;
    readControls(); reset();
    document.querySelectorAll(".preset").forEach(btn => btn.classList.remove("active"));
  });

  for (const key of ["da", "db", "feed", "kill", "speed"]) {
    $(key).addEventListener("input", readControls);
  }
  document.querySelectorAll(".preset").forEach(btn => {
    btn.addEventListener("click", () => applyPreset(btn.dataset.preset));
  });

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

  $("saveBtn").addEventListener("click", () => {
    const link = document.createElement("a");
    link.download = "reaction-diffusion-pattern.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
  $("copyBtn").addEventListener("click", async () => {
    const text = `D_A=${params.da}, D_B=${params.db}, f=${params.feed}, k=${params.kill}`;
    const button = $("copyBtn");
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "복사 완료";
    } catch {
      button.textContent = text;
    }
    setTimeout(() => button.textContent = "현재 매개변수 복사", 1800);
  });

  readControls();
  reset();
  animate();
  window.addEventListener("beforeunload", () => cancelAnimationFrame(animationId));
})();
