/*global window:false, console:false, document:false, event:false, jQuery:false */

/***********************************************************************************

author:		Daniel Kazmer - http://iframework.net
created:	24.11.2012
version:	2.0.0

	version history:
		2.0.0	major improvements in code structure, stability, accuracy; changed color shift property (see usage); only corresponding arrow keys for horizontal or vertical (20.10.2014)
		1.10.0	added keyboard functionality (03.01.2014)
		1.9.1	bug fix: when button is pressed but released off button, button action now gets cleared (19.12.2013)
		1.9.0	added -/+ buttons, along with the onButton and onload callbacks (18.12.2013)
		1.8.8	stability (some distortion resistance); better rebuild on mobile; mobile orientation change support (09.12.2013)
		1.8.7	snap marks now align to snap points; bug fix: vertical now rebuilds properly (03.12.2013)
		1.8.5	mobile ready; added onSnap callback (02.12.2013)
		1.7.1	added real snapping and reworked its options; added "destroy" method - now allows clean rebuild; bug fix: when shell is thinner than knob, knob didn't retain its position in vertical mode (28.11.2013)
		1.5.0	added loadbar capability and "animated" option (27.11.2013)
		1.0.0	added Vertical mode; added option to hide knob (26.11.2013)
		0.3.1	more accurate snap markers; added color shifting (25.07.2013)
		0.2.6	bug fix: constraints when dragging (20.12.2012)
		0.2.5	bug fix: when knob is image, startAt now gets the correct knob width (13.12.2012)
		0.2.0:	added disabled state (08.12.2012)
		0.1.0:	created

	usage:
		apply the following to an empty DIV with a unique id

		$('#slider').sGlide({
			startAt: 60,			// start slider knob at - default: 0
			image: ''				// string - image path
			retina: true,			// boolean - larger knob image with suffix @2x for retina displays
			width: 200,				// integer - default: 100
			height: 20,				// integer - default: 40
			unit: 'px',				// 'px' or '%' (default)
			pill:					// boolean - default: true
			snap: {
				markers		: false,
				hard		: false,
				onlyOnDrop	: false,
				points		: 0
			},
			disabled:				// boolean - default: false
			colorShift:				// array of 2 css color values
			vertical:				// boolean - default: false
			showKnob:				// boolean - default: true
			buttons:				// boolean - default: false
			drop/drag/onSnap/onButton/onload: function(o){
				console.log('returned object',o);
			}
		});

		all properties are optional, however, to retrieve data, use one of the callbacks

	goals:
		- if unit is %, then markers should be also
		- get color shifting to work with the startAt method (start at correct color)
		- old browsers verticals (IE6/7 - low priority)
		- fix bug: rebuilding vertical rotates again
		- range selector
		- fixes or implementations of these issues: http://stackoverflow.com/search?q=sglide

***********************************************************************************/

