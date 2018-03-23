function len$(a){
	return a && (a.len instanceof Function ? a.len() : a.length) || 0;
};
var Imba = require('imba');
var Route = require('./Route').Route;

// check if is web

var isWeb = typeof window !== 'undefined';

function Router(o){
	if(o === undefined) o = {};
	this._url = o.url || '';
	this._hash = '';
	this._routes = {};
	this._options = o;
	this._redirects = o.redirects || {};
	this._aliases = o.aliases || {};
	this._busy = [];
	this._root = o.root || '';
	this.setMode(o.mode || 'history');
	this.setup();
	this;
};

exports.Router = Router; // export class 
Router._instance = null;

Router.prototype.__mode = {watch: 'modeDidSet',chainable: true,name: 'mode'};
Router.prototype.mode = function(v){ return v !== undefined ? (this.setMode(v),this) : this._mode; }
Router.prototype.setMode = function(v){
	var a = this.mode();
	if(v != a) { this._mode = v; }
	if(v != a) { this.modeDidSet && this.modeDidSet(v,a,this.__mode) }
	return this;
};
Router.prototype.busy = function(v){ return this._busy; }
Router.prototype.setBusy = function(v){ this._busy = v; return this; };
Router.prototype.root = function(v){ return this._root; }
Router.prototype.setRoot = function(v){ this._root = v; return this; };

// support redirects
Router.prototype.option = function (key,value){
	if (value == undefined) {
		return this._options[key];
	} else {
		this._options[key] = value;
	};
	return this;
};

Router.prototype.location = function (){
	return document.location;
};

Router.prototype.setup = function (){
	var self = this;
	if (isWeb) {
		// let url = location:pathname
		// temporary hack to support scrimba out-of-the-box
		if (!self._root && window.SCRIMBA_ROOT && self.mode() != 'hash') {
			self._root = window.SCRIMBA_ROOT.replace(/\/$/,'');
		};
		
		let url = self.path();
		// if url and @redirects[url]
		self.history().replaceState({},null,self.normalize(url));
		
		self._hash = self.location().hash;
		window.addEventListener('hashchange',function(e) {
			self.emit('hashchange',self._hash = self.location().hash);
			return Imba.commit();
		});
	};
	return self;
};

Router.prototype.path = function (){
	let url = this._url || (isWeb ? (((this.mode() == 'hash') ? (this.hash() || '').slice(1) : this.location().pathname)) : '');
	if (this._root && url.indexOf(this._root) == 0) {
		url = url.slice(this._root.length);
	};
	if (url == '') { url = '/' };
	url = this._redirects[url] || url;
	url = this._aliases[url] || url;
	return url;
};

Router.prototype.url = function (){
	var url = this.path();
	if (isWeb && this.mode() != 'hash') {
		url += this.location().hash;
	};
	return url;
};

Router.prototype.hash = function (){
	return isWeb ? this.location().hash : '';
};

Router.instance = function (){
	return this._instance || (this._instance = new this());
};

Router.prototype.history = function (){
	return window.history;
};

Router.prototype.match = function (pattern){
	var route = this._routes[pattern] || (this._routes[pattern] = new Route(this,pattern));
	return route.test();
};

Router.prototype.go = function (url,state){
	// remove hash if we are hash-based and url includes hash
	var self = this;
	if(state === undefined) state = {};
	url = self._redirects[url] || url;
	
	self.history().pushState(state,null,self.normalize(url));
	// now commit and schedule events afterwards
	Imba.commit();
	
	isWeb && self.onReady(function() {
		let hash = self.location().hash;
		if (hash != self._hash) {
			return self.emit('hashchange',self._hash = hash);
		};
	});
	return self;
};

Router.prototype.replace = function (url,state){
	if(state === undefined) state = {};
	url = this._redirects[url] || url;
	return this.history().replaceState(state,null,this.normalize(url));
};

Router.prototype.normalize = function (url){
	if (this.mode() == 'hash') {
		url = ("#" + url);
	} else if (this.root()) {
		url = this.root() + url;
	};
	return url;
};

Router.prototype.onReady = function (cb){
	var self = this;
	return Imba.ticker().add(function() {
		return (len$(self._busy) == 0) ? cb(self) : Imba.once(self,'ready',cb);
	});
};

Router.prototype.emit = function (name){
	var $0 = arguments, i = $0.length;
	var params = new Array(i>1 ? i-1 : 0);
	while(i>1) params[--i - 1] = $0[i];
	return Imba.emit(this,name,params);
};
Router.prototype.on = function (name){
	var Imba_;
	var $0 = arguments, i = $0.length;
	var params = new Array(i>1 ? i-1 : 0);
	while(i>1) params[--i - 1] = $0[i];
	return Imba.listen.apply(Imba,[].concat([this,name], [].slice.call(params)));
};
Router.prototype.once = function (name){
	var Imba_;
	var $0 = arguments, i = $0.length;
	var params = new Array(i>1 ? i-1 : 0);
	while(i>1) params[--i - 1] = $0[i];
	return Imba.once.apply(Imba,[].concat([this,name], [].slice.call(params)));
};
Router.prototype.un = function (name){
	var Imba_;
	var $0 = arguments, i = $0.length;
	var params = new Array(i>1 ? i-1 : 0);
	while(i>1) params[--i - 1] = $0[i];
	return Imba.unlisten.apply(Imba,[].concat([this,name], [].slice.call(params)));
};

