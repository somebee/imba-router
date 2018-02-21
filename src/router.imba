class Route
	prop raw

	def initialize router, str, options = {}
		@router  = router
		@options = options
		@pattern = @raw = str
		@groups = []
		@params = {}
		console.log "init route",self
		str = str.replace(/\:(\w+)/g) do |m,id|
			@groups.push(id)
			self[id] = do @params[id]
			return "([^\/]*)"

		str = '^' + str
		str += '$' if @options:exact
		@regex = RegExp.new(str)
		console.log @pattern,@regex

	def test_
		var url = @router.url # document:location:hash.slice(1)
		if @regex
			let match = url.match(@regex)
			
			if match
				# console.log "matching?",match,@groups
				for item,i in match
					if let name = @groups[i - 1]
						@params[name] = self[name] = item
				return @params
			return null
		return null

class Router
	@instance = null
	# support redirects
	def initialize url
		@url = url
		@routes = {}
		self
	
	def url
		@url || ($web$ ? document:location:hash.slice(1) : '')
		
	def self.instance
		@instance ||= self.new
		
	def match pattern, options
		# what about options?
		var route = @routes[pattern] ||= Route.new(self,pattern,options)
		route.test_
	
var ROUTER = Router.new

extend tag element
	prop route watch: yes
	prop params

	# def routeDidSet route
	# 	console.log "did set route",route
	# 	setupRouting
		
	def setRoute route, mods
		console.log "setRoute",route,mods
		if route != @route
			if !@route or @route.raw != route
				@route = Route.new(router,route,mods)
				setupRouting
		self
		
	def setupRouting
		return if @routedRender
		@routedRender = self:render

		self:render = do
			if !@route or @route.test_
				attachToParent
				@routedRender.call(self)
			else
				detachFromParent
		self
		
	def setRouterUrl url
		@router ||= Router.new(url)
		return self
	
	if $web$
		def router
			Router.instance
	
	if $node$
		def router
			@router or (@owner_ ? @owner_.router : (@router ||= Router.new))
