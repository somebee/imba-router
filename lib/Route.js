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
	var self = this, ary;
	if (self._raw == path) { return self };
	self._raw = path;
	self._groups = [];
	self._params = {};
	self._cache = {};
	
	if (path.indexOf('?') >= 0) {
		let parts = path.split('?');
		path = parts.shift();
		self._query = {};
		// loop through and create regexes for matching?
		for (let i = 0, items = iter$(parts.join('?').split('&')), len = items.length, pair; i < len; i++) {
			pair = items[i];
			if (!pair) { continue; };
			var ary = iter$(pair.split('='));var k = ary[0],v = ary[1];
			if (k[0] == '!') {
				k = k.slice(1);
				v = false;
			};
			if (v === '') {
				v = false;
			};
			
			self._query[k] = v || ((v === false) ? false : true);
		};
	};
	
	path = path.replace(/\:(\w+|\*)(\.)?/g,function(m,id,dot) {
		// what about :id.:format?
		if (id != '*') { self._groups.push(id) };
		if (dot) {
			return "([^\/\#\.\?]+)\.";
		} else {
			return "([^\/\#\?]+)";
		};
	});
	
	if (path == '' && self._query) {
		return self;
	};
	
	path = '^' + path;
	let end = path[path.length - 1];
	if (self._options.exact && end != '$') {
		path = path + '(?=[\#\?]|$)';
	} else if ((end != '/' && end != '$' && path != '^/')) {
		// we only want to match end OR /
		// if path[path:length - 1]
		path = path + '(?=[\/\#\?]|$)';
	};
	self._regex = new RegExp(path);
	return self;
};

Route.prototype.test = function (loc,path){
	// test with location
	var m, match;
	loc || (loc = this._router.location());
	path || (path = loc.path());
	
	let url = loc.url();
	
	if (url == this._cache.url) { return this._cache.match };
	
	let prefix = '';
	let matcher = path;
	this._cache.url = url;
	this._cache.match = null;
	let qmatch;
	
	if (this._query) {
		qmatch = {};
		for (let o = this._query, v, i = 0, keys = Object.keys(o), l = keys.length, k; i < l; i++){
			k = keys[i];v = o[k];let m = loc.query(k);
			let name = k;
			// no match
			if (v === false) {
				if (m) { return null };
				continue;
			};
			
			if (v[0] == ':') {
				name = v.slice(1);
				v = true;
			};
			
			if ((v == true && m) || v == m) {
				qmatch[name] = m;
			} else {
				return null;
			};
		};
	};
	
	if (this._parent && this._raw[0] != '/') {
		if (m = this._parent.test(loc,path)) {
			if (path.indexOf(m.path) == 0) {
				prefix = m.path + '/';
				matcher = path.slice(m.path.length + 1);
			};
		};
	};
	
	// try to match our part of the path with regex
	if (match = (this._regex ? matcher.match(this._regex) : [''])) {
		let fullpath = prefix + match[0];
		let prevParams = this._params;
		// nothing changed
		if (fullpath == this._params.path) {
			this._params.url = url;
		} else {
			this._params = {path: fullpath,url: url};
			if (this._groups.length) {
				for (let i = 0, items = iter$(match), len = items.length, item, name; i < len; i++) {
					item = items[i];
					if (name = this._groups[i - 1]) {
						this._params[name] = item;
					};
				};
			};
		};
		if (qmatch) {
			let change = false;
			for (let v, i = 0, keys = Object.keys(qmatch), l = keys.length, k; i < l; i++){
				k = keys[i];v = qmatch[k];if (this._params[k] != v) {
					change = true;
					this._params[k] = v;
				};
			};
			
			if (change && prevParams == this._params) {
				this._params = Object.assign({},this._params);
			};
		};
		// try to match tab-values as well
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
			// console.log "another load has started after this"
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
	let raw = this._raw;
	this._cache.resolveUrl = url; // base + url
	
	// if @query
	// 	raw = raw.slice(0,raw.indexOf('?'))
	// 	# add / remove params from url
	
	if (this._parent && this._raw[0] != '/') {
		if (m = this._parent.test()) {
			// what if 
			if (raw[0] == '?') {
				// possibly replace with & or even replace param?
				this._cache.resolved = base + m.path + raw;
			} else {
				this._cache.resolved = base + m.path + '/' + raw;
			};
		};
	} else {
		// FIXME what if the url has some unknowns?
		this._cache.resolved = base + raw; // .replace(/[\@\$]/g,'')
	};
	
	return this._cache.resolved;
};
