class Route
	prop raw

	def initialize router, str, options = {}
		@router  = router
		@options = options
		@pattern = @raw = str
		@groups = []
		@params = {}
		str = str.replace(/\:(\w+)/g) do |m,id|
			@groups.push(id)
			return "([^\/]*)"

		str = '^' + str
		str += '$' if @options:exact

		@regex = RegExp.new(str)

	def test_
		var url = @router.url
		
		if let match = url.match(@regex)
			for item,i in match
				if let name = @groups[i - 1]
					@params[name] = self[name] = item
			return @params

		return null


class Router
	@instance = null
	# support redirects
	def initialize url
		@url = url
		@routes = {}
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
		
	def match pattern, options
		# what about options?
		var route = @routes[pattern] ||= Route.new(self,pattern,options)
		route.test_
		
	def go url
		url = @redirects[url] or url
		history.pushState({},null,url)


extend tag element
	prop route watch: yes
	prop params
		
	def setRoute route, mods
		console.log "setRoute",route,mods
		if route != @route
			if !@route or @route.raw != route
				@route = Route.new(router,route,mods)
				setupRouting
		self
		
	def setupRouting
		return if @routedRender
		let prev = self:render

		@routedRender = self:render = do
			if !@route or @route.test_
				attachToParent
				prev.call(self) if prev
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

extend tag a
	
	def onclick e
		var to = href
		
		unless to
			return

		if e.meta or e.alt
			e.@responder = null
			return e.silence.stop

		if to[0] == '#' or to[0] == '/'
			console.log "goto!!!",to
			e.prevent.stop
			router.go(to,{})
		else
			e.@responder = null
			return e.stop


