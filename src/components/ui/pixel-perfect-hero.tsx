"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STACK_LOGOS = [
  () => (
    <svg
      className="h-[14px] sm:h-[18px] fill-foreground/75 select-none opacity-60 hover:opacity-100 transition-opacity duration-300"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 394 79"
      aria-label="Next.js"
    >
      <path d="M261.919 0.0330722H330.547V12.7H303.323V79.339H289.71V12.7H261.919V0.0330722Z" />
      <path d="M149.052 0.0330722V12.7H94.0421V33.0772H138.281V45.7441H94.0421V66.6721H149.052V79.339H80.43V12.7H80.4243V0.0330722H149.052Z" />
      <path d="M183.32 0.0661486H165.506L229.312 79.3721H247.178L215.271 39.7464L247.127 0.126654L229.312 0.154184L206.352 28.6697L183.32 0.0661486Z" />
      <path d="M201.6 56.7148L192.679 45.6229L165.455 79.4326H183.32L201.6 56.7148Z" />
      <path clipRule="evenodd" d="M80.907 79.339L17.0151 0H0V79.3059H13.6121V16.9516L63.8067 79.339H80.907Z" fillRule="evenodd" />
    </svg>
  ),
  () => (
    <div className="flex items-center gap-2 text-sm font-semibold text-foreground/75 opacity-60 hover:opacity-100 transition-opacity duration-300">
      <svg className="h-6 w-6" viewBox="0 0 109 113" fill="none" aria-label="Supabase">
        <path
          d="M63.7076 110.293V99.5509C63.7076 97.5835 65.303 95.988 67.2705 95.988H98.9998C104.404 95.988 108.784 91.608 108.784 86.2035V59.5485C108.784 57.581 110.38 55.9855 112.347 55.9855H120.5C125.905 55.9855 130.285 51.6055 130.285 46.201V16.7945C130.285 11.39 125.905 7.01001 120.5 7.01001H89.2705C87.303 7.01001 85.7076 5.41451 85.7076 3.44701V0H63.7076V110.293Z"
          fill="url(#supabase-grad)"
        />
        <path
          d="M45.2924 2.70697V13.449C45.2924 15.4165 43.697 17.012 41.7295 17.012H10.0002C4.59568 17.012 0.215698 21.392 0.215698 26.7965V53.4515C0.215698 55.419 1.8112 57.0145 3.7787 57.0145H11.9312C17.3357 57.0145 21.7157 61.3945 21.7157 66.799V96.2055C21.7157 101.61 26.0957 105.99 31.5002 105.99H62.7295C64.697 105.99 66.2924 107.585 66.2924 109.553V113H45.2924V2.70697Z"
          fill="#3ECF8E"
        />
        <defs>
          <linearGradient id="supabase-grad" x1="63.7076" y1="0" x2="130.285" y2="55.9855" gradientUnits="userSpaceOnUse">
            <stop stopColor="#249361" />
            <stop offset="1" stopColor="#3ECF8E" />
          </linearGradient>
        </defs>
      </svg>
      Supabase
    </div>
  ),
  () => (
    <div className="flex items-center gap-2 text-sm font-semibold text-foreground/75 opacity-60 hover:opacity-100 transition-opacity duration-300">
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-label="OpenAI">
        <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.899 5.985 5.985 0 0 0 3.997-2.9 6.056 6.056 0 0 0 3.572-2.068 5.99 5.99 0 0 0 2.772-1.198zm-9.008-12.3a4.476 4.476 0 0 1 2.675 1.153l-1.52 2.63a2.976 2.976 0 0 0-1.54-.45 2.955 2.955 0 0 0-2.8 2.02 2.976 2.976 0 0 0 .45 1.54l-2.63 1.52a4.476 4.476 0 0 1-1.153-2.675 4.51 4.51 0 0 1 4.518-4.518zm-6.54 14.6a4.476 4.476 0 0 1-2.675-1.153l1.52-2.63a2.976 2.976 0 0 0 1.54.45 2.955 2.955 0 0 0 2.8-2.02 2.976 2.976 0 0 0-.45-1.54l2.63-1.52a4.476 4.476 0 0 1 1.153 2.675 4.51 4.51 0 0 1-4.518 4.518zm12.54-3.08a4.476 4.476 0 0 1-2.675 1.153l-1.52-2.63a2.976 2.976 0 0 0-1.54-.45 2.955 2.955 0 0 0-2.8 2.02 2.976 2.976 0 0 0 .45 1.54l2.63 1.52a4.476 4.476 0 0 1-1.153-2.675 4.51 4.51 0 0 1 4.518-4.518z" />
      </svg>
      OpenAI
    </div>
  ),
  () => (
    <svg
      className="h-[16px] sm:h-[20px] fill-foreground/75 select-none opacity-60 hover:opacity-100 transition-opacity duration-300"
      viewBox="0 0 283 64"
      aria-label="Vercel"
    >
      <path d="M141.68 16.25c-11.04 0-19.92 8.94-19.92 19.96 0 11.02 8.88 19.96 19.92 19.96 11.04 0 19.92-8.94 19.92-19.96 0-11.02-8.88-19.96-19.92-19.96zM0 0h64v64H0V0zm73.34 0h64v64h-64V0zm73.34 0h64v64h-64V0zm73.34 0h64v64h-64V0z" />
    </svg>
  ),
];

