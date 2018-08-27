function len$(a){
	return a && (a.len instanceof Function ? a.len() : a.length) || 0;
};
var Imba = require('imba');
// externs;

var Route = require('./Route').Route;
var URLSearchParams = require('../lib/util').URLSearchParams;
// check if is web

var isWeb = typeof window !== 'undefined';

// proxy for hash
function Hash(){ };



function Location(url){
	this.parse(url);
};

exports.Location = Location; // export class 
Location.parse = function (url){
	if (url instanceof Location) {
		return url;
	};
	return new this(url);
};

Location.prototype.path = function(v){ return this._path; }
Location.prototype.setPath = function(v){ this._path = v; return this; };
Location.prototype.state = function(v){ return this._state; }
Location.prototype.setState = function(v){ this._state = v; return this; };

Location.prototype.parse = function (url){
	var path = this._url = url;
	if (url.indexOf('?') >= 0) {
		let parts = url.split('?');
		path = parts.shift();
		this._searchParams = new URLSearchParams(parts.join('?'));
	};
	
	this._path = path;
	return this;
};

Location.prototype.path = function (){
	return this._path;
};

Location.prototype.searchParams = function (){
	return this._searchParams || (this._searchParams = new URLSearchParams(''));
};

Location.prototype.search = function (){
	let str = this._searchParams ? this._searchParams.toString() : '';
	return str ? (('?' + str)) : '';
};

Location.prototype.update = function (value){
	if (value instanceof Object) {
		for (let v, i = 0, keys = Object.keys(value), l = keys.length, k; i < l; i++){
			k = keys[i];v = value[k];this.query(k,v);
		};
	} else if ((typeof value=='string'||value instanceof String)) {
		this.parse(value);
	};
	return this;
};

Location.prototype.query = function (name,value){
	let q = this.searchParams();
	if (value === undefined) { return q.get(name) };
	return (value == null || value == '') ? q.delete(name) : q.set(name,value);
};

Location.prototype.clone = function (){
	return new Location(this.toString());
};

Location.prototype.equals = function (other){
	return this.toString() == String(other);
};

Location.prototype.url = function (){
	return this._path + this.search();
};

Location.prototype.toString = function (){
	return this._path + this.search();
};

function Request(router,location,referrer){
	this._router = router;
	if (location) {
		this._location = Location.parse(location);
		this._original = this._location.clone();
	};
	
	this._referrer = referrer;
	// @path = @originalPath = path
	// @referrer = referrer
};

Request.prototype.router = function(v){ return this._router; }
Request.prototype.setRouter = function(v){ this._router = v; return this; };
Request.prototype.referrer = function(v){ return this._referrer; }
Request.prototype.setReferrer = function(v){ this._referrer = v; return this; };
Request.prototype.aborted = function(v){ return this._aborted; }
Request.prototype.setAborted = function(v){ this._aborted = v; return this; };
Request.prototype.location = function(v){ return this._location; }
Request.prototype.setLocation = function(v){ this._location = v; return this; };
Request.prototype.state = function(v){ return this._state; }
Request.prototype.setState = function(v){ this._state = v; return this; };
Request.prototype.mode = function(v){ return this._mode; }
Request.prototype.setMode = function(v){ this._mode = v; return this; };

Request.prototype.redirect = function (path){
	this._location && this._location.update  &&  this._location.update(path);
	// allow normalizing urls
	// @redirected = @path = path
	return this;
};

Request.prototype.path = function (){
	return this._location && this._location.path  &&  this._location.path();
};

Request.prototype.url = function (){
	return this._location && this._location.toString  &&  this._location.toString();
};

Request.prototype.setPath = function (value){
	this._location.setPath(value);
	return this;
};

Request.prototype.abort = function (){
	this._aborted = true;
	return this;
};

Request.prototype.match = function (str){
	return this._location ? new Route(this,str).test() : null;
};

function History(router){
	this._router = router;
	this._stack = [];
	this._pos = -1;
};

History.prototype.pushState = function (state,title,url){
	this._stack.length = Math.max(this._pos,0);
	this._stack[++this._pos] = [state,title,url];
	// console.log "pushed state {url}"
	return this;
};

History.prototype.replaceState = function (state,title,url){
	// console.log "replaced state {url}"
	this._stack.length = this._pos;
	return this._stack[this._pos] = [state,title,url];
};

History.prototype.popState = function (){
	this._stack.length = this._pos + 1;
	this._pos -= 1;
	return this._stack.pop();
};

History.prototype.currentState = function (){
	return this._stack[this._pos];
};


function Router(o){
	var self = this;
	if(o === undefined) o = {};
	self._hash = '';
	self._routes = {};
	self._options = o;
	self._busy = [];
	self._root = o.root || '';
	self._history = isWeb ? window.history : new History(self);
	self._location = new Location(o.url || '/');
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
	return this._location;
};

Router.prototype.realLocation = function (){
	if (isWeb) {
		let loc = document.location;
		return loc.href.slice(loc.origin.length);
	};
	return String(this._location);
};

Router.prototype.state = function (){
	return {};
};

Router.prototype.pushState = function (state,title,url){
	return this.history().pushState(state,title || null,String(url));
};

