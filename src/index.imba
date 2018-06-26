extern encodeURI

import {Route} from './Route'

# check if is web

var isWeb = typeof window !== 'undefined'

# proxy for hash
class Hash

class Request
	prop router
	prop path
	prop referrer
	prop aborted

	def initialize router, path, referrer
		@router = router
		@path = @originalPath = path
		@referrer = referrer

	def redirect path
		@redirected = @path = path
		self

	def abort
		@aborted = yes
		self
		
	def url
		path
		
	def match str
		Route.new(self,str).test


export class Router
	@instance = null
	
	prop mode watch: yes, chainable: yes
	prop busy
	prop root

	def self.instance
		@instance ||= self.new

	# support redirects
	def initialize o = {}
		@url = o:url or ''
		@hash = ''
		@routes = {}
		@options = o
		@redirects = o:redirects || {}
		@aliases = o:aliases || {}
		@busy = []
		@root = o:root or ''
		mode = o:mode or 'history'
		setup

		if isWeb
			# warn if multiple instances?
			@instance ||= self
			@clickHandler = do |e| onclick(e)
			@captor = window.addEventListener('click',@clickHandler,yes)
		self
		
	def option key, value
		if value == undefined
			return @options[key]
		else
			@options[key] = value
		return self
		
	def location
		document:location

	def state
		{}

	def refresh params = {}
		return if @refreshing
		@refreshing = yes
		let path = params:path or self.path

		if path != @path

			let req = Request.new(self,path,@path)
			
			emit('beforechange',req)

			if req.aborted
				# console.log "request was aborted",params
				var res = window.confirm("Are you sure you want to leave? You might have unsaved changes")

				if res
					req.aborted = no

				# if we don't confirm, push the previous state again
				elif params:pop
					path = @path
					history.pushState(state,null,normalize(@path))
				elif !params:push
					history.replaceState(state,null,normalize(@path))

				# if we're not popping - should happen before we are changing

			unless req.aborted
				@path = req.path

				if params:push
					# console.log "actually changing url"
					history.pushState(params:state or state,null,normalize(req.path))
				else
					if path != req.path
						replace(path = req.path)
					self

				emit('change',req)
				Imba.commit

			# checking hash?
			# let e = Imba.Event.wrap(type: 'change')

		@refreshing = no
		self
	
	def onpopstate e
		# console.log "onpopstate",e
		refresh(pop: yes)
		self

	def onbeforeunload e
		# console.log "onbeforeunload"
		let req = Request.new(self,null,self.path)
		emit('beforechange',req)
		return true if req.aborted
		return

		# return req.aborted ? true : false

	def setup
		if isWeb
			# let url = location:pathname
			# temporary hack to support scrimba out-of-the-box
			if !@root and window.SCRIMBA_ROOT and mode != 'hash'
				@root = window.SCRIMBA_ROOT.replace(/\/$/,'')

			let url = self.url
			# if url and @redirects[url]
			history.replaceState(state,null,normalize(url))
			window:onpopstate = self:onpopstate.bind(self) # do |e| onpopstate(e)
			window:onbeforeunload = self:onbeforeunload.bind(self)

			@hash = location:hash
			window.addEventListener('hashchange') do |e|
				emit('hashchange',@hash = location:hash)
				Imba.commit
		self
	
	def path
		let url = @url || (isWeb ? (mode == 'hash' ? (hash or '').slice(1) : location:pathname) : '')
		if @root and url.indexOf(@root) == 0
			url = url.slice(@root:length)
		url = '/' if url == ''
		url = @redirects[url] or url
		url = @aliases[url] or url
		return url
		
	def url
		var url = self.path
		if isWeb and mode != 'hash'
			url += location:hash
		return url
		
	def hash
		(isWeb ? location:hash : '')

	def serializeParams params
		if params isa Object
			var value = for own key,val of params
					[key,encodeURI(val)].join("=")
			return value.join("&")
		return params or ''

	def setHash value
		if isWeb
			# console.log "set hash",serializeParams(value)
			# will set without jumping
			history.replaceState({},null,'#' + serializeParams(value)) # last state?
			# location:hash = serializeParams(value)
		return self
		
	def history
		window:history
		
	def match pattern
		var route = @routes[pattern] ||= Route.new(self,pattern)
		route.test
		
	def go url, state = {}
		# remove hash if we are hash-based and url includes hash
		url = @redirects[url] or url
		# call from here instead?
		# history.pushState(state,null,normalize(url))
		refresh(push: yes, path: url, state: state)

		isWeb and onReady do
			let hash = location:hash
			if hash != @hash
				emit('hashchange',@hash = hash)
		self
		
	def replace url, state = {}
		url = @redirects[url] or url
		history.replaceState(state,null,normalize(url))
		refresh
		
	def normalize url
		if mode == 'hash'
			url = "#{url}"
		elif root
			url = root + url
		return url
		
	def onReady cb
		Imba.ticker.add do
			@busy.len == 0 ? cb(self) : Imba.once(self,'ready',cb)
			
	def emit name, *params do Imba.emit(self,name,params)
	def on name, *params do Imba.listen(self,name,*params)
	def once name, *params do Imba.once(self,name,*params)
	def un name, *params do Imba.unlisten(self,name,*params)
	
	# bound to target
	def tapRouteHandler e
		let el = dom
		let href = dom.getAttribute('href')

		if el:nodeName != 'A' and (e.meta or e.alt)
			e.stop.prevent
			window.open(href,'_blank')

		let ev = trigger('taproute',path: href, sourceEvent: e, router: router) # include metaKey etc
		unless ev.isPrevented
			e.stop.prevent
			(e.meta or e.alt) ? window.open(href,'_blank') : router.go(href,{})
		return

	def onclick e
		# console.log "onclick",e, e:defaultPrevented
		let i = 0
		# let path = e:path
		let el = e:target
		let href
		
		return if e:defaultPrevented

		while el and el:getAttribute # = e:path[i++]
			break if href = el.getAttribute('href')
			el = el:parentNode

		if !el or !href or (href[0] != '#' and href[0] != '/')
			return

		# deal with alternative routes
		if el.@tag
			if el.@tag:resolveRoute
				el.@tag.resolveRoute
				href = el.getAttribute('href')

			el.@tag['on$'](-20,['tap',self:tapRouteHandler])
			return
		self

