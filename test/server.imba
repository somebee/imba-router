import {App} from './app'
import {Router} from '../src'

const express = require('express')
const app = express()
const path = require('path')

const public = path.join(__dirname, '.')
app.use(express.static(public))

app.get(/.*/) do |req,res|
	var path = req:path

	var router = Router.new(url: path)
	var node = <html router=router>
		<head>
			# blank favicon
			<link href="data:image/x-icon;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQEAYAAABPYyMiAAAABmJLR0T///////8JWPfcAAAACXBIWXMAAABIAAAASABGyWs+AAAAF0lEQVRIx2NgGAWjYBSMglEwCkbBSAcACBAAAeaR9cIAAAAASUVORK5CYII=" rel="icon" type="image/x-icon">
			<link rel="stylesheet" href="/index.css">
		<body>
			# include the app tag in body
			<App>
	
	node.router.onReady do 
		console.log "onready",path
		res.send node.toString

app.listen(3013) do 
	console.log('Example app listening on port 3013!')