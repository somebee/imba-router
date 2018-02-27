function iter$(a){ return a ? (a.toArray ? a.toArray() : a) : []; };
var Imba = require('imba');
var isWeb = typeof window !== 'undefined';

function Route(router,str,parent,options){
	this._parent = parent;
	this._router = router;
	this._options = options || {};
	this._node = this._options.node;
	this._status = 200;
	this.setPath(str);
};

exports.Route = Route; // export class 
Route.prototype.raw = function(v){ return this._raw; }
Route.prototype.setRaw = function(v){ this._raw = v; return this; };
Route.prototype.params = function(v){ return this._params; }
Route.prototype.setParams = function(v){ this._params = v; return this; };
Route.prototype.__status = {watch: 'statusDidSet',name: 'status'};
Route.prototype.status = function(v){ return this._status; }
Route.prototype.setStatus = function(v){
	var a = this.status();
	if(v != a) { this._status = v; }
	if(v != a) { this.statusDidSet && this.statusDidSet(v,a,this.__status) }
	return this;
};

Route.prototype.option = function (key){
	return this._options[key];
};

Route.prototype.setPath = function (path){
	var self = this;
	self._raw = path;
	self._groups = [];
	self._params = {};
	self._cache = {};
	path = path.replace(/\:(\w+|\*)(\.)?/g,function(m,id,dot) {
		// what about :id.:format?
		if (id != '*') { self._groups.push(id) };
		if (dot) {
			return "([^\/\#\.\?]+)\.";
		} else {
			return "([^\/\#\?]+)";
		};
	});
	
	path = '^' + path;
	if (self._options.exact && path[path.length - 1] != '$') {
		path = path + '(?=[\#\?]|$)';
	} else {
		// we only want to match end OR /
		path = path + '(?=[\/\#\?]|$)';
	};
	self._regex = new RegExp(path);
	return self;
};

Route.prototype.test = function (url){
	var m, match;
	url || (url = this._router.url()); // should include hash?
	if (url == this._cache.url) { return this._cache.match };
	
	let prefix = '';
	let matcher = this._cache.url = url;
	this._cache.match = null;
	
	if (this._parent && this._raw[0] != '/') {
		if (m = this._parent.test(url)) {
			if (url.indexOf(m.path) == 0) {
				prefix = m.path + '/';
				matcher = url.slice(m.path.length + 1);
			};
		};
	};
	
	if (match = matcher.match(this._regex)) {
		let path = prefix + match[0];
		if (path == this._params.path) {
			this._params.url = url;
			return this._cache.match = this._params;
		};
		
		this._params = {path: path,url: url};
		if (this._groups.length) {
			for (let i = 0, items = iter$(match), len = items.length, item, name; i < len; i++) {
				item = items[i];
				if (name = this._groups[i - 1]) {
					this._params[name] = item;
				};
			};
		};
		
		return this._cache.match = this._params;
	};
	
	return this._cache.match = null;
};

// should split up the Route types
Route.prototype.statusDidSet = function (status,prev){
	let idx = this._router.busy().indexOf(this);
	clearTimeout(this._statusTimeout);
	
	if (status < 200) {
		if (idx == -1) { this._router.busy().push(this) };
		this._statusTimeout = setTimeout(function() { return status = 408; },25000);
	} else if (idx >= 0 && status >= 200) {
		this._router.busy().splice(idx,1);
		
		// immediately to be able to kick of nested routes
		// is not commit more natural?
		this._node && this._node.commit  &&  this._node.commit();
		// Imba.commit
		if (this._router.busy().length == 0) {
			Imba.emit(this._router,'ready',[this._router]);
		};
	};
	
	return this._node && this._node.setFlag  &&  this._node.setFlag('route-status',("status-" + status));
};

Route.prototype.load = function (cb){
	var self = this;
	self.setStatus(102);
	
	var handler = self._handler = function(res) {
		var v_;
		if (handler != self._handler) {
			console.log("another load has started after this");
			return;
		};
		
		self._handler = null;
		return (self.setStatus(v_ = ((typeof res=='number'||res instanceof Number)) ? res : 200),v_);
	};
	
	if (cb instanceof Function) {
		cb = cb(handler);
	};
	
	if (cb && cb.then) {
		cb.then(handler,handler);
	} else {
		handler(cb);
	};
	return self;
};

Route.prototype.resolve = function (url){
	var m;
	url || (url = this._router.url());
	if (this._cache.resolveUrl == url) {
		return this._cache.resolved;
	};
	
	// let base = @router.root or ''
	let base = '';
	this._cache.resolveUrl = url; // base + url
	
	if (this._parent && this._raw[0] != '/') {
		if (m = this._parent.test()) {
			this._cache.resolved = base + m.path + '/' + this._raw; // .replace('$','')
		};
	} else {
		// FIXME what if the url has some unknowns?
		this._cache.resolved = base + this._raw; // .replace(/[\@\$]/g,'')
	};
	
	return this._cache.resolved;
};
