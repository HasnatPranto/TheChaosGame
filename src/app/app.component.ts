import { AfterViewInit, Component, NgZone, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subscription, interval } from 'rxjs';
import Konva from 'konva';
import { Point } from './point.model';

type Vertex = {
  point: Point;
  label: string;
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit, OnDestroy {

  title = 'chaos_game';
  points = 0;
  running = false;

  private stage!: Konva.Stage;
  private bgLayer = new Konva.Layer({ listening: false });
  private fxLayer = new Konva.Layer({ listening: false });
  private pointsLayer = new Konva.Layer({ listening: false });

  private vertices: Vertex[] = [];
  private currentPoint: Point | null = null;
  private seedMarker: Konva.Group | null = null;
  private run: Subscription | null = null;
  private runToken = 0;
  private resizeHandler = () => this.resize();

  // Wiki sidebar state
  wikiOpen = false;
  readonly wikiUrl = 'https://math.bu.edu/DYSYS/chaos-game/node1.html';
  readonly wikiSourceLabel = 'math.bu.edu';
  wikiTitle = 'The Chaos Game';
  wikiSafeUrl: SafeResourceUrl;

  constructor(private zone: NgZone, private sanitizer: DomSanitizer) {
    this.wikiSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.wikiUrl);
  }

  ngAfterViewInit(): void {
    const container = document.getElementById('container') as HTMLDivElement;
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || Math.floor(window.innerHeight * 0.8);

    this.stage = new Konva.Stage({
      container: 'container',
      width: w,
      height: h,
    });
    this.stage.add(this.bgLayer);
    this.stage.add(this.pointsLayer);
    this.stage.add(this.fxLayer);

    this.buildScene();
    this.bgLayer.draw();

    this.stage.on('click tap', () => {
      if (this.running) return;
      const pos = this.stage.getPointerPosition();
      if (!pos) return;
      this.setSeed(pos.x, pos.y);
    });

    window.addEventListener('resize', this.resizeHandler);
  }

  ngOnDestroy(): void {
    this.run?.unsubscribe();
    window.removeEventListener('resize', this.resizeHandler);
    this.stage?.destroy();
  }

  private resize(): void {
    const container = document.getElementById('container') as HTMLDivElement;
    if (!container) return;
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || Math.floor(window.innerHeight * 0.8);
    this.stage.width(w);
    this.stage.height(h);
    this.bgLayer.destroyChildren();
    this.fxLayer.destroyChildren();
    this.pointsLayer.destroyChildren();
    this.points = 0;
    this.currentPoint = null;
    this.seedMarker = null;
    this.buildScene();
    this.bgLayer.draw();
  }

  private buildScene(): void {
    const w = this.stage.width();
    const h = this.stage.height();
    const pad = Math.min(w, h) * 0.08;

    // Fit an equilateral triangle inside the available area.
    const availW = w - pad * 2;
    const availH = h - pad * 2;
    const side = Math.min(availW, availH * 2 / Math.sqrt(3));
    const triH = side * Math.sqrt(3) / 2;
    const cx0 = w / 2;
    const cy0 = h / 2;

    const ax = cx0;
    const ay = cy0 - triH / 2;
    const bx = cx0 - side / 2;
    const by = cy0 + triH / 2;
    const cx = cx0 + side / 2;
    const cy = cy0 + triH / 2;

    this.vertices = [
      { point: new Point(ax, ay, 7, '#ff4d6a'), label: 'A' },
      { point: new Point(bx, by, 7, '#3ab9ff'), label: 'B' },
      { point: new Point(cx, cy, 7, '#48f08a'), label: 'C' },
    ];

    const triangle = new Konva.Line({
      points: [ax, ay, bx, by, cx, cy],
      stroke: 'rgba(255,255,255,0.12)',
      strokeWidth: 1,
      closed: true,
      dash: [6, 6],
    });
    this.bgLayer.add(triangle);

    for (const v of this.vertices) {
      this.bgLayer.add(new Konva.Circle({
        x: v.point.x,
        y: v.point.y,
        radius: 22,
        fill: v.point.color,
        opacity: 0.18,
        shadowColor: v.point.color,
        shadowBlur: 30,
        shadowOpacity: 0.9,
      }));
      this.bgLayer.add(new Konva.Circle({
        x: v.point.x,
        y: v.point.y,
        radius: v.point.rad,
        fill: v.point.color,
        shadowColor: v.point.color,
        shadowBlur: 14,
      }));
      const offsetY = v.label === 'A' ? -28 : 18;
      this.bgLayer.add(new Konva.Text({
        x: v.point.x - 6,
        y: v.point.y + offsetY,
        text: v.label,
        fontSize: 14,
        fontStyle: 'bold',
        fill: v.point.color,
        shadowColor: v.point.color,
        shadowBlur: 8,
      }));
    }
  }

  private setSeed(x: number, y: number): void {
    this.currentPoint = new Point(x, y, 2, '#ffffff');
    this.seedMarker?.destroy();

    const group = new Konva.Group({ x, y });
    const ring = new Konva.Circle({
      radius: 4,
      stroke: '#ffffff',
      strokeWidth: 1.5,
      shadowColor: '#ffffff',
      shadowBlur: 12,
    });
    const dot = new Konva.Circle({
      radius: 2,
      fill: '#ffffff',
    });
    group.add(ring);
    group.add(dot);
    this.fxLayer.add(group);
    this.seedMarker = group;

    const pulse = new Konva.Circle({
      x, y,
      radius: 4,
      stroke: '#ffffff',
      strokeWidth: 2,
      opacity: 0.8,
    });
    this.fxLayer.add(pulse);
    pulse.to({
      radius: 28,
      opacity: 0,
      duration: 0.7,
      onFinish: () => pulse.destroy(),
    });
  }

  toggleWiki(): void {
    this.wikiOpen = !this.wikiOpen;
  }

  onReset(): void {
    this.runToken++;
    this.run?.unsubscribe();
    this.run = null;
    this.running = false;
    this.points = 0;
    this.currentPoint = null;
    this.seedMarker = null;
    this.pointsLayer.destroyChildren();
    this.fxLayer.destroyChildren();
    this.pointsLayer.draw();
    this.fxLayer.draw();
  }

  onClick(): void {
    if (this.running) return;
    if (!this.currentPoint) {
      const w = this.stage.width();
      const h = this.stage.height();
      this.setSeed(w / 2, h / 2 + 40);
    }

    this.running = true;
    const token = ++this.runToken;
    const total = 299;
    this.runDemo(total, total, token, () => this.startBulkPlotting(token));
  }

  // Hold + gap timings (in ms) tier by tier — gradually accelerates after milestones.
  private demoTimings(stepIndex: number): { hold: number; gap: number; ringDur: number } {
    if (stepIndex < 10)  return { hold: 650, gap: 350, ringDur: 0.35 };
    if (stepIndex < 25)  return { hold: 380, gap: 180, ringDur: 0.25 };
    if (stepIndex < 50)  return { hold: 200, gap: 90,  ringDur: 0.18 };
    if (stepIndex < 75)  return { hold: 110, gap: 40,  ringDur: 0.12 };
    if (stepIndex < 150) return { hold: 60,  gap: 20,  ringDur: 0.08 };
    return { hold: 30,  gap: 10,  ringDur: 0.05 };
  }

  private runDemo(stepsLeft: number, total: number, token: number, onDone: () => void): void {
    if (token !== this.runToken) return;
    if (stepsLeft <= 0 || !this.currentPoint) { onDone(); return; }

    const stepIndex = total - stepsLeft;
    const t = this.demoTimings(stepIndex);

    const cur = this.currentPoint;
    const v = this.vertices[Math.floor(Math.random() * 3)];
    const mx = (v.point.x + cur.x) / 2;
    const my = (v.point.y + cur.y) / 2;

    // Connector line from current point to chosen vertex.
    const line = new Konva.Line({
      points: [cur.x, cur.y, v.point.x, v.point.y],
      stroke: v.point.color,
      strokeWidth: 1.5,
      opacity: 0,
      dash: [4, 4],
      shadowColor: v.point.color,
      shadowBlur: 8,
      listening: false,
    });
    this.fxLayer.add(line);

    // Midpoint marker — a ring that pulses, then collapses into a permanent dot.
    const ring = new Konva.Circle({
      x: mx, y: my,
      radius: 2,
      stroke: v.point.color,
      strokeWidth: 2,
      opacity: 0,
      shadowColor: v.point.color,
      shadowBlur: 10,
      listening: false,
    });
    this.fxLayer.add(ring);

    const labelText = new Konva.Text({
      x: (cur.x + v.point.x) / 2 + 8,
      y: (cur.y + v.point.y) / 2 - 8,
      text: 'midpoint → ' + v.label,
      fontSize: 11,
      fill: v.point.color,
      opacity: 0,
      shadowColor: v.point.color,
      shadowBlur: 6,
      listening: false,
    });
    this.fxLayer.add(labelText);

    const fadeIn = Math.min(0.25, t.hold / 1000 * 0.6);
    line.to({ opacity: 0.9, duration: fadeIn });
    labelText.to({ opacity: 0.85, duration: fadeIn });
    ring.to({ opacity: 1, radius: 10, duration: t.ringDur });

    setTimeout(() => {
      if (token !== this.runToken) {
        line.destroy(); labelText.destroy(); ring.destroy();
        return;
      }
      // Place the permanent point at the midpoint.
      const dot = new Konva.Circle({
        x: mx, y: my,
        radius: 2.2,
        fill: v.point.color,
        opacity: 0,
        listening: false,
        shadowColor: v.point.color,
        shadowBlur: 6,
      });
      this.pointsLayer.add(dot);
      dot.to({ opacity: 0.95, duration: 0.2 });

      const fadeOut = Math.min(0.3, t.gap / 1000 * 0.8);
      line.to({ opacity: 0, duration: fadeOut, onFinish: () => line.destroy() });
      labelText.to({ opacity: 0, duration: fadeOut, onFinish: () => labelText.destroy() });
      ring.to({
        radius: 2.2,
        opacity: 0,
        duration: fadeOut,
        onFinish: () => ring.destroy(),
      });

      this.currentPoint = new Point(mx, my, 2.2, v.point.color);
      this.zone.run(() => { this.points += 1; });

      setTimeout(() => this.runDemo(stepsLeft - 1, total, token, onDone), t.gap);
    }, t.hold);
  }

  private startBulkPlotting(token: number): void {
    if (token !== this.runToken) return;
    let newPoints = 25;

    this.zone.runOutsideAngular(() => {
      const period = interval(180);
      this.run = period.subscribe(() => {
        if (token !== this.runToken) {
          this.run?.unsubscribe();
          this.run = null;
          return;
        }
        if (this.points > 70000) {
          this.run?.unsubscribe();
          this.run = null;
          this.zone.run(() => { this.running = false; });
          return;
        }
        newPoints = Math.floor(newPoints * 1.18) + 25;
        this.plotBatch(newPoints);
        this.zone.run(() => { this.points += newPoints; });
      });
    });
  }

  private plotBatch(count: number): void {
    let cur = this.currentPoint;
    if (!cur) return;
    for (let n = 0; n < count; n++) {
      const idx = Math.floor(Math.random() * 3);
      const v = this.vertices[idx];
      const nx: number = (v.point.x + cur.x) / 2;
      const ny: number = (v.point.y + cur.y) / 2;
      cur = new Point(nx, ny, 1.4, v.point.color);

      const dot = new Konva.Circle({
        x: nx,
        y: ny,
        radius: 1.4,
        fill: v.point.color,
        opacity: 0,
        listening: false,
        perfectDrawEnabled: false,
        globalCompositeOperation: 'lighter',
      });
      this.pointsLayer.add(dot);
      dot.to({ opacity: 0.85, duration: 0.25 });
    }
    this.currentPoint = cur;
  }
}
