# Slydr

A smart, lightweight and flexible slider, that's fully featured, responsive and mobile-ready. Standalone or jQuery. It can be easily customized and styled using regular CSS.

For details, visit [home page](https://webshifted.com/slydr/).

Quickstart Guide: apply the following to an empty `div`.

```js
const callback = o => {};

const options = {
	'start-at': 60,
	'width': 85,
	'height': 20,
	'snap': {
		'points': 5,
		'marks': true
	},
	'events': {
		'onDrop': callback,
		'onSnap': callback
	}
};

let mySlider = new Slyder(el, options);
```