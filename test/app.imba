require '../src/router'
var api = require './api'

tag Customer
	prop list
	prop orders
	
	def load params, next
		for item in list
			if item:id == params:id
				break data = item
				
		orders = await api.rpc("/customers/{params:id}/orders.json")
		return 200

	def render
		<self>
			<div.details>
				<input[data:name] type='text'>
				<div> "Has {orders.len} orders"
			<div.orders>
				<h2> "Orders"
				<ul> for order in orders
					<li route-to="/orders/{order:id}"> "Order!! {order:id}"

tag Page

tag Customers < Page
	
	prop query
	
	def load params, next
		data = await api.rpc('/customers.json')
		return 200
		
	def filtered
		!query ? data : data.filter do |item|
			item:name.indexOf(query) >= 0
	
	def render
		<self>
			<aside>
				<input[query] type='text'>
				<ul.entries> for item in filtered
					<li.entry route.link=item:id>
						<span.name> item:name
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
				<a route-to='/customers'> 'Customers'
				<a route-to='/orders'> 'Orders'
				<a route-to='/about'> 'About'

			<Customers route='/customers'>
			<Orders route='/orders'>
