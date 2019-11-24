# Slydr

A smart, lightweight and flexible slider, that's fully featured, responsive and mobile-ready. Standalone or jQuery. It can be easily customized and styled using regular CSS.

For details, visit [home page](https://webshifted.com/slydr/).

Quickstart Guide: apply the following to an empty `div`.

```js
const callback = o => {};

const options = {
	startAt: 60,
	width: 85,
	height: 20,
	snap: {
		points: 5,
		marks: true
	},
	drop: callback,
	onSnap: callback
};

let sG_instance = new Slyder(el, options);
```