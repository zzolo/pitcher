

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia || navigator.msGetUserMedia;

navigator.getUserMedia({ audio: true }, function(localMediaStream) {

  var pitch = new PitchAnalyzer(44100);

  /* Copy samples to the internal buffer */
  pitch.input(localMediaStream);
  /* Process the current input in the internal buffer */
  pitch.process();

  setInterval(function() {
    var tone = pitch.findTone();
    if (tone === null) {
        console.log('No tone found!');
    } else {
        console.log('Found a tone, frequency:', tone.freq, 'volume:', tone.db);
    }
  }, 1000);


}, function() {
  // Error
});
