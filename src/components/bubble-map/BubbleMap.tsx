"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  forceSimulation,
  forceX,
  forceY,
  forceManyBody,
  forceCollide,
  type Simulation,
  type SimulationNodeDatum,
} from "d3-force";
import { scaleLinear, scaleSqrt } from "d3-scale";
import { max as d3max } from "d3-array";
import { quadtree, type Quadtree } from "d3-quadtree";
import type { BubbleDatum } from "@/types/card";
import { CardTooltip } from "./CardTooltip";
import { withAffiliateTag } from "@/lib/affiliate";

interface BubbleMapProps {
  bubbles: BubbleDatum[];
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
}

type SimNode = BubbleDatum & SimulationNodeDatum;

const MIN_RADIUS = 6;
const MAX_RADIUS_RATIO = 1 / 7;
const HOVER_SEARCH_RADIUS = 60;
/** Rapporto larghezza/altezza reale di una carta Pokémon (63x88mm). */
const CARD_ASPECT = 63 / 88;
/** Soglia % oltre la quale una bolla "pulsa" per farsi notare (effetto virale). */
const HOT_CHANGE_THRESHOLD = 15;

interface ImageEntry {
  img: HTMLImageElement;
  status: "loading" | "loaded" | "error";
}

export function BubbleMap({ bubbles, selectedId, onSelect }: BubbleMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const quadtreeRef = useRef<Quadtree<SimNode> | null>(null);
  const imagesRef = useRef<Map<string, ImageEntry>>(new Map());
  const hoveredIdRef = useRef<string | null>(null);
  const pointerDownIdRef = useRef<string | null>(null);
  const lastTappedIdRef = useRef<string | null>(null);
  const drawRef = useRef<() => void>(() => {});
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hovered, setHovered] = useState<{ node: SimNode; x: number; y: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const colorScale = useMemo(
    () => scaleLinear<string>().domain([-20, 0, 20]).range(["#ef4444", "#71717a", "#22c55e"]).clamp(true),
    []
  );

  useEffect(() => {
    if (size.width === 0 || size.height === 0 || bubbles.length === 0) return;

    const maxCap = d3max(bubbles, (d) => d.marketCap) ?? 1;
    const maxRadius = Math.max(MIN_RADIUS + 4, Math.min(size.width, size.height) * MAX_RADIUS_RATIO);
    const radiusScale = scaleSqrt().domain([0, maxCap]).range([MIN_RADIUS, maxRadius]);

    const previousById = new Map(nodesRef.current.map((n) => [n.id, n]));
    const nodes: SimNode[] = bubbles.map((bubble) => {
      const previous = previousById.get(bubble.id);
      return {
        ...bubble,
        radius: radiusScale(bubble.marketCap),
        x: previous?.x ?? size.width / 2 + (Math.random() - 0.5) * 80,
        y: previous?.y ?? size.height / 2 + (Math.random() - 0.5) * 80,
        vx: previous?.vx ?? 0,
        vy: previous?.vy ?? 0,
      };
    });
    nodesRef.current = nodes;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    function getImageEntry(url: string): ImageEntry {
      const cache = imagesRef.current;
      let entry = cache.get(url);
      if (!entry) {
        const img = new window.Image();
        entry = { img, status: "loading" };
        img.onload = () => {
          entry!.status = "loaded";
          drawRef.current();
        };
        img.onerror = () => {
          entry!.status = "error";
        };
        img.src = url;
        cache.set(url, entry);
      }
      return entry;
    }

    function drawBubble(node: SimNode, isHovered: boolean, pulse: number) {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const radius = node.radius ?? MIN_RADIUS;
      const color = colorScale(node.change);
      const isHot = Math.abs(node.change) >= HOT_CHANGE_THRESHOLD;
      const imageEntry = node.imageUrl ? getImageEntry(node.imageUrl) : null;
      const hasImage = imageEntry?.status === "loaded" && imageEntry.img.naturalWidth > 0;

      // cast a soft drop shadow before painting the fill, so the shadow isn't clipped by it
      ctx!.save();
      ctx!.shadowColor = "rgba(0,0,0,0.55)";
      ctx!.shadowBlur = Math.max(6, radius * 0.5);
      ctx!.shadowOffsetY = radius * 0.15;
      ctx!.beginPath();
      ctx!.arc(x, y, radius, 0, Math.PI * 2);
      ctx!.fillStyle = "#000";
      ctx!.fill();
      ctx!.restore();

      if (hasImage) {
        // Inscribe a real-card-ratio rounded rect inside the bubble circle, so the artwork
        // reads as an actual Pokémon card rather than a cropped circular thumbnail.
        const cardH = radius * (2 / Math.sqrt(1 + CARD_ASPECT * CARD_ASPECT));
        const cardW = cardH * CARD_ASPECT;
        const img = imageEntry!.img;
        const scale = Math.max(cardW / img.naturalWidth, cardH / img.naturalHeight);
        const dw = img.naturalWidth * scale;
        const dh = img.naturalHeight * scale;
        const cornerRadius = Math.min(cardW, cardH) * 0.08;

        ctx!.save();
        roundedRectPath(ctx!, x - cardW / 2, y - cardH / 2, cardW, cardH, cornerRadius);
        ctx!.clip();
        ctx!.drawImage(img, x - dw / 2, y - dh / 2, dw, dh);
        ctx!.restore();

        ctx!.save();
        roundedRectPath(ctx!, x - cardW / 2, y - cardH / 2, cardW, cardH, cornerRadius);
        ctx!.lineWidth = Math.max(1, radius * 0.04);
        ctx!.strokeStyle = "rgba(255,255,255,0.35)";
        ctx!.stroke();
        ctx!.restore();
      } else {
        const gradient = ctx!.createRadialGradient(
          x - radius * 0.3,
          y - radius * 0.35,
          radius * 0.05,
          x,
          y,
          radius
        );
        gradient.addColorStop(0, lighten(color, 0.45));
        gradient.addColorStop(1, color);
        ctx!.beginPath();
        ctx!.arc(x, y, radius, 0, Math.PI * 2);
        ctx!.fillStyle = gradient;
        ctx!.fill();
      }

      ctx!.beginPath();
      ctx!.arc(x, y, radius, 0, Math.PI * 2);
      const glowPulse = isHot ? 0.5 + pulse * 0.5 : 1;
      ctx!.lineWidth = isHovered ? Math.max(3, radius * 0.14) : Math.max(1.5, radius * 0.07) * (isHot ? 1 + pulse * 0.4 : 1);
      ctx!.strokeStyle = isHovered ? lighten(color, 0.25) : color;
      if (isHovered || isHot) {
        ctx!.shadowColor = color;
        ctx!.shadowBlur = radius * (isHovered ? 0.7 : 0.5 * glowPulse);
      }
      ctx!.globalAlpha = isHot && !isHovered ? 0.7 + pulse * 0.3 : 1;
      ctx!.stroke();
      ctx!.globalAlpha = 1;
      ctx!.shadowBlur = 0;

      // Always-on % badge so growth/decline is readable at a glance, not just on hover.
      if (radius > 12) {
        drawChangeBadge(ctx!, x, y, radius, node.change);
      }

      if (radius > 22) {
        ctx!.fillStyle = "rgba(255,255,255,0.95)";
        ctx!.font = `600 ${Math.min(13, radius / 3)}px system-ui, sans-serif`;
        ctx!.textAlign = "center";
        ctx!.textBaseline = "middle";
        ctx!.shadowColor = "rgba(0,0,0,0.8)";
        ctx!.shadowBlur = 3;
        ctx!.fillText(truncate(node.name, radius), x, y - radius - 6);
        ctx!.shadowBlur = 0;
      }
    }

    function drawChangeBadge(
      context: CanvasRenderingContext2D,
      x: number,
      y: number,
      radius: number,
      change: number
    ) {
      const positive = change >= 0;
      const badgeColor = positive ? "#16a34a" : "#dc2626";
      const badgeY = y + radius - Math.min(radius * 0.18, 6);
      const label = `${positive ? "▲" : "▼"}${Math.abs(change).toFixed(radius > 30 ? 1 : 0)}%`;
      const fontSize = Math.max(8, Math.min(11, radius / 3.2));
      context.font = `700 ${fontSize}px system-ui, sans-serif`;
      const textWidth = context.measureText(label).width;
      const paddingX = fontSize * 0.5;
      const badgeW = textWidth + paddingX * 2;
      const badgeH = fontSize + 4;

      context.save();
      roundedRectPath(context, x - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, badgeH / 2);
      context.fillStyle = badgeColor;
      context.shadowColor = "rgba(0,0,0,0.5)";
      context.shadowBlur = 3;
      context.fill();
      context.shadowBlur = 0;
      context.strokeStyle = "rgba(255,255,255,0.6)";
      context.lineWidth = 1;
      context.stroke();
      context.fillStyle = "#fff";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(label, x, badgeY + 0.5);
      context.restore();
    }

    function draw() {
      const pulse = (Math.sin(performance.now() / 320) + 1) / 2;
      ctx!.clearRect(0, 0, size.width, size.height);
      for (const node of nodes) {
        drawBubble(node, node.id === hoveredIdRef.current, pulse);
      }
      quadtreeRef.current = quadtree<SimNode>()
        .x((d) => d.x ?? 0)
        .y((d) => d.y ?? 0)
        .addAll(nodes);
    }

    drawRef.current = draw;

    const simulation: Simulation<SimNode, undefined> = forceSimulation(nodes)
      .force("x", forceX(size.width / 2).strength(0.05))
      .force("y", forceY(size.height / 2).strength(0.05))
      .force("charge", forceManyBody().strength(2))
      .force(
        "collide",
        forceCollide<SimNode>((d) => (d.radius ?? MIN_RADIUS) + 1.5).iterations(2)
      )
      .alpha(1)
      .alphaDecay(0.02)
      .on("tick", draw);

    draw();

    // Keep animating (pulsing glow on hot movers) even after the simulation settles.
    const hasHotBubbles = nodes.some((n) => Math.abs(n.change) >= HOT_CHANGE_THRESHOLD);
    let rafId = 0;
    if (hasHotBubbles) {
      const loop = () => {
        draw();
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);
    }

    return () => {
      simulation.stop();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [bubbles, size, colorScale]);

  // Follow a bubble selected from outside (e.g. top-movers ticker) and open its tooltip.
  useEffect(() => {
    if (!selectedId) return;
    const node = nodesRef.current.find((n) => n.id === selectedId);
    if (!node) return;
    hoveredIdRef.current = node.id;
    setHovered({ node, x: node.x ?? 0, y: node.y ?? 0 });
    drawRef.current();
  }, [selectedId]);

  function findNodeAt(x: number, y: number): SimNode | null {
    const tree = quadtreeRef.current;
    if (!tree) return null;
    const found = tree.find(x, y, HOVER_SEARCH_RADIUS);
    if (!found) return null;
    const dx = (found.x ?? 0) - x;
    const dy = (found.y ?? 0) - y;
    const dist = Math.hypot(dx, dy);
    return dist <= (found.radius ?? MIN_RADIUS) ? found : null;
  }

  function closeTooltip() {
    hoveredIdRef.current = null;
    drawRef.current();
    setHovered(null);
    onSelect?.(null);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.pointerType === "touch") return; // touch only selects on tap, not on drag
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const node = findNodeAt(x, y);
    const nextId = node?.id ?? null;
    if (hoveredIdRef.current !== nextId) {
      hoveredIdRef.current = nextId;
      drawRef.current();
    }
    setHovered(node ? { node, x, y } : null);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const node = findNodeAt(x, y);
    pointerDownIdRef.current = node?.id ?? null;
    if (event.pointerType === "touch") {
      hoveredIdRef.current = node?.id ?? null;
      drawRef.current();
      setHovered(node ? { node, x, y } : null);
    }
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const node = findNodeAt(x, y);
    const isSameAsDown = node != null && node.id === pointerDownIdRef.current;

    if (event.pointerType === "touch") {
      // A tap that lands back on the already-selected card opens the affiliate link (2-tap confirm).
      if (isSameAsDown && lastTappedIdRef.current === node.id) {
        const url = withAffiliateTag(node.tcgplayerUrl);
        if (url) window.open(url, "_blank", "noopener,noreferrer");
      }
      lastTappedIdRef.current = node?.id ?? null;
      return;
    }

    if (isSameAsDown && node.tcgplayerUrl) {
      const url = withAffiliateTag(node.tcgplayerUrl);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  function handlePointerLeave() {
    hoveredIdRef.current = null;
    drawRef.current();
    setHovered(null);
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full bg-zinc-950"
      style={{
        backgroundImage:
          "radial-gradient(circle at 50% 0%, rgba(82,82,91,0.25), transparent 60%), linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
        backgroundSize: "auto, 36px 36px, 36px 36px",
      }}
    >
      <canvas
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        className="cursor-pointer touch-manipulation"
      />
      {hovered ? (
        <CardTooltip bubble={hovered.node} x={hovered.x} y={hovered.y} onClose={closeTooltip} />
      ) : null}
    </div>
  );
}

function truncate(text: string, radius: number): string {
  const maxChars = Math.max(4, Math.floor(radius / 4));
  return text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text;
}

function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

/** Mixes an rgb()/hex color string toward white by `amount` (0-1); used for gradients & hover glow. */
function lighten(color: string, amount: number): string {
  const nums = color.match(/\d+(\.\d+)?/g);
  if (!nums || nums.length < 3) return color;
  const [r, g, b] = nums.map(Number);
  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}
