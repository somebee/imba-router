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

tag Page

tag Customers < Page
	
	prop query
	
	def load params, next
		data = await api.rpc('/customers.json')
		console.log "loaded data",data
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
	
	prop query
	
	def load params, next
		data = await api.rpc('/orders.json')
		return 200
		
	def navigateTo item
		let url = params:url + '/' + item:id
		router.go url
	
	def render
		<self>
			<aside>
				<ul.entries> for item in data
					<li.entry.order :tap.navigateTo(item)> <navlink to=item:id> item:id
			<Order.main route=':id' list=data>

export tag App
	def render
		<self>
			<nav.main>
				<navlink to='/$'> 'Home'
				<navlink to='/customers'> 'Customers'
				<navlink to='/orders'> 'Orders'
				<navlink to='/about'> 'About'
				
			<Customers route='/customers'>
			<Orders route='/orders'>