const LinkExtend =
	def inject node, opts
		let render = node:render
		node:resolveRoute = self:resolveRoute
		node:beforeRender = self:beforeRender
		# node:ontap ||= self:ontap
		
	def beforeRender
		resolveRoute
		return yes
	
	def ontap e
		resolveRoute
		var href = self:href ? self.href : dom:href
		return unless href

		if (href[0] != '#' and href[0] != '/')
			e.@responder = null
			e.prevent.stop
			return window.open(href,'_blank')
			
		if e.meta or e.alt
			e.@responder = null
			e.prevent.stop
			return window.open(router.root + href,'_blank')

		var ev = trigger('taproute',path: href)

		unless ev.isPrevented
			e.prevent.stop
			router.go(href,{})
		
	def resolveRoute
		return self unless @route

		let match = @route.test
		let href =  @route.resolve

		if @route and @route.option(:sticky)
			let prev = @route.params:url
			if prev and prev.indexOf(href) == 0
				href = prev

		setAttribute('href',router.root + href)
		flagIf('active',match)
		return self

const RoutedExtend =

	def inject node
		node.@params = {}
		node:resolveRoute = self:resolveRoute
		node:beforeRender = self:beforeRender
		node:renderWithStatusCode = self:renderWithStatusCode
		node.detachFromParent

	def renderWithStatusCode code = @route.status
		if self["render{code}"]
			self["render{code}"]()
			return yes
		return no

	def beforeRender
		resolveRoute
		return no if !@params.@active

		let status = @route.status

		if renderWithStatusCode(status)
			return no

		if status >= 200
			return yes

		return no

	def resolveRoute next
		let prev = @params
		let match = @route.test

		if match
			let active = match.@active
			match.@active = true

			if match != prev
				params = match

			if match != prev or !active
				routeDidMatch(match,prev)

			if !active
				# match.@active = true
				# should happen after load?
				attachToParent
				Imba.commit

		elif prev and prev.@active
			prev.@active = false
			detachFromParent
			Imba.commit


extend tag element
	prop params watch: yes

	def route
		@route
		
	def setRoute path, mods
		let prev = @route

		unless prev
			path = String(path)
			let par = path[0] != '/' ? getParentRoute : null
			let opts = mods || {}
			opts:node = self
			@route = Route.new(router,path,par,opts)
			if opts:link
				LinkExtend.inject(self,opts)
			else
				RoutedExtend.inject(self)
		elif String(path) != prev.@raw
			prev.setPath(String(path))
		self
		
	def setRouteTo path, mods
		if @route
			setRoute(path)
		else
			mods ||= {}
			mods:link = true
			setRoute(path,mods)

	# for server
	def setRouterUrl url
		@router ||= Router.new(url)
		return self
		
	def setRouterRoot url
		router.root = url
		return self
	
	def getParentRoute
		var route = null
		var par = @owner_
		while par
			if par.@route
				return par.@route
			par = par.@owner_
		return null
		
	def setRouter router
		@router = router
		return self

	def router
		@router ||= (@owner_ and @owner_.router or Router.new)
		# isWeb ? Router.instance : (@router or (@owner_ ? @owner_.router : (@router ||= Router.new)))

	def routeDidLoad params
		log 'routeDidLoad'
		self

	def routeDidFail error
		self

	def routeDidMatch params, prev
		unless self:load
			routeDidLoad(params,prev)
			return self

		route.load do
			let val
			try
				if params == prev and self:reload
					val = await self.reload(params,prev)
				else
					val = await self.load(params,prev)
			catch e
				# log "route error",e
				val = 400
				routeDidFail(e)
			routeDidLoad(val)
			return val

		return self


	def ontaproute
		self
