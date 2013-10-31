/*
 * Variables
 */
var canvas;
var ctx;
var height; // canvas height and width
var width;

var boids;
var boidCount;
var boidTailOffset;
var boidHeadOffset;
var boidMaxVelocity;

var targetTime = 33; // 30 frames per second

/*
 * Classes
 */

function vector() {
	this.x = 0;
	this.y = 0;
}

function pos() {
	this.vec = new vector();
	this.getX = function() { return this.vec.x; }
	this.getY = function() { return this.vec.y; }
}

function boid() {
	this.id;
	this.position = new pos();
	this.velocity = new vector();
}

/*
 * Helper methods
 */

function addVectors(v1, v2) {
	var v = new vector();
	v.x = v1.x + v2.x;
	v.y = v1.y + v2.y;

	return v;
}

function subtractVectors(v1, v2) {
	var v = new vector();
	v.x = v1.x - v2.x;
	v.y = v1.y - v2.y;

	return v;
}

function divideVector(v1, z) {
	var v = new vector();
	v.x = v1.x / z;
	v.y = v1.y / z;

	return v;
}

function multVector(v1, z) {
	var v = new vector();
	v.x = v1.x * z;
	v.y = v1.y * z;

	return v;
}

function vectorMagnitude(v) {
	var mag = Math.sqrt(Math.pow(v.x, 2) + Math.pow(v.y, 2));

	return mag;
}

function normalizeVector(v) {
	var mag = vectorMagnitude(v);
	return divideVector(v, mag);
}

function limitVector(v, xLimit, yLimit) {
	var newX, newY;
	newX = Math.min(Math.abs(v.x), xLimit);
	newY = Math.min(Math.abs(v.y), yLimit);
	// Reset signs
	v.x = newX * (v.x / Math.abs(v.x));
	v.y = newY * (v.y / Math.abs(v.y));

	return v;
}

/*
 * Boid methods
 */

function createBoid(xPos, yPos) {
	var b = new boid();
	b.id = boidCount;
	boidCount += 1;
	b.position.vec.x = xPos;
	b.position.vec.y = yPos;

	boids.push(b);
}

function cohesion(b) {

	var adjusmentAmount = 0.01;

	var otherBoids = boids.filter(function (e) {
		return e.id !== b.id;
	});

	var flockCenter = new vector();

	otherBoids.forEach(function (e, i, a) {
		flockCenter = addVectors(flockCenter, e.position.vec);
	});

	flockCenter = divideVector(flockCenter, boidCount - 1);

	var adjustmentVector = 
		multVector((subtractVectors(flockCenter, b.position.vec)), adjusmentAmount);

	return adjustmentVector;
}

function avoidance(b) {

	var avoidanceDistance = 25;

	var otherBoids = boids.filter(function (e) {
		return e.id !== b.id;
	});

	var adjustmentVector = new vector();

	otherBoids.forEach(function (e, i, a) {
		if(vectorMagnitude(subtractVectors(e.position.vec, b.position.vec)) < avoidanceDistance) {
			adjustmentVector = subtractVectors(adjustmentVector, 
				subtractVectors(e.position.vec, b.position.vec));
		}
	});

	adjustmentVector = multVector(adjustmentVector, 0.35);

	return adjustmentVector;
}

function alignment(b) {

	var otherBoids = boids.filter(function (e) {
		return e.id !== b.id;
	});

	var adjustmentVector = new vector();

	otherBoids.forEach(function (e, i, a) {
		adjustmentVector = addVectors(adjustmentVector, e.velocity);
	});

	adjustmentVector = divideVector(adjustmentVector, boidCount - 1);

	adjustmentVector = divideVector(subtractVectors(adjustmentVector, b.velocity), 8);

	return adjustmentVector;
}

function moveAllBoids() {

	var v1, v2, v3;

	boids.forEach(function (e, i, a) {
		v1 = cohesion(e);
		v2 = avoidance(e);
		v3 = alignment(e);

		var acceleration = new vector();
		acceleration = addVectors(acceleration, v1);
		acceleration = addVectors(acceleration, v2);
		acceleration = addVectors(acceleration, v3);
		e.velocity = addVectors(e.velocity, acceleration);
		e.velocity = limitVector(e.velocity, boidMaxVelocity, boidMaxVelocity);

		e.position.vec = addVectors(e.position.vec, e.velocity);
	});

}

