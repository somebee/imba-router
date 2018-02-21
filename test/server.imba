import {App} from './app'

const express = require('express')
const app = express()

app.get(/.*/) do |req,res|

	var path = req:path
	var node = <html router-url=path>
		<head>
		<body>
			<h1> "Hello"
			<App>

	res.send node.toString

app.listen(3013) do 
	console.log('Example app listening on port 3013!')