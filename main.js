/**
 * Notes:
 * - Coordinates are specified as (X, Y, Z) where X and Z are horizontal and Y
 *   is vertical
 */

// 1 is boundary
// 2 is tower
var map = [ // 1  2  3  4  5  6  7  8  9
           [1, 1, 1, 1, 1, 1, 1, 1, 1, 1,], // 0
           [1, 0, 0, 0, 0, 0, 0, 0, 0, 1,], // 1
           [1, 0, 2, 0, 0, 0, 0, 2, 0, 1,], // 2
           [1, 0, 0, 0, 0, 3, 0, 0, 0, 1,], // 3
           [1, 0, 0, 0, 0, 0, 0, 0, 0, 1,], // 4
           [1, 0, 0, 0, 0, 0, 0, 3, 0, 1,], // 5
           [1, 0, 0, 0, 3, 0, 0, 0, 0, 1,], // 6
           [1, 0, 2, 0, 0, 0, 0, 2, 0, 1,], // 7
           [1, 0, 0, 0, 0, 0, 0, 0, 0, 1,], // 8
           [1, 1, 1, 1, 1, 1, 1, 1, 1, 1,], // 9
           ], mapW = map.length, mapH = map[0].length;

// Semi-constants
var WIDTH = window.innerWidth,
	HEIGHT = window.innerHeight,
	ASPECT = WIDTH / HEIGHT,
	UNITSIZE = 250,
	WALLHEIGHT = UNITSIZE / 3,
	MOVESPEED = 100,
	LOOKSPEED = 0.075,
	BULLETMOVESPEED = MOVESPEED * 15,
	NUMAI = 5,
	PROJECTILEDAMAGE = 50;
	DAMAGERADIUS = 20,
	MAXAMMO = 10;
	GOTHIT = false,
	DEBUG = false,
	MAXDIST = 750,
	soundLoaded = false,
	attemptPickup = false,
	manifest = [
		{id:"death", src:"assets/death.wav"},
		{id:"hurt", src:"assets/hurt.wav"},
		{id:"gunshot", src:"assets/gunshot.wav"},
		{id:"guncock", src:"assets/guncock.wav"},
		{id:"paingrunt", src:"assets/paingrunt.wav"},
		{id:"deathgrunt", src:"assets/deathgrunt.wav"},
		{id:"healthpack", src:"assets/healthpack.mp3"},
	],
	detectors = [1,2,3];

// Global vars
var t = THREE, scene, cam, renderer, controls, clock, projector, model, skin;
var runAnim = true, mouse = { x: 0, y: 0 }, kills = 0, health = 100, ammo = MAXAMMO, lastShotFired = 0;
var healthCube, lastHealthPickup = 0;
var towers = [];
var accuracy = 0, numShots = 0, numHits = 0;
var hitAnything = false;
var aiGeo = new t.CubeGeometry(40, 40, 40);

/*
var finder = new PF.AStarFinder({ // Defaults to Manhattan heuristic
	allowDiagonal: true,
}), grid = new PF.Grid(mapW, mapH, map);
*/
var pointerlockchange = function ( event ) {

	var element = document.body;
	if ( document.pointerLockElement === element || document.mozPointerLockElement === element || document.webkitPointerLockElement === element ) {
		controls.enabled = true;
		$("#intro").fadeOut();
		$("#crosshair").show();
	} else {
		controls.enabled = false;
		$("#intro").show();
		$("#crosshair").hide();
	}

};

function requestPointerLockPls(){

	// Ask the browser to lock the pointer
	var element = document.body;
	element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;

	if ( /Firefox/i.test( navigator.userAgent ) ) {

		var fullscreenchange = function ( event ) {

			if ( document.fullscreenElement === element || document.mozFullscreenElement === element || document.mozFullScreenElement === element ) {

				document.removeEventListener( 'fullscreenchange', fullscreenchange );
				document.removeEventListener( 'mozfullscreenchange', fullscreenchange );

				element.requestPointerLock();
			}

		}

		document.addEventListener( 'fullscreenchange', fullscreenchange, false );
		document.addEventListener( 'mozfullscreenchange', fullscreenchange, false );

		element.requestFullscreen = element.requestFullscreen || element.mozRequestFullscreen || element.mozRequestFullScreen || element.webkitRequestFullscreen;

		element.requestFullscreen();

	} else {

		element.requestPointerLock();

	}

}

