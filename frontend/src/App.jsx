import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import ConnectShopify from "./pages/ConnectShopify"
import Landing from "./pages/Landing"
import Home from "./pages/Home"
import Inventory from "./pages/Inventory"
import RestockPredictions from "./components/RestockPredictions"

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/connect" element={<ConnectShopify />} />
        <Route path="/home" element={<Home />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/restockPredictions" element={<RestockPredictions />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

