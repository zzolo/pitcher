
(function() {
  // Get window height
  var d = document;
  var e = d.documentElement;
  var g = d.getElementsByTagName('body')[0];
  var w = window.innerWidth || e.clientWidth || g.clientWidth;
  var h = window.innerHeight|| e.clientHeight|| g.clientHeight;

  // Transiont to disappear
  var disappear = function(t, params) {
    // Process parameters (second argument provides defaults)
    params = t.processParams( params, {
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
      r: (parseFloat(h) / 12)
    },
    transitions: {
      disappear: disappear
    }
  });

  // Create pitch reading
  var p = new Pitcher();
  p.on('pitch', function(data) {
    var freq = _.sample(data.frequency, 100);

    if (data.pitch < 800) {
      r.set('leftWave', []);
      r.set('leftWave', freq);
    }
    else {
      r.set('rightWave', []);
      r.set('rightWave', freq);
    }
  });
})();