// Initialize and run on document ready
$(document).ready(function() {
	$('#intro').css({width: WIDTH, height: HEIGHT});
	$("#play").on('click', function(e) {
		e.preventDefault();
		
		// Ask the browser to lock the pointer
		requestPointerLockPls();

		// Display the HUD: radar, health, score, and credits/directions
		$('body').append('<div id="hud"><p>Health: <span id="health">100</span></p><p>Score: <span id="score">0</span></p><p>Kills: <span id="kills">0</span></p><p>Accuracy: <span id="accuracy">0</span>%</p></div>');
		$('body').append('<canvas id="radar" width="200" height="200"></canvas>');

	});
	// Hook pointer lock state change events
	document.addEventListener( 'pointerlockchange', pointerlockchange, false );
	document.addEventListener( 'mozpointerlockchange', pointerlockchange, false );
	document.addEventListener( 'webkitpointerlockchange', pointerlockchange, false );
	/*
	new t.ColladaLoader().load('models/Yoshi/Yoshi.dae', function(collada) {
		model = collada.scene;
		skin = collada.skins[0];
		model.scale.set(0.2, 0.2, 0.2);
		model.position.set(0, 5, 0);
		scene.add(model);
	});
	*/
	init();
	setInterval(drawRadar, 1000);
	animate();
});


// Setup
function init() {
	setupSound();
	createjs.Sound.registerManifest(manifest);
	clock = new t.Clock(); // Used in render() for controls.update()
	projector = new t.Projector(); // Used in bullet projection
	scene = new t.Scene(); // Holds all objects in the canvas
	scene.fog = new t.FogExp2(0xD6F1FF, 0.0005); // color, density
	
	// load 3d model 
    // var loader = new THREE.JSONLoader();
    // loader.load( "models/zombie.js", function(geometry){
    // 	aiGeo = geometry;
    // });

	// Set up camera
	cam = new t.PerspectiveCamera(60, ASPECT, 1, 10000); // FOV, aspect, near, far
	cam.position.y = UNITSIZE * .2;
	controls = new THREE.PointerLockControls( cam );
	scene.add( controls.object );
	// scene.add( cam );
	
	// Camera moves with mouse, flies around with WASD/arrow keys
	// controls = new t.FirstPersonControls(cam);
	// controls.movementSpeed = MOVESPEED;
	// controls.lookSpeed = LOOKSPEED;
	// controls.lookVertical = false; // Temporary solution; play on flat surfaces only
	// controls.noFly = true;

	// World objects
	setupScene();
	
	// Artificial Intelligence
	setupAI();
	
	// Handle drawing as WebGL (faster than Canvas but less supported)
	renderer = new t.WebGLRenderer();
	renderer.setSize(WIDTH, HEIGHT);
	
	// Add the canvas to the document
	renderer.domElement.style.backgroundColor = '#D6F1FF'; // easier to see
	document.body.appendChild(renderer.domElement);
	
	// Track mouse position so we know where to shoot
	document.addEventListener( 'mousemove', onDocumentMouseMove, false );
	
	// Shoot on click
	$(document).click(function(e) {
		e.preventDefault;
		if (e.which === 1) { // Left click only
			if(ammo > 0) {
				numShots++;
				hitAnything = false;
			}
			var opos = controls.object.position;
			var r = function(){ return 3 * (Math.random() - 0.5); };
			for(var i = 0; i < 10; i++) {
				pos = { x: opos.x + r(), y: opos.y, z: opos.z + r() };
				createBullet(undefined, pos);
			}
		}
	});
	
	// Set up "hurt" flash
	$('body').append('<div id="hurt"></div>');
	$('#hurt').css({width: WIDTH, height: HEIGHT,});
}

// Helper function for browser frames
function animate() {
	if (runAnim) {
		requestAnimationFrame(animate);
	}
	render();
}

