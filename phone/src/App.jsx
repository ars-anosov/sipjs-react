import Container from "@mui/material/Container";
import Copyright from "./Copyright";
import LkContainer from "./containers/LkContainer.jsx";
import MenuAppContainer from "./containers/MenuAppContainer";
import PhoneContainer from "./containers/PhoneContainer.jsx";

export default function App() {
  return (
    <Container
      maxWidth="md"
      sx={{
        p: 2,
        mt: 2,
        border: "1px dashed grey",
        borderRadius: 5,
      }}
    >
      <MenuAppContainer />
      <PhoneContainer />
      <LkContainer />
      <Copyright showFull={true} />
    </Container>
  );
}
