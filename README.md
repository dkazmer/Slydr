sGlide
======

sGlide is a jQuery plugin that generates a simple, light-weight, feature-rich slider, which can be easily customized and styled using regular CSS.

Quickstart Guide: apply the following to an empty DIV with a unique id.

	$('#slider').sGlide({
		startAt: 60,			// start slider knob at - default: 0
		image: ''				// string - image path
		width: 200,				// integer - default: 100
		height: 20,				// integer - default: 40
		unit: 'px',				// 'px' or '%' (default; doesn't apply to height)
		pill: false,			// boolean - default: true
		snapPoints: 0,			// min 0; max 9
		snapMarkers: true,		// boolean - only used when snapPoints >= 1
		disabled: true,			// boolean - default: false
		colorStart:				// css value
		colorEnd:				// css value
		vertical:				// boolean - default: false
		showKnob:				// boolean - default: true
		drop: function(o){
			console.log(o.guid+': '+o.value+'%');
		}
	});