var time = Date.now();
// Update and display
function render() {
	if(!controls.enabled) return;
	var delta = clock.getDelta(), speed = delta * BULLETMOVESPEED;
	var aispeed = delta * 1 *MOVESPEED / 10;
	var tdelta = Date.now() - time;
	controls.update(tdelta); // Move camera

	/* change audio based on camera pos and orientation */
	if(soundLoaded) {
		changeListenerPosition(controls.object.position.x, controls.object.position.y, controls.object.position.z);
		changeListenerOrientation(controls.object);
	}

	
	// Rotate the health cube
	healthcube.rotation.x += 0.004;
	healthcube.rotation.y += 0.008;

	for(var i = 0; i < detectors.length; i++) {
		dtctor = detectors[i];
		if (distance(controls.object.position.x, controls.object.position.z, dtctor.position.x, dtctor.position.z) < 30 && attemptPickup) {
			scene.remove(dtctor);
			detectors.splice(i, 1);
		}
	}

	// Allow picking it up once per minute
	if (Date.now() > lastHealthPickup + 60000) {
		if (distance(controls.object.position.x, controls.object.position.z, healthcube.position.x, healthcube.position.z) < 15 && health != 100) {
			health = Math.min(health + 50, 100);
			$('#health').html(health);
			lastHealthPickup = Date.now();
			createjs.Sound.play('healthpack');
		}
		healthcube.material.wireframe = false;
	}
	else {
		healthcube.material.wireframe = true;
	}

	for (var i = ai.length-1; i >= 0; i--) {
		var a = ai[i];
		var detected = false;
		for(var j = 0; j < detectors.length; j++){
			var dtctor = detectors[j];
			var d = distance(a.position.x, a.position.z, dtctor.position.x, dtctor.position.z);
			if (d < 100) {
				detected = true;
				break;
			}
		}
		a.invisible = !detected && !DEBUG;
	}

	// Update bullets. Walk backwards through the list so we can remove items.
	var hAnything = false;
	for (var i = bullets.length-1; i >= 0; i--) {
		var b = bullets[i], p = b.position, d = b.ray.direction;
		// console.log("bullet flyinggg");
		if (checkWallCollision(p)) {
			bullets.splice(i, 1);
			scene.remove(b);
			continue;
		}
		// Collide with AI
		var hit = false;
		for (var j = ai.length-1; j >= 0; j--) {
			var a = ai[j];
			var v = a.geometry.vertices[0];
			var c = a.position;
			var x = Math.abs(v.x), z = Math.abs(v.z);
			//console.log(Math.round(p.x), Math.round(p.z), c.x, c.z, x, z);
			if (p.x < c.x + x && p.x > c.x - x &&
					p.z < c.z + z && p.z > c.z - z &&
					b.owner != a) {
				bullets.splice(i, 1);
				scene.remove(b);
				a.health -= PROJECTILEDAMAGE;
				scene.remove(a);
				a.invisible = DEBUG;
				console.log("DAMAGE");
				var distFromPlayer = distance(a.position.x, a.position.z, controls.object.position.x, controls.object.position.z);
				if (a.health > 0) {
					var hurtSound = createjs.Sound.play('hurt');
					var vol;
					if (distFromPlayer > MAXDIST) {
						vol = 0.01;
					} else if (distFromPlayer < 10) {
						vol = 1;
					} else {
						vol = (MAXDIST - distFromPlayer) / MAXDIST;
					}
					hurtSound.setVolume(vol);
					// console.log(distFromPlayer, MAXDIST, hurtSound.volume)
				}
				setTimeout(function() {  if(a.health > 0 && a.invisible == DEBUG) { console.log("invisi again"); scene.add(a); a.invisible = !DEBUG; }/*a.material.opacity = 1;*/ },1000);
				var color = a.material.color, percent = a.health / 100;
				hit = true;
				break;
			}
		}
		hAnything = hAnything || hit;
		// Bullet hits player
		if (distance(p.x, p.z, controls.object.position.x, controls.object.position.z) < 25 && b.owner != cam) {
			$('#hurt').fadeIn(75);
			health -= 10;
			if (health < 0) {
				health = 0;
				createjs.Sound.play('deathgrunt');
			}
			else {
				createjs.Sound.play('paingrunt');
			}
			val = health < 25 ? '<span style="color: darkRed">' + health + '</span>' : health;
			$('#health').html(val);
			bullets.splice(i, 1);
			scene.remove(b);
			$('#hurt').fadeOut(350);
		}
		if (!hit) {
			b.translateX(speed * d.x);
			//bullets[i].translateY(speed * bullets[i].direction.y);
			b.translateZ(speed * d.z);
		}
	}
	if(!hitAnything && hAnything){
		 numHits++;
		 hitAnything = true;
	}

	// Update AI.
	// console.log(ai.length);
	for (var i = ai.length-1; i >= 0; i--) {
		var a = ai[i];

		/* make ai appear or disappear */
		// console.log(a.invisible);
		if(a.invisible != a.prevInvisible) {
			if(a.invisible) {
				// console.log("REMOVINGGG");
				scene.remove(a);
			} else {
				// console.log("ADDING TO SCENE");
				scene.add(a);
			}
		}
		a.prevInvisible = a.invisible;
		// console.log("I HAVE AI");
		var distFromPlayer = distance(a.position.x, a.position.z, controls.object.position.x, controls.object.position.z);
		if (a.health <= 0) {
			console.log("DED");
			ai.splice(i, 1);
			scene.remove(a);
			kills++;
			$('#kills').html(kills);
			/* stop footsteps */
			a.sound.stop();
			var deathSound = createjs.Sound.play('death');
			var vol;
			if (distFromPlayer > MAXDIST) {
				vol = 0.01;
			} else if (distFromPlayer < 10) {
				vol = 1;
			} else {
				vol = (MAXDIST - distFromPlayer) / MAXDIST;
			}
			deathSound.setVolume(vol);
			$('#score').html(kills * 100);
			addAI();
		}

		/* reload */
		if ((Date.now() > lastShotFired + 2000) && ammo < MAXAMMO) {
			ammo = MAXAMMO;
			createjs.Sound.play('guncock');
		}


		/* update enemy audio based on position and orientation */
		if(soundLoaded) {
			AIPos = a.position;
			myPos = controls.object.position;
			posVector = new THREE.Vector3(myPos.x-AIPos.x, myPos.y-AIPos.y, myPos.z-AIPos.z);
			a.sound.changeAudioPosition(AIPos.x, AIPos.y, AIPos.z);
			a.sound.changeAudioOrientation(posVector, AIPos, a.matrixWorld);
		}

		// Move AI
		var closestTarget;
		var minDist = -1;
		for (var k = 0; k < towers.length; k++) {
			var dist = Math.abs(towers[k].position.x - a.position.x) + Math.abs(towers[k].position.z - a.position.z);
			if (dist < minDist || minDist == -1) {
				minDist = dist;
				closestTarget = towers[k];
			}
		}
		var playerDist = Math.abs(controls.object.position.x - a.position.x) + Math.abs(controls.object.position.z - a.position.z);
		if (playerDist < minDist)
			closestTarget = controls.object;

		var transX = closestTarget.position.x - a.position.x;
		var transZ = closestTarget.position.z - a.position.z;
		a.translateX(aispeed * transX/100);
		a.translateZ(aispeed * transZ/100);
		var c = getMapSector(a.position);
		if (c.x < 0 || c.x >= mapW || c.y < 0 || c.y >= mapH || checkWallCollision(a.position)) {
			a.translateX(-2 * aispeed * a.lastRandomX);
			a.translateZ(-2 * aispeed * a.lastRandomZ);
			a.lastRandomX = Math.random() * 2 - 1;
			a.lastRandomZ = Math.random() * 2 - 1;
		}
		if (c.x < -1 || c.x > mapW || c.z < -1 || c.z > mapH) {
			ai.splice(i, 1);
			scene.remove(a);
			addAI();
		}
		// AI Damage
		if (!GOTHIT && distFromPlayer < DAMAGERADIUS) {
			$('#hurt').fadeIn(75);
			health -= 10;
			if (health < 0) health = 0;
			if (health < 25){	
				createjs.Sound.play('deathgrunt');
			}
			else createjs.Sound.play('paingrunt');
			val = health < 25 ? '<span style="color: darkRed">' + health + '</span>' : health;
			$('#health').html(val);
			bullets.splice(i, 1);
			scene.remove(b);
			$('#hurt').fadeOut(350);
			GOTHIT = true;
			setTimeout(function(){GOTHIT = false},1000);
		}

		/*
		var c = getMapSector(a.position);
		if (a.pathPos == a.path.length-1) {
			console.log('finding new path for '+c.x+','+c.z);
			a.pathPos = 1;
			a.path = getAIpath(a);
		}
		var dest = a.path[a.pathPos], proportion = (c.z-dest[1])/(c.x-dest[0]);
		a.translateX(aispeed * proportion);
		a.translateZ(aispeed * 1-proportion);
		console.log(c.x, c.z, dest[0], dest[1]);
		if (c.x == dest[0] && c.z == dest[1]) {
			console.log(c.x+','+c.z+' reached destination');
			a.PathPos++;
		}
		*/
		// var cc = getMapSector(controls.object.position);
		// if (Date.now() > a.lastShot + 750 && distance(c.x, c.z, cc.x, cc.z) < 2) {
		// 	createBullet(a);
		// 	a.lastShot = Date.now();
		// }
	}

	renderer.render(scene, cam); // Repaint
	time = Date.now();
	
	// Death
	// if (health <= 0) {
	// 	runAnim = false;
	// 	$(renderer.domElement).fadeOut();
	// 	$('#radar, #hud, #credits').fadeOut();
	// 	$('#intro').fadeIn();
	// 	$('#intro').html('Ouch! Click to restart...');
	// 	$('#intro').one('click', function() {
	// 		location = location;
			/*
			$(renderer.domElement).fadeIn();
			$('#radar, #hud, #credits').fadeIn();
			$(this).fadeOut();
			runAnim = true;
			animate();
			health = 100;
			$('#health').html(health);
			kills--;
			if (kills <= 0) kills = 0;
			$('#score').html(kills * 100);
			cam.translateX(-controls.object.position.x);
			cam.translateZ(-controls.object.position.z);
			*/
	// 	});
	// }
}

