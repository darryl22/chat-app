import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface loggedInUser {
    setLoginState: (val: boolean)=> void,
    setCurrentUser: (val: string) => void
}
function Signup({setLoginState, setCurrentUser}: loggedInUser) {

    const navigate = useNavigate()
    const [signupInfo, setSignupInfo] = useState({
        username: "",
        password: "",
        confirmpassword: ""
    })

    const [signupMessage, setSignupMessage] = useState({
        show: false,
        message: ""
    })

    function handleSignup(e: any): void {
        setSignupInfo(prev => {
            return {
                ...prev,
                [e.target.name]: e.target.value
            }
        })
    }

    async function submitSignup(e: any): Promise<void> {
        e.preventDefault()
        console.log(signupInfo)
        try{
            let res = await fetch("/api/signup", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({
                    username: signupInfo.username,
                    password: signupInfo.password,
                    confirmpassword: signupInfo.confirmpassword
                })
            })
            let data = await res.json()
            console.log(data)
            if (data.status === "ERROR") {
                setSignupMessage({
                    show: true,
                    message: data.message
                })
                setTimeout(() => {
                    setSignupMessage({
                        show: false,
                        message: ""
                    })
                }, 2000)
            } else {
                setSignupMessage({
                    show: true,
                    message: data.message
                })
                setTimeout(() => {
                    setSignupMessage({
                        show: false,
                        message: ""
                    })
                    setLoginState(true)
                    setCurrentUser(signupInfo.username)
                    navigate("/messages", {replace: true})
                }, 2000)
            }
        } catch(error) {
            console.log(error)
        }
    }
    return(
        <div>
            <form style={{display: "flex", alignItems: "center", flexDirection: "column"}} onSubmit={submitSignup}>
                <h1>Signup</h1>
                <label htmlFor="username">Username</label>
                <input type="text" name="username" onChange={handleSignup}/>

                <label htmlFor="password">Password</label>
                <input type="password" name="password" onChange={handleSignup}/>

                <label htmlFor="confirmpassword">Confirm Password</label>
                <input type="confirmpassword" name="confirmpassword" onChange={handleSignup}/>
                <p style={{display: signupMessage.show ? "inline" : "none"}}>{signupMessage.message}</p>
                <button style={{marginTop: "1em"}}>Submit</button>

            </form>
        </div>
    )
}

export default Signup