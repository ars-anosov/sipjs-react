import {
  LKTOKEN_SUBMIT_REQUEST,
  LKTOKEN_SUBMIT_SUCCESS,
  LKTOKEN_SUBMIT_ERROR,
  LKTOKEN_CLEAR,
  LK_STORE_VALUE,
} from '../constants/redux'

const initialState = {
  displayLkToken: false,
  displayControl: true,
  uriLkToken: localStorage.getItem('uriLkToken') ? localStorage.getItem('uriLkToken') : '',
  status: 'idle',
  message: '',
  responseData: null,
}

export default function lkTokenRdcr(state = initialState, action) {
  switch (action.type) {
    case LKTOKEN_SUBMIT_REQUEST:
      return {
        ...state,
        status: 'loading',
        displayLkToken: true,
        message: '',
        responseData: null,
      }

    case LKTOKEN_SUBMIT_SUCCESS:
      return {
        ...state,
        status: 'success',
        displayLkToken: false,
        message: action.payload.message || 'Успешно',
        responseData: action.payload.responseData,
      }

    case LKTOKEN_SUBMIT_ERROR:
      return {
        ...state,
        status: 'error',
        displayLkToken: true,
        message: action.payload.message || 'Ошибка',
        responseData: null,
      }

    case LKTOKEN_CLEAR:
      return initialState

    case LK_STORE_VALUE:
      return {
        ...state,
        [action.payload.storeDataKey]: action.payload.storeDataValue,
      }

    default:
      return state
  }
}