// Set up the objects in the world
function setupScene() {
	var UNITSIZE = 250, units = mapW;
	// Geometry: floor
	var floorTex = t.ImageUtils.loadTexture('images/floor-forest2.png');
	floorTex.wrapS = t.RepeatWrapping;
	floorTex.wrapT = t.RepeatWrapping;
	floorTex.repeat.set(20,20);
	var floorMesh = new t.MeshBasicMaterial({map: floorTex});
	// floorTex = new t.MeshLambertMaterial({color: 0xABCABC})
	var floor = new t.Mesh(
			new t.CubeGeometry(units * UNITSIZE, 10, units * UNITSIZE),
			floorMesh
	);
	scene.add(floor);

	// Trees
	var dcnt = 0;
	for (var i = 0; i < mapW-1; i++) {
		for (var j = 0; j < mapH-1; j++) {
			if(map[i][j] == 3){
				// draw detector
				detectors[dcnt] = new t.Mesh(
					new t.SphereGeometry(10),
					new t.MeshLambertMaterial({color: 0xFFFFFF})
				);
				var x = (i-mapW/2) * UNITSIZE;
				var z = (j-mapH/2) * UNITSIZE;
				detectors[dcnt].position.set(x, 100, z);
				scene.add(detectors[dcnt]);
				dcnt++;
			}else if (Math.random() > 0.75) {
				var treeTex = t.ImageUtils.loadTexture('images/bark.jpg');
				treeTex.wrapS = treeTex.wrapT = t.RepeatWrapping;
				// treeTex.repeat.set(5,1);
				var treeMesh = new t.MeshBasicMaterial({map: treeTex});
				var tree = new t.Mesh(
					new t.CylinderGeometry(20, 20, 250, 8, 1, false), // top rad, bottom rad, height, vert faces, horiz faces, capped ends
					treeMesh
				);
				var leaves = new t.Mesh(
					new t.SphereGeometry(100),
					new t.MeshLambertMaterial({color: 0x266A2E})
				);
				var x = getRandBetween(0, UNITSIZE);
				var z = getRandBetween(0, UNITSIZE);
				// aiMaterial.wireframe = true;
				x += (i-mapW/2) * UNITSIZE;
				z += (j-mapH/2) * UNITSIZE;
				tree.position.set(x, 125, z);
				leaves.position.set(x, 250, z);
				scene.add(tree);
				scene.add(leaves);
			}
		}
	}

	//Towers
	for (var i = 0; i < mapW; i++) {
		for (var j = 0, m = map[i].length; j < m; j++) {
			if (map[i][j] == 2) {
				createTower({ x: (i - units/2)*UNITSIZE, y: 0, z: (j - units/2) * UNITSIZE });
			}
		}
	}
	
	// // Geometry: walls
	// var cube = new t.CubeGeometry(UNITSIZE, WALLHEIGHT, UNITSIZE);
	// var materials = [
	//                  new t.MeshLambertMaterial({/*color: 0x00CCAA,*/map: t.ImageUtils.loadTexture('images/wall-1.jpg')}),
	//                  new t.MeshLambertMaterial({/*color: 0xC5EDA0,*/map: t.ImageUtils.loadTexture('images/wall-2.jpg')}),
	//                  new t.MeshLambertMaterial({color: 0xFBEBCD}),
	//                  ];
	// for (var i = 0; i < mapW; i++) {
	// 	for (var j = 0, m = map[i].length; j < m; j++) {
	// 		if (map[i][j]) {
	// 			var wall = new t.Mesh(cube, materials[map[i][j]-1]);
	// 			wall.position.x = (i - units/2) * UNITSIZE;
	// 			wall.position.y = WALLHEIGHT/2;
	// 			wall.position.z = (j - units/2) * UNITSIZE;
	// 			scene.add(wall);
	// 		}
	// 	}
	// }

	
	// Health cube
	healthcube = new t.Mesh(
			new t.CubeGeometry(30, 30, 30),
			new t.MeshBasicMaterial({map: t.ImageUtils.loadTexture('images/health.png')})
	);
	healthcube.position.set(-UNITSIZE-15, 35, -UNITSIZE-15);
	scene.add(healthcube);
	
	// Lighting
	var directionalLight1 = new t.DirectionalLight( 0xF7EFBE, 0.7 );
	directionalLight1.position.set( 0.5, 1, 0.5 );
	scene.add( directionalLight1 );
	var directionalLight2 = new t.DirectionalLight( 0xF7EFBE, 0.5 );
	directionalLight2.position.set( -0.5, -1, -0.5 );
	scene.add( directionalLight2 );
}

