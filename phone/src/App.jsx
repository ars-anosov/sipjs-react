import Container        from '@mui/material/Container'
import MenuAppContainer from './containers/MenuAppContainer'
import PhoneContainer   from './containers/PhoneContainer.jsx'
import Copyright        from './Copyright'

export default function App() {
  return (
    <Container
      maxWidth="sm"
      sx={{
        padding: 2,
        border: '1px dashed grey',
        borderRadius: 5,
      }}
    >
      <MenuAppContainer />
      <PhoneContainer />
      <Copyright />
    </Container>
  )
}
