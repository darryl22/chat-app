import './App.css'
import Messages from "./Messages"
import Login from './Login'
import Signup from './Signup'
import { Routes, Route, Link } from 'react-router-dom'
import { useState } from 'react'
import { useNavigate } from "react-router-dom";

function App() {
  const navigate = useNavigate()
  const [loggedInState, setLoggedInState] = useState(false)
  const [currentUser, setCurrentUser] = useState("")
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
  return(
      <div className='router-div'>
        <div className='nav-div'>
          {loggedInState ? <div style={{display: "flex", gap: "0.5em", alignItems: "center"}}><button onClick={logOutUser} className='btn-main'>Logout</button><p style={{margin: "0px"}}>{currentUser}</p></div> : <Link to="/login">Login</Link>}
          <Link to="/messages">Messages</Link>
        </div>

        <Routes>
          <Route path="/messages" element={<Messages setLoginState={setLoggedInState} setCurrentUser={setCurrentUser}/>}/>
          <Route path="/login" element={<Login setLoginState={setLoggedInState} setCurrentUser={setCurrentUser}/>}/>
          <Route path="/signup" element={<Signup setLoginState={setLoggedInState} setCurrentUser={setCurrentUser}/>}/>
        </Routes>
      </div>
  )
}

export default App