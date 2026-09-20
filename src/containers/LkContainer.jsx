import { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { bindActionCreators } from "redux";
import * as lkActions from "../actions/lkControlActions.js";
import * as phoneActions from "../actions/phoneControlActions.js";
import LkMeet from "../components/LkMeet.jsx";

const LkContainer = () => {
  const dispatch = useDispatch();

  const phoneControlActions = useMemo(() => bindActionCreators(phoneActions, dispatch), [dispatch]);
  const lkControlActions = useMemo(() => bindActionCreators(lkActions, dispatch), [dispatch]);

  const phoneControlRdcr = useSelector((state) => state.phoneControlRdcr);
  const lkControlRdcr = useSelector((state) => state.lkControlRdcr);

  // Мост LK_ → PHONECTL_: приглашение в комнату готовит lkControlActions (текст со ссылкой),
  // а запись чата, отправку и статусы доставки ведёт phoneControlRdcr.
  const lkControlActionsWithBridge = useMemo(
    () => ({
      ...lkControlActions,
      handleLkTokenSubmit: async (formData) => {
        const inviteMessage = await lkControlActions.handleLkTokenSubmit(formData);

        phoneControlActions.handleSendInviteMessage(inviteMessage, phoneControlRdcr);

        return inviteMessage;
      },
    }),
    [lkControlActions, phoneControlActions, phoneControlRdcr],
  );

  const commonProps = {
    phoneControlRdcr,
    phoneControlActions,
    lkControlRdcr,
    lkControlActions: lkControlActionsWithBridge,
  };

  return <LkMeet {...commonProps} />;
};

export default LkContainer;