var ai = [];
function setupAI() {
	for (var i = 0; i < NUMAI; i++) {
		addAI();
	}
}

function addAI() {
	var c = getMapSector(controls.object.position);
	var aiMaterial = new THREE.MeshLambertMaterial( { color: 0xFFBF00, transparent: false } ); //= new t.MeshBasicMaterial({/*color: 0xEE3333,*/map: t.ImageUtils.loadTexture('images/face.png')});
	var o = new t.Mesh(aiGeo, aiMaterial);

	do {
		var x = getRandBetween(0, mapW-1);
		var z = getRandBetween(0, mapH-1);
	} while (map[x][z] > 0 || (x == c.x && z == c.z));

	// aiMaterial.wireframe = true;
	x = Math.floor(x - mapW/2) * UNITSIZE;
	z = Math.floor(z - mapW/2) * UNITSIZE;
	o.position.set(x, UNITSIZE * 0.15, z);

	o.health = 100;
	//o.path = getAIpath(o);
	o.pathPos = 1;
	o.lastRandomX = Math.random();
	o.lastRandomZ = Math.random();
	o.lastShot = Date.now(); // Higher-fidelity timers aren't a big deal here.

	/* add 3d sound */
	o.sound = new AI_Sound();

	o.type = Math.floor(Math.random() * 3);

	ai.push(o);
	o.invisible = !DEBUG;
	o.prevInvisible = DEBUG;
}

