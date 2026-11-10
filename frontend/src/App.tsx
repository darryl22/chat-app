import './App.css'
import Messages from "./Messages"
import Login from './Login'
import Signup from './Signup'
import { Routes, Route, Link } from 'react-router-dom'
import { useRef, useState } from 'react'
import { useNavigate } from "react-router-dom";
import { MainContext } from './context/MainContext'
import close from "./assets/logos/close.png"
import type { alertType } from './TsAssets'

interface Alert {
  alertIndex: number,
  message: string,
  type: alertType
}

interface AlertIdObject {
  [key: number]: number
}

function App() {
  const navigate = useNavigate()
  const [loggedInState, setLoggedInState] = useState(false)
  const [currentUser, setCurrentUser] = useState("")
  const [theme, setTheme] = useState("light")
  const [alertsList, setAlertsList] = useState<Alert[]>([])
  const alertsTimeoutId = useRef<AlertIdObject>({})
  // const clearAlertRef = useRef<undefined | number>(undefined)
  // const alertTimeoutRef = useRef([])
  async function logOutUser() {
    let res = await fetch("/api/logout", {
      credentials: "include",
      headers: {'ngrok-skip-browser-warning': 'true'}
    })
    let data = await res.json()
    if (data.status === "ERROR") {
      console.log(data.message)
    } else {
      console.log(data.message)
      navigate("/login", {replace: true})
    }
  }

  function clearAlert(index: number) {
    setAlertsList(prev => {
      let newList = prev.filter((item) => item.alertIndex !== index)
      return newList
    })
  }


  function AddAlert(message: string, type: alertType) {
    const alertIndex = alertsList.length
    setAlertsList(prev => {
      return [...prev, {
        alertIndex: alertIndex,
        message: message,
        type: type
      }]
    })
    console.log(alertsTimeoutId)
    alertsTimeoutId.current[alertIndex] = setTimeout(() => {
      clearAlert(alertIndex)
    }, 5000)
  }

  let alertsListNode = alertsList.map((item: Alert, index) => {
    return <div key={index} className='alert-item-div' style={{backgroundColor: item.type === "ERROR" ? "rgb(255, 135, 135)" : "rgb(135, 255, 203)"}}>
      <img src={close} alt="close alert" style={{height: "1em", float: "right", cursor: "pointer"}} onClick={() => clearAlert(index)}/>
      <p><span style={{fontWeight: "bold"}}>{item.type}</span>: {item.message}</p>
    </div>
  })
  return(
      <MainContext value={{loggedInState, setLoggedInState, currentUser, setCurrentUser, theme, setTheme, AddAlert}}>
        <div className='router-div'>
          <div className='nav-div'>
            {loggedInState ? <div style={{display: "flex", gap: "0.5em", alignItems: "center"}}><button onClick={logOutUser} className='btn-main'>Logout</button><p style={{margin: "0px"}}>{currentUser}</p></div> : <Link to="/login">Login</Link>}
            <Link to="/messages">Messages</Link>
          </div>
          <div className='alerts-div'>
            {alertsListNode}
          </div>

          <Routes>
            <Route path="/messages" element={<Messages setLoginState={setLoggedInState} setCurrentUser={setCurrentUser}/>}/>
            <Route path="/login" element={<Login setLoginState={setLoggedInState} setCurrentUser={setCurrentUser}/>}/>
            <Route path="/signup" element={<Signup setLoginState={setLoggedInState} setCurrentUser={setCurrentUser}/>}/>
          </Routes>
        </div>
      </MainContext>
  )
}

export default App