import {
  AUTHCTL_SUBMIT_REQUEST,
  AUTHCTL_SUBMIT_SUCCESS,
  AUTHCTL_SUBMIT_ERROR,
  AUTHCTL_CLEAR,
} from '../constants/redux'

const initialState = {
  uriAdAuth     : localStorage.getItem('uriAdAuth') ? localStorage.getItem('uriAdAuth') : '',
  status        : 'idle',
  message       : '',
  responseData  : null,
}

export default function authControlRdcr(state = initialState, action) {
  switch (action.type) {
    case AUTHCTL_SUBMIT_REQUEST:
      return {
        ...state,
        status: 'loading',
        message: '',
        responseData: null,
      }

    case AUTHCTL_SUBMIT_SUCCESS:
      return {
        ...state,
        status: 'success',
        message: action.payload.message || 'Успешно',
        responseData: action.payload.responseData,
      }

    case AUTHCTL_SUBMIT_ERROR:
      return {
        ...state,
        status: 'error',
        message: action.payload.message || 'Ошибка',
        responseData: null,
      }

    case AUTHCTL_CLEAR:
      return initialState

    default:
      return state
  }
}