function getAIpath(a) {
	var p = getMapSector(a.position);
	do { // Cop-out
		do {
			var x = getRandBetween(0, mapW-1);
			var z = getRandBetween(0, mapH-1);
		} while (map[x][z] > 0 || distance(p.x, p.z, x, z) < 3);
		var path = findAIpath(p.x, p.z, x, z);
	} while (path.length == 0);
	return path;
}

/**
 * Find a path from one grid cell to another.
 *
 * @param sX
 *   Starting grid x-coordinate.
 * @param sZ
 *   Starting grid z-coordinate.
 * @param eX
 *   Ending grid x-coordinate.
 * @param eZ
 *   Ending grid z-coordinate.
 * @returns
 *   An array of coordinates including the start and end positions representing
 *   the path from the starting cell to the ending cell.
 */
function findAIpath(sX, sZ, eX, eZ) {
	var backupGrid = grid.clone();
	var path = finder.findPath(sX, sZ, eX, eZ, grid);
	grid = backupGrid;
	return path;
}

function distance(x1, y1, x2, y2) {
	return Math.sqrt((x2-x1)*(x2-x1)+(y2-y1)*(y2-y1));
}

function getMapSector(v) {
	var x = Math.floor((v.x + UNITSIZE / 2) / UNITSIZE + mapW/2);
	var z = Math.floor((v.z + UNITSIZE / 2) / UNITSIZE + mapW/2);
	return {x: x, z: z};
}

