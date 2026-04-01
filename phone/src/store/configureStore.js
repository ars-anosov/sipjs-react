import { legacy_createStore as createStore, applyMiddleware } from 'redux'
import rootReducer from '../reducers/rootReducer'

// Middleware
import { createLogger } from 'redux-logger'
import { thunk } from 'redux-thunk'

export default function configureStore(initialState) {
  const logger = createLogger()

  const store = createStore(
    rootReducer,
    initialState,
    ( process.env.NODE_ENV === 'production' ? applyMiddleware(thunk) : applyMiddleware(thunk, logger) )
  )

  return store
}
