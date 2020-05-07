# Slydr


```js
new Slydr(container, settings)
```

A smart, lightweight and flexible slider, that's fully featured, responsive and mobile-ready. Standalone or jQuery. It can be easily customized and styled using regular CSS.


### Install

Modular static
```js
import { Slydr } from './source/slydr.min.js';
```

Modular dynamic
```js
import('./source/slydr.min.js').then(module => new module.Slydr());
```


### Settings

All settings with their default values. Visit home page for detailed breakdown.

```json
{
	"start-at": 0,
	"image": "",
	"height": 40,
	"width": 100,
	"unit": "%",
	"color-shift": false,
	"disabled": false,
	"vertical": false,
	"no-handle": false,
	"buttons": false,
	"retina": false,
	"custom-range": [0, 0],
	"key-control": false,
	"flag": false,
	"snap": {
		"marks": false,
		"type": false,
		"points": 0,
		"sensitivity": 2
	}
}
```


### Styles

Styles have be separated from the logic, so a stylesheet is a virtual requirement for proper display. Edit at your whim.
```
slydr.scss
```


### Callbacks

Fire callbacks at specific internal events using chainable on proto method. mySlydr.on("drag", func)

Type | Description
--- | ---
`ready` | Fire an event on instance readiness. Receives nothing.
`drop` | Fire an event on handle drop. Receives an argument containing slider data.
`drag` | Fire an event on handle drag. Receives an argument containing slider data.
`snap` | Fire an event on handle snap. Receives an argument containing slider data.
`button-press` | Fire an event clicking or holding one of the −/+ buttons. Returns an object containing slider data. Requires buttons.


### Helpers

Name | Description
--- | ---
`Slydr.entries` | An array of instances.
`Slydr.info` | Quick-access meta information.
`prototype.destroy()` | Destroy the instance.
`instance.reset()` | Destroys then rebuilds the slider instance.