/**
 * Check whether a Vector3 overlaps with a wall.
 *
 * @param v
 *   A THREE.Vector3 object representing a point in space.
 *   Passing controls.object.position is especially useful.
 * @returns {Boolean}
 *   true if the vector is inside a wall; false otherwise.
 */
function checkWallCollision(v) {
	var c = getMapSector(v);
	if(map[c.x] === undefined) return true;
	return map[c.x][c.z] > 0;
}

// Radar
function drawRadar() {
	var c = getMapSector(controls.object.position), context = document.getElementById('radar').getContext('2d');
	context.font = '10px Helvetica';
	for (var i = 0; i < mapW; i++) {
		for (var j = 0, m = map[i].length; j < m; j++) {
			var d = 0;
			var hasTower = false;
			for (var k = 0, n = ai.length; k < n; k++) {
				var e = getMapSector(ai[k].position);
				if (i == e.x && j == e.z) {
					d++; // num baddies in map
				}
			}
			var dd = 0;
			for (var k = 0, n = detectors.length; k < n; k++) {
				var e = getMapSector(detectors[k].position);
				if (i == e.x && j == e.z) {
					dd++; // num baddies in map
				}
			}
			for (var k = 0, n = towers.length; k < n; k++) {
				var e = getMapSector(towers[k].position);
				if (i == e.x && j == e.z)
					hasTower = true;
			}
			if (i == c.x && j == c.z && d == 0) { // your pos
				context.fillStyle = '#0000FF';
				context.fillRect(i * 20, j * 20, (i+1)*20, (j+1)*20);
			}
			else if (hasTower) {
				context.fillStyle = '#BB0000';
				context.fillRect(i * 20, j * 20, (i+1)*20, (j+1)*20);
				context.fillStyle = '#000000';
				context.fillText(''+d, i*20+8, j*20+12);
			}
			else if (DEBUG && i == c.x && j == c.z) { // your and their pos
				context.fillStyle = '#AA33FF';
				context.fillRect(i * 20, j * 20, (i+1)*20, (j+1)*20);
				context.fillStyle = '#000000';
				context.fillText(''+d, i*20+8, j*20+12);
			}
			else if (DEBUG && d > 0 && d < 10) { // their pos
				context.fillStyle = '#FFBF00';
				context.fillRect(i * 20, j * 20, (i+1)*20, (j+1)*20);
				context.fillStyle = '#000000';
				context.fillText(''+d, i*20+8, j*20+12);
			}
			else if (dd > 0) { // detectors
				context.fillStyle = '#FFFF00';
				context.fillRect(i * 20, j * 20, (i+1)*20, (j+1)*20);
				context.fillStyle = '#000000';
				context.fillText(''+dd, i*20+8, j*20+12);
			}
			else if (map[i][j] == 1) { // wall
				context.fillStyle = '#666666';
				context.fillRect(i * 20, j * 20, (i+1)*20, (j+1)*20);
			}
			else { // empty
				context.fillStyle = '#CCCCCC';
				context.fillRect(i * 20, j * 20, (i+1)*20, (j+1)*20);
			}
		}
	}
}

