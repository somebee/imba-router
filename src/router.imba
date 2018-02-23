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

	def inject node
		let render = node:render

		node:resolveRoute = self:resolve
		node:ontap ||= self:ontap

		if render == Imba.Tag:prototype:render
			node:render = node:resolveRoute
		else
			node:render = do
				this.resolveRoute
				render.call(this)
		self
	
	def ontap e
		var href = @route.resolve
		return unless href

		if e.meta or e.alt or (href[0] != '#' and href[0] != '/')
			e.@responder = null
			e.prevent.stop
			return window.open(href,'_blank')

		e.prevent.stop
		router.go(href,{})
		
	def resolve
		setAttribute('href',@route.resolve)
		flagIf('active',@route.test)


const RoutedExtend =

	def inject node
		let render = node:routedRender = node:render
		node:resolveRoute = self:resolve
		node:render = self:render
		node.@params = {}
		node.detachFromParent

	def render
		resolveRoute
		if @params.@active and route.status == 200
			routedRender
		self

	def resolve next
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
				LinkExtend.inject(self)
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
