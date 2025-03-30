import { StrictMode  ,React} from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Layout from './layout.jsx'
import Home from './pages/Home.jsx'
import { createBrowserRouter, createRoutesFromElements, RouterProvider , Route} from 'react-router-dom'
import ConnectShopify from './pages/ConnectShopify.jsx'
import Inventory from './pages/Inventory.jsx'
import RestockPredictions from './components/RestockPredictions.jsx'
import Landing from './pages/Landing.jsx'

const router = createBrowserRouter(
    createRoutesFromElements(
        <Route path= '/' element={<Layout/>}>
            <Route path='' element={<Landing/>}/>
            <Route path = 'connectShopify' element={<ConnectShopify/>}/>
            <Route path='home' element={<Home/>}/> 
            <Route path='inventory' element={<Inventory/>}/>
            <Route path='restockPredictions' element={<RestockPredictions/>}/>
        </Route>
    )
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router}/>
    {/* <App /> */}
  </StrictMode>,
)
