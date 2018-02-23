export class Route
	prop raw
	prop status watch: yes
	
	def initialize router, str, parent, options
		@parent = parent
		@router = router
		@options = options or {}
		@node = @options:node
		@status = 200
		setPath(str)
		
	def option key
		@options[key]
		
	def setPath path
		@raw = path
		@groups = []
		@params = {}
		@cache = {}
		path = path.replace(/\:(\w+|\*)/g) do |m,id|
			@groups.push(id) unless id == '*'
			return "([^\/]+)"

		path = '^' + path
		if @options:exact and path[path:length - 1] != '$'
			path = path + '$'
		else
			# we only want to match end OR /
			path = path + '(?=\/|$)'
		@regex = RegExp.new(path)
		self

	def test url
		url ||= @router.url
		let urlPrefix = ''

		if @parent and @raw[0] != '/'
			if let m = @parent.test(url)
				if url.indexOf(m:url) == 0
					urlPrefix = m:url + '/'
					url = url.slice(m:url:length + 1)
		
		if let match = url.match(@regex)
			let fullUrl = urlPrefix + match[0]
			# already matched this exactly
			if fullUrl == @params:url
				return @params
			
			@params = {url: fullUrl}
			if @groups:length
				for item,i in match
					if let name = @groups[i - 1]
						@params[name] = item
			return @params

		return null
	
	# should split up the Route types
	def statusDidSet status, prev
		let idx = @router.busy.indexOf(self)
		clearTimeout(@statusTimeout)

		if status < 200
			@router.busy.push(self) if idx == -1
			@statusTimeout = setTimeout(&,25000) do status = 408
		elif idx >= 0 and status >= 200
			@router.busy.splice(idx,1)
			@node?.render # immediately to be able to kick of nested routes
			# Imba.commit
			if @router.busy:length == 0
				Imba.emit(@router,'ready',[@router])

		@node?.setFlag('route-status',"status-{status}")
	
	def load cb
		status = 102

		var handler = @handler = do |res|
			if handler != @handler
				console.log "another load has started after this"
				return

			@handler = null
			status = res isa Number ? res : 200

		if cb isa Function
			cb = cb(handler)
			
		if cb and cb:then
			cb.then(handler,handler)
		
		elif cb isa Number
			handler(cb)
		# what about a timeout?
		self

		
	def resolve url
		url ||= @router.url
		if @cache:resolveUrl == url
			return @cache:resolved
		
		@cache:resolveUrl = url
		if @parent and @raw[0] != '/'
			if let m = @parent.test
				@cache:resolved = m:url + '/' + @raw # .replace('$','')
		else
			# what if the url has some unknowns?
			@cache:resolved = @raw # .replace(/[\@\$]/g,'')

		return @cache:resolved
		