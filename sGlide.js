/*global window:false, console:false, document:false, event:false, jQuery:false */

/***********************************************************************************

author:		Daniel Kazmer - http://iframework.net
created:	24.11.2012
version:	1.10.0

	version history:
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
			colorStart:				// css value
			colorEnd:				// css value
			vertical:				// boolean - default: false
			showKnob:				// boolean - default: true
			buttons:				// boolean - default: false
			drop/drag/onSnap/onButton/onload: function(o){
				console.log('returned object',o);
			}
		});

		all properties are optional, however, to retrieve value, use the drop or drag callback
		o.guid returns slider's id
		o.value returns slider's value

		goals:
			- if unit is %, then markers should be also
			- get color shifting to work with the startAt method (start at correct color)
			- old browsers verticals (IE6/7 - low priority)
			- fix bug: rebuilding vertical rotates again
			- fixes or implementations of these issues: http://stackoverflow.com/search?q=sglide

***********************************************************************************/

(function($){
	var methods = {
		destroy: function(){
			this.each(function(i, el){
				var self	= $(el);
				var id		= self.selector;
				var guid	= self.attr('id');

				// unwrap vertical buttons
				if ($('.'+guid+'_vert-marks')[0]){
					var vert_marks = $('.'+guid+'_vert-marks');
					if (vert_marks.data('wrap') !== undefined){ vert_marks.unwrap(); vert_marks.removeAttr('data-wrap'); }
				}

				// remove buttons
				if ($('#'+guid+'_plus')[0]) $('#'+guid+'_minus, #'+guid+'_plus').remove();

				// remove vertical wrapping
				if (self.data('wrap') !== undefined){ self.unwrap(); self.removeAttr('data-wrap'); }
				else
					self.css({
						'-webkit-transform': 'translate3d(0,0,0)',
						'-khtml-transform': 'translate3d(0,0,0)',
						'-moz-transform': 'translate3d(0,0,0)',
						'-ms-transform': 'translate3d(0,0,0)',
						'transform': 'translate3d(0,0,0)'
					});

				if ($(id+'_markers').length > 0) $(id+'_markers').remove();

				var mEvt_down = 'mousedown', mEvt_up = 'mouseup', mEvt_move = 'mousemove';
				if (methods.mobile){
					mEvt_down = 'touchstart'; mEvt_up = 'touchend'; mEvt_move = 'touchmove';
				} else
					$(document).off('keydown.'+guid).off('keyup.'+guid);

				if (methods.buttons){
					$('#'+guid+'_plus').off(mEvt_down).off(mEvt_up);
					$('#'+guid+'_minus').off(mEvt_down).off(mEvt_up);
				}
				
				$(document).off(mEvt_move+'.'+guid).off(mEvt_up+'.'+guid);
				$(window).off('orientationchange.'+guid);
				self.off(mEvt_down);
				self.children('.slider_knob').off(mEvt_up).off(mEvt_down).remove();
				self.children('.follow_bar').off(mEvt_down).remove();
				$(id).removeAttr('style').removeAttr('data-state');
			});
		},
		startAt: function(pct, animated){
			this.each(function(i, el){
				var self		= $(el);
				var knob		= self.children('.slider_knob');
				var follow		= self.children('.follow_bar');

				if (typeof animated != 'boolean') animated = false;

				if (pct <= 0){
					pct = 0;
					if (!animated){
						knob.css('left', '0px');
						follow.css('width', '0px');
					} else {
						knob.animate({'left': '0px'}, 200);
						follow.animate({'width': '0px'}, 200);
					}
				} else if (pct >= 100){
					pct = 100;
					if (!animated){
						knob.css('left', self.width()-knob.width()+'px');
						follow.css('width', self.width()+'px');
					} else {
						knob.animate({'left': self.width()-knob.width()+'px'}, 200);
						follow.animate({'width': self.width()+'px'}, 200);
					}
				} else {
					var pxl = self.width() * pct / 100;
					if (methods.img){
						if (!animated)	knob.css('left', pxl-(knob.width()/2)+'px');
						else			knob.animate({'left': pxl-(knob.width()/2)+'px'}, 200);
					} else {
						if (!animated)	knob.css('left', pxl+'px');
						else			knob.animate({'left': pxl+'px'}, 200);
					}

					if (!animated)	follow.css('width', pxl+'px');
					else			follow.animate({'width': pxl+'px'}, 200);
				}
			});
		},
		init: function(options){
			this.each(function(i, el){
				var self = $(el);
			
				// add assets
				self.html('<div class="follow_bar"></div><div class="slider_knob"></div>');

				var guid		= self.attr('id');
				var knob		= self.children('.slider_knob');
				var follow		= self.children('.follow_bar');

				//------------------------------------------------------------------------------------------------------------------------------------
				// form

				var settings = $.extend({
					'startAt'		: 0,
					'image'			: 'none',	// full path of image
					'height'		: 40,
					'width'         : 100,
					'unit'			: '%',	// 'px' or '%'
					'pill'			: true,
					'snap'			: {
						'markers'	: false,
						'hard'		: false,
						'onlyOnDrop': false,
						'points'	: 0
					},
					'disabled'		: false,
					'colorStart'	: '',
					'colorEnd'		: '',
					'vertical'		: false,
					'showKnob'		: true,
					'buttons'		: false
				}, options);

				self.removeAttr('style');	// remove user inline styles

				// mobile check
				var mobile = false;
				var mEvt_down = 'mousedown', mEvt_up = 'mouseup', mEvt_move = 'mousemove';
				var uAgent = navigator.userAgent;
				if (uAgent.match(/Android/i) ||
					uAgent.match(/webOS/i) ||
					uAgent.match(/iPhone/i) ||
					uAgent.match(/iPad/i) ||
					uAgent.match(/iPod/i) ||
					// uAgent.match(/Windows Phone/i) ||
					uAgent.match(/BlackBerry/i)){
					methods.mobile = mobile = true;
					mEvt_down = 'touchstart'; mEvt_up = 'touchend'; mEvt_move = 'touchmove';
					if (window.navigator.msPointerEnabled){
						mEvt_down = 'MSPointerDown'; mEvt_up = 'MSPointerUp'; mEvt_move = 'MSPointerMove';
					}
					var touchX = null, touchY = null;
				} else if (uAgent.match(/Windows Phone/i)){
					// alert('WP');
					self.on("MSGestureStart MSGestureChange", function(e){
						e.preventDefault();
					});
				}

				// variables
				var THE_VALUE		= settings.startAt;
				var result			= 0;
				var vert			= settings.vertical;
				var markers			= (settings.snap.points > 0 && settings.snap.points <= 9 && settings.snap.markers);
				var knob_bg			= '#333';
				var knob_width		= (settings.showKnob ? '2%' : '0');
				var self_height		= Math.round(settings.height)+'px';
				var knob_height		= 'inherit';
				var r_corners		= settings.pill;
				var b_shad			= 0, b_shad_c = '#666';
				var imageBln		= (settings.image != 'none' && settings.image !== '' && !settings.disabled);
				var knobImageLoaded	= false;

				if (imageBln){	// if image
					methods.img = settings.image;
					knob.html('<img src="'+settings.image+'" style="visibility:hidden" />');
					// self_height = 'auto';
					knob.children('img').load(function(){
						knobImageLoaded = true;
						// $(this).css({'width':'8px', 'position': 'absolute', 'box-sizing': 'content-box'});
						knob.css('width', 'auto');
						var thisHeight = $(this).height();
						knob_width = $(this).width()+'px';
						knob_height = thisHeight+'px';
						
						knob_bg = 'url('+settings.image+')';
						knob.css({
							'width': knob_width,
							'height': knob_height,
							'background': knob_bg
						});
						follow.css({
							'height': knob_height,
							'border-radius': r_corners ? thisHeight / 2 + 'px 0 0 ' + thisHeight / 2 + 'px' : '0px'
						});
						self.css({
							'height': knob_height,
							'border-radius': r_corners ? thisHeight / 2 + 'px' : '0px'
						});

						$(this).remove();

						self.knobMarginValue = 0;
						if (thisHeight > settings.height){
							knobMarginValue = (thisHeight-settings.height)/2;
							self.css({
								'height': settings.height+'px',
								'margin-top': knobMarginValue+'px'
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
						setStartAt();
					});
				} else {
					knobImageLoaded = true;
					self.css({'border-radius': r_corners ? settings.height / 2 + 'px' : '0px'});

					if (knob.children('img').height() <= settings.height){
						// children stay inside parent (not working in Chrome)
						self.css('overflow', 'hidden');
					} else {
						follow.css('border-radius', r_corners ? settings.height / 2 + 'px' : '0px');
					}
				}

				var unit = settings.unit, width = settings.width;
				if (unit != 'px' && unit != '%') unit = '%';
				else if (unit == 'px') width = Math.round(width);
				else if (unit == '%' && Math.round(width) > 100) width = 100;

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
					'-webkit-transform-origin': '0 0',
					'-khtml-transform-origin': '0 0',
					'-moz-transform-origin': '0 0',
					'-ms-transform-origin': '0 0',
					'transform-origin': '0 0',
					'filter': 'progid:DXImageTransform.Microsoft.BasicImage(rotation=3)'
				};

				self.css({
					'width': width + unit,
					'height': self_height,
					'text-align': 'left',
					'margin': 'auto',
					'cursor': (!settings.disabled ? 'pointer' : 'default'),
					'z-index': '997',
					'position': 'relative',
					'-webkit-touch-callout': 'none'
				}).css(cssContentBox).css(cssUserSelect);

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

				// snap to
				var snapping_on = false;
				var snaps = Math.round(settings.snap.points);
				var snapPctValues = [0];
				var drawSnapmarks = function(){
					if (snaps > 0 && snaps < 10){	// min 1, max 9
						if (snaps === 1) snaps = 2;	// set to min 2
						
						// var increment = 100 / (snaps - 1);
						// pixels
						var kw = knob.width();
						var w = self.width() - kw;
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

						// window resizing support
						// var markWidth = w / (snaps-1);
						// markWidth = markWidth / w * 100;

						// markers
						if (markers){
							self.after('<div id="'+guid+'_markers"></div>');
							var marks = $('#'+guid+'_markers');
							marks.css({
								'width': settings.width + unit,
								'margin': 'auto',
								'padding-left': (!vert ? kw : kw/2)+'px',
								'-webkit-touch-callout': 'none'
							}).css(cssContentBox).css(cssUserSelect);
							for (var i = 0; i < snapValues.length; i++){
								marks.append('<div style="display:inline-block; width:0; height:5px; border-left:#333 solid 1px; position:relative; left:'+
									(snapValues[i]-i)+'px; top:-5px"></div>');
								// window resizing support
								// marks.append('<div style="display:inline-block; width:'+(i === snapValues.length-1 ? '0' : markWidth+unit)+'; height:5px; border-left:#333 solid 1px; margin-top:-5px"></div>');
								//$('#'+guid+'_markers').append('<div style="display:inline-block; width:'+increment+'%; height:10px; border-left:#333 solid 1px;"></div>');
				}}}};

				// -----------

				// vertical
				if (vert && markers && snaps > 0 && snaps < 10){
					$('#'+guid+', #'+guid+'_markers').wrapAll('<div class="'+guid+'_vert-marks"></div>');
					var vmarks = $('.'+guid+'_vert-marks');

					self.attr('data-wrap', 'true');

					vmarks.css({
						'width': width + unit,
						'-webkit-backface-visibility': 'hidden',
						'-moz-backface-visibility': 'hidden',
						'-ms-backface-visibility': 'hidden',
						'backface-visibility': 'hidden'
					}).css(cssContentBox).css(cssRotate);
					$(vmarks.selector+' > div').css('margin', '0');
				} else if (vert){
					// check whether even by even or odd by odd to fix blurred elements
					var selfW = self.width(), selfH = self.height();

					self.css({
						'margin': '0',
						'-webkit-backface-visibility': 'hidden',
						'-moz-backface-visibility': 'hidden',
						'-ms-backface-visibility': 'hidden',
						'backface-visibility': 'hidden'
					}).css(cssRotate);
				}

				// -----------

				// buttons
				var drawButtons = function(){
					if (!knobImageLoaded) return false;
					clearInterval(drawButtons_timer);

					knob_adjust = knob.width() / self.width() * 50;	// leave outside of "if" for keyboard function

					if (settings.buttons){
						methods.buttons = true;

						var vertStyles = '; z-index:1000; position:relative; top:30px; float:left';
						if (markers){
							$((vert ? '.'+guid+'_vert-marks' : self.selector+', #'+guid+'_markers')).wrapAll('<div id="'+guid+'_button-marks" style="display:inline-block; vertical-align:text-top;"></div>');
							if (vert) $('.'+guid+'_vert-marks').attr('data-wrap', 'true'); else self.attr('data-wrap', 'true');
							var q = $('#'+guid+'_button-marks');
							q.after('<div class="sglide-buttons" id="'+guid+'_plus" style="display:inline-block; cursor:pointer'+(vert ? vertStyles : '')+'">&nbsp;+&nbsp;</div>'
							).before('<div class="sglide-buttons" id="'+guid+'_minus" style="display:inline-block; cursor:pointer'+(vert ? vertStyles : '')+'">&nbsp;&minus;&nbsp;</div>');
						} else {
							self.css({
								'display': 'inline-block',
								'vertical-align': 'text-bottom'
							}).after('<div class="sglide-buttons" id="'+guid+'_plus" style="display:inline-block; cursor:pointer'+(vert ? vertStyles : '')+'">&nbsp;+&nbsp;</div>'
							).before('<div class="sglide-buttons" id="'+guid+'_minus" style="display:inline-block; cursor:pointer'+(vert ? vertStyles : '')+'">&nbsp;&minus;&nbsp;</div>');
						}

						$('.sglide-buttons').css(cssUserSelect);

						$('#'+guid+'_plus').on(mEvt_down, function(){
							btn_is_down = true;
							btnTriggers('>');
							btn_timers = setTimeout(function(){
								btnHold('>');
							}, 1000);
						}).on(mEvt_up, function(){
							btnClearAction();
						});
						$('#'+guid+'_minus').on(mEvt_down, function(){
							btn_is_down = true;
							btnTriggers('<');
							btn_timers = setTimeout(function(){
								btnHold('<');
							}, 1000);
						}).on(mEvt_up, function(){
							btnClearAction();
						});
					}
				}, btnTriggers = function(direction, smoothBln){
					if (smoothBln === undefined) smoothBln = false;

					var set_value = THE_VALUE;
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
					if ((THE_VALUE+knob_adjust) > 100)	{ THE_VALUE = 100; set_value = 100 - knob_adjust; }
					else if (THE_VALUE-knob_adjust < 0)	{ THE_VALUE = 0; set_value = 0 + knob_adjust; }

					// gui
					if (!smoothBln){
						knob.animate({'left': (set_value-knob_adjust)+'%'}, 200);
						follow.animate({'width': set_value+'%'}, 200);
						if (colorChangeBln) setTimeout(function(){colorChange(follow.width());}, 200);
					} else {
						knob.css('left', (set_value-knob_adjust)+'%');
						follow.css('width', set_value+'%');
						if (colorChangeBln) colorChange(follow.width());
					}

					// output
					if (options.onButton) options.onButton({'guid':guid, 'value':THE_VALUE, 'el':self});
				}, btnHold = function(dir){
					var btnHold_timer = setInterval(function(){
						if (btn_is_down) btnTriggers(dir, (btn_snap ? false : true));
						else clearInterval(btnHold_timer);
					}, (btn_snap ? 201 : 10));
				}, btnClearAction = function(){
					btn_is_down = false;
					clearTimeout(btn_timers);
				}, drawButtons_timer = setInterval(drawButtons, 100), knob_adjust = 0, btn_is_down = false, btn_timers = null;
				var btn_snap = (settings.snap.points > 0 && settings.snap.points <= 9 && (settings.snap.hard || settings.snap.onlyOnDrop));

				//------------------------------------------------------------------------------------------------------------------------------------
				// function

				// knob
				var is_down = false;

				knob.on(mEvt_down, function(){
					is_down = true;
					self.attr('data-state', 'active');
				}).on(mEvt_up, function(){
					is_down = false;
				});

				// snapping
				var storedSnapValue = 's-1';
				var doSnap = function(kind, m){
					if (snaps > 0 && snaps < 10){	// min 1, max 9
						var knobWidth = knob.width();
						var selfWidth = self.width();
						// var pctFive = selfWidth / 20 + 10;
						var pctFive = selfWidth * (10-snaps) / 100 - 2;

						// % to px
						var snapPixelValues = [];
						for (var i = 0; i < snapPctValues.length; i++){
							snapPixelValues.push((selfWidth - knobWidth) * snapPctValues[i] / 100);
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
						} else {
							knob.animate({'left': closest+'px'}, 'fast');
							follow.animate({'width': closest+knobWidth/2+'px'}, 'fast');
							return closest;
						}
					}
				}, doOnSnap = function(a, b){ // callback: onSnap
					if (options.onSnap && 's'+a !== storedSnapValue){
						// var snapPct = a / selfWidth * 100; // (using pctVal instead)
						storedSnapValue = 's'+a;
						options.onSnap({'guid':guid, 'value':b, 'el':self});
					}
				};

				// keyboard controls
				if (!mobile){
					var keycode, keydown = false;
					$(document).on('keydown.'+guid, function(e){
						if (!keydown){
							if (window.event) keycode = window.event.keyCode;
							else if (e) keycode = e.which;

							if (self.attr('data-keys') == 'true'){
								if (keycode == 37 || keycode == 40){
									btn_is_down = true;
									btnTriggers('<');
									btn_timers = setTimeout(function(){
										btnHold('<');
									}, 1000);
								} else if (keycode == 39 || keycode == 38){
									btn_is_down = true;
									btnTriggers('>');
									btn_timers = setTimeout(function(){
										btnHold('>');
									}, 1000);
								}
							}
							keydown = true;
						}
					}).on('keyup.'+guid, function(){
						keydown = false;
						btnClearAction();
					});
				}

				if (mobile){
					$(document).on(mEvt_down+'.'+guid, function(e){
						// is_down = false;
						touchX = e.originalEvent.touches[0].pageX;
						touchY = e.originalEvent.touches[0].pageY;
					});
				}
				if (mobile || uAgent.match(/Windows Phone/i)){
					// orientation
					$(window).on('orientationchange.'+guid, function(){
						/*switch (window.orientation){  
							case -90:
							case 90:
								alert('landscape 2');
								break; 
							default:
								alert('portrait 2');
								break; 
						}*/

						settings.startAt = THE_VALUE;

						self.sGlide('destroy');	// can't chain here
						self.sGlide(settings);
					});
				}
				
				$(document).on(mEvt_move+'.'+guid, function(e){
					e = e || event;	// ie fix
					
					var x = null;
					if (vert){
						var base = self.position().top + self.width();
						if (mobile){
							touchY = e.originalEvent.touches[0].pageY;
							x = base - touchY;
						} else x = base - e.pageY;
					} else {
						if (mobile){
							touchX = e.originalEvent.touches[0].pageX;
							x = touchX - self.offset().left;
						} else x = e.pageX - self.offset().left;
					}
					
					var stopper = knob.width() / 2;
					var m = x - stopper;

					if (is_down){
						e.stopPropagation();
						e.preventDefault();
						// if(event.preventDefault) event.preventDefault();
						if (e.returnValue) e.returnValue = false;

						// constraint
						if (x <= stopper){
							knob.css('left', '0px');
							follow.css('width', '0px');
						} else if (x >= self.width()-stopper){
							knob.css('left', self.width()-knob.width()+'px');
							follow.css('width', self.width()-(knob.width()/2)+'px');
						} else {
							knob.css('left', x-(knob.width()/2)+'px');
							follow.css('width', x+'px');
							if (!settings.snap.onlyOnDrop) doSnap('drag', m);
						}
					}

					result = knob.css('left');
					result = result.replace('px', '');
					// updateME(result);
					if (options.drag && self.attr('data-state') == 'active') options.drag(updateME(result));

					// color change
					if (colorChangeBln && self.attr('data-state') == 'active'){
						colorChange(result);
					}
				}).on(mEvt_up+'.'+guid, function(e){
					is_down = false;
					if (self.attr('data-state') == 'active'){
					// if (is_down){
						// e.stopPropagation();
						// e.preventDefault();
						e = e || event;	// ie fix
						var x = null;
						if (vert){
							var base = self.position().top + self.width();
							x = base - ((!mobile ? e.pageY : touchY)-2);
						} else x = (!mobile ? e.pageX : touchX) - self.offset().left;
						var knobWidth = knob.width();
						var m = x - (knobWidth / 2);	// true position of knob

						// snap to
						if (snaps > 0 && snaps < 10 && settings.snap.onlyOnDrop)	// min 1, max 9
							result = doSnap('drop', m);
						else {
							// unknown bug: jquery.position() breaks; just too unreliable
							var mm = null;
							if (!vert)	mm = knob.offset().left - self.offset().left;
							else		mm = Math.abs(knob.offset().top + knob.height() - base);

							// constraint
							if (mm < 0) knob.css('left', '0px');
							else if (mm > self.width()-knobWidth) knob.css('left', self.width()-knobWidth+'px');

							result = knob.css('left');
							result = result.replace('px', '');
						}

						if (options.drop) options.drop(updateME(result));
						if (options.drag && self.attr('data-state') == 'active') options.drag(updateME(result));
						self.attr('data-state', 'inactive');

						// color change
						if (colorChangeBln) colorChange(result);
					}

					// if button pressed but released off button, clear pending button action
					if (btn_is_down) btnClearAction();
				});

				var updateME = function(o){
					if (self.attr('data-state') == 'active'){
						o = parseFloat(o, 10);
						
						// calculate percentage
						var percent = o / (self.width() - knob.width()) * 100;

						// update the global value
						THE_VALUE = percent;

						// return value
						return {'guid':guid, 'value':percent, 'el':self};
					}
				};

				// color change
				var colorChangeBln = false;
				if (settings.colorStart !== '' && settings.colorEnd !== ''){
					var borderRadius = 'border-radius: '+(r_corners ? $(this).height() / 2 + 'px 0 0 ' + $(this).height() / 2 + 'px' : '0px');
					follow.css({
						'overflow': 'hidden',
						'background-color': settings.colorStart
					}).html('<div style="opacity:'+(settings.startAt/100)+'; height:'+self.height()+'px; background-color:'+settings.colorEnd+'; '+borderRadius+'"></div>');
					colorChangeBln = true;
				}
				var colorChange = function(o){
					follow.find('div').css({
						'opacity': (parseFloat(o, 10) / (self.width() - knob.width()))
					});
				};

				// bar
				var MD = function(e){
					e = e || event;	// ie fix
					e.stopPropagation();
					e.preventDefault();
					if (e.returnValue) e.returnValue = false;	// wp

					is_down = true;
					self.attr('data-state', 'active');

					if (!mobile && !settings.snap.onlyOnDrop){
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
					self.on(mEvt_down, function(e){ MD(e); });
					follow.on(mEvt_down, function(e){ MD(e); });
				}

				// start at
				var setStartAt_runTwice = (!imageBln);
				var setStartAt = function(){
					var startAt = settings.startAt;

					if (startAt <= 0){
						startAt = 0;
						knob.css('left', '0px');
						follow.css('width', '0px');
					} else if (startAt >= 100){
						startAt = 100;
						knob.css('left', self.width()-knob.width()+'px');
						follow.css('width', self.width()+'px');
					} else {
						var pxl = self.width() * startAt / 100;

						if (settings.image != 'none' && settings.image !== ''){
							knob.children('img').load(function(){
								knob.css('left', pxl-(knob.width()/2)+'px');
							});
						} else knob.css('left', pxl+'px');

						follow.css('width', pxl+'px');
					}

					//knob.css('left', startAt+'%');
					var rlt = {'guid':guid, 'value':startAt, 'el':self};
					if (options.drop) options.drop(rlt);
					if (options.drag) options.drag(rlt);

					if (setStartAt_runTwice) drawSnapmarks();
					setStartAt_runTwice = true;
				};
				setStartAt();

				// onload
				if (options.onload){
					var onload_timer = setInterval(function(){
						if (knobImageLoaded){
							options.onload();
							clearInterval(onload_timer);
						}
					}, 100);
				}
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