const LinkExtend = {
	inject: function(node,opts){
		let render = node.render;
		node.resolveRoute = this.resolveRoute;
		node.beforeRender = this.beforeRender;
		return node.ontap || (node.ontap = this.ontap);
	},
	
	beforeRender: function(){
		this.resolveRoute();
		return true;
	},
	
	ontap: function(e){
		var href = this._route.resolve();
		
		if (!href) { return };
		
		if (this._route.option('sticky')) {
			let prev = this._route.params().url;
			if (prev && prev.indexOf(href) == 0) {
				href = prev;
			};
		};
		
		if ((href[0] != '#' && href[0] != '/')) {
			e._responder = null;
			e.prevent().stop();
			// need to respect target
			return window.open(href,'_blank');
		};
		
		if (e.meta() || e.alt()) {
			e._responder = null;
			e.prevent().stop();
			return window.open(this.router().root() + href,'_blank');
		};
		
		e.prevent().stop();
		return this.router().go(href,{});
	},
	
	resolveRoute: function(){
		let match = this._route.test();
		this.setAttribute('href',this.router().root() + this._route.resolve());
		return this.flagIf('active',this._route.test());
	}
};


const RoutedExtend = {
	
	inject: function(node){
		node._params = {};
		node.resolveRoute = this.resolveRoute;
		node.beforeRender = this.beforeRender;
		return node.detachFromParent();
	},
	
	beforeRender: function(){
		this.resolveRoute();
		if (!this._params._active) { return false };
		
		let status = this._route.status();
		
		if (this[("render" + status)]) {
			this[("render" + status)]();
			return false;
		};
		
		if (status >= 200) {
			return true;
		};
		
		return false;
	},
	
	resolveRoute: function(next){
		var self = this;
		let prev = self._params;
		let match = self._route.test();
		
		if (match) {
			if (match != prev) {
				self.setParams(match);
				if (self.load) {
					self.route().load(function() { return self.load(self.params()); });
				};
			};
			// call method every time if the actual url has changed - even if match is the same?
			
			if (!match._active) {
				match._active = true;
				// should happen after load?
				return self.attachToParent();
			};
		} else if (prev._active) {
			prev._active = false;
			return self.detachFromParent();
		};
	}
};


Imba.extendTag('element', function(tag){
	tag.prototype.__params = {watch: 'paramsDidSet',name: 'params'};
	tag.prototype.params = function(v){ return this._params; }
	tag.prototype.setParams = function(v){
		var a = this.params();
		if(v != a) { this._params = v; }
		if(v != a) { this.paramsDidSet && this.paramsDidSet(v,a,this.__params) }
		return this;
	};
	
	tag.prototype.route = function (){
		return this._route;
	};
	
	tag.prototype.setRoute = function (path,mods){
		let prev = this._route;
		
		if (!prev) {
			path = String(path);
			let par = (path[0] != '/') ? this.getParentRoute() : null;
			let opts = mods || {};
			opts.node = this;
			this._route = new Route(this.router(),path,par,opts);
			if (opts.link) {
				LinkExtend.inject(this,opts);
			} else {
				RoutedExtend.inject(this);
			};
		} else if (String(path) != prev._raw) {
			prev.setPath(String(path));
		};
		return this;
	};
	
	tag.prototype.setRouteTo = function (path,mods){
		if (this._route) {
			return this.setRoute(path);
		} else {
			mods || (mods = {});
			mods.link = true;
			return this.setRoute(path,mods);
		};
	};
	
	// for server
	tag.prototype.setRouterUrl = function (url){
		this._router || (this._router = new Router(url));
		return this;
	};
	
	tag.prototype.setRouterRoot = function (url){
		this.router().setRoot(url);
		return this;
	};
	
	tag.prototype.getParentRoute = function (){
		var route = null;
		var par = this._owner_;
		while (par){
			if (par._route) {
				return par._route;
			};
			par = par._owner_;
		};
		return null;
	};
	
	tag.prototype.setRouter = function (router){
		this._router = router;
		return this;
	};
	
	tag.prototype.router = function (){
		return this._router || (this._router = (this._owner_ && this._owner_.router() || new Router()));
		// isWeb ? Router.instance : (@router or (@owner_ ? @owner_.router : (@router ||= Router.new)))
	};
});
