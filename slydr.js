/*global window:false, console:false, document:false, event:false, jQuery:false */

/***********************************************************************************
 
 author:	Daniel B. Kazmer (webshifted.com)
 created:	23.11.2019
 version:	1.0.0 beta
 github:	https://github.com/dkazmer/slydr
 home page: https://webshifted.com/slydr

 A derivitive of sGlide, completely refactored and rebranded as Slydr.
 No longer supporting legacy browsers or maintaining jQuery iteration.
 
***********************************************************************************/

"use strict";

class Slydr {
	constructor (container, options) {
		this.container = container;

		var that = this;
		var is_down = false;
		var frameElement, trakElement, knobElement, THE_VALUE, plussBtn, minusBtn;

		var settings = (o => {
			let obj = Object.assign({
				'start-at': 0,
				'image': '',	// full path of image
				'height': 40,
				'width': 100,
				'unit': '%',	// 'px' or '%'
				'pill': true,
				'color-shift': [],
				'disabled': false,
				'vertical': false,
				'no-handle': false,
				'buttons': false,
				'retina': false,
				'custom-range': [0, 0],
				'key-control': false
			}, o);

			obj.snap = Object.assign({
				'marks': false,
				'type': false,
				'points': 0,
				'sensitivity': 2
			}, o.snap);

			obj.events = Object.assign({}, o.events);

			return obj;
		})(options);
		// console.log('>> settings', settings);

		let result = 0;
		let marksElement = null;
		let bMarksElement = null;
		let vMarksElement = null;
		let MSoffsetTop = null;
		let notify = null;

		const vert = settings.vertical;
		const is_snap = (settings.snap.points > 1 && settings.snap.points <= 11);
		const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
		const snaps = Math.round(settings.snap.points);
		const snapType = (settings.snap.type != 'hard' && settings.snap.type != 'soft') ? false : settings.snap.type;
		const colorChangeBln = (settings['color-shift'].length > 1);
		const markers = (is_snap && settings.snap.marks);
		const eventMakeReady = new Event('makeready.' + Slydr.entries.length);
		const customRange = (settings['custom-range'][0] !== 0 || settings['custom-range'][1] !== 0) && settings['custom-range'][0] < settings['custom-range'][1];
		const keyCtrl = (settings['key-control'] == true);//(frameElement.getAttribute('data-keys') === 'true');
		const keyCtrlCtrl = (settings['key-control'] === 'ctrl');//(frameElement.getAttribute('data-keys') === 'ctrl');
		const keyCtrlShift = (settings['key-control'] === 'shift');//(frameElement.getAttribute('data-keys') === 'shift');
		// if (isMobile) {}

		this.is = {
			get colorShift() { return colorChangeBln }
			// get customRange() { return customRange; }
		};

		this.data = {
			get percent() { return THE_VALUE }
		};

		if (customRange) {
			const cstmStart = settings['custom-range'][0];
			const diff = settings['custom-range'][1] - cstmStart;

			Object.defineProperty(this.data, 'custom-unit', {
				get() { return diff * THE_VALUE / 100 + cstmStart }
			});
		}

		const execute = reset => {
			if (reset) this.destroy(true);
			houseKeeping();
			build();
			setupEvents();
			initImage(settings.image && !settings['no-handle']);
			keyboardControls();

			// Listen for image loaded
			frameElement.addEventListener('makeready.' + Slydr.entries.length, () => {
				if (is_snap) { snap.setValues(); setTimeout(() => snap.pre(), 0); }
				if (vert) verticalTransform();
				if (settings.buttons) pushButtons.draw();
				if (colorChangeBln) colorShiftInit();
				
				this.position = THE_VALUE = settings['start-at'] || 50;

				// ready
				if (notify instanceof Function) notify.call(this, this.data);
				delete this.ready;
			});

			if (!reset) Slydr.entries.push(this);
		};

		const build = () => {
			frameElement = this.frameElement = Slydr.create('slydr', container);
			trakElement = this.trak = Slydr.create('trak', frameElement);
			knobElement = this.knob = Slydr.create('knob', frameElement);

			frameElement.style.width = settings.width + settings.unit;
			frameElement.style.height = settings.height + 'px';

			if (settings.pill) {
				let d = frameElement.offsetHeight / 2;
				frameElement.style['border-radius'] = d + 'px';
				trakElement.style['border-radius'] = d + 'px 0 0 ' + d + 'px';
			}
		};

		const houseKeeping = () => {
			if (!(container instanceof Element)) throw new Error('Slydr: first param expected Element, found ' + (typeof container));
			if (!(options instanceof Object)) throw new Error('Slydr: second param expected Object, found ' + (typeof options));
		};

		const colorShiftInit = () => {
			trakElement.style.overflow = 'hidden';
			trakElement.style.backgroundColor = settings['color-shift'][0];
			trakElement.innerHTML = `<div style="opacity:${settings['start-at'] / 100}; height:100%; background-color:${settings['color-shift'][1]};"></div>`;
		};

		const colorChange = pct => trakElement.children[0].style.opacity = pct / 100;

		const initImage = imageBln => {
			var pill = settings.pill;

			if (imageBln) {	// if image
				let path = settings.image;
				const retina = (window.devicePixelRatio > 1) && settings.retina;

				// retina handling
				if (retina) {
					const ix = path.lastIndexOf('.');
					path = path.slice(0, ix) + '@2x' + path.slice(ix);
				}

				let img = new Image();
				img.onload = imgLoad;
				img.src = path;

				knobElement.appendChild(img);

				function imgLoad() {
					if (retina)
						img.style.width = (img.offsetWidth / 2) + 'px';
					// img.style.height = (img.offsetHeight / 2) + 'px';

					// determine knob image style requirements
					var imgHeight = img.offsetHeight;
					var knob_width = img.offsetWidth + 'px';
					var knob_height = imgHeight + 'px';
					var knob_bg = `url(${path}) no-repeat`;

					// apply knob image styles
					knobElement.style.width = knob_width;
					knobElement.style.height = knob_height;

					setTimeout(() => {
						knobElement.style.background = knob_bg;
						if (retina) knobElement.style.backgroundSize = '100%';
					}, 0);

					// set bar styles
					trakElement.style.height = knob_height;
					trakElement.style['border-radius'] = pill ? imgHeight / 2 + 'px 0 0 ' + imgHeight / 2 + 'px' : '0';
					frameElement.style.height = knob_height;
					frameElement.style['border-radius'] = pill ? imgHeight / 2 + 'px' : '0';

					knobElement.removeChild(img);

					// bar height less than that of knob
					if (imgHeight > settings.height) {
						var knobMarginValue = (imgHeight - settings.height) / 2;

						frameElement.style.height = settings.height + 'px';
						frameElement.style.overflow = 'visible';
						knobElement.style.top = `-${knobMarginValue}px`;
						trakElement.style.height = settings.height + 'px';
						trakElement.style['border-radius'] = pill ? imgHeight / 2 + 'px 0 0 ' + imgHeight / 2 + 'px' : '0';
					}

					frameElement.dispatchEvent(eventMakeReady);
				}
			} else {
				var d = settings.height / 2;
				frameElement.style.overflow = 'hidden';
				frameElement.style['border-radius'] = (pill ? d + 'px' : '0');
				trakElement.style['border-radius'] = (pill ? d + 'px 0 0 ' + d + 'px' : '0');
				setTimeout(() => {
					frameElement.dispatchEvent(eventMakeReady);
				}, 0);
			}
		};

		const verticalTransform = () => {
			if (markers) {
				let a = [frameElement, marksElement];

				vMarksElement = Slydr.create('vertical-marks');
				Slydr.wrapAll(a, vMarksElement);
			}

			frameElement.classList.add('vertical');
		};

		const keyboardControls = () => {
			if (!isMobile && (keyCtrl || keyCtrlShift || keyCtrlCtrl) && !settings.disabled) {
				let keycode, keydown = false, shifted = false, ctrled = false,
					codeBack = vert ? 40 : 37,
					codeFwd = vert ? 38 : 39;

				events.docKeyDown = e => {
					if (!keydown) {
						if (window.event) {
							keycode = window.event.keyCode;
							shifted = window.event.shiftKey;
							ctrled = window.event.ctrlKey;
						} else if (e) {
							keycode = e.which;
							shifted = e.shiftKey;
							ctrled = e.ctrlKey;
						}

						// if shift required, then shift must be pressed
						if (keyCtrlShift && shifted && !ctrled || keyCtrlCtrl && ctrled && !shifted || !keyCtrlShift && !keyCtrlCtrl) {
							if (keycode === codeBack) {
								pushButtons.eventMouseDown('<');
								keydown = true;
							} else if (keycode === codeFwd) {
								pushButtons.eventMouseDown('>');
								keydown = true;
							}
						}
					}
				};
				events.docKeyUp = () => {
					keydown = false;
					pushButtons.clearAction();
				};

				document.addEventListener('keydown', events.docKeyDown);
				document.addEventListener('keyup', events.docKeyUp);
			}
		};

		this.ready = fn => notify = fn;

		const mouse = {
			'down': (isMobile ? 'touchstart' : 'mousedown'),
			'move': (isMobile ? 'touchmove' : 'mousemove'),
			'up': (isMobile ? 'touchend' : 'mouseup')
		};

		const events = {
			'barMouseDown': e => {
				if (e.returnValue) e.returnValue = false;	// wp

				is_down = true;
				frameElement.dataset.state = 'active';

				if(!isMobile) {// && snapType !== 'hard'){
					const shellWidth = frameElement.offsetWidth;
					const knobWidth = knobElement.offsetWidth;
					let x = null;

					if (vert) {
						// MS bug: manually set offsetTop, otherwise try to get the vertical wrapper's offsetTop
						if (window.navigator.msPointerEnabled && MSoffsetTop === null) MSoffsetTop = frameElement.getBoundingClientRect().top;
						else if (vMarksElement !== null && MSoffsetTop === null) MSoffsetTop = vMarksElement.offsetTop;

						const base = (MSoffsetTop !== null ? MSoffsetTop : frameElement.offsetTop) + shellWidth;
						// var base = frameElement.offsetTop + shellWidth;
						x = base - (e.pageY - 2);
					} else x = e.pageX - frameElement.offsetLeft;

					let m = x - (knobWidth / 2);	// true position of knob

					// constraint
					if (m < 0) {
						m = 0;
						knobElement.style.left = '0';
					} else if (m >= shellWidth - knobWidth) {
						m = shellWidth - knobWidth;
						knobElement.style.left = (shellWidth - knobWidth) + 'px';
					}

					knobElement.style.left = m + 'px';
					trakElement.style.width = m + (knobWidth / 2) + 'px';

					if (!snapType || snapType === 'hard') snap.init('drag', m);

					// color change
					if (colorChangeBln) colorChange(this.getPercent(m));
				}
			},
			'docMouseMove': e => {
				if (is_down) {
					const shellWidth = frameElement.offsetWidth;
					const knobWidth = knobElement.offsetWidth;
					var x = null;

					if (vert) {
						// MS bug: manually set offsetTop, otherwise try to get the vertical wrapper's offsetTop
						if (window.navigator.msPointerEnabled && MSoffsetTop === null) MSoffsetTop = frameElement.getBoundingClientRect().top;
						else if (vMarksElement !== null && MSoffsetTop === null) MSoffsetTop = vMarksElement.offsetTop;

						let base = (MSoffsetTop !== null ? MSoffsetTop : frameElement.offsetTop) + shellWidth;
						if (isMobile) {
							touchY = e.targetTouches[0].pageY;
							x = base - touchY;
						} else x = base - e.pageY;
					} else {
						if (isMobile) {
							touchX = e.targetTouches[0].pageX;
							x = touchX - frameElement.offsetLeft;
						} else x = e.pageX - frameElement.offsetLeft;
					}

					const stopper = knobWidth / 2,
						m = x - stopper;

					if (e.returnValue) e.returnValue = false;

					// constraint
					if (x <= stopper && (!is_snap || snapType !== 'hard')) {
						knobElement.style.left = '0';
						trakElement.style.width = stopper + 'px';
					} else if (x >= shellWidth - stopper && (!is_snap || snapType !== 'hard')) {
						knobElement.style.left = (shellWidth - knobWidth) + 'px';
						trakElement.style.width = (shellWidth - stopper) + 'px';
					} else {
						knobElement.style.left = (x - stopper) + 'px';
						trakElement.style.width = x + 'px';
						// if (!settings.snap.onlyOnDrop) doSnap('drag', m);
						if (!snapType || snapType === 'hard') snap.init('drag', m);
					}

					result = knobElement.offsetLeft; // was knob.style.left;
					// result = result.replace('px', '');

					// var state = frameElement.getAttribute('data-state');
					var state = frameElement.dataset.state;

					THE_VALUE = this.getPercent(result);

					// update values
					if (settings.events.onDrag && state === 'active')
						settings.events.onDrag.call(that, that.data);

					// color change
					if (colorChangeBln && state === 'active')
						colorChange(THE_VALUE);
				}
			},
			'docMouseUp': e => {
				is_down = false;
				if (frameElement.dataset.state === 'active') {
					const m = knobElement.offsetLeft;

					// snap to
					if (is_snap && (snapType === 'soft' || snapType === 'hard'))	// min 1, max 9
						result = snap.init('drop', m);
					else
						result = (m < 0 ? 0 : m);

					THE_VALUE = this.getPercent(result);

					if (settings.events.drop) settings.events.drop.call(that, that.data);
					if (settings.events.drag) settings.events.drag.call(that, that.data);
					frameElement.dataset.state = 'inactive';

					// color change
					if (colorChangeBln) colorChange(THE_VALUE);
				}

				// if button pressed but released off button, clear button action
				if (pushButtons.is_down) pushButtons.clearAction();
			},
			'winResize': () => {
				const kw = knobElement.offsetWidth;
				const shellWidth = frameElement.offsetWidth;
				that['start-at'] = THE_VALUE;

				if (markers) {
					let val = null;
					marksElement.style.width = shellWidth + 'px';
					let divArray = [].slice.call(marksElement.children);

					divArray.forEach((div, i) => {
						val = (shellWidth - kw) / (snaps - 1) * i + (kw / 2);
						div.style.left = val + 'px';
					});
				}
			}
		};

		const setupEvents = () => {
			if (!settings.disabled) {
				frameElement.addEventListener(mouse.down, events.barMouseDown);
				document.addEventListener(mouse.move, events.docMouseMove);
				document.addEventListener(mouse.up, events.docMouseUp);
				window.addEventListener('resize', events.winResize);
			}
		};

		const snap = {
			'pctValues': [0],
			'storedValue': 's-1',
			'index': null,
			'init': function(kind, m) {
				if (is_snap) {	// min 1, max 9
					var sense = settings.snap.sensitivity;

					// although snap is enabled, sensitivity may be set to nill, in which case marks are drawn but won't snap to
					if (sense || snapType === 'hard' || snapType === 'soft') {
						var knobWidth = knobElement.offsetWidth,
							shellWidth = frameElement.offsetWidth,
							snapOffset = (sense && sense > 0 && sense < 4 ? (sense + 1) * 5 : 15) - 3;

						// % to px
						let snapPixelValues = [];
						// for (var j = 0; j < this.snapPctValues.length; j++){
						for (let pct of this.pctValues) {
							snapPixelValues.push((shellWidth - knobWidth) * pct / 100);
						}

						// get closest px mark, and set %
						let closest = null, pctVal = 0, i = 0;
						// for (let i = 0; i < snapPixelValues.length; i++){
						for (let pxl of snapPixelValues) {
							if (closest === null || Math.abs(pxl - m) < Math.abs(closest - m)) {
								closest = pxl;
								pctVal = this.pctValues[i];
								this.index = i;
							}
							i++;
						}

						// physically snap it
						if (kind === 'drag') {
							if (snapType === 'hard') {
								knobElement.style.left = closest + 'px';
								trakElement.style.width = closest + knobWidth / 2 + 'px';
								this.on(closest, pctVal);
							} else {
								if (Math.round(Math.abs(closest - m)) < snapOffset) {
									knobElement.style.left = closest + 'px';
									trakElement.style.width = closest + knobWidth / 2 + 'px';
									this.on(closest, pctVal);
								} else this.storedValue = 's-1';
							}
						} else {
							knobElement.style.left = closest + 'px';
							trakElement.style.width = closest + knobWidth / 2 + 'px';
							// return closest;
						}
					}
				}
			},
			'setValues': function() {
				var kw = knobElement.offsetWidth;

				// percentage
				var increment = 100 / (snaps - 1);
				var step = increment;
				while (step <= 101) {	// added 1% to fix glitch when drawing last mark at 7 or 8 snaps (accounts for decimal)
					this.pctValues.push(step);
					step += increment;
				}

				if (markers) this.drawMarks(kw);
			},
			'drawMarks': kw => {
				
				var shellWidth = frameElement.offsetWidth;
				frameElement.insertAdjacentHTML('afterend', '<div class="slydr-markers"></div>');
				marksElement = frameElement.parentNode.getElementsByClassName('slydr-markers')[0];

				marksElement.style.width = shellWidth + 'px'; //settings.width + unit

				if (marksElement) {
					let str = '';
					let val = null;

					marksElement.style.width = shellWidth + 'px';

					// by px
					for (let i = snaps - 1; i >= 0; i--) {
						val = (shellWidth - kw) / (snaps - 1) * i + (kw / 2);
						str += `<div style="left:${val}px"></div>`;
					}

					marksElement.innerHTML = str;
				}
			},
			'on': function(a) { // callback: onSnap
				if (options.events.onSnap && 's' + a !== this.storedValue) {
					this.storedValue = 's' + a;
					THE_VALUE = that.getPercent(a);
					if (options.events.onSnap) options.events.onSnap.call(that, that.data);
				}
			},
			'pre': function() {
				switch (snapType) {
					case 'hard': case 'soft': {
						this.init('drag', knobElement.offsetLeft);
						THE_VALUE = that.getPercent(knobElement.offsetLeft);
					}
				}
			}
		};

		const pushButtons = {
			'draw': function() {
				this.knob_adjust = knobElement.offsetWidth / frameElement.offsetWidth * 50;

				plussBtn = Slydr.create('slydr-buttons');
				minusBtn = Slydr.create('slydr-buttons');

				plussBtn.innerHTML = '&nbsp;+&nbsp;';
				minusBtn.innerHTML = '&nbsp;&minus;&nbsp;';

				minusBtn.style['font-size'] = plussBtn.style['font-size'] = frameElement.offsetHeight + 'px';

				if (markers) {
					let q = null;
					if (!vert) {
						// frameElement.style.width = 'auto';
						let a = [frameElement];
						bMarksElement = Slydr.create('button-marks');

						if (markers) a.push(marksElement);

						bMarksElement.style.width = frameElement.style.width;
						// q = Slydr.wrapAll(a, `<div class="button-marks" style="width:${frameElement.offsetWidth}px"></div>`);
						q = Slydr.wrapAll(a, bMarksElement);
						// q = $('#' + guid + '_button-marks');
					} else {
						q = frameElement.closest('.vertical-marks');
					}

					// FIX THIS:
					// q.append(plussBtn);
					q.insertBefore(plussBtn, frameElement.nextSibling);
					q.prepend(minusBtn);

					minusBtn.style['margin-left'] = '-' + minusBtn.offsetWidth + 'px';
				} else {
					frameElement.style.display = (!vert) ? 'inline-block' : 'block';
					frameElement.style.verticalAlign = 'middle';

					frameElement.parentNode.insertBefore(plussBtn, frameElement.nextSibling);
					frameElement.parentNode.insertBefore(minusBtn, frameElement);
				}

				if (!settings.disabled) {
					plussBtn.addEventListener(mouse.down, () => this.eventMouseDown('>'));
					plussBtn.addEventListener(mouse.up, this.clearAction);

					minusBtn.addEventListener(mouse.down, () => this.eventMouseDown('<'));
					minusBtn.addEventListener(mouse.up, this.clearAction);
				}
			},
			'triggers': function(direction, smoothBln) {
				// var set_value = THE_VALUE = valueObj[guid];
				if (this.snap) {
					if (snap.index === null) {
						for (let i = 0; i < snap.pctValues.length; i++) {
							if (snap.pctValues[i] >= THE_VALUE) {
								if (direction === '>') snap.index = i - 1;
								else snap.index = i;
								break;
							}
						}
					}

					if (direction === '>') {
						if (snaps - 1 > snap.index) snap.index++;
					} else {
						if (snap.index > 0) snap.index--;
					}
					THE_VALUE = snap.pctValues[snap.index];
				} else {
					if (direction === '>') THE_VALUE += (smoothBln ? 1 : 10);
					else THE_VALUE -= (smoothBln ? 1 : 10);
				}

				var set_value = THE_VALUE;	// leave THE_VALUE out of visual adjustments

				// constraints
				if ((THE_VALUE + this.knob_adjust) > 100) { THE_VALUE = 100; set_value = 100; }
				else if (THE_VALUE - this.knob_adjust < 0) { THE_VALUE = 0; set_value = 0; }

				// set pixel positions
				var px = (frameElement.offsetWidth - knobElement.offsetWidth) * set_value / 100 + (knobElement.offsetWidth / 2);
				var pxAdjust = px - knobElement.offsetWidth / 2;

				// gui
				knobElement.style.left = pxAdjust + 'px';// (set_value-knob_adjust)+'%';
				trakElement.style.width = px + 'px';// set_value+'%';
				if (colorChangeBln) colorChange(set_value);

				// output
				THE_VALUE = that.getPercent(pxAdjust);
				if (options.events.onBtnClick) options.events.onBtnClick.call(that, that.data);
			},
			'hold': function(dir) {
				var btnHold_timer = setInterval(() => {
					if (this.is_down) this.triggers(dir, true);
					else clearInterval(btnHold_timer);
				}, (this.snap ? 101 : 10));
			},
			'clearAction': function() {
				this.is_down = false;
				clearTimeout(this.timers);
			},
			'eventMouseDown': function(dir) {
				this.is_down = true;
				this.triggers(dir);
				this.timers = setTimeout(() => this.hold(dir), 500);
			},
			'knob_adjust': 0,
			'is_down': false,
			'timers': null,
			'snap': (is_snap && (snapType === 'hard' || snapType === 'soft'))
		};

		this.destroy = reset => {
			// unwrap vertical buttons
			// const vertframeElement = frameElement.closest('.vert-marks');

			// unwrap vMarksElement
			if (vMarksElement) {
				const vertParent = vMarksElement.parentNode;
				vertParent.insertBefore(frameElement, vMarksElement.nextSibling);
				vertParent.removeChild(vMarksElement);
			}

			const markers = frameElement.parentNode.querySelector('.slydr-markers');
			if (markers) markers.parentNode.removeChild(markers);

			if (isMobile) {
				document.removeEventListener(mouse.down, eventDocumentMouseDown);
			} else if (keyCtrl || keyCtrlShift || keyCtrlCtrl) {
				document.removeEventListener('keydown', events.docKeyDown);
				document.removeEventListener('keyup', events.docKeyUp);
			}

			// remove buttons
			if (settings.buttons) {
				const buttonsParent = plussBtn.parentNode;
				buttonsParent.removeChild(plussBtn);
				buttonsParent.removeChild(minusBtn);
				plussBtn = minusBtn = null;

				// unwrap 
				if (!vMarksElement) {
					if (bMarksElement) {
						const bMarksElementParent = bMarksElement.parentNode;
						bMarksElementParent.insertBefore(bMarksElement.childNodes[0], bMarksElement.nextSibling);
						bMarksElementParent.removeChild(bMarksElement);
					}
				}
			}

			document.removeEventListener(mouse.move, events.docMouseMove);
			document.removeEventListener(mouse.up, events.docMouseUp);
			window.removeEventListener('resize', events.winResize);
			frameElement.removeEventListener(mouse.down, events.barMouseDown);
			frameElement.removeChild(knobElement);
			frameElement.removeChild(trakElement);
			frameElement.removeAttribute('style');
			frameElement.removeAttribute('data-state');
			frameElement.classList.remove('vertical');

			if (!reset) {
				for (let i in this) delete this[i];
				Slydr.entries.forEach((item, i) => {
					if (item === this) Slydr.entries.splice(i, 1);
				});
			}
			// console.log('>> destroyed!');
		};

		this.reset = () => execute(true);

		execute();
	}

	getPercent(num) {
		var pct = num / (this.frameElement.offsetWidth - this.knob.offsetWidth) * 100;
		return Math.min(pct, 100);
	}

	set position(pct) {
		// set pixel positions
		const shellWidth = this.frameElement.offsetWidth;
		const knobWidth = this.knob.offsetWidth;

		// constraints
		if (pct <= 0) pct = 0;
		else if (pct >= 100) pct = 100;

		// set pixel positions
		const px = (shellWidth - knobWidth) * pct / 100 + (knobWidth / 2);
		const pxAdjust = px - (knobWidth / 2);

		// gui
		this.knob.style.left = pxAdjust + 'px';
		this.trak.style.width = px + 'px';

		// color shifting
		if (this.is.colorShift)
			this.trak.children[0].style.opacity = pct / 100;
	}

	static wrapAll(elements, wrapper) {
		elements[0].parentNode.insertBefore(wrapper, elements[0]);
		for (let el of elements) wrapper.appendChild(el);
		return wrapper;
	}

	static create(className, put) {
		var div = document.createElement('div');
		div.className = className;
		if (put) put.appendChild(div);
		return div;
	}
}

Slydr.entries = [];