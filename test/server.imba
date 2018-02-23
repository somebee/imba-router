import {App} from './app'

const express = require('express')
const app = express()

app.use(express.static('./'))

app.get(/.*/) do |req,res|
	var path = req:path
	
	# need to supply the url of the request
	# by setting router-url on the root element
	var node = <html router-url=path>
		<head>
			# blank favicon
			<link href="data:image/x-icon;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQEAYAAABPYyMiAAAABmJLR0T///////8JWPfcAAAACXBIWXMAAABIAAAASABGyWs+AAAAF0lEQVRIx2NgGAWjYBSMglEwCkbBSAcACBAAAeaR9cIAAAAASUVORK5CYII=" rel="icon" type="image/x-icon">
			<link rel="stylesheet" href="/index.css">
		<body>
			# include the app tag in body
			<App>
			# include the script for our application
			<script src='/bundle.js'>
	
	node.router.onReady do 
		console.log "onready",path
		res.send node.toString

app.listen(3013) do 
	console.log('Example app listening on port 3013!')