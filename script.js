function showPage(id) {
  document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function sliderValue(id) {
  return parseFloat(document.getElementById(id).value);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function colorMap(t) {
  t = Math.max(0, Math.min(1, t));
  const r = Math.floor(255 * t);
  const g = Math.floor(80 + 150 * t);
  const b = Math.floor(255 * (1 - t));
  return `rgb(${r},${g},${b})`;
}

// ----------------------
// VZMETENJE
// ----------------------

const susCanvas = document.getElementById("suspensionCanvas");
const susCtx = susCanvas.getContext("2d");
let susTime = 0;

function resetSuspension() {
  document.getElementById("sus_m").value = 300;
  document.getElementById("sus_k").value = 15000;
  document.getElementById("sus_c").value = 1500;
  document.getElementById("sus_x0").value = 0.30;
  document.getElementById("sus_tmax").value = 5;
  document.getElementById("sus_speed").value = 1.5;
  susTime = 0;
}

function drawSuspension() {
  const m = sliderValue("sus_m");
  const k = sliderValue("sus_k");
  const c = sliderValue("sus_c");
  const x0 = sliderValue("sus_x0");
  const tmax = sliderValue("sus_tmax");
  const speed = sliderValue("sus_speed");

  setText("sus_m_val", m.toFixed(0) + " kg");
  setText("sus_k_val", k.toFixed(0) + " N/m");
  setText("sus_c_val", c.toFixed(0) + " Ns/m");
  setText("sus_x0_val", x0.toFixed(2) + " m");
  setText("sus_tmax_val", tmax.toFixed(1) + " s");
  setText("sus_speed_val", speed.toFixed(1) + "x");

  susTime += 0.016 * speed;
  if (susTime > tmax) susTime = 0;

  const omega0 = Math.sqrt(k / m);
  const zeta = c / (2 * Math.sqrt(k * m));
  const omegaD = omega0 * Math.sqrt(Math.max(0, 1 - zeta * zeta));

  let x;
  if (zeta < 1) {
    x = x0 * Math.exp(-zeta * omega0 * susTime) * Math.cos(omegaD * susTime);
  } else {
    x = x0 * Math.exp(-omega0 * susTime);
  }

  susCtx.clearRect(0, 0, susCanvas.width, susCanvas.height);

  susCtx.fillStyle = "#111";
  susCtx.font = "16px Arial";
  susCtx.fillText("Model vzmetenja", 20, 25);

  susCtx.strokeStyle = "#111";
  susCtx.lineWidth = 3;
  susCtx.beginPath();
  susCtx.moveTo(70, 280);
  susCtx.lineTo(260, 280);
  susCtx.stroke();

  const yMass = 230 - x * 160;

  susCtx.strokeStyle = "red";
  susCtx.lineWidth = 3;
  susCtx.beginPath();
  susCtx.moveTo(165, 280);
  for (let i = 0; i <= 24; i++) {
    const yy = 280 + (yMass - 280) * i / 24;
    const xx = 165 + Math.sin(i * Math.PI) * 22;
    susCtx.lineTo(xx, yy);
  }
  susCtx.stroke();

  susCtx.fillStyle = "#bde0fe";
  susCtx.strokeStyle = "#111";
  susCtx.fillRect(115, yMass - 42, 100, 42);
  susCtx.strokeRect(115, yMass - 42, 100, 42);

  const gx = 330, gy = 45, gw = 330, gh = 230;
  susCtx.strokeStyle = "#111";
  susCtx.lineWidth = 1;
  susCtx.strokeRect(gx, gy, gw, gh);
  susCtx.fillStyle = "#111";
  susCtx.fillText("Pomik x(t)", gx, gy - 10);

  susCtx.strokeStyle = "blue";
  susCtx.lineWidth = 2;
  susCtx.beginPath();

  for (let i = 0; i < gw; i++) {
    const tt = tmax * i / gw;
    let xx;
    if (zeta < 1) {
      xx = x0 * Math.exp(-zeta * omega0 * tt) * Math.cos(omegaD * tt);
    } else {
      xx = x0 * Math.exp(-omega0 * tt);
    }

    const px = gx + i;
    const py = gy + gh / 2 - xx * 150;

    if (i === 0) susCtx.moveTo(px, py);
    else susCtx.lineTo(px, py);
  }

  susCtx.stroke();

  const markerX = gx + susTime / tmax * gw;
  const markerY = gy + gh / 2 - x * 150;
  susCtx.fillStyle = "red";
  susCtx.beginPath();
  susCtx.arc(markerX, markerY, 5, 0, 2 * Math.PI);
  susCtx.fill();

  susCtx.fillStyle = "#111";
  susCtx.fillText("ω0 = " + omega0.toFixed(2) + " rad/s", 330, 305);
  susCtx.fillText("ζ = " + zeta.toFixed(3), 330, 325);
}

// ----------------------
// TOPLOTA
// ----------------------

const heatCanvas = document.getElementById("heatCanvas");
const heatCtx = heatCanvas.getContext("2d");

const Nx = 130;
const Ny = 60;

let Tfluid = new Array(Nx).fill(20);
let Tpipe = new Array(Nx).fill(20);
let Tair = Array.from({ length: Ny }, () => new Array(Nx).fill(20));
let heatMouse = null;

function resetHeat() {
  Tfluid = new Array(Nx).fill(20);
  Tpipe = new Array(Nx).fill(20);
  Tair = Array.from({ length: Ny }, () => new Array(Nx).fill(20));
  Tfluid[0] = sliderValue("heat_tin");
}

function heatStep() {
  const Tin = sliderValue("heat_tin");
  const flow = sliderValue("heat_flow");
  const hfp = sliderValue("heat_hfp");
  const hpa = sliderValue("heat_hpa");
  const diff = sliderValue("heat_diff") * 500;

  const nf = Tfluid.slice();
  const np = Tpipe.slice();
  const na = Tair.map(row => row.slice());

  const courant = Math.min(0.9, flow * 0.6);
  const mid = Math.floor(Ny / 2);

  for (let i = 1; i < Nx; i++) {
    nf[i] = Tfluid[i]
      - courant * (Tfluid[i] - Tfluid[i - 1])
      - hfp * (Tfluid[i] - Tpipe[i]);
  }

  nf[0] = Tin;

  for (let i = 0; i < Nx; i++) {
    np[i] = Tpipe[i]
      + hfp * (Tfluid[i] - Tpipe[i])
      - hpa * (Tpipe[i] - Tair[mid][i]);
  }

  for (let i = 1; i < Nx - 1; i++) {
    np[i] += 0.08 * (Tpipe[i - 1] - 2 * Tpipe[i] + Tpipe[i + 1]);
  }

  for (let j = 1; j < Ny - 1; j++) {
    for (let i = 1; i < Nx - 1; i++) {
      na[j][i] += diff * 0.001 * (
        Tair[j - 1][i] + Tair[j + 1][i] + Tair[j][i - 1] + Tair[j][i + 1] - 4 * Tair[j][i]
      );
    }
  }

  for (let offset = -3; offset <= 3; offset++) {
    const row = mid + offset;
    if (row >= 0 && row < Ny) {
      const strength = 0.6 / (Math.abs(offset) + 1);
      for (let i = 0; i < Nx; i++) {
        na[row][i] += strength * hpa * (Tpipe[i] - na[row][i]);
      }
    }
  }

  Tfluid = nf;
  Tpipe = np;
  Tair = na;
}

function drawHeat() {
  const Tin = sliderValue("heat_tin");
  const flow = sliderValue("heat_flow");
  const hfp = sliderValue("heat_hfp");
  const hpa = sliderValue("heat_hpa");
  const diff = sliderValue("heat_diff");
  const speed = sliderValue("heat_speed");

  setText("heat_tin_val", Tin.toFixed(0) + " °C");
  setText("heat_flow_val", flow.toFixed(2));
  setText("heat_hfp_val", hfp.toFixed(3));
  setText("heat_hpa_val", hpa.toFixed(3));
  setText("heat_diff_val", diff.toFixed(4));
  setText("heat_speed_val", speed.toFixed(0) + "x");

  for (let s = 0; s < speed; s++) heatStep();

  heatCtx.clearRect(0, 0, heatCanvas.width, heatCanvas.height);

  const x0 = 45;
  const y0 = 40;
  const w = 560;
  const h = 230;
  const cw = w / Nx;
  const ch = h / Ny;

  for (let j = 0; j < Ny; j++) {
    for (let i = 0; i < Nx; i++) {
      const t = (Tair[j][i] - 20) / 30;
      heatCtx.fillStyle = colorMap(t);
      heatCtx.fillRect(x0 + i * cw, y0 + j * ch, Math.ceil(cw), Math.ceil(ch));
    }
  }

  const pipeY = y0 + h / 2 - 18;

  for (let i = 0; i < Nx; i++) {
    const t = (Tpipe[i] - 20) / 80;
    heatCtx.fillStyle = colorMap(t);
    heatCtx.fillRect(x0 + i * cw, pipeY, Math.ceil(cw), 36);
  }

  heatCtx.strokeStyle = "#111";
  heatCtx.lineWidth = 3;
  heatCtx.strokeRect(x0, pipeY, w, 36);

  heatCtx.fillStyle = "#111";
  heatCtx.font = "16px Arial";
  heatCtx.fillText("Topla tekočina v cevi", 45, 25);

  heatCtx.fillStyle = "#00aaff";
  for (let px = x0 + 40; px < x0 + w - 30; px += 70) {
    heatCtx.fillText("→", px, pipeY + 24);
  }

  const gx = 45;
  const gy = 310;
  const gw = 560;
  const gh = 80;

  heatCtx.strokeStyle = "#111";
  heatCtx.strokeRect(gx, gy, gw, gh);
  heatCtx.fillStyle = "#111";
  heatCtx.fillText("Temperatura po dolžini", gx, gy - 10);

  function plot(arr, color) {
    heatCtx.strokeStyle = color;
    heatCtx.lineWidth = 2;
    heatCtx.beginPath();

    for (let i = 0; i < Nx; i++) {
      const px = gx + i * gw / (Nx - 1);
      const py = gy + gh - (arr[i] - 15) / 105 * gh;

      if (i === 0) heatCtx.moveTo(px, py);
      else heatCtx.lineTo(px, py);
    }

    heatCtx.stroke();
  }

  plot(Tfluid, "blue");
  plot(Tpipe, "red");
  plot(Tair[Math.floor(Ny / 2)], "green");

  heatCtx.fillStyle = "blue";
  heatCtx.fillText("tekočina", 625, 330);
  heatCtx.fillStyle = "red";
  heatCtx.fillText("cev", 625, 350);
  heatCtx.fillStyle = "green";
  heatCtx.fillText("okolica", 625, 370);

  if (heatMouse) {
    const i = Math.max(0, Math.min(Nx - 1, Math.round((heatMouse.x - x0) / w * (Nx - 1))));
    const j = Math.max(0, Math.min(Ny - 1, Math.round((heatMouse.y - y0) / h * (Ny - 1))));

    if (heatMouse.x >= x0 && heatMouse.x <= x0 + w && heatMouse.y >= y0 && heatMouse.y <= y0 + h) {
      const nearPipe = Math.abs(heatMouse.y - (pipeY + 18)) < 22;
      const temp = nearPipe ? Tpipe[i] : Tair[j][i];

      document.getElementById("heatMouseInfo").textContent =
        "x = " + (i / (Nx - 1)).toFixed(3) + " m, T = " + temp.toFixed(1) + " °C";

      heatCtx.fillStyle = "white";
      heatCtx.strokeStyle = "#111";
      heatCtx.beginPath();
      heatCtx.arc(heatMouse.x, heatMouse.y, 6, 0, 2 * Math.PI);
      heatCtx.fill();
      heatCtx.stroke();
    }
  }
}

heatCanvas.addEventListener("mousemove", function(e) {
  const rect = heatCanvas.getBoundingClientRect();
  heatMouse = {
    x: (e.clientX - rect.left) * heatCanvas.width / rect.width,
    y: (e.clientY - rect.top) * heatCanvas.height / rect.height
  };
});

// ----------------------
// MOTOR
// ----------------------

const engineCanvas = document.getElementById("engineCanvas");
const engCtx = engineCanvas.getContext("2d");
let engFrame = 0;

function resetEngine() {
  document.getElementById("eng_rpm").value = 1200;
  document.getElementById("eng_cr").value = 10;
  document.getElementById("eng_patm").value = 1;
  document.getElementById("eng_pcomb").value = 35;
  document.getElementById("eng_speed").value = 1.2;
  engFrame = 0;
}

function enginePressure(deg, cr, patm, pcomb, V, Vmin, Vmax) {
  const gamma = 1.35;

  if (deg < 180) return 0.85 * patm;
  if (deg < 360) return patm * Math.pow(Vmax / V, gamma);

  if (deg < 540) {
    if (deg < 375) return pcomb;
    return pcomb * Math.pow(Vmin / V, gamma);
  }

  return 1.15 * patm;
}

function drawEngine() {
  const rpm = sliderValue("eng_rpm");
  const cr = sliderValue("eng_cr");
  const patm = sliderValue("eng_patm");
  const pcomb = sliderValue("eng_pcomb");
  const speed = sliderValue("eng_speed");

  setText("eng_rpm_val", rpm.toFixed(0) + " rpm");
  setText("eng_cr_val", cr.toFixed(1) + " : 1");
  setText("eng_patm_val", patm.toFixed(1) + " bar");
  setText("eng_pcomb_val", pcomb.toFixed(0) + " bar");
  setText("eng_speed_val", speed.toFixed(1) + "x");

  engFrame += speed * rpm / 1200;
  const deg = engFrame % 720;
  const rad = deg * Math.PI / 180;

  engCtx.clearRect(0, 0, engineCanvas.width, engineCanvas.height);

  const cx = 185;
  const crankY = 300;
  const r = 45;
  const strokePix = 150;
  const pistonY = 100 + (1 - Math.cos(rad)) / 2 * strokePix;
  const crankX = cx + r * Math.sin(rad);
  const crankPinY = crankY + r * Math.cos(rad);

  engCtx.strokeStyle = "#111";
  engCtx.lineWidth = 4;
  engCtx.strokeRect(cx - 55, 80, 110, 190);

  engCtx.fillStyle = "#ccc";
  engCtx.fillRect(cx - 50, pistonY, 100, 28);
  engCtx.strokeRect(cx - 50, pistonY, 100, 28);

  engCtx.strokeStyle = "blue";
  engCtx.lineWidth = 5;
  engCtx.beginPath();
  engCtx.moveTo(crankX, crankPinY);
  engCtx.lineTo(cx, pistonY + 14);
  engCtx.stroke();

  engCtx.strokeStyle = "red";
  engCtx.beginPath();
  engCtx.moveTo(cx, crankY);
  engCtx.lineTo(crankX, crankPinY);
  engCtx.stroke();

  engCtx.strokeStyle = "#111";
  engCtx.lineWidth = 2;
  engCtx.beginPath();
  engCtx.arc(cx, crankY, r, 0, 2 * Math.PI);
  engCtx.stroke();

  let takt = "";
  if (deg < 180) takt = "SESANJE";
  else if (deg < 360) takt = "KOMPRESIJA";
  else if (deg < 540) takt = "DELOVNI TAKT";
  else takt = "IZPUH";

  engCtx.fillStyle = "#111";
  engCtx.font = "18px Arial";
  engCtx.fillText("Takt: " + takt, 55, 35);
  engCtx.fillText("Kot: " + deg.toFixed(0) + "°", 55, 58);

  if (deg > 355 && deg < 385) {
    engCtx.fillText("VŽIG", cx - 25, 70);
  }

  const gx = 410;
  const gy = 70;
  const gw = 280;
  const gh = 270;

  engCtx.strokeStyle = "#111";
  engCtx.lineWidth = 1;
  engCtx.strokeRect(gx, gy, gw, gh);
  engCtx.fillText("P–V diagram", gx, gy - 15);

  const Vmin = 1 / cr;
  const Vmax = 1;
  const Vnow = Vmin + (Vmax - Vmin) * (1 - Math.cos(rad)) / 2;
  const pnow = enginePressure(deg, cr, patm, pcomb, Vnow, Vmin, Vmax);

  engCtx.strokeStyle = "blue";
  engCtx.lineWidth = 2;
  engCtx.beginPath();

  for (let a = 0; a <= 720; a += 2) {
    const rr = a * Math.PI / 180;
    const V = Vmin + (Vmax - Vmin) * (1 - Math.cos(rr)) / 2;
    const p = enginePressure(a, cr, patm, pcomb, V, Vmin, Vmax);

    const px = gx + (V - Vmin) / (Vmax - Vmin) * gw;
    const py = gy + gh - p / Math.max(80, pcomb * 1.15) * gh;

    if (a === 0) engCtx.moveTo(px, py);
    else engCtx.lineTo(px, py);
  }

  engCtx.stroke();

  const markerX = gx + (Vnow - Vmin) / (Vmax - Vmin) * gw;
  const markerY = gy + gh - pnow / Math.max(80, pcomb * 1.15) * gh;

  engCtx.fillStyle = "red";
  engCtx.beginPath();
  engCtx.arc(markerX, markerY, 6, 0, 2 * Math.PI);
  engCtx.fill();

  engCtx.fillStyle = "#111";
  engCtx.font = "15px Arial";
  engCtx.fillText("p = " + pnow.toFixed(1) + " bar", 420, 365);
  engCtx.fillText("V rel. = " + Vnow.toFixed(3), 420, 385);
}

// ----------------------
// GLAVNA ZANKA
// ----------------------

resetHeat();

function loop() {
  drawSuspension();
  drawHeat();
  drawEngine();
  requestAnimationFrame(loop);
}

loop();
