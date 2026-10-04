import { useEffect, useLayoutEffect, useState, useRef } from "react"
import './App.css'
import Message from "./components/Message"
import { socket } from "./socket"
import { useNavigate } from "react-router-dom";
// import closeLight from "./assets/closelight.png"
import close from "./assets/close.png"
import search from "./assets/logos/search.svg"

interface Chat {
  chatName: string,
  _id: string,
  dateCreated: string,
  dateCreatedInMs: number,
  latestMessage: string,
  latestMessageMs: number,
  type: string
}

interface Member {
  _id: string,
  userId: string,
  userName: string,
  chatId: string,
  chatTitle: string,
  latestMessage: string,
  latestMessageMs: number,
}

interface MessageItem {
  _id: string,
  chatId: string,
  message: string,
  sender: string,
  senderName: string,
  // memberId: string,
  dateAdded: string,
  dateAddedInMs: number
}

interface loggedInUser {
  setLoginState: (val: boolean) => void,
  setCurrentUser: (val: string) => void
}

interface Friend {
  _id: string,
  userId: string,
  friendId: string,
  friendName: string,
  dateCreated: string,
  dateCreatedInMs: number,
  chatId: string
}

interface User {
  user: string,
  _id: string
}

function Messages({ setLoginState, setCurrentUser }: loggedInUser) {
  const [message, setMessage] = useState('')
  // const [currentDate, setCurrentDate] = useState(new Date())
  const [messageList, setMessageList] = useState<MessageItem[]>([])
  const [moreChats, setMoreChats] = useState(false)
  const [user, setUser] = useState("")
  const [userId, setUserId] = useState("")
  const [friends, setFriends] = useState<Friend[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [showFriends, setShowFriends] = useState(false)
  const [addFriends, setAddFriends] = useState(false)
  const [currentChat, setCurrentChat] = useState<Chat>({
    chatName: "",
    _id: "",
    dateCreated: "",
    dateCreatedInMs: 0,
    latestMessage: "",
    latestMessageMs: 0,
    type: ""
  })
  const [chats, setChats] = useState<Member[]>([])
  const [socketConnected, setSocketConnected] = useState(socket.connected)

  const messagesDivBottom = useRef<HTMLDivElement>(null)
  const currentCursor = useRef(null)
  const navigate = useNavigate()

  // const messagesMap = useRef<Map<string, HTMLDivElement | null>>(null)

  // function showElement(id: string) {
  //   console.log("show element")
  //   if (messagesMap.current) {
  //     let currentElm = messagesMap.current.get(id)
  //     console.log(currentElm)
  //   }
  // }

  const friendsModalStyle: React.CSSProperties = {
    opacity: showFriends ? 1 : 0,
    pointerEvents: showFriends ? "auto" : "none"
  }

  const addFriendsModalStyle: React.CSSProperties = {
    opacity: addFriends ? 1 : 0,
    pointerEvents: addFriends ? "auto" : "none"
  }

  // useEffect lets the scrollTop value be set after currentChat state is loaded
  useLayoutEffect(() => {
    console.log(currentCursor.current)
    if (messagesDivBottom.current) {
      messagesDivBottom.current.scrollTop = messagesDivBottom.current.scrollHeight
    }
  }, [currentChat])

  useEffect(() => {
    let idVal = ""
    async function getUser(): Promise<void> {
      let res = await fetch("/api/messagesData", {
        credentials: "include",
        // ngrok header to skip interstitial tunnel warning page
        headers: { 'ngrok-skip-browser-warning': 'true' },
      })
      let data = await res.json()
      // console.log("data", data)
      if (data.status === "ERROR") {
        navigate("/login")
      }
      if (data.user) {
        setLoginState(true)
        setUser(data.user.user)
        setCurrentUser(data.user.user)
        setUserId(data.user._id)
        setFriends(data.friends)
        setUsers(data.users)
        setChats(data.chats)
        idVal = data.user._id
      }
    }

    getUser()
      .then(() => {
        socket.connect()
        socket.on("connect", function () {
          setSocketConnected(true)
          socket.emit("joinroom", idVal)
        })
        socket.on("connect_error", function (error) {
          console.log(error)
        })
        socket.on("updatemessage", function (messageId, messageObject) {
          try {
            console.log("message notification")
            setMessageList(prev => {
              return [...prev, {
                _id: messageId,
                chatId: messageObject.chatId,
                message: messageObject.message,
                sender: messageObject.sender,
                senderName: messageObject.senderName,
                // memberId: messageObject.message,
                dateAdded: messageObject.dateAdded,
                dateAddedInMs: messageObject.dateAddedInMs
              }]
            })
            console.log("socketConnected", socketConnected)
          } catch (error) {
            console.log(error)
          }
        })
      })
      .catch(error => {
        console.log(error)
        navigate("/login")
      })
  }, [])

  function updateMessage(e: any): void {
    let input = e.target.value
    setMessage(input)
  }

  function sendMessage(): void {
    let sender = {
      user: user,
      userId: userId
    }
    socket.emit("message", message, sender, currentChat._id)
    console.log(messageList)
    setMessage("")
  }

  async function handleAddFriend(id: string, name: string) {
    let res = await fetch("/api/addFriend", {
      credentials: "include",
      method: "post",
      // ngrok header to skip interstitial tunnel warning page
      headers: { 'ngrok-skip-browser-warning': 'true', "Content-Type": "application/json" },
      body: JSON.stringify({
        receiverId: id,
        receiverName: name
      })
    })

    let data = await res.json()
    console.log(data)
  }

  async function handleChangeChat(chatId: string, title: string) {
    try {
      if (currentChat._id === chatId) {
        console.log("same chat")
        return
      }
      currentCursor.current = null
      let messages = await fetch("api/getMessages", {
        method: "post",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: chatId,
          chatCursor: currentCursor.current
        })
      })

      let messagesData = await messages.json()
      currentCursor.current = messagesData.nextCursor
      setMoreChats(messagesData.nextCursor === "end" ? false : true)
      console.log(messagesData.data)
      setMessageList(messagesData.data.reverse())
      setCurrentChat({
        chatName: title,
        _id: messagesData.chatId,
        dateCreated: "",
        dateCreatedInMs: 0,
        latestMessage: "",
        latestMessageMs: 0,
        type: ""
      })
      setShowFriends(false)
      // if (messagesDivBottom.current) {
      //   messagesDivBottom.current.scrollTop = messagesDivBottom.current.scrollHeight
      // }
    } catch (error) {
      console.log(error)
    }
  }

  async function loadMoreChats(chatId: string) {
    try {
      console.log("load more chats")
      let messages = await fetch("api/getMessages", {
        method: "post",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: chatId,
          chatCursor: currentCursor.current
        })
      })

      let messagesData = await messages.json()
      currentCursor.current = messagesData.nextCursor
      setMoreChats(messagesData.nextCursor === "end" ? false : true)
      console.log(messagesData.data)
      let sortedMessages = messagesData.data.reverse()
      setMessageList(prev => {
        return [...sortedMessages, ...prev]
      })
    } catch (error) {
      console.log(error)
    }
  }

  let messagesNode = messageList.map((item: MessageItem, key: number) => {
    return <Message
      key={key}
      _id={item._id}
      chatId={item.chatId}
      message={item.message}
      sender={item.sender}
      senderName={item.senderName}
      // memberId={item.memberId}
      dateAdded={item.dateAdded}
      dateAddedInMs={item.dateAddedInMs}
      myUserId={userId}
    />
  })

  let friendsNode = friends.map((item: Friend, key: number) => {
    return <p id={item._id} key={key} data-user={item.friendId} onClick={() => { handleChangeChat(item.chatId, item.friendName) }} style={{ cursor: "pointer" }}>{item.friendName}</p>
  })

  let usersNode = users.map((item: User, key: number) => {
    return <p id={item._id} key={key} style={{ cursor: "pointer" }} onClick={() => handleAddFriend(item._id, item.user)}>{item.user}</p>
  })

  let chatsNode = chats.map((item: Member, key: number) => {
    let shortText = item.latestMessage.slice(0, 30)
    // console.log(item)
    return <div className="recentchats-item" key={key} onClick={() => handleChangeChat(item.chatId, item.chatTitle )} style={{backgroundColor: item.chatId === currentChat._id ? "rgb(138, 204, 200)" : "white"}}>
      <div style={{display: "flex", alignItems: "center", gap: "15px"}}>
        <div className="recentchats-item-image">{item.chatTitle[0].toUpperCase()}</div>
        <div className="recentchats-item-details">
          <p style={{margin: "0px", fontWeight: "bold"}}>{item.chatTitle}</p>
          <p style={{margin: "0px", color: "gray", width: "200px"}}>{shortText}</p>
        </div>
      </div>
      <p style={{margin: "0px", fontSize: "0.7em", color: "gray"}}>{new Date(item.latestMessageMs).toLocaleTimeString()}</p>
    </div>

  })

  return (
    <>
      <div className="chat-div-main">
        <div className="modal-outer" style={friendsModalStyle}>
          <div className="modal-inner">
            <img src={close} alt="" className="close-modal" onClick={() => setShowFriends(false)} />
            {friendsNode}
          </div>
        </div>
        <div className="modal-outer" style={addFriendsModalStyle}>
          <div className="modal-inner">
            <img src={close} alt="" className="close-modal" onClick={() => setAddFriends(false)} />
            <h1>Add friend</h1>
            {usersNode}
          </div>
        </div>
        <div className="conversations-div">
          <div style={{padding: "0.5em"}}>
            <p style={{ fontSize: "2em", margin: "0em" }}>Chats</p>
            <div className="chatlist-search-div">
              <img src={search} alt="search" className="chatlist-search-icon" />
              <input type="text" className="chatlist-search-input" placeholder="search contacts" />
            </div>
            <div style={{display: "flex", gap: "0.5em", marginBottom: "1em"}}>
              <button onClick={() => setShowFriends(true)} className="btn-main">new chat</button>
              <button onClick={() => setAddFriends(true)} className="btn-main">add friend</button>
            </div>
            <p style={{fontSize: "1.2em", margin: "0em", marginBottom: "0px", marginTop: "1em"}}>Recents</p>
          </div>
          <div className="recentchats-div">
            {chatsNode}
          </div>
        </div>
        <div className="chat-div">
          <div className="chat-header">
            <h1 style={{margin: "0px"}}>{currentChat._id === "" ? "Select a chat to view content" : currentChat.chatName}</h1>
          </div>
          <div className="messages-div" id="messagesDiv" ref={messagesDivBottom}>
            <button onClick={() => loadMoreChats(currentChat._id)} style={{display: moreChats ? "block" : "none"}}>load more</button>
            {messagesNode}
            <div id="messageEnd"></div>
          </div>
          <div className="send-message-div">
            <input className="send-message-input" type="text" name="message-input" id="messageInput" onInput={updateMessage} value={message} style={{ display: currentChat._id === "" ? "none" : "block" }} />
            <button onClick={sendMessage} style={{ display: currentChat._id === "" ? "none" : "block" }}>Send</button>
          </div>
        </div>
      </div>
    </>
  )
}

export default Messages