var bullets = [];
var sphereMaterial = new t.MeshBasicMaterial({color: 0x000000});
var sphereGeo = new t.SphereGeometry(2, 6, 6);
function createBullet(obj, pos) {
	if (obj === undefined) {
		obj = cam;
	}
	var sphere = new t.Mesh(sphereGeo, sphereMaterial);
	sphere.position.set(pos.x, pos.y * 0.8, pos.z);

	if (obj instanceof t.Camera) {
		if(ammo > 0) {
			lastShotFired = Date.now();
			ammo--;
			createjs.Sound.play('gunshot');
			var vector = new t.Vector3(mouse.x, mouse.y, 1);
			var r = function() { return (Math.random()-0.5) / 6 };
			var variation = new t.Vector3(r(), r(), 0);
			vector.add(variation);
			projector.unprojectVector(vector, obj);
			sphere.ray = new t.Ray(
					obj.position,
					vector.sub(obj.position).normalize()
			);
			sphere.owner = obj;
			
			bullets.push(sphere);
			scene.add(sphere);
		}
	}
	else {
		var vector = controls.object.position.clone();
		sphere.ray = new t.Ray(
				obj.position,
				vector.sub(obj.position).normalize()
		);
		sphere.owner = obj;
		
		bullets.push(sphere);
		scene.add(sphere);
	}
	
	return sphere;
}

function createTower(pos) {
	var towerMesh = new t.MeshBasicMaterial({color: 0xBB0000});
	var tower = new t.Mesh(
		new t.CylinderGeometry(90, 140, 550, 8, 1, false), // top rad, bottom rad, height, vert faces, horiz faces, capped ends
		towerMesh
	);

	tower.position.set(pos.x, pos.y, pos.z);
	towers.push(tower);
	scene.add(tower);
}


/*
function loadImage(path) {
	var image = document.createElement('img');
	var texture = new t.Texture(image, t.UVMapping);
	image.onload = function() { texture.needsUpdate = true; };
	image.src = path;
	return texture;
}
*/

function onDocumentMouseMove(e) {
	e.preventDefault();
	// console.log(mouse.y);
	mouse.x = 0; //(e.clientX / WIDTH) * 2 - 1;
	mouse.y = 2.5; //- (e.clientY / HEIGHT) * 2 + 1;
}

// Handle window resizing
$(window).resize(function() {
	WIDTH = window.innerWidth;
	HEIGHT = window.innerHeight;
	ASPECT = WIDTH / HEIGHT;
	if (cam) {
		cam.aspect = ASPECT;
		cam.updateProjectionMatrix();
	}
	if (renderer) {
		renderer.setSize(WIDTH, HEIGHT);
	}
	$('#intro, #hurt').css({width: WIDTH, height: HEIGHT,});
});

// Stop moving around when the window is unfocused (keeps my sanity!)
$(window).focus(function() {
	if (controls) controls.freeze = false;
});
$(window).blur(function() {
	if (controls) controls.freeze = true;
});

window.setInterval(function(){
	$("#accuracy").html( Math.round(10000 * numHits / numShots) / 100);
}, 1000);

//Get a random integer between lo and hi, inclusive.
//Assumes lo and hi are integers and lo is lower than hi.
function getRandBetween(lo, hi) {
 return parseInt(Math.floor(Math.random()*(hi-lo+1))+lo, 10);
}

