/*
 * Variables
 */
var canvas;
var ctx;
var height; // canvas height and width
var width;
var canvasOffset;

var boids;
var boidTailOffset;
var boidHeadOffset;
var boidMaxVelocity;
var boidScatter;

// Settings
var wrapAroundScreen;
var confineToScreen;

var scatterTypeOnClick; // -1 is away from point, 0 is general scatter, 1 is toward point

var maxBoids;

var targetTime = 33; // 30 frames per second

/*
 * Classes
 */

function vector() {
	this.x = 0;
	this.y = 0;
}

function boid() {
	this.id;
	this.position = new vector();
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

function mouseClick(evt) {

	var pos = {
		x: evt.pageX - canvasOffset.x,
		y: evt.pageY - canvasOffset.y
	};

	boidScatter.count = (1000 / targetTime);
	boidScatter.pos = pos;
}

/*
 * Boid methods
 */

function createBoid(xPos, yPos) {
	var b = new boid();
	b.id = boids.length;
	b.position.x = xPos;
	b.position.y = yPos;

	boids.push(b);
}

function cohesion(b) {

	var adjusmentAmount = 0.005;

	var flockCenter = new vector();

	for(var i = 0; i < boids.length; ++i) {
		flockCenter = addVectors(flockCenter, boids[i].position);
	}

	flockCenter = divideVector(flockCenter, boids.length);

	var adjustmentVector = 
		multVector((subtractVectors(flockCenter, b.position)), adjusmentAmount);

	return adjustmentVector;
}

function avoidance(b) {

	var avoidanceDistance = 25;

	var adjustmentVector = new vector();

	for(var i = 0; i < boids.length; ++i) {
		var e = boids[i];
		var dist = vectorMagnitude(subtractVectors(e.position, b.position));
		if(dist > 0 && dist < avoidanceDistance) {
			adjustmentVector = subtractVectors(adjustmentVector, 
				subtractVectors(e.position, b.position));
		}
	}

	adjustmentVector = multVector(adjustmentVector, 0.35);

	return adjustmentVector;
}

function alignment(b) {

	var adjustmentVector = new vector();

	for(var i = 0; i < boids.length; ++i) {
		adjustmentVector = addVectors(adjustmentVector, boids[i].velocity);
	}

	adjustmentVector = divideVector(adjustmentVector, boids.length);

	adjustmentVector = divideVector(subtractVectors(adjustmentVector, b.velocity), 8);

	return adjustmentVector;
}

function confinement(b) {

	var v = new vector();
	if(b.position.x < 0)
		v.x = 10;
	else if(b.position.x > width)
		v.x = -10;
	if(b.position.y < 0)
		v.y = 10;
	else if(b.position.y > height)
		v.y = -10;

	return v;
}

function tracking(b, pos) {

	var v = subtractVectors(pos, b.position);
	v = divideVector(v, 100);

	return v;
}

function moveAllBoids() {

	var v1, v2, v3, v4, v5;

	if(boidScatter.scatter)
		console.log('Scatter from ' + boidScatter.pos.x + ', '  + boidScatter.pos.y);

	boids.forEach(function (e, i, a) {
		v1 = cohesion(e);
		v2 = avoidance(e);
		v3 = alignment(e);
		v4 = confinement(e);
		if(boidScatter.count > 0 && scatterTypeOnClick !== 0) {
			v5 = tracking(e, boidScatter.pos);
			v5 = multVector(v5, scatterTypeOnClick);
		}
		else
			v5 = new vector();

		if(boidScatter.count > 0 && scatterTypeOnClick === 0)
			v1 = multVector(v1, -1);

		v4 = multVector(v4, confineToScreen);

		var acceleration = new vector();
		acceleration = addVectors(acceleration, v1);
		acceleration = addVectors(acceleration, v2);
		acceleration = addVectors(acceleration, v3);
		acceleration = addVectors(acceleration, v4);
		acceleration = addVectors(acceleration, v5);
		e.velocity = addVectors(e.velocity, acceleration);
		e.velocity = limitVector(e.velocity, boidMaxVelocity, boidMaxVelocity);

		e.position = addVectors(e.position, e.velocity);
	});

	if(boidScatter.count > 0)
		boidScatter.count -= 1;
}

// Only used when drawing
// The true position does not wrap
function wrapBoid(old_pos) {
	var p = new vector();
	p.x = old_pos.x;
	p.y = old_pos.y;

	if(old_pos.x > width)
		p.x = old_pos.x % width;
	else if(old_pos.x < 0)
		p.x = width + (old_pos.x % width);

	if(old_pos.y > height)
		p.y = old_pos.y % height;
	else if(old_pos.y < 0)
		p.y = height + (old_pos.y % height);

	return p;
}

function drawBoid(b) {

	// get positions
	var centerPos = wrapAroundScreen ? wrapBoid(b.position) : b.position;
	var backLeft = new vector();
	backLeft.x = centerPos.x - boidTailOffset;
	backLeft.y = centerPos.y - boidTailOffset;
	var backRight = new vector();
	backRight.x = centerPos.x - boidTailOffset;
	backRight.y = centerPos.y + boidTailOffset;
	var head = new vector();
	head.x = centerPos.x + boidHeadOffset;
	head.y = centerPos.y;

	// get angle
	var normal_vel = normalizeVector(b.velocity);
	var angle = Math.atan2(normal_vel.x, normal_vel.y);

	var gradient = ctx.createRadialGradient(centerPos.x, centerPos.y, boidTailOffset / 2,
		centerPos.x, centerPos.y, boidTailOffset);
	gradient.addColorStop(0.2, 'rgb(50, 50, 255)');
	gradient.addColorStop(0.8, 'rgb(75, 75, 255)');
	ctx.fillStyle = gradient;

	ctx.save();
	ctx.translate(centerPos.x, centerPos.y);
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
	for(var i = 0; i < boids.length; ++i) {
		drawBoid(boids[i]);
	}
	moveAllBoids();

	endTime = Date.now();

	setTimeout(function () { boidLoop(); }, targetTime - (endTime - startTime));
}

function initValues() {
	boids = [];

	boidTailOffset = 5;
	boidHeadOffset = 12;
	boidMaxVelocity = 6;
	boidScatter = {
		count: 0,
		pos: {
			x: 0,
			y: 0
		}
	}

	wrapAroundScreen = false;
	confineToScreen = 1;
	scatterTypeOnClick = -1;
	maxBoids = 25;
}

function initBoids() {

	canvas = $('#boid');
	if(typeof canvas[0] == 'undefined')
		return;
	ctx = canvas[0].getContext('2d');

	width = $('#boid')[0].width;
	height = $('#boid')[0].height;

	canvas.on('click', mouseClick);

	canvasOffset = {
		x: canvas.offset().left,
		y: canvas.offset().top
	};

	for(var i = 0; i < maxBoids; ++i) {
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

/**************************
 * Code to handle options *
 **************************/

function changeCanvasOptions() {
	console.log('caught click')
	var w = parseInt($('#opt_width').val(), 10);
	var h = parseInt($('#opt_height').val(), 10);

	console.log(w);
	console.log(h);

	if(isNaN(w) || isNaN(h)) {
		$('#opt_size_warning').show();
		return;
	}

	$('#opt_size_warning').hide();

	var canvas = $('#boid')[0];
	var ctx = canvas.getContext('2d');
	ctx.clearRect(0, 0, width, height);

	width = w;
	height = h;

	canvas.width = width;
	canvas.height = height;

}

function edgeCheckboxChanged() {

	var wrap = $('#opt_wrap_edges').is(':checked');
	var repel = $('#opt_repel_edges').is(':checked');

	if(wrap && repel) {
		$('#opt_edges_warning').show();
	} else {
		$('#opt_edges_warning').hide();
	}

	wrapAroundScreen = wrap;
	confineToScreen = repel ? 1 : 0;

}

function scatterRadioChanged() {

	var gen = $('#opt_gen_scatter').is(':checked');
	var targetS = $('#opt_target_scatter').is(':checked');
	var targetG = $('#opt_target_gather').is(':checked');

	if(gen)
		scatterTypeOnClick = 0;
	else if(targetS)
		scatterTypeOnClick = -1;
	else if(targetG)
		scatterTypeOnClick = 1;

	boidScatter.count = 0;
}

function changeBoidCount() {
	
	var newCount = parseInt($('#opt_boid_count').val());

	if(isNaN(newCount)) {
		$('#opt_boid_count_warning').show();
		return;
	}

	$('#opt_boid_count_warning').hide();

	if(newCount < boids.length) {
		boids.length = newCount;
	} else {
		var len = boids.length;

		for(var i = 0; i < (newCount - len); ++i) {
			createBoid(width / 2, height / 2);
		}

		for(var i = maxBoids; i < boids.length; ++i) {
			var e = boids[i];
			var xIsPositive, yIsPositive;
			xIsPositive = Math.random() > 0.5 ? 1 : -1;
			yIsPositive = Math.random() > 0.5 ? 1 : -1;

			e.velocity.x = xIsPositive * Math.floor(Math.random() * (5 - 1 + 1) + 1);
			e.velocity.y = yIsPositive * Math.floor(Math.random() * (5 - 1 + 1) + 1);
		}
	}

	maxBoids = newCount;
}

function initOptions() {
	// Hide warnings
	$('.opt_warning').hide();

	// Canvas options submit button and set values for height and width
	$('#canvas_opt_submit').click(function () { changeCanvasOptions(); });
	$('#opt_height').val($('#boid')[0].height);
	$('#opt_width').val($('#boid')[0].width);

	// Checking edge checkboxes
	$('#opt_wrap_edges').change(function () { edgeCheckboxChanged(); });
	$('#opt_repel_edges').change(function () { edgeCheckboxChanged(); });
	$('#opt_wrap_edges').prop('checked', wrapAroundScreen);
	$('#opt_repel_edges').prop('checked', confineToScreen === 1 ? true : false);

	// Scattering radio buttons
	$('#opt_gen_scatter').change(function () { scatterRadioChanged(); });
	$('#opt_target_scatter').change(function () { scatterRadioChanged(); });
	$('#opt_target_gather').change(function () { scatterRadioChanged(); });
	if(scatterTypeOnClick === 0)
		$('#opt_gen_scatter').prop('checked', true);
	else if(scatterTypeOnClick === -1)
		$('#opt_target_scatter').prop('checked', true);
	else if(scatterTypeOnClick === 1)
		$('#opt_target_gather').prop('checked', true);

	// Boid count
	$('#opt_boid_count').val(maxBoids);
	$('#opt_boid_count_submit').click(function () { changeBoidCount(); });
}

$(document).ready(function() { 
	initValues();
	initOptions();
	initBoids(); 
});