type Pixel = {
  x: number;
  y: number;
  color: string;
  ctx: CanvasRenderingContext2D;
  speed: number;
  size: number;
  sizeStep: number;
  minSize: number;
  maxSizeInt: number;
  maxSize: number;
  delay: number;
  counter: number;
  counterStep: number;
  isIdle: boolean;
  isReverse: boolean;
  isShimmer: boolean;
  draw: () => void;
  appear: () => void;
  disappear: () => void;
  shimmer: () => void;
};

function createPixel(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  color: string,
  baseSpeed: number,
  delay: number
): Pixel {
  const rand = (min: number, max: number) => Math.random() * (max - min) + min;

  const p: Pixel = {
    x,
    y,
    color,
    ctx,
    speed: rand(0.08, 0.4) * baseSpeed,
    size: 0,
    sizeStep: rand(0.12, 0.28),
    minSize: 0.5,
    maxSizeInt: 2,
    maxSize: rand(0.5, 2),
    delay,
    counter: 0,
    counterStep: rand(1.8, 3.2) + (canvas.width + canvas.height) * 0.008,
    isIdle: false,
    isReverse: false,
    isShimmer: false,
    draw() {
      const offset = p.maxSizeInt * 0.5 - p.size * 0.5;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x + offset, p.y + offset, p.size, p.size);
    },
    appear() {
      p.isIdle = false;
      if (p.counter <= p.delay) {
        p.counter += p.counterStep;
        return;
      }
      if (p.size >= p.maxSize) p.isShimmer = true;
      if (p.isShimmer) p.shimmer();
      else p.size += p.sizeStep;
      p.draw();
    },
    disappear() {
      p.isShimmer = false;
      p.counter = 0;
      if (p.size <= 0) {
        p.isIdle = true;
        return;
      }
      p.size -= 0.1;
      p.draw();
    },
    shimmer() {
      if (p.size >= p.maxSize) p.isReverse = true;
      else if (p.size <= p.minSize) p.isReverse = false;
      if (p.isReverse) p.size -= p.speed;
      else p.size += p.speed;
    },
  };

  return p;
}

type PixelCanvasProps = {
  colors: string[];
  gap?: number;
  speed?: number;
};

