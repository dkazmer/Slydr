sGlide
======

sGlide is a jQuery- or standalone plugin that generates a simple, light-weight, feature-rich and mobile-ready slider, which can be easily customized and styled using regular CSS. Visit http://iframework.net/sGlide/

Quickstart Guide: apply the following to an empty DIV with a unique id.

	// jQuery:
	// $('#slider').sGlide({
	// jQuery independent:
	var my_sGlide_instance = new sGlide(my_element, {
		startAt: 60,
		width: 200,
		height: 20,
		unit: 'px',
		snap: {
			points: 5,
			markers: true
		},
		drop: function(o){
			console.log(o.id+': '+o.value+'%');
		}
	});