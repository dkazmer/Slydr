sGlide
======

A smart, lightweight and flexible slider, that's fully featured, responsive and mobile-ready. Standalone or jQuery. It can be easily customized and styled using regular CSS.

For details, visit http://webshifted.com/sGlide/

Quickstart Guide: apply the following to an empty DIV with a unique id.

	var callback = o => {};
	var options = {
		startAt: 60,
		width: 600,
		height: 20,
		unit: 'px',
		snap: {
			points: 5,
			marks: true
		},
		drop: callback
	};

	// Standalone
	var sGlide_instance = new sGlide(el, options);
	// or jQuery
	$('div#slider').sGlide(options);
