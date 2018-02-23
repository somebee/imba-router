import {Route} from './Route'

class Router
	@instance = null
	
	prop mode
	prop busy

	# support redirects
	def initialize url
		@url = url
		@routes = {}
		@redirects = {}
		@aliases = {}
		@busy = []
		setup
		self
		
	def setup
		if $web$
			let url = document:location:pathname
			if url and @redirects[url]
				history.replaceState({},null,@redirects[url])
		self
	
	def url
		let url = @url || ($web$ ? document:location:pathname : '')
		url = @redirects[url] or url
		@aliases[url] or url
		
	def self.instance
		@instance ||= self.new
		
	def history
		window:history
		
	def match pattern
		var route = @routes[pattern] ||= Route.new(self,pattern)
		route.test
		
	def go url
		url = @redirects[url] or url
		history.pushState({},null,url)
		
	def onReady cb
		if @busy.len == 0
			cb(self)
		else
			Imba.once(self,'ready',cb)


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

		if e.meta or e.alt or (href[0] != '#' and href[0] != '/')
			e.@responder = null
			e.prevent.stop
			return window.open(href,'_blank')

		e.prevent.stop
		router.go(href,{})
		
	def resolveRoute
		let match = @route.test
		setAttribute('href',@route.resolve)
		flagIf('active',@route.test)


const RoutedExtend =

	def inject node
		node.@params = {}
		node:resolveRoute = self:resolveRoute
		node:beforeRender = self:beforeRender
		node.detachFromParent

	def beforeRender
		resolveRoute
		if !@params.@active or @route.status != 200
			return no
		return yes

	def resolveRoute next
		let prev = @params
		let match = @route.test

		if match
			if match != prev
				params = match
				if self:load
					route.load do |next| self.load(params,next)

			if !match.@active
				match.@active = true
				attachToParent

		elif prev.@active
			prev.@active = false
			detachFromParent


extend tag element
	prop route watch: yes
	prop params watch: yes
		
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
	
	def getParentRoute
		var route = null
		var par = @owner_
		while par
			if par.@route
				return par.@route
			par = par.@owner_
		return null
	
	if $web$
		def router
			Router.instance
	
	if $node$
		def router
			@router or (@owner_ ? @owner_.router : (@router ||= Router.new))

extend tag a
	
	def onclick e
		var to = href
		
		unless to
			return

		if e.meta or e.alt or (to[0] != '#' and to[0] != '/')
			e.@responder = null
			return e.silence.stop

		e.prevent.stop
		router.go(to,{})