function PixelCanvas({ colors, gap = 5, speed = 30 }: PixelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pixelsRef = useRef<Pixel[]>([]);
  const animationRef = useRef<number>(0);
  const lastFrameRef = useRef(performance.now());
  const reducedMotionRef = useRef(false);

  const init = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || colors.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = wrap.getBoundingClientRect();
    const w = Math.floor(width);
    const h = Math.floor(height);
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const effectiveSpeed = reducedMotionRef.current ? 0 : Math.min(speed, 100) * 0.001;
    const pixels: Pixel[] = [];

    for (let x = 0; x < w; x += gap) {
      for (let y = 0; y < h; y += gap) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        const dx = x - w / 2;
        const dy = y - h / 2;
        const delay = reducedMotionRef.current ? 0 : Math.sqrt(dx * dx + dy * dy) * 0.65;
        pixels.push(createPixel(ctx, canvas, x, y, color, effectiveSpeed, delay));
      }
    }

    pixelsRef.current = pixels;
  }, [colors, gap, speed]);

  const animate = useCallback((mode: "appear" | "disappear") => {
    cancelAnimationFrame(animationRef.current);
    const frameInterval = 1000 / 60;

    const loop = () => {
      animationRef.current = requestAnimationFrame(loop);

      const now = performance.now();
      const elapsed = now - lastFrameRef.current;
      if (elapsed < frameInterval) return;
      lastFrameRef.current = now - (elapsed % frameInterval);

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const pixels = pixelsRef.current;
      for (const pixel of pixels) pixel[mode]();

      if (pixels.every((p) => p.isIdle)) {
        cancelAnimationFrame(animationRef.current);
      }
    };

    animationRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    init();

    const resizeObserver = new ResizeObserver(() => init());
    if (wrapRef.current) resizeObserver.observe(wrapRef.current);

    animate("appear");

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationRef.current);
    };
  }, [init, animate]);

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}

export interface PixelHeroProps {
  word1?: string;
  word2?: string;
  eyebrow?: string;
  description?: string;
  primaryCta?: string;
  primaryCtaMobile?: string;
  secondaryCta?: string;
  secondaryCtaMobile?: string;
  primaryHref?: string;
  secondaryHref?: string;
  onPrimaryClick?: () => void;
  onSecondaryClick?: () => void;
  stackLabel?: string;
}

const primaryBtnClass =
  "relative inline-flex h-10 md:h-12 items-center justify-center gap-1.5 md:gap-2 rounded-xl bg-gradient-to-b from-primary/90 to-primary px-4 md:px-8 text-xs md:text-sm font-semibold text-primary-foreground shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_2px_4px_rgba(0,0,0,0.15),0_12px_24px_rgba(0,0,0,0.15)] ring-1 ring-primary/20 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer";

const secondaryBtnClass =
  "relative inline-flex h-10 md:h-12 items-center justify-center gap-1.5 md:gap-2 rounded-xl bg-gradient-to-b from-card/80 to-card px-4 md:px-8 text-xs md:text-sm font-semibold text-card-foreground shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.05),0_12px_24px_rgba(0,0,0,0.05)] ring-1 ring-border/50 backdrop-blur-md transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer";

