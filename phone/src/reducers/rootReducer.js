import { combineReducers } from "redux";
import authControlRdcr from "./authControlRdcr";
import lkControlRdcr from "./lkControlRdcr";
import phoneControlRdcr from "./phoneControlRdcr";

export default combineReducers({
  phoneControlRdcr,
  authControlRdcr,
  lkControlRdcr,
});
