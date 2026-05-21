const canvas = document.getElementById("networkCanvas");
const ctx = canvas.getContext("2d");

const colors = ["#2563eb", "#0891b2", "#16a34a"];

let width;
let height;
let particles = [];
let mouse = {
  x: null,
  y: null,
  radius: 220,
};

const settings = {
  particleCount: 70,
  maxDistance: 1010,
  minimumConnections: 1,
  maximumConnections: 5,
  offscreenMargin: 180,
  particleRadius: 2.4,
  speed: 0.28,
};

function getSimulationBounds() {
  return {
    left: -settings.offscreenMargin,
    right: width + settings.offscreenMargin,
    top: -settings.offscreenMargin,
    bottom: height + settings.offscreenMargin,
  };
}

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  width = canvas.offsetWidth;
  height = canvas.offsetHeight;

  canvas.width = width * dpr;
  canvas.height = height * dpr;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  createParticles();
}

function createParticles() {
  particles = [];

  const area = width * height;
  const responsiveCount = Math.floor(area / 7600);
  const total = Math.max(10, Math.min(settings.particleCount, responsiveCount));
  const bounds = getSimulationBounds();
  const simulationWidth = bounds.right - bounds.left;
  const simulationHeight = bounds.bottom - bounds.top;

  for (let i = 0; i < total; i++) {
    particles.push({
      x: bounds.left + Math.random() * simulationWidth,
      y: bounds.top + Math.random() * simulationHeight,
      vx: (Math.random() - 0.5) * settings.speed,
      vy: (Math.random() - 0.5) * settings.speed,
      radius: Math.random() * settings.particleRadius + 1.2,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
}

function drawParticle(particle) {
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
  ctx.fillStyle = particle.color;
  ctx.shadowColor = particle.color;
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.arc(particle.x, particle.y, particle.radius + 3.5, 0, Math.PI * 2);
  ctx.fillStyle = particle.color;
  ctx.globalAlpha = 0.1;
  ctx.fill();
  ctx.globalAlpha = 1;
}

function getNearestParticles(particle, currentIndex) {
  return particles
    .map((other, index) => {
      if (index === currentIndex) return null;

      const dx = particle.x - other.x;
      const dy = particle.y - other.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      return {
        particle: other,
        distance,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.distance - b.distance);
}

function drawConnection(p1, p2, distance, opacityMultiplier = 1) {
  const opacity = Math.max(0.08, 1 - distance / settings.maxDistance);

  const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
  gradient.addColorStop(0, p1.color);
  gradient.addColorStop(1, p2.color);

  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.strokeStyle = gradient;
  ctx.globalAlpha = Math.min(opacity * 0.42 * opacityMultiplier, 0.5);
  ctx.lineWidth = 1.15;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawLines() {
  const drawnConnections = new Set();
  const connectionCounts = new Array(particles.length).fill(0);
  const maximumConnections = Math.max(
    settings.minimumConnections,
    settings.maximumConnections,
  );

  for (let i = 0; i < particles.length; i++) {
    const p1 = particles[i];
    const nearest = getNearestParticles(p1, i);

    let connections = connectionCounts[i];

    for (let j = 0; j < nearest.length; j++) {
      if (connections >= maximumConnections) break;

      const p2 = nearest[j].particle;
      const distance = nearest[j].distance;
      const p2Index = particles.indexOf(p2);

      const key = i < p2Index ? `${i}-${p2Index}` : `${p2Index}-${i}`;

      if (drawnConnections.has(key)) continue;
      if (connectionCounts[p2Index] >= maximumConnections) continue;

      const isCloseEnough = distance < settings.maxDistance;
      const needsMinimumConnection = connections < settings.minimumConnections;

      if (isCloseEnough || needsMinimumConnection) {
        drawConnection(p1, p2, distance, isCloseEnough ? 1 : 0.42);

        drawnConnections.add(key);
        connectionCounts[i]++;
        connectionCounts[p2Index]++;
        connections++;
      }

      if (
        connections >= settings.minimumConnections &&
        distance > settings.maxDistance
      ) {
        break;
      }
    }
  }
}

function updateParticles() {
  const bounds = getSimulationBounds();

  particles.forEach((particle) => {
    particle.x += particle.vx;
    particle.y += particle.vy;

    if (particle.x <= bounds.left || particle.x >= bounds.right) {
      particle.vx *= -1;
    }

    if (particle.y <= bounds.top || particle.y >= bounds.bottom) {
      particle.vy *= -1;
    }

    if (mouse.x !== null && mouse.y !== null) {
      const dx = particle.x - mouse.x;
      const dy = particle.y - mouse.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < mouse.radius) {
        const force = (mouse.radius - distance) / mouse.radius;
        particle.x += dx * force * 0.014;
        particle.y += dy * force * 0.014;
      }
    }
  });
}

function drawMouseConnections() {
  if (mouse.x === null || mouse.y === null) return;

  particles.forEach((particle) => {
    const dx = particle.x - mouse.x;
    const dy = particle.y - mouse.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < mouse.radius) {
      const opacity = 1 - distance / mouse.radius;

      ctx.beginPath();
      ctx.moveTo(mouse.x, mouse.y);
      ctx.lineTo(particle.x, particle.y);
      ctx.strokeStyle = particle.color;
      ctx.globalAlpha = opacity * 0.36;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  });
}

function animate() {
  ctx.clearRect(0, 0, width, height);

  updateParticles();
  drawLines();
  drawMouseConnections();

  particles.forEach(drawParticle);

  requestAnimationFrame(animate);
}

window.addEventListener("resize", resizeCanvas);

window.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = event.clientX - rect.left;
  mouse.y = event.clientY - rect.top;
});

window.addEventListener("mouseleave", () => {
  mouse.x = null;
  mouse.y = null;
});

resizeCanvas();
animate();
