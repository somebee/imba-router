class Route
	prop raw

	def initialize router, str, parent
		@parent = parent
		@router  = router
		# @options = options
		@pattern = @raw = str
		@groups = []
		@params = {}
		@cache = {}

		if str[0] == '@'
			str = str.slice(1)
		
		str = str.replace(/\:(\w+|\*)/g) do |m,id|
			@groups.push(id) unless id == '*'
			return "([^\/]*)"

		str = '^' + str
		# str += '$' if @options:exact
		@regex = RegExp.new(str)

	def test_ url
		url ||= @router.url
		let urlPrefix = ''

		if @parent and @raw[0] == '@'
			# console.log "route has parent!",@parent.raw
			if let m = @parent.test_(url)
				if url.indexOf(m:url) == 0
					urlPrefix = m:url
					url = url.slice(m:url:length)
				# console.log "matched parent",m,url
				# url = m:url
		
		if let match = url.match(@regex)
			@params:url = urlPrefix + match[0]
			if @groups:length
				for item,i in match
					if let name = @groups[i - 1]
						@params[name] = self[name] = item
			return @params

		return null
		
	def resolve url
		url ||= @router.url
		if @cache:resolveUrl == url
			return @cache:resolved
		
		@cache:resolveUrl = url
			
		if @parent and @raw[0] == '@'
			if let m = @parent.test_
				@cache:resolved = m:url + @raw.slice(1).replace('$','')
		else
			@cache:resolved = @raw.replace(/[\@\$]/g,'')
		return @cache:resolved
		# return @parent.resolve + @raw.slice(1).replace('$','')
		


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
		
	def match pattern
		# if simple
		# 	let url = url
		# 	# if pattern
		var route = @routes[pattern] ||= Route.new(self,pattern)
		route.test_
		
	def go url
		url = @redirects[url] or url
		history.pushState({},null,url)


extend tag element
	prop route watch: yes
	prop params
		
	def setRoute route, mods
		# console.log "setRoute",route,mods
		if route != @route
			if route and (!@route or @route.raw != route)
				let par = null
				if route[0] == '@'
					par = getParentRoute
				@route = Route.new(router,route,par)
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
		# might be scoped at multiple levels
		if @to and @to[0] == '@' and @route.@parent
			href = @route.resolve
		self
		
	def refreshRoute
		resolveLink
		flagIf('active',@route.test_)
		
	def end
		refreshRoute

