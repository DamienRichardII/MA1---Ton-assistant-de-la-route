'use client';
import { useEffect, useRef } from 'react';

interface Car {
  x: number;
  y: number;
  speed: number;
  color: string;
  dir: 1 | -1;
  lane: number;
  w: number;
  h: number;
}

const COLORS = ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#34495e','#c0392b','#2980b9'];

function makeCar(canvas: HTMLCanvasElement, lane: number, dir: 1 | -1): Car {
  const roadLeft = canvas.width * 0.3;
  const roadRight = canvas.width * 0.7;
  const roadW = roadRight - roadLeft;
  const laneW = roadW / 4;
  const laneCenter = roadLeft + (lane + 0.5) * laneW;
  const w = 18; const h = 32;
  return {
    x: laneCenter - w / 2,
    y: dir === 1 ? -h - Math.random() * canvas.height : canvas.height + h + Math.random() * canvas.height,
    speed: (1.2 + Math.random() * 2.5) * dir,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    dir,
    lane,
    w,
    h,
  };
}

function drawCar(ctx: CanvasRenderingContext2D, car: Car) {
  const { x, y, w, h, color, dir } = car;
  ctx.save();
  // Body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 5);
  ctx.fill();
  // Windshield
  ctx.fillStyle = 'rgba(200,230,255,0.75)';
  if (dir === 1) {
    ctx.fillRect(x + 3, y + 6, w - 6, 8);
  } else {
    ctx.fillRect(x + 3, y + h - 14, w - 6, 8);
  }
  // Wheels
  ctx.fillStyle = '#222';
  ctx.fillRect(x - 3, y + 4, 5, 8);
  ctx.fillRect(x + w - 2, y + 4, 5, 8);
  ctx.fillRect(x - 3, y + h - 12, 5, 8);
  ctx.fillRect(x + w - 2, y + h - 12, 5, 8);
  // Headlights
  if (dir === -1) {
    ctx.fillStyle = 'rgba(255,255,120,0.9)';
    ctx.fillRect(x + 2, y, 5, 3);
    ctx.fillRect(x + w - 7, y, 5, 3);
  } else {
    ctx.fillStyle = 'rgba(255,80,80,0.85)';
    ctx.fillRect(x + 2, y + h - 3, 5, 3);
    ctx.fillRect(x + w - 7, y + h - 3, 5, 3);
  }
  ctx.restore();
}

export function RoadAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Init cars: lanes 0,1 go down (dir=1), lanes 2,3 go up (dir=-1)
    const cars: Car[] = [];
    for (let lane = 0; lane < 4; lane++) {
      const dir: 1 | -1 = lane < 2 ? 1 : -1;
      for (let i = 0; i < 4; i++) {
        const c = makeCar(canvas, lane, dir);
        c.y = dir === 1
          ? Math.random() * canvas.height
          : Math.random() * canvas.height + canvas.height;
        cars.push(c);
      }
    }

    let raf: number;
    let dashOffset = 0;

    const draw = () => {
      const W = canvas.width, H = canvas.height;
      const roadLeft = W * 0.3, roadRight = W * 0.7;
      const roadW = roadRight - roadLeft;
      const laneW = roadW / 4;

      // Background (grass / sidewalks)
      ctx.fillStyle = '#c8e6c9';
      ctx.fillRect(0, 0, W, H);
      // Road surface
      ctx.fillStyle = '#90a4ae';
      ctx.fillRect(roadLeft, 0, roadW, H);
      // Sidewalks
      ctx.fillStyle = '#b0bec5';
      ctx.fillRect(roadLeft - 12, 0, 12, H);
      ctx.fillRect(roadRight, 0, 12, H);

      // Lane markings
      dashOffset = (dashOffset + 2) % 80;
      // Center double line (between lane 1 and 2)
      const centerX = roadLeft + laneW * 2;
      ctx.strokeStyle = '#fff176';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(centerX - 2, 0); ctx.lineTo(centerX - 2, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(centerX + 2, 0); ctx.lineTo(centerX + 2, H); ctx.stroke();

      // Dashed lane lines
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([40, 40]);
      ctx.lineDashOffset = -dashOffset;
      for (let l = 1; l < 4; l++) {
        if (l === 2) continue;
        const lx = roadLeft + laneW * l;
        ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, H); ctx.stroke();
      }
      ctx.setLineDash([]);

      // Outer road edges
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(roadLeft, 0); ctx.lineTo(roadLeft, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(roadRight, 0); ctx.lineTo(roadRight, H); ctx.stroke();

      // Move & draw cars
      for (const car of cars) {
        car.y += car.speed;
        const offscreen = car.dir === 1 ? car.y > H + 50 : car.y < -50;
        if (offscreen) {
          const reset = makeCar(canvas, car.lane, car.dir);
          reset.y = car.dir === 1 ? -reset.h - 10 : H + reset.h + 10;
          Object.assign(car, reset);
        }
        drawCar(ctx, car);
      }

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0 opacity-30"
      style={{ display: 'block' }}
    />
  );
}
