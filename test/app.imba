require '../src/router'

tag Home
	def render
		<self>
			<header>
				<h1> "Home"
		
tag About
	def render
		<self>
			"About {title}"
			<h2> "route param {route:id}"

tag Section
	# hack to work around imba issue
	def render
		self
	
tag Guides
	def render
		<self>
			<header>
				<h1> "Guides"
				<a href='/guides/one'> 'one'
				<a href='/guides/two'> 'two'
				<a href='/guides/three'> 'three'

			<Section route='/guides/one'>
				<h2> "Guide one"
			
			<Section route='/guides/two'>
				<h2> "Guide two"
			
			<Section route='/guides/three'>
				<h2> "Guide three"
			
export tag App
	def render
		<self>
			<header>
				<a href='/'> 'root'
				<a href='/home'> 'home'
				<a href='/about'> 'about'
				<a href='/about/deep'> 'deep'
				<a href='/about/other'> 'other'
				<a href='/guides'> 'guides'
			
			<About route='/$' title="root">
			<Home  route='/home'>
			<About route.exact='/about$'>
			<About route='/about/:id' title="Other">
			
			<Guides route='/guides'>
			
			# matching can also be done programatically inline
			if router.match('/home')
				<div> "Is home"
				
			if let m = router.match('/about/:id')
				<div> "Is at about {m:id}"
