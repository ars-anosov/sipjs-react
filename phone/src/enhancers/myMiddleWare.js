import {
  AUTH_TOKEN_DISPLAY_BLK,
} from '../constants/all'

export const checkBodyMessage = store => next => action => {
  if (action.payload && action.payload.body) {
    if (action.payload.body.message === 'token Unauthorized') {
      console.log('payload.body.message -->', action.payload.body.message)
      store.dispatch({
        type: AUTH_TOKEN_DISPLAY_BLK,
        payload: {'boolVal': true}
      })
    }
  }

  return next(action)
}

export const ping = store => next => action => {
  console.log(`action.type: ${action.type}, action.payload: ${action.payload}`)
  return next(action)
}
