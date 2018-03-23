import {Route} from './Route'

# check if is web

var isWeb = typeof window !== 'undefined'

export class Router
	@instance = null
	
	prop mode watch: yes, chainable: yes
	prop busy
	prop root

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
		self
		
	def option key, value
		if value == undefined
			return @options[key]
		else
			@options[key] = value
		return self
		
	def location
		document:location
		
	def setup
		if isWeb
			# let url = location:pathname
			# temporary hack to support scrimba out-of-the-box
			if !@root and window.SCRIMBA_ROOT and mode != 'hash'
				@root = window.SCRIMBA_ROOT.replace(/\/$/,'')

			let url = self.path
			# if url and @redirects[url]
			history.replaceState({},null,normalize(url))
				
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
		
	def self.instance
		@instance ||= self.new
		
	def history
		window:history
		
	def match pattern
		var route = @routes[pattern] ||= Route.new(self,pattern)
		route.test
		
	def go url, state = {}
		# remove hash if we are hash-based and url includes hash
		url = @redirects[url] or url
		
		history.pushState(state,null,normalize(url))
		# now commit and schedule events afterwards
		Imba.commit
		
		isWeb and onReady do
			let hash = location:hash
			if hash != @hash
				emit('hashchange',@hash = hash)
		self
		
	def replace url, state = {}
		url = @redirects[url] or url
		history.replaceState(state,null,normalize(url))
		
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

const LinkExtend =
	def inject node, opts
		let render = node:render
		node:resolveRoute = self:resolveRoute
		node:beforeRender = self:beforeRender
		node:ontap ||= self:ontap
		
	def beforeRender
		resolveRoute
		return yes
	
	def ontap e
		var href = @route.resolve

		return unless href
		
		if @route.option(:sticky)
			let prev = @route.params:url
			if prev and prev.indexOf(href) == 0
				href = prev

		if (href[0] != '#' and href[0] != '/')
			e.@responder = null
			e.prevent.stop
			# need to respect target
			return window.open(href,'_blank')
			
		if e.meta or e.alt
			e.@responder = null
			e.prevent.stop
			return window.open(router.root + href,'_blank')

		e.prevent.stop
		router.go(href,{})
		
	def resolveRoute
		let match = @route.test
		setAttribute('href',router.root + @route.resolve)
		flagIf('active',@route.test)


const RoutedExtend =

	def inject node
		node.@params = {}
		node:resolveRoute = self:resolveRoute
		node:beforeRender = self:beforeRender
		node.detachFromParent

	def beforeRender
		resolveRoute
		return no if !@params.@active

		let status = @route.status
		
		if self["render{status}"]
			self["render{status}"]()
			return no
			
		if status >= 200
			return yes

		return no

	def resolveRoute next
		let prev = @params
		let match = @route.test

		if match
			if match != prev
				params = match
				if self:load
					route.load do self.load(params)
			# call method every time if the actual url has changed - even if match is the same?

			if !match.@active
				match.@active = true
				# should happen after load?
				attachToParent

		elif prev.@active
			prev.@active = false
			detachFromParent


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
