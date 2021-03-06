var changeAudioPosition;
var changeListenerPosition;
var changeListenerOrientation;
var dbgChangeListenerOrientation;

var audioContext;
var SOUNDVOLUME = 20;
function PerspectiveSound(soundBuffer, startNow) {

	var ctx = audioContext;
	var that = this;


	// Create an object with a sound source and a volume control.
	var sound = {};
	sound.source = ctx.createBufferSource();
	sound.source.loop = true;
    sound.panner = ctx.createPanner();
	sound.volume = ctx.createGain();

	sound.volume.gain.value = SOUNDVOLUME;

	// Connect the sound source to the volume control.
	sound.source.connect(sound.volume);
	// Hook up the sound volume control to the main volume.
	sound.volume.connect(sound.panner);
	sound.panner.connect(ctx.destination);
	this.sound = sound;

	// Make the sound source loop.
	var plugBuffer = function(buffer){

		  sound.buffer = buffer;

		  // Make the sound source use the buffer and start playing it.
		  sound.source.buffer = sound.buffer;
		  soundLoaded = true;

		  // sound.panner = ctx.createPanner();
			// Instead of hooking up the volume to the main volume, hook it up to the panner.
			// sound.volume.connect(sound.panner);
			// And hook up the panner to the main volume.
			// sound.panner.connect(mainVolume);

			that.start = function() {
				sound.source.start();
			}

			that.stop = function() {
				sound.source.stop();
			};
			
			that.changeAudioPosition = function (x, y, z) {
				sound.panner.setPosition(x, y, z);
			};

			that.changeAudioOrientation = function(posVector, AIPos, m) {
				var vec = new THREE.Vector3(0,0,1);

				// Save the translation column and zero it.
				var mx = m.n14, my = m.n24, mz = m.n34;
				m.n14 = m.n24 = m.n34 = 0;

				// Multiply the 0,0,1 vector by the world matrix and normalize the result.
				vec.applyProjection( m );
				// m.multiplyVector3(vec);
				vec.normalize();

				var dotProd = vec.dot(posVector);
				var cos = dotProd / posVector.length() / vec.length();
				var coef = (1 + .5 * cos) * SOUNDVOLUME;
				posVector.multiplyScalar(1/coef);
				newPos = new THREE.Vector3(0,0,0);
				newPos.subVectors(AIPos,posVector)

				sound.panner.setPosition(newPos.x, newPos.y, newPos.z);

				// Restore the translation column.
				m.n14 = mx;
				m.n24 = my; 
				m.n34 = mz;
			};

			if(startNow) {
				that.start();
			}
	};

	plugBuffer(soundBuffer);
}


function setupSound() {
	// Detect if the audio context is supported.
	window.AudioContext = (
	  window.AudioContext ||
	  window.webkitAudioContext ||
	  null
	);

	if (!AudioContext) {
	  throw new Error("AudioContext not supported!");
	} 

	// Create a new audio context.
	var ctx = new AudioContext();
	audioContext = ctx;

	// Create a AudioGainNode to control the main volume.
	// var mainVolume = ctx.createGain();
	// Connect the main volume node to the context destination.
	// mainVolume.connect(ctx.destination);
	// loadSound(ctx);

	changeListenerPosition = function (x, y, z) {
		ctx.listener.setPosition(x, y, z);			
	};

	dbgChangeListenerOrientation = function(x, y, z) {
		ctx.listener.setOrientation(x, y, z, 0, 0, 0);
	};

	changeListenerOrientation = function(camera) {
		// The camera's world matrix is named "matrix".
		var m = camera.matrix;

		var mx = m.n14, my = m.n24, mz = m.n34;
		m.n14 = m.n24 = m.n34 = 0;

		// Multiply the orientation vector by the world matrix of the camera.
		var vec = new THREE.Vector3(0,0,1);
		vec.applyProjection( m );
		// m.multiplyVector3(vec);
		vec.normalize();

		// Multiply the up vector by the world matrix.
		var up = new THREE.Vector3(0,-1,0);
		up.applyProjection( m );
		// m.multiplyVector3(up);
		up.normalize();

		// Set the orientation and the up-vector for the listener.
		ctx.listener.setOrientation(vec.x, vec.y, vec.z, up.x, up.y, up.z);
	};

}