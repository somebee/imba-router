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

var guides = [
	{id: 'basics', title: "Basics"}
	{id: 'params', title: "Params"}
	{id: 'nesting', title: "Nesting"}
]

for item in guides
	guides[item:id] = item

tag Guide
	def data
		guides[route:id]
	
	def render
		<self>
			<header>
				<h1> "Welcome to article {route:id}"
				<navlink to='@/$'> 'article'
				<navlink to='@/resources'> 'resources'
				<navlink to='@/share'> 'share'
			
			<div route='@/$'>
				<h2> "Article here"
			
			<div route='@/resources'>
				<h2> "Resources here"
				
			<div route='@/share'>
				<h2> "Sharing here"

tag Guides
	def render
		<self>
			<header>
				<h1> "Guides"
				for guide in guides
					<navlink to="@/{guide:id}"> guide:title

				<navlink to='@/one'> 'one'
				<navlink to='@/two'> 'two'
				<navlink to='@/three'> 'three'
			
			<Guide route='@/:id'>
			
			<div route='@/one'>
				<h2> "Guide one"
			
			<div route='@/two'>
				<h2> "Guide two"
			
			<div route='@/three'>
				<h2> "Guide three"
			
export tag App
	def render
		<self>
			<header>
				<navlink to='/$'> 'root'
				<navlink to='/home'> 'home'
				<navlink to='/about'> 'about'
				<navlink to='/guides'> 'guides'
			
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
