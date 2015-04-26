
(function() {
  // Get window height
  var d = document;
  var e = d.documentElement;
  var g = d.getElementsByTagName('body')[0];
  var w = window.innerWidth || e.clientWidth || g.clientWidth;
  var h = window.innerHeight || e.clientHeight || g.clientHeight;
  var leftPitch = 500;
  var rightPitch = 1200;

  // Transiont to disappear
  var disappear = function(t, params) {
    // Process parameters (second argument provides defaults)
    params = t.processParams(params, {
      duration: 200
    });

    // Fade out
    t.animateStyle({ 'fill-opacity': 0, 'stroke-opacity': 0 },
      { duration: params.duration },
      function() {
        t.complete(true);
      });
  };

  // Create ractive object
  var r = new Ractive({
    el: '#pitcher-container',
    template: '#pitcher-template',
    modifyArrays: false,
    data: {
      w: w,
      h: h,
      r: (parseFloat(h) / 12),
      calibrating: false,
      streamReady: false
    },
    transitions: {
      disappear: disappear
    }
  });

  // Create pitch reading
  var p = new Pitcher();
  p.on('pitch', function(data) {
    var freq = _.sample(data.frequency, 100);
    var pitchSplit = leftPitch - ((leftPitch - rightPitch) / 2);
    var calibrating = r.get('calibrating');
    var calibratingSide = r.get('calibratingSide');
    console.log(pitchSplit);

    if ((!calibrating && data.pitch < pitchSplit) ||
      (calibrating && calibratingSide === 'left')) {
      r.set('leftWave', []);
      r.set('leftWave', freq);
    }
    else {
      r.set('rightWave', []);
      r.set('rightWave', freq);
    }
  });

  // Also, watch for the stream (mic) to be enabled
  p.on('media-stream', function() {
    r.set('streamReady', true);
  });

  // Handle calibrating
  r.on('calibrate', function(e, side) {
    if (!r.get('calibrating') && r.get('streamReady')) {
      r.set('calibrating', true);
      r.set('calibratingSide', side);

      // Record
      record(function(avgPitch) {
        // Set new values
        if (side === 'left') {
          leftPitch = avgPitch;
        }
        else {
          rightPitch = avgPitch;
        }

        r.set('calibrating', false);
      });
    }
  });

  // Record function
  function record(done) {
    var duration = 5000;
    var timerID;
    var values = [];
    var getPitch = function(data) {
      if (data.pitch && data.pitch > 10) {
        values.push(data.pitch);
      }
    };

    // Start recording
    p.on('pitch', getPitch);

    // Show update
    r.set('calibrateTime', duration / 1000);
    timerID = setInterval(function() {
      r.set('calibrateTime', r.get('calibrateTime') - 1);
    }, 1000);

    // When done
    setTimeout(function() {
      var total = _.reduce(values, function(memo, v, vi) {
        return memo + v;
      }, 0);
      
      done(total / values.length);
      p.off('pitch', getPitch);
      window.clearInterval(timerID);
    }, duration);
  }
})();
