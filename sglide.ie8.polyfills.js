(function(){
	// CustomEvent
	try{new CustomEvent('?')}catch(o_O){
		/*!(C) Andrea Giammarchi -- WTFPL License*/
		this.CustomEvent = function(eventName, defaultInitDict){

			// the infamous substitute
			function CustomEvent(type, eventInitDict){
				var event = document.createEventObject(eventName);
				if (type != null) {
					initCustomEvent.call(event,	type, (eventInitDict || (
					// if falsy we can just use defaults
					eventInitDict = defaultInitDict
					)).bubbles,
					eventInitDict.cancelable,
					eventInitDict.detail
					);
				} else {
					// no need to put the expando property otherwise
					// since an event cannot be initialized twice
					// previous case is the most common one anyway
					// but if we end up here ... there it goes
					event.initCustomEvent = initCustomEvent;
				}
				return event;
			}

			// borrowed or attached at runtime
			function initCustomEvent(type, bubbles, cancelable, detail){
				this['init'+eventName](type, bubbles, cancelable, detail);
				'detail' in this || (this.detail = detail);
			}

			// that's it
			return CustomEvent;
		}(
			// is this IE9 or IE10 ?
			// where CustomEvent is there
			// but not usable as construtor ?
			this.CustomEvent ?
			// use the CustomEvent interface in such case
			'CustomEvent' : 'Event',
			// otherwise the common compatible one
			{
			bubbles: false,
			cancelable: false,
			detail: null
			}
		);
	}

	// Object.keys
	if (!Object.keys){
		Object.keys = function(obj){
			var keys = [];

			for (var i in obj){
				if (obj.hasOwnProperty(i)){
					keys.push(i);
				}
			}

			return keys;
		};
	}

	// trim()
	if (typeof String.prototype.trim !== 'function'){
		String.prototype.trim = function(){
			return this.replace(/^\s+|\s+$/g, ''); 
		};
	}

	// event listeners
	if (!document.addEventListener){
		Element.prototype.addEventListener = document.documentElement.attachEvent;
		document.addEventListener = document.attachEvent;
		window.addEventListener = window.attachEvent;
	}

	// event handlers
	/*function addEventHandler(elem, eventType, handler){
		if (elem.addEventListener)
			elem.addEventListener (eventType,handler,false);
		else if (elem.attachEvent)
			elem.attachEvent ('on'+eventType,handler); 
	}*/
})();