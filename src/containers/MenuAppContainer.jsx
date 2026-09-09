import { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { bindActionCreators } from "redux";
import * as authActions from "../actions/authControlActions.js";
import * as lkActions from "../actions/lkControlActions.js";
import * as phoneActions from "../actions/phoneControlActions.js";
import MenuAppBar from "../components/MenuAppBar.jsx";

const MenuAppContainer = () => {
  const dispatch = useDispatch();

  const phoneControlActions = useMemo(
    () => bindActionCreators(phoneActions, dispatch),
    [dispatch],
  );
  const authControlActions = useMemo(
    () => bindActionCreators(authActions, dispatch),
    [dispatch],
  );
  const lkControlActions = useMemo(
    () => bindActionCreators(lkActions, dispatch),
    [dispatch],
  );

  const phoneControlRdcr = useSelector((state) => state.phoneControlRdcr);
  const authControlRdcr = useSelector((state) => state.authControlRdcr);
  const lkControlRdcr = useSelector((state) => state.lkControlRdcr);

  // Передаем переменные напрямую как пропсы, а не единым объектом commonProps
  return (
    <MenuAppBar
      phoneControlRdcr={phoneControlRdcr}
      phoneControlActions={phoneControlActions}
      authControlRdcr={authControlRdcr}
      authControlActions={authControlActions}
      lkControlRdcr={lkControlRdcr}
      lkControlActions={lkControlActions}
    />
  );
};

export default MenuAppContainer;