(function($){
	var valueObj	= {};
	var helpers		= {
		/*'isMobile'	: false,
		'buttons'	: false*/
	};
	var methods		= {
		destroy: function(){
			this.each(function(i, el){
				var self	= $(el);
				var id		= self.selector;
				var guid	= self.attr('id');

				// unwrap vertical
				var vertContainer = $('#'+guid+'_vert-marks');
				if (vertContainer[0]) self.unwrap();

				// unwrap buttons marks
				else {
					var buttonsContainer = $('#'+guid+'_button-marks');
					if (buttonsContainer[0]) self.unwrap();
				}

				// remove buttons
				if ($('#'+guid+'_plus')[0]) $('#'+guid+'_minus, #'+guid+'_plus').remove();

				var markers = $('#'+guid+'_markers');
				if (markers.length > 0) markers.remove();

				var mEvt = {
					'down'	: 'mousedown',
					'up'	: 'mouseup',
					'move'	: 'mousemove'
				};

				if (helpers[guid+'-isMobile']){
					mEvt.down = 'touchstart'; mEvt.up = 'touchend'; mEvt.move = 'touchmove';
				// windows phone touch events
				} else if (window.navigator.msPointerEnabled){
					$(document).off(mEvt.msup, eventDocumentMouseUp);
					$(document).off(mEvt.msmove, eventDocumentMouseMove);
					self.off(mEvt.msdown, eventBarMouseDown);
					self.children('.follow_bar').off(mEvt.msdown, eventBarMouseDown);
					self.children('.slider_knob').off(mEvt.msdown, eventKnobMouseDown).off(mEvt.msup, eventKnobMouseDown);
				} else
					$(document).off('keydown.'+guid).off('keyup.'+guid);

				if (helpers[guid+'-buttons']){
					$('#'+guid+'_plus').off(mEvt.down).off(mEvt.up);
					$('#'+guid+'_minus').off(mEvt.down).off(mEvt.up);
				}
				
				$(document).off(mEvt.move+'.'+guid).off(mEvt.up+'.'+guid);
				$(window).off('orientationchange.'+guid);
				self.off(mEvt.down);
				self.children('.slider_knob').off(mEvt.up).off(mEvt.down).remove();
				self.children('.follow_bar').off(mEvt.down).remove();
				self.removeAttr('style');
			});
		},
		startAt: function(pct, animated){
			this.each(function(i, el){
				var self		= $(el);
				var knob		= self.children('.slider_knob');
				var follow		= self.children('.follow_bar');
				var guid		= self.attr('id');

				valueObj[guid] = pct;

				// set pixel positions
				var selfWidth = self.width();
				var knobWidth = knob.width();

				// constraints
				if (pct <= 0)			pct = 0;
				else if (pct >= 100)	pct = 100;

				// set pixel positions
				var px = (selfWidth - knobWidth) * pct / 100 + (knobWidth / 2);
				var pxAdjust = px - knobWidth / 2;

				// gui
				if (animated){
					knob.animate({'left': pxAdjust+'px'}, 200);
					follow.animate({'width': px+'px'}, 200);
				} else {
					knob.css('left', pxAdjust+'px');
					follow.css('width', px+'px');
				}
			});
		},
		init: function(options){
			this.each(function(i, el){

				//------------------------------------------------------------------------------------------------------------------------------------
				// build skeleton

				var self	= $(el);
				var guid	= self.attr('id');

				// no id? give one!
				if (!guid){
					guid = 'sglide-'+i;
					self.attr('id', guid);
				}

				// add assets
				self.html('<div class="follow_bar"></div><div class="slider_knob"></div>');

				var knob	= self.children('.slider_knob');
				var follow	= self.children('.follow_bar');

				//------------------------------------------------------------------------------------------------------------------------------------
				// settings & variables

				var settings = $.extend({
					'startAt'		: 0,
					'image'			: 'none',	// full path of image
					'height'		: 40,
					'width'			: 100,
					'unit'			: '%',	// 'px' or '%'
					'pill'			: true,
					'snap'			: {
						'markers'	: false,
						'hard'		: false,
						'onlyOnDrop': false,
						'points'	: 0
					},
					'disabled'		: false,
					'colorShift'	: [],
					'vertical'		: false,
					'showKnob'		: true,
					'buttons'		: false,
					'retina'		: true
				}, options);

				self.removeAttr('style');	// remove user inline styles

				helpers[guid+'-isMobile'] = false;
				var mEvt		= {
						'down'	: 'mousedown',
						'up'	: 'mouseup',
						'move'	: 'mousemove'
					},
					uAgent		= navigator.userAgent;

				if (uAgent.match(/Android/i) ||
					uAgent.match(/webOS/i) ||
					uAgent.match(/iPhone/i) ||
					uAgent.match(/iPad/i) ||
					uAgent.match(/iPod/i) ||
					// uAgent.match(/Windows Phone/i) ||
					uAgent.match(/BlackBerry/i)){
					helpers[guid+'-isMobile'] = true;
					mEvt.down = 'touchstart'; mEvt.up = 'touchend'; mEvt.move = 'touchmove';
					if (window.navigator.msPointerEnabled){
						mEvt.down = 'MSPointerDown'; mEvt.up = 'MSPointerUp'; mEvt.move = 'MSPointerMove';
					}
					var touchX = null, touchY = null;
				} else if (uAgent.match(/Windows Phone/i)){
					if (window.navigator.msPointerEnabled){
						self.css({'-ms-touch-action': 'none'});
						mEvt.msdown = 'MSPointerDown'; mEvt.msup = 'MSPointerUp'; mEvt.msmove = 'MSPointerMove';
					} else {
						mEvt.down = 'touchstart'; mEvt.up = 'touchend'; mEvt.move = 'touchmove';
					}
				}

				// variables
				valueObj[guid]		= settings.startAt;
				var result			= 0,
					vert			= settings.vertical,
					markers			= (settings.snap.points > 0 && settings.snap.points <= 9 && settings.snap.markers),
					knob_bg			= '#333',
					knob_width		= (settings.showKnob ? '2%' : '0'),
					knob_height		= 'inherit',
					self_height		= Math.round(settings.height)+'px',
					r_corners		= settings.pill,
					imageBln		= (settings.image != 'none' && settings.image !== '' && !settings.disabled),
					imgLoaded		= false,
					resize			= false,
					keyCtrl			= (self.attr('data-keys') == 'true') ? true : false,
					colorChangeBln	= (settings.colorShift.length > 1) ? true : false,
					isMobile		= helpers[guid+'-isMobile'],
					retina			= (window.devicePixelRatio > 1) && settings.retina;

				helpers[guid+'-buttons'] = settings.buttons;

				//------------------------------------------------------------------------------------------------------------------------------------
				// image handling

				if (imageBln){	// if image
					img = settings.image;

					// retina handling
					if (retina){
						var rImgTemp = img.split('.');
						var rImgTemp_length = rImgTemp.length;

						rImgTemp[rImgTemp_length-2] = rImgTemp[rImgTemp_length-2] + '@2x';
						img = '';
						for (var i = 0; i < rImgTemp_length; i++){
							img += rImgTemp[i] + ((i < rImgTemp_length-1) ? '.' : '');
						}
					}

					knob.html('<img src="'+img+'" style="visibility:hidden" />');
					// self_height = 'auto';
					knob.children('img').load(function(){
						imgLoaded = true;

						var imgEl = $(this);

						if (retina){
							imgEl[0].style.width = (imgEl[0].offsetWidth / 2) + 'px';
							// imgEl.style.height = (imgEl.offsetHeight / 2) + 'px';
						}

						// $(this).css({'width':'8px', 'position': 'absolute', 'box-sizing': 'content-box'});
						knob.css('width', 'auto');
						var thisHeight = imgEl.height();
						knob_width = imgEl.width()+'px';
						knob_height = thisHeight+'px';

						knob_bg = 'url('+img+') no-repeat';
						var knob_bg_styles = {
							'width': knob_width,
							'height': knob_height,
							'background': knob_bg
						};
						if (retina) knob_bg_styles['background-size'] = '100%';

						knob.css(knob_bg_styles);
						follow.css({
							'height': knob_height,
							'border-radius': r_corners ? thisHeight / 2 + 'px 0 0 ' + thisHeight / 2 + 'px' : '0px'
						});
						self.css({
							'height': knob_height,
							'border-radius': r_corners ? thisHeight / 2 + 'px' : '0px'
						});

						imgEl.remove();

						self.knobMarginValue = 0;
						if (thisHeight > settings.height){
							knobMarginValue = (thisHeight-settings.height)/2;
							self.css({
								// 'margin-top': knobMarginValue+'px',
								'height': settings.height+'px'
							});
							knob.css({
								'top': '-'+knobMarginValue+'px'
							});
							follow.css({
								'height': settings.height+'px',
								'border-radius': r_corners ? thisHeight / 2 + 'px 0 0 ' + thisHeight / 2 + 'px' : '0px'
							});
						} else {
							// children stay inside parent
							self.css('overflow', 'hidden');

							// adjust color shifter height
							follow.find('div').css('height', knob_height);
						}
					});
				} else {
					imgLoaded = true;
					var d = settings.height / 2;
					self.css({'border-radius': (r_corners ? d+'px' : '0'), 'overflow': 'hidden'});
					follow.css('border-radius', (r_corners ? d+'px 0 0 '+d+'px' : '0'));
				}

				//------------------------------------------------------------------------------------------------------------------------------------
				// styles

				var unit = settings.unit, width = settings.width;
				if (unit != 'px' && unit != '%') unit = '%';
				else if (unit == 'px') width = Math.round(width);
				else if (unit == '%' && Math.round(width) > 100) width = 100;

				self.css({
					'width': width + unit,
					'height': self_height,
					'text-align': 'left',
					'margin': 'auto',
					'cursor': (!settings.disabled ? 'pointer' : 'default'),
					'z-index': '997',
					'position': 'relative',
					'-webkit-touch-callout': 'none'
				});

				var self_width = self.width();

				var cssContentBox = {
					'-webkit-box-sizing': 'content-box',
					'-khtml-box-sizing': 'content-box',
					'-moz-box-sizing': 'content-box',
					'-ms-box-sizing': 'content-box',
					'box-sizing': 'content-box'
				}, cssUserSelect = {
					'-webkit-user-select': 'none',
					'-khtml-user-select': 'none',
					'-moz-user-select': 'none',
					'-ms-user-select': 'none',
					'user-select': 'none'
				}, cssRotate = {
					'-webkit-transform': 'rotate(-90deg)',
					'-khtml-transform': 'rotate(-90deg)',
					'-moz-transform': 'rotate(-90deg)',
					'-ms-transform': 'rotate(-90deg)',
					'transform': 'rotate(-90deg)',
					'-webkit-transform-origin': self_width+'px 0',
					'-khtml-transform-origin': self_width+'px 0',
					'-moz-transform-origin': self_width+'px 0',
					'-ms-transform-origin': self_width+'px 0',
					'transform-origin': self_width+'px 0',
					'filter': 'progid:DXImageTransform.Microsoft.BasicImage(rotation=3)'
				};

				self.css(cssContentBox).css(cssUserSelect);

				knob.css({
					'width': knob_width,
					'background': knob_bg,
					'height': knob_height,
					'display': (!settings.disabled ? 'inline-block' : 'none'),
					'font-size': '0px',
					'position': 'relative',
					'z-index': '999'
				}).css(cssContentBox);

				follow.css({
					'position': (!settings.disabled ? 'absolute' : 'static'),	// static when 'disabled' for self.overflow.hidden to work in Chrome
					'height': knob.height()+'px',
					'width': '0px',
					'z-index': '998'
				}).css(cssContentBox);

				//------------------------------------------------------------------------------------------------------------------------------------
				// snap marks, buttons, vertical

				// snap to
				var snapping_on = false;
				var snaps = Math.round(settings.snap.points);
				var snapPctValues = [0];
				var drawSnapmarks = function(resize){
					if (snaps === 1) snaps = 2;
				
					// pixels
					var kw = knob.width();
					var w = self_width - kw;
					var increment = w / (snaps - 1);
					var snapValues = [0];
					var step = increment;
					while (step <= w+2){	// added 2px to fix glitch when drawing last mark at 7 or 8 snaps (accounts for decimal)
						snapValues.push(step);
						step += increment;
					}
					// percentage
					increment = 100 / (snaps - 1);
					step = increment;
					while (step <= 101){	// added 1% to fix glitch when drawing last mark at 7 or 8 snaps (accounts for decimal)
						snapPctValues.push(step);
						step += increment;
					}

					snapping_on = true;

					// markers
					if (markers){
						if (!resize){
							self.after('<div id="'+guid+'_markers"></div>');
							
							var marks = $('#'+guid+'_markers');
							
							marks.css({
								'width': self_width+'px', //settings.width + unit,
								'margin': 'auto',
								'padding-left': (kw/2)+'px',
								'-webkit-touch-callout': 'none',
								'box-sizing': 'border-box'
							}).css(cssUserSelect);
						} else {
							var marks = $('#'+guid+'_markers');
							marks.html('');
						}

						var str = '';

						for (var i = 0; i < snapValues.length; i++)
							str += '<div style="display:inline-block; width:0; height:5px; border-left:#333 solid 1px; position:relative; left:'+
								(snapValues[i]-i)+'px; float:left"></div>';

						marks.html(str);
					}
				};

				// -----------

				// vertical
				var verticalTransform = function(){
					if (markers && snaps > 0 && snaps < 10){
						var a = $('#'+guid+', #'+guid+'_markers');

						a.wrapAll('<div id="'+guid+'_vert-marks" style="margin:0; z-index:997; width:'+width+unit+
							'; -webkit-backface-visibility:hidden; -moz-backface-visibility:hidden; -ms-backface-visibility:hidden; backface-visibility:hidden"></div>');

						var vmarks = $('#'+guid+'_vert-marks');

						self.css('width', '100%');
						vmarks.css(cssContentBox).css(cssRotate);

						for (var i = 0; i < a.length; i++)
							a.css('margin', '0');
					} else {
						// check whether even by even or odd by odd to fix blurred elements
						self.css({
							'margin': '0', 'top': '0', 'left': '0',
							'backface-visibility': 'hidden'
						}).css(cssRotate);
					}
				};

				// -----------

				// buttons
				var drawButtons = function(){
					knob_adjust = knob.width() / self_width * 50;

					var vertStyles	= '; z-index:1000; position:relative; top:30px',
						plusStr		= '<div class="sglide-buttons" id="'+guid+'_plus" style="display:inline-block; cursor:pointer'+(vert ? vertStyles : '')+'">&nbsp;+&nbsp;</div>',
						minusStr	= '<div class="sglide-buttons" id="'+guid+'_minus" style="display:inline-block; cursor:pointer'+(vert ? vertStyles : '')+'">&nbsp;&minus;&nbsp;</div>';

					if (markers){
						if (!vert){
							self.css('width', 'auto');
							var a = (vert) ? $('#'+guid+'_vert-marks') : $('#'+guid+', #'+guid+'_markers');
							a.wrapAll('<div id="'+guid+'_button-marks" style="display:inline-block; vertical-align:middle; width:'+width+unit+'"></div>');
							var q = $('#'+guid+'_button-marks');
						} else {
							var q = $('#'+guid+'_vert-marks');
						}

						q.after(plusStr);
						q.before(minusStr);
					} else {
						self.css({
							'display': (!vert) ? 'inline-block' : 'block',
							'vertical-align': 'middle'
						});

						self.after(plusStr);
						self.before(minusStr);
					}

					var plusBtn		= $('#'+guid+'_plus'),
						minusBtn	= $('#'+guid+'_minus');

					minusBtn.css(cssUserSelect);
					plusBtn.css(cssUserSelect);

					if (!settings.disabled){
						plusBtn.on(mEvt.down, function(){
							btn_is_down = true;
							btnTriggers('>');
							btn_timers = setTimeout(function(){
								btnHold('>');
							}, 500);
						}).on(mEvt.up, btnClearAction);

						minusBtn.on(mEvt.down, function(){
							btn_is_down = true;
							btnTriggers('<');
							btn_timers = setTimeout(function(){
								btnHold('<');
							}, 500);
						}).on(mEvt.up, btnClearAction);
					}
				}, btnTriggers = function(direction, smoothBln){
					var knobWidth = knob.width();
					var set_value = THE_VALUE = valueObj[guid];
					if (btn_snap){
						var intvl = 100 / (settings.snap.points - 1);
						var p = intvl;
						for (var i = 0; i < settings.snap.points; i++){
							if (intvl >= THE_VALUE){
								if (direction == '>')	THE_VALUE = (Math.round(intvl) > Math.round(THE_VALUE) ? intvl : intvl+p);
								else					THE_VALUE = intvl-p;
								break;
							} else intvl += p;
						}
					} else {
						if (direction == '>')	THE_VALUE+=(smoothBln ? 1 : 10);
						else					THE_VALUE-=(smoothBln ? 1 : 10);
					}

					set_value = THE_VALUE;	// leave THE_VALUE out of visual adjustments

					// constraints
					if ((THE_VALUE+knob_adjust) > 100)	{ THE_VALUE = 100; set_value = 100 /*- knob_adjust*/; }
					else if (THE_VALUE-knob_adjust < 0)	{ THE_VALUE = 0; set_value = 0 /*+ knob_adjust*/; }

					// set pixel positions
					var px = (self_width - knobWidth) * set_value / 100 + (knobWidth / 2);
					var pxAdjust = px - knobWidth / 2;

					// gui
					knob.css('left', pxAdjust+'px');
					follow.css('width', px+'px');
					if (colorChangeBln) colorChange(set_value);

					// output
					if (options.onButton) options.onButton({'id':guid, 'value':THE_VALUE, 'el':self});
					valueObj[guid] = THE_VALUE;
				}, btnHold = function(dir){
					var btnHold_timer = setInterval(function(){
						if (btn_is_down) btnTriggers(dir, (btn_snap ? false : true));
						else clearInterval(btnHold_timer);
					}, (btn_snap ? 201 : 10));
				}, btnClearAction = function(){
					btn_is_down = false;
					clearTimeout(btn_timers);
				}, knob_adjust = 0, btn_is_down = false, btn_timers = null;
				var btn_snap = (settings.snap.points > 0 && settings.snap.points <= 9 && (settings.snap.hard || settings.snap.onlyOnDrop));

				//------------------------------------------------------------------------------------------------------------------------------------
				// events

				// knob
				var is_down = false;

				knob.on(mEvt.down, function(){
					is_down = true;
					self.data('state', 'active');
				}).on(mEvt.up, function(){
					is_down = false;
				});

				// snapping
				var storedSnapValue = 's-1';
				var doSnap = function(kind, m){
					if (snaps > 0 && snaps < 10){	// min 1, max 9
						var knobWidth = knob.width();
						// var pctFive = self_width / 20 + 10;
						var pctFive = self_width * (10-snaps) / 100 - 2;

						// % to px
						var snapPixelValues = [];
						for (var i = 0; i < snapPctValues.length; i++){
							snapPixelValues.push((self_width - knobWidth) * snapPctValues[i] / 100);
							// snapPixelValues.push(snapValues[i] - knobWidth*i);
						}

						// get closest px mark, and set %
						var closest = null, pctVal = 0;
						$.each(snapPixelValues, function(i){
							if (closest === null || Math.abs(this - m) < Math.abs(closest - m)){
								closest = this;
								pctVal = snapPctValues[i];
							}
						});

						// physically snap it
						if (kind == 'drag'){
							if (settings.snap.hard){
								knob.css('left', closest+'px');
								follow.css('width', closest+knobWidth/2+'px');
								doOnSnap(closest, pctVal);
							} else {
								if (Math.round(Math.abs(closest - m)) < pctFive){
									knob.css('left', closest+'px');
									follow.css('width', closest+knobWidth/2+'px');
									doOnSnap(closest, pctVal);
								} else storedSnapValue = 's-1';
							}
						} else if (kind == 'hard'){
							knob.css('left', closest+'px');
							follow.css('width', closest+knobWidth/2+'px');
							return closest;
						} else {
							knob.animate({'left': closest+'px'}, 'fast');
							follow.animate({'width': closest+knobWidth/2+'px'}, 'fast');
							return closest;
						}
					}
				}, doOnSnap = function(a, b){ // callback: onSnap
					if (options.onSnap && 's'+a !== storedSnapValue){
						storedSnapValue = 's'+a;
						options.onSnap({'id':guid, 'value':b, 'el':self});
					}
				};

				var eventWindowResize = function(){
					self.sGlide('startAt', valueObj[guid]);
					if (markers) drawSnapmarks(true);
				};

				if (!isMobile && keyCtrl){
					var keycode, keydown = false,
						codeBack	= (vert) ? 40 : 37,
						codeFwd		= (vert) ? 38 : 39;

					$(document).on('keydown.'+guid, function(e){
						if (!keydown && !settings.disabled){
							if (window.event) keycode = window.event.keyCode;
							else if (e) keycode = e.which;

							if (keycode == codeBack){
								btn_is_down = true;
								btnTriggers('<');
								btn_timers = setTimeout(function(){
									btnHold('<');
								}, 500);
							} else if (keycode == codeFwd){
								btn_is_down = true;
								btnTriggers('>');
								btn_timers = setTimeout(function(){
									btnHold('>');
								}, 500);
							}
							keydown = true;
						}
					}).on('keyup.'+guid, function(){
						keydown = false;
						btnClearAction();
					});
				}

				if (isMobile){
					$(document).on(mEvt.down+'.'+guid, function(e){
						// is_down = false;
						touchX = e.originalEvent.touches[0].pageX;
						touchY = e.originalEvent.touches[0].pageY;
					});
				}
				if (isMobile || uAgent.match(/Windows Phone/i)){
					// orientation
					$(window).on('orientationchange.'+guid, eventWindowResize);
				}
				
				$(document).on(mEvt.move+'.'+guid, function(e){
					if (!is_down) return false;

					e = e || event;	// ie fix

					// e.stopPropagation();
					// e.preventDefault();

					var x			= null,
						knobWidth	= knob.width();

					if (vert){
						var base = self.position().top + self_width;
						if (isMobile){
							touchY = e.originalEvent.touches[0].pageY;
							x = base - touchY;
						} else x = base - e.pageY;
					} else {
						if (isMobile){
							touchX = e.originalEvent.touches[0].pageX;
							x = touchX - self.offset().left;
						} else x = e.pageX - self.offset().left;
					}

					var stopper = knobWidth / 2;
					var m = x - stopper;

					// if(event.preventDefault) event.preventDefault();
					if (e.returnValue) e.returnValue = false;

					// constraint & position
					if (x <= stopper){
						knob.css('left', '0px');
						follow.css('width', stopper+'px');
					} else if (x >= self_width-stopper){
						knob.css('left', (self_width-knobWidth)+'px');
						follow.css('width', (self_width-stopper)+'px');
					} else {
						knob.css('left', (x-stopper)+'px');
						follow.css('width', x+'px');
						if (!settings.snap.onlyOnDrop) doSnap('drag', m);
					}

					result = knob[0].style.left;	//knob.css('left');
					result = result.replace('px', '');

					var state = self.data('state');

					// update values
					if (options.drag && state == 'active')
						options.drag(updateME(getPercent(result)));

					// color change
					if (colorChangeBln && state == 'active')
						colorChange(getPercent(result));
				}).on(mEvt.up+'.'+guid, function(e){
					var state = self.data('state');
					is_down = false;
					if (state == 'active'){
						e = e || event;	// ie fix
						var x = null, base = 0;

						if (vert){
							base = self.position().top + self_width;
							x = base - ((!isMobile ? e.pageY : touchY)-2);
						} else x = (!isMobile ? e.pageX : touchX) - self.offset().left;
						
						var knobWidth	= knob.width();
						var stopper		= knobWidth / 2;
						var m			= x - stopper;	// true position of knob

						// snap to
						if (snaps > 0 && snaps < 10 && (settings.snap.onlyOnDrop || settings.snap.hard))	// min 1, max 9
							result = doSnap((settings.snap.hard) ? 'hard' : 'drop', m);
						else {
							// var mm	= knob.offset().left,	// odd behaviour on vertical
							var mm	= knob[0].offsetLeft,
								mq	= self_width - knobWidth;

							// constraint
							if (mm <= 0){
								knob.css('left', '0px');
								follow.css('width', stopper+'px');
							} else if (mm >= mq){
								knob.css('left', mq+'px');
								follow.css('width', (self_width-stopper)+'px');
							}

							result = knob[0].style.left;	//knob.css('left');
							result.replace('px', '');
						}

						if (options.drop) options.drop(updateME(getPercent(result)));
						if (options.drag && state == 'active') options.drag(updateME(getPercent(result)));
						self.data('state', 'inactive');

						// color change
						if (colorChangeBln) colorChange(getPercent(result));
					}

					// if button pressed but released off button, clear button action
					if (btn_is_down) btnClearAction();
				});

				//------------------------------------------------------------------------------------------------------------------------------------
				// functions

				var getPercent = function(o){
					o = parseFloat(o, 10);
					// calculate percentage
					var pct = o / (self_width - knob.width()) * 100;
					valueObj[guid] = pct;

					return pct;
				};

				var updateME = function(o){
					if (self.data('state') == 'active'){
						return {'id':guid, 'value':o, 'el':self};
					}
				};

				// color change
				var colorShiftInit = function(){
					var selfHeightHalf = self.offsetHeight / 2;
					var borderRadius = 'border-radius: '+(r_corners ? selfHeightHalf + 'px 0 0 ' + selfHeightHalf + 'px' : '0px');
					follow.css({
						'overflow': 'hidden',
						'background-color': settings.colorShift[0]
					});

					follow.html('<div style="opacity:'+(settings.startAt/100)+'; height:100%; background-color:'+settings.colorShift[1]+'; "></div>');
				}
				var colorChange = function(o){
					// follow.find('div').css('opacity', ''+(o/100));
					follow[0].childNodes[0].style.opacity = o / 100;
				};

				// bar
				var MD = function(e){
					e = e || event;	// ie fix
					e.stopPropagation();
					e.preventDefault();
					if (e.returnValue) e.returnValue = false;	// wp

					is_down = true;
					self.data('state', 'active');

					if (!isMobile && !settings.snap.onlyOnDrop){
						var x = null;
						if (vert){
							var base = self.position().top + self.width();
							x = base - (e.pageY-2);
						} else x = e.pageX - self.offset().left;
						var m = x - (knob.width() / 2);	// true position of knob

						knob.css('left', m+'px');
						follow.css('width', m+(knob.width()/2)+'px');
						
						// constraint
						if (m < 0) knob.css('left', '0px');
						else if (m >= self.width()-knob.width()) knob.css('left', self.width()-knob.width()+'px');
					}
				};

				if (!settings.disabled){
					self.on(mEvt.down, function(e){ MD(e); });
					follow.on(mEvt.down, function(e){ MD(e); });
				}

				//------------------------------------------------------------------------------------------------------------------------------------
				// start

				var setStartAt = function(num){
					startAt = (num) ? num : settings.startAt;

					self.sGlide('startAt', startAt);

					var rlt = {'id':guid, 'value':startAt, 'el':self};
					if (options.drop) options.drop(rlt);
					if (options.drag) options.drag(rlt);

					// inits
					if (snaps > 0 && snaps < 10) drawSnapmarks();
					if (vert) verticalTransform();
					if (helpers[guid+'-buttons']) drawButtons();
					if (colorChangeBln){
						colorShiftInit();
						colorChange(startAt);
					}
				};

				var onload_timer = setInterval(function(){
					if (imgLoaded){
						setStartAt(valueObj[guid]);
						if (options.onload) options.onload();
						clearInterval(onload_timer);
					}
				}, 1);
			});
		}
	};
	$.fn.sGlide = function(params){
		// Method calling logic
		if (methods[params]){
			return methods[params].apply(this, Array.prototype.slice.call(arguments, 1));
		} else if (typeof params === 'object' || !params){
			return methods.init.apply(this, arguments);
		} else {
			$.error('Method '+params+' does not exist on jQuery.sGlide');
		}
	};
})(jQuery);