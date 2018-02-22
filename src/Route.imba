export class Route
	prop raw
	prop status watch: yes

	def initialize router, str, parent
		@parent = parent
		@router  = router
		@pattern = @raw = str
		@groups = []
		@params = {}
		@cache  = {}
		@status = 200
		
		# clean up scoped
		if str[0] == '@'
			str = str.slice(1)
		
		str = str.replace(/\:(\w+|\*)/g) do |m,id|
			@groups.push(id) unless id == '*'
			return "([^\/]*)"

		str = '^' + str
		@regex = RegExp.new(str)

	def test_ url
		url ||= @router.url
		let urlPrefix = ''

		if @parent and @raw[0] != '/'
			if let m = @parent.test_(url)
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
		
	def statusDidSet status, prev
		let idx = @router.busy.indexOf(self)

		if status == 0
			console.log "route is now busy!!"
			@router.busy.push(self)
		elif idx >= 0
			@router.busy.splice(idx,1)
			Imba.commit
	
	def load cb
		status = 0

		var handler = @handler = do |res|
			console.log "value from load.next",res
			if handler != @handler
				console.log "another load has started after this"
				return
			@handler = null
			status = res isa Number ? res : 200

		if cb isa Function
			cb = cb(handler)
			
		if cb and cb:then
			cb.then(handler,handler)
			
		# what about a timeout?
		self

		
	def resolve url
		url ||= @router.url
		if @cache:resolveUrl == url
			return @cache:resolved
		
		@cache:resolveUrl = url
			
		if @parent and @raw[0] == '@'
			if let m = @parent.test_
				@cache:resolved = m:url + @raw.slice(1).replace('$','')
		elif @parent and @raw[0] != '/'
			if let m = @parent.test_
				@cache:resolved = m:url + '/' + @raw.replace('$','')
		else
			@cache:resolved = @raw.replace(/[\@\$]/g,'')

		return @cache:resolved
		
	def getResponder
		# register in router.queue
		