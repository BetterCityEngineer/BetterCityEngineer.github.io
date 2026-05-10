// ----------------------------
// TABI
// ----------------------------
function showTab(id) {
  document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".tab-button").forEach(el => el.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  event.target.classList.add("active");
}

// ----------------------------
// POMOŽNE FUNKCIJE
// ----------------------------
function sliderValue(id) {
  return parseFloat(document.getElementById(id).value);
}

function setText(id, text) {
  document.getElementById(id).textContent = text;
}

function colorMapInfernoLike(t) {
  // t med 0 in 1
  t = Math.max(0, Math.min(1, t));
  const r = Math.floor(255 * Math.min(1, 1.8 * t));
  const g = Math.floor(255 * Math.max(0, Math.min(1, 1.6 * t - 0.35)));
  const b = Math.floor(255 * Math.max(0, 0.8 - 1.1 * t));
  return `rgb(${r},${g},${b})`;
}

// ============================================================
// 1) VZMETENJE
// ============================================================

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

  setText("sus_m_val", `${m.toFixed(0)} kg`);
  setText("sus_k_val", `${k.toFixed(0)} N/m`);
  setText("sus_c_val", `${c.toFixed(0)} Ns/m`);
  setText("sus_x0_val", `${x0.toFixed(2)} m`);
  setText("sus_tmax_val", `${tmax.toFixed(1)} s`);
  setText("sus_speed_val", `${speed.toFixed(1)}×`);

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

  // levo: animacija
  susCtx.strokeStyle = "#111";
  susCtx.lineWidth = 3;
  susCtx.beginPath();
  susCtx.moveTo(70, 300);
  susCtx.lineTo(250, 300);
  susCtx.stroke();

  const yBase = 260;
  const yMass = yBase - x * 180;

  // vzmet
  susCtx.strokeStyle = "#d22";
  susCtx.lineWidth = 3;
  susCtx.beginPath();
  susCtx.moveTo(160, 300);
  for (let i = 0; i <= 24; i++) {
    const yy = 300 + (yMass - 300) * i / 24;
    const xx = 160 + Math.sin(i * Math.PI) * 22;
    susCtx.lineTo(xx, yy);
  }
  susCtx.stroke();

  // masa
  susCtx.fillStyle = "#9fd3ff";
  susCtx.strokeStyle = "#111";
  susCtx.lineWidth = 2;
  susCtx.fillRect(110, yMass - 45, 100, 45);
  susCtx.strokeRect(110, yMass - 45, 100, 45);

  susCtx.fillStyle = "#111";
  susCtx.font = "16px Arial";
  susCtx.fillText("masa", 140, yMass - 18);

  // desno: graf
  const gx = 300, gy = 55, gw = 190, gh = 240;
  susCtx.strokeStyle = "#111";
  susCtx.lineWidth = 1;
  susCtx.strokeRect(gx, gy, gw, gh);
  susCtx.fillText("x(t)", gx + 5, gy - 10);

  susCtx.strokeStyle = "#1f6feb";
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
    const py = gy + gh / 2 - xx * 180;
    if (i === 0) susCtx.moveTo(px, py);
    else susCtx.lineTo(px, py);
  }
  susCtx.stroke();

  const markerX = gx + (susTime / tmax) * gw;
  susCtx.fillStyle = "#e63946";
  susCtx.beginPath();
  susCtx.arc(markerX, gy + gh / 2 - x * 180, 5, 0, 2 * Math.PI);
  susCtx.fill();

  susCtx.fillStyle = "#111";
  susCtx.fillText(`ω0 = ${omega0.toFixed(2)} rad/s`, 300, 325);
  susCtx.fillText(`ζ = ${zeta.toFixed(3)}`, 300, 345);
}

