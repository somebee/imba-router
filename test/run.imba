var assert = require 'assert'

import {Router,Location} from '../src'

var l = Location.new('/home?tab=1')
console.log "strung",l.toString,l.path
assert(!l.query('tab',2))
assert(!l.query('other',3))
assert(l.toString and l.path)

var r = Router.new

r.on('beforechange') do |req|
	console.log "beforechange",req.url
	

r.go("/home")
assert(r.url)
r.go(tab: 'hello')
assert(r.url)
r.go(tab: 'other')
assert(r.url and r.path)

assert(r.path == '/home')
assert(r.path == '/home')

assert(r.match('/home?tab=other'))

assert(!r.match('/home?tab=again'))
assert(r.match('/home?tab=:mod'))
assert(r.match('?tab=other'))

r.go("/home?")
assert(r.match('?!tab'))
# r.go("/home?tab=2")
assert(r.match('?!tab'))

console.log "/home"
r.go("/home")
assert(r.match('/home?'))
assert(r.match('/home'))
assert(!r.match('/home?tab=a'))
assert(r.match('/home?tab='))

assert(r.route('/home?tab=').resolve == '/home?tab=')
assert(r.route('/home?!tab').resolve == '/home?!tab')

r.go("/home?tab=settings")
assert(r.route('/home?tab=').resolve == '/home?tab=')
assert(r.route('/home?!tab').resolve == '/home?!tab')
console.log "done"
