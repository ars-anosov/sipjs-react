// React main
import React                          from 'react'
import { bindActionCreators }         from 'redux'
import { connect }                    from 'react-redux'

// Components
import PhoneWin                       from '../components/PhoneWin.jsx'
import PhoneControl                   from '../components/PhoneControl.jsx'
import PhoneHistrory                  from '../components/PhoneHistrory.jsx'

// Actions
import * as phoneControlActions       from '../actions/phoneControlActions.js'

import {
  styled,
}                                     from '@mui/material'



const MainSt = styled('main')(({ theme }) => ({
  top: 0,
  left: 0,
  padding: theme.spacing(1)
}))





class Cnt_clientPage extends React.Component {
  
  constructor(args) {
    super(args)
  }



  render() {
    if (process.env.NODE_ENV === 'development') console.log('Cnt_phone render')
    const {
      phoneControlRdcr, phoneControlActions,
    } = this.props



    return (
    <MainSt>
      <PhoneControl
        phoneControlRdcr      = {phoneControlRdcr}
        phoneControlActions   = {phoneControlActions}
      />
      <br />
      <PhoneWin
        phoneControlRdcr      = {phoneControlRdcr}
        phoneControlActions   = {phoneControlActions}
      />
      <br />
      <PhoneHistrory 
        phoneControlRdcr      = {phoneControlRdcr}
        phoneControlActions   = {phoneControlActions}
      />
    </MainSt>
    ) 
  } 
}









function mapStateToProps (state) { 
  //console.log(state) 
  return {
    'phoneControlRdcr'  : state.phoneControlRdcr,
  } 
}

function mapDispatchToProps(dispatch) { 
  return { 
    'phoneControlActions'       : bindActionCreators(phoneControlActions, dispatch),
  } 
}

export default connect(mapStateToProps, mapDispatchToProps)( Cnt_clientPage )