import { useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";

interface loggedInUser {
    setLoginState: (val: boolean)=> void,
    setCurrentUser: (val: string) => void
}

function Login({setLoginState, setCurrentUser}: loggedInUser) {
    const navigate = useNavigate()
    const [loginInfo, setLoginInfo] = useState({
        username: "",
        password: ""
    })

    const [loginMessage, setLoginMessage] = useState({
        show: false,
        message: ""
    })

    function handleLogin(e: any): void {
        setLoginInfo(prev => {
            return {
                ...prev,
                [e.target.name]: e.target.value
            }
        })
    }

    async function submitLogin(e: any): Promise<void> {
        e.preventDefault()
        console.log(loginInfo)
        try{
            let res = await fetch("/api/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // 'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({
                    username: loginInfo.username,
                    password: loginInfo.password
                })
            })
            let data = await res.json()
            console.log(data)
            if (data.status === "ERROR") {
                setLoginMessage({
                    show: true,
                    message: data.message
                })
                setTimeout(() => {
                    setLoginMessage({
                        show: false,
                        message: ""
                    })
                }, 2000)
            } else {
                setLoginMessage({
                    show: true,
                    message: data.message
                })
                setTimeout(() => {
                    setLoginMessage({
                        show: false,
                        message: ""
                    })
                    setLoginState(true)
                    setCurrentUser(loginInfo.username)
                    navigate("/messages", {replace: true})
                }, 2000)
            }
        } catch(error) {
            console.log(error)
        }
    }
    return(
        <div>
            <form style={{display: "flex", alignItems: "center", flexDirection: "column"}} onSubmit={submitLogin}>
                <h1>Login</h1>
                <label htmlFor="username">Username</label>
                <input type="text" name="username" onChange={handleLogin}/>

                <label htmlFor="password">Password</label>
                <input type="password" name="password" onChange={handleLogin}/>
                <p style={{display: loginMessage.show ? "inline" : "none"}}>{loginMessage.message}</p>
                <Link to="/signup">signup</Link>
                <button style={{marginTop: "1em"}}>Submit</button>

            </form>
        </div>
    )
}

export default Login