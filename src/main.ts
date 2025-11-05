import './style.css';
import { RbfInterpolator } from './rbf_interpolator';

interface Point {
    x: number;
    y: number;
    value: number;
}

class RBFVisualizer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private colorbarCanvas: HTMLCanvasElement;
    private colorbarCtx: CanvasRenderingContext2D;

    private points: Point[] = [];
    private canvasWidth = 600;
    private canvasHeight = 600;

    private rbfFunction = 'thin_plate';
    private gridResolution = 200;
    private smoothing = 0.01;
    private currentColorMap = 'turbo';
    private showPoints = true;
    private showContours = true;

    private interpolator: RbfInterpolator | null = null;
    private gridValues: number[][] = [];
    private minValue = 0;
    private maxValue = 1;

    constructor() {
        this.canvas = document.getElementById('visualization-canvas') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;
        this.colorbarCanvas = document.getElementById('colorbar') as HTMLCanvasElement;
        this.colorbarCtx = this.colorbarCanvas.getContext('2d')!;

        this.setupCanvas();
        this.setupEventListeners();
        this.loadPreset('peaks');
    }

    private setupCanvas() {
        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;
        this.colorbarCanvas.width = 400;
        this.colorbarCanvas.height = 30;
    }

    private setupEventListeners() {
        // Canvas click to add points
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));

        // Mouse move to show coordinates
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));

        // RBF function selector
        const rbfSelect = document.getElementById('rbf-function') as HTMLSelectElement;
        rbfSelect.addEventListener('change', (e) => {
            this.rbfFunction = (e.target as HTMLSelectElement).value;
            this.updateVisualization();
        });

        // Grid resolution slider
        const gridSlider = document.getElementById('grid-resolution') as HTMLInputElement;
        const gridValue = document.getElementById('grid-res-value')!;
        gridSlider.addEventListener('input', (e) => {
            this.gridResolution = parseInt((e.target as HTMLInputElement).value);
            gridValue.textContent = `${this.gridResolution}x${this.gridResolution}`;
            this.updateVisualization();
        });

        // Smoothing slider
        const smoothSlider = document.getElementById('smoothing') as HTMLInputElement;
        const smoothValue = document.getElementById('smooth-value')!;
        smoothSlider.addEventListener('input', (e) => {
            this.smoothing = parseFloat((e.target as HTMLInputElement).value);
            smoothValue.textContent = this.smoothing.toFixed(2);
            this.updateVisualization();
        });

        // Colormap selector
        const colormapSelect = document.getElementById('colormap') as HTMLSelectElement;
        colormapSelect.addEventListener('change', (e) => {
            this.currentColorMap = (e.target as HTMLSelectElement).value;
            this.draw();
        });

        // Show points checkbox
        const showPointsCheck = document.getElementById('show-points') as HTMLInputElement;
        showPointsCheck.addEventListener('change', (e) => {
            this.showPoints = (e.target as HTMLInputElement).checked;
            this.draw();
        });

        // Show contours checkbox
        const showContoursCheck = document.getElementById('show-contours') as HTMLInputElement;
        showContoursCheck.addEventListener('change', (e) => {
            this.showContours = (e.target as HTMLInputElement).checked;
            this.draw();
        });

        // Preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const preset = (e.target as HTMLElement).dataset.preset!;
                this.loadPreset(preset);
            });
        });

        // Add point button
        document.getElementById('add-point-btn')!.addEventListener('click', () => {
            this.addRandomPoint();
        });

        // Clear points button
        document.getElementById('clear-points-btn')!.addEventListener('click', () => {
            this.clearPoints();
        });

        // Upload CSV button
        document.getElementById('upload-csv-btn')!.addEventListener('click', () => {
            document.getElementById('csv-file-input')!.click();
        });

        // File input change handler
        document.getElementById('csv-file-input')!.addEventListener('change', (e) => {
            const input = e.target as HTMLInputElement;
            if (input.files && input.files[0]) {
                this.loadCSVFile(input.files[0]);
            }
        });
    }

    private handleCanvasClick(e: MouseEvent) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.canvasWidth;
        const y = (e.clientY - rect.top) / this.canvasHeight;

        // Random value between 0 and 1
        const value = Math.random();

        this.addPoint(x, y, value);
    }

    private handleMouseMove(e: MouseEvent) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.canvasWidth;
        const y = (e.clientY - rect.top) / this.canvasHeight;

        let text = `x: ${x.toFixed(3)}, y: ${y.toFixed(3)}`;

        // If we have interpolation, show the interpolated value
        if (this.interpolator && x >= 0 && x <= 1 && y >= 0 && y <= 1) {
            try {
                const value = this.interpolator.interpolatePoint([x, y]);
                text += ` | value: ${value.toFixed(3)}`;
            } catch (e) {
                // Ignore errors
            }
        }

        document.getElementById('hover-coords')!.textContent = text;
    }

    private addPoint(x: number, y: number, value: number) {
        this.points.push({ x, y, value });
        this.updatePointsList();
        this.updateVisualization();
    }

    private addRandomPoint() {
        const x = Math.random();
        const y = Math.random();
        const value = Math.random();
        this.addPoint(x, y, value);
    }

    private removePoint_(index: number) {
        this.points.splice(index, 1);
        this.updatePointsList();
        this.updateVisualization();
    }

    private clearPoints() {
        this.points = [];
        this.updatePointsList();
        this.updateVisualization();
    }

    private async loadCSVFile(file: File) {
        try {
            const text = await file.text();
            //console.log(text)
            this.parseAndLoadCSV(text);
        } catch (error) {
            console.error('Error loading CSV file:', error);
            alert('Error loading CSV file. Please make sure it is a valid CSV file.');
        }
    }

    private parseAndLoadCSV(csvText: string) {
        const lines = csvText.trim().split('\n');
        
        if (lines.length < 2) {
            alert('CSV file must have at least a header row and one data row.');
            return;
        }

        // Parse header
        const header = lines[0].split(/[;,]/);
        
        // Try to find column indices for lat, lon, and value
        // Support various common column names
        const latIdx = header.findIndex(h => 
            /lat/i.test(h.trim()) || /y/i.test(h.trim())
        );
        const lonIdx = header.findIndex(h => 
            /lon/i.test(h.trim()) || /lng/i.test(h.trim()) || /x/i.test(h.trim())
        );
        const valIdx = header.findIndex(h => 
            /val/i.test(h.trim()) || /z/i.test(h.trim()) || /h2/i.test(h.trim()) || /ppm/i.test(h.trim())
        );

        if (latIdx === -1 || lonIdx === -1 || valIdx === -1) {
            alert('Could not find latitude, longitude, and value columns.\nExpected columns like: LATITUDE, LONGITUDE, VALUE (or X, Y, Z)');
            return;
        }

        // Parse data rows
        const newPoints: Point[] = [];
        let minLat = Infinity, maxLat = -Infinity;
        let minLon = Infinity, maxLon = -Infinity;
        let minVal = Infinity, maxVal = -Infinity;

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = line.split(/[;,]/);
            if (values.length <= Math.max(latIdx, lonIdx, valIdx)) continue;

            const lat = parseFloat(values[latIdx]);
            const lon = parseFloat(values[lonIdx]);
            const val = parseFloat(values[valIdx]);

            if (isNaN(lat) || isNaN(lon) || isNaN(val)) continue;

            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
            minLon = Math.min(minLon, lon);
            maxLon = Math.max(maxLon, lon);
            minVal = Math.min(minVal, val);
            maxVal = Math.max(maxVal, val);

            newPoints.push({ 
                x: lon, 
                y: lat, 
                value: val 
            });
        }

        if (newPoints.length === 0) {
            alert('No valid data points found in CSV file.');
            return;
        }

        // Normalize coordinates to [0, 1] range
        this.points = newPoints.map(p => ({
            x: (p.x - minLon) / (maxLon - minLon),
            y: (p.y - minLat) / (maxLat - minLat),
            value: (p.value - minVal) / (maxVal - minVal)
        }));

        console.log(`Loaded ${this.points.length} points from CSV`);
        console.log(`Lat range: ${minLat} to ${maxLat}`);
        console.log(`Lon range: ${minLon} to ${maxLon}`);
        console.log(`Value range: ${minVal} to ${maxVal}`);

        this.updatePointsList();
        this.updateVisualization();
    }

    private updatePointsList() {
        const list = document.getElementById('points-list')!;
        const count = document.getElementById('point-count')!;

        count.textContent = this.points.length.toString();

        if (this.points.length === 0) {
            list.innerHTML = '<p style="color: #6c757d; font-size: 0.85rem;">No points yet. Click on canvas to add.</p>';
            return;
        }

        list.innerHTML = this.points.map((p, i) => `
      <div class="point-item">
        <span>P${i + 1}: (${p.x.toFixed(2)}, ${p.y.toFixed(2)}) = ${p.value.toFixed(2)}</span>
        <button onclick="window.visualizer.removePoint(${i})">Ã—</button>
      </div>
    `).join('');
    }

    private async loadPreset(preset: string) {
        this.points = [];

        switch (preset) {
            case 'h2_frantz':
                // Load the H2 Frantz CSV data
                try {
                    const response = await fetch('/h2_frantz.csv');
                    const csvText = await response.text();
                    this.parseAndLoadCSV(csvText);
                    return; // parseAndLoadCSV handles update
                } catch (error) {
                    console.error('Error loading H2 Frantz data:', error);
                    alert('Could not load H2 Frantz data file.');
                    return;
                }

            case 'peaks':
                // Matlab peaks-like function
                for (let i = 0; i < 25; i++) {
                    const x = Math.random();
                    const y = Math.random();
                    const value = this.peaksFunction(x * 6 - 3, y * 6 - 3);
                    this.points.push({ x, y, value: (value + 6) / 12 });
                }
                break;

            case 'ripple':
                // Ripple pattern
                for (let i = 0; i < 20; i++) {
                    const x = Math.random();
                    const y = Math.random();
                    const value = Math.sin(x * Math.PI * 4) * Math.cos(y * Math.PI * 4);
                    this.points.push({ x, y, value: (value + 1) / 2 });
                }
                break;

            case 'random':
                // Random points
                for (let i = 0; i < 15; i++) {
                    this.points.push({
                        x: Math.random(),
                        y: Math.random(),
                        value: Math.random()
                    });
                }
                break;

            case 'gradient':
                // Simple gradient
                this.points = [
                    { x: 0, y: 0, value: 0 },
                    { x: 1, y: 0, value: 0.5 },
                    { x: 0, y: 1, value: 0.5 },
                    { x: 1, y: 1, value: 1 },
                    { x: 0.5, y: 0.5, value: 0.5 }
                ];
                break;

            case 'saddle':
                // Saddle point
                for (let i = 0; i < 20; i++) {
                    const x = Math.random();
                    const y = Math.random();
                    const cx = x - 0.5;
                    const cy = y - 0.5;
                    const value = cx * cx - cy * cy;
                    this.points.push({ x, y, value: (value + 0.5) });
                }
                break;
        }

        this.updatePointsList();
        this.updateVisualization();
    }

    private peaksFunction(x: number, y: number): number {
        return 3 * (1 - x) ** 2 * Math.exp(-(x ** 2) - (y + 1) ** 2)
            - 10 * (x / 5 - x ** 3 - y ** 5) * Math.exp(-(x ** 2) - y ** 2)
            - 1 / 3 * Math.exp(-((x + 1) ** 2) - y ** 2);
    }

    private updateVisualization() {
        if (this.points.length < 3) {
            this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
            this.ctx.fillStyle = '#f8f9fa';
            this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
            this.ctx.fillStyle = '#6c757d';
            this.ctx.font = '16px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Add at least 3 points to see interpolation', this.canvasWidth / 2, this.canvasHeight / 2);

            if (this.showPoints) {
                this.drawPoints();
            }

            return;
        }

        const startTime = performance.now();

        try {
            // Prepare data for interpolation
            const trainingPoints = this.points.map(p => [p.x, p.y]);
            const trainingValues = this.points.map(p => p.value);

            // Create interpolator
            this.interpolator = new RbfInterpolator(
                trainingPoints,
                trainingValues,
                this.rbfFunction,
                this.smoothing
            );

            // Generate grid
            this.generateGrid();

            const endTime = performance.now();
            document.getElementById('interp-time')!.textContent = `${(endTime - startTime).toFixed(1)}ms`;

            // Draw
            this.draw();

        } catch (error) {
            console.error('Interpolation error:', error);
            this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
            this.ctx.fillStyle = '#dc3545';
            this.ctx.font = '14px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Error during interpolation', this.canvasWidth / 2, this.canvasHeight / 2);
        }
    }

    private generateGrid() {
        this.gridValues = [];
        const step = 1 / (this.gridResolution - 1);

        this.minValue = Infinity;
        this.maxValue = -Infinity;

        for (let i = 0; i < this.gridResolution; i++) {
            const row: number[] = [];
            for (let j = 0; j < this.gridResolution; j++) {
                const x = i * step;
                const y = j * step;
                const value = this.interpolator!.interpolatePoint([x, y]);
                row.push(value);

                this.minValue = Math.min(this.minValue, value);
                this.maxValue = Math.max(this.maxValue, value);
            }
            this.gridValues.push(row);
        }

        // Update colorbar labels
        document.getElementById('colorbar-min')!.textContent = this.minValue.toFixed(2);
        document.getElementById('colorbar-max')!.textContent = this.maxValue.toFixed(2);
    }

    private draw() {
        if (this.gridValues.length === 0) return;

        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Draw interpolated surface
        this.drawSurface();

        // Draw contours if enabled
        if (this.showContours) {
            this.drawContours();
        }

        // Draw training points if enabled
        if (this.showPoints) {
            this.drawPoints();
        }

        // Draw colorbar
        this.drawColorbar();
    }

    private drawSurface() {
        const cellWidth = this.canvasWidth / (this.gridResolution - 1);
        const cellHeight = this.canvasHeight / (this.gridResolution - 1);

        for (let i = 0; i < this.gridResolution - 1; i++) {
            for (let j = 0; j < this.gridResolution - 1; j++) {
                const value = this.gridValues[i][j];
                const normalized = (value - this.minValue) / (this.maxValue - this.minValue);
                const color = this.getColor(normalized);

                this.ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
                this.ctx.fillRect(
                    i * cellWidth,
                    j * cellHeight,
                    cellWidth + 1,
                    cellHeight + 1
                );
            }
        }
    }

    private drawContours() {
        const numContours = 10;
        const step = (this.maxValue - this.minValue) / numContours;

        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.lineWidth = 1;

        for (let k = 0; k <= numContours; k++) {
            const level = this.minValue + k * step;
            this.drawContourLevel(level);
        }
    }

    private drawContourLevel(level: number) {
        const cellWidth = this.canvasWidth / (this.gridResolution - 1);
        const cellHeight = this.canvasHeight / (this.gridResolution - 1);

        // Simple marching squares approximation
        for (let i = 0; i < this.gridResolution - 1; i++) {
            for (let j = 0; j < this.gridResolution - 1; j++) {
                const v00 = this.gridValues[i][j];
                const v10 = this.gridValues[i + 1][j];
                const v01 = this.gridValues[i][j + 1];
                const v11 = this.gridValues[i + 1][j + 1];

                const x = i * cellWidth;
                const y = j * cellHeight;

                // Check if contour passes through this cell
                if ((v00 <= level && level <= v11) || (v00 >= level && level >= v11) ||
                    (v10 <= level && level <= v01) || (v10 >= level && level >= v01)) {

                    // Draw a simple cross-cell line if values cross the level
                    if ((v00 < level && v11 > level) || (v00 > level && v11 < level)) {
                        this.ctx.beginPath();
                        this.ctx.moveTo(x, y + cellHeight);
                        this.ctx.lineTo(x + cellWidth, y);
                        this.ctx.stroke();
                    }
                    if ((v10 < level && v01 > level) || (v10 > level && v01 < level)) {
                        this.ctx.beginPath();
                        this.ctx.moveTo(x, y);
                        this.ctx.lineTo(x + cellWidth, y + cellHeight);
                        this.ctx.stroke();
                    }
                }
            }
        }
    }

    private drawPoints() {
        this.points.forEach((point, _index) => {
            const x = point.x * this.canvasWidth;
            const y = point.y * this.canvasHeight;

            // Draw point
            this.ctx.beginPath();
            this.ctx.arc(x, y, 6, 0, 2 * Math.PI);
            this.ctx.fillStyle = 'white';
            this.ctx.fill();
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // Draw value as text
            this.ctx.fillStyle = '#333';
            this.ctx.font = 'bold 11px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(point.value.toFixed(2), x, y - 10);
        });
    }

    private drawColorbar() {
        const width = this.colorbarCanvas.width;
        const height = this.colorbarCanvas.height;

        for (let i = 0; i < width; i++) {
            const normalized = i / width;
            const color = this.getColor(normalized);

            this.colorbarCtx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
            this.colorbarCtx.fillRect(i, 0, 1, height);
        }
    }

    private getColor(t: number): [number, number, number] {
        // Clamp t to [0, 1]
        t = Math.max(0, Math.min(1, t));

        const colormaps: { [key: string]: (t: number) => [number, number, number] } = {
            viridis: (t) => {
                const r = 255 * (0.267 + 0.867 * t - 1.333 * t ** 2 + 0.491 * t ** 3);
                const g = 255 * (0.005 + 1.429 * t - 0.972 * t ** 2 + 0.282 * t ** 3);
                const b = 255 * (0.329 + 1.074 * t - 3.185 * t ** 2 + 2.479 * t ** 3);
                return [Math.round(r), Math.round(g), Math.round(b)];
            },
            plasma: (t) => {
                const r = 255 * (0.050 + 2.258 * t - 2.385 * t ** 2 + 0.811 * t ** 3);
                const g = 255 * (0.020 + 0.170 * t + 2.490 * t ** 2 - 2.155 * t ** 3);
                const b = 255 * (0.527 + 2.666 * t - 6.364 * t ** 2 + 3.797 * t ** 3);
                return [Math.round(r), Math.round(g), Math.round(b)];
            },
            turbo: (t) => {
                const r = 255 * Math.sin(Math.PI * (t * 0.75 + 0.67));
                const g = 255 * Math.sin(Math.PI * (t * 0.75 + 0.25));
                const b = 255 * Math.sin(Math.PI * (t * 0.75 - 0.17));
                return [Math.round(Math.max(0, r)), Math.round(Math.max(0, g)), Math.round(Math.max(0, b))];
            },
            coolwarm: (t) => {
                const r = 255 * (0.23 + 1.54 * t - 1.54 * t ** 2 + 0.77 * t ** 3);
                const g = 255 * (0.3 + 1.53 * t - 3.06 * t ** 2 + 1.23 * t ** 3);
                const b = 255 * (0.75 - 1.5 * t + 1.5 * t ** 2 - 0.75 * t ** 3);
                return [Math.round(r), Math.round(g), Math.round(b)];
            },
            rainbow: (t) => {
                const r = 255 * Math.sin(Math.PI * t);
                const g = 255 * Math.sin(Math.PI * (t + 0.33));
                const b = 255 * Math.sin(Math.PI * (t + 0.67));
                return [Math.round(Math.max(0, r)), Math.round(Math.max(0, g)), Math.round(Math.max(0, b))];
            }
        };

        const colormap = colormaps[this.currentColorMap] || colormaps.turbo;
        return colormap(t);
    }

    // Public method to remove point (called from HTML)
    public removePoint(index: number) {
        this.removePoint_(index);
    }
}

// Initialize the application
const visualizer = new RBFVisualizer();

// Make it globally accessible for HTML onclick
(window as any).visualizer = visualizer;