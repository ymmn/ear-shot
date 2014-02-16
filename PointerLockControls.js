/**
 * @author mrdoob / http://mrdoob.com/
 */

THREE.PointerLockControls = function ( camera ) {

	var scope = this;

	camera.rotation.set( 0, 0, 0 );

	var pitchObject = new THREE.Object3D();
	pitchObject.add( camera );

	var yawObject = new THREE.Object3D();
	yawObject.position.y = 10;
	yawObject.add( pitchObject );

	var moveForward = false;
	var moveBackward = false;
	var moveLeft = false;
	var moveRight = false;

	var isOnObject = false;
	var canJump = false;

	var velocity = new THREE.Vector3();

	var PI_2 = Math.PI / 2;


	var onMouseMove = function ( event ) {

		if ( scope.enabled === false ) return;

		var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
		var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

		yawObject.rotation.y -= movementX * 0.002;
		pitchObject.rotation.x -= movementY * 0.002;

		pitchObject.rotation.x = Math.max( - PI_2, Math.min( PI_2, pitchObject.rotation.x ) );

	};

	var onKeyDown = function ( event ) {

		switch ( event.keyCode ) {

			case 38: // up
			case 87: // w
				moveForward = true;
				break;

			case 37: // left
			case 65: // a
				moveLeft = true; break;

			case 40: // down
			case 83: // s
				moveBackward = true;
				break;

			case 39: // right
			case 68: // d
				moveRight = true;
				break;

			case 70: // f
				DEBUG = true;
				break;

			case 32:
				toggleDetector = true;
				break;

			case 32: // space
				if ( canJump === true ) velocity.y += gravityDir.y * -10;
				canJump = false;
				break;

			case 66: // b
				gravityDir.x = 0;
				gravityDir.z = 0;
				gravityDir.y = 1;
				// pitchObject.rotation.z += 2 * PI_2;
				break;

			case 85: // u
				gravityDir.x = 0;
				gravityDir.y = 0;
				gravityDir.z = -1;
				break;

			case 72: // h
				gravityDir.y = -1;
				gravityDir.z = 0;
				gravityDir.x = 0;
				break;

			case 71: // g
				gravityDir.y = 0;
				gravityDir.z = 1;
				gravityDir.x = 0;
				break;

			case 86: // v
				gravityDir.y = 0;
				gravityDir.z = 0;
				gravityDir.x = 1;
				break;

			case 89: // y
				gravityDir.y = 0;
				gravityDir.z = 0;
				gravityDir.x = -1;
				break;
		}

	};

	var onKeyUp = function ( event ) {

		switch( event.keyCode ) {

			case 38: // up
			case 87: // w
				moveForward = false;
				break;

			case 70:
				DEBUG = false;
				break;

			case 32:
				toggleDetector = false;
				break;

			case 81:
				weaponIndex++;
				weaponIndex = weaponIndex % WEAPONS.length;
				break;

			case 37: // left
			case 65: // a
				moveLeft = false;
				break;

			case 40: // down
			case 83: // s
				moveBackward = false;
				break;

			case 39: // right
			case 68: // d
				moveRight = false;
				break;

		}

	};

	var onMouseDown = function(e) {
		if(ammo > 0) {
			var recoilAmt = WEAPONS[weaponIndex].recoil;
			var moved = 0;
			var recoverSpeed = 0.001;
			pitchObject.rotation.x += recoilAmt;
			var recoil = setInterval(function(){
				pitchObject.rotation.x -= recoverSpeed;
				moved += recoverSpeed;
				if (moved >= recoilAmt) {
					// pitchObject.rotation.x = temp;
					clearInterval(recoil);
				}
			},1);
		}
	};

	document.addEventListener( 'mousemove', onMouseMove, false );
	document.addEventListener( 'keydown', onKeyDown, false );
	document.addEventListener( 'keyup', onKeyUp, false );
	document.addEventListener( 'mousedown', onMouseDown, false);

	this.enabled = false;
	this.object = yawObject;

	this.getObject = function () {

		return yawObject;

	};

	this.isOnObject = function ( boolean ) {

		isOnObject = boolean;
		canJump = boolean;

	};

	this.getDirection = function() {

		// assumes the camera itself is not rotated

		var direction = new THREE.Vector3( 0, 0, -1 );
		var rotation = new THREE.Euler( 0, 0, 0, "YXZ" );

		return function( v ) {

			rotation.set( pitchObject.rotation.x, yawObject.rotation.y, 0 );

			v.copy( direction ).applyEuler( rotation );

			return v;

		}

	}();
	var counter = 0;
	var moved = 0;

	this.update = function ( delta ) {

		var movespeed = 20.12;
		var friction = 0.8;

		if ( scope.enabled === false ) return;

		delta *= 0.1;

		velocity.x += ( - velocity.x ) * friction * delta;
		velocity.z += ( - velocity.z ) * friction * delta;

		/* gravity */
		// velocity.y += gravityDir.y * 0.25 * delta;

		

		if ( moveForward ) {
			velocity.z -= movespeed * delta;

			if (counter == 0){
				var recoilAmt = -0.05;
				moved = 0;
				pitchObject.rotation.x += recoilAmt;
			}
			
			if (moved >= recoilAmt){
				var recoverSpeed = 0.001;
				pitchObject.rotation.x += recoverSpeed;
				moved -= recoverSpeed;
			}	
			
			counter = (counter + 1)%2000;
		}
		if ( moveBackward ) velocity.z += movespeed * delta;

		if ( moveLeft ) velocity.x -= movespeed * delta;
		if ( moveRight ) velocity.x += movespeed * delta;

		if ( isOnObject === true ) {
			velocity.y = Math.max( 0, velocity.y );
		}
		
		if (!checkTowerCollision(new t.Vector3(3*velocity.x, 3*velocity.y, 3*velocity.z).add(this.object.position), false) ) {
			yawObject.translateX( velocity.x );
			yawObject.translateY( velocity.y ); 
			yawObject.translateZ( velocity.z );
		}

		if(yawObject.position.x < -(UNITSIZE * (mapW/2 - 1))) {
			velocity.x = 0;
			yawObject.position.x = -(UNITSIZE * (mapW/2 - 1));
		}

		if(yawObject.position.z < -(UNITSIZE * (mapW/2 - 1))) {
			velocity.z = 0;
			yawObject.position.z = -(UNITSIZE * (mapW/2 - 1));
		}

		if(yawObject.position.z > (UNITSIZE * (mapW/2 - 2))) {
			velocity.z = 0;
			yawObject.position.z = UNITSIZE * (mapW/2 -2);
		}

		if(yawObject.position.x > (UNITSIZE * (mapW/2 -2))) {
			velocity.x = 0;
			yawObject.position.x = UNITSIZE * (mapW/2 -2);
		}

		// hit the floor
		if ( yawObject.position.y < 10 ) {

			velocity.y = 0;
			yawObject.position.y = 10;

			canJump = true;

		}


	};

};
