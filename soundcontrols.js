var changeAudioPosition;
var changeListenerPosition;
var changeListenerOrientation;
var dbgChangeListenerOrientation;

function playSound() {
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

	// Create a AudioGainNode to control the main volume.
	// var mainVolume = ctx.createGain();
	// Connect the main volume node to the context destination.
	// mainVolume.connect(ctx.destination);

	// Create an object with a sound source and a volume control.
	var sound = {};
	sound.source = ctx.createBufferSource();
	sound.source.loop = true;
    sound.panner = ctx.createPanner();
	sound.volume = ctx.createGain();

	console.log("VAL IS " + sound.volume.gain.value);
	sound.volume.gain.value = 20;

	// Connect the sound source to the volume control.
	sound.source.connect(sound.volume);
	// Hook up the sound volume control to the main volume.
	sound.volume.connect(sound.panner);
	sound.panner.connect(ctx.destination);

	// Make the sound source loop.

	// Load a sound file using an ArrayBuffer XMLHttpRequest.
	var request = new XMLHttpRequest();
	request.open("GET", "assets/loop.wav", true);
	request.responseType = "arraybuffer";
	request.onload = function(e) {

	  // Create a buffer from the response ArrayBuffer.
	  var buffer = ctx.createBuffer(this.response, false);
	  sound.buffer = buffer;

	  // Make the sound source use the buffer and start playing it.
	  sound.source.buffer = sound.buffer;
	  sound.source.start(ctx.currentTime);

	  // sound.panner = ctx.createPanner();
	  window.panner = sound.panner;
		// Instead of hooking up the volume to the main volume, hook it up to the panner.
		// sound.volume.connect(sound.panner);
		// And hook up the panner to the main volume.
		// sound.panner.connect(mainVolume);

		changeAudioPosition = function (x, y, z) {
			// console.log("(" + x + ", " + y + ", " + z + ")");
			sound.panner.setPosition(x, y, z);
		};

		changeAudioOrientation = function(m) {
			var vec = new THREE.Vector3(0,0,1);

			// Save the translation column and zero it.
			var mx = m.n14, my = m.n24, mz = m.n34;
			m.n14 = m.n24 = m.n34 = 0;

			// Multiply the 0,0,1 vector by the world matrix and normalize the result.
			m.multiplyVector3(vec);
			vec.normalize();

			sound.panner.setOrientation(vec.x, vec.y, vec.z);

			// Restore the translation column.
			m.n14 = mx;
			m.n24 = my; 
			m.n34 = mz;
		};

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
			m.multiplyVector3(vec);
			vec.normalize();

			// Multiply the up vector by the world matrix.
			var up = new THREE.Vector3(0,-1,0);
			m.multiplyVector3(up);
			up.normalize();

			// console.log("(" + vec.x + ", " + vec.y + ", " + vec.z + ")");
			// Set the orientation and the up-vector for the listener.
			ctx.listener.setOrientation(vec.x, vec.y, vec.z, up.x, up.y, up.z);
		};
	};
	request.send();
}