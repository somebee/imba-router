function len$(a){
	return a && (a.len instanceof Function ? a.len() : a.length) || 0;
};
var Imba = require('imba');
// externs;

var Route = require('./Route').Route;

// check if is web

var isWeb = typeof window !== 'undefined';

// proxy for hash
function Hash(){ };



function Request(router,path,referrer){
	this._router = router;
	this._path = this._originalPath = path;
	this._referrer = referrer;
};

Request.prototype.router = function(v){ return this._router; }
Request.prototype.setRouter = function(v){ this._router = v; return this; };
Request.prototype.path = function(v){ return this._path; }
Request.prototype.setPath = function(v){ this._path = v; return this; };
Request.prototype.referrer = function(v){ return this._referrer; }
Request.prototype.setReferrer = function(v){ this._referrer = v; return this; };

Request.prototype.redirect = function (path){
	console.log("Request.redirect!",path);
	this._redirected = this._path = path;
	return this;
};

Request.prototype.abort = function (){
	this._aborted = true;
	return this;
};

Request.prototype.url = function (){
	return this.path();
};

Request.prototype.match = function (str){
	return new Route(this,str).test();
};


function Router(o){
	var self = this;
	if(o === undefined) o = {};
	self._url = o.url || '';
	self._hash = '';
	self._routes = {};
	self._options = o;
	self._redirects = o.redirects || {};
	self._aliases = o.aliases || {};
	self._busy = [];
	self._root = o.root || '';
	self.setMode(o.mode || 'history');
	self.setup();
	
	if (isWeb) {
		// warn if multiple instances?
		self._instance || (self._instance = self);
		self._clickHandler = function(e) { return self.onclick(e); };
		self._captor = window.addEventListener('click',self._clickHandler,true);
	};
	self;
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

Router.instance = function (){
	return this._instance || (this._instance = new this());
};

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

Router.prototype.refresh = function (params){
	if(params === undefined) params = {};
	if (this._refreshing) { return };
	this._refreshing = true;
	let path = this.path();
	
	if (path != this._path) {
		console.log("refreshing url",path,this._path);
		
		// params:path = path
		// params:referrer = @path
		
		let req = new Request(this,path,this._path);
		
		let state = {
			path: path,
			referrer: this._path
		};
		
		this.emit('beforechange',req);
		if (req.path() != path) {
			console.log("redirected");
			this.replace(path = req.path());
			// what if we cancel?
		};
		
		this._path = path;
		this.emit('change',req);
		console.log("after change",req);
		Imba.commit();
		
		// checking hash?
		// let e = Imba.Event.wrap(type: 'change')
	};
	
	this._refreshing = false;
	return this;
};

Router.prototype.onpopstate = function (e){
	this.refresh({pop: true});
	return this;
};

Router.prototype.setup = function (){
	var self = this;
	if (isWeb) {
		// let url = location:pathname
		// temporary hack to support scrimba out-of-the-box
		if (!self._root && window.SCRIMBA_ROOT && self.mode() != 'hash') {
			self._root = window.SCRIMBA_ROOT.replace(/\/$/,'');
		};
		
		let url = self.url();
		// if url and @redirects[url]
		self.history().replaceState({},null,self.normalize(url));
		window.onpopstate = function(e) { return self.onpopstate(e); };
		
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

Router.prototype.serializeParams = function (params){
	if (params instanceof Object) {
		let res = [];
		for (let val, i = 0, keys = Object.keys(params), l = keys.length, key; i < l; i++){
			key = keys[i];val = params[key];res.push([key,encodeURI(val)].join("="));
		};
		var value = res;
		return value.join("&");
	};
	return params || '';
};

Router.prototype.setHash = function (value){
	if (isWeb) {
		console.log("set hash",this.serializeParams(value));
		// will set without jumping
		this.history().replaceState({},null,'#' + this.serializeParams(value)); // last state?
		// location:hash = serializeParams(value)
	};
	return this;
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
	// call from here instead?
	self.history().pushState(state,null,self.normalize(url));
	self.refresh();
	
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
	this.history().replaceState(state,null,this.normalize(url));
	return this.refresh();
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

Router.prototype.onclick = function (e){
	let i = 0;
	// let path = e:path
	let el = e.target;
	let href;
	
	while (el && el.getAttribute){ // = e:path[i++]
		if (href = el.getAttribute('href')) { break; };
		el = el.parentNode;
	};
	
	if (!el || !href || (href[0] != '#' && href[0] != '/')) {
		return;
	};
	
	// deal with alternative routes
	if (el._tag) {
		if (el._tag.resolveRoute) {
			el._tag.resolveRoute();
			href = el.getAttribute('href');
		};
		
		if (el.nodeName != 'A' && (e.metaKey || e.altKey)) {
			e.preventDefault();
			e.stopPropagation();
			window.open(href,'_blank');
		};
		
		// what if we have no tag for this?
		// trigger anyhow?
		let ev = el._tag.trigger('taproute',{path: href,sourceEvent: e,router: this}); // include metaKey etc
		if (!ev.isPrevented()) {
			e.preventDefault();
			e.stopPropagation();
			(e.metaKey || e.altKey) ? window.open(href,'_blank') : this.go(href,{});
		};
	};
	return this;
};

const LinkExtend = {
	inject: function(node,opts){
		let render = node.render;
		node.resolveRoute = this.resolveRoute;
		return node.beforeRender = this.beforeRender;
		// node:ontap ||= self:ontap
	},
	
	beforeRender: function(){
		this.resolveRoute();
		return true;
	},
	
	ontap: function(e){
		this.resolveRoute();
		var href = this.href ? this.href() : this.dom().href;
		if (!href) { return };
		
		if ((href[0] != '#' && href[0] != '/')) {
			e._responder = null;
			e.prevent().stop();
			return window.open(href,'_blank');
		};
		
		if (e.meta() || e.alt()) {
			e._responder = null;
			e.prevent().stop();
			return window.open(this.router().root() + href,'_blank');
		};
		
		var ev = this.trigger('taproute',{path: href});
		
		if (!ev.isPrevented()) {
			e.prevent().stop();
			return this.router().go(href,{});
		};
	},
	
	resolveRoute: function(){
		if (!this._route) { return this };
		
		let match = this._route.test();
		let href = this._route.resolve();
		
		if (this._route && this._route.option('sticky')) {
			let prev = this._route.params().url;
			if (prev && prev.indexOf(href) == 0) {
				href = prev;
			};
		};
		
		this.setAttribute('href',this.router().root() + href);
		this.flagIf('active',match);
		return this;
	}
};

const RoutedExtend = {
	
	inject: function(node){
		node._params = {};
		node.resolveRoute = this.resolveRoute;
		node.beforeRender = this.beforeRender;
		node.renderWithStatusCode = this.renderWithStatusCode;
		return node.detachFromParent();
	},
	
	renderWithStatusCode: function(code){
		if(code === undefined) code = this._route.status();
		if (this[("render" + code)]) {
			this[("render" + code)]();
			return true;
		};
		return false;
	},
	
	beforeRender: function(){
		this.resolveRoute();
		if (!this._params._active) { return false };
		
		let status = this._route.status();
		
		if (this.renderWithStatusCode(status)) {
			return false;
		};
		
		if (status >= 200) {
			return true;
		};
		
		return false;
	},
	
	resolveRoute: function(next){
		let prev = this._params;
		let match = this._route.test();
		
		if (match) {
			let active = match._active;
			match._active = true;
			
			if (match != prev) {
				this.setParams(match);
			};
			
			if (match != prev || !active) {
				this.routeDidMatch(match,prev);
			};
			
			if (!active) {
				// match.@active = true
				// should happen after load?
				this.attachToParent();
				return Imba.commit();
			};
		} else if (prev && prev._active) {
			prev._active = false;
			this.detachFromParent();
			return Imba.commit();
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
	
	tag.prototype.routeDidLoad = function (params){
		this.log('routeDidLoad');
		return this;
	};
	
	tag.prototype.routeDidFail = function (error){
		return this;
	};
	
	tag.prototype.routeDidMatch = function (params,prev){
		var self = this;
		if (!self.load) {
			self.routeDidLoad(params,prev);
			return self;
		};
		
		self.route().load(async function() {
			let val;
			try {
				if (params == prev && self.reload) {
					val = await self.reload(params,prev);
				} else {
					val = await self.load(params,prev);
				};
			} catch (e) {
				self.log("route error",e);
				val = 400;
				self.routeDidFail(e);
			};
			self.routeDidLoad(val);
			return val;
		});
		
		return self;
	};
	
	
	tag.prototype.ontaproute = function (){
		return this;
	};
});