// ============================================================
// 2) TOPLOTA V CEVI
// ============================================================

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

  let nf = Tfluid.slice();
  let np = Tpipe.slice();
  let na = Tair.map(row => row.slice());

  const courant = Math.min(0.9, flow * 0.6);

  for (let i = 1; i < Nx; i++) {
    const adv = -courant * (Tfluid[i] - Tfluid[i - 1]);
    const cool = -hfp * (Tfluid[i] - Tpipe[i]);
    nf[i] = Tfluid[i] + adv + cool;
  }
  nf[0] = Tin;

  const mid = Math.floor(Ny / 2);

  for (let i = 0; i < Nx; i++) {
    const heatFromFluid = hfp * (Tfluid[i] - Tpipe[i]);
    const heatToAir = -hpa * (Tpipe[i] - Tair[mid][i]);
    np[i] = Tpipe[i] + heatFromFluid + heatToAir;
  }

  for (let i = 1; i < Nx - 1; i++) {
    np[i] += 0.08 * (Tpipe[i-1] - 2*Tpipe[i] + Tpipe[i+1]);
  }

  for (let j = 1; j < Ny - 1; j++) {
    for (let i = 1; i < Nx - 1; i++) {
      na[j][i] += diff * 0.001 * (
        Tair[j-1][i] + Tair[j+1][i] + Tair[j][i-1] + Tair[j][i+1] - 4*Tair[j][i]
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

  // rahlo hlajenje daleč od cevi
  for (let j = 0; j < Ny; j++) {
    for (let i = 0; i < Nx; i++) {
      na[j][i] += 0.0002 * (20 - na[j][i]);
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

  setText("heat_tin_val", `${Tin.toFixed(0)} °C`);
  setText("heat_flow_val", `${flow.toFixed(2)}`);
  setText("heat_hfp_val", `${hfp.toFixed(3)}`);
  setText("heat_hpa_val", `${hpa.toFixed(3)}`);
  setText("heat_diff_val", `${diff.toFixed(4)}`);
  setText("heat_speed_val", `${speed.toFixed(0)}×`);

  for (let s = 0; s < speed; s++) heatStep();

  heatCtx.clearRect(0, 0, heatCanvas.width, heatCanvas.height);

  const x0 = 45, y0 = 40, w = 520, h = 230;
  const cw = w / Nx;
  const ch = h / Ny;

  // okolica
  for (let j = 0; j < Ny; j++) {
    for (let i = 0; i < Nx; i++) {
      const t = (Tair[j][i] - 20) / 30; // zoom: 20-50 °C
      heatCtx.fillStyle = colorMapInfernoLike(t);
      heatCtx.fillRect(x0 + i*cw, y0 + j*ch, Math.ceil(cw), Math.ceil(ch));
    }
  }

  // cev
  const pipeY = y0 + h/2 - 18;
  for (let i = 0; i < Nx; i++) {
    const t = (Tpipe[i] - 20) / 80;
    heatCtx.fillStyle = colorMapInfernoLike(t);
    heatCtx.fillRect(x0 + i*cw, pipeY, Math.ceil(cw), 36);
  }

  heatCtx.strokeStyle = "#111";
  heatCtx.lineWidth = 3;
  heatCtx.strokeRect(x0, pipeY, w, 36);

  // puščice toka
  heatCtx.fillStyle = "#00e5ff";
  heatCtx.strokeStyle = "#00e5ff";
  for (let px = x0 + 40; px < x0 + w - 30; px += 60) {
    heatCtx.beginPath();
    heatCtx.moveTo(px, pipeY + 18);
    heatCtx.lineTo(px + 30, pipeY + 18);
    heatCtx.stroke();
    heatCtx.beginPath();
    heatCtx.moveTo(px + 30, pipeY + 18);
    heatCtx.lineTo(px + 20, pipeY + 12);
    heatCtx.lineTo(px + 20, pipeY + 24);
    heatCtx.closePath();
    heatCtx.fill();
  }

  heatCtx.fillStyle = "#111";
  heatCtx.font = "16px Arial";
  heatCtx.fillText("Topla tekočina v kovinski cevi segreva okolico", 45, 25);

  // graf spodaj
  const gx = 45, gy = 310, gw = 520, gh = 80;
  heatCtx.strokeStyle = "#111";
  heatCtx.lineWidth = 1;
  heatCtx.strokeRect(gx, gy, gw, gh);
  heatCtx.fillText("Temperature po dolžini cevi", gx, gy - 10);

  function plotArray(arr, color, minT, maxT) {
    heatCtx.strokeStyle = color;
    heatCtx.lineWidth = 2;
    heatCtx.beginPath();
    for (let i = 0; i < Nx; i++) {
      const px = gx + i * gw / (Nx - 1);
      const py = gy + gh - (arr[i] - minT) / (maxT - minT) * gh;
      if (i === 0) heatCtx.moveTo(px, py);
      else heatCtx.lineTo(px, py);
    }
    heatCtx.stroke();
  }

  plotArray(Tfluid, "#1f6feb", 15, 120);
  plotArray(Tpipe, "#e63946", 15, 120);
  plotArray(Tair[Math.floor(Ny/2)], "#2a9d8f", 15, 120);

  heatCtx.fillStyle = "#1f6feb"; heatCtx.fillText("tekočina", 580, 330);
  heatCtx.fillStyle = "#e63946"; heatCtx.fillText("cev", 580, 350);
  heatCtx.fillStyle = "#2a9d8f"; heatCtx.fillText("okolica", 580, 370);

  if (heatMouse) {
    const i = Math.max(0, Math.min(Nx-1, Math.round((heatMouse.x - x0) / w * (Nx-1))));
    const j = Math.max(0, Math.min(Ny-1, Math.round((heatMouse.y - y0) / h * (Ny-1))));
    if (heatMouse.x >= x0 && heatMouse.x <= x0+w && heatMouse.y >= y0 && heatMouse.y <= y0+h) {
      const temp = Math.abs(heatMouse.y - (pipeY + 18)) < 22 ? Tpipe[i] : Tair[j][i];
      document.getElementById("heatMouseInfo").textContent =
        `x = ${(i/(Nx-1)).toFixed(3)} m, T = ${temp.toFixed(1)} °C`;
      heatCtx.fillStyle = "white";
      heatCtx.strokeStyle = "#111";
      heatCtx.beginPath();
      heatCtx.arc(heatMouse.x, heatMouse.y, 6, 0, 2*Math.PI);
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

// ============================================================
// 3) MOTOR
// ============================================================

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

  setText("eng_rpm_val", `${rpm.toFixed(0)} rpm`);
  setText("eng_cr_val", `${cr.toFixed(1)} : 1`);
  setText("eng_patm_val", `${patm.toFixed(1)} bar`);
  setText("eng_pcomb_val", `${pcomb.toFixed(0)} bar`);
  setText("eng_speed_val", `${speed.toFixed(1)}×`);

  engFrame += speed * rpm / 1200;
  const deg = engFrame % 720;
  const rad = deg * Math.PI / 180;

  engCtx.clearRect(0, 0, engineCanvas.width, engineCanvas.height);

  // motor geometrija
  const cx = 180, crankY = 300;
  const r = 45;
  const strokePix = 150;
  const pistonY = 100 + (1 - Math.cos(rad)) / 2 * strokePix;
  const crankX = cx + r * Math.sin(rad);
  const crankPinY = crankY + r * Math.cos(rad);

  // cilinder
  engCtx.strokeStyle = "#111";
  engCtx.lineWidth = 4;
  engCtx.strokeRect(cx - 55, 80, 110, 190);

  // bat
  engCtx.fillStyle = "#ccc";
  engCtx.fillRect(cx - 50, pistonY, 100, 28);
  engCtx.strokeRect(cx - 50, pistonY, 100, 28);

  // ojnica in ročica
  engCtx.strokeStyle = "#1f6feb";
  engCtx.lineWidth = 5;
  engCtx.beginPath();
  engCtx.moveTo(crankX, crankPinY);
  engCtx.lineTo(cx, pistonY + 14);
  engCtx.stroke();

  engCtx.strokeStyle = "#e63946";
  engCtx.beginPath();
  engCtx.moveTo(cx, crankY);
  engCtx.lineTo(crankX, crankPinY);
  engCtx.stroke();

  engCtx.beginPath();
  engCtx.arc(cx, crankY, r, 0, 2*Math.PI);
  engCtx.strokeStyle = "#111";
  engCtx.lineWidth = 2;
  engCtx.stroke();

  engCtx.fillStyle = "#111";
  engCtx.beginPath();
  engCtx.arc(crankX, crankPinY, 7, 0, 2*Math.PI);
  engCtx.fill();

  // takt
  let takt = "";
  if (deg < 180) takt = "SESANJE";
  else if (deg < 360) takt = "KOMPRESIJA";
  else if (deg < 540) takt = "DELOVNI TAKT";
  else takt = "IZPUH";

  engCtx.font = "18px Arial";
  engCtx.fillStyle = "#111";
  engCtx.fillText(`Takt: ${takt}`, 75, 35);
  engCtx.fillText(`Kot: ${deg.toFixed(0)}°`, 75, 58);

  if (deg > 355 && deg < 385) {
    engCtx.font = "28px Arial";
    engCtx.fillText("🔥 VŽIG", cx - 45, 70);
  }

  // PV diagram
  const gx = 400, gy = 70, gw = 270, gh = 270;
  engCtx.strokeStyle = "#111";
  engCtx.lineWidth = 1;
  engCtx.strokeRect(gx, gy, gw, gh);
  engCtx.font = "16px Arial";
  engCtx.fillText("P–V diagram", gx, gy - 15);
  engCtx.fillText("V", gx + gw + 10, gy + gh + 5);
  engCtx.fillText("p", gx - 20, gy - 5);

  const Vmin = 1 / cr;
  const Vmax = 1;
  const Vnow = Vmin + (Vmax - Vmin) * (1 - Math.cos(rad)) / 2;
  const pnow = enginePressure(deg, cr, patm, pcomb, Vnow, Vmin, Vmax);

  engCtx.strokeStyle = "#1f6feb";
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
  engCtx.fillStyle = "#e63946";
  engCtx.beginPath();
  engCtx.arc(markerX, markerY, 6, 0, 2*Math.PI);
  engCtx.fill();

  engCtx.fillStyle = "#111";
  engCtx.font = "15px Arial";
  engCtx.fillText(`p = ${pnow.toFixed(1)} bar`, 410, 365);
  engCtx.fillText(`V relativno = ${Vnow.toFixed(3)}`, 410, 385);
}

// ----------------------------
// GLAVNA ANIMACIJA
// ----------------------------
resetHeat();

function loop() {
  drawSuspension();
  drawHeat();
  drawEngine();
  requestAnimationFrame(loop);
}

loop();
