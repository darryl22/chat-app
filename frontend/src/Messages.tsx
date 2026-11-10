import React, { useEffect, useLayoutEffect, useState, useRef, useContext } from "react"
import './App.css'
import Message from "./components/Message"
import { socket } from "./socket"
import { useNavigate } from "react-router-dom";
// import closeLight from "./assets/closelight.png"
import close from "./assets/logos/close.png"
import search from "./assets/logos/search.svg"
import searchLight from "./assets/logos/searchLight.svg"
import options from "./assets/logos/options.svg"
import attachment from "./assets/logos/attachment.svg"
import filePdf from "./assets/logos/filePdf.svg"
import { MainContext } from './context/MainContext'
import type { User, Chat, Member, MessageItem, loggedInUser, Friend } from "./TsAssets";

function Messages({ setLoginState, setCurrentUser }: loggedInUser) {
  const mainContext = useContext(MainContext)
  const [message, setMessage] = useState('')
  const [fileCaption, setFileCaption] = useState("")
  const [messageList, setMessageList] = useState<MessageItem[]>([])
  const [moreChats, setMoreChats] = useState(false)
  const [user, setUser] = useState("")
  const [userId, setUserId] = useState("")
  // const [friends, setFriends] = useState<FriendObject>()
  const [openSearch, setOpenSearch] = useState(false)
  const [openAttachmentsModal, setOpenAttachmentsModal] = useState(false)
  const [file, setFile] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [searchUserInput, setSearchUserInput] = useState('')
  const [currentChat, setCurrentChat] = useState<Chat>({
    chatName: "",
    _id: "",
    dateCreated: "",
    dateCreatedInMs: 0,
    latestMessage: "",
    latestMessageMs: 0,
    type: "",
    members: []
  })
  const [chats, setChats] = useState<Member[]>([])
  const [userSearchResults, setUserSearchResults] = useState<User[]>([])
  const [showReplyBox, setShowReplyBox] = useState({
    show: false,
    message: "",
    replyMessageMs: 0,
    replyId: "",
    replyOriginMessageType: ""
  })
  const [socketConnected, setSocketConnected] = useState(socket.connected)

  const messagesDivBottom = useRef<HTMLDivElement>(null)
  // const friendsObject = useRef<FriendObject>({})
  const friendsObject = useRef<Map<string, Friend>>(new Map())
  const messageListRef = useRef<Member[]>([])
  const currentCursor = useRef(null)
  const currentCursorMs = useRef(0)
  const messagesRef = useRef<Map<string, HTMLDivElement>>(new Map())
  const navigate = useNavigate()

  const searchUsersModalStyle: React.CSSProperties = {
    opacity: openSearch ? 1 : 0,
    pointerEvents: openSearch ? "auto" : "none"
  }

  const attachmentsModalStyle: React.CSSProperties = {
    opacity: openAttachmentsModal ? 1 : 0,
    pointerEvents: openAttachmentsModal ? "auto" : "none"
  }

  // useEffect lets the scrollTop value be set after currentChat state is loaded
  useLayoutEffect(() => {
    if (messagesDivBottom.current) {
      messagesDivBottom.current.scrollTop = messagesDivBottom.current.scrollHeight
    }
  }, [currentChat])

  useLayoutEffect(() => {
    if (file.length === 0) {
      setOpenAttachmentsModal(false)
      setFileCaption("")
    }
  }, [file])

  useEffect(() => {
    let idVal = ""
    async function getUser(): Promise<void> {
      if (!mainContext) {
        navigate("/login")
      }
      let res = await fetch("/api/messagesData", {
        credentials: "include",
        // ngrok header to skip interstitial tunnel warning page
        headers: { 'ngrok-skip-browser-warning': 'true' },
      })
      let data = await res.json()
      if (data.status === "ERROR") {
        navigate("/login")
      }
      if (data.user) {
        setLoginState(true)
        mainContext?.setLoggedInState(true)
        setUser(data.user.user)
        setCurrentUser(data.user.user)
        setUserId(data.user._id)
        data.friends.forEach((item: Friend) => {
          friendsObject.current.set(`friend-${item.friendId}`, item)
        })
        // setUsers(data.users)
        setChats(data.chats)
        messageListRef.current = data.chats
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
      socket.on("updatemessage", function (messageList) {
        try {
          console.log("message notification")
          setMessageList(prev => {
            // return [...prev, {
            //   _id: messageList._id,
            //   chatId: messageList.chatId,
            //   message: messageList.message,
            //   messageType: messageList.messageType,
            //   sender: messageList.sender,
            //   senderName: messageList.senderName,
            //   // memberId: messageList.message,
            //   replyMessage: messageList.messageType === "reply" ? messageList.replyMessage : "",
            //   replyId: messageList.messageType === "reply" ? messageList.replyId : "",
            //   replyMessageMs: messageList.messageType === "reply" ? messageList.replyMessageMs : 0,
            //   dateAdded: messageList.dateAdded,
            //   dateAddedInMs: messageList.dateAddedInMs,
            //   myUserId: userId
            // }]
            return [...prev, ...messageList]
          })
          let swapIndex = 0
          let toTop: Member | null = null
          let lastMessage = messageList[messageList.length - 1]
          messageListRef.current.forEach((prevItem: Member, index) => {
            if (prevItem.chatId === lastMessage.chatId) {
              swapIndex = index
              toTop = {...prevItem, latestMessage: lastMessage.message}
              return {...prevItem, latestMessage: lastMessage.message}
            }
            return prevItem
          })

          messageListRef.current.splice(swapIndex, 1)
          if (toTop) {
            messageListRef.current.unshift(toTop)
          }

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

  function updateMessage(e: React.InputEvent<HTMLInputElement>) {
    let input = e.target as HTMLInputElement
    setMessage(input.value)
  }

  function updateFileCaption(e: React.InputEvent<HTMLInputElement>) {
    let input = e.target as HTMLInputElement
    setFileCaption(input.value)
  }

  async function sendMessage() {
    if (message === "") {
      return
    }
    let send = await fetch("/api/sendMessage", {
      credentials: "include",
      method: "post",
      headers: { 'ngrok-skip-browser-warning': 'true', "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: user,
        senderId: userId,
        chatId: currentChat._id,
        message: message,
        messageType: showReplyBox.show ? "reply" : "message",
        replyMessage: showReplyBox.message,
        replyId: showReplyBox.replyId,
        replyMessageMs: showReplyBox.replyMessageMs,
      })
    })

    let messageResponse = await send.json()
    if (messageResponse.status === "SUCCESS") {
      socket.emit("message", [messageResponse.sentMessage], currentChat.members)
      setMessage("")
      setShowReplyBox({
        show: false,
        message: "",
        replyMessageMs: 0,
        replyId: "",
        replyOriginMessageType: ""
      })
    }
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

  let searchController = useRef<AbortController | null>(null)
  let searchSignal = useRef<AbortSignal | null>(null)

  async function searchUsers(e: React.ChangeEvent<HTMLInputElement>) {
    if (searchController.current) {
      searchController.current.abort()
    }
    searchController.current = new AbortController()
    searchSignal.current = searchController.current.signal
    setSearchUserInput(e.target.value)
    let res = await fetch('/api/searchUsers', {
      method: "post",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        searchString: e.target.value
      }),
      signal: searchSignal.current
    })
    let searchResult = await res.json()
    mainContext?.AddAlert(e.target.value, "SUCCESS")
    setUserSearchResults(searchResult.results)
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
          chatCursor: currentCursor.current,
          action: "changeChat"
        })
      })

      let messagesData = await messages.json()
      console.log(messagesData)
      if (messagesData.status === "SUCCESS") {
        currentCursor.current = messagesData.nextCursor
        currentCursorMs.current = messagesData.cursorMs
        setMoreChats(messagesData.nextCursor === "end" ? false : true)
        console.log(messagesData.data)
        setMessageList(messagesData.data.reverse())
        let members = messagesData.members.map((item: {userId: string}) => {
          return `user:${item.userId}`
        })
        setCurrentChat({
          chatName: title,
          _id: messagesData.chatId,
          dateCreated: "",
          dateCreatedInMs: 0,
          latestMessage: "",
          latestMessageMs: 0,
          type: "",
          members: members
        })
        setOpenSearch(false)
        // if (messagesDivBottom.current) {
        //   messagesDivBottom.current.scrollTop = messagesDivBottom.current.scrollHeight
        // }
      }
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
          chatCursor: currentCursor.current,
          action: "loadMoreChats"
        })
      })

      let messagesData = await messages.json()
      currentCursor.current = messagesData.nextCursor
      currentCursorMs.current = messagesData.cursorMs
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

  async function jumpToReply(messageId: string | undefined, latestMessageMs: number) {
    console.log(messageId, latestMessageMs, currentCursorMs.current)
    if (messageId) {
      if (currentCursorMs.current <= latestMessageMs) {
        console.log("message in cursor boundary")
        if (messagesRef) {
          let replyNode = messagesRef.current.get(`message-${messageId}`)
          console.log("jump to reply", replyNode)
          replyNode?.scrollIntoView({behavior: "smooth"})
        }
      } else {
        console.log("message out of boundary")
        let messages = await fetch("api/getMessages", {
          method: "post",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId: currentChat._id,
            chatCursor: currentCursor.current,
            action: "jumpToTimestamp",
            jumpToMs: latestMessageMs
          })
        })

        let messagesData = await messages.json()
        console.log(messagesData)
        if (messagesData.status = "SUCCESS") {
          currentCursor.current = messagesData.nextCursor
          currentCursorMs.current = messagesData.cursorMs
          setMoreChats(messagesData.nextCursor === "end" ? false : true)
          let sortedMessages = messagesData.data.reverse()
          setMessageList(prev => {
            return [...sortedMessages, ...prev]
          })
        }
      }
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      console.log(e.target.files)
      const filesArray = Array.from(e.target.files)
      console.log(filesArray)
      setFile(filesArray)
      setOpenAttachmentsModal(true)
    }
  }

  async function sendAttachments() {
    try {
      if (file.length === 0) {
        return
      }
      let formValues = new FormData()
      // append metadata first so multer engine can process data before storing files
      formValues.append("dataValues", JSON.stringify({
        chatId: currentChat._id,
        sender: user,
        senderId: userId,
        caption: fileCaption
      }))
      file.forEach((item: File) => {
        formValues.append("files", item)
      })
      let request = await fetch("/api/sendAttachment", {
        method: "post",
        body: formValues      
      })

      let result = await request.json()
      if (result.status === "SUCCESS") {
        setOpenAttachmentsModal(false)
        setFileCaption("")
        socket.emit("message", result.sentMessage, currentChat.members)
        console.log(result)
      }
    } catch (error) {
      console.log(error)
    }
  }

  let messagesNode = messageList.map((item: MessageItem, key: number) => {
    // messagesRef.current.set(`message-${item._id}`, item)
    return <Message
      key={key}
      _id={item._id}
      chatId={item.chatId}
      message={item.message}
      messageType={item.messageType}
      sender={item.sender}
      senderName={item.senderName}
      replyId={item.replyId? item.replyId : ""}
      replyMessage={item.replyMessage? item.replyMessage : ""}
      replyMessageMs={item.replyMessageMs? item.replyMessageMs : 0}
      // memberId={item.memberId}
      dateAdded={item.dateAdded}
      dateAddedInMs={item.dateAddedInMs}
      myUserId={userId}
      showReply={setShowReplyBox}
      messagesRef={messagesRef.current}
      jumpToReply={jumpToReply}
      fileName={item.messageType === "file" ? item.fileName : ""}
      fileId={item.messageType === "file" ? item.fileId : ""}
      fileSize={item.messageType === "file" ? item.fileSize : 0}
    />
  })

  let userSearchResultsNode = userSearchResults.map((item: User, key: number) => {
    let areFriends = false
    let searchChatId = ""
    if (friendsObject.current) {
      console.log(item._id)
      console.log(friendsObject.current.get(`friend-${item._id}`))
      if (friendsObject.current.get(`friend-${item._id}`)) {
        searchChatId = friendsObject.current.get(`friend-${item._id}`)!.chatId
        areFriends = true
      }
    }
    return <div key={key} style={{ cursor: "pointer" }} className="search-result-div">
      <div className="search-result-image"></div>
      <p id={item._id} style={{ cursor: "pointer" }}>{item.user}</p>
      <button className="btn-main" style={{display: areFriends ? "none" : "block"}} onClick={() => handleAddFriend(item._id, item.user)}>add</button>
      <button className="btn-main" style={{display: !areFriends ? "none" : "block"}} onClick={() => handleChangeChat(searchChatId, item.user)}>message</button>
    </div>
  })

  let chatsNode = chats.map((item: Member, key: number) => {
    let shortText = item.latestMessage.slice(0, 30)
    return <div className="recentchats-item" key={key} onClick={() => handleChangeChat(item.chatId, item.chatTitle )} style={{backgroundColor: item.chatId === currentChat._id ? "rgb(138, 204, 200)" : "rgb(236, 236, 236)"}}>
      <div style={{display: "flex", alignItems: "center", gap: "15px"}}>
        <div className="recentchats-item-image">
          <p style={{margin: "0px", fontSize: "0.8em"}}>{item.chatTitle[0].toUpperCase() + item.chatTitle[1].toUpperCase()}</p>
        </div>
        <div className="recentchats-item-details">
          <p style={{margin: "0px", fontWeight: "bold"}}>{item.chatTitle}</p>
          <p style={{margin: "0px", color: "gray", width: "200px"}}>{shortText}</p>
        </div>
      </div>
      <p style={{margin: "0px", fontSize: "0.7em", color: "gray"}}>{new Date(item.latestMessageMs).toLocaleTimeString()}</p>
    </div>

  })

  function removeSelectedFile(position: number) {
    let temp = file.filter((_, index: number) => {
      return index != position 
    })
    setFile(temp)
  }

  let filesListNode = file.map((item: File, index: number) => {
    return <div className="attachments-item" key={index}>
      <img src={filePdf} alt="pdf file" style={{height: "50px"}}/>
      <p>{item.name} {item.size}</p>
      <img src={close} alt="remove file" style={{height: "1em", marginLeft: "auto", cursor: "pointer"}} onClick={() => removeSelectedFile(index)}/>
    </div>
  })

  return (
    <>
      <div className="chat-div-main">

        <div className="modal-outer" style={searchUsersModalStyle}>
          <div className="modal-inner" style={{display: "flex", flexDirection: "column", alignItems: "start"}}>
            <img src={close} alt="" className="close-modal" onClick={() => setOpenSearch(false)} />
            <div className="chatlist-search-div">
              <img src={search} alt="search" className="chatlist-search-icon" />
              <input type="text" className="chatlist-search-input" placeholder="find friends or users" onChange={searchUsers} value={searchUserInput}/>
            </div>
            <div className="search-results-outer">
              {userSearchResultsNode}
            </div>
          </div>
        </div>

        <div className="modal-outer" style={attachmentsModalStyle}>
          <div className="modal-inner" style={{display: "flex", flexDirection: "column", alignItems: "start"}}>
            <img src={close} alt="" className="close-modal" onClick={() => {setOpenAttachmentsModal(false); setFile([]); setFileCaption("")}} />
            <div className="attachments-div">
              {filesListNode}
            </div>
            <form className="attachment-caption-form" action={sendMessage}>
              <input className="attachment-caption" type="text" name="message-input" id="messageInput" placeholder="add a caption" value={fileCaption} onInput={updateFileCaption}/>
              <button type="button" className="btn-main" onClick={sendAttachments}>Send</button>
            </form>
          </div>
        </div>

        <div className="conversations-div">
          <div style={{padding: "0.5em"}}>
            {/* <p style={{ fontSize: "2em", margin: "0em" }}>Chats</p> */}
            <div style={{display: "flex", gap: "0.5em", marginBottom: "1em"}}>
              <button onClick={() => setOpenSearch(true)} className="btn-main" style={{display: "flex", alignItems: "center", gap: "3px"}}><img src={searchLight} style={{height: "1em"}}></img> search</button>
            </div>
            <p style={{fontSize: "1.2em", margin: "0em", marginBottom: "0px", marginTop: "1em"}}>Recents</p>
          </div>
          <div className="recentchats-div">
            {chatsNode}
          </div>
        </div>

        <div className="chat-div">
          <div className="chat-header" style={{ display: currentChat._id === "" ? "none" : "flex" }}>
            <p style={{margin: "0px", cursor: "pointer"}}>{currentChat.chatName}</p>
            <div className="chat-header-options">
              <img src={search} alt="search" style={{height: "1em"}}/>
              <img src={options} alt="options" style={{height: "1em"}}/>
            </div>
          </div>
          <div className="messages-div" id="messagesDiv" ref={messagesDivBottom}>
            <button onClick={() => loadMoreChats(currentChat._id)} style={{display: moreChats ? "block" : "none", margin: "auto"}}>load more</button>
            {messagesNode}
            <div id="messageEnd"></div>
          </div>
          <div className="send-message-div" style={{ display: currentChat._id === "" ? "none" : "block" }}>
            <div className="reply-div" style={{display: showReplyBox.show ? "block" : "none"}}>
              <img src={close} alt="close reply" style={{height: "10px", float: "right", cursor: "pointer", paddingLeft: "1em"}} onClick={() => setShowReplyBox({show: false, message: "", replyMessageMs: 0, replyId: "", replyOriginMessageType: ""})}/>
              <p style={{margin: "0px", fontSize: "0.8em", marginRight: "1em"}}>{showReplyBox.message}</p>
            </div>
            <form className="send-message-form" action={sendMessage} style={{ display: currentChat._id === "" ? "none" : "flex" }}>
              <input type="file" onChange={handleFileSelect} ref={fileInputRef} style={{display: "none"}} multiple/>
              <input className="send-message-input" type="text" name="message-input" id="messageInput" onInput={updateMessage} value={message} />
              <img src={attachment} alt="attachment" style={{height: "1.2em", cursor: "pointer"}} onClick={() => fileInputRef.current?.click()}/>
              <button type="submit" className="btn-main">Send</button>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}

export default Messages