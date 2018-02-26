function len$(a){
	return a && (a.len instanceof Function ? a.len() : a.length) || 0;
};
var Imba = require('imba');
var Route = require('./Route').Route;

// check if is web

var isWeb = typeof window !== 'undefined';

function Router(url,o){
	if(o === undefined) o = {};
	this._url = url;
	this._routes = {};
	this._redirects = {};
	this._aliases = {};
	this._busy = [];
	this._root = o.root || '';
	this.setup();
	this;
};

Router._instance = null;

Router.prototype.mode = function(v){ return this._mode; }
Router.prototype.setMode = function(v){ this._mode = v; return this; };
Router.prototype.busy = function(v){ return this._busy; }
Router.prototype.setBusy = function(v){ this._busy = v; return this; };
Router.prototype.root = function(v){ return this._root; }
Router.prototype.setRoot = function(v){ this._root = v; return this; };

// support redirects
Router.prototype.setup = function (){
	if (isWeb) {
		let url = document.location.pathname;
		// temporary hack to support scrimba out-of-the-box
		if (!this._root && window.SCRIMBA_ROOT) {
			this._root = window.SCRIMBA_ROOT.replace(/\/$/,'');
		};
		
		if (url && this._redirects[url]) {
			this.history().replaceState({},null,this._redirects[url]);
		};
	};
	return this;
};

Router.prototype.url = function (){
	let url = this._url || (isWeb ? document.location.pathname : '');
	if (this._root && url.indexOf(this._root) == 0) {
		url = url.slice(this._root.length);
	};
	
	url = this._redirects[url] || url;
	return url = this._aliases[url] || url;
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

Router.prototype.go = function (url){
	url = this._redirects[url] || url;
	return this.history().pushState({},null,this.normalize(this.root() + url));
};

Router.prototype.normalize = function (url){
	return url;
};

Router.prototype.onReady = function (cb){
	if (len$(this._busy) == 0) {
		return cb(this);
	} else {
		return Imba.once(this,'ready',cb);
	};
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
					self.route().load(function(next) { return self.load(self.params(),next); });
				};
			};
			
			if (!match._active) {
				match._active = true;
				return self.attachToParent();
			};
		} else if (prev._active) {
			prev._active = false;
			return self.detachFromParent();
		};
	}
};


Imba.extendTag('element', function(tag){
	tag.prototype.__route = {watch: 'routeDidSet',name: 'route'};
	tag.prototype.route = function(v){ return this._route; }
	tag.prototype.setRoute = function(v){
		var a = this.route();
		if(v != a) { this._route = v; }
		if(v != a) { this.routeDidSet && this.routeDidSet(v,a,this.__route) }
		return this;
	};
	tag.prototype.__params = {watch: 'paramsDidSet',name: 'params'};
	tag.prototype.params = function(v){ return this._params; }
	tag.prototype.setParams = function(v){
		var a = this.params();
		if(v != a) { this._params = v; }
		if(v != a) { this.paramsDidSet && this.paramsDidSet(v,a,this.__params) }
		return this;
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
	
	tag.prototype.router = function (){
		return isWeb ? Router.instance() : ((this._router || (this._owner_ ? this._owner_.router() : ((this._router || (this._router = new Router()))))));
	};
});
