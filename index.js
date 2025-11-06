async function getData(fileName = "data.csv") {
	const file = await fetch(fileName);
	const data = await file.text();
	return data;
}

const PADDING = 30;
const amount = 500;
const POINT_RADIUS = 2;
const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");

if (!ctx) {
	console.error("2D context not available");
} else {
	function resizeCanvas() {
		canvas.width = innerWidth;
		canvas.height = innerHeight;
		drawBackground(ctx, canvas);
	}

	window.addEventListener("resize", resizeCanvas, { passive: true });
	resizeCanvas();
}

function drawBackground(ctx, canvas) {
	ctx.fillStyle = "#000000";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawXAxis(ctx, canvas) {
	ctx.strokeStyle = "white";
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(PADDING, canvas.height - PADDING);
	ctx.lineTo(canvas.width - PADDING, canvas.height - PADDING);
	ctx.stroke();
	ctx.closePath();
}

function drawYAxis(ctx, canvas) {
	ctx.strokeStyle = "white";
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(PADDING, canvas.height - PADDING);
	ctx.lineTo(PADDING, PADDING);
	ctx.stroke();
	ctx.closePath();
}

function drawTicks(ctx, canvas) {
	const STEPCOUNT = 15;
	const STEPSX = canvas.width / STEPCOUNT;
	const STEPSY = canvas.height / STEPCOUNT;
	const tickWidth = 2;
	const tickHeight = 15;

	ctx.fillStyle = "white";
	for (let i = 1; i < STEPCOUNT; i++) {
		const x = i * STEPSX;
		const y = i * STEPSY;

		// X-axis ticks
		ctx.fillRect(
			x - tickWidth / 2,
			canvas.height - PADDING - tickHeight / 2,
			tickWidth,
			tickHeight
		);

		// Y-axis ticks
		ctx.fillRect(
			PADDING - tickHeight / 2,
			y - tickWidth / 2,
			tickHeight,
			tickWidth
		);
	}
}

function drawAxisLabels(ctx, canvas, xLabel = "X", yLabel = "Y") {
	ctx.fillStyle = "red";
	ctx.font = "18px sans-serif";

	// X axis label
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(xLabel, canvas.width / 2, canvas.height - PADDING / 2);

	// Y axis label (rotated)
	ctx.save();
	ctx.translate(PADDING / 2, canvas.height / 2);
	ctx.rotate(-Math.PI / 2);
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(yLabel, 0, 0);
	ctx.restore();
}

function normalize(array) {
	const sum = array.reduce((a, b) => a + b, 0);
	return array.map((e) => e / sum);
}

function scaler(normalizedValue, canvasSize) {
	const totalWidth = canvasSize - PADDING * 2;
	return normalizedValue * totalWidth * amount;
}

function toCanvasX(normalizedX, canvas) {
	return PADDING + scaler(normalizedX, canvas.width);
}

function toCanvasY(normalizedY, canvas) {
	return canvas.height - PADDING - scaler(normalizedY, canvas.height);
}

function drawPoints(x, y, ctx, canvas) {
	if (x.length !== y.length) {
		console.error("Arrays must have the same length");
		return;
	}

	ctx.fillStyle = "yellow";
	for (let i = 0; i < x.length; i++) {
		ctx.beginPath();
		const canvasX = toCanvasX(x[i], canvas);
		const canvasY = toCanvasY(y[i], canvas);
		ctx.arc(canvasX, canvasY, POINT_RADIUS, 0, 2 * Math.PI);
		ctx.fill();
		ctx.closePath();
	}
}

function drawLine(ctx, canvas, a, b) {
	const x0Norm = 0;
	const x1Norm = 1;

	// Calculate y values in scaled space
	const x0Scaled = scaler(x0Norm, canvas.width);
	const x1Scaled = scaler(x1Norm, canvas.width);

	const y0Scaled = a * x0Scaled + b;
	const y1Scaled = a * x1Scaled + b;

	// Convert to canvas coordinates
	const x0Canvas = toCanvasX(x0Norm, canvas);
	const x1Canvas = toCanvasX(x1Norm, canvas);
	const y0Canvas = canvas.height - PADDING - y0Scaled;
	const y1Canvas = canvas.height - PADDING - y1Scaled;

	ctx.save();
	ctx.strokeStyle = "cyan";
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(x0Canvas, y0Canvas);
	ctx.lineTo(x1Canvas, y1Canvas);
	ctx.stroke();
	ctx.restore();
}

function regressionStep(x, y, a, b, canvas) {
	const N = x.length;
	if (N === 0) return [a, b];

	let gradA = 0;
	let gradB = 0;

	for (let i = 0; i < N; i++) {
		const xi = scaler(x[i], canvas.width);
		const yi = scaler(y[i], canvas.height);

		const pred = a * xi + b;
		const err = pred - yi;

		gradA += err * xi;
		gradB += err;
	}

	gradA = (2 / N) * gradA;
	gradB = (2 / N) * gradB;

	const lr = 5e-8;
	a -= lr * gradA;
	b -= lr * 500000 * gradB;
	console.log(b);

	return [a, b];
}

function drawRegressor(x, y, ctx, canvas, xLabel, yLabel) {
	if (x.length !== y.length) {
		console.error("Arrays must have the same length");
		return;
	}

	let a = Math.random();
	let b = Math.random() * innerHeight;

	function draw() {
		[a, b] = regressionStep(x, y, a, b, canvas);
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		drawBackground(ctx, canvas);
		drawXAxis(ctx, canvas);
		drawYAxis(ctx, canvas);
		drawTicks(ctx, canvas);
		drawAxisLabels(ctx, canvas, xLabel, yLabel);
		drawPoints(x, y, ctx, canvas);
		drawLine(ctx, canvas, a, b);

		setTimeout(() => requestAnimationFrame(draw), 1);
	}

	requestAnimationFrame(draw);
}

async function start(ctx, canvas) {
	const { columns, data } = await getData().then((data) => {
		const rows = data.split("\n").map((r) => {
			const values = r.split(",").map((e) => (isNaN(e) ? e : +e.trim()));
			return values;
		});
		return { columns: rows[0], data: rows.slice(1) };
	});

	let years = data.map((e) => e[0]);
	let salaries = data.map((e) => e[1]);

	salaries = normalize(salaries);
	years = normalize(years);

	const xLabel = columns[0] ?? "years of experience";
	const yLabel = columns[1] ?? "Salary";

	drawRegressor(years, salaries, ctx, canvas, xLabel, yLabel);
}

start(ctx, canvas);