Router.prototype.replaceState = function (state,title,url){
	return this.history().replaceState(state,title || null,String(url));
};

Router.prototype.refresh = function (params){
	var self = this;
	if(params === undefined) params = {};
	if (self._refreshing) { return };
	self._refreshing = true;
	
	let original = self._location;
	let loc = Location.parse(params.location || self.realLocation());
	let mode = params.mode;
	
	// we need to compare with the previously stored location
	// also see if state is different?
	if (!loc.equals(original)) {
		// console.log "actual url has changed!!",String(original),'to',String(loc)
		let req = new Request(self,loc,original);
		req.setMode(mode);
		
		self.emit('beforechange',req);
		
		if (req.aborted()) {
			// console.log "request was aborted",params
			var res = window.confirm("Are you sure you want to leave? You might have unsaved changes");
			
			if (res) {
				req.setAborted(false);
			} else if (mode == 'pop') { // params:pop
				self.pushState(self.state(),null,String(original));
			} else if (mode == 'replace') { // mode != 'push' # !params:push
				self.replaceState(self.state(),null,String(original));
			};
			
			// if we're not popping - should happen before we are changing
		};
		
		if (!req.aborted()) {
			self._location = req.location();
			
			if (mode == 'push') {
				self.pushState(params.state || self.state(),null,String(self._location));
			} else if (mode == 'replace') { // params:replace
				self.replaceState(params.state || self.state(),null,String(self._location));
			};
			
			if (isWeb) {
				self._location.setState(window.history.state);
			};
			
			self.emit('change',req);
			Imba.commit();
		};
	};
	
	isWeb && self.onReady(function() {
		// deprecate
		let hash = document.location.hash;
		if (hash != self._hash) {
			return self.emit('hashchange',self._hash = hash);
		};
	});
	
	self._refreshing = false;
	return self;
};

Router.prototype.onpopstate = function (e){
	this.refresh({pop: true,mode: 'pop'});
	return this;
};

Router.prototype.onbeforeunload = function (e){
	let req = new Request(this,null,this._location);
	this.emit('beforechange',req);
	if (req.aborted()) { return true };
	return;
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
		self._location = Location.parse(self.realLocation());
		self.history().replaceState(self.state(),null,String(self._location));
		window.onpopstate = self.onpopstate.bind(self); // do |e| onpopstate(e)
		window.onbeforeunload = self.onbeforeunload.bind(self);
		
		self._hash = document.location.hash;
		window.addEventListener('hashchange',function(e) {
			self.emit('hashchange',self._hash = document.location.hash);
			return Imba.commit();
		});
	};
	return self;
};

Router.prototype.path = function (){
	return this._location.path();
	// let url = @url || (isWeb ? (mode == 'hash' ? (hash or '').slice(1) : location:pathname) : '')
	// if @root and url.indexOf(@root) == 0
	// 	url = url.slice(@root:length)
	// url = '/' if url == ''
	// return url
};

Router.prototype.url = function (){
	return this._location.url();
};

Router.prototype.query = function (par,val){
	if (par == undefined) {
		return this._location.searchParams();
	} else {
		return this._location.query(par,val);
	};
};

Router.prototype.hash = function (){
	// @hash?
	return isWeb ? document.location.hash : '';
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
		// console.log "set hash",serializeParams(value)
		// will set without jumping
		this.history().replaceState({},null,'#' + this.serializeParams(value)); // last state?
		// location:hash = serializeParams(value)
	};
	return this;
};

Router.prototype.history = function (){
	return this._history;
};

Router.prototype.match = function (pattern){
	var route = this._routes[pattern] || (this._routes[pattern] = new Route(this,pattern));
	return route.test();
};

Router.prototype.go = function (url,state){
	if(state === undefined) state = {};
	let loc = this._location.clone().update(url,state);
	this.refresh({push: true,mode: 'push',location: loc,state: state});
	return this;
};

Router.prototype.replace = function (url,state){
	if(state === undefined) state = {};
	let loc = this._location.clone().update(url,state);
	return this.refresh({replace: true,mode: 'replace',location: loc,state: state});
	// history.replaceState(state,null,normalize(url,state))
	// refresh
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

// bound to target
Router.prototype.tapRouteHandler = function (e){
	let el = this.dom();
	let href = this.dom().getAttribute('href');
	
	if (el.nodeName != 'A' && (e.meta() || e.alt())) {
		e.stop().prevent();
		window.open(href,'_blank');
	};
	
	let ev = this.trigger('taproute',{path: href,sourceEvent: e,router: this.router()}); // include metaKey etc
	if (!ev.isPrevented()) {
		e.stop().prevent();
		(e.meta() || e.alt()) ? window.open(href,'_blank') : this.router().go(href,{});
	};
	return;
};

Router.prototype.onclick = function (e){
	// console.log "onclick",e, e:defaultPrevented
	let i = 0;
	// let path = e:path
	let el = e.target;
	let href;
	
	if (e.defaultPrevented) { return };
	
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
		
		el._tag.on$(-20,['tap',this.tapRouteHandler]);
		return;
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
				// log "route error",e
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
