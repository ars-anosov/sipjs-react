// React main
import * as React from 'react';
import PropTypes from 'prop-types';

import { bindActionCreators }         from 'redux'
import { connect }                    from 'react-redux'

// Components
import MenuAppBar                     from '../components/MenuAppBar.jsx'
import PhonePad                       from '../components/PhonePad.jsx'
import PhoneHistrory                  from '../components/PhoneHistrory.jsx'

// Actions
import * as phoneControlActions       from '../actions/phoneControlActions.js'

import {
  styled,

  Box
}                                     from '@mui/material'



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
    <Box>
      <MenuAppBar
        phoneControlRdcr      = {phoneControlRdcr}
        phoneControlActions   = {phoneControlActions}
      />
      <br />
      <PhonePad
        phoneControlRdcr      = {phoneControlRdcr}
        phoneControlActions   = {phoneControlActions}
      />
      <br />
      <PhoneHistrory 
        phoneControlRdcr      = {phoneControlRdcr}
        phoneControlActions   = {phoneControlActions}
      />
    </Box>
    ) 
  } 
}









Cnt_clientPage.propTypes = {
  phoneControlRdcr      : PropTypes.object.isRequired,
  phoneControlActions   : PropTypes.object.isRequired
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