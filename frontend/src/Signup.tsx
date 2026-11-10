import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";

interface loggedInUser {
    setLoginState: (val: boolean)=> void,
    setCurrentUser: (val: string) => void
}
function Signup({setLoginState, setCurrentUser}: loggedInUser) {
    console.log("region", Intl.DateTimeFormat().resolvedOptions().timeZone)
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
        <div className="auth-outer-div">
            <form className="auth-form" onSubmit={submitSignup}>
                <p style={{fontSize: "2em", marginBottom: "0em", marginTop: "0em"}}>Messaging App</p>
                <p style={{margin: "5px 0px"}}>Create a new account</p>
                <div className="auth-divider"></div>
                <div className="auth-input-div">
                    <label htmlFor="username" style={{fontWeight: "bold", fontSize: "0.9em"}}>Username</label>
                    <input type="text" name="username" onChange={handleSignup} className="auth-input" />
                </div>

                <div className="auth-input-div">
                    <label htmlFor="password" style={{fontWeight: "bold", fontSize: "0.9em"}}>Password</label>
                    <input type="password" name="password" onChange={handleSignup} className="auth-input" />
                </div>

                <div className="auth-input-div">
                    <label htmlFor="confirmpassword" style={{fontWeight: "bold", fontSize: "0.9em"}}>Confirm Password</label>
                    <input type="confirmpassword" name="confirmpassword" onChange={handleSignup} className="auth-input" />
                </div>
                <p style={{display: signupMessage.show ? "inline" : "none"}}>{signupMessage.message}</p>
                <Link to="/login">login</Link>
                <button className="auth-submit">Submit</button>

            </form>
        </div>
    )
}

export default Signup