import {Route} from './Route'

class Resolver
	def initialize router
		@router = router
		@callback = do |value| resolve(value)
		@router.resolvers.push(self)
	
	def resolve result
		@resolved = yes
		@result = result
		@router.resolvers = @router.resolvers.filter do |item|
			item != self
		# @router.resolved(self)
		# very similar to a queue
		# route.load do
	
class Router
	@instance = null
	
	prop mode
	prop busy

	# support redirects
	def initialize url
		@url = url
		@routes = {}
		@busy = []
		@redirects = {
			'/old-guide': '/guides'
		}
		@aliases = {
			'/guides': '/guides/one'
		}
		setup
		self
		
	def setup
		if $web$
			let url = document:location:pathname
			console.log "redirect url?",url
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
		route.test_
		
	def go url
		url = @redirects[url] or url
		history.pushState({},null,url)


extend tag element
	prop route watch: yes
	prop params watch: yes
		
	def setRoute route, mods
		# console.log "setRoute",route,mods
		if route != @route
			@params = {}
			if route and (!@route or @route.raw != route)
				let par = null
				if route[0] != '/'
					par = getParentRoute
				@route = Route.new(router,route,par,self)
				setupRouting
		self
		
	def setupRouting
		return if @routedRender
		let prev = self:render
		
		detachFromParent

		@routedRender = self:render = do
			resolveRoute
			if prev and @params.@active and route.status == 200
				prev.call(self)
		self
		
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
		
	def resolveRoute next
		let prev = @params
		let match = @route.test_
		
		# see if url hasnt changed at all?
		if prev.@next
			# there is already a function 
			console.log "already loading"

		if match
			if match != prev
				params = match
				# let cb = do
				# 	console.log "finished entering route!"
				# 	attachToParent
				# 	trigger(:routed,to: @params,from: prev)
				# Object.assign({@active: true},match)
				# unless prev:url
				# 	beforeRouteEnter(@params,prev,cb)
				# else
				# 	beforeRouteUpdate(@params,prev,cb)

			if !match.@active
				match.@active = true
				attachToParent

		elif prev.@active
			prev.@active = false
			let cb = do
				detachFromParent
				console.log "finished leaving route!"

			beforeRouteLeave({},prev,cb)
		
	def beforeRouteEnter to, from, next
		log "beforeRouteEnter"
		next()
		self
		
	def beforeRouteUpdate to, from, next
		log "beforeRouteUpdate"
		next()
		self
		
	def beforeRouteLeave to, from, next
		log "beforeRouteLeave"
		next()
		self
	
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

tag navlink < a
	prop to
	
	def setTo to
		if to != @to
			@to = to
			@route = Route.new(router,@to,getParentRoute)
			href = to.replace('$','')
			resolveLink
		self

	def resolveLink
		if @to and @to[0] != '/' and @route.@parent
			href = @route.resolve
		self
		
	def refreshRoute
		resolveLink
		flagIf('active',@route.test_)
		
	def end
		refreshRoute

