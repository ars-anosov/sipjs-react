import { legacy_createStore as createStore, applyMiddleware } from 'redux'
import rootReducer from '../reducers/rootReducer'

// Middleware
import { createLogger } from 'redux-logger'
import { thunk } from 'redux-thunk'
import { authTimeoutMiddleware } from '../reducers/authTimeoutMiddleware' 

export default function configureStore(initialState) {
  const logger = createLogger()
  const middlewareProd = [thunk, authTimeoutMiddleware]
  const middlewareDev = [thunk, authTimeoutMiddleware, logger]

  const store = createStore(
    rootReducer,
    initialState,
    process.env.NODE_ENV === 'production' 
      ? applyMiddleware(...middlewareProd) 
      : applyMiddleware(...middlewareDev)
  )

  return store
}