// Only used when drawing
// The true position does not wrap
function wrapBoid(old_pos) {
	var p = new pos();
	p.vec.x = old_pos.vec.x;
	p.vec.y = old_pos.vec.y;

	if(old_pos.vec.x > width)
		p.vec.x = old_pos.vec.x % width;
	else if(old_pos.vec.x < 0)
		p.vec.x = width + (old_pos.vec.x % width);

	if(old_pos.vec.y > height)
		p.vec.y = old_pos.vec.y % height;
	else if(old_pos.vec.y < 0)
		p.vec.y = height + (old_pos.vec.y % height);

	return p;
}

function drawBoid(b) {

	// get positions
	var centerPos = wrapBoid(b.position);
	var backLeft = new pos();
	backLeft.vec.x = centerPos.getX() - boidTailOffset;
	backLeft.vec.y = centerPos.getY() - boidTailOffset;
	var backRight = new pos();
	backRight.vec.x = centerPos.getX() - boidTailOffset;
	backRight.vec.y = centerPos.getY() + boidTailOffset;
	var head = new pos();
	head.vec.x = centerPos.getX() + boidHeadOffset;
	head.vec.y = centerPos.getY();

	// get angle
	var normal_vel = normalizeVector(b.velocity);
	var angle = Math.atan2(normal_vel.x, normal_vel.y);

	var gradient = ctx.createRadialGradient(centerPos.getX(), centerPos.getY(), boidTailOffset / 2,
		centerPos.getX(), centerPos.getY(), boidTailOffset);
	gradient.addColorStop(0.2, 'rgb(50, 50, 255)');
	gradient.addColorStop(0.8, 'rgb(75, 75, 255)');
	ctx.fillStyle = gradient;

	ctx.save();
	ctx.translate(centerPos.getX(), centerPos.getY());
	// alter rotation based on direction
	// otherwise the boids travel backwards
	// when x and y signs aren't the same
	if(b.velocity.x / b.velocity.y > 0) {
		ctx.rotate(angle);
	} else {
		ctx.rotate(angle + (Math.PI));
	}


	ctx.beginPath();
	ctx.moveTo(-boidTailOffset, -boidTailOffset);
	ctx.quadraticCurveTo(0, 0, -boidTailOffset, boidTailOffset);
	ctx.quadraticCurveTo(0, 0, boidHeadOffset, 0);
	ctx.moveTo(-boidTailOffset, -boidTailOffset);
	ctx.quadraticCurveTo(0, 0, boidHeadOffset, 0);
	ctx.fill();

	ctx.restore();

}

function boidLoop() {
	var startTime, endTime;
	startTime = Date.now();

	ctx.fillStyle = 'rgb(200, 200, 200)';
	ctx.fillRect(0, 0, width, height);
	boids.forEach(function (e, i, a) {
		drawBoid(e);
	});
	moveAllBoids();

	endTime = Date.now();

	setTimeout(function () { boidLoop(); }, targetTime - (endTime - startTime));
}

function init() {

	canvas = document.getElementById('boid');
	ctx = canvas.getContext('2d');

	width = $('#boid').width();
	height = $('#boid').height();

	boids = [];
	boidCount = 0;

	boidTailOffset = 5;
	boidHeadOffset = 12;
	boidMaxVelocity = 8;

	for(var i = 0; i < 50; ++i) {
		createBoid(width / 2, height / 2);
	}

	boids.forEach(function (e, i, a) {

		var xIsPositive, yIsPositive;
		xIsPositive = Math.random() > 0.5 ? 1 : -1;
		yIsPositive = Math.random() > 0.5 ? 1 : -1;

		e.velocity.x = xIsPositive * Math.floor(Math.random() * (5 - 1 + 1) + 1);
		e.velocity.y = yIsPositive * Math.floor(Math.random() * (5 - 1 + 1) + 1);
	});

	boidLoop();
}

$(document).ready(function() { init(); });
