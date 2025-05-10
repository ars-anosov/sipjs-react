import { createStore, applyMiddleware } from 'redux'
import rootReducer from '../reducers/rootReducer'

// Middleware
import { createLogger } from 'redux-logger'
import { checkBodyMessage, ping } from '../enhancers/myMiddleWare'
import { thunk } from 'redux-thunk'

export default function configureStore(initialState) {
  const logger = createLogger()

  const store = createStore(
    rootReducer,
    initialState,
    ( process.env.NODE_ENV === 'production' ? applyMiddleware(thunk, checkBodyMessage) : applyMiddleware(thunk, checkBodyMessage, logger) )
  )

  return store
}
