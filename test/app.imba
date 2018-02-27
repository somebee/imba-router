require '../lib/index'
var api = require './api'

tag Customer
	prop list
	prop orders
	
	def load params, next
		data = null
		# renderLoading

		for item in list
			if item:id == params:id
				break data = item
		
		orders = await api.rpc("/customers/{params:id}/orders.json")
		
		unless data
			console.log "could not find!!!"
			return 404
		return 200
		
	def renderLoading
		<self> "Loading!"

	def render
		console.log "Customer#render"
		unless data
			return <self> "Loading!"

		<self>
			<h2> data:name

			<div.details>
				<a route-to='info'> 'Info'
				<a route-to='orders'> 'Orders'

				<div> "Has {orders.len} orders"

			<div route='info'>	
				<h2> data:name
				<input[data:name] type='text'>

			<div route='orders' =>
				<h2> "Orders"
				<ul> for order in orders
					<li route-to="/orders/{order:id}"> "Order!! {order:id}"

tag Page

tag Customers < Page
	
	prop query
	
	def load params
		data = await api.rpc('/customers.json')
		return 200
		
	def filtered
		!query ? data : data.filter do |item|
			item:name.indexOf(query) >= 0
	
	def render
		<self>
			<aside>
				<input[query] type='text'>
				<ul.entries>
					for item in filtered
						<li.entry route-to.sticky=item:id ->
							<span.name> item:name
					<li.entry route-to="14" ->
						<span.name> "Unknown"

			<Customer.main route=':id' list=data>

tag Order
	prop list

	def render
		<self> "Order"

tag Orders < Page

	def load params, next
		data = await api.rpc('/orders.json')
		return 200

	def render
		<self>
			<aside>
				<ul.entries> for item in data
					<li.entry.order route.link=item:id>
						<span.name> item:id
			<Order.main route=':id' list=data>

export tag App
	def render
		<self>
			<nav.main>
				<a route-to.exact='/'> 'Home'
				<a route-to.sticky='/customers'> 'Customers'
				<a route-to.sticky='/orders'> 'Orders'
				<a route-to.sticky='/about'> 'About'

			<Customers route='/customers'>
			<Orders route='/orders'>
