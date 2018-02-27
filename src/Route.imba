var isWeb = typeof window !== 'undefined'

export class Route
	prop raw
	prop params
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
		path = path.replace(/\:(\w+|\*)(\.)?/g) do |m,id,dot|
			# what about :id.:format?
			@groups.push(id) unless id == '*'
			if dot
				return "([^\/\#\.\?]+)\."
			else
				return "([^\/\#\?]+)"

		path = '^' + path
		if @options:exact and path[path:length - 1] != '$'
			path = path + '(?=[\#\?]|$)'
		else
			# we only want to match end OR /
			path = path + '(?=[\/\#\?]|$)'
		@regex = RegExp.new(path)
		self

	def test url
		url ||= @router.url # should include hash?
		return @cache:match if url == @cache:url

		let prefix = ''
		let matcher = @cache:url = url
		@cache:match = null

		if @parent and @raw[0] != '/'
			if let m = @parent.test(url)
				if url.indexOf(m:path) == 0
					prefix = m:path + '/'
					matcher = url.slice(m:path:length + 1)
		
		if let match = matcher.match(@regex)
			let path = prefix + match[0]
			if path == @params:path
				@params:url = url
				return @cache:match = @params

			@params = {path: path, url: url}
			if @groups:length
				for item,i in match
					if let name = @groups[i - 1]
						@params[name] = item

			return @cache:match = @params

		return @cache:match = null
	
	# should split up the Route types
	def statusDidSet status, prev
		let idx = @router.busy.indexOf(self)
		clearTimeout(@statusTimeout)

		if status < 200
			@router.busy.push(self) if idx == -1
			@statusTimeout = setTimeout(&,25000) do status = 408
		elif idx >= 0 and status >= 200
			@router.busy.splice(idx,1)
			
			# immediately to be able to kick of nested routes
			# is not commit more natural?
			@node?.commit
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
		else
			handler(cb)
		self
		
	def resolve url
		url ||= @router.url
		if @cache:resolveUrl == url
			return @cache:resolved
		
		# let base = @router.root or ''
		let base = ''
		@cache:resolveUrl = url # base + url
		
		if @parent and @raw[0] != '/'
			if let m = @parent.test
				@cache:resolved = base + m:path + '/' + @raw # .replace('$','')
		else
			# FIXME what if the url has some unknowns?
			@cache:resolved = base + @raw # .replace(/[\@\$]/g,'')

		return @cache:resolved
		