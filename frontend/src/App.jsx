import ConnectShopify from "./pages/ConnectShopify"
import Landing from "./pages/Landing"
import Home from "./pages/Home"
import Inventory from "./pages/Inventory"
import RestockPredictions from "./components/RestockPredictions"

export default function App() {
  return (
    <>
    <Landing/>
    <ConnectShopify/>
    <Home/>
    <Inventory/>
    <RestockPredictions/>
    </>
  )
}

