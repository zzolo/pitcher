/**
 * Altered version from:
 * https://github.com/cwilso/PitchDetect/blob/master/js/pitchdetect.js
 * Copyright (c) 2014 Chris Wilson
 */

// Some shims
window.AudioContext = window.AudioContext || window.webkitAudioContext;
window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame;


// Create pitcher class extending from Backbone events
var Pitcher = function(options) {
  this.initialize(options);
}

// Add methods
_.extend(Pitcher.prototype, Backbone.Events, {

  // Intialize
  initialize: function(option) {
    // Setup some properties
    this.audioContext = new AudioContext();
    this.bufferLength = 1024;
    this.buffer = new Float32Array(this.bufferLength);
    this.noteStrings = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    this.maxFrequency = Math.max(4, Math.floor(this.audioContext.sampleRate / 5000));

    // Setup events
    this.on('media-stream', this.analyze);
    this.on('analyser-ready', this.readPitch);

    // Get the user media (mic)
    this.getUserMedia(this.mediaContext);
  },

  // Analyze stream
  analyze: function() {
    // Create an AudioNode from the stream.
    this.mediaStreamNode = this.audioContext.createMediaStreamSource(this.mediaStream);

    // Connect it to the destination.
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.mediaStreamNode.connect(this.analyser);
    this.trigger('analyser-ready');
  },

  // Get pitch
  readPitch: function(time) {
  	this.analyser.getFloatTimeDomainData(this.buffer);

    // Get data
  	var ac = this.autoCorrelate(this.buffer, this.audioContext.sampleRate);
    var pitch = Math.round(ac);
    var note = this.noteFromPitch(pitch);

    // Check if a pitch was found
    if (ac > 0) {
      // Get frequency
  	  var frequency = new Uint8Array(this.analyser.frequencyBinCount);
  	  this.analyser.getByteFrequencyData(frequency);

      // Send out data
      this.trigger('pitch', {
        frequency: frequency,
        ac: ac,
        pitch: pitch,
        note: note,
        strings: this.noteStrings[note % 12],
        detune: this.centsOffFromPitch(pitch, note)
      });
    }

    // Call again
    this.animID = window.requestAnimationFrame(_.bind(this.readPitch, this));
  },

  // Auto correlate audio to pitch
  autoCorrelate: function(buf, sampleRate) {
  	var SIZE = buf.length;
    var MIN_SAMPLES = 0;
  	var MAX_SAMPLES = Math.floor(SIZE/2);
  	var best_offset = -1;
  	var best_correlation = 0;
  	var rms = 0;
  	var foundGoodCorrelation = false;
  	var correlations = new Array(MAX_SAMPLES);

  	for (var i=0; i<SIZE; i++) {
  		var val = buf[i];
  		rms += val*val;
  	}
  	rms = Math.sqrt(rms/SIZE);

    // not enough signal
  	if (rms<0.01) {
  		return -1;
    }

  	var lastCorrelation=1;

  	for (var offset = MIN_SAMPLES; offset < MAX_SAMPLES; offset++) {
  		var correlation = 0;

  		for (var i=0; i<MAX_SAMPLES; i++) {
  			correlation += Math.abs((buf[i])-(buf[i+offset]));
  		}
  		correlation = 1 - (correlation/MAX_SAMPLES);
  		correlations[offset] = correlation; // store it, for the tweaking we need to do below.
  		if ((correlation>0.9) && (correlation > lastCorrelation)) {
  			foundGoodCorrelation = true;
  			if (correlation > best_correlation) {
  				best_correlation = correlation;
  				best_offset = offset;
  			}
  		}
      else if (foundGoodCorrelation) {
  			// short-circuit - we found a good correlation, then a bad one, so we'd just be seeing copies from here.
  			// Now we need to tweak the offset - by interpolating between the values to the left and right of the
  			// best offset, and shifting it a bit.  This is complex, and HACKY in this code (happy to take PRs!) -
  			// we need to do a curve fit on correlations[] around best_offset in order to better determine precise
  			// (anti-aliased) offset.

  			// we know best_offset >=1,
  			// since foundGoodCorrelation cannot go to true until the second pass (offset=1), and
  			// we can't drop into this clause until the following pass (else if).
  			var shift = (correlations[best_offset+1] - correlations[best_offset-1])/correlations[best_offset];
  			return sampleRate/(best_offset+(8*shift));
  		}
  		lastCorrelation = correlation;
  	}
  	if (best_correlation > 0.01) {
  		// console.log("f = " + sampleRate/best_offset + "Hz (rms: " + rms + " confidence: " + best_correlation + ")")
  		return sampleRate / best_offset;
  	}
  	return -1;
    //	var best_frequency = sampleRate/best_offset;
  },

  // Get note from pitch
  noteFromPitch: function(frequency) {
  	var noteNum = 12 * (Math.log( frequency / 440 ) / Math.log(2));
  	return Math.round( noteNum ) + 69;
  },

  // Get frequency from note
  frequencyFromNoteNumber: function(note) {
  	return 440 * Math.pow(2, (note - 69) / 12);
  },

  // How much off pitch
  centsOffFromPitch: function(frequency, note) {
  	return Math.floor(1200 * Math.log(frequency / this.frequencyFromNoteNumber(note)) / Math.log(2));
  },

  // Get user media wrapper
  getUserMedia: function(context) {
    var thisPitch = this;

    try {
      navigator.getUserMedia =
        navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;

      navigator.getUserMedia(context,
        function(mediaStream) {
          thisPitch.mediaStream = mediaStream;
          thisPitch.trigger('media-stream');
        },
        function(error) {
          console.error('Error getting user media: ', error);
        }
      );
    }
    catch (error) {
      console.error('Browser doesn\'t get it: ', error);
    }
  },

  // Media context for audio
  mediaContext: {
    'audio': {
      'mandatory': {
        'googEchoCancellation': 'false',
        'googAutoGainControl': 'false',
        'googNoiseSuppression': 'false',
        'googHighpassFilter': 'false'
      },
      'optional': []
    }
  }
});