export function PixelHero({
  word1 = "AURA",
  word2 = "METNMAT",
  eyebrow = "Powered by METNMAT",
  description = "AI Requirement Gathering & Stakeholder Interview Platform for Any Enterprise",
  primaryCta = "Admin Dashboard",
  primaryCtaMobile = "Admin",
  secondaryCta = "Onboard Company",
  secondaryCtaMobile = "Onboard",
  primaryHref,
  secondaryHref,
  onPrimaryClick,
  onSecondaryClick,
  stackLabel = "Built on enterprise-grade technology",
}: PixelHeroProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [themeColors, setThemeColors] = useState<string[]>([]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const div = document.createElement("div");
    document.body.appendChild(div);
    div.className = "text-muted-foreground";
    const muted = getComputedStyle(div).color;
    div.className = "text-primary";
    const primary = getComputedStyle(div).color;
    document.body.removeChild(div);

    setThemeColors([muted, muted, muted, muted, primary]);

    const loadTimer = setTimeout(() => setIsLoaded(true), 50);
    return () => clearTimeout(loadTimer);
  }, []);

  const primaryContent = (
    <>
      <span className="inline md:hidden">{primaryCtaMobile}</span>
      <span className="hidden md:inline">{primaryCta}</span>
      <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
    </>
  );

  const secondaryContent = (
    <>
      <Building2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
      <span className="inline md:hidden">{secondaryCtaMobile}</span>
      <span className="hidden md:inline">{secondaryCta}</span>
    </>
  );

  return (
    <div className="relative w-full min-h-[100dvh] bg-background flex flex-col justify-between md:justify-center md:gap-6 py-8 md:py-0 px-2 sm:px-6 overflow-hidden select-none isolate">
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 25s linear infinite;
        }
        .tahoe-glass-text {
            color: transparent;
            background: linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.4) 25%, rgba(255, 255, 255, 0.1) 45%, rgba(255, 255, 255, 0.9) 55%, rgba(255, 255, 255, 0.2) 75%, rgba(255, 255, 255, 1) 100%);
            background-size: 200% auto;
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-stroke: 1.5px rgba(255, 255, 255, 0.3);
            filter: drop-shadow(0 15px 35px rgba(0,0,0,0.4)) drop-shadow(0 5px 10px rgba(0,0,0,0.2));
            animation: shimmer 8s linear infinite;
        }
        @keyframes shimmer {
            0% { background-position: 200% center; }
            100% { background-position: 0% center; }
        }
      `}</style>

      <div className="absolute inset-0 z-0 pointer-events-none">
        {themeColors.length > 0 && <PixelCanvas colors={themeColors} gap={6} speed={30} />}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,var(--background)_100%)] pointer-events-none opacity-80" />
      </div>

      <div className="flex flex-col items-center justify-center text-center order-1 md:order-1 mt-28 sm:mt-0 pointer-events-none w-full">
        <p className="text-[11px] sm:text-xs uppercase tracking-[0.3em] text-primary/90 font-medium mb-4 md:mb-6">
          {eyebrow}
        </p>
        <h1 className="tahoe-glass-text flex flex-row items-center justify-center gap-1.5 sm:gap-4 lg:gap-6 px-1 w-full flex-wrap text-[2.8rem] xs:text-[3.2rem] sm:text-6xl md:text-8xl lg:text-9xl leading-none">
          <span className="font-serif italic font-medium">{word1}</span>
          <span className="font-sans font-extrabold tracking-tighter">{word2}</span>
        </h1>
      </div>

      <div className="flex flex-col items-center justify-center text-center my-auto md:my-0 order-2 md:order-2 px-1 w-full pointer-events-none">
        <p className="text-sm sm:text-lg md:text-xl font-light text-foreground/85 max-w-[95%] sm:max-w-md md:max-w-2xl px-1 leading-relaxed">
          {description}
        </p>

        <div className="block md:hidden w-full mt-14 pointer-events-auto">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground/80 font-medium mb-5">
            {stackLabel}
          </div>
          <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_15%,white_85%,transparent)]">
            <div className="flex w-max gap-12 py-1 animate-marquee">
              <div className="flex gap-12 items-center">{STACK_LOGOS.map((Logo, i) => <Logo key={i} />)}</div>
              <div className="flex gap-12 items-center" aria-hidden="true">{STACK_LOGOS.map((Logo, i) => <Logo key={`c-${i}`} />)}</div>
            </div>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "pointer-events-auto flex flex-row items-center justify-center gap-3 mt-4 md:mt-10 mb-4 md:mb-0 order-4 md:order-3 transition-all duration-1000 transform px-1",
          isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}
        style={{ transitionDelay: "450ms" }}
      >
        {primaryHref ? (
          <Link href={primaryHref} className={primaryBtnClass}>
            {primaryContent}
          </Link>
        ) : (
          <button type="button" onClick={onPrimaryClick} className={primaryBtnClass}>
            {primaryContent}
          </button>
        )}
        {secondaryHref ? (
          <Link href={secondaryHref} className={secondaryBtnClass}>
            {secondaryContent}
          </Link>
        ) : (
          <button type="button" onClick={onSecondaryClick} className={secondaryBtnClass}>
            {secondaryContent}
          </button>
        )}
      </div>

      <div
        className={cn(
          "hidden md:flex absolute bottom-8 left-0 right-0 w-full z-10 pointer-events-auto flex-col items-center justify-center gap-4 transition-all duration-1000 transform order-3 md:order-4",
          isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}
        style={{ transitionDelay: "600ms" }}
      >
        <span className="text-xs uppercase tracking-wider text-muted-foreground/80 font-medium select-none">
          {stackLabel}
        </span>
        <div className="relative w-full max-w-5xl overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_15%,white_85%,transparent)]">
          <div className="flex w-max gap-16 py-3 animate-marquee">
            <div className="flex gap-16 items-center">{STACK_LOGOS.map((Logo, i) => <Logo key={i} />)}</div>
            <div className="flex gap-16 items-center" aria-hidden="true">{STACK_LOGOS.map((Logo, i) => <Logo key={`c-${i}`} />)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
