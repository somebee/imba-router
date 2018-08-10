var assert = require 'assert'

import {Router,Location} from '../src'

var l = Location.new('/home?tab=1')
console.log "strung",l.toString,l.path
l.query('tab',2)
l.query('other',3)
console.log l.toString,l.path

var r = Router.new

r.on('beforechange') do |req|
	console.log "beforechange",req.url
	

r.go("/home")
console.log r.url
r.go(tab: 'hello')
console.log r.url
r.go(tab: 'other')
console.log r.url,r.path
assert(r.path == '/home')
assert(r.path == '/home')

assert(r.match('/home?tab=other'))
assert(!r.match('/home?tab=again'))
console.log r.match('/home?tab=:mod')
console.log r.match('?tab=other')
console.log "done"