import {App} from './app'

# the server has already rendered our app
# but we want to replace it with our own version on client
document:body:innerHTML = ''
Imba.mount <